# Tasks

Before running any command, run `. ~/.nvm/nvm.sh && nvm use` from the repository root. Work directly on `master`, without a feature branch. Never point a script at a real project.

`npm run test:emulator` cannot run while the owner's `npm run dev` is up: the two use the same ports, and the tests clear Firestore. Ask before stopping the owner's dev session.

## 1. Shared randomness and record schemas

- [x] 1.1 Move `src/features/draws/pick.ts` to `src/lib/random.ts` (D4), with its test, and update the draws imports. Add:
  - `sample(items, n, random)`: `n` distinct items, each with the same chance, by a partial Fisher-Yates
  - `shuffle(items, random)`

  Add tests with a deterministic source:
  - `sample` never repeats an item
  - it returns every item when `n` equals the length
  - it can return each item
  - `shuffle` keeps every item

  Verify: `npm run check` passes.
- [x] 1.2 In `src/features/hands/schema.ts`, add `'pack'` to `GIVEN_VIA`. The refinement becomes: `draw` and `pack` holdings have a `drawId`, and the other ways have none. Extend `schema.test.ts`:
  - a pack holding with a `drawId` is valid
  - a pack holding without one is invalid
  - a `dm` holding with one is still invalid

  Verify: `npm run check` passes.
- [x] 1.3 In `src/features/balances/schema.ts`, add `'pack'` to `LEDGER_SOURCES`. A `pack` entry has no reason, has a `drawId`, and may be LP or GP; a `draw` entry stays LP only. In `balances/api.ts`, make `newLedgerEntry` keep `drawId` for `draw` and `pack`. Extend `schema.test.ts` with:
  - a GP pack payment and an LP refund (valid)
  - a pack entry with a reason, and one without a `drawId` (invalid)

  Verify: `npm run check` passes.
- [x] 1.4 In `src/features/draws/schema.ts`, turn the draw schema into a union on `kind` (D2): `CardDraw` (unchanged) and `PackOpening`, with `Draw = CardDraw | PackOpening` and one converter. Add `PACK_TYPES` and `CURSED_PACK_TYPES` there, so the record and the catalog share one list.
  - Write every `PackOpening` refinement of D2 with a test, valid and invalid each.
  - Narrow the existing users of `Draw` (`activity-log/events.ts`, `eventText.ts`, the draw dialog) to `CardDraw` where they read card fields.

  Verify: `npm run check` passes and the existing draw and log tests are unchanged.
- [x] 1.5 Create `src/features/table/schema.ts` and `api.ts`: `tableSchema` (`openPackId`: non-empty string or null), its converter, `TABLE_PATH`, and `tableRef(db)` (D1). A missing document reads as `null`, meaning free. Add `schema.test.ts`. Verify: `npm run check` passes.

## 2. Access rules

- [x] 2.1 In `firestore.rules`, add the rules of D3 for opening, turning, choosing and cancelling a pack:
  - `table/main`
  - the pack create branch and the update rule on `draws`
  - the `pack` branch on `userCards` create
  - `forPack` on `ledger`
  - the `pack` branch on `users` update

  Write the two heaviest cases first, as batched writes, and run them against the emulator before anything else:
  - the DM choosing from a Cursed Golden Pack: the record, the lock, two holdings, a normal card's holder
  - the DM opening a GP-paid pack for a player

  If a lookup limit is hit, trim the redundant back-checks as the design's Risks describe. Verify: `npm run test:emulator` passes these two cases.
- [x] 2.2 Add `tableFree()` to the existing movement rules (D1):
  - the `dm`, `transfer` and `draw` holding branches
  - closing a holding as used, discarded or transferred
  - random and Cursed draws
  - `manualByDm` and `paysForDraw`

  Re-run the existing holdings, balances and draws tests unchanged. Add tests that each of those is denied while a pack is open, the DM's included. Add tests that a note, `active` and a cost override are still allowed. Verify: `npm run test:emulator` passes.
- [x] 2.3 Add a describe block "packs" to `tests/firestore.rules.emulator.test.ts` that covers every server scenario of the pack-shop spec and the changed card-holdings and balances scenarios:
  - **allowed:**
    - a player's LP opening at the exact price
    - the DM's LP, GP and free openings
    - the DM opening into the DM's own hand, free or GP
    - turning by the owner and by the DM
    - choosing a normal and a Blessed card
    - a Cursed type's choice with both holdings
    - the DM's choice for a player
    - the DM's cancel of an LP-paid, a GP-paid, and a free pack
    - reading a pack and the table as a player
  - **denied:**
    - signed-out reads
    - opening while a pack is open, and taking the table alone
    - a player opening for someone else, paying a different amount, paying with GP, or going below 0 LP
    - a DM LP payment for a non-player
    - an opening with 4 or 7 cards, or with a repeated card
    - turning by another player, turning an out-of-range or an already-turned position, or turning two at once
    - choosing before every card is turned, choosing a card that was not shown, or choosing the Cursed card as the choice
    - a Cursed type's choice without the Cursed holding, and a normal type's choice with one
    - a choice without its holding, or one that does not free the table
    - a pack holding without the choice
    - a choice by another player
    - a cancel by a player, a cancel without its refund, and a refund of a different amount or to another account
    - changing an ended pack, and deleting a pack or the table

  Verify: `npm run test:emulator` passes.
- [x] 2.4 Update `docs/domain.md`, Data model:
  - a row for `table/main`
  - the pack fields in the `draws` row
  - `pack` as a way of giving in `userCards` and as a source in `ledger`
  - a "Packs refine the target model" list: what is new since the `add-user-roles` model, and why

  Verify: the document's paths match `firestore.rules`.

## 3. Pack catalog and contents

- [x] 3.1 Create `src/features/packs/catalog.ts` (D4):
  - `PACK_PRICES` (LP and GP per type, the LP in step with `packPrice()` in the rules)
  - `packTitle` and `packCatalog(cards)`

  Add `catalog.test.ts` with card fixtures:
  - set groups in `OFFICIAL_SETS` order with Pandemonium last
  - Pandemonium with only its two packs
  - mechanic packs in Turkish order
  - Golden Packs last
  - the titles of the spec scenarios

  Verify: `npm run check` passes.
- [x] 3.2 Add `packStatus(def, cards)` with the thresholds of the pack-shop spec and its Turkish reasons. Add tests for each type, at the threshold and one below. Include:
  - Blessed cards counting for a Mechanic Pack and not for Golden
  - held and retired cards not counting
  - an empty Cursed Deck closing the three Cursed types

  Verify: `npm run check` passes.
- [x] 3.3 Create `src/features/packs/contents.ts`, with `buildPack(def, cards, random)` and the candidates table of D4. Add tests with a deterministic source:
  - each type's size, 5 or 6
  - no repeats, and only pool cards
  - a Premium Pack has a Rare
  - a Cursed type has exactly one Cursed card
  - the rare packs can show a Blessed card, and a set pack never does
  - a Mechanic Pack shows only its mechanic
  - every candidate can be shown

  Verify: `npm run check` passes.
- [x] 3.4 Update `docs/domain.md` and `docs/conventions.md`:
  - **The domain pack rules:** Blessed cards mixed into the four rare packs, the Golden Pack's 2% slot gone, payment taken at opening, the DM's payment choice, and the table waiting.
  - **Deliberate decisions:** the LP-by-hand bullet now names pack payments. "Golden Packs have a 2% Blessed chance" becomes the mixing decision, with the owner's numbers. A new bullet covers "The table waits for an open pack".
  - **Open questions:** the "Blessed cards in Rare Packs" row moves out, as decided by the owner.
  - **Conventions:** `pandemoniumCursed` joins the `packType` list in "Domain names in code".

  Verify: the pack table matches `packStatus` and `buildPack`.

## 4. The table lock in the client

- [x] 4.1 Create the rest of `src/features/table/` (D6, D7):
  - `errors.ts` with `TableBusyError`
  - `explainDenial(db, error)` in `api.ts`
  - `tableContext.ts` and `TableProvider.tsx`, with `useOpenPackId()` and `useIsTableBusy()` (loading counts as free)

  Add `TestTableProvider` and a `table` option to `renderApp`, and mount `TableProvider` in `App.tsx` (D7 order). Add unit tests for the hooks. Add an emulator test: `explainDenial` turns a denial into `TableBusyError` while a pack is open, and passes it through otherwise. Verify: `npm run check` and `npm run test:emulator` pass.
- [x] 4.2 Call `explainDenial` on denial in `drawCard`, in the hands movements (give, use, discard, transfer) and in `changeBalance`. Add `{ kind: 'table-busy' }` and its Turkish message to `toDrawFailure`, `toHoldingFailure` and `toBalanceFailure`. Add unit tests for the mappers. Add emulator api tests in which a draw, a give and a DM LP change, each made while a pack is open, fail as table-busy and change nothing. Verify: `npm run check` and `npm run test:emulator` pass.
- [x] 4.3 Disable the controls while busy (D8), each with "Bir Pack açık: seçim bekleniyor.":
  - "🎲 Kart Çek" and "☠ Cursed Kart Çek"
  - "+ Kart ver"
  - Kullan, At and Devret in the holding dialog
  - the LP controls in the hand summary
  - the party purse's controls

  Keep the note, the active switch and the cost override enabled. Extend each component's tests with a busy table. Verify: `npm run check` passes.
- [x] 4.4 Update `docs/conventions.md`:
  - the layout (`lib/random.ts`, `features/table/`)
  - the `App.tsx` composition
  - the providers list (`useOpenPackId`, `useIsTableBusy`)
  - a Data access note: every movement and balance api calls `explainDenial`, and controls follow `useIsTableBusy()`

  Also update the `renderApp` options. Verify: the documented hooks exist.

## 5. Pack transactions

- [x] 5.1 Export `setBalance` from `balances/api.ts` (D5), and make `changeBalance` use it. Verify: the existing balances unit and emulator tests pass unchanged.
- [x] 5.2 Create `src/features/packs/api.ts` with `openPack` (D5) and `src/features/packs/errors.ts` with `PackError`, `toPackFailure` and `packFailureMessage` (D6). Add unit tests for the mapper. Add emulator tests:
  - a player's opening lowers their LP by the price
  - the DM's GP, custom LP and free openings
  - a second opening fails as `busy` and charges nothing
  - two openings at once: one succeeds and one charge is made
  - a shown card taken just before the commit is replaced, and the opener is charged once
  - not enough LP fails as `insufficient`

  Verify: `npm run test:emulator` passes.
- [x] 5.3 Add `turnPackCard` with `arrayUnion`. Add emulator tests:
  - the owner and the DM turn cards
  - two turns at the same moment both stay
  - a turn on an ended pack is denied

  Verify: `npm run test:emulator` passes.
- [x] 5.4 Add `choosePackCard`. Add emulator tests:
  - a normal choice: the card goes to the end of the hand, leaves the pool, and the table is freed
  - a Blessed choice
  - a Cursed type adds both cards
  - `not-all-turned`, `closed` and `invalid-choice`
  - `unavailable` after the admin retires the chosen card

  Verify: `npm run test:emulator` passes.
- [x] 5.5 Add `cancelPack`. Add emulator tests:
  - an LP refund to the player, and a GP refund to the purse, with the record and the ledger naming each other
  - a free pack's cancel writes no entry
  - the table is freed

  Verify: `npm run test:emulator` passes.
- [x] 5.6 Create `packsContext.ts` and `PacksProvider.tsx` (D7), with `useOpenPack()` (it keeps the last record after the pack ends) and `usePackActions()`. Add `TestPacksProvider` and a `packs` option to `renderApp`, and mount the provider in `App.tsx`. Add unit tests for the kept record. Update `docs/conventions.md` (layout, providers, `renderApp`). Verify: `npm run check` passes.

## 6. Pack Shop screen

- [x] 6.1 Create `src/features/packs/PackShopPage.tsx` and `PackTile.tsx` (D8):
  - the two sections, and groups through `?group=`
  - tiles with prices, and disabled states with the `packStatus` reason or the busy note
  - the DM's player picker, prefilled from `?for=`

  Delete `src/features/shops/PackShopPage.tsx`, point the route at the new page, and add `packShopPath(uid?)` to `screens.ts`. Update `routes.test.tsx` and `ShopsPage.test.tsx`. Add page tests for each scenario of "Pack Shop layout", "Pack types", "Pack prices", "When a pack can be opened" and "Cursed packs need the Cursed Deck". Verify: `npm run check` passes.
- [x] 6.2 Create `PackConfirmDialog.tsx` (D8):
  - **a player:** the price, their balance, and a disabled button with "2 LP gerekiyor" when short
  - **the DM:** the currency choice, an amount that starts at the price and resets on a currency change, the "0 = ücretsiz" note, and LP disabled for a non-player
  - failures as an alert, and a busy failure naming the opener

  Add tests for the spec scenarios of "A player pays with LP", "The DM chooses the payment" and "One open pack at a time". Verify: `npm run check` passes.
- [x] 6.3 Add the "🎁 Pack Shop" link to the hand screen's header actions. For the DM it carries `?for=` with the viewed hand. Extend `HandsPage.test.tsx`. Verify: `npm run check` passes.

## 7. The live open pack

- [x] 7.1 Give `FaceDownCard` a controlled mode (`isRevealed`, `onReveal`), keeping its own state when they are not passed. Extend `FaceDownCard.test.tsx` for both modes. Verify: `npm run check` passes and the draw dialog tests are unchanged.
- [x] 7.2 Create `OpenPackView.tsx` and `OpenPackBanner.tsx`, and mount them in `AppShell` (D8):
  - the view opens by itself for a new pack, shrinks to the banner, and comes back from it
  - the owner and the DM turn cards; everyone else sees read-only backs
  - every card of a pack has the same back

  Add tests for the scenarios of "Everyone watches the open pack", "Turning cards over" and "An open pack survives" (a re-render with the same record). Verify: `npm run check` passes.
- [x] 7.3 Add choosing and cancelling to the view (D8):
  - the reminder before every card is face up
  - select and confirm
  - the Cursed card tagged "Zorunlu" and not selectable
  - `<DmOnly>` "İptal et ve iade et", with a confirmation that names the refund
  - the result after the pack ends

  Add tests for the scenarios of "Every card is turned before choosing", "Choosing a card", "The mandatory Cursed card" and "The DM cancels a pack". Verify: `npm run check` passes.
- [x] 7.4 Add the opening animation as a keyframe animation in `src/styles/theme.css`. It plays only for a device that first sees a pack with no card turned, and not with `prefers-reduced-motion`. Add tests with a mocked `matchMedia`, and a test that a device joining after the first turn sees the cards at once. Verify: `npm run check` passes.
- [x] 7.5 Check the Pack Shop, the confirm dialog, the live view and the banner in the running app at 360 px wide and on a wide screen. There must be no horizontal scrolling, every card must be reachable, and the banner must not hide the page's actions. Verify: screenshots at both widths, with nothing cut off.

## 8. İşlem Logu

- [x] 8.1 Change `logQueries` (D9): `given` filtered to `dm` and `transfer`, and `entries` to `manual`. Remove the client-side skips from `deriveEvents`.
  - Update `firestore.indexes.json`: add the four indexes, and remove the two that are no longer used.
  - Extend `events.test.ts`: exact paging when packs with two holdings, payments and refunds are among the records.
  - Extend the log's emulator api test: the queries return no drawn or pack holding and no draw or pack entry.

  Verify: `npm run check` and `npm run test:emulator` pass, and the indexes file is valid JSON.
- [x] 8.2 Add the `pack` event and its text to `events.ts`, `eventText.ts` and `LogEventRow.tsx` (D9):
  - the open, chosen, chosen with a Cursed card, and cancelled sentences
  - "için", and "(seçimi DM yaptı)"
  - LP, GP and "ücretsiz"
  - the "Sunulan" line

  Add tests for each scenario of "A pack opening is one event", "A pack among the events" and "Packs in the filter". Update `docs/conventions.md` (the log's sources and queries) and the İşlem Logu decision in `docs/domain.md` (a pack is one event). Verify: `npm run check` passes.

## 9. Integration

- [x] 9.1 Run the whole suite. Verify: `npm run check` and `npm run test:emulator` both pass.
- [x] 9.2 In the running app on the emulators, with the DM in one browser and a player in another:
  - the player opens a Standard Pack, and the DM sees it open and turn live
  - other controls are disabled for both
  - the player chooses
  - the DM opens a Cursed Golden Pack for the player with GP and cancels it with a refund
  - the log shows both packs

  Verify: each step behaves as the pack-shop spec says, with screenshots.

## Workflow follow-up

- Commit only when the owner asks.
- Archive the change with `/opsx:archive` after the owner has reviewed it, and check that the main specs gained `pack-shop` and the modified requirements.
