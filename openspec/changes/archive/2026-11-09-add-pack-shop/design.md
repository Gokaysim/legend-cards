# Design

## Context

See proposal.md for why. The current state that shapes the approach:

- **Draws are the hub** (`add-card-draws`, D2). A `draws/{id}` record is created together with its holding, the card's holder, and its payment. Every satellite checks the draw with `getAfter`. Draws are immutable today, and `validDraw()` admits only `random` and `cursed`.
- **Client transactions, rules as the check.** A pick is made outside the transaction, and the transaction re-reads only what it needs. When a commit is denied (`permission-denied`), the api re-reads from the server to tell a race from a real denial (`drawCard`, `giveCard`, `changeBalance`).
- **Shared builders.**
  - `hands/api.ts` exports `openHolding`, and `balances/api.ts` exports `newLedgerEntry`.
  - The random pick (`pickRandom`, `randomIndex`, `cryptoRandom`) lives in `draws/pick.ts`.
  - `FaceDownCard` turns over on its own local state.
- **The pool** is derived from the cards alone (`cards/pool.ts`: `isDrawable`, `drawablePool`, `cursedPool`). Blessed cards have no set (`setCode: null`) and no rarity. "Rare" therefore never includes them.
- **The log** merges four queries:
  - holdings by `givenAt`
  - closed holdings by `returnedAt`
  - draws by `at`
  - ledger entries by `at`

  It skips drawn holdings and draw payments on the client. Its paging is exact only because each skipped record has the same time as its draw's event.
- **Sets.** `OFFICIAL_SETS` is already in shop order, with Pandemonium last, and `setOrder()` sorts by it.
- **Placeholder.** The Pack Shop route is `shops/PackShopPage.tsx`.
- **Decisions agreed with the owner** in the exploration before this change:
  - The table waits for an open pack.
  - The DM chooses for a player or cancels with a refund.
  - Only the DM pays with GP. The DM picks the currency and the amount (default: the price; 0 means free).
  - Blessed cards are mixed into the rare packs at equal chance, replacing the Golden 2% slot.

## Goals / Non-Goals

**Goals:**
- **No card goes to two places.** A card shown in an open pack can never be taken by anyone else, because nothing that moves cards or balances can happen while a pack is open.
- **The parts of a pack always agree.** The pack record, the table lock, its holdings, the card's holder, and its payment or refund can never disagree, whatever a client writes.
- **An open pack lives in Firestore, not in a component.** It survives reloads, and every device renders it from the same record.
- **Exact log paging.** Each event comes from exactly one record of one source, so the log pages exactly.
- **Random choices stay pure functions** on the cards, so a server function could make them later.

**Non-Goals:**
- **No automatic timeout or expiry** for an open pack. The owner chose the DM as the way out.
- **No server-side randomness or check of pack contents.** The rules check the shape, the size, that the shown cards are distinct, and everything that moves. They do not check that the shown cards are random or fit the pack.
- **No generic "table action" framework.** `table/main` names only the open pack. A later feature that needs the table can extend it.

## Decisions

### D1. The lock: `table/main`

```
table/main                    singleton; missing = no pack open
  openPackId   string | null  the draws/{id} of the open pack
```

- **Taking the lock.** The opening's request sets `openPackId` from `null` (or a missing document) to the new pack's ID, in the same request that creates the pack record.
- **Freeing the lock.** The choice's or the cancel's request sets it back to `null`.
- **Readable by everyone signed in.**
- **What the document's own rule checks:** only those two transitions, each against the pack record's before and after state (D3). It does not check who writes. The pack record's rule does that.

**Every other movement checks the lock** with `tableFree()`: no pack is open before or after the request. Checking both sides closes a crafted batch that opens a pack and gives one of its cards in the same request. The check is added to:
- creating a holding by `dm`, `transfer`, or `draw`
- closing a holding as used, discarded, or transferred
- creating a random or Cursed draw
- creating a ledger entry by hand (`manual`) or for a draw (`draw`)

The holder and the balances need no check of their own, because their rules already require the holding or the ledger entry that explains them. Notes, `active`, `costOverride`, and profile updates do not check the lock.

**Alternatives:**
- *Reserve the shown cards in `holder`.* That needs a third holder state, and every pool reader and rule would have to learn it. The owner also wanted the table to wait anyway. Rejected.
- *Derive "a pack is open" with a query on `draws`.* Rules cannot query. Rejected.
- *Put the lock on `party/main`.* That mixes two unrelated jobs under one rule that already checks GP. Rejected.

### D2. The pack record: `draws/{id}` with `kind: 'pack'`

```
draws/{drawId}   kind 'pack'                       created at opening; changes while open; frozen when it ends
  kind         'pack'
  uid          the hand it is for
  by           who opened it: uid itself, or the DM
  at           opening time (server)
  packType     standard | premium | cursed | pandemonium | pandemoniumCursed | mechanic | golden | cursedGolden
  setCode      the set, for the five set pack types; else null
  mechanicPack the mechanic pack, for `mechanic`; else null
  offered      [cardId]  5 cards, or 6 for the three Cursed types; distinct; in the order shown
  revealed     [index]   positions turned face up, in turning order; starts []
  paidWith     'lp' | 'gp' | 'none'
  cost         whole number: the amount paid; 0 with 'none'
  entryId      the payment's ledger entry; null when free
  status       'open' | 'chosen' | 'cancelled'
  closedAt     server time when it ended; null while open
  closedBy     who chose or cancelled; null while open
  chosen       null | { cardId, cardName, cardKind, holdingId }      set by the choice; kind normal or blessed
  cursed       null | { cardId, cardName, holdingId }                the mandatory Cursed card, Cursed types only
  refundEntryId null | string                                        the refund's entry, a cancelled paid pack only
```

**Changes to the existing records:**
- `userCards.givenVia` gains `'pack'`. A pack holding names its pack in `drawId`, so the existing field and the log's reasoning carry over.
- `ledger.source` gains `'pack'`.
  - A pack payment has `delta: -cost` and a refund has `delta: +cost`. Both have `reason: null` and the pack's `drawId`.
  - The currency is LP or GP, as the pack was paid.

**The schema.** `draws/schema.ts` becomes a union on `kind`:
- `CardDraw` (`random | cursed`, unchanged)
- `PackOpening` (`pack`)
- `Draw = CardDraw | PackOpening`

There is still one converter for the collection. The `PackOpening` refinements tie the fields together:
- paid exactly when `cost > 0` and `entryId` is set
- `closedBy` set exactly when the pack has ended
- `chosen` set exactly when it is chosen
- `cursed` set exactly when a Cursed type is chosen
- `refundEntryId` set exactly when a paid pack is cancelled
- the scope fields match the type
- `offered` has 6 cards for a Cursed type, and 5 for the others

`closedAt` may be `null` in a local snapshot while the server time is pending, so the refinement uses `closedBy`, not `closedAt`.

**`setCode` and `mechanicPack`** mirror the card fields, so the log and the title helper read them directly. A single "scope" string was considered and rejected. It would need its meaning looked up from `packType` everywhere.

**Card IDs only in `offered`.** The view and the log show the shown cards through `useCardsById()`, which keeps retired cards. Names are stored only for the cards that end up in a hand (`chosen`, `cursed`), as holdings and draws already do. The rules cannot loop over a list, so storing maps per shown card would add size without adding checks.

**Alternative:** *a separate `packs` collection.* The target model put packs in `draws` with `kind: pack`. The log's draws query and its `uid` filter index then cover packs with no new query. Rejected.

### D3. Rules

In outline. The `draws` rules gain a second create branch and an update rule. The `table/main` block is new.

```
function tablePath()            /table/main
function openPackBefore()       exists(table) ? get(table).openPackId : null
function openPackAfter()        existsAfter(table) ? getAfter(table).openPackId : null
function tableFree()            openPackBefore() == null && openPackAfter() == null
function packPrice(type)        {'standard': 2, 'premium': 3, 'cursed': 1, 'pandemonium': 3, 'pandemoniumCursed': 3,
                                 'mechanic': 4, 'golden': 4, 'cursedGolden': 3}[type]     (LP; keep in step with PACK_PRICES)
function isCursedPack(type)     type in ['cursed', 'pandemoniumCursed', 'cursedGolden']

match /table/main
  read:   isSignedIn()
  create: isSignedIn() && exactly ['openPackId'] && takenBy(next.openPackId)
  update: isSignedIn() && exactly ['openPackId'] && (
            (resource.openPackId == null && takenBy(next.openPackId))
            || (resource.openPackId is string && next.openPackId == null && freedBy(resource.openPackId)))
  delete: false
  takenBy(id)   id is string && createdNow(draw id) && getAfter(draw).kind == 'pack' && getAfter(draw).status == 'open'
  freedBy(id)   get(draw).status == 'open' && getAfter(draw).status in ['chosen', 'cancelled']

match /draws/{drawId}
  create: (validDraw() && opensItsHolding() && tableFree() && (paidByPlayer() || cursedForSelf() || (isFree() && isDm())))
          || (validPackOpening() && takesTable() && (packPaidByPlayer() || packByDm()))
  update: isSignedIn() && resource.kind == 'pack' && resource.status == 'open' && (
            (turnsCard() && (isPackOwner() || isDm()))
            || (choosesCard() && (isPackOwner() || isDm()))
            || (cancelsPack() && isDm()))
  delete: false

  validPackOpening   exact fields; kind 'pack'; by == auth.uid; at == request.time; exists(profile uid);
                     packType valid; setCode/mechanicPack non-empty strings (<= 100) or null as the type requires;
                     offered is list, size 6 for a Cursed type else 5, offered.toSet().size() == offered.size();
                     revealed == []; status 'open'; closedAt, closedBy, chosen, cursed, refundEntryId == null
  takesTable         openPackBefore() == null && openPackAfter() == drawId
  packPaidByPlayer   uid == auth.uid && paidWith 'lp' && cost == packPrice(packType) && paysWith(entryId)
  packByDm           isDm() && ((paidWith 'none' && cost == 0 && entryId == null)
                                || (paidWith in ['lp', 'gp'] && cost is int && 1 <= cost <= 1000000 && paysWith(entryId)))
  paysWith(id)       id is string && createdNow(ledger id) && getAfter(ledger id).drawId == drawId
  isPackOwner        auth.uid == resource.uid
  turnsCard          onlyChanges(['revealed']); with n = old size: next == old.concat([next[n]]),
                     next[n] is int, 0 <= next[n] < offered.size(), !(next[n] in old)
  choosesCard        onlyChanges(['status', 'closedAt', 'closedBy', 'chosen', 'cursed']); status 'chosen';
                     closedAt == request.time; closedBy == auth.uid; old revealed.size() == offered.size();
                     chosen exact keys, chosen.cardId in offered, chosen.cardKind in ['normal', 'blessed'],
                     createdNow(holding chosen.holdingId) && getAfter(that).drawId == drawId;
                     isCursedPack ? (cursed exact keys, cursed.cardId in offered, != chosen.cardId,
                                      createdNow(holding cursed.holdingId) && names this draw)
                                  : cursed == null;
                     releasesTable()
  cancelsPack        onlyChanges(['status', 'closedAt', 'closedBy', 'refundEntryId']); status 'cancelled';
                     closedAt == request.time; closedBy == auth.uid;
                     paidWith 'none' ? refundEntryId == null : paysWith(refundEntryId)
                     releasesTable()
  releasesTable      openPackBefore() == drawId && openPackAfter() == null

match /userCards/{holdingId}  create gains
  givenVia 'pack'    transferredFrom == null && drawId is string && chosenFromPack()
  chosenFromPack     before = get(draw), after = getAfter(draw):
                     before.kind == 'pack' && before.status == 'open' && after.status == 'chosen' && after.uid == data.uid
                     && ((after.chosen.holdingId == holdingId && card, name, kind == after.chosen's)
                         || (after.cursed != null && after.cursed.holdingId == holdingId && card, name == after.cursed's
                             && data.cardKind == 'cursed'))
                     && inactive, note '', costOverride null; card not retired;
                     normal card: holderBefore == null && holderAfter == {uid, holdingId}
  the 'dm', 'transfer', 'draw' branches and the closing updates (used, discarded, transferred) gain tableFree()

match /ledger/{entryId}  create gains
  forPack            source 'pack' && reason == null && drawId is string && (setsLp() || setsGp()) && (
                       (createdNow(draw) && getAfter(draw).entryId == entryId && delta == -getAfter(draw).cost
                        && matchesPayment(getAfter(draw)))
                       || (get(draw).status == 'open' && getAfter(draw).status == 'cancelled'
                           && getAfter(draw).refundEntryId == entryId && delta == get(draw).cost
                           && matchesPayment(get(draw))))
  matchesPayment(d)  (d.paidWith == 'lp' && currency 'lp' && account == d.uid)
                     || (d.paidWith == 'gp' && currency 'gp' && account == 'party')
  manualByDm and paysForDraw gain tableFree()

match /users/{uid}  update gains   || (lpSetByEntry('pack') && (isSelf(uid) || isDm()))
match /party/main   unchanged: gpSetByEntry already requires the DM, and only the DM pays or is refunded in GP
match /cards        unchanged: takenFromPool() accepts the pack holding as it accepts a drawn one
```

**Why this holds:**
- **One pack at a time.** Opening requires the lock to be free before the request and to hold this pack after it. Two openings race on `table/main`, and the loser's commit is denied.
- **The lock cannot be held or freed alone.** It changes only together with the record that opens or ends a pack, and each side checks the other.
- **No card moves while the lock is held.** Every other way of taking a card or changing a balance requires `tableFree()`. The pack's own holdings require the pack to go from open to chosen in the same request, and that releases the lock.
- **The cost is pinned.**
  - A player pays exactly the LP price, from their own LP, and only for their own hand.
  - The DM can pay any whole amount, or nothing.
  - The ledger entry's delta must match the record's `cost`, and its account must match how it was paid.
  - `setsLp`/`setsGp` tie the entry to the new balance, which never goes below 0.
- **A refund matches its payment.** It requires the pack to go from open to cancelled in the same request, and returns exactly the stored `cost` to the same account.
- **What the rules cannot check:** that the shown cards are random, fit the pack type, or that a shown normal card was in the pool. The owner accepted the same for draws (see Risks). The pool part is still enforced where it matters: a chosen normal card must have no holder (`holderBefore == null`).

**The lookup budget.** The heaviest request is the DM choosing from a Cursed type. It touches eight documents:
- the record, the lock, and both holdings
- both cards
- the hand's profile and the DM's profile

That is about 13 lookups counting before and after, under the transaction's limit of 20. No single rule makes more than 10. The heaviest opening, a DM's GP-paid pack, touches six. Task 1 writes these rules and tests the heaviest cases against the emulator before anything else builds on them, as `add-card-draws` did.

### D4. Pack definitions and contents: `packs/catalog.ts` and `packs/contents.ts`

Pure helpers on the cards, with no Firebase, unit-tested with fixtures.

- **`PACK_TYPES`, `CURSED_PACK_TYPES`, `PACK_PRICES`** (`{ lp, gp }` per type), and `packTitle(def)`. `PACK_PRICES.lp` is kept in step with `packPrice()` in the rules.
- **`packCatalog(cards)`** returns the shop's structure:
  - **Set Packs:** one group per set that has an active normal card, ordered by `setOrder()`. Pandemonium has its two packs; every other set has Standard, Premium and Cursed.
  - **Mechanic Packs:** one per mechanic pack of the active normal and Blessed cards, sorted with `compareLabels`.
  - **Golden Packs:** last.
- **`packStatus(def, cards)`** returns `{ canOpen, reason }`. `reason` names the short count in Turkish ("Havuzda yeterli kart yok: en az 9 Kesqerian Nights kartı gerekli, 4 var.") or the empty Cursed Deck.
- **The candidates.** "In the pool" is `isDrawable`. Each pack draws from these cards:

  | Pack | Candidates | Cards shown |
  | --- | --- | --- |
  | standard | the set's pool cards | 5 |
  | premium | the set's Rare pool cards, then the rest of the set | 1 Rare, then 4 from the rest |
  | cursed | the set's Common pool cards | 5, plus 1 card of `cursedPool` |
  | pandemonium | Pandemonium Rares + every active Blessed card | 5 |
  | pandemoniumCursed | Pandemonium Rares + every active Blessed card | 5, plus 1 card of `cursedPool` |
  | mechanic | that mechanic pack's pool cards, its Blessed cards included | 5 |
  | golden | every Rare + every active Blessed card | 5 |
  | cursedGolden | every Rare + every active Blessed card | 5, plus 1 card of `cursedPool` |

  The thresholds count the same candidates without the Blessed cards, except Mechanic, which counts them as the legacy app does. So the thresholds stay what they were.
- **`buildPack(def, cards, random)`** returns the shown card IDs:
  - It samples without replacement, with the same chance for each candidate.
  - It adds the Cursed card for the three Cursed types.
  - It shuffles the result. Before this, the legacy Golden pack put its Blessed card first; with the 2% slot gone, every pack is simply shuffled.
- **`random.ts` moves to `src/lib/`.** `draws/pick.ts` becomes `src/lib/random.ts`, with `randomIndex`, `pickRandom`, and the new `sample` (a partial Fisher-Yates) and `shuffle`. The draws feature and the packs feature now both need it, and the conventions put shared code in `lib/`.

### D5. Transactions: `packs/api.ts`

```
openPack(db, { def, uid, by, payment: { currency: 'lp' | 'gp', amount } | null, cards, random })
  tried = {}
  loop (at most 5):
    offered = buildPack(def, cards minus tried, random)        cannot build -> PackError('not-enough-cards')
    runTransaction:
      read table/main: a pack is open                          -> PackError('busy')
      read each shown normal card: retired or held             -> Taken(card) (outside: tried += card, again)
      paid: read the balance (profile lp, or party gp; missing 0): < amount -> PackError('insufficient', balance)
      set  draws/{new}      (open record, D2)
      set  table/main       { openPackId: new }
      paid: set ledger/{new} (source 'pack', delta -amount) + update the balance and its entry pointer
    permission-denied -> read the server: table busy -> 'busy'; a shown card held -> again; balance moved -> again;
                         otherwise throw

turnPackCard(db, drawId, index)       updateDoc(revealed: arrayUnion(index))       no transaction (D7)

choosePackCard(db, { drawId, cardId, by })
  runTransaction:
    read the record: not open -> PackError('closed'); not all turned -> PackError('not-all-turned')
    read the chosen card: Cursed or not shown -> PackError('invalid-choice'); retired or held -> PackError('unavailable')
    Cursed type: read the shown Cursed card (the one whose kind is 'cursed'); retired -> PackError('unavailable')
    set userCards/{new} (+ a second for the Cursed card): openHolding({ givenVia: 'pack', drawId, givenBy: by })
    normal card: update holder
    update the record: status 'chosen', closedAt, closedBy, chosen, cursed
    update table/main: openPackId null

cancelPack(db, { drawId, by })                                                     DM only (rules)
  runTransaction:
    read the record: not open -> PackError('closed')
    paid: read the balance
    update the record: status 'cancelled', closedAt, closedBy, refundEntryId
    paid: set ledger/{new} (source 'pack', delta +cost) + update the balance
    update table/main: openPackId null
```

- **A taken shown card** can only happen before the lock is taken, in the moment between the pick and the commit. As with draws, it is re-picked, and the player is charged once.
- **`'unavailable'` at choice time** can only come from the import script retiring a card while the pack is open. The other cards stay choosable, and the DM can cancel.
- **The new builders.**
  - `newLedgerEntry` takes `source: 'pack'` with its `drawId`.
  - `openHolding` takes `givenVia: 'pack'`.
  - A small `setBalance` helper writes the balance and its entry pointer (`lp` and `lpEntryId` on the profile, or `gp` and `gpEntryId` on the purse). `balances/api.ts` exports it, so packs and `changeBalance` write balances the same way.

### D6. Errors: `table/errors.ts` and `packs/errors.ts`

- **`TableBusyError`** (`table/errors.ts`). It is thrown by `explainDenial(db, error)`, which every movement and balance api calls on a `permission-denied`: it reads `table/main` from the server, and when a pack is open, a race with an opening becomes a clear failure.
  - The failure mappers `toDrawFailure`, `toHoldingFailure` and `toBalanceFailure` each gain `{ kind: 'table-busy' }`.
  - Its message is "Şu anda açık bir Pack var: seçim yapılana kadar kart ve bakiye işlemleri bekler."
- **`PackError`** kinds and messages (the UI fills in names):

  | Kind | Message |
  | --- | --- |
  | busy | "Şu anda Ayla bir Pack açıyor. Seçim yapılınca tekrar dene." |
  | not-enough-cards | the `packStatus` reason |
  | insufficient | "Bu Pack için 2 LP gerekiyor; Ayla'nın 1 LP'si var." or "Grup kesesinde 5.000 GP var." |
  | retries-exhausted | "Pack açılamadı: kartlar o sırada başka ellere geçti. Tekrar dene." |
  | closed | "Bu Pack artık açık değil." |
  | not-all-turned | "Önce bütün kartları çevir." |
  | invalid-choice | "Bu kart seçilemez." |
  | unavailable | "Bu kart artık seçilemiyor. Başka bir kart seç ya da DM iptal etsin." |
  | offline | "Bağlantı yok: Pack işlemleri için internet bağlantısı gerekiyor." |
  | permission-denied | "Bu işlem için yetkin yok." |
  | unknown | "Pack işlemi yapılamadı. Tekrar dene." |

### D7. Live state and providers

```
App.tsx: Auth > Users > Balances > Cards > Holdings > Table > Packs > ActivityLog > Draws > Router
```

- **`TableProvider`** (`table/`) subscribes to `table/main`.
  - `useOpenPackId()` returns the open pack's ID or `null`. While loading, it counts as free; the server is the real check.
  - `useIsTableBusy()` is what the hands, balances and draws features use to disable their controls. They import only the `table` feature, never `packs`, so the feature graph has no cycle.
- **`PacksProvider`** (`packs/`) subscribes to the open record named by the lock.
  - `useOpenPack()` returns the subscription of the open `PackOpening`, or `null`. After a pack ends, the provider keeps the last record, so the view can show the result.
  - `usePackActions()` gives `openPack`, `turnPackCard`, `choosePackCard` and `cancelPack`, bound to the app's Firestore.
  - Test providers (`TestTableProvider`, `TestPacksProvider`) and `renderApp` options `table` and `packs` follow the existing pattern.
- **Turning a card is a plain `updateDoc` with `arrayUnion`.**
  - It needs no transaction: the rules check the step, and `arrayUnion` merges a turn by the owner and one by the DM at the same moment.
  - Offline, the turn shows at once on that device and reaches the others on reconnect.
  - A turn on a pack that has meanwhile ended is denied. The view then shows the ended pack anyway.

### D8. The views

- **Pack Shop (`packs/PackShopPage.tsx`).** The route moves here from `shops/`, whose placeholder is deleted.
  - A selected group is a search parameter (`?group=Kesqer`, `?group=golden`). Reloading and the browser's back button work.
  - Tiles show the title and the price label, and a disabled state with its reason (`packStatus`, or "Ayla bir Pack açıyor").
  - **For whom.**
    - A player always opens into their own hand.
    - The DM gets a player picker above the sections. It is prefilled from `?for=<uid>`, which the hand screen's "🎁 Pack Shop" link sets for the hand being viewed. Without it, it is the first non-DM player, as on the hand screen.
- **The confirm dialog (`PackConfirmDialog`).** Selecting a tile opens it.
  - **A player:** "Kesqerian Nights Standard Pack · 2 LP", their balance, and "Pack'i aç (2 LP)". The button is disabled with "2 LP gerekiyor" when the player is short.
  - **The DM:** the player, a currency choice ("Oyuncunun LP'si" / "Grup kesesi (GP)"), and an amount input that starts at the price in the chosen currency and resets when the currency changes. A note under the input says "0 = ücretsiz". LP is disabled for a hand whose owner is not a player, and the default is then GP.
  - Failures show as a `role="alert"` line.
- **The live view (`OpenPackView` + `OpenPackBanner`, mounted in `AppShell`).** Every screen gets it.
  - **Expanded** is a modal dialog: "Ayla · Kesqerian Nights Standard Pack", who opened it, and the payment.
  - The cards are in a responsive grid: three columns on phones, up to six on wide screens.
  - The view opens by itself on every device when a new pack opens (keyed by its ID). "Küçült" shrinks it to the banner, and the banner's "Göster" expands it again.
  - **The opening animation.** It plays only when a device first sees a pack with no card turned yet: three swelling pulses and a burst, as a keyframe animation in `theme.css`. With `prefers-reduced-motion`, and for a device that joins after the first turn, the cards appear directly.
  - **The cards are controlled `FaceDownCard`s.** The component gains `isRevealed` and `onReveal`; without them it keeps its own state, so the draw dialog is unchanged.
    - The back is the same for every card of a pack: the `cursed` tone for the Cursed types, else `random`. So nothing gives the Cursed or a Blessed card away.
    - The face is not rendered before the turn.
  - **The owner and the DM** can turn cards over. Everyone else sees the backs as plain images.
  - **Choosing.** After every card is face up, the owner or the DM selects a card, and a confirm button names it ("Seç: Aboleth's Eyes"). The Cursed card shows a "Zorunlu" tag and cannot be selected.
    - Selecting before all are face up shows "Önce bütün kartları çevir.".
    - The legacy app chose on the first click. The confirm step guards a paid choice against a mistap on a phone.
  - **"İptal et ve iade et"** is `<DmOnly>`. It opens a confirmation that names the refund ("Ayla'ya 2 LP iade edilecek").
  - **When the pack ends,** the view shows the result on every device that has it expanded ("Ayla seçti: Aboleth's Eyes" or "DM iptal etti; 2 LP iade edildi") until it is closed. The banner disappears.
- **Disabled controls while busy** (`useIsTableBusy()`): "🎲 Kart Çek", "☠ Cursed Kart Çek", "+ Kart ver", Kullan, At and Devret in the holding dialog, the LP controls in the hand summary, the party purse's controls, and the Pack Shop tiles.
  - Each disabled control carries the note "Bir Pack açık: seçim bekleniyor.".
  - The note field, the active switch and the cost override stay enabled.
- **Hand screen.** A "🎁 Pack Shop" link joins the header actions, next to the draw buttons.

### D9. İşlem Logu

- **Queries.** The log leaves the satellites out at the query level:
  - `given` adds `where('givenVia', 'in', ['dm', 'transfer'])`.
  - `entries` adds `where('source', '==', 'manual')`.
  - `draws` is unchanged and now also returns pack openings.

  Every record of every query is then exactly one event, apart from the two halves of a transfer, which are already merged. This makes `newestEvents` exact again, without relying on equal times. A pack's holdings and payment are written later than its `at`, and a Cursed type writes two holdings for one event, so the old time argument no longer held. The client-side skips in `deriveEvents` are removed.
- **Indexes.**
  - Added: `userCards` (`givenVia` ASC, `givenAt` DESC) and (`uid` ASC, `givenVia` ASC, `givenAt` DESC); `ledger` (`source` ASC, `at` DESC) and (`account` ASC, `source` ASC, `at` DESC).
  - Removed: `userCards` (`uid`, `givenAt`) and `ledger` (`account`, `at`), since no query uses them any more.
- **The event.** It has `kind: 'pack'` and the time `at`, the opening time. That is right because the table waited: no other event can fall between the opening and the end. It stays live because the provider's draws query is live.
- **Text.** "Ayla için" appears only when the opener is not the hand's owner. "(seçimi DM yaptı)" appears when the chooser is neither the opener nor the owner.
  - **Open:** "Kesqerian Nights Standard Pack açıyor (−2 LP)."
  - **Chosen:** "Kesqerian Nights Standard Pack açtı ve Aboleth's Eyes kartını seçti (−2 LP)."
  - **With a Cursed card:** "… Aboleth's Eyes kartını seçti; Cursed kart: Visions of Death (−1 LP)."
  - **Cancelled:** "… açtı; DM iptal etti, 2 LP iade edildi."
  - **Payments:** "−2 LP", "−7.500 GP", or "ücretsiz".
  - **Shown cards:** a muted second line, "Sunulan: A, B, C, D, E", with names from `useCardsById()`.

### D10. Where the code lives

```
src/lib/random.ts                          from draws/pick.ts, plus sample and shuffle (D4)
src/features/table/                        new: schema, api (tableRef, explainDenial), errors (TableBusyError),
                                           tableContext, TableProvider
src/features/packs/                        new: catalog, contents, api (D5), errors, packsContext, PacksProvider,
                                           PackShopPage, PackTile, PackConfirmDialog, OpenPackView, OpenPackBanner
src/features/draws/                        schema (union, D2), api (lock-aware denial), errors (+ table-busy),
                                           FaceDownCard (controlled mode), DrawButtons (disabled while busy)
src/features/hands/                        schema (GIVEN_VIA + 'pack'), api (lock-aware denials), errors,
                                           HandsPage ("🎁 Pack Shop"), HoldingDialog and GiveCard trigger (busy)
src/features/balances/                     schema (LEDGER_SOURCES + 'pack'), api (setBalance, lock-aware), errors,
                                           HandSummary/PartyPurse controls (busy)
src/features/activity-log/                 api (D9 queries), events (+ pack), eventText, LogEventRow
src/features/shops/PackShopPage.tsx        removed (route points to packs/)
src/app/App.tsx, layout/AppShell.tsx, routes.tsx, screens.ts (packShopPath)
src/test/                                  TestTableProvider, TestPacksProvider, pack fixtures, renderApp options
firestore.rules, firestore.indexes.json, tests/firestore.rules.emulator.test.ts
docs/domain.md, docs/conventions.md
```

## Risks / Trade-offs

- **[Trade-off] A stuck table.** If the opener leaves and the DM is away, nothing can move until the DM chooses or cancels. The owner chose this over a timeout.
  - The table plays together, so the DM is there.
  - As a last resort, the DM can still act from any device, since the open pack is in Firestore.
  - No admin script is added.
- **[Trust] A modified client can choose favorable shown cards.**
  - Same acceptance as for draws: every pack opening is permanent and listed for everyone, with its shown cards.
  - The rules still enforce the size, that the cards are distinct, the lock, the payment, the choice, and the pool for the chosen card.
- **[Trust] Shown cards are readable before they are turned.** The record holds their IDs, so a curious user could read them through the browser tools. The interface never renders a face before the turn, and everyone may read everything anyway.
- **[Risk] The lookup budget.** The heaviest request (D3) is estimated at 13 of 20 lookups.
  - Task 1 tests it against the emulator first.
  - If it is too much, drop the back-checks that the hub makes redundant. For example, the record's check that each holding names it is implied by the holding's check of the record.
- **[Risk] The added lock check on every movement** raises each of those requests by one or two lookups (`table/main` before and after). The existing heaviest, a player's paid draw, goes from about 10 to 12, still under 20. Its existing rules test proves it.
- **[Trade-off] Blessed cards are frequent in rare packs.**
  - With the owner's data, about 85% of Pandemonium Packs and 45% of Golden Packs show a Blessed card, against 2% of Golden Packs in the legacy app.
  - The owner chose it knowing those numbers.
  - It is recorded as a deliberate decision in `docs/domain.md`, so nobody "fixes" it.
- **[Trade-off] A confirm step on choosing** adds one tap over the legacy app, against a mistap that costs a paid pack.
- **[Risk] A rollback with pack records in the data.** An older build's schemas reject `kind: 'pack'`, `givenVia: 'pack'` and `source: 'pack'`, so its subscriptions report `invalid-data`. Development is on the emulator only, so a rollback also clears the emulator data. Go-live comes later.

## Migration Plan

- **No data migration.** Existing records are valid under the widened schemas. `table/main` is created by the first opening, and a missing document means the table is free.
- **Rules and indexes** go to a real project together, at go-live, with `firebase deploy --only firestore`. The log needs the new indexes from the start, because its queries change in this change.
- **Rollback:** revert the change and clear the emulator data (see Risks).
