# Tasks

## 1. The set on a draw record

- [x] 1.1 Add `setCode` to `DrawFilters` and `NO_FILTERS` in `src/features/cards/pool.ts`. `matchesFilters` compares it to the card's set code, so a set keeps Blessed cards out. `activeFilters` trims and keeps it. Extend `pool.test.ts`:
  - a set filter keeps only that set's cards and no Blessed card
  - `activeFilters` with only a set gives a filter, not `null`

  Verify: the tests pass.
- [x] 1.2 In `src/features/draws/schema.ts`, read `setCode` with a default of `null` and check it against a new `DRAW_LIMITS.setCode` of `CARD_LIMITS.setCode` (design D2). Extend `schema.test.ts`:
  - a record without `setCode` parses with `setCode: null`
  - a set code over 100 characters fails

  Verify: the tests pass.
- [x] 1.3 In `firestore.rules`, add `'setCode'` to `validFilters`' `fields` and check `validFilterText(filters.setCode, 100)`. In the draw block of `tests/firestore.rules.emulator.test.ts`, update `FILTERS` and add these tests (design D2):
  - the DM's draw with a set code succeeds
  - a set code of 101 characters fails
  - filters without the `setCode` key fail
  - a player's paid draw with a set in its filters fails

  Verify: `npm run test:emulator` passes.
- [x] 1.4 In `src/features/activity-log/eventText.ts`, name the set first in `filtersText`: the official name from the set index, or the code when no stored set has it. Pass the set index down from where the rows are built (design D6). Extend the event text tests with the `activity-log` delta's "The DM draws from one set" scenario, and a set code that no stored set has. Verify: the tests pass.
- [x] 1.5 Update the `draws/{drawId}` row in `docs/domain.md`, so the DM's filters list the set code. Verify: the row names `setCode` among the filters.

## 2. The facet model

- [x] 2.1 Extract the set ordering from `CardBrowser.setOptions` into a helper in `src/features/cards/` (design D1). It returns set codes with their labels: stored sets in the stored order, then unknown codes alphabetically, with an option to add "Blessed". Switch `CardBrowser` to it, with its values still labels. Verify: `CardBrowser.test.tsx` passes unchanged, and a new test of the helper checks the order with and without "Blessed".
- [x] 2.2 Create `src/features/cards/filters.ts` with the facets (`set`, `cost`, `mechanicPack`, `rarity` / `kind`), `applyFacets` and `facetChoices` (design D1). Make `matchesFilters` and the draw's options thin wrappers over it, and remove `drawFilterOptions` if nothing else uses it. Add `filters.test.ts`, which covers:
  - counts that apply every other chosen facet and the keyword
  - a chosen value with 0 still listed
  - cost order with "X" and "d6" last
  - set order through the helper from 2.1, without "Blessed"
  - the give dialog's `kind` (`cursed` included) and `poolOnly`

  Verify: the tests pass, and `pool.test.ts` still passes.
- [x] 2.3 Update the pool paragraph of `docs/conventions.md` to name `cards/filters.ts` beside `cards/pool.ts`. Verify: the paragraph names both modules.

## 3. The filter bar

- [x] 3.1 Create `FilterPill` and `FilterBar` in `src/features/cards/` (design D3). A pill opens a menu of `menuitemradio` items with counts. A chosen pill shows "Name: value" and a "×" named "<facet> filtresini kaldır". The bar shows "Temizle" while any filter is on, and has an optional keyword field. Under 640 px, the menu spans the bar. Add `FilterBar.test.tsx`, which covers:
  - opening a menu and choosing a value
  - the counts shown
  - "×" clearing one facet
  - "Temizle" clearing all
  - arrows, Home and End moving between items
  - Escape closing the menu, returning the focus to the pill, and preventing the surrounding `<dialog>`'s `cancel`
  - a click outside closing the menu

  Verify: the tests pass.
- [x] 3.2 List `FilterBar`, `FilterPill` and `filters.ts` in the `cards/` part of the layout tree in `docs/conventions.md`. Verify: the list matches the files.

## 4. The draw table

- [x] 4.1 Create `DeckPile` in `src/features/draws/` (design D4): three stacked backs from `spreadBackUrl`, or the neutral CSS back, with a count badge named "<n> uygun kart". Test the set, the Cursed and the neutral backs, the fallback for a set without a cardback, and the badge. Verify: the tests pass.
- [x] 4.2 Rework `DrawDialog` into the table (design D4):
  - the header: "DM çekilişi ücretsizdir." or the player's LP pill
  - for the DM's random draw, the `FilterBar` with set, rarity, cost, mechanic pack and keyword
  - `DeckPile` with the current back and the candidate count, with the draw control under it ("🎲 Çek", "🎲 Çek · 1 LP" or "☠ Cursed Kart Çek")
  - the fan beside the deck, each card with the back it was drawn under
  - for the DM's random draw only, "Destede ne var?" with revealed faces, 20 at a time

  Keep the failures, the offline and short-LP notes, and the screen reader status. Update `DrawDialog.test.tsx` for the `card-draws` delta's scenarios:
  - drawing from one set
  - the set filter's order, with no Blessed choice and no set without drawable cards
  - counts under a set, and a chosen value at 0
  - clearing, and opening the dialog again
  - looking into the deck, and its absence in a player's dialog
  - the DM's deck, and a player's table
  - a set-filtered draw, a draw without a set, and changing the set between draws

  Verify: the tests pass.
- [x] 4.3 Style the fan per the `visual-effects` delta: a rotation and an overlap per index, and the lift under the pointer or the focus, all under `motion-safe:`. From 640 px the deck stands at the left, and under 640 px the fan wraps under it. Update `FaceDownCard` only if it needs a prop for this. Verify: `FaceDownCard.test.tsx` passes, and a `DrawDialog` test checks that the fan's rotation classes sit under `motion-safe:`.

## 5. "+ Kart ver"

- [x] 5.1 Rework `GiveCardDialog` (design D5):
  - the large search with `data-autofocus`
  - the `FilterBar` with set, kind, cost, mechanic pack and a "Yalnızca havuzdakiler" toggle
  - the count
  - every active card listed without a search, sorted by name, 20 at a time with "Daha fazla göster", reset to 20 when the search or a filter changes
  - a grid of `CardFace`s with `onOpen` selecting, `isSelected` and the status badge over the corner
  - `sm:max-w-5xl`

  Verify: the browse and filter tests in 5.3 pass.
- [x] 5.2 Add the sticky selection bar (design D5). It names the card and the receiver, and gives the card. For a held normal card it shows the holder, "Ek kopya ver" and "Vazgeç", and it handles a card taken meanwhile as today. After a give it clears the selection and shows "Verildi: <card> → <receiver>". Verify: the give tests in 5.3 pass.
- [x] 5.3 Update `GiveCardDialog.test.tsx` for the `card-holdings` delta's scenarios:
  - searching and giving
  - opening the dialog, and showing more
  - one set's Rare cards, Cursed cards, and only the pool
  - a held card's badge
  - giving a card from the pool
  - a held card asking first
  - choosing with the keyboard

  Keep the existing extra copy, cancel, offline and race tests, adapted to the bar. Verify: the tests pass.

## 6. Integration checks

- [x] 6.1 Run `npm run check` and `npm run test:emulator`. Verify: both pass.
- [x] 6.2 In the browser against the dev emulators, as the DM:
  - draw for a player with Kesqerian Nights and Rare, then look into the deck
  - give a held card as an extra copy, then give a pool card
  - open the İşlem Logu and check that the draw names "Kesqerian Nights" and "Rare"

  As a player, draw once for 1 LP. Compare the dialogs with the V3 artboards. Ask the owner before any step that changes their dev data. Verify: each step behaves as the specs say.
- [x] 6.3 Check both dialogs 360 CSS pixels wide in a fixed iframe:
  - pills wrap
  - an open menu fits
  - the give grid has 2 columns
  - the fan fits
  - `scrollWidth` equals `clientWidth`

  Verify: no horizontal scroll.
- [x] 6.4 Check off the TODOS.md item "DM'in kart çekme filtrelerine set ekle; belirli bir kartı çekebilsin". Verify: the box is ticked.

## Workflow follow-up

- Archive the change with `/opsx:archive` after the owner's review.
- Stop every process on the project's ports, as CLAUDE.md asks.
