# Tasks

Before running any command, run `. ~/.nvm/nvm.sh && nvm use` from the repository root. Work directly on `master`, without a feature branch. Never point a script at a real project.

`npm run test:emulator` cannot run while the owner's `npm run dev` is up: the two use the same ports, and the tests clear Firestore. Ask before stopping the owner's dev session.

## 1. Draw data and access rules

- [x] 1.1 In `src/features/hands/schema.ts`, add `'draw'` to `GIVEN_VIA` and a `drawId` field (string or null, default `null`) (D1). Extend the refinement: `givenVia: 'draw'` has a `drawId`, and every other way has none. Extend `schema.test.ts`:
  - a stored holding without `drawId` reads as `null`
  - a drawn holding without `drawId` is invalid
  - a `dm` holding with a `drawId` is invalid

  Verify: `npm run check` passes.
- [x] 1.2 In `src/features/balances/schema.ts`, add `'draw'` to `LEDGER_SOURCES` and a `drawId` field (string or null, default `null`), and make `reason` nullable with the source refinement of D8:
  - `manual` has a reason and no `drawId`
  - `draw` has no reason, has a `drawId`, and is LP

  Extend `schema.test.ts` with each valid and each invalid combination, including a stored manual entry without `drawId`. Verify: `npm run check` passes.
- [x] 1.3 Create `src/features/draws/schema.ts` (D1): the draw schema with its fields, the filters shape, `DRAW_LIMITS` for the filter strings, and the converter with `idField: 'id'`. Its refinements:
  - `random` draws a normal or Blessed card, and `cursed` a Cursed one
  - `paidWith: 'lp'` goes with `cost: 1` and an `entryId`, and `none` with `cost: 0` and `entryId: null`
  - a Cursed draw has no filters

  Add `schema.test.ts` for each rule. Verify: `npm run check` passes.
- [x] 1.4 Add the rules of D2 to `firestore.rules`:
  - `draws/{drawId}`
  - the `draw` branch of the `userCards` create rule
  - the source split in the `ledger` create rule
  - `lpPaidForDraw` in the `users` update rule

  Write the heaviest case first: a player's paid draw of a pool normal card, as one batch of five documents. Run it against the emulator before anything else. If it hits the lookup limit, trim the duplicate back-checks as the design's Risks describe. Then add a describe block "draws" to `tests/firestore.rules.emulator.test.ts` that covers every server scenario of the card-draws spec and the changed card-holdings, balances, and user-profiles scenarios:
  - allowed:
    - a player's paid draw of a normal card, and of a Blessed card
    - a player's Cursed draw for themselves
    - the DM's free draw into a player's hand, with filters
    - the DM's Cursed draw into a player's hand
    - the DM's draw into the DM's own hand
    - reading draws as a player
  - denied:
    - signed-out reads
    - a draw into another player's hand, random or Cursed
    - a player's free random draw, and a player's draw with filters
    - a draw without its holding, and a holding given via `draw` without its draw
    - a paid draw without its entry, without the lower LP, or with a delta of −2
    - a paid draw at 0 LP
    - a random draw of a held normal card, of a Cursed card, and of a retired card
    - a Cursed draw of a normal card
    - a holding via `draw` whose card, uid, or kind disagrees with the draw
    - a player creating a holding given via `dm`
    - a player lowering their own LP with a manual entry
    - a player paying for another player's draw
    - a draw entry with a reason, and a manual entry without one
    - `by` that is not the writer, and `at` that is not the server time
    - updating or deleting a draw

  The existing holdings and balances tests must still pass. Verify: `npm run test:emulator` passes.
- [x] 1.5 Add the `draws` index (`uid` ASC, `at` DESC) to `firestore.indexes.json` (D7). Verify: `npm run check` passes and the file is valid JSON.
- [x] 1.6 Update `docs/domain.md`:
  - **Data model:**
    - a `draws/{drawId}` row
    - the `userCards` row: `givenVia` `draw` and `drawId`
    - the `ledger` row: source `draw`, `drawId`, no reason for draws
    - the `users` row: a player's own LP payment
  - **Target model refinements:** D1's list, under a new "Draws refine the target model" paragraph.
  - **The Blessed chance:** remove the "Blessed chance in a 1-LP draw" row from "Open questions for the DM". Add to "Deliberate decisions": a random draw gives every drawable card the same chance, Blessed cards included, as in the legacy app. The rules page's fixed 2% is not used. The owner decided this in `add-card-draws`.
  - **"LP is only changed by hand":** a player's own draw now pays 1 LP, and the DM's draws are free.

  Verify: `npm run check` passes (the format check covers Markdown).

## 2. The pool and its distribution

- [x] 2.1 Create `src/features/cards/pool.ts` (D4):
  - `isDrawable`, `drawablePool`, `cursedPool`
  - `DrawFilters`, `matchesFilters`, and the filter options
  - `poolDistribution`, with the Turkish percent format

  Add `pool.test.ts`:
  - held, retired, and Cursed cards are not drawable, and Blessed cards always are
  - each filter alone and combined, including the keyword over hidden bracket text, the `blessed` rarity, and cost `X` and `d6`
  - the options' order
  - the distribution's counts, shares ("%71,4"), the sets inside each rarity, Blessed as the rarity and the set "Blessed", the order, and an empty pool

  Verify: `npm run check` passes.
- [x] 2.2 Add `src/features/library/PoolDistributionDialog.tsx` and a "▥ Havuz Dağılımı" button on `LibraryPage`:
  - the total
  - the rarity shares, each with its sets
  - the set shares
  - the empty-pool text

  Add tests for every scenario of the card-library "Pool distribution" requirement, including a live update through `setCards`. Verify: `npm run check` passes.
- [x] 2.3 Document `cards/pool.ts` in `docs/conventions.md`, under "Data access": the pool comes from the cards' `holder`, and the library's status from the holdings. Verify: `npm run check` passes.

## 3. The draw transaction

- [x] 3.1 Create `src/features/draws/pick.ts` with `pickRandom(items, random)` (D3). The default source is `crypto.getRandomValues`, with rejection sampling. Add `pick.test.ts`:
  - an injected source picks the expected item
  - every index is reachable
  - an empty list gives `null`
  - a fake source that returns the biased range is rejected and drawn again

  Verify: `npm run check` passes.
- [x] 3.2 Create `src/features/draws/errors.ts` (D6) with `DrawError`, `toDrawFailure`, and `drawFailureMessage`. Add `errors.test.ts` for each failure and its Turkish message. Verify: `npm run check` passes.
- [x] 3.3 Export the holding builder from `src/features/hands/api.ts` and the ledger entry builder from `src/features/balances/api.ts`, with `drawId: null` for their current writes (D3). Verify: `npm run check` and the existing `npm run test:emulator` suites pass unchanged.
- [x] 3.4 Create `src/features/draws/api.ts` with `drawsRef` and `drawCard` (D3). Add `api.emulator.test.ts` against the real rules:
  - a player's paid draw writes the draw, the holding, the card's holder, the entry, and the LP, all agreeing
  - a Blessed draw leaves the card without a holder
  - the DM's draw charges nothing and stores its filters
  - a Cursed draw is free
  - 0 LP gives `insufficient` and writes nothing
  - a picked card that was given away before the draw gives another card and charges once
  - two draws by the same player at once both land, with LP and the ledger right
  - no candidates gives `nothing-to-draw`

  Verify: `npm run test:emulator` passes.

## 4. The draw dialog on the hand screen

- [x] 4.1 Add `drawsContext.ts` (`useDrawActions`) and `DrawsProvider`, and mount it in `App.tsx` (D5). Add `TestDrawsProvider` and a `draws` option to `renderApp`. Verify: `npm run check` passes.
- [x] 4.2 Create `FaceDownCard.tsx`:
  - a CSS back from the theme tokens, with a `cursed` tone for Cursed draws
  - a button labelled "Kart N: çevir"
  - a turn to `CardFace`, without animation under `prefers-reduced-motion`

  Any new token gets its reason in the design and a check in `theme.test.ts`. Add tests: the back reveals nothing about the card, and selecting it shows the face. Verify: `npm run check` passes.
- [x] 4.3 Create `DrawDialog.tsx` (D5) for the random and the Cursed mode. Add `DrawDialog.test.tsx` with a fake `drawCard`, covering every dialog scenario of the card-draws spec:
  - a player's draw with the live LP, and three draws in a row
  - the control disabled at 0 LP, with its note
  - the DM's filters, "N uygun kart", and none matching
  - no filters for a player
  - the Cursed mode and its note
  - closing without flipping
  - flipping a card
  - a busy control while a draw runs
  - each failure message
  - an empty pool

  Verify: `npm run check` passes.
- [x] 4.4 Create `DrawButtons.tsx` and put it in the `HandScreen` header next to "+ Kart ver". Extend `HandsPage.test.tsx`:
  - the owner and the DM see both buttons, and another player sees neither
  - "☠ Cursed Kart Çek" is disabled when the Cursed Deck is empty
  - a drawn card appears at the end of the hand through `setHoldings`

  Verify: `npm run check` passes.
- [x] 4.5 Document the draws feature in `docs/conventions.md`:
  - the `src/features/draws/` layout entry, and `DrawsProvider` in the `App.tsx` line
  - `useDrawActions()` under "Data access"
  - the `draws` option of `renderApp` under "Authentication"

  Verify: `npm run check` passes.

## 5. Draws in the İşlem Logu

- [x] 5.1 Add the `draws` query to `logQueries` in `src/features/activity-log/api.ts` (D7). Extend `api.emulator.test.ts`: the query returns draws newest first, limited to `n`, and the filtered query only that user's draws. Verify: `npm run test:emulator` passes.
- [x] 5.2 Extend `events.ts` with `draws` in `LogRecords` and the `drawn` event (D7). Skip the drawn holdings and the draw entries. Extend `events.test.ts`:
  - one event per draw
  - no `given` or `balance` event for its parts
  - a drawn card's later use is still its own event
  - `newestEvents` stays exact, and `mayHaveMore` counts the draws

  Verify: `npm run check` passes.
- [x] 5.3 Add the draw sentences of D7 to `eventText.ts`, and test each in `eventText.test.ts`: a paid draw, the DM's draw with and without filters, and a Cursed draw by the player and by the DM. Verify: `npm run check` passes.
- [x] 5.4 Subscribe to the third query in `ActivityLogProvider`, and add `draws` to `TestActivityLogProvider` and the fixtures. Extend `ActivityLogPage.test.tsx` for every changed activity-log scenario: a draw among the events, a draw as one event, the DM's draw with filters, a Cursed draw, and draws in the player filter. Verify: `npm run check` passes.
- [x] 5.5 Document the log's third source in `docs/conventions.md` (the İşlem Logu reads holdings, draws and the ledger) and in `docs/domain.md` (the İşlem Logu lists draws). Verify: `npm run check` passes.

## 6. Integration check

- [x] 6.1 Run `npm run check` and `npm run test:emulator`. Both must pass.
- [x] 6.2 Check the app in a browser, with `npm run dev` running. The emulator data already has a DM ("Otter Otter") and a player ("Raccoon Panda").
  1. As the DM, give the player 3 LP. As the player, open your own hand and draw three cards. Flip them. The hand gains three cards, and LP drops to 0, live in a second tab. The draw control is then disabled, with its note.
  2. As the player, draw two Cursed cards. LP does not change. Open another player's hand, and check that no draw buttons are shown.
  3. As the DM, draw into the player's hand with the rarity filter "Rare", and check that the card is Rare and LP is unchanged.
  4. Open İşlem Logu: each draw is one event with its card, payment, and filters, and the player filter keeps the player's draws.
  5. Open "▥ Havuz Dağılımı" in the library, and check that the count drops after a draw.
  6. Check the draw dialog and the distribution dialog at 360 px, with no horizontal page scroll.
- [x] 6.3 Run `openspec validate add-card-draws --strict`. It must pass.

## Workflow follow-up

- Archive the change with `/opsx:archive` after review.
- Commit only when the owner asks, on `master`.
- add-pack-shop follows as its own change, built on `draws`.
