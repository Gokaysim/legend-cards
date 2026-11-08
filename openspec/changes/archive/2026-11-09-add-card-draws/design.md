# Design

## Context

See proposal.md for why. The current state that shapes the approach:

- **Cards know the pool.** Every card is live app-wide through `CardsProvider` (`useCards`, `useCardsById`). A normal card's `holder` is `null` while it is in the pool, and Blessed and Cursed cards never have a holder. So the pool can be computed from the cards alone, without the holdings.
- **Movements are client transactions checked by the rules** (`add-card-holdings`, `add-legend-points-and-log`):
  - `giveCard` writes a holding and the card's `holder`.
  - `changeBalance` writes a ledger entry and the balance that points at it (`lpEntryId`).
  - Each document's rule checks the other side with `get`/`getAfter`/`existsAfter`.
  - When two devices race, the loser's commit is denied (`permission-denied`) before the SDK can retry. The api then re-reads from the server to tell a race from a real denial.
- **Who writes what today:**
  - Only the DM creates holdings (`givenVia: 'dm' | 'transfer'`).
  - Only the DM creates ledger entries (`source: 'manual'`, with a required `reason`).
  - A user updates only their own name and picture.
  - The card rule's `takenFromPool()` already accepts any newly created open holding that the new holder points at, whoever creates it.
- **The log** (`activity-log/`) merges three queries: holdings by `givenAt`, closed holdings by `returnedAt`, and ledger entries by `at`. It derives one event per action, and a transfer once.
- **Actions through providers.** Components call writes through a context (`useBalanceActions()` from `BalancesProvider`), so unit tests inject fakes and never load Firebase.
- **The target data model** in `add-user-roles` already names:
  - `draws/{id}`, with `kind: pack | random | cursed`
  - `drawId` on holdings and ledger entries
  - the rules "random draws cost 1 LP" and "a DM's openings cost nothing"

## Goals / Non-Goals

**Goals:**
- A draw, its holding, the card's holder, and its payment can never disagree, whatever a client writes.
- A player can lower their own LP only by exactly 1, and only by paying for their own random draw.
- One draw is one transaction and one log event.
- `draws` is ready for add-pack-shop: a third kind, `pack`, with its own fields, and no change to existing records.
- The pick is a pure function, so a server function could take it over later.

**Non-Goals:**
- Server-side randomness (Cloud Functions). The owner chose to trust the client for now.
- Packs, choosing among several offered cards, and paying with GP.
- Undoing a draw. As with every movement, a mistake is corrected with the opposite action: the DM discards the card and gives the LP back by hand.
- Card pictures and cardbacks.
- Deploying the rules and the index to a real project. That happens at go-live.

## Decisions

### D1. The draw record and the changed fields

```
draws/{drawId}               auto ID; created once with everything, never changed
  kind        'random' | 'cursed'          add-pack-shop adds 'pack'
  uid         whose hand the card went to
  by          who drew: uid itself, or the DM
  at          server time
  cardId, cardName, cardKind               the drawn card, as the holding copies it
  holdingId   the holding the draw opened
  filters     null | { cost, mechanicPack, rarity, keyword }
              each string or null; rarity 'common' | 'rare' | 'blessed'; DM's random draws only
  paidWith    'lp' | 'none'
  cost        1 (lp) | 0 (none)
  entryId     the ledger entry of the payment; null when free

userCards/{holdingId}        (existing)
  givenVia    'dm' | 'transfer' | 'draw'
  drawId      string | null                the draw that opened it; missing = null

ledger/{entryId}             (existing)
  source      'manual' | 'draw'
  drawId      string | null                the draw it paid for; missing = null
  reason      string (manual) | null (draw)
```

**One record per card.** Each "🎲 Kart Çek" is its own draw, holding, and payment. The owner chose to pay and add each card at once. One record per card also keeps every request to five documents (see D2).

**Refinements of the target model** (recorded in `docs/domain.md`, as earlier changes did):
- A random or Cursed draw takes its single card at once. So it stores the card and its holding directly, and leaves out the target's `offered[]`, `chosen[]`, `status`, `createdAt`, and `chosenAt`. add-pack-shop adds those for `kind: 'pack'`, as a discriminated union on `kind`.
- `by` is new: the DM can draw into a player's hand.
- `filters` is new: it shows in the log what the DM drew from.
- `entryId` is new: it lets the rules find the payment without a query, as `lpEntryId` and `holder.userCardId` do.
- A draw payment's `reason` is `null`. The DM's "Neden" is for changes by hand, and the draw itself explains a payment.

**Alternatives:**
- *No draws collection, only a holding linked to its ledger entry.* The log could not show the DM's filters, and add-pack-shop needs `draws` anyway. Rejected.
- *One record per batch of cards.* The owner chose per-card payment. A batch would also make one request write an unbounded number of documents. Rejected.
- *A fixed Turkish reason, such as "Kart çekme", on payments.* That would store interface text in data. Rejected.

### D2. Rules: the draw is the hub

Each part of a draw checks the draw, and the draw checks that its parts are created in the same request. The new and changed rules, in outline:

```
match /draws/{drawId}
  read:   isSignedIn()
  create: validDraw() && opensItsHolding()
          && (paidByPlayer() || cursedForSelf() || freeByDm())   // isDm() last: it costs a read
  update, delete: false

  validDraw        exact fields; at == request.time; by == auth.uid; kind in [random, cursed];
                   kind random -> cardKind in [normal, blessed]; kind cursed -> cardKind == cursed, filters == null;
                   filters null or valid (strings within DRAW_LIMITS, rarity in [common, rare, blessed])
  opensItsHolding  !exists(holding) && existsAfter(holding) && getAfter(holding).drawId == drawId
  paidByPlayer     kind random && uid == auth.uid && filters == null && paidWith lp && cost 1
                   && !exists(entry) && existsAfter(entry) && getAfter(entry).drawId == drawId
  cursedForSelf    kind cursed && uid == auth.uid && paidWith none && cost 0 && entryId == null
  freeByDm         paidWith none && cost 0 && entryId == null && isDm()

match /userCards/{holdingId}  create: validNewHolding() && one of
  givenVia dm       givenByDm() && isDm()                  (as today, drawId == null)
  givenVia transfer continuesTransfer() && isDm()          (as today, drawId == null)
  givenVia draw     drawnInto():
                    !exists(draw) && existsAfter(draw); the draw names this holding, this uid, this card and kind,
                    and by == auth.uid; the holding starts inactive, without a note or cost; the card is not retired;
                    a normal card was in the pool and its holder is now this holding (never an extra copy)

match /ledger/{entryId}  create: validLedgerEntry() && (manualByDm() || paysForDraw())
  manualByDm   source manual && reason valid && drawId == null && (setsLp() || setsGp()) && isDm()
  paysForDraw  source draw && reason == null && currency lp && account == auth.uid && delta == -1
               && !exists(draw) && existsAfter(draw) && getAfter(draw).entryId == entryId && setsLp()

match /users/{uid}  update: ... || lpSetByEntry() (DM, now only for manual entries) || lpPaidForDraw()
  lpPaidForDraw  isSelf(uid) && onlyChanges([lp, lpEntryId]) && role player && lp int >= 0
                 && setByNewEntry(lpEntryId, 'lp', uid, before, lp) && getAfter(entry).source == 'draw'

match /cards/{cardId}  unchanged: takenFromPool() already accepts the drawn holding
```

**Why this closes every gap:**
- **A player cannot draw for someone else.** The draw needs `uid == auth.uid` unless the DM draws.
- **A player cannot draw for free.** Only the DM's draws and Cursed draws are free. A paid draw needs a new entry that names it.
- **A player cannot pay a different amount.** The entry's `delta == -1`, the profile's new LP must follow from the entry (`setByNewEntry`), and `balanceAfter >= 0`.
- **A player cannot draw a held, Cursed, or retired card at random.** The holding rule checks the card before and after the request, and the draw ties `kind` to `cardKind`.
- **No part can be written without the others.** Each satellite needs its draw to be created in the same request, and the draw needs its holding and, if paid, its entry.
- **What the rules cannot check** is that the pick was random. The owner accepted this (see Risks).

The DM may draw into the DM's own hand. The rules require only a profile there, as `+ Kart ver` does.

**Lookup budget.** A request may make a limited number of document lookups (`get`, `exists`, `getAfter`, `existsAfter`): 10 per document's rule and 20 for a whole transaction. The heaviest case is a player's paid draw of a normal card. It writes five documents and looks up the same five, each before and after, so about 10 distinct lookups. Repeated lookups of the same document should be cached, but that is the key assumption. Task 1 tests this case against the emulator first, before the rest is built on it (see Risks).

**Alternative:** *each pair of documents checks each other directly*, as holdings and cards do. With five documents, that means up to twenty pairs and a budget that grows with every check. A single hub keeps the checks linear. Rejected.

### D3. One transaction per draw, with the pick outside it

```
drawCard(db, { kind, uid, by, paid, filters, candidates, random })
  tried = {}
  loop (at most 5 picks):
    card = pickRandom(candidates - tried, random)       none left -> DrawError('nothing-to-draw')
    runTransaction:
      read the card: a normal card must be in the pool, and no card may be retired   else -> 'taken'
      paid: read the profile: a player with lp >= 1                              else -> 'insufficient'
      set  draws/{new}       (the D1 record)
      set  userCards/{new}   (hands' exported holding builder: givenVia 'draw', drawId)
      update card.holder     (normal only)
      paid: set ledger/{new} + update the profile's lp and lpEntryId   (balances' exported entry builder)
    'taken', or a permission-denied commit and the server shows the card held  ->  tried += card, pick again
    a permission-denied commit and the server shows the player's LP moved      ->  same card, try again
    anything else  ->  throw
```

- **The candidates come from the live cards.** The pick is uniform among the cards still drawable, so a retry after a taken card keeps every remaining card's chance equal. The transaction re-reads only the picked card, so a stale list costs a retry, never a wrong draw.
- **`pickRandom`** draws a whole number with `crypto.getRandomValues`, using rejection sampling, so there is no modulo bias. `random` is injected, so tests are deterministic.
- **Five picks** cover a busy table. After that, the error says to try again. Nothing is written or charged before a commit succeeds.
- **Exported builders.** `hands/api.ts` exports its holding builder and `balances/api.ts` its ledger entry builder. Then each document's fields stay defined in the feature that owns them, and the draw transaction only composes them.

**Alternatives:**
- *Pick inside the transaction by reading every card.* That is about 600 reads per draw. Rejected.
- *A server function.* Deferred by the owner.

### D4. The pool, the filters, and the distribution: `cards/pool.ts`

These are pure helpers on cards, so the draws feature and the library share them:
- `isDrawable(card)`: not retired, and either normal without a holder, or Blessed. `cursedPool(cards)`: the active Cursed cards.
- `DrawFilters`: `{ cost, mechanicPack, rarity: 'common' | 'rare' | 'blessed' | null, keyword }`.
- `matchesFilters(card, filters)`:
  - cost: the written cost, trimmed and compared case-insensitively
  - mechanic pack: equal
  - rarity: `blessed` means the Blessed kind; `common` and `rare` mean the card's rarity
  - keyword: `cardMatchesQuery(cardHaystack(card), keyword)`, so it matches as the library search does, hidden bracket text included
- **Filter options are derived from the drawable cards**, as in the legacy app. Numeric costs come first in numeric order, then the others (`X`, `d6`). Mechanic packs are sorted with the Turkish collator, and rarity always offers the three options.
- `poolDistribution(cards)`:
  - the total
  - each rarity with its count, its share, and its sets with their counts
  - each set with its count and share

  Blessed counts as the rarity and the set "Blessed". Sets show their official names. Entries are sorted by count, highest first, then by name. Shares use `Intl.NumberFormat('tr', { style: 'percent', maximumFractionDigits: 1 })`, which gives "%71,4".

The library's existing pool status (`hands/cardStatus.ts`) stays as it is. It also names holders, so it needs the holdings. `pool.ts` needs only `holder`, which is the source of truth for the pool.

### D5. The draw dialog and the hand buttons

- **Buttons.** `DrawButtons` sits in the hand screen's header actions, next to "+ Kart ver". It shows when the signed-in user owns the hand or is the DM. This is not `<DmOnly>`, because players see it on their own hand.
  - "☠ Cursed Kart Çek" is disabled while the Cursed Deck has no active cards.
  - "🎲 Kart Çek" always opens the dialog. The dialog explains when nothing can be drawn or LP is short.
- **`DrawDialog`**, with mode `random` or `cursed`, follows the existing dialogs (`GiveCardDialog`, `BalanceDialog`):
  - **The title** is "🎲 Kart Çek · Ayla" or "☠ Cursed Kart Çek · Ayla".
  - **A player's random draw** shows the LP live, as "Bakiye: 3 LP · Her kart 1 LP", and the control "🎲 Kart Çek (1 LP)". At 0 LP the control is disabled, with "Kart çekmek için 1 LP gerekiyor.".
  - **The DM's random draw** shows the filters (Cost, Mechanic Pack, Rarity, Kelime), "N uygun kart", and the control "🎲 Kart Çek", with the note "DM çekilişi ücretsizdir.".
  - **The Cursed draw** shows "☠ Cursed Kart Çek" with the note "Ücretsiz".
  - **While a draw runs**, the control is busy and disabled, so a double tap cannot draw twice.
  - **Failures** show as a `role="alert"` line (D6). A failed draw adds nothing to the spread.
  - **The spread** lists the cards drawn in this dialog, in order, each as a `FaceDownCard`. A face-down card is a button labelled "Kart N: çevir". Selecting it turns it over to the existing `CardFace`. With `prefers-reduced-motion`, it switches without the turn.
  - **The back** is drawn with CSS from the theme tokens. It is the same for every random draw, so it never gives a Blessed card away. Cursed draws use the `cursed` tone, since every card there is Cursed. card-images replaces it with the cardbacks.
  - **"Kapat"** closes the dialog. The drawn cards are already in the hand behind it.
- **Actions through a provider.** `DrawsProvider` gives `useDrawActions()` with `drawCard` bound to the app's Firestore, as `BalancesProvider` does. `TestDrawsProvider` lets unit tests inject fakes, and `renderApp` gets a `draws` option.

### D6. Errors

`DrawError` kinds: `nothing-to-draw`, `insufficient` (with the LP), and `retries-exhausted`. `toDrawFailure` maps these and Firebase codes to failures, and `drawFailureMessage` gives the Turkish text:

| Failure | Message |
| --- | --- |
| nothing-to-draw | "Çekilebilecek kart yok." |
| insufficient | "Kart çekmek için 1 LP gerekiyor; Ayla'nın 0 LP'si var." |
| retries-exhausted | "Kart çekilemedi: kartlar o sırada başka ellere geçti. Tekrar dene." |
| offline (`unavailable`) | "Bağlantı yok: kart çekmek için internet bağlantısı gerekiyor." |
| permission-denied | "Bu işlem için yetkin yok." |
| unknown | "Kart çekilemedi. Tekrar dene." |

### D7. İşlem Logu: draws as a third source

- **Query.** `logQueries` adds `draws`: newest first by `at`, limited to `n`, and filtered by `uid` when a user is chosen. The filtered query needs the index (`draws`: `uid` ASC, `at` DESC) in `firestore.indexes.json`.
- **Events.** `deriveEvents` maps each draw to one `drawn` event. It skips the holdings with `givenVia: 'draw'` in `given`, and the ledger entries with `source: 'draw'`. The drawn holding's later use, discard, or transfer stays its own event.
- **Paging stays exact.** Every event still comes from exactly one record of one source, so the `n` newest events are always among each source's `n` newest records. `mayHaveMore` also counts the draws.
- **Text**, after the actor's name:
  - A player's paid draw: "Aboleth's Eyes kartını çekti (−1 LP)."
  - The DM's draw for a player: "Bora'ya Aboleth's Eyes kartını çekti." With filters, it adds "(Rare · Blood & Battle)".
  - A Cursed draw: "Cursed kart çekti: Visions of Death." Drawn by the DM: "Bora'ya Cursed kart çekti: Visions of Death."

  The card name stays a `{ card }` part, as in the existing sentences.
- **Provider.** `ActivityLogProvider` subscribes to the third query, and `TestActivityLogProvider` and the fixtures get `draws`.

### D8. Where the code lives

```
src/features/draws/        new
  schema.ts                drawSchema, converter, DRAW_LIMITS (filter lengths, in step with the rules)
  api.ts                   drawsRef, drawCard (D3)
  pick.ts                  pickRandom
  errors.ts                DrawError, toDrawFailure, drawFailureMessage
  drawsContext.ts, DrawsProvider.tsx
  DrawButtons.tsx, DrawDialog.tsx, FaceDownCard.tsx
src/features/cards/pool.ts                 D4
src/features/library/PoolDistributionDialog.tsx, LibraryPage.tsx    "▥ Havuz Dağılımı"
src/features/hands/        schema (GIVEN_VIA + 'draw', drawId with default null), api (exported builder),
                           HandsPage (DrawButtons)
src/features/balances/     schema (LEDGER_SOURCES + 'draw', drawId, reason nullable with the source refinement),
                           api (exported builder)
src/features/activity-log/ api, events, eventText, provider (D7)
src/app/App.tsx            mounts DrawsProvider
firestore.rules, firestore.indexes.json, tests/firestore.rules.emulator.test.ts
```

The schemas use zod defaults for the new fields (`drawId: null`), so stored holdings and entries need no migration, as `lp` did. The ledger refinement:
- `source: 'manual'` requires a `reason` and `drawId: null`.
- `source: 'draw'` requires `reason: null`, a `drawId`, and `currency: 'lp'`.

## Risks / Trade-offs

- **[Trust] A modified client can pick the card it wants.**
  - The owner accepted this for a friends' table.
  - Mitigations:
    - every draw is permanent and listed in the log for everyone
    - the rules still enforce everything except the randomness
    - the records are the ones a server function would write, so moving the pick to the server later needs no migration
- **[Risk] The lookup budget.** The heaviest request (D2) is close to the limit if repeated lookups are not cached.
  - Task 1 writes the rules and tests that case against the emulator first.
  - If it hits the limit, drop the duplicate back-checks that the hub makes redundant. For example, the draw's check of the holding's `drawId` is implied by the holding's check of the draw's `holdingId`.
  - If even that is not enough, split the check differently, before building on it.
- **[Trade-off] The DM's draws are free.** When the DM draws for a player who should pay, it takes two actions: the draw, and an LP change by hand with a reason. This keeps the agreed rule ("a DM's openings cost nothing"). Charging from the DM's dialog would be a later change.
- **[Trade-off] No undo.** A wrong draw is corrected with the opposite actions: the DM discards the card and gives the LP back by hand. All three stay in the log.
- **[Risk] Retries under contention.** If several devices take cards at the same moment, a draw re-picks up to five times, then reports "retries-exhausted" without charging. Packs are opened at the start or end of a session, so this is rare.
- **[Risk] A rollback with draw records in the data.** An older build's schemas reject holdings with `givenVia: 'draw'` and entries with `source: 'draw'`, so its subscriptions would report `invalid-data`. Development is on the emulator only, so a rollback also clears the emulator data. Go-live comes after this change, so production never sees a rollback across it.
- **[Trade-off] The pick sees only what the device sees.** A device that is offline or behind cannot draw, because transactions need the server, and the transaction re-reads the picked card before writing.

## Migration Plan

- **No data migration.** The new fields default to `null` when they are missing, and existing records stay valid.
- **Rules and the index** go to a real project together, at go-live, with `firebase deploy --only firestore`.
- **Rollback:** revert the change and clear the emulator data (see Risks).
