# Tasks

No rules, indexes or data change (design D1 to D3), so there is no rules group. `improve-draw-and-give-dialogs` also edits `CardFace`; whichever change lands second rebases that file (design, Risks).

## 1. Shared day grouping

- [x] 1.1 Move `groupByDay` and the `tr-TR` day and time formats out of `ActivityLogPage.tsx` and `LogEventRow.tsx` into `src/lib/days.ts`. Make them generic over items with an `at`, and add the short date format for "Son kullanım" (design D7). Verify with `src/lib/days.test.ts` (two days, one day, a pending `null` time) and with the unchanged `ActivityLogPage.test.tsx` passing

## 2. Counting

- [x] 2.1 Write `src/features/stats/cardHistory.ts`: `cardStats()` and `historyRows()` from a card's holdings, card draws, pack openings, names and `now` (design D5). Verify with `cardHistory.test.ts`, one test per scenario of these card-stats requirements:
  - "Counting how a card reached a hand": a transfer is counted apart, and Blessed copies each count
  - "Counting how a card left a hand": two uses with 2 LP, a use without a recorded payment as 0, a discard
  - "Counting cards shown in packs": shown not chosen, never turned, an open pack, a cancelled pack, the Cursed card of a chosen Cursed Pack
  - "Counting time in hands": 14 days with "3,5", an open holding up to `now`, a pending `givenAt`
  - "The Geçmiş list": the row order, and one row for a transfer
- [x] 2.2 Write `src/features/stats/historyText.ts` with the row texts and details of design D6. Use `genitive`, `dative` and `ablative` from `src/lib/turkish.ts` and `packOpeningTitle()`. Verify with `historyText.test.ts`, covering each row of the D6 table, including a DM's use, a DM's free draw, a Cursed draw, an open pack, and "kart havuza döndü" only for a normal card that is not DM-only
- [x] 2.3 Write `src/features/stats/setStats.ts`: `setCardRows()` and `setTiles()` over the counted cards, the holdings, the pack openings, the statuses and `now` (design D5). Verify with `setStats.test.ts`:
  - the 120 / 122 counting of "The cards a set's page counts", with the "Taslak", "DM'e özel" and "Kaldırıldı" marks
  - the tiles of "The set's tiles": "Açılan pack" leaves out a cancelled pack, and its parts are named "Standard", "Premium" and "Cursed", or "Pack" and "Cursed Pack" for a "Tek paket + Cursed" set
  - "Hiç ele geçmedi"
  - a holding of a card outside the set is skipped

## 3. Reading the records

- [x] 3.1 Write `src/features/stats/api.ts` with the card queries (`cardId ==` on `userCards` and on `draws`, and `offered array-contains`) and the set queries (all of `userCards`, and `kind == 'pack'` on `draws`), with the existing converters (design D2, D3). Verify with `api.emulator.test.ts` against the emulators: a player runs each query, and gets exactly the given card's holdings, its card draws and the packs that offered it, with no pack opening in the card draws query
- [x] 3.2 Write `statsContext.ts` and `StatsProvider.tsx`, injecting `useCardRecords(cardId)` and `useAllRecords()` and combining their subscriptions with `combineSubscriptions` (design D4). Mount the provider in `src/app/App.tsx` next to `ActivityLogProvider`. Verify that `npm run typecheck` passes and that the app starts against the emulators
- [x] 3.3 Add `TestStatsProvider` and a `stats` option on `renderApp` in `src/test/`, with fixtures for holdings, card draws and pack openings. Verify that `npm run test` still passes
- [x] 3.4 Document the screen's data in `docs/conventions.md`: the layout (`features/stats/`), "Data for one screen" (`StatsProvider` and its hooks, and why the set page reads all holdings), and the `renderApp` options. Add "Kart geçmişi" and "Set istatistikleri" to the glossary in `docs/domain.md`. Verify that `npm run format:check` passes

## 4. Routes

- [x] 4.1 Add `CARD_HISTORY_ROUTES`, `SET_STATS_ROUTE`, `cardHistoryPath(card)` and `setStatsPath(set)` to `src/app/screens.ts`, and the three routes to `src/app/routes.tsx`, with placeholder pages (design D8). Verify with `routes.test.tsx`: each address shows its page, "Kart kütüphanesi", "Cursed Deck" or "Setler" stays marked in the menu, and a reload of each address shows it again
- [x] 4.2 Note the detail routes in "Adding a new screen" in `docs/conventions.md`, next to the hand's route. Verify that `npm run format:check` passes

## 5. The Kart geçmişi page

- [x] 5.1 Write `CardHistoryPage.tsx` with the guards of design D8: "Kart bulunamadı." for an unknown card, a wrong route for its kind, a player's draft, and a DM-only or retired card that no one holds; the loading state; the Turkish error. Verify with `CardHistoryPage.test.tsx`, covering the scenarios of "Who opens a card's page" and "Loading and errors on the statistics pages"
- [x] 5.2 Build the page's top: the back link, the large face, the heading, the labels, and the status pill with "Taslak" and "Kaldırıldı" (spec: "The card on its page"; design V1 · Künye). Verify with the scenarios "A card in the pool" and "A held card"
- [x] 5.3 Build the eight stat tiles and the Geçmiş list grouped by day, with the empty state (specs: "The card's stat tiles", "The Geçmiş list", "A card without a history"). Verify with the scenarios "A card with a history", "The rows of a card's history", "Grouped by day" and "A card never given", and with "A use while the page is open" by updating the test provider's records
- [x] 5.4 Check the page at 360 CSS pixels in a browser against the emulators: the parts stack, the tiles wrap, and there is no horizontal scrollbar ("The statistics pages at phone width")

## 6. The Set istatistikleri page

- [x] 6.1 Write `SetStatsPage.tsx`: "Böyle bir set yok." for an unknown set, the loading and error states, the top with cardback, heading, "code: … · layout" and Cardmaker, and the neutral back without a cardback. Verify with `SetStatsPage.test.tsx`, covering "The Set istatistikleri page" and "The set at the top of its page"
- [x] 6.2 Build the eight tiles from `setTiles()` for the viewer's counted cards. Verify with the scenarios "A player's page", "The DM's page", "Reading the tiles" and "Cards never held"
- [x] 6.3 Write `SetCardTable.tsx` with sortable headings, Kullanıldı descending by default, linked names, the search and the rarity filter (design D10). Verify with the scenarios "The first rows", "Sorting by discards", "Following a name" and "Searching", and with "A set's page while a pack is chosen from"
- [x] 6.4 Check the page at 360 CSS pixels in a browser against the emulators: the tiles wrap, the table scrolls inside its area, and the page does not scroll sideways ("A phone")

## 7. Links into the pages

- [x] 7.1 Add `historyPath` to `CardFace`: a `<Link>` corner control with an inline SVG clock, marked `data-face-control`, named "<name>: geçmiş", one slot left of edit or of the magnifier, on both the picture and the CSS face (design D9). Verify with `CardFace.test.tsx`:
  - the control's name and order, for the DM and for a player
  - it is shown without hover
  - a double click outside it still zooms
  - no control without the prop
- [x] 7.2 Add `linksHistory` to `CardBrowser` and pass it from `LibraryPage` and `CursedDeckPage`. `CardTable`'s Kart cell becomes a link. Verify with `LibraryPage.test.tsx`, a new `CursedDeckPage.test.tsx` and `CardTable.test.tsx`, covering the card-library scenarios "Opening the history", "Following a name" and "Other faces"
- [x] 7.3 Add "Kart geçmişi →" under the labels in `HoldingDetails.tsx`. Verify with `HandDetailsPanel.test.tsx` and `HoldingDialog.test.tsx`, covering the card-holdings scenarios: a Legend card, a Cursed card to the Cursed Deck's address, and a held DM-only card, in the panel and in the narrow dialog
- [x] 7.4 Link each set's name on `SetsPage.tsx` to `setStatsPath(set)`, in the table and the phone cards. Verify with `SetsPage.test.tsx`, covering "Following a set's name" and "A phone"

## 8. Integration

- [x] 8.1 Seed a short history in the emulators with the owner's permission (a give, a draw, a pack, a use, a discard and a transfer), or start the emulators from the dev export without `--export-on-exit` so nothing is kept. Walk the pages in Chrome as the DM and as a player: library icon to history, hand link, Setler link to the set page, table row to history. Check that both pages update live when a card is used on another device
- [x] 8.2 Verify `npm run check` and `npm run test:emulator` pass, then stop every process on the project's ports as `CLAUDE.md` says

## Workflow follow-up

- Mark "Set istatistikleri sayfası" done in `TODOS.md` once the owner accepts the pages.
- Archive the change with `/opsx:archive` after review.
