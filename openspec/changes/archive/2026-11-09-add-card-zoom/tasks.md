# Tasks

## 1. Nested dialogs

- [x] 1.1 In `src/components/ui/Dialog.tsx`, call the caller's `onClose` from the `close` event only when `event.target === event.currentTarget` (design D6). Update the component's comment to say that a dialog inside it closes alone.
  - In `Dialog.test.tsx`, render a `Dialog` inside another. Call `close()` on the inner `<dialog>` (the test setup fires `close` as a browser does) and show that only the inner `onClose` runs. Show also that `close()` on the outer one still calls its own `onClose`.
  - In `docs/conventions.md`, where the UI components are described, say that a `Dialog` may open inside another one, and that closing the inner one leaves the outer one open.
  - Verify: `npm run test -- Dialog` passes, and so do the existing `HoldingDialog`, `DrawDialog` and `OpenPackView` tests.

## 2. Building blocks

- [x] 2.1 Add `zoomLine(card, handCost?)` to `src/features/cards/display.ts` (design D5). It returns the set label or kind word, then `Cost <cost>`, or `Cost <hand> (temel: <own or —>)` when a hand cost differs, then the rarity, joined by " · ". It leaves out a missing cost or rarity.
  - Add `src/features/cards/display.test.ts`. It covers the spec's examples:
    - "Kesqerian Nights · Cost 1 · Common"
    - "Blessed"
    - "Cursed · Cost 1"
    - "Kesqerian Nights · Cost 1 (temel: 3) · Common"
    - a hand cost equal to the card's own cost, which gives the plain line
    - a hand cost on a card without a cost, which gives "(temel: —)"
  - Verify: the new tests pass.
- [x] 2.2 Take the cost badge out of `CardFace` into a `CostBadge` component in `src/features/cards/`, with the same markup, title, `data-cost-change` and screen reader text (design D5). `CardFace` uses it in both looks.
  - Verify: the existing `CardFace` and `HandView` cost tests pass unchanged.
- [x] 2.3 Add `@custom-variant no-hover (@media (hover: none));` to `src/styles/index.css` (design D3).
  - Verify: `npm run check` passes, and a class using `no-hover:` appears inside an `@media (hover: none)` rule in the output of `vite build --mode development`.

## 3. The zoom view

- [x] 3.1 Create `src/features/cards/CardZoomDialog.tsx` (design D5):
  - a `Dialog` titled with the card's name and widened with `sm:max-w-fit`, rendered with `createPortal` into `document.body`
  - the `zoomLine` under the title
  - the picture from `usePicture(useArt().cardUrl(card.id))`, sized `w-[min(100%,563px,calc((100dvh-10rem)*563/788))]`
  - the `CostBadge` on the picture's d20 when the hand cost differs, as on the face
  - without a picture, or after a load error: `<CardFace card handCost isZoomable={false} />` in a `w-80 max-w-full` box, with no marks
  - props: `card`, `handCost?` and `onClose`

  Add `CardZoomDialog.test.tsx`. With `testArt`, it shows:
  - the dialog named after the card, with the line and the picture whose `alt` is the card's name
  - the badge "1" marked lower for a hand cost of "1" on a 3-cost card, and no badge from the library
  - no "Aktif", "Not var" or "Ek kopya" text, and no card control
  - the CSS face for a card without a picture and after the picture's `error` event, with no magnifier
  - for a Cursed card without a picture, no set, rarity or mechanic pack
  - "✕ Kapat" calling `onClose`

  Verify: the new tests pass.

## 4. The card face

- [x] 4.1 In `CardFace`, add the magnifier and the zoom view (design D1, D3, D4, D6):
  - make the root `relative` and a `group`
  - add a `button` named "<name>: büyüt", with an `aria-hidden` "🔍" in a round badge, in the top-right corner of the picture box, or of the CSS face
  - give it the shared visibility classes: `opacity-0 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100 no-hover:opacity-100`, with a transition that `motion-reduce` turns off
  - add the `isZoomable` prop, default `true`
  - add the `isZoomOpen` state, rendering `CardZoomDialog` with the face's `card` and `handCost` while it is set
  - after the zoom closes, focus the magnifier through a ref

  In `CardFace.test.tsx`, show:
  - the magnifier on a picture face and on a CSS face, and none with `isZoomable={false}`
  - selecting it opens the zoom dialog, outside the face's `<article>`
  - "✕ Kapat" closes the dialog, and the focus is then on the magnifier

  Verify: the tests pass.
- [x] 4.2 In `CardFace`, replace the "✎ Not var" mark with the note icon (design D4):
  - add a `pointer-events-none` `span` with an `aria-hidden` "✎" in the bottom-left corner of the picture box, or of the CSS face, with the magnifier's visibility classes
  - add a `sr-only` "Not var" in the face
  - stop counting `hasNote` as a mark
  - give a CSS face with a note bottom padding the size of the icon

  Update the tests in `CardFace.test.tsx` that expect "✎ Not var" (the note mark, and the marked picture face):
  - the face still has the text "Not var", but only inside an element with the `sr-only` class
  - no element in the marks row reads "Not var"
  - a face whose only mark is the note has no marks row
  - a face without a note has no note icon

  Verify: the tests pass.
- [x] 4.3 In `CardFace`, add the `onOpen` and `openLabel` props (design D2). With them, the face renders an `absolute inset-0` button named `openLabel`, with the hover tint `hover:bg-ink/5` and the gold focus outline. It sits below the magnifier, the set symbol and the note icon. In `src/features/hands/HandView.tsx`, pass `onOpen={() => onSelect(holding.id)}` and `openLabel={`${card.name}: ayrıntılar`}`, and remove the hand's own covering button.

  In `HandView.test.tsx`, or in `HoldingDialog.test.tsx` where the hand is rendered with its dialog, show:
  - selecting "<name>: ayrıntılar" still opens the card details
  - selecting "<name>: büyüt" opens the zoom view and not the details
  - the note test still finds "Not var" on the face with a note

  Verify: these and the existing `HoldingDialog` tests pass.
- [x] 4.4 Update `docs/domain.md`, "Where they show": the "Card faces" bullet gets the magnifier and the zoom view, and says that a held card's note shows as the "✎" icon in the bottom-left corner, on hover, and at all times on phones. In `docs/conventions.md`, in the `cards/` folder entry and the pictures section, add `CardZoomDialog`, `CostBadge`, and the face's `isZoomable` and `onOpen` props.
  - Verify: `npm run format:check`, or the format step of `npm run check`, passes, and the docs name only components and props that exist.

## 5. Faces inside other dialogs and live changes

- [x] 5.1 In `HoldingDialog.test.tsx`, open a card's details and zoom its face. Then call `close()` on the zoom's `<dialog>`, as Escape does, and show:
  - the zoom view is gone
  - the card details are still open
  - the focus is on the details face's magnifier

  Verify: the test passes.
- [x] 5.2 In `FaceDownCard.test.tsx`, show:
  - a face-down card has no "…: büyüt" button
  - a turned card has one
  - for a controlled card (`isRevealed`), the magnifier appears when the card turns

  In the open pack tests (`OpenPackView`), zoom a turned card and close the zoom with `close()` on its `<dialog>`. The pack dialog stays open, with the same cards turned and the same card selected. In the `DrawDialog` tests, zoom a drawn card and close it the same way, and the draw dialog stays open.

  Verify: the tests pass.
- [x] 5.3 In the hand tests (`HandView.test.tsx`, which renders through `renderApp`), zoom a card in Ayla's hand. Then close its holding with `setHoldings`, as a discard on another device does, and show that the zoom dialog is gone.
  - Verify: the test passes.
- [x] 5.4 In `CardBrowser.test.tsx`, show that:
  - the library's and the Cursed Deck's faces each have a magnifier
  - the list view has none
  - zooming a Cursed card with `testArt` shows the line "Cursed · Cost <cost>"

  Verify: the tests pass.

## 6. Integration checks

- [x] 6.1 Run `npm run check` and `npm run test:emulator`. Verify: both pass.
- [x] 6.2 Check in Chrome against the emulators, with `npm run dev` (pictures built), as a player and as the DM:
  - **Hover:** the magnifier and the note icon show while the pointer rests on a face, in the library, the Cursed Deck, a hand, the card details, a draw and an open pack. They go away when it leaves, and the face-down cards have neither.
  - **Keyboard:** Tab onto a magnifier shows it. Escape closes the zoom alone, and the focus returns to the magnifier.
  - **Positions:** the icons sit clear of the d20, the set symbol and the text, on picture faces and on CSS faces.
  - **Zoom view:** it shows the picture large, with the line, for a Legend, a Blessed and a Cursed card, and for a hand card with a cost override.
  - **Without pictures:** move `public/art/manifest.json` aside, reload, and repeat the zoom and icon checks on CSS faces. Then put it back.
  - **360 pixels:** in an iframe 360 CSS pixels wide (see the dev-environment notes), zoom a card in the library and in a hand. The card fits, and `scrollWidth` equals `clientWidth`.
  - **No hover:** check that the built CSS has the `@media (hover: none)` rule for both icons. If DevTools touch emulation is available, also check that the icons show at all times there.

  Verify: every point above holds, or the failures are fixed and checked again.

  Done on 2026-11-09 as the DM, in the library and a hand, with and without pictures, and at 360 pixels. Not done live: zooming inside a draw and an open pack, because either one would spend LP, add a card to a hand and leave a permanent İşlem Logu record in the owner's emulator data. The unit tests of tasks 5.1 and 5.2 cover them, and revealed cards use the same face. DevTools touch emulation was not available; the built CSS has the `@media (hover:none)` rule for both icons.
- [x] 6.3 Stop every process on the project's ports, as `CLAUDE.md` says: the dev server and the emulators with SIGINT to their process group, waiting for the export. Verify: `lsof -nP -iTCP -sTCP:LISTEN` shows nothing on 5173, 4173, 8080, 9099, 4000, 4400, 4500, 9150 or 5002.

## 7. Closing the zoom view with a click outside

The owner asked for this after the first implementation; it was out of scope before.

- [x] 7.1 In `src/components/ui/Dialog.tsx`, add the `closeOnBackdrop` option (design D6): with it, a press that starts and ends on the backdrop, the `<dialog>` itself outside its box, closes the dialog.
  - In `Dialog.test.tsx`, show that a click outside closes it, that a click inside, on its scrollbar, or a press that starts inside and ends outside does not, that only the inner dialog of two closes, and that a dialog without the option ignores a click outside.
  - In `docs/conventions.md`, mention the option in the `components/ui/` entry.
  - Verify: the tests pass.
- [x] 7.2 Set `closeOnBackdrop` on `CardZoomDialog`.
  - In `CardZoomDialog.test.tsx`, show that a click outside closes it and a click on the picture does not.
  - In `HoldingDialog.test.tsx`, show that a click outside the zoom view closes only the zoom view, leaving the card details open, with the focus on the magnifier.
  - In `docs/domain.md`, add the click outside to the zoom view's bullet.
  - Verify: the tests pass.
- [x] 7.3 Run `npm run check` and `npm run test:emulator`. In Chrome against the emulators, click outside the zoom view of a library card and of the card details' face, and click on the zoomed picture. Then stop every process on the project's ports as in task 6.3.
  - Verify: both commands pass, the clicks behave as the spec says, and `lsof -nP -iTCP -sTCP:LISTEN` shows nothing on the project's ports.

## Workflow follow-up

- Archive the change with `/opsx:archive` after the owner reviews it, and sync its specs into `openspec/specs/`.
