# Tasks

Before running any command, run `. ~/.nvm/nvm.sh && nvm use` from the repository root. Work directly on `master`, without a feature branch. Never point a script at a real project.

`npm run test:emulator` cannot run while the owner's `npm run dev` is up: the two use the same ports, and the tests clear Firestore. Ask before stopping the owner's dev session.

## 1. Holdings data and access rules

- [x] 1.1 Add the card holder to `src/features/cards/` (D2, D6):
  - `holder: { uid, userCardId } | null` in the card schema, with a default of `null`; Blessed and Cursed cards only accept `null`
  - `CardsProvider` subscribes to all cards
  - `useCards()` keeps returning the active cards only
  - a new `useCardsById()` returns a map that includes the retired cards

  Extend `schema.test.ts`: a missing holder reads as `null`, a held normal card is accepted, and a Blessed card with a holder is rejected. Extend `cardsContext.test.tsx` for the active-only list and the map with retired cards. Verify: `npm run test` passes.
- [x] 1.2 Add `src/features/hands/schema.ts`: the holding schema from D1, with its limits, and a converter with `idField: 'id'`. Add `schema.test.ts`. It accepts an open holding and a holding closed as used, and rejects:
  - an unknown `givenVia`
  - a note over 1000 characters
  - `usedOn` on a holding that is not closed as used

  Verify: `npm run test` passes.
- [x] 1.3 Add the rules for the holding fields to `firestore.rules`:
  - the `isDm()` helper
  - the `userCards/{holdingId}` block: read for signed-in users; create by the DM only, with `validNewHolding`; the note, `active`, and `costOverride` updates; open holdings only; no delete

  Add a `userCards` describe block to `tests/firestore.rules.emulator.test.ts`, seeding a player profile, a DM profile, and cards with rules disabled. It covers:
  - create allowed for the DM, denied for a player and signed-out users
  - a holding for a user ID without a profile denied
  - wrong keys or limits denied
  - note allowed for the holder and the DM, denied for another player
  - `active` and `costOverride` allowed for the DM only
  - any change to a closed holding denied
  - delete denied

  Verify: `npm run test:emulator` passes.
- [x] 1.4 Add the movement checks of D4 to `firestore.rules`:
  - closing a holding as `used` (holder or DM), `discarded` (DM), or `transferred` (DM), each releasing or moving the holder
  - `cards/{cardId}` holder updates: `takenFromPool`, `releasedByClosedHolding`, `movedByTransfer`
  - card create and delete stay denied

  Extend the rules tests with batched writes for every path. Allowed:
  - a pool give
  - an extra copy
  - a Blessed or Cursed give
  - a use by the holder
  - a discard and a transfer by the DM

  Denied:
  - a holder set without a holding
  - a holding without the holder
  - a holder set on a card that is already held
  - a player closing someone else's card
  - a player discarding or transferring
  - text changed together with the holder
  - closing the holder's holding without releasing the card

  Keep the card-library tests passing. Verify: `npm run test:emulator` passes.
- [x] 1.5 Add `src/features/hands/api.ts` with the transactions of D3 (give, use, discard, transfer) and the plain updates (note, active, cost override). Add `errors.ts` for the Turkish failure messages:
  - the card was just taken, with the extra-copy offer
  - the holding was already closed
  - no connection
  - permission denied

  Add `src/features/hands/api.emulator.test.ts`, which runs the real transactions under the real rules and covers:
  - a pool give sets the holder
  - a held card throws "taken" unless the extra copy is allowed
  - a Cursed card is given twice
  - two concurrent gives of one pool card: exactly one wins
  - a use, with `usedOn`, releases the holder
  - a discard releases it
  - a transfer keeps the note, the cost override, and `active`, and moves the holder
  - closing an extra copy leaves the holder alone
  - closing an already closed holding fails

  Verify: `npm run test:emulator` passes.
- [x] 1.6 Add `holdingsContext.ts` and `HoldingsProvider.tsx` to `src/features/hands/` (D6): one subscription to the open holdings while signed in, plus `useOpenHoldings()`, `holdingsOf(uid)` sorted by `givenAt` with pending ones last, and `holdersOf(cardId)`.
  - Mount the provider in `src/app/App.tsx` under `CardsProvider`.
  - Add `src/test/TestHoldingsProvider.tsx`, holding fixtures, and a `holdings` option on `renderApp`.

  Add unit tests for the order and the helpers. Verify: `npm run typecheck` and `npm run test` pass.
- [x] 1.7 Update the docs:
  - `docs/domain.md`:
    - the Data model table gets `userCards/{holdingId}` and the card `holder`
    - "Deliberate decisions" notes that card history is now permanent, not one session
    - Rules notes that the legacy "↩ Havuza gönder" became "Kullan" (holder or DM) and "At" (DM)
  - `docs/conventions.md`:
    - `HoldingsProvider` and its hooks under Data access
    - `features/hands/` in the layout
    - a short note on the `isDm()` helper, and on checking both sides of a movement with `getAfter`, under "Adding a new data path"

  Verify: `npm run format:check` passes.

## 2. The "Oyuncu elleri" screen

- [x] 2.1 Add the hand routes (D5):
  - `/hands` redirects, with `replace`: a player to their own hand, the DM to the first non-DM profile or to their own hand, and a spinner while the profiles load
  - `/hands/:uid` renders the hand screen, which says in Turkish when the user ID has no profile
  - the `PageHeader` is "<name> — Kart Eli"

  Update `src/app/routes.test.tsx`: "Oyuncu elleri" is no longer a placeholder, the menu entry stays marked on `/hands/<uid>`, and a hand URL shows that hand directly. Verify: `npm run test` passes.
- [x] 2.2 Make the "Oyuncular" names in `PlayerList` links to `/hands/<uid>`. The shown user gets `aria-current`, and selecting a name closes the mobile menu. Extend `PlayerList.test.tsx` and `AppShell.test.tsx` for the user-profiles "Opening a player's hand" scenario. Verify: `npm run test` passes.
- [x] 2.3 Give `CardFace` optional hand props (D5):
  - the hand's cost, marked lower (`green`) or higher (`cursed`) when both costs are numbers
  - an "Aktif" mark
  - a note mark
  - an "Ek kopya" mark

  Extend `CardFace.test.tsx` for each mark, including no mark for an equal or non-numeric cost. Verify: `npm run test` passes.
- [x] 2.4 Add `HandSummary`, `HandView`, and `HandTable` to `src/features/hands/`:
  - **the summary:** the counts, the active effects with their visible text and Cursed marked, and the sets with their counts
  - **the hand:** in order of receipt, with a card view and a list view
  - **the list columns:** #, Kart, Set, Cost (the hand's cost), Rarity, Mechanic Pack, Metin, Durum ("Aktif" or "Elde", plus Cursed and "Ek kopya" marks)
  - **the empty state:** "Bu elde henüz kart yok."
  - **retired cards:** still shown, through `useCardsById()`

  Add component tests for every card-holdings scenario on contents, order, summary, live update, and retired cards. Verify: `npm run test` passes.
- [x] 2.5 Add `HoldingDialog`: the native `<dialog>` from D5. It holds:
  - the card face
  - the note: editable by the holder and the DM, saved on blur
  - the cost override: DM only, an empty value restores the card's cost
  - "Kullan": with the optional "Hangi karakter üzerinde?" field and its confirm button
  - for the DM only: "● Aktif et" / "✓ Aktifliği kaldır", "At" with an inline confirmation, and "Başkasına ver" with a player picker and confirmation
  - the error messages from `errors.ts`

  Add tests with the api module mocked:
  - which controls a player and the DM see
  - that each action calls the api with the right arguments
  - the confirmations, including cancelling
  - the error messages

  Verify: `npm run test` passes.
- [x] 2.6 Add `GiveCardDialog`, opened by "+ Kart ver" inside `<DmOnly>`:
  - it searches every active card with `cardHaystack`, and shows each card's status
  - choosing a card gives it
  - a held normal card first asks "<name>'nın elinde. Ek kopya verilsin mi?"
  - the dialog stays open after a give
  - the "just taken" failure switches to the extra-copy question

  Add tests with the api module mocked for search, give, the extra-copy confirmation and its cancellation, and the dialog staying open. Verify: `npm run test` passes.

## 3. Pool status in the library

- [x] 3.1 Add pool status to `CardBrowser`, `CardFace`, and `CardTable` (D6):
  - the Durum column for both decks, sortable
  - the "Elde" mark on faces
  - "Yalnızca havuzdakiler" on the Legend deck
  - the counts "Havuzda N · Ellerde M"
  - status from the card holders, the open holdings, and the profile names, live

  Pass the status in from `LibraryPage` and `CursedDeckPage`. Extend `CardBrowser.test.tsx` and `CardTable.test.tsx` for every card-library scenario on pool status, the pool-only filter, the Cursed holders, and the Durum column. Verify: `npm run check` passes.

## 4. Integration check

- [x] 4.1 Run `npm run check` and `npm run test:emulator`. Both must pass.
- [x] 4.2 Check the app in a browser, with `npm run dev` running and the cards imported:
  1. Make one emulator account the DM with `npm run set-role`, and keep a second one as a player.
  2. As the DM: give a pool card, confirm an extra copy of a held card, give a Cursed card twice, switch a card active, set a lower cost, discard a card, and transfer a card. Check that the library status and the counts update live in a second tab.
  3. As the player: use their own card on a character, and edit its note. Check that the DM-only controls are absent.
  4. Check the hand and both dialogs at 360 px with no horizontal page scroll.
- [x] 4.3 Run `openspec validate add-card-holdings --strict`. It must pass.

## Workflow follow-up

- Archive the change with `/opsx:archive` after review.
- Commit only when the owner asks, on `master`.
