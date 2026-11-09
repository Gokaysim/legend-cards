# Design

## Context

See proposal.md for why. The current state that shapes the approach:

- **One face component.** `CardFace` (`src/features/cards/CardFace.tsx`) draws every card face in the app, and has exactly four callers:
  - `CardBrowser`: the library and the Cursed Deck
  - `HandView`: the hand's card view
  - `HoldingDialog`: the card details
  - `FaceDownCard`: the revealed cards of `DrawDialog` and `OpenPackView`

  These are the places the spec lists. `FaceDownCard` renders the face only after the turn, so a face-down card has no face to zoom.
- **A face has two looks.** With a picture, the face is the picture inside a `relative` box, with the set symbol's button and its note on top (`z-10`). Without one, it is the CSS face: the cost badge, then the name, the marks, the text and the details. The marks ("● Aktif", "✎ Not var", "Ek kopya", "Elde: …") sit under the picture, or between the name and the text.
- **The hand covers the face with a sibling button.** `HandView` renders `<CardFace>` and then an `absolute inset-0` button in the same `<li>`, which opens the details. Since that button is a sibling of the face and not inside it, a pointer over the face is over the button: the face's own `:hover` never matches.
- **Dialogs nest.** `HoldingDialog`, `DrawDialog` and the pack view are `Dialog`s (`src/components/ui/Dialog.tsx`): a native `<dialog>` opened with `showModal()` on mount, which calls `onClose` from its `close` event. React dispatches `close` to the `onClose` of every React ancestor, as it does for bubbling events, portals included. A dialog opened inside another would therefore close both.
- **Hover in Tailwind v4.** `hover:` and `group-hover:` apply only under `@media (hover: hover)`, so on a phone nothing shown on hover would ever show.
- **The legacy zoom** (`modal.type === 'zoom'`) shows the name, a line "set · cost LP · rarity", and the picture up to `min(90vw, 580px)` wide and `76vh` high. It closes with "✕ Kapat" or Escape.

## Goals / Non-Goals

**Goals:**
- No caller of `CardFace` changes to get the magnifier, except the hand, whose covering button moves into the face.
- The magnifier and the note icon never cover the text of a face without a picture.
- Closing a nested zoom view never closes the dialog around it.

**Non-Goals:**
- A shared "zoom host" or a URL for the zoom view. Reloading closes it, like every other dialog.
- New colour tokens. The icons use the existing `canvas`, `line` and `ink` tokens of the marks.

## Decisions

### D1. The face owns its magnifier and its zoom view

`CardFace` renders the magnifier and holds a `isZoomOpen` state. While the state is set, it renders `CardZoomDialog` for its own card and hand cost. A new prop, `isZoomable` (default `true`), turns the magnifier off. Only the zoom view's own fallback face sets it, so a zoomed face never offers another zoom.

Every face listed in the spec gets the magnifier with no change to its caller. The zoom view lives exactly as long as its face, which gives the spec's "closes when the face leaves the screen" with no extra code: when the DM discards a card, its `<li>` unmounts, and removing an open `<dialog>` closes it.

**Alternative:** one zoom dialog at the app root, opened through a context with a card ID. It needs a provider, and the face would have to tell it about the hand cost and when it leaves the screen. One open zoom per face is not a cost: only one modal dialog can be used at a time anyway.

### D2. The face's whole-face action moves into the face

`CardFace` gets `onOpen?: () => void` and `openLabel?: string`. With them, it renders the covering button inside its root, below the magnifier and the set symbol. `HandView` passes `onOpen={() => onSelect(holding.id)}` and `openLabel={`${card.name}: ayrıntılar`}`, and drops its own button. The accessible name and the hover tint (`hover:bg-ink/5`) stay as they are, so the hand tests that select "…: ayrıntılar" keep working.

The face's root becomes `relative` and a Tailwind `group`, so pointing anywhere on the face, the covering button included, is hovering the group. The order in the DOM, which is also the Tab order, is: the covering button, the magnifier, then the set symbol.

**Alternative:** put `group` on the hand's `<li>`. Then every caller would have to supply the group for the icons to show, and forgetting it would hide them for good.

### D3. Hover, focus and no-hover visibility in CSS

The magnifier and the note icon share one class set:

- `opacity-0` by default
- `group-hover:opacity-100`: the pointer rests on the face, on hover devices only
- `group-has-[:focus-visible]:opacity-100`: keyboard focus anywhere in the face
- `no-hover:opacity-100`: a new custom variant, `@custom-variant no-hover (@media (hover: none));`, in `src/styles/index.css`
- `transition-opacity motion-reduce:transition-none`, as the set symbol's note does

`:focus-visible` is used and not `:focus-within`. After a mouse click on the magnifier, the focus returns to it when the zoom closes (D6). With `:focus-within` the icons would then stay shown until the user clicked somewhere else.

A transparent magnifier is still a button. It is in the Tab order and named for screen readers, as the spec asks. A pointer cannot reach it without hovering the face first, so it is never clicked while invisible.

### D4. Positions, and room on the face without a picture

- **On a picture:** the magnifier sits in the picture box's top-right corner (`top-[2%] right-[3%]`), on the empty frame next to the art. The note icon sits in its bottom-left corner (`bottom-[2%] left-[3%]`), on the curl of the text scroll. Both are clear of the cost d20 (top-left) and the set symbol (bottom-right). This was checked on "Aboleth's Eyes" and "Abandon All Hope".
- **On the CSS face:** the magnifier sits in the top-right corner of the face. The header's cost badge is on the left of that row, so the name below it never runs under the magnifier. The note icon sits in the bottom-left corner. A face with a note gets bottom padding the size of the icon, so the icon never covers the details or the text.
- **Both icons** are round badges in the marks' style (`border-line bg-canvas text-ink`, `size-7`): the magnifier "🔍", the note "✎". The magnifier is a `button` with `aria-label="<name>: büyüt"` and the glyph `aria-hidden`. The note icon is a `pointer-events-none` `span` with the glyph `aria-hidden`, so a click on it reaches the covering button. A `sr-only` "Not var" is always in the face, outside the icon, so screen readers read it whether the icon shows or not.
- **The "✎ Not var" mark goes away.** `hasNote` no longer counts as a mark, so a face whose only mark was the note has no marks row at all.

### D5. The zoom view is a `Dialog` in a portal

`CardZoomDialog` (`src/features/cards/CardZoomDialog.tsx`) is a `Dialog` titled with the card's name, rendered with `createPortal(…, document.body)`.

**The portal** keeps the face's styles away from the zoom view. A revealed card sits inside a 3D-turned, `backface-hidden` box, and its face is an `<article>` whose text the tests read with `toHaveTextContent`. React still treats the portal as a child of the face, which is what D6 needs.

**Contents:**
- **The line** comes from a pure helper in `display.ts`, `zoomLine(card, handCost?)`. It is unit-tested on its own against the spec's examples: the set label or kind word, then `Cost <cost>` or `Cost <hand> (temel: <own or —>)`, then the rarity, joined by " · ", leaving out a missing cost or rarity.
- **The picture** comes from `usePicture(useArt().cardUrl(card.id))`, the same hook as the face, so a missing or failing picture falls back the same way. It is a `CardPicture` sized by width, with the 563/788 aspect ratio giving the height: `w-[min(100%,563px,calc((100dvh-10rem)*563/788))]`. That is the dialog's width, the picture's own width, or what the screen's height allows after the title and line, whichever is smallest. It fits 360 pixels wide and short landscape screens, and is never blown up past its pixels.
- **The hand cost badge** is the face's badge, taken out of `CardFace` into a `CostBadge` component, placed over the picture's d20 at the same percentages. A badge in percent of the picture lands on the d20 at any size.
- **Without a picture,** the view shows `<CardFace card handCost isZoomable={false} />` in a box `w-80 max-w-full`, about twice a library face. It gets no `isActive`, `hasNote`, `isExtraCopy` or `heldBy`, so it shows no marks.
- **The dialog's width** is widened from `sm:max-w-xl` to `sm:max-w-fit` through its `className`, so the picture decides the width.

The zoom view uses no subscription and makes no write. It shows the `Card` and the hand cost that its face already has.

### D6. Nested closing and the focus

- **`Dialog` ignores a nested `close`.** Its `onClose` handler calls the caller's `onClose` only when `event.target === event.currentTarget`. A `close` from a dialog inside it, which React hands up the tree, is ignored. Escape in the zoom view closes the zoom alone, and the card details, the draw or the pack stay as they were. This is a one-line fix with a test, and it fixes every future nested dialog.
- **A click outside closes the zoom view.** `Dialog` gets a `closeOnBackdrop` option, which only `CardZoomDialog` sets. The backdrop belongs to the `<dialog>` element, so a click on it has the `<dialog>` as its target, at a point outside the dialog's box. The content fills the box, so the box check only rules out the dialog's own scrollbar. The dialog closes only when the press also started there (`pointerdown`), so selecting text from inside and releasing outside does not close it. Nested dialogs need nothing more: a click on the zoom view's backdrop targets the zoom view, and the dialog around it sees a target that is not itself.

  **Alternative:** the native `closedby="any"` attribute. It is newer than the browsers the players may use on their phones, so the app would close differently per browser.
- **The focus returns to the magnifier.** When the zoom closes, `CardFace` focuses the magnifier through a ref, in an effect that runs when `isZoomOpen` turns false. The browser restores the focus after Escape but not after the dialog is unmounted, which is what "✕ Kapat" does. Inside the card details, the magnifier is inside that dialog, so the focus stays there.

### D7. What the tests can and cannot show

jsdom applies no media queries and no `:hover`, so the visibility of the icons is not unit-tested. The unit tests check:

- the magnifier's presence and name on each kind of face, and its absence on a face-down card and in the zoom view
- opening, the title and line, the picture, the fallback face and the hand cost badge
- closing with the button, and with `close()` on the inner dialog (the test setup's dialog fires `close` as a browser does), which leaves the outer dialog open
- the focus back on the magnifier
- the `sr-only` "Not var" and the missing "Not var" mark
- the hand face still opening the details, and the magnifier not opening them

The hover, focus and phone behaviour, the positions, and the fit at 360 pixels are checked in Chrome against the emulators, with built pictures and without them.

## Risks / Trade-offs

- **[Risk] Fewer note marks at a glance.** The DM no longer sees which cards have notes without hovering them. → It is what the owner asked for. The hand's list view keeps its "✎" marker in the name column, and the icon shows at all times on phones and tablets.
- **[Risk] A hybrid device** (a laptop with a touch screen) reports `hover: hover`, so a tap shows the icons only while the face is "hovered". → A tap on the face's corner still reaches the magnifier, because a transparent button is still a button. Tapping the face elsewhere opens the details or nothing, as before.
- **[Risk] The "🔍" emoji renders differently per system,** and in colour. → The app already uses emoji glyphs ("🎁", "📖", "🔒", "🎲"). It is `aria-hidden` and sits in a fixed-size badge. If it looks out of place on a card, it can become the "⌕" glyph or an inline SVG without a spec change.
- **[Trade-off] One `Dialog` per open zoom, inside its face.** This is simple. The cost is that the zoom cannot outlive its face, for example to keep showing a card after it left the hand. The spec asks for exactly that behaviour.

## Migration Plan

Nothing to migrate: no data, rule or URL changes. Deploying the app replaces the faces. Rolling back restores the "Not var" mark.
