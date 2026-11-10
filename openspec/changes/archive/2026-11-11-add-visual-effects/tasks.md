# Tasks

## 1. Tokens and the effects stylesheet

- [x] 1.1 Add the glow tokens to `src/styles/theme.css` (design D2):
  - the color tokens `glow-active`, `glow-cursed`, `glow-blessed`, `glow-rare`, `glow-word`, `glow-word-deep`, `premium-frame`, `premium-frame-dark`, `premium-frame-light`, `cursed-frame-dark` and `cursed-frame-light`
  - the `--drop-shadow-*` tokens:
    - `glow-active`, `glow-cursed`, `glow-blessed`, `glow-held` and `glow-selected`
    - `lift`, `reveal-rare`, `reveal-cursed` and `reveal-blessed`, one layer each (design D2)
  - `--text-shadow-glow-word`
  - `--ease-card-flip: cubic-bezier(.18,.72,.16,1)`

  Each token gets a comment naming what it is for. Verify: `npm run check` passes, and `theme.test.ts` needs no new pair, because none of them is a text color.
- [x] 1.2 Create `src/styles/effects.css` and import it in `src/styles/index.css` after `theme.css` (design D1). For now it holds only a header comment saying what belongs there. Later groups add their `@utility` rules to it.
  - In `docs/conventions.md`, under Styling, add the rule from design D1: a visual effect that needs a pseudo-element or CSS variables is an `@utility` in `effects.css`, in plain CSS with tokens.
  - In the same section, add the reduced-motion rule: every moving effect stops under `prefers-reduced-motion`, through `motion-reduce:`, a `prefers-reduced-motion: no-preference` block, or `useReducedMotion()` for JS-timed motion. Glows stay.
  - Verify: `npm run check` passes.

## 2. Frameless picture faces and glows

- [x] 2.1 In `CardFace`, drop the frame from the picture branch (design D3):
  - no `border-2`, padding, pane background or `FRAME_CLASSES` there
  - `data-frame` stays on the root
  - the whole-face button's `hover:bg-ink/5` stays only on the CSS face
  - the CSS face is unchanged

  Update `CardFace.test.tsx` and `CardBrowser.test.tsx` where they assert a frame class on a picture face. Add a test that a picture face has no `border-*` frame class, and that a CSS face keeps it. Verify: the tests pass.
- [x] 2.2 Add the glow to `CardFace` (design D4):
  - a new prop `isRevealed`
  - a computed glow value, written as `data-glow` on the picture's outer box, or on the CSS face's root
  - the matching `drop-shadow-*` utility

  Add tests for:
  - active Common (`active`), active Cursed (`active-cursed`) and active Blessed (`active-blessed`)
  - revealed Rare, Cursed, Blessed and Common (`reveal-*`)
  - held (`held`), and no glow for a card in the pool
  - an active card's state winning over its kind

  Verify: the tests pass.
- [x] 2.3 In `FaceDownCard`:
  - pass `isRevealed` to the face
  - change the flip to `duration-680 ease-card-flip`

  In `FaceDownCard.test.tsx`, show that the face-down back has no `data-glow`, and that the face after the turn has the kind's `reveal-*` value. Verify: the tests pass.
- [x] 2.4 Update `docs/domain.md`:
  - **Pictures:** a card face with a picture has no CSS frame, and the picture's printed frame shows the kind. Cards without a picture keep the colored frame.
  - **Glossary:** a **Visual effect** entry: decorative light and motion (tilt, glows, the burst). It is not a card effect.
  - **Deliberate decisions:** the owner chose v2.2.8's frameless look on 2026-11-10.

  Verify: `npm run check` passes (Prettier formats the Markdown).

## 3. Tilt and glint

- [x] 3.1 Create `src/features/cards/useCardTilt.ts` (design D5). It returns a ref callback and the `onPointerMove`, `onPointerLeave` and `onPointerDown` handlers. On a move:
  - it ignores a touch, a pen with a button down, reduced motion, and an element that is not connected
  - it writes `--tilt-x`, `--tilt-y`, `--push-x`, `--push-y`, `--glint-x`, `--glint-y` and `data-tilt` once per animation frame

  On leave, or a pointer down by touch or pen, it clears them. A mouse press keeps the tilt, so a click does not jolt the card.
- [x] 3.2 Add the `card-tilt` `@utility` to `effects.css`: the transform, the brightness, the two transition speeds, the `::after` glint at `z-3` with `pointer-events: none`, and `will-change` only under `[data-tilt]`, all inside `prefers-reduced-motion: no-preference`.
  - Add the `isTiltable` prop to `CardFace`. With it, the hook's handlers and `card-tilt` go on the picture box, or on the CSS face's box.
  - `HandView` and `CardBrowser` pass `isTiltable`.
- [x] 3.3 Add tests, firing pointer events with a mocked `getBoundingClientRect` and `requestAnimationFrame`:
  - a `mouse` move sets `data-tilt` and the variables, with signs matching the pointer's corner
  - a `touch` move does not
  - reduced motion does not
  - `pointerleave` clears them
  - a face without `isTiltable`, for example in `HoldingDialog`, has no `data-tilt` after a move

  Verify: the tests pass, and `npm run check` passes.

## 4. The deck

- [x] 4.1 Create `deckLayout(width, count, options)` in `src/features/cards/useDeckLayout.ts`, with `useDeckLayout(count, options)` next to it (design D6). The hook measures the list with `ResizeObserver` and reads `(hover: none)`. Without `ResizeObserver`, it returns no overlap and the preferred width.
  - Add `useDeckLayout.test.ts` for `deckLayout`:
    - 360 px: 1 column, no overlap
    - 768 px and 1280 px, with ratios 0.36 and 0.39: the column count, an overlap no greater than `round(235 × ratio)`, and no negative margin at a row's start
    - `maxOverlapRatio` 0: columns from the 12 px gap, and no overlap
    - fewer cards than columns

  Verify: the tests pass.
- [x] 4.2 Use the deck in `HandView` (ratio 0.36) and `CardBrowser` (ratio 0.39), with `preferredWidth` 235 and `gap` 12 (design D6):
  - the list: `flex flex-wrap` with the measured `--deck-card-width`, about 17 px between rows, and no column gap while overlapping
  - each `<li>`:
    - its width and per-index `margin-left` and `z-index`
    - `relative`, `hover:z-30` and `focus-within:z-30`
    - the hand's `5n` angles or the library's `7n` angles, and `motion-reduce:rotate-0`

  Update `HandView.test.tsx`, `HandsPage.test.tsx` and `CardBrowser.test.tsx` where they depend on the grid. Add a test that the list items carry the angle classes. Verify: the tests pass, and `npm run check` passes.

## 5. The draw spread

- [x] 5.1 In `DrawDialog`, make the spread (design D7):
  - the dialog `sm:max-w-5xl`
  - the drawn `<ol>` `flex flex-wrap justify-center`
  - each `<li>`:
    - the clamped width, with a smaller clamp below `sm`, and `max-w-[calc(100vw-84px)]`
    - the negative right margin
    - the hover and focus-within lift under `motion-safe:`, and `z-50`

  Update `DrawDialog.test.tsx` if it depends on the grid. Verify: the tests pass, including the flip and the Blessed shock.

## 6. The open pack

- [x] 6.1 In `OpenPackView`, replace the selected and chosen `ring-2 ring-gold ring-offset-2` with `drop-shadow-glow-selected` and `data-glow="selected"` on the `<li>` wrapper. Once every card is face up, add `hover:drop-shadow-glow-selected` to the wrapper of each selectable card (design D4).
  - In `OpenPackView.test.tsx`, show `data-glow="selected"` on the selected card.
  - Show also that no wrapper has the hover glow class while a card is face down, and that the selectable wrappers have it once all are face up.
  - Verify: the tests pass.
- [x] 6.2 Rebuild the burst (design D8):
  - Add `burstArtUrl(art, pack)` next to `spreadBackOf` in `src/features/packs/catalog.ts`.
  - In `theme.css`, replace the `pack-burst` keyframes with the v2.2.8 pulse: scale, `brightness()`, and opacity at the end, over 2.85 s. Add the `burst-halo` and `burst-backdrop` keyframes with their `--animate-*` tokens, used as utilities in the JSX.
  - In `OpenPackView`, render the burst as a `fixed inset-0` layer inside the dialog, with the backdrop, the stage, the halo, and the picture or the glyph box. Keep `data-testid="pack-burst"` and `aria-hidden`. End it only on the picture's own `animationend` (its target is the picture itself). Raise `BURST_FALLBACK_MS` to match.

  Add tests:
  - `catalog.test.ts`: `burstArtUrl` for a set pack, a Pandemonium Cursed Pack (the set's cardback), a Mechanic Pack and the Golden Pack (their pack pictures), and `null` without a picture
  - `OpenPackView.test.tsx`: the burst shows the set's cardback `<img>` with `testArt`, and the glyph without art. A halo `animationend` leaves it in place, and the picture's ends it. The existing reduced-motion and "already turned" tests still pass.

  In `docs/domain.md`, update the "Pictures" note that "the burst animation is still drawn with CSS": it now shows the set's cardback or the pack's picture. Verify: the tests pass.

## 7. Pack tiles and shop choices

- [x] 7.1 Add the `pack-frame-premium` and `pack-frame-cursed` `@utility` rules to `effects.css` (design D9):
  - the ridged frames and their rings
  - the `::before` corner with `content: "✦" / ""` or `"☠" / ""`
  - the premium `::after` sheen with `--animate-pack-shimmer`, whose keyframes go in `theme.css`
  - no animation under reduced motion

  In `PackTile`:
  - wrap the picture or glyph in a `relative isolate` box with `data-pack-frame` (`premium` for `premium`; `cursed` for `cursed`, `cursedGolden` and `pandemoniumCursed`) and the matching utility
  - drop the `border-gold` that `premium` and `golden` get today
  - add the lift and brightness for an enabled tile, `disabled:grayscale-45` next to `disabled:opacity-60`, with the lift only under `motion-safe:`

  Add `PackTile` tests to `PackShopPage.test.tsx`:
  - `data-pack-frame="premium"` on a set's Premium Pack, `cursed` on the three Cursed types, and none on Standard, Mechanic and Golden
  - a disabled tile still shows its reason

  Verify: the tests pass.
- [x] 7.2 Give the same lift to the group tiles in `PackShopPage` and to the two choices in `ShopsPage`, which lift 5 px with `shadow-xl`, both with the lift only under `motion-safe:`. Verify: `PackShopPage.test.tsx` and `ShopsPage.test.tsx` pass unchanged.

## 8. True Words and the Cardmaker

- [x] 8.1 In `TrueWordTile`, an active word gets the `glow-word` `@utility` (two rings, in `effects.css`) and `data-glow="word"`, and `border-true-word-line` in place of `border-gold` (design D10). In `HandTrueWords`, the tiles covered by a details button get the lift and the focus lift, only under `motion-safe:`.
  - In `HandTrueWords.test.tsx`, show `data-glow="word"` on an active word, and none on an inactive one.
  - Verify: the tests pass, together with `TrueWordsPage.test.tsx` and `OpenDraftPanel.test.tsx`.
- [x] 8.2 In `HandSummary`, give an active True Word's name `text-shadow-glow-word`. In `Mascot`, add `drop-shadow-lift`. Verify: `HandsPage.test.tsx` and `art.test.tsx` pass, and `npm run check` passes.

## 9. Integration

- [x] 9.1 Run `npm run check` and `npm run test:emulator`. Verify: both pass.
- [x] 9.2 In Chrome, check the app against the emulators with the art built, at 1280 px and in an iframe 360 CSS pixels wide (see the dev-environment notes). Check:
  - **Hand and library:** the frameless faces, the tilt and glint under the mouse, the deck's overlap and angles, the card under the pointer coming to the front, the active glows, and the held glow
  - **Pack Shop:** the Premium and Cursed tiles' frames, the shimmer, the lift, and a greyed-out tile
  - **Shops:** the lift of the two choices
  - **True Words tab:** the active word's glow
  - **Reduced motion**, through DevTools rendering emulation: no tilt, angle, lift or shimmer, while the glows stay
  - **360 px:** no horizontal scrollbar on any of those screens

  A draw or a pack spends LP, adds a card to a hand and writes a permanent İşlem Logu record in the owner's emulator data. Ask the owner before you check the draw spread, the kind glows and the burst live. Without their OK, rely on the unit tests of groups 5 and 6, and say so in this task.

  Verify: every point above holds, or the failures are fixed and checked again.

  Done on 2026-11-10 as the DM (Otter Otter), on Raccoon Panda's hand, with the owner's OK for one free DM draw and one Kesqerian Nights Premium Pack at 0 LP. Both added a card to the hand and wrote a permanent İşlem Logu record.
  - **Library:** 9 overlapping columns at 1728 px (89 px overlap, under the 92 px limit), the `7n` angles, and the tilt measured under a real mouse move. The tilt gives a 3D transform, `brightness(1.045)`, the glint at 0.7, and the card brought to `z-index` 30.
  - **Hand:** the deck overlapped, and the active glows were checked by adding their classes for a moment, since no card was active. The True Word "Arcane" glowed purple on the tab and in the summary.
  - **Draw:** the face-down card, the flip, and the larger spread with the lift. This showed that the neutral CSS back had no card shape at the spread's width, so it now has the picture's aspect ratio (`FaceDownCard`). That fix is covered by the unit tests, not by a second live draw.
  - **Pack:** the full-screen burst with the Kesqer cardback, the cards after it, the orange glow of the Rare card, the hover glow once all were turned, and the gold glow of the selected and the chosen card.
  - **Pack Shop:** the Premium frame with "✦" and its shimmer running, the Cursed frame with "☠", both glyphs with an empty alternative text. The Shops choice lifted 5 px. The Cardmaker had its shadow.
  - **360 px:** the hand, the library, the Cursed Deck, Shops, the Pack Shop group and the True Words tab had no horizontal scrollbar. The deck lay in one column without overlap.
  - **Not done:** reduced motion through DevTools emulation, which the Chrome extension cannot reach. The built CSS keeps the tilt, the glint and the shimmer inside `prefers-reduced-motion: no-preference`, and the angles and lifts under `motion-safe:`. The unit tests cover the tilt hook and the skipped burst under reduced motion.
- [x] 9.3 Stop every process on the project's ports, as `CLAUDE.md` says: the dev server and the emulators with SIGINT to their process group, waiting for the export. Verify: `lsof -nP -iTCP -sTCP:LISTEN` shows nothing on 5173, 4173, 8080, 9099, 4000, 4400, 4500, 9150 or 5002.

## Workflow follow-up

- Archive the change with `/opsx:archive` after the owner reviews it, and sync its specs into `openspec/specs/`.
