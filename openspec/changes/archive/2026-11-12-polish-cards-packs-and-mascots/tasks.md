# Tasks

## 1. The Mechanic Pack's back

- [x] 1.1 In `src/features/art/spreadBack.ts`, add the `{ kind: 'pack'; packKey }` back, and make `spreadBackUrl` return `art.packUrl(packKey)` for it, or `null` (design D1). Extend its tests: a Mechanic Pack key with a picture gives that URL, and without one gives `null`. Verify: the tests pass.
- [x] 1.2 Change `spreadBackOf` in `src/features/packs/catalog.ts` to take `{ packType, setCode, mechanicPack }`. A Mechanic Pack returns `{ kind: 'pack', packKey: 'mechanic:<name>' }`. Golden stays neutral, and the other types stay as today. Update the call in `OpenPackView.tsx` and the table in `catalog.test.ts`. Verify: the tests pass.
- [x] 1.3 Add an `OpenPackView` test: an open Blood & Battle Mechanic Pack shows the pack picture as every face-down card's back. Without the picture, it shows the neutral CSS back. Verify: the test passes.
- [x] 1.4 Update `docs/domain.md` (design D8):
  - the back table under "Backs never give a card away"
  - the "The neutral back" deliberate decision: a random draw and a Golden Pack keep it, and a Mechanic Pack now shows its pack picture, by the owner's choice on 2026-11-12

  Verify: the table matches the `card-images` delta.

## 2. Double click and the bare zoom view

- [x] 2.1 Add `bare` to `src/components/ui/Dialog.tsx` (design D3). A bare dialog has no header, no padding and no surface of its own, and is named by `aria-label={title}`. Extend `Dialog`'s tests:
  - a bare dialog has no heading and no "✕ Kapat"
  - it is named by the title
  - Escape and the backdrop press still close it

  Verify: the tests pass.
- [x] 2.2 Rework `CardZoomDialog` on the bare `Dialog`. It shows the picture with its hand cost badge (or the face without pictures) and a round "✕" button named "Kapat", fixed in the window's top-right corner. It drops the title and the `zoomLine` line. If `zoomLine` has no other user, remove it from `display.ts` with its tests. Update `CardZoomDialog.test.tsx` to the `card-zoom` delta's "Zoom view contents", "Hand cost in the zoom view" and "Closing the zoom view" scenarios. Verify: the tests pass.
- [x] 2.3 Add the double click to `CardFace` (design D2):
  - The face records a `pointerdown` and its `pointerType`.
  - A click with `detail` 2 opens the zoom view only when this face saw the first press with a mouse and the click is outside a `data-face-control` element.
  - Mark the magnifier, the ✎ control and the set symbol with `data-face-control`.

  Add `CardFace.test.tsx` cases, driven with `user.dblClick` and a touch pointer:
  - a library face zooms on a double click
  - a touch double tap does not zoom
  - a double click on the ✎ control does not zoom
  - after closing, the focus is on the magnifier

  Verify: the tests pass.
- [x] 2.4 Add hand and draw tests for the double click:
  - `HandView` or `HandsPage` on a wide window: a double click selects the card and opens the zoom view over the panel.
  - On a narrower window: it opens only `HoldingDialog`.
  - `DrawDialog`: a double click on a face-down card turns it and opens no zoom view.

  Use `src/test/media.ts` for the window width. Verify: the tests pass.

## 3. Named pack tiles

- [x] 3.1 Add `packShortName(def)` to `src/features/packs/catalog.ts` (design D4), and remove `hasNameOnTile` and its list. Test all eight types in `catalog.test.ts`. Verify: the tests pass.
- [x] 3.2 Rework `PackTile`:
  - **`group` variant:** picture (or glyph), then the short name, then the price.
  - **`shop` variant:** picture, then the full `packTitle`, with no price.

  The `aria-label` stays `packTitle(def) + " aç"`. The Premium and Cursed frames and the disabled reason stay. Update `PackShopPage.test.tsx` to the `card-images` delta's "Pack pictures in the shop" and "Short pack names in a group" scenarios: the Kesqerian Nights, Pandemonium and Golden groups, the tile order, and the screen reader names. Verify: the tests pass.
- [x] 3.3 Update the "Pack Shop tiles" bullet and the "Pandemonium Cursed Pack is named on its tile" deliberate decision in `docs/domain.md`: every group tile now has a short name with its price under it. Verify: the doc matches the delta.

## 4. Where the Cardmaker stands

- [x] 4.1 Create `src/lib/usePhoneWidth.ts` (design D5). It is true while `(width < 40rem)` matches, and false without `matchMedia`. Add its test as `useWideHover.test.ts` does, and list it in the `lib/` part of `docs/conventions.md`. Verify: the tests pass.
- [x] 4.2 Make `Mascot` render nothing while `usePhoneWidth()` holds, and make `useBlessedShock`'s `shock()` do nothing then. Extend `art.test.tsx` (or the `Mascot` test) and `useBlessedShock.test.tsx` with the phone case. Verify: the tests pass.
- [x] 4.3 Add `mascotPlacement: 'title' | 'corner'` to `PageHeader` (design D5). `corner` with `useWideHover()` renders `CornerCardmaker` instead of the title's `Mascot`. Move `ShopsPage` and `ElixirShopPage` onto it, keeping `ShopsPage`'s `cardmaker_keep` stand-in. Make `LibraryPage`, `CursedDeckPage`, `RulesPage` and `Placeholder` pass `corner`. Verify: `ShopsPage.test.tsx`, `CornerCardmaker.test.tsx` and `LibraryPage.test.tsx` cover these delta scenarios, and the tests pass:
  - the library and Veri / Yedek on a desktop with a mouse
  - a tablet
  - a phone
  - True Words keeping her by the title
- [x] 4.4 Check `PackShopPage` against the phone rule: on a phone, neither the shop's Cardmaker nor a group's shows. Add a test for the Ulagal group at phone width. Verify: the test passes.
- [x] 4.5 Give `RulesContent` its readable width (`max-w-[70ch]`, design D6). Extend `RulesPage.test.tsx` for the corner Cardmaker on a desktop and none on a phone. Verify: the tests pass.
- [x] 4.6 Update the Cardmaker bullets in `docs/domain.md`:
  - the corner screens
  - no Cardmaker on phones
  - the shocked pair not on phones
  - the deliberate decision on the corner, now covering the library, Cursed Deck, Kurallar and the unbuilt screens, by the owner's choice on 2026-11-12

  Verify: the doc matches the delta.

## 5. The "Yakında" screen

- [x] 5.1 Move the neutral CSS back's look out of `FaceDownCard` into `src/features/art/NeutralCardBack.tsx` (design D7), and use it in `FaceDownCard`. Verify: `FaceDownCard.test.tsx` and `DrawDialog.test.tsx` pass unchanged.
- [x] 5.2 Add the `card-drift` and `back-glint` animations to `src/styles/theme.css`, each with a comment. Verify: `npm run check` passes.
- [x] 5.3 Rework `Placeholder`. The title row stays with its `actions`. Under it go the drifting `NeutralCardBack`, "Yakında" in gold uppercase with wide tracking, the ornament row, and "Bu ekran henüz hazır değil.", with the animations under `motion-safe:` only. Update `Placeholder.test.tsx` and `routes.test.tsx` to the `app-shell` delta's scenarios: Custom Card Draft, reduced motion, and the Elixir Shop's "← Shops" link. Verify: the tests pass.

## 6. Check it in the browser

- [x] 6.1 Run `npm run check` and `npm run test:emulator`. Verify: both pass.
- [x] 6.2 With the owner's permission, run the app on the dev emulators and check these, at 1280 px with a mouse and in a 360 px frame:
  - a Mechanic Pack's backs
  - the double click in the library, in the hand at both widths, and in a draw
  - the bare zoom view and its "✕"
  - the Kesqerian Nights, Pandemonium and Golden groups
  - the corner Cardmaker on the library, Cursed Deck, Kurallar and Veri / Yedek
  - no Cardmaker and no shocked pair at 360 px
  - the "Yakında" panel at both widths

  Verify: every item looks as the delta specs say, and no page scrolls horizontally at 360 px.

## Workflow follow-up

- Stop the dev server and the emulators as CLAUDE.md says, and confirm with `lsof` that the project's ports are free.
- Archive the change with `/opsx:archive` after the owner's review.
