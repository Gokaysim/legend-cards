# Design

## Context

See proposal.md for the motivation. Today the draw price is one constant, `DRAW_PRICE = 1` in
`src/features/draws/schema.ts`. Several places depend on it:

- `drawCard` (`src/features/draws/api.ts`) takes `paid: boolean`. A paid draw charges `DRAW_PRICE` from the hand
  owner's LP, and the draw stores `cost: 1`. A free draw stores `cost: 0`. `paid` also means "a player's draw":
  `isModeChangedOnServer` uses it to tell a denial for a mode change apart from other denials.
- The draw schema accepts only `cost` 0 or 1 (`z.union([z.literal(0), z.literal(DRAW_PRICE)])`).
- `firestore.rules`:
  - `paidByPlayer` requires `cost == 1`.
  - The DM's branch is `isFree() && isDm()`.
  - The ledger's `paysForDraw` requires `account == request.auth.uid && delta == -1`.
  - The profile's LP update accepts a `draw` entry only from `isSelf(uid)`.
- `DrawDialog` derives `paid = mode === 'random' && !isDm`. The chips, the draw control's label and the "not enough LP"
  note are built from `DRAW_PRICE`.
- The watching view (`LiveDrawDialog`) shows `Her kart −1 LP` or `Ücretsiz` from `isPaidSession`, a guess based on
  the session's kind, drawer and hand. A session stores `draws: [{ drawId, cardId, backSet }]` and no prices.
- The İşlem Logu (`eventText.ts`) and the card history (`historyText.ts`) already print the stored `draw.cost`.

The rules work under the 1000-expression limit per request. The draw request is among the heaviest: it writes the
draw, the holding, the card's holder, the session, the ledger entry and the profile.

## Goals / Non-Goals

**Goals:**

- One price rule that the dialog, the API and the rules share: under "Kapalı" a player pays 1 LP and the DM draws
  free. While the mode is on, the drawer's chosen price applies (0 to 1,000,000 LP) to the hand owner's LP. A Cursed
  draw is always free.
- Every stored draw and session card says what was paid, so the log, the history and the watching view never guess.

**Non-Goals:**

- No table-wide stored price, no per-player price, and no memory of the last price between dialog openings.
- No price for Cursed draws, packs or True Word drafts.
- The DM cannot charge LP while the mode is "Kapalı". The rules would accept it (D3), but the dialog does not offer it.
- No GP payment for draws.

## Decisions

### D1. The price lives in the open dialog, not in the table

The price is local state of `DrawDialog`. It starts at 1 when the dialog mounts. On every change of the player draw
mode it goes back to 1, in the same render-time block that already clears the filters (`seenMode`). A pure helper
decides the price of the next draw:
`drawPrice({ kind, byDm, playerMode, chosen })` → `0` for a Cursed draw; under `off`, `1` for a player and `0` for
the DM; otherwise `chosen`. It sits next to `playerDrawTools` in `src/features/table/playerDraw.ts` and gets unit
tests.

*Alternative:* a price stored in `table/main` and set by the DM. The owner rejected it: whoever draws sets the price.
A shared value would also need its own rules, a change record and a log entry.

### D2. `drawCard` takes a price instead of `paid`

`DrawCardInput.paid: boolean` becomes `price: number` (0 is free) plus `byDm: boolean`. The transaction:

- charges `price` when it is above 0;
- stores `paidWith: price > 0 ? 'lp' : 'none'`, `cost: price` and `entryId` only when paid;
- writes the ledger entry with `delta: -price` on the hand owner's account (`uid`);
- throws `DrawError('insufficient', lp)` when `lp < price`.

`byDm` replaces the old use of `paid` as "a player's draw" in `isModeChangedOnServer`. A denied player draw (`!byDm`)
counts as mode-changed when the server's mode no longer allows its filters, or when its price is not 1 and the
server's mode is `off`. `DrawError` for `insufficient` also carries the price, so the message can name it:
"Kart çekmek için 3 LP gerekiyor; Ayla'nın 2 LP'si var."

The draw schema's `cost` becomes `z.number().int().min(0).max(DRAW_COST_MAX)` with `DRAW_COST_MAX = 1_000_000`, the
ledger's single-change limit. The refine keeps the agreement between the fields: `paidWith === 'lp'` ⇔ `cost > 0` ⇔
`entryId !== null`. `DRAW_PRICE` stays as the default price.

### D3. Rules: one payment check, the mode decides only the player's price

In the `draws` create rule:

- `paidByPlayer()` becomes `drawnByPlayer()`: `kind == 'random'`, own hand, `playerFiltersAllowed(filters)`,
  `validPayment()`, and `(mode != 'off' || (paidWith == 'lp' && cost == 1))`.
- `validPayment()` is either `isFree()`, or `paidWith == 'lp'`, `cost is int`, `1 <= cost <= 1000000`, and the entry
  created now that names this draw (the existing `createdNow(ledgerPath(...))` and `drawId` check).
- The table mode is read through one helper `playerDrawMode()`, and `playerFiltersAllowed` uses it as well. The
  table's `get` is cached within the request, so the second call costs no extra document read.
- The DM gets a new branch `(isDm() && data.kind == 'random' && validPayment())` next to the existing
  `(isFree() && isDm())`. It is accepted in any mode. The DM is trusted, and a mode check would add expressions to
  the heaviest request for no protection anyone needs.

In the ledger, `paysForDraw()` reads the draw it names: `getAfter(drawPath(drawId))`, already loaded by the draw's own
rule. It requires `draw.entryId == entryId`, `draw.paidWith == 'lp'`, `account == draw.uid`, `delta == -draw.cost`,
and `(account == request.auth.uid || isDm())`. The draw rule decides who may pay what, as `forWordDraft` does for
drafts.

On the profile, `(isSelf(uid) && lpSetByEntry('draw'))` becomes `(lpSetByEntry('draw') && (isSelf(uid) || isDm()))`,
the same shape as the pack and draft branches.

*Alternative:* a player price that requires `cost >= 1`. The owner named 0 as allowed while the mode is on, and the
trust-players decision says to enforce only the limits the owner names.

### D4. Each session card stores its price

A session card becomes `{ drawId, cardId, backSet, cost }`.

- Rules: `validSessionDraw` lists `cost` among the fields of a new card. Older cards are not checked again
  (`after[0:n] == before`). The draw's `joinsSession()` adds `entry.cost == data.cost`. The session rule already
  ties the card to its draw, so this one equality fixes the price.
- Schema: `cost` is optional on read (`z.number().int().min(0).nullable().default(null)` or equivalent). An older
  card reads as `null`.
- A pure `sessionPayment(session, profileOf)` in `sessionText.ts` sums the cards' prices. A `null` price counts as the
  old rule: 1 for a player's random draw into their own hand (the existing `isPaidSession` test), 0 otherwise.
  `LiveDrawDialog` shows `−N LP` or `Ücretsiz`.

*Alternative:* the watching view subscribes to `draws where sessionId == …`. That means an extra listener per
watching view and possibly an index, for data that the session write can carry for free.

### D5. The price control in the dialog

The price control shows only for a random draw while the mode is on, for both the player and the DM. It goes in its
own row above the filter bar: label "Fiyat", a "−" button, a number input (`inputMode="numeric"`, whole numbers,
clamped to 0–1,000,000), a "+" button, and the unit "LP". An empty or invalid value disables the draw control until
it is fixed. It is not silently replaced.

- The chips show the hand owner's LP whenever the dialog is paid or priced, so the DM also sees Bora's LP. They show
  "Her kart N LP" when the price is above 0, and "Ücretsiz" otherwise.
- The draw control reads `🎲 Çek · N LP`, or `🎲 Çek` at 0.
- The short note reads "Kart çekmek için N LP gerekiyor." whenever `price > 0 && owner.lp < price`. For N = 1 this
  keeps today's text.
- At 360 px the row wraps with the filter bar and needs no horizontal scroll.

### D6. Mode lines

`PLAYER_DRAW_LINES.filtered` and `.pick` gain a sentence:
"Bir çekiş 1 LP; çeken kişi fiyatı değiştirebilir." The banner and the Ayarlar screen already render these lines.
`off` is unchanged.

## Risks / Trade-offs

- [Expression limit on the draw request] The new `validPayment`, the DM branch, the session price equality and the
  ledger's draw read add expressions to the heaviest write. → Keep the mode read in one helper and order the branches
  so that `kind` and `isDm()` fail fast. The emulator tests cover a paid DM draw with filters into a hand with a
  one-copy card, the heaviest case, and fail on an evaluation limit.
- [Older open tabs] A tab still running the previous build reads a draw with `cost: 2` through the old schema
  (`0 | 1`) and drops it as invalid. Its log and history would then miss that draw until reload. → The deploy reloads
  stale builds through the existing build-ID check. The risk is limited to the minutes around a deploy.
- [A player sets an extreme price by mistake] Typing 100 instead of 1 charges 100 LP. → The draw control names the
  price ("🎲 Çek · 100 LP"), the balance check stops a price above the LP, the log shows the amount, and the DM gives
  LP back by hand. This is the trust-players stance; no confirmation step is added.
- [Price race with the mode] A player's draw at another price can cross the DM's switch to "Kapalı". → D2's
  mode-changed detection covers the price, and the dialog resets to 1 LP.

## Migration Plan

No data migration. Old draws keep `cost` 0 or 1. Old session cards without `cost` read as `null` and use the old
rule. The rules and the app ship together through the CI deploy on `master`. Rollback means reverting the commit:
draws stored with other prices stay valid under the old rules, because stored draws are never re-validated, but the
old app's schema would skip them (see Risks).
