# Design

## Context

See proposal.md for why. What the screen must do is in the delta specs of `card-holdings`, `true-words`, `player-notes` and `visual-effects`. This is the current state that shapes the approach:

- **The screen.** `HandScreen` (`src/features/hands/HandsPage.tsx`) renders a `PageHeader` titled "<name> — Kart Eli", with the draw buttons, the "🎁 Pack Shop" link and the DM's "+ Kart ver". Under it, `HandContent` renders:
  - `HandSummary`: six `Stat` tiles in a `<dl>`, then two always-open sections, "Aktif efektler" and "Setler"
  - a row of three tab buttons, kept in `?tab=` (`HAND_TAB_PARAM`, `TRUE_WORDS_TAB`, `NOTES_TAB` in `src/app/screens.ts`)
  - the tab panel: `HandView`, `HandTrueWords` or `HandNotes`
- **Card details.** `HandContent` holds `selectedId`. While it names an open holding, `HoldingDialog` is rendered. It is a native modal `<dialog>` that opens on mount, so the same body cannot be rendered both as a panel and as a dialog without a switch in JavaScript. `HoldingDialog` holds the steps (`idle`, `use`, `discard`, `transfer`), the saved note and cost fields, and the error.
- **True Word details.** `HandTrueWords` holds its own `selectedId` and renders `TrueWordDialog`. Its tiles are `TrueWordTile`, which the True Words screen also uses, with a covering button.
- **Notes.** `HandNotes` (`src/features/player-notes/`) renders the player note's `NoteSection`, and inside `<DmOnly>` the DM note's. `HandContent` subscribes to the player note only for the tab's "•" marker.
- **Glows.** `faceGlow()` (`src/features/cards/display.ts`) orders active, revealed, held. `drop-shadow-glow-selected` exists for the open pack's selected card.
- **Media queries.** `useWideHover()` (`src/lib/`) wraps `matchMedia` in `useSyncExternalStore`, and so do `useReducedMotion()` and `useDeckLayout`. Without `matchMedia`, as in jsdom, it is false. `src/test/media.ts` has `stubWideHover()`.
- **Layout.** The sidebar is `w-64` from `lg` (64rem), and `main` has `lg:p-8`. At 1024 px the content is about 700 px wide.
- **v2.2.8's numbers** below come from its CSS:
  - `.content`: the 310 px side panel
  - `.hand-dashboard`: the stats three to a row and a 136 px tab column
  - `.stat-cursed`, `.stat-truewords`: the stat colors
  - `.cards-hand-wrap` and `.tw-peek-strip`: the active words behind the hand, at 140×200, 126×180 and 105×150 px
  - `.set-tooltip` and `.active-tooltip`: the stat lists
  - `.hand-detail-header`: the 205 px face in the details

  They are references for values, not code to copy.

## Goals / Non-Goals

**Goals:**
- One body for each kind of details, so the panel and the dialog cannot drift apart.
- The choice between panel and dialog comes from one live query, and no effect copies state on a resize.
- Everything stays testable in jsdom: the lists and the panel are in the DOM, and the width comes from a stubbed `matchMedia`.

**Non-Goals:**
- No pixel-exact copy of v2.2.8. Its sizes are followed where they fit the app's sidebar and grids.
- No change to any rule, write, or Firestore path. The details' controls keep their current rules.
- No change to the True Words screen's tiles.

## Decisions

### D1. One live media query for the panel

`src/lib/useMediaQuery.ts` exports `useMediaQuery(query)`. It is true while `matchMedia(query)` matches, follows changes through `useSyncExternalStore`, and is false without `matchMedia`.
- `useWideHover()` becomes a call to it with `WIDE_HOVER_QUERY`. Its behavior and tests do not change.
- `src/lib/useWideWindow.ts` exports `WIDE_WINDOW_QUERY = '(min-width: 64rem)'` and `useWideWindow()`.

Hover is not part of the query: a tablet held sideways at 1100 px has room for the panel, and the panel needs no hover.

- **Why 64rem:** the owner agreed to the sidebar's breakpoint. At 1024 px the hand gets about 380 px next to a 312 px panel. The risk is below.
- **Alternative: CSS only,** rendering the panel and hiding it below `lg`. It was rejected because the dialog opens on mount, so it cannot wait hidden in the DOM. jsdom also could not tell the layouts apart.

### D2. Selection lives in `HandContent`, tagged with the layout

`HandContent` holds two selections, one for the cards and one for the words, each as `{ id, isWide }`:
- A selection counts only while its `isWide` equals `useWideWindow()`. Crossing 1024 px therefore drops it without an effect, and no dialog opens by itself (spec: "Card details in a dialog on narrow windows"). The render that sees the mismatch also clears the state, using React's set-state-during-render pattern. Crossing back therefore does not bring the old selection back.
- The id resolves against the live entries. A card that leaves the hand, or a word taken back, resolves to nothing, so the panel shows its empty text and the dialog closes, as today.
- `HandTrueWords` no longer owns its selection. It takes `selectedId` and `onSelect` from `HandContent`, so the panel can sit in `HandContent`'s grid.
- A card selection and a word selection are kept apart. Switching tabs and back shows the same card again.

### D3. Shared detail bodies, two hosts

- **Card details.**
  - `HoldingDialog`'s body moves to `src/features/hands/HoldingDetails.tsx`: the face, the holder line, the info lines, the note, the cost, the steps, the error and `TableBusyNote`. It takes `onDone`.
  - `HoldingDialog` becomes `<Dialog title={card.name}>` around it, with `onDone={onClose}`. In the panel, `onDone` does nothing, because a card that leaves the hand already clears the panel.
  - The panel instance is keyed by the holding id, as the dialog is now, so a new selection starts at `idle`.
- **The info lines.** These are new in both hosts and follow v2.2.8's `handDetails`:
  - the set and the rarity joined with " · "
  - the mechanic pack
  - the visible text, muted

  A Cursed card shows "Cursed" and no rarity or mechanic pack. The face's picture already carries the text, but at the panel's 205 px it is hard to read.
- **True Word details.**
  - `TrueWordDialog`'s body moves to `src/features/true-words/TrueWordDetails.tsx`: the picture (`max-w-55`, v2.2.8's 220 px), the `<dl>`, the text, the retired note, the error and the DM controls.
  - `TrueWordDialog` becomes the dialog host. Taking a word back calls `onDone`.
- **The panel.** `src/features/hands/HandDetailsPanel.tsx` is a `<section aria-labelledby>` with an `<h2>`, "Seçili Kart" or "Seçili True Word", and the empty text. Its children are the details, under an `<h3>` with the card's or word's name.
  - The section is `lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto`, so it stays in view and scrolls on its own when it is tall. v2.2.8's library details panel works the same way.
  - The face is centered and at most `max-w-52` (208 px, v2.2.8's 205).
- **The grid.** `HandContent` lays out `lg:grid-cols-[minmax(0,1fr)_19.5rem]` with `gap-4`, which is v2.2.8's 310 px panel. The tab panel and the player note go in the first column, and the details panel in the second. The panel shows only on the Kartlar and True Words tabs and only while `useWideWindow()` holds. The DM notu tab uses the full width.
- **Focus.** Selecting a card leaves the focus on it, as in v2.2.8. The selected face's button and the selected row's button get `aria-current="true"`, so screen readers hear it (spec: "The selected card glows").
- **Alternative: one component that switches its own host.** It was rejected because it would mix the width query into every body and its tests.

### D4. The selected card's mark

- `CardFace` gets `isSelected`.
- `FaceGlow` gets `'selected'`. `faceGlow()` checks active first, then selected, then revealed, then held, so an active card keeps its glow (spec).
- `'selected'` maps to the existing `drop-shadow-glow-selected`. Its token comment then names both uses.

v2.2.8's hand glow is a little softer (6 px at 64%) than this token (9 px at 85%). One gold for "selected" across the app was chosen over a second, near-identical token.

In the list view, the selected row gets `bg-pane-raised` and a `border-l-2 border-gold` on its first cell.

### D5. The dashboard

`HandContent` renders a dashboard of two parts:
- **The stats.** `HandSummary` is now the stats alone, in `grid-cols-2 sm:grid-cols-3`. The DM's own hand has five stats and leaves the last cell empty.
- **The tab list.** It is `flex-col` in a `sm:w-34` (136 px) column at the stats' right. Below `sm` it is a row under them, as in v2.2.8.

The wrapper is `grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]`. The tab buttons keep `role="tab"`, `aria-selected` and `aria-controls`. Their labels are "♠ Kartlar", "✦ True Words" and, inside `<DmOnly>`, "🔒 DM notu".

The `Stat` tile becomes `src/features/hands/StatTile.tsx`, with a `tone` of `plain`, `cursed` or `word` (D7).

### D6. The stat lists open from their tiles

The "Aktif efekt ⓘ" and "Farklı set ⓘ" tiles each carry a `<button>` that covers the tile (`absolute inset-0`), as `HandTrueWords`'s tiles do. The buttons are named "Aktif efektler" and "Eldeki setler". `HandSummary` holds `openList: 'active' | 'sets' | null`:
- **Mouse and pen:** `onPointerEnter` opens a list and `onPointerLeave` closes it. Touch pointer events are ignored here.
- **Keyboard:** `onFocus` opens a list unless the focus comes from a press on the button, which its click handles. `onBlur` closes it. (`:focus-visible` was the first plan. jsdom does not report it reliably at `focusin`, so the button remembers its own press instead.)
- **Tap:** `onClick` toggles it. A `pointerdown` outside the tile and Escape close it. iOS Safari does not focus a tapped button, so blur alone cannot close it.

**The list box.** The two lists are rendered after the `<dl>`, inside its `relative` wrapper. Each is a `<section aria-labelledby>`, headed "Aktif Efektler" or "Eldeki setler" as in v2.2.8. Its contents are today's list items: the ☠ and ✦ marks and the purple glow on a word's name.
- **Closed:** it is `sr-only`. It stays in the DOM, so screen readers, search and tests can read it (spec). A transparent box, as the set note on `CardFace` uses, was the first plan. It was dropped because a long closed list would still lengthen the page.
- **Open:** it is a visible box with `pointer-events-none`.
- **Position:** `absolute inset-x-0 top-full z-40 mt-2 max-w-xl`, the stats' width under the stats. It sits above a hovered card, which is `z-30`.

**Why under the whole stats block, not under the tile as in v2.2.8:** the tiles move between columns at `sm`, and the DM's own hand has no LP tile. A list anchored under one tile would need a different alignment for each case to stay inside 360 px. Under the stats block, it can never widen the page (spec).

**Why JavaScript state, not `peer-hover`:** the lists are not siblings of the tiles' buttons. State also lets jsdom tests open and close them.

### D7. Stat colors

New tokens in `theme.css`, each with a comment:
- `stat-cursed` `#432130` and `stat-cursed-deep` `#2e1c2b`: the surface gradient
- `stat-cursed-line` `#b8485e`: the border
- `stat-cursed-ink` `#ff637e`: the number. The existing `cursed` (`#ff526d`) gives only about 4.45:1 on `stat-cursed`, so v2.2.8's own value is used. It gives about 4.9:1.
- `stat-word` `#2e274c` and `stat-word-deep` `#1d2038`: the True Words surface
- `--text-shadow-glow-cursed`: the number's glow, `0 0 16px` of `glow-cursed` at 40%

Existing tokens fill the rest:
- the True Words border: `true-word-line`
- the True Words number: `true-word`
- the Cursed label: `cursed-soft`
- the True Words label: `ink-muted`
- the plain numbers: `gold` on `pane-raised`

The gradients use `bg-linear-140` and `bg-linear-145`. `theme.test.ts` gets these pairs on both of their surfaces:
- `stat-cursed-ink` and `cursed-soft` on `stat-cursed` and `stat-cursed-deep`
- `true-word` and `ink-muted` on `stat-word` and `stat-word-deep`

### D8. Active words behind the hand

`src/features/true-words/ActiveWordsPeek.tsx` renders the strip, and `HandContent` wraps it and the hand's panel on the Kartlar tab.
- **The wrapper:** `relative isolate`. While there are active words, it gets a top padding that shows the words' upper part: `pt-20.5`, then `sm:pt-24.5` and `lg:pt-27`, which are v2.2.8's 82, 98 and 107 px.
- **The strip:** `absolute inset-x-0 top-0 flex justify-center px-5 overflow-x-clip`. It is a `<ul aria-label="Aktif True Words">` in the order learned.
- **Each word:** a `<button>` named "<name>: büyüt", with `cursor-zoom-in` and a gold focus ring.
  - **Sizes:** `w-26.25 h-37.5`, then `sm:w-31.5 sm:h-45` and `lg:w-35 lg:h-50`.
  - **Overlap:** `-mr-6`, `sm:-mr-6.75` and `lg:-mr-7.5`, with none after the last word.
  - **Picture:** `object-contain`.
  - **Without a picture:** v2.2.8's placeholder, a purple radial surface with ✦ and the name. It uses `stat-word` to `canvas`, so no new color is needed.
- **The glow:** a new single-layer `--drop-shadow-glow-word-peek` (`0 0 8px` of `glow-word` at 67%) on the button, with `drop-shadow-lift` on the inner picture box. These are two elements, because one `drop-shadow-*` utility holds one layer.
- **The hand's panel:** `relative z-1 bg-pane`, so it covers the words' lower part. Only the visible part of each word can be clicked.
- **No lift on hover,** as in v2.2.8's last CSS. Nothing moves, so reduced motion needs no case.

`overflow-x-clip` cuts the words that do not fit the width instead of scrolling the page (spec). The summary still lists every active word.

**The zoom.** `src/features/true-words/TrueWordZoomDialog.tsx` follows `CardZoomDialog`:
- It is portaled to `document.body`, and is a `Dialog` titled "✦ <name>" with `closeOnBackdrop`.
- The picture is at `w-[min(100%,563px,calc((100dvh-10rem)*563/788))]`. Without a picture, it shows the name and the visible text.
- It writes nothing.

`CardZoomDialog` is not reused, because it takes a `Card` and builds a card's line. A word has no set or rarity.

### D9. The True Words tab as picture tiles

`TrueWordTile` gets `isPictureOnly`.
- **When the picture loads:** the header (name and cost) and the text become `sr-only`, and the border, surface and padding go away, as in v2.2.8's last `.tw-tile`. The picture fills the tile. The "● Aktif" mark and the purple glow stay (spec: visual-effects).
- **When the picture is missing or fails:** the tile is drawn as today.

The True Words screen does not pass the prop, so its tiles do not change.

The hand's grid is `grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]`, about v2.2.8's 225 px. The selected tile gets `aria-current="true"` on its covering button and a gold outline. The tab's header row reads "<name> — True Words", followed by the draft link and the DM's "+ True Word öğret". The open draft panel stays above the tiles.

### D10. Notes

`HandNotes.tsx` exports two components in place of `HandNotes`:
- **`PlayerNote({ profile })`:** the player note's `NoteSection`, titled "Oyuncu notu". It subscribes through `usePlayerNote` itself, now that no tab marker needs the note.
- **`DmNote({ profile })`:** the DM note's section, titled "<name> — DM notu" with "🔒 Yalnızca DM görür".

`HandContent` renders `<PlayerNote>` under the tab panel on every tab, in the first column. On the DM notu tab, it renders `<DmOnly><DmNote/></DmOnly>`.

**The URL.** In `screens.ts`, `NOTES_TAB` is replaced by `DM_NOTE_TAB = 'dm-note'`. `tabOf(value, isDm)` maps it as follows:
- `true-words` gives `true-words`
- `dm-note` gives `dm-note` only for the DM
- anything else, the old `notes` included, gives `cards`

A player's device never mounts `DmNote`, so it never subscribes to a DM note (spec: "Players never load a DM note").

### D11. Titles

- `PageHeader` takes `screenById('hands').label`, "Oyuncu elleri", as the other screens do. Its actions do not change.
- **The Kartlar tab:**
  - The hand's panel is `rounded-xl border border-line bg-pane p-4`.
  - Its header row has an `<h2>`, "<name> — Kart Eli", then "N kart · alınış sırası" and the view switch. These were in `HandView`'s header.
  - `HandView` takes the heading as a prop.
- **The other tabs** use "<name> — True Words" (D9) and "<name> — DM notu" (D10).

### D12. Tests

- **`useMediaQuery.test.ts`:** match and no match, a change event, and false without `matchMedia`. `useWideHover.test.ts` keeps passing unchanged.
- **`src/test/media.ts`:** `stubMedia(...queries)` matches the given queries. `stubWideHover()` becomes `stubMedia(WIDE_HOVER_QUERY)`, and a new `stubWideWindow()` is `stubMedia(WIDE_WINDOW_QUERY)`.
- **`HandsPage.test.tsx`:**
  - the title "Oyuncu elleri" and the `<h2>` "Gökay — Kart Eli"
  - the tab order "♠ Kartlar", "✦ True Words", "🔒 DM notu" for the DM, and two tabs for a player
  - `?tab=dm-note` for a player opens Kartlar, and so does `?tab=notes` for anyone
  - the player note under the cards and under the True Words for all, editable as today, with no DM note request on a player's device
  - the DM note only on its tab, and no marker on any label
- **`HandView.test.tsx`:**
  - the summary lists are in the DOM while closed, and `sr-only`
  - a mouse `pointerEnter` opens a list and `pointerLeave` closes it
  - a click toggles a list, and Escape or a `pointerdown` outside closes it
  - a touch `pointerEnter` does nothing
  - the selected row's `aria-current` and mark
- **Panel tests, with `stubWideWindow()`:**
  - selecting shows the "Seçili Kart" panel and no `dialog`
  - the selected face has `aria-current` and `data-glow="selected"`, and an active selected face keeps `active`
  - the empty text
  - a card leaving the hand clears the panel
  - a change event that drops the wide query clears the selection, and no dialog opens
  - Every `HoldingDialog.test.tsx` case for controls, notes, cost and actions renders `HoldingDetails` in both hosts. A `describe.each` over the hosts keeps one copy of the cases.
- **`display.test.ts`:** `faceGlow` with `isSelected`, under `isActive`.
- **`HandTrueWords.test.tsx`:**
  - picture tiles: the name and cost are `sr-only` with a picture, and visible without one
  - the details in the panel when wide, and the dialog when narrow
  - the DM controls in both
- **`ActiveWordsPeek.test.tsx`:**
  - only active words, in the order learned, and live
  - the placeholder without a picture
  - nothing without active words
  - a button opens the zoom dialog, and Escape closes it
- **`theme.test.ts`:** the D7 pairs.
- **Manual, in Chrome:** at 1280 px, 1024 px and 360 px, with the DM's and a player's account, check:
  - the panel and its stickiness
  - the lists over the hand
  - the peek
  - no horizontal scroll at 360 px, measured with the fixed iframe as before

## Risks / Trade-offs

- **[Risk] At 1024–1279 px the hand next to the panel is narrow** (about 380 px, one or two cards a row). → The owner will check it in testing. Moving the panel to `xl` changes only `WIDE_WINDOW_QUERY`.
- **[Risk] Keyboard users reach the panel only after the remaining cards,** because the focus stays on the card. → The selected card is announced through `aria-current`. If testing shows a need, moving the focus to the panel's heading is a contained follow-up.
- **[Risk] An open list covers the top of the hand.** v2.2.8 does the same. → It takes no pointer events and closes when the pointer leaves or with Escape.
- **[Risk] Many active words on a phone get clipped at the sides.** → The summary lists them all. The DM rarely keeps more than three or four active.
- **[Trade-off] The details now repeat the card's text under the face.** → It follows v2.2.8, and it matters most at the panel's size.
- **[Risk] Old `?tab=notes` links stop opening the notes.** → They open Kartlar, where the player note now is. The links were only ever in the address bar.

## Migration Plan

This is a client-only change. It has no data, rules or deployment steps, and a revert of its commit rolls it back. The main `player-notes` spec's Purpose names the Notlar tab, so it is reworded during apply (tasks), because a delta cannot change a Purpose.
