# Tasks

## 1. Media queries

- [x] 1.1 Create `src/lib/useMediaQuery.ts` (design D1): `useMediaQuery(query)` is true while `matchMedia(query)` matches, live through `useSyncExternalStore`, and false without `matchMedia`. Add `useMediaQuery.test.ts`, which stubs `matchMedia` as `useWideHover.test.ts` does. It checks:
  - a match and no match
  - a change event switches it
  - false without `matchMedia`

  Verify: the tests pass.
- [x] 1.2 Rewrite `useWideHover()` as `useMediaQuery(WIDE_HOVER_QUERY)`, keeping its export and doc comment. Create `src/lib/useWideWindow.ts` with `WIDE_WINDOW_QUERY = '(min-width: 64rem)'` and `useWideWindow()`. Verify: `useWideHover.test.ts` passes unchanged.
- [x] 1.3 In `src/test/media.ts`, add `stubMedia(...queries)`, which matches only the given queries. Rewrite `stubWideHover()` on it, and add `stubWideWindow()`. In `docs/conventions.md`, add `useMediaQuery.ts` and `useWideWindow.ts` to the `lib/` list. Verify: `npm run check` passes, and the shop tests that use `stubWideHover()` still pass.

## 2. Tokens

- [x] 2.1 Add the stat tokens to `src/styles/theme.css` (design D7), each with a comment naming its use:
  - `stat-cursed` `#432130`, `stat-cursed-deep` `#2e1c2b`, `stat-cursed-line` `#b8485e` and `stat-cursed-ink` `#ff637e`
  - `stat-word` `#2e274c` and `stat-word-deep` `#1d2038`
  - `--text-shadow-glow-cursed`: `0 0 16px` of `glow-cursed` at 40%
  - `--drop-shadow-glow-word-peek`: one layer, `0 0 8px` of `glow-word` at 67%

  Extend the comment of `--drop-shadow-glow-selected` to name the hand's selected card. Add the D7 pairs to `src/styles/theme.test.ts`:
  - `stat-cursed-ink` and `cursed-soft` on `stat-cursed` and `stat-cursed-deep`
  - `true-word` and `ink-muted` on `stat-word` and `stat-word-deep`

  Verify: `theme.test.ts` passes.

## 3. The selected card's mark

- [x] 3.1 Add `'selected'` to `FaceGlow` in `src/features/cards/display.ts`. `faceGlow()` takes `isSelected` and checks it after `isActive` and before `isRevealed` (design D4). Extend `display.test.ts`:
  - selected gives `selected`
  - active and selected gives the active glow of the card's kind

  Verify: the tests pass.
- [x] 3.2 Give `CardFace` an `isSelected` prop. It maps `'selected'` to `drop-shadow-glow-selected`, and sets `aria-current="true"` on the face's open button while selected. Extend `CardFace.test.tsx`:
  - `data-glow="selected"` and `aria-current` on a selected face
  - an active selected face keeps its active glow

  Verify: the tests pass.
- [x] 3.3 Give `HandTable` a `selectedId`. The selected row has `bg-pane-raised`, a `border-l-2 border-gold` first cell, and `aria-current="true"` on its name button. Add a case to `HandView.test.tsx`. Verify: the tests pass.

## 4. Notes: the player note under the hand, and the DM notu tab

- [x] 4.1 In `src/app/screens.ts`, replace `NOTES_TAB` with `DM_NOTE_TAB = 'dm-note'` and update the doc comment. In `HandsPage.tsx`, `tabOf(value, isDm)` maps as follows (design D10):
  - `true-words` gives `true-words`
  - `dm-note` gives `dm-note` only for the DM
  - anything else gives `cards`

  The tabs are "♠ Kartlar", "✦ True Words" and, inside `<DmOnly>`, "🔒 DM notu". Remove the "•" marker and the hand screen's own `usePlayerNote` subscription. Verify: `npm run typecheck` passes.
- [x] 4.2 Split `HandNotes.tsx` (design D10):
  - `PlayerNote({ profile })` is titled "Oyuncu notu" and subscribes through `usePlayerNote`.
  - `DmNote({ profile })` is titled "<name> — DM notu" and keeps "🔒 Yalnızca DM görür".

  `HandContent` renders `PlayerNote` under the tab panel on every tab, and `<DmOnly><DmNote/></DmOnly>` as the DM notu tab's content. Rewrite the `the Notlar tab` tests in `HandsPage.test.tsx` and the notes component tests:
  - the player note under the cards and under the True Words, editable for its player and the DM, and read-only for others
  - a DM notu tab only for the DM, third, kept in the URL and restored on reload
  - `?tab=dm-note` opens Kartlar for a player, and `?tab=notes` opens Kartlar for anyone
  - a player's device makes no DM note request
  - the DM note never shows on Kartlar or True Words
  - no tab label carries a marker

  Verify: the tests pass.
- [x] 4.3 Update the docs:
  - `docs/domain.md`: the Hand, Player note and DM note glossary rows, and "The DM note is private" (line 434). The player note shows under the hand on every tab, and the DM note on the DM's own "🔒 DM notu" tab, with no marker. Record that the owner chose this on 2026-11-11, following v2.2.8.
  - `docs/conventions.md`: the `player-notes/` folder line names `PlayerNote` and `DmNote` instead of "the hand's Notlar tab (HandNotes)".
  - The Purpose line of `openspec/specs/player-notes/spec.md`: it names the hand screen and the DM notu tab instead of the Notlar tab (design, Migration Plan).

  Verify: `npm run check` passes.

## 5. The dashboard and the stat lists

- [x] 5.1 Create `src/features/hands/StatTile.tsx` from `HandSummary`'s `Stat` (design D5, D7). Its `tone` is `plain`, `cursed` or `word`:
  - The surface is `bg-pane-raised`. The `cursed` tone uses the `bg-linear-140` `stat-cursed` gradient, the `stat-cursed-line` border, the `cursed-soft` label, and the `stat-cursed-ink` number with `text-shadow-glow-cursed`. The `word` tone uses the `bg-linear-145` `stat-word` gradient, the `true-word-line` border and the `true-word` number.
  - Plain numbers are `text-gold`.
  - The `action` slot (the DM's "± LP") stays.

  Verify: `npm run check` passes.
- [x] 5.2 Rework `HandSummary` to render the stats only, in `grid-cols-2 sm:grid-cols-3`, with the "Aktif efekt ⓘ" and "Farklı set ⓘ" lists of design D6:
  - a covering button named "Aktif efektler" or "Eldeki setler"
  - `openList` state: mouse and pen `pointerenter` and `pointerleave`, focus that does not come from a press, blur, a click to toggle, and Escape or a `pointerdown` outside to close
  - each list a `<section>` after the `<dl>` at `absolute inset-x-0 top-full z-40 mt-2 max-w-xl`, `sr-only` while closed, with today's list items under v2.2.8's headings "Aktif Efektler" and "Eldeki setler"

  Remove the two always-open sections. Update the `hand summary` tests in `HandView.test.tsx`:
  - the counts and the lists' text as before, read while closed
  - closed lists are `sr-only`
  - a mouse `pointerEnter` opens and `pointerLeave` closes
  - a touch `pointerEnter` does nothing
  - a click toggles
  - Escape and an outside `pointerdown` close

  Verify: the tests pass.
- [x] 5.3 In `HandContent`, build the dashboard (design D5): the stats, and the tab list beside them. The tab list is `sm:flex-col sm:w-34`, and a row below `sm`, with the existing `role="tab"` wiring. Verify: the tab tests in `HandsPage.test.tsx` and `HandTrueWords.test.tsx` pass.
- [x] 5.4 Retitle the screen (design D11):
  - `PageHeader` takes `screenById('hands').label`.
  - The Kartlar tab's hand sits in a `rounded-xl border border-line bg-pane p-4` panel whose header row has the `<h2>` "<name> — Kart Eli", then "N kart · alınış sırası" and the view switch. `HandView` takes the heading.

  Update the title assertions in `HandsPage.test.tsx`: an `<h1>` "Oyuncu elleri" and an `<h2>` "Gökay — Kart Eli". Verify: the tests pass.

## 6. Card details beside the hand

- [x] 6.1 Move `HoldingDialog`'s body into `src/features/hands/HoldingDetails.tsx` with an `onDone` callback (design D3). Add v2.2.8's info lines under the holder line:
  - set · rarity
  - the mechanic pack
  - the visible text

  A Cursed card shows "Cursed" alone. `HoldingDialog` becomes `<Dialog title={card.name}>` around it, with `onDone={onClose}`. Verify: `HoldingDialog.test.tsx` passes, with a new case for the info lines of a normal card and a Cursed card.
- [x] 6.2 Create `src/features/hands/HandDetailsPanel.tsx` (design D3):
  - a `<section aria-labelledby>` with the `<h2>` title, the empty text, and the children under an `<h3>` with the name
  - `lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto`
  - the face held to `max-w-52`

  Verify: `npm run check` passes.
- [x] 6.3 In `HandContent`, put the selection and the grid in place (design D2, D3):
  - The card selection is `{ id, isWide }` and counts only while `isWide === useWideWindow()`.
  - The grid is `lg:grid-cols-[minmax(0,1fr)_19.5rem] gap-4`, with the tab panel and the player note in the first column.
  - While wide on the Kartlar tab, the "Seçili Kart" panel renders `HoldingDetails`, keyed by the holding id, with the empty text "Detayları görmek için elden bir kart seç." Otherwise `HoldingDialog` renders as today.
  - `HandView` and `HandTable` get the selected id for `isSelected` and the row mark.

  Turn `HoldingDialog.test.tsx` into a `describe.each` over the two hosts (the dialog, and the panel under `stubWideWindow()`). Add panel tests:
  - no `dialog` when wide
  - the empty text
  - a second selection replaces the first
  - the selected face's glow and `aria-current`
  - a card leaving the hand clears the panel
  - a `matchMedia` change event dropping the wide query clears the selection without opening a dialog

  Verify: the tests pass.
- [x] 6.4 In `docs/domain.md`, add the hand screen's layout to the Hand row or its section: the details beside the hand from 1024 px and in a dialog below, as chosen on 2026-11-11. In `docs/conventions.md`, extend the `hands/` line with `HandDetailsPanel`, `HoldingDetails` and `StatTile`. Verify: `npm run check` passes.

## 7. The True Words tab

- [x] 7.1 Move `TrueWordDialog`'s body into `src/features/true-words/TrueWordDetails.tsx` with `onDone` (design D3), and keep `TrueWordDialog` as its dialog host. The picture is held to `max-w-55`. Verify: the `the DM's word controls` tests in `HandTrueWords.test.tsx` pass.
- [x] 7.2 Give `TrueWordTile` an `isPictureOnly` prop (design D9). With a loaded picture:
  - the name, cost and text are `sr-only`
  - the border, surface and padding go
  - the "● Aktif" mark and `glow-word` stay

  Without a picture, the tile is unchanged. The True Words screen does not pass it. Extend the tile's tests for both cases. Verify: the tests pass, and `TrueWordsPage.test.tsx` passes unchanged.
- [x] 7.3 Lift the word selection into `HandContent` as `{ id, isWide }`. `HandTrueWords` takes `selectedId` and `onSelect`, uses picture-only tiles in `minmax(14rem,1fr)` columns, marks the selected tile with `aria-current` and a gold outline, and heads the tab "<name> — True Words". While wide, the "Seçili True Word" panel renders `TrueWordDetails` with "Detaylarını görmek için bir True Word seç."; otherwise `TrueWordDialog` renders. Update `HandTrueWords.test.tsx`:
  - the order learned, with names reachable by screen readers
  - the details in the panel under `stubWideWindow()`, and in a dialog otherwise
  - the DM's switch and take-back in both
  - taking a word back clears the panel

  Verify: the tests pass.

## 8. Active words behind the hand

- [x] 8.1 Create `src/features/true-words/TrueWordZoomDialog.tsx` (design D8):
  - portaled to `document.body`
  - a `Dialog` titled "✦ <name>" with `closeOnBackdrop`
  - the picture at the zoom size, or the name and text without one

  Add its tests:
  - the picture and the title
  - the fallback text
  - closing with Escape and with "✕ Kapat"

  Verify: the tests pass.
- [x] 8.2 Create `src/features/true-words/ActiveWordsPeek.tsx` (design D8):
  - a `<ul aria-label="Aktif True Words">` of `<button>`s named "<name>: büyüt", in the order learned
  - v2.2.8's three sizes and overlaps
  - the purple radial placeholder with ✦ and the name
  - `drop-shadow-glow-word-peek` around `drop-shadow-lift`
  - the strip `overflow-x-clip`

  Each button opens `TrueWordZoomDialog`. In `HandContent`, on the Kartlar tab, wrap the strip and the hand's panel in a `relative isolate` box with the top padding while words are active, and make the panel `relative z-1 bg-pane`. Add `ActiveWordsPeek.test.tsx`:
  - only active words, in order
  - a live switch-off removes one
  - the placeholder
  - nothing without active words
  - a button opens the zoom

  Verify: the tests pass.
- [x] 8.3 In `docs/conventions.md`, extend the `true-words/` line with `TrueWordDetails`, `ActiveWordsPeek` and `TrueWordZoomDialog`. In `docs/domain.md`, Pictures, add the active words above the hand. Verify: `npm run check` passes.

## 9. Integration

- [x] 9.1 Run `npm run check` and `npm run test:emulator` (after `. ~/.nvm/nvm.sh && nvm use`). If the owner's `npm run dev` is still running, ask before stopping it, because the emulator suite needs its ports. Verify: both pass.
- [ ] 9.2 Check in Chrome against the emulators with the DM's and a player's account:
  - **1280 px:** the panel beside the hand, sticky while scrolling a long hand. The selected card's gold glow, and an active one keeping green. The lists over the hand on hover. The peek and its zoom. The True Words tab's tiles and panel. The DM notu tab only for the DM.
  - **1024 px:** the same layout, with the hand's width noted for the owner.
  - **360 px:** with the fixed 360 px iframe, the dialog instead of the panel, the tapped lists, the tabs as a row, the smaller peek, and `scrollWidth` equal to `clientWidth` on each tab.

  Verify: every point holds. Report the 1024 px width to the owner.
- [x] 9.3 Stop every process on the project's ports as `CLAUDE.md` says: SIGINT to the process group, then wait for the emulator export. Ask the owner first about a session they started. Confirm with `lsof -nP -iTCP -sTCP:LISTEN`. Verify: no listener remains on 5173, 4173, 8080, 9099, 4000, 4400, 4500, 9150 or 5002.

## Workflow follow-up

- The owner tests the screen and lists what to adjust. Fold the adjustments into this change before archiving.
- Archive the change with `/opsx:archive` once the owner is satisfied, and check that the synced `player-notes`, `card-holdings`, `true-words` and `visual-effects` specs read correctly.
