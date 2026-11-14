# Design

## Context

See proposal.md for why. The chosen look is the **V3 · Deste** row of the design canvas (https://claude.ai/artifact/XxsnKTGBEqMEC1VtbiKGYQ): `V3Draw.dc.html` (the DM's and the player's draw) and `V3Give.dc.html` ("+ Kart ver"). The canvas also keeps both dialogs as they are today. The behavior is in the delta specs: `card-draws`, `card-holdings`, `visual-effects` and `activity-log`.

The current state that shapes the approach:

- **`DrawDialog`** (`src/features/draws/`) keeps `filters: DrawFilters` in state, builds `pool` with `drawablePool` or `cursedPool`, and `candidates` with `matchesFilters`.
  - Its options come from `drawFilterOptions(pool)`, which ignores the other filters.
  - Each draw appends a `DrawResult` (`drawId`, `holdingId`, `card`) to `drawn`.
  - Every `FaceDownCard` gets one `back` per dialog, `NEUTRAL_BACK` or `CURSED_BACK`.
- **`DrawFilters`** (`cards/pool.ts`) has `cost`, `mechanicPack`, `rarity` and `keyword`, and is stored as-is on the draw record.
  - `drawFiltersSchema` (`draws/schema.ts`) parses it on read.
  - `validFilters` in `firestore.rules` requires exactly those four keys (`hasOnly` and `hasAll`).
  - Draws are create-only, so the rule only ever sees new writes.
- **`GiveCardDialog`** (`src/features/hands/`) matches `cardHaystack` against the query over `cards.data`.
  - It lists up to 30 text rows with `statusLabel` from `useCardStatuses()`.
  - It asks about the extra copy in an inline box, and keeps a `given` line after a give.
- **`CardFace`** already does what the faces in the grid need:
  - `onOpen` with `openLabel` makes it selectable
  - `isSelected` gives the gold selection glow
  - the magnifier and `zoomsOnDoubleClick` give the zoom
  - `isRevealed` gives the kind's glow
- **`spreadBack.ts`** already has a `set` back (`art.backUrl(setCode)`), with a fallback to the neutral CSS back when a set has no cardback.
- **`CardBrowser.setOptions`** lists set labels in the stored order (`setIndex.setRank`), then "Blessed". Its values are labels, not codes.

## Goals / Non-Goals

**Goals:**
- One filter model and one pill bar shared by both dialogs, so counts and clearing behave the same in both.
- Counts that stay instant on the full deck (about 750 cards) with no extra reads: everything is computed from the live `useCards()` data.
- A draw record that stays honest: its filters say what the DM narrowed by, never which card.

**Non-Goals:**
- No change to the library's filters or to `CardBrowser`, apart from sharing the set ordering helper.
- No new Firestore path, no new record kind, no change to how a draw picks or pays.
- Filters are not remembered between dialogs or devices.
- No shared view of the draw for other players. That is a separate TODO.

## Decisions

### D1. One facet model in `cards/filters.ts`

A new module holds the generic part:

- **Facets.** A facet is a named filter with a value getter per card: `set` (the set code), `cost` (the trimmed, lower-case key, as `matchesFilters` compares today), `mechanicPack`, and `rarity` or `kind`.
- **`applyFacets(cards, values, keyword, setName)`:** keeps the cards that pass every chosen facet and the keyword.
- **`facetChoices(cards, values, facet, …)`:** for one facet, filters the cards by all *other* chosen facets and the keyword, then counts each value. A chosen value with no match is still returned, with 0. One pass per facet over at most ~750 cards, memoized on the inputs, is cheap enough.
- **Ordering.**
  - Sets go in the stored order, then unknown codes alphabetically. This comes from a helper extracted from `CardBrowser.setOptions`, with an option to leave out "Blessed".
  - Costs are numbers first (`compareCosts`), then the rest.
  - Mechanic packs and other text go in Turkish alphabetical order.
- **The draw keeps `DrawFilters` as its stored shape**, now with `setCode`. `matchesFilters`, `activeFilters` and the options become thin wrappers over the facet functions, so the record's shape and the log stay as they are.
- **The give dialog uses its own values:**
  - `kind` is `common | rare | blessed | cursed`
  - `poolOnly` is a boolean, tested with `statuses.get(id).inPool`
  - the base list is the active cards (`status === 'active'`)

  These values are never stored.

- **Alternative: separate code per dialog.** Two copies of the counting and ordering logic would drift apart. The spec asks both dialogs to "show counts and clear as in the DM's draw dialog".

### D2. `setCode` on the draw record

- **`DrawFilters`** gains `setCode: string | null`, and `NO_FILTERS` gains it as `null`.
- **`drawFiltersSchema`** reads `setCode` with a default of `null`, so the records written before this change still parse (spec: "An older record"). The type stays `DrawFilters` on output. The schema test covers a record without the key.
- **`firestore.rules`.** `validFilters` adds `'setCode'` to `fields` (`hasOnly` and `hasAll`) and checks `validFilterText(filters.setCode, 100)`.
  - New draws always carry the key: the app writes `activeFilters(...)`, which sets every key.
  - The player's paid draw still needs `filters == null`, so a player can never record a set.
- **Emulator rules tests**, in the existing draw block of `tests/firestore.rules.emulator.test.ts`:
  - the DM's draw with `setCode` succeeds
  - a `setCode` over 100 characters fails
  - filters without the `setCode` key fail
  - a player's draw with a set in its filters fails

- **Alternative: the set name on the record.** The code is what cards store and what the set rules keep stable: a set's code never changes, its official name can. The log resolves the name when it shows the event.

### D3. A shared `FilterBar` with pill menus

The pieces live in `src/features/cards/`, since both `draws` and `hands` already import from `cards`:

- **`FilterBar`:** a `role="toolbar"` row that wraps. It holds one `FilterPill` per facet, an optional keyword field, and "Temizle" while any filter is on.
- **`FilterPill`:**
  - a button that shows the facet's name, or "Name: value" when a value is chosen, and opens a menu of `menuitemradio` items ("Tümü", then each value with its count)
  - when chosen, it also has a small "×" button, named "<facet> filtresini kaldır", that clears just that facet (spec: "Clearing the filters")
- **The menu's position.** It opens under its pill, `position: fixed` and placed from the pill's box, so the dialog's scrolling box never clips it. It follows the pill when the dialog scrolls or the window resizes. Under 640 px it spans the bar's width, so it fits a 360 px dialog; from 640 px it is 256 px wide and kept inside the window.
- **Keyboard:**
  - arrows move between items, Enter or Space chooses, Home and End jump
  - Escape closes the menu and returns the focus to the pill
  - Escape inside the menu calls `preventDefault` on the dialog's `cancel` event, so the native `<dialog>` does not close with it
- **Outside clicks.** A click outside the menu closes it.

- **Alternative: native `<select>`s styled as pills.** They cannot show a count beside each choice in a consistent way, or the "×". The canvas also shows a custom menu.
- **Alternative: a component library.** The project has none, and one small menu does not justify adding one.

### D4. The draw table

`DrawDialog` keeps its draw logic (`actions.drawCard`, failures, offline, `isShort`) and changes its layout:

- **Header.** The title, with "DM çekilişi ücretsizdir." or the player's LP as a pill.
- **The DM's random draw** shows the `FilterBar` (set, rarity, cost, mechanic pack, keyword).
- **`DeckPile`:** a new small component that stacks three backs with small offsets.
  - Its back is the current deck back: `{ kind: 'set', setCode }` while a set is chosen, `CURSED_BACK` in a Cursed draw, else `NEUTRAL_BACK`, drawn with `spreadBackUrl`.
  - The candidate count sits in a gold badge on it.
  - The draw control is under it, at full width.
- **The fan.** Each drawn card keeps the back that was current when it was drawn: the dialog's list holds `{ result, back }`. This replaces the one back per dialog (spec: "The deck's back").
  - The cards lie in a fan with a small rotation per index (about ±5°) and a negative margin, as on the canvas.
  - The rotation and the lift sit under `motion-safe:`, so reduced motion lays the cards straight and nothing lifts.
  - From 640 px, the deck stands at the left of the fan. Under 640 px, the fan wraps under the deck.
- **"Destede ne var?"** (DM's random draw only) toggles a section under the table.
  - It shows the candidates as revealed `CardFace`s in the library's `CardDeck`, sorted by name.
  - It shows 20 at a time, with "Daha fazla göster".
  - It never feeds the pick: `candidates` is computed as before.
- **A Blessed back can never leak.** The set back is used only while a set is chosen, and a set filter excludes Blessed cards: they have no set code. So the visual-effects rule still holds that a back never gives the card away.

### D5. "+ Kart ver" as a grid with a selection bar

- **Layout, top to bottom:** a large search field with `data-autofocus`, the `FilterBar` (set, kind, cost, mechanic pack, "Yalnızca havuzdakiler" as a toggle pill), and the count ("744 kart").
- **The grid.**
  - It is a CSS grid: 5 columns from 768 px, 4 from 640 px, and 2 below.
  - Each item is a `CardFace` with `onOpen` that selects, `openLabel="<name>: seç"`, `isSelected`, and `zoomsOnDoubleClick`.
  - The status badge is drawn at the top center of the face, clear of the cost in its top-left corner and the magnifier in its top-right, outside `CardFace` and with `pointer-events: none`. Its text comes from `statusLabel`, shortened for the badge: the holders' names, "Havuzda", "DM'e özel", or "Cursed" when a Cursed card has no holder.
  - A grid rather than `CardDeck`: the deck's overlap would hide the badges.
- **Paging.** It shows the first 20 matches sorted by name, with "Daha fazla göster" adding 20. The count resets to 20 when the search or a filter changes.
- **The selection bar.**
  - It sits in a footer at the bottom of the dialog's scroll area, with `position: sticky; bottom: 0`, together with the "Verildi" line and an error, so both stay in view under a long grid. It shows a thumbnail, "<card> → <receiver>", and the give control.
  - For a held normal card, it shows the holder and offers "Ek kopya ver" and "Vazgeç". This replaces the inline question box but keeps its logic, including the case where someone takes the card meanwhile (`taken`).
  - After a give, the selection clears and a `role="status"` line says "Verildi: <card> → <receiver>".
- **Width.** The dialog widens to `sm:max-w-5xl`, as the draw dialog already is.

### D6. The log names the set

`filtersText` in `activity-log/eventText.ts` adds the set first: `setName(setCode)` gives the official name, or the code when no stored set has it. That function needs the set index, so it is passed down from the hook that builds the rows, which already has the other lookups (spec: "A draw is one event").

## Risks / Trade-offs

- **[Risk] Escape in a pill menu closes the whole dialog.** The native `<dialog>` closes on Escape. → The menu handles Escape itself and prevents the dialog's `cancel` while it is open. A test opens a menu, presses Escape, and checks that the dialog stays open. jsdom does not close on Escape (see the dev notes), so that test asserts the `cancel` event's `defaultPrevented`.
- **[Risk] 20 card pictures at once in the give grid.** → The faces already load lazily, and paging keeps it to 20 more at a time.
- **[Trade-off] "Destede ne var?" shows the DM the candidates.** The DM already sees everything in the library, so nothing is exposed that was hidden. Players never get it.
- **[Risk] Old app versions write draws without `setCode` after the rules deploy.** The rule then denies their DM draws until the page reloads. → The app is a single-page app on Hosting, and a deploy is followed by a reload. Accepted.
- **[Trade-off] Per-card backs in one dialog.** A set back mixes with neutral backs when the DM changes the set between draws. The spec asks for this, so each card's back matches the deck it came from.

## Migration Plan

- Deploy the rules and the app together. No data migration: older draw records keep four filter keys and are read with `setCode: null`.
- Rollback: an older app reading new records ignores the extra `setCode` key, since zod strips unknown keys by default. The older rules would deny the new app's draws, so roll back both together.
