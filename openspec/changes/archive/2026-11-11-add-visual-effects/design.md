# Design

## Context

See proposal.md for why, and `specs/visual-effects/spec.md` for what each effect must do. This is the current state that shapes the approach:

- **One face component.** `CardFace` (`src/features/cards/CardFace.tsx`) draws every card face. Its callers:
  - `CardBrowser`: the library and the Cursed Deck
  - `HandView`: the hand's card view, which passes `onOpen`
  - `HoldingDialog`: the card details
  - `FaceDownCard`: the revealed cards of `DrawDialog` and `OpenPackView`
  - `CardZoomDialog`: its fallback face

  A face with a picture sits in `rounded-xl border-2 bg-pane-raised p-1.5` and its kind's `border-*` class, with the picture inside a `relative` box. A face without one is a bordered box holding the cost, name, marks, text and details. The root has `data-frame` (`common`, `rare`, `blessed`, `cursed`).
- **The card views are plain grids.** `HandView` and `CardBrowser` both use `grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3`. `DrawDialog` uses `minmax(8.5rem,1fr)`, and `OpenPackView` 2, 3 or 6 columns.
- **Existing motion.** All of it is in `src/styles/theme.css`:
  - The flip is `transition-transform duration-500 transform-3d` with `rotate-y-180` in `FaceDownCard`.
  - The burst is `--animate-pack-burst`, 1.6 s, on a CSS glyph box inside the pack dialog. `BURST_FALLBACK_MS` ends it if `animationend` never comes.
  - The shocked pair is `--animate-blessed-shock`.
  - `useReducedMotion()` (`src/lib/`) covers JS-timed motion, and `motion-reduce:` covers CSS.
- **Styling rules** (`docs/conventions.md`):
  - Colors come only from tokens in `theme.css`, never raw hex or arbitrary color values in class names.
  - There are no `@apply` component classes.
  - `@apply` and plain CSS are allowed in `index.css`'s `base` layer.
- **Tailwind v4.3:**
  - Filters compose through CSS variables, so `brightness-*` and `drop-shadow-*` on one element add up.
  - `--drop-shadow-*`, `--text-shadow-*`, `--ease-*` and `--animate-*` theme variables become utilities.
  - `@utility` defines a custom utility, nested selectors and pseudo-elements included.
- **Dialogs** are native `<dialog>`s in the top layer, with no transform. A `fixed` child of a dialog is therefore placed against the viewport and drawn above the page.
- **The legacy CSS** (lines 99–284 and 338–665 of v2.2.8) holds every value used below. It is a reference for numbers, not code to copy.

## Goals / Non-Goals

**Goals:**
- Every effect is CSS. JavaScript only measures (the deck) or writes CSS variables (the tilt). Nothing re-renders React on pointer moves.
- Each effect has one home: a token, an `@utility` or a hook. The look can then be tuned in one place.
- Tests can see every effect's state in the DOM through a `data-*` attribute, since jsdom draws nothing.

**Non-Goals:**
- No pixel-exact copy of v2.2.8. The numbers below follow it, but the new layout (dialogs, tiles with names) wins where they differ.
- No new animation library. CSS transitions and keyframes are enough.
- No effect on the list views. A table row has no face.

## Decisions

### D1. Where effect CSS lives

- **`theme.css` holds the tokens:**
  - the glow colors (D2)
  - the drop-shadow and text-shadow tokens built on them
  - the `--ease-card-flip` curve
  - the `--animate-*` tokens and keyframes of the burst, its halo, its backdrop and the shimmer. The burst's three parts are plain `animate-*` utilities in the JSX, so they need no `@utility`.
- **`src/styles/effects.css`** is new, and is imported by `index.css` after `theme.css`. It holds the `@utility` rules that need a pseudo-element, a long `transform` with CSS variables, or more than one layer of shadow. Each is written in plain CSS against the tokens:
  - `card-tilt`: the picture box's transform, with its glint as `::after`
  - `pack-frame-premium` and `pack-frame-cursed`: the ridged frames, with their corner glyphs as `::before` and the premium shimmer as `::after`
- **Simple effects stay utilities in the JSX:** the lifts, the angles, the glows (`drop-shadow-glow-active`), the greyed-out pack (`grayscale-45 opacity-60`), and the spread's sizes.

`docs/conventions.md` gets the rule: "A visual effect that needs a pseudo-element or CSS variables is an `@utility` in `src/styles/effects.css`, written in plain CSS with tokens. Everything else is a utility in the JSX."

**Alternatives:**
- Arbitrary values such as `[transform:perspective(850px)_rotateX(var(--tilt-x))…]` cannot draw a pseudo-element, and the frames would put raw colors into class names.
- Inline `style` objects would need a React render per pointer move.

### D2. Glow tokens

There are new color tokens in `theme.css`, one per glow. None is a text color, so `theme.test.ts` needs no new contrast pair.

| Token | Value (v2.2.8) | Used for |
| --- | --- | --- |
| `glow-active` | `#43ff9f` | an active card |
| `glow-cursed` | `#ff3c5b` | an active Cursed card, a revealed Cursed card |
| `glow-blessed` | `#fff6d3` | an active Blessed card, a revealed Blessed card |
| `glow-rare` | `#ffae41` | a revealed Rare card |
| `glow-word` | `#a67bff` | an active True Word |
| `glow-word-deep` | `#8f67f7` | the outer ring of an active True Word's glow |
| `premium-frame`, `premium-frame-dark`, `premium-frame-light` | `#e9b94c`, `#8d5a17`, `#f9d777` | the Premium Pack's ridged frame |
| `cursed-frame-dark`, `cursed-frame-light` | `#4c101c`, `#e54c60` | the Cursed packs' frame. The ridge itself uses `cursed`. |

The drop-shadow tokens add the blur and alpha of v2.2.8. For example:
- `--drop-shadow-glow-active: 0 0 13px color-mix(in oklab, var(--color-glow-active) 87%, transparent)`
- `glow-cursed` (14 px, 95%) and `glow-blessed` (15 px, 95%)
- `glow-held`: `gold`, 5 px, 52%
- `glow-selected`: `gold`, 9 px, 85%
- `reveal-rare`, `reveal-cursed`, `reveal-blessed`: 13 px each
- `lift`: the `0 8px 13px` shadow under every revealed card

Each `--drop-shadow-*` token has exactly one layer. Tailwind 4.3 wraps a token's whole value in one `drop-shadow()`, so a value with two comma-separated layers would make the `filter` invalid. This was found while implementing. A glow of two layers therefore either nests two elements, one layer each, or is an `@utility`:
- **A revealed card:** `FaceDownCard`'s box around the face carries `drop-shadow-lift`, and the face's glow box the kind's `reveal-*`. A revealed Common card has only the lift.
- **An active True Word:** the `glow-word` `@utility` in `effects.css` writes both rings, 9 px and 19 px.

A gold glow uses the existing `gold` token. v2.2.8's `#eac57e` is that same color.

**Alternative:** reuse `cursed` (`#ff526d`) and `blessed` (`#fff4c1`). The glows would be paler than v2.2.8's, and `cursed` is tuned for text contrast, not light.

### D3. Frameless picture faces

On the picture branch, `CardFace` drops the kind's border, the padding and the pane background. The picture box becomes the face's visual edge. `data-frame` stays on the root, for the tests and for the glows.

- The CSS face keeps `border-2` and its kind's class.
- The whole-face button's `hover:bg-ink/5` tint stays only on the CSS face. On a picture it would draw a rectangle around a card with rounded corners. The tilt and the glint are the hover feedback there.
- The focus outline stays on both looks.
- The marks stay under the picture, as today.

### D4. Glows are attributes on the face's outer box

`CardFace` gets a computed `glow` value and writes it as `data-glow` on the box that holds the picture, or on the CSS face's root. The value is chosen in order:

1. `isActive`: `active-cursed`, `active-blessed` or `active`, by the card's kind
2. a new `isRevealed` prop, set only by `FaceDownCard`: `reveal-cursed`, `reveal-blessed`, `reveal-rare` or `reveal-common`, by the kind
3. `heldBy` given and not empty: `held`
4. otherwise none

The same value picks the `drop-shadow-*` utility. In the hand, which never passes `isRevealed`, an active card's state wins over its kind.

The glow sits on an outer box, and the tilt (D5) on the picture box inside it. CSS `filter` is one property: if the tilt's `brightness()` and the glow's `drop-shadow()` were on one element, an `@utility` would overwrite the Tailwind filter chain. As in v2.2.8, the outer element glows and the inner one moves, and the glow follows the tilted picture because a filter paints its subtree.

The open pack's selected and chosen card glows `glow-selected` on its `<li>` wrapper, in place of today's `ring-2 ring-gold ring-offset-2`. Once every card is face up, the wrapper gets `hover:drop-shadow-glow-selected`. Nested drop-shadows add up, so the card's kind glow stays visible inside the gold.

### D5. The tilt: a hook that writes CSS variables

`useCardTilt()` (`src/features/cards/useCardTilt.ts`) returns a ref callback and three handlers: `onPointerMove`, `onPointerLeave` and `onPointerDown`. `CardFace` spreads them on its picture box, or its CSS face box, only when a new prop `isTiltable` is set. `HandView` and `CardBrowser` set it. Dialogs never do, as the spec asks.

- **On a move**, the hook first checks four things, and resets the card instead if any of them holds:
  - the pointer is a touch
  - the pointer is a pen with a button down
  - the device asks for reduced motion (`useReducedMotion`)
  - the element is not connected

  Otherwise it computes `x` and `y`, from 0 to 1 across the box, as v2.2.8 does. It then writes the variables in one `requestAnimationFrame`:
  - `--tilt-x`: `(0.5 − y) × 5.4deg`
  - `--tilt-y`: `(x − 0.5) × 5.4deg`
  - `--push-x` and `--push-y`: `(… − 0.5) × 7px`
  - `--glint-x` and `--glint-y`: in percent

  It also sets `data-tilt=""`.
- **On leave**, and on a pointer down by touch or pen, the hook removes the variables and the attribute. A mouse press keeps the tilt, so a click does not jolt the card.
- **`card-tilt`** (effects.css) is the transform:
  - `perspective(850px) translate3d(var(--push-x), var(--push-y), 0) rotateX(var(--tilt-x)) rotateY(var(--tilt-y)) scale(1.014)` and `brightness(1.045)`, only under `[data-tilt]`
  - a 230 ms ease back to flat, and 95 ms while moving
  - the glint as `::after`: a radial gradient at `var(--glint-x) var(--glint-y)`, `mix-blend-mode: screen`, at opacity 0.7 under `[data-tilt]`
  - all of it inside `@media (prefers-reduced-motion: no-preference)`, so reduced motion turns it off in CSS too
- `will-change: transform` is set only under `[data-tilt]`, so a library of hundreds of cards does not create hundreds of layers.

The glint's `::after` sits below the corner icons (`z-20`) and the set symbol (`z-10`), at `z-3`. It has `pointer-events: none`, so it never takes a click.

**Alternative:** one listener on `document`, as in v2.2.8. It would bypass React, and it needs a selector to find the card. Handlers on the face know their element and are removed with it.

### D6. The deck: a pure layout function and a small hook

`deckLayout(width, count, { preferredWidth, maxOverlapRatio, gap })` is a pure function, unit-tested. It returns `{ cardWidth, columns, overlap }`:

- `cardWidth = min(preferredWidth, width)`
- with overlap allowed: v2.2.8's formula
  - `maxOverlap = round(cardWidth × ratio)`
  - `columns = clamp(floor((width − maxOverlap) / (cardWidth − maxOverlap)), 1, count)`
  - `overlap = clamp((columns × cardWidth − width) / (columns − 1), 0, maxOverlap)`
- without overlap: `columns = floor((width + gap) / (cardWidth + gap))`, and `overlap = 0`

`useDeckLayout(count, options)` measures the list's content width with a `ResizeObserver`. It reads `(hover: none)` through `matchMedia`, and passes `maxOverlapRatio = 0` there. It returns:
- a ref
- the list's style: `--deck-card-width`
- per-index props:
  - a `margin-left` of `-overlap px` except at a row's start
  - a `z-index` of `(i % columns) + 1`

Without `ResizeObserver` (jsdom), it returns no overlap and the preferred width, so the existing tests keep a plain wrapping list.

**The hand** uses ratio 0.36, and **the library and the Cursed Deck** 0.39, both with `preferredWidth` 235 and `gap` 12. The list becomes `flex flex-wrap` with `row-gap` about 17 px. The column gap is 0 while overlapping, and 12 px otherwise.

Each `<li>` gets:
- `relative w-(--deck-card-width) max-w-full`
- `hover:z-30 focus-within:z-30`, so the card under the pointer or the focus comes to the front
- the angles:
  - the hand: `nth-[5n+2]:-rotate-[0.35deg] nth-[5n+3]:rotate-[0.45deg] nth-[5n+4]:-rotate-[0.2deg]`
  - the library: the `7n+2`, `7n+4` and `7n+6` angles
  - `motion-reduce:rotate-0`

The `rotate` property composes with the tilt's `transform` on the inner box.

**Alternative:** CSS only, with negative margins at fixed breakpoints. The overlap depends on the exact width and on the number of cards in a row, which CSS cannot count.

### D7. The draw spread

The `<ol>` in `DrawDialog` becomes `flex flex-wrap justify-center gap-y-3`. Each `<li>`:

- has `w-[clamp(225px,31.5vw,352.5px)] max-w-[calc(100vw-84px)]`, and `w-[clamp(202.5px,51vw,277.5px)]` below the `sm` breakpoint
- has `-mr-3.75` (`-mr-3` below `sm`), so neighbours overlap
- lifts with `transition motion-safe:hover:-translate-y-2.5 motion-safe:hover:scale-[1.035] motion-safe:focus-within:-translate-y-2.5 motion-safe:focus-within:scale-[1.035] hover:z-50 focus-within:z-50`. In Tailwind v4, `translate-*` and `scale-*` set the `translate` and `scale` properties, not `transform`, so `motion-reduce:transform-none` would not stop them: every lift is written under `motion-safe:` instead.

The dialog's width grows to `sm:max-w-5xl` (today `sm:max-w-xl`), so three to four cards fit in a row on a desktop.

The flip (`FaceDownCard`) becomes `duration-680 ease-card-flip`, with `--ease-card-flip: cubic-bezier(.18,.72,.16,1)`. This also applies in the open pack.

### D8. The burst: the pack's own art, full-screen

`OpenPackView` picks the burst's picture with a new helper, `burstArtUrl(art, pack)`:
- a pack with a `setCode`: `art.backUrl(setCode)`
- any other pack: `art.packUrl(packDefOf(pack).key)`
- otherwise `null`, which keeps the CSS glyph box

The burst is a `fixed inset-0 z-50` layer inside the pack's `<dialog>`, so it is drawn in the top layer above the dialog. It has three parts:
- the layer itself, running `animate-burst-backdrop`: a near-black background that flashes warm white at about 97% of the run and then fades to transparent
- a stage `min(400px, 76vw, 45vh)` wide, at the card's aspect ratio, with a drop shadow
- the picture, or the glyph box, running `animate-pack-burst`, with a box running `animate-burst-halo` behind it

The keyframes follow v2.2.8's `packBurstPulse`, `packBurstHalo` and `packBurstBackdrop`:
- three swells of growing size and `brightness()`
- a halo `box-shadow` that grows to white
- a final scale of 2.7 at `brightness(7)` and opacity 0

The duration becomes 2.85 s, and `BURST_FALLBACK_MS` follows it. `onAnimationEnd` on the picture ends the burst, as today. It checks that the event's target is the picture itself, so an end that bubbles from elsewhere never ends it early. The halo is a sibling, so its end never reaches the picture. In jsdom, which has no `AnimationEvent`, React listens for `webkitAnimationEnd`, so the tests fire that. The layer has `aria-hidden`, and the existing `data-testid="pack-burst"` stays on it. With reduced motion it never mounts, as today.

### D9. Pack tiles

`PackTile` wraps its picture, or its glyph, in a `relative isolate` box. That box gets `data-pack-frame="premium"` for `type === 'premium'`, and `data-pack-frame="cursed"` for `cursed`, `cursedGolden` and `pandemoniumCursed`, with the matching `@utility`:

- `pack-frame-premium`:
  - `border: 5px ridge` in `premium-frame`, plus three outer rings and an inset glow
  - a `::before` with a double gold border inset 9 px, and `content: "✦" / ""`, so screen readers skip the glyph
  - a `::after` with the diagonal gold sheen, running `--animate-pack-shimmer` (5.2 s, `ease-in-out infinite alternate`, opacity 0.65 → 1 and brightness 0.88 → 1.28), with no animation under reduced motion
- `pack-frame-cursed`: the same with the cursed tokens and `content: "☠" / ""`, and without the shimmer

The tile's button gets:
- `transition motion-safe:enabled:hover:-translate-y-0.75 enabled:hover:brightness-110 motion-safe:enabled:focus-visible:-translate-y-0.75`
- `disabled:grayscale-45` next to its existing `disabled:opacity-60`
- the lift only under `motion-safe:` (see D7)

The group tiles in `PackShopPage` (each set's group and Golden Packs) and the two `ShopsPage` choices get the same lift. The shop choices lift 5 px, with a `shadow-xl`.

### D10. True Words and the Cardmaker

- **`TrueWordTile`:** an active word adds the `glow-word` `@utility` and `data-glow="word"`. The tile's existing `● Aktif` mark stays. The `border-gold` it has today for an active word becomes `border-true-word-line`, so the gold no longer fights the purple.
- **The lift:** only `HandTrueWords` covers a tile with a button, which opens the word's details. Those tiles add `transition motion-safe:hover:-translate-y-1.25 motion-safe:hover:scale-[1.02] motion-safe:has-focus-visible:-translate-y-1.25`. The tiles on the True Words screen open nothing, so they do not lift. Neither do the draft panel's tiles, where only the "Öğren" button acts.
- **`HandSummary`:** the name of an active True Word gets `text-shadow-glow-word`, a token of `0 0 8px` at 47%.
- **`Mascot`:** adds `drop-shadow-lift`, the soft shadow of the revealed cards, close to v2.2.8's `0 9px 15px` at 35%. The shocked pair already has one.

### D11. Tests

jsdom draws nothing, so the tests check the DOM state that the CSS keys on.

- **`deckLayout`:** widths of 360, 768 and 1280 px, 1 to 20 cards, with and without overlap. Row starts have no negative margin.
- **`useCardTilt`, through `CardFace`:**
  - a `pointermove` of type `mouse` sets `data-tilt` and the variables
  - `touch` does not
  - reduced motion does not
  - `pointerleave` clears them
  - a face without `isTiltable` has no handlers
- **`CardFace`:**
  - a picture face has no `border-*` frame class, and a CSS face keeps its frame class
  - `data-glow` for active, Cursed active, Blessed active, revealed by kind, and held
- **`OpenPackView`:**
  - the burst's `<img>` uses the set's cardback for a set pack, and the pack picture for a Mechanic Pack
  - the glyph is shown without a picture
  - a halo `animationend` does not end the burst
- **`PackTile`:** `data-pack-frame` for Premium and the three Cursed types, and none for Standard and Golden.
- **`TrueWordTile`:** `data-glow="word"` when active.
- **Existing tests** that assert `border-common`, `ring-gold` or the burst's old glyph change with the new markup.
- **A manual check in Chrome** at 1280 px and at 360 px (the iframe check). It covers the tilt, the deck overlap, the glows, the spread, the burst with pictures, and the pack frames.

## Risks / Trade-offs

- **[Risk] An overlapped card hides its magnifier and set symbol.** The next card covers the right side, where both sit. → The card under the pointer or the focus comes to the front, before the pointer reaches the magnifier. Without hover, the cards never overlap (D6). Keyboard focus raises the card through `focus-within`.
- **[Risk] Many `drop-shadow` filters slow a large library.** → Only held cards glow in the library, and `will-change` is set only on the one card being tilted. If the library still stutters, the held glow can move to a `box-shadow` on the picture box, which is cheaper and almost the same on a rectangular picture.
- **[Risk] Pointer moves cost a layout read each.** → One `getBoundingClientRect` per frame on one element, batched in `requestAnimationFrame`. That is what v2.2.8 does.
- **[Trade-off] Larger cards show fewer per screen.** At 235 px, a 1280 px window fits about seven hand cards with overlap, where today about ten fit. This is v2.2.8's choice, and the owner asked for its look. The list view stays for scanning many cards.
- **[Risk] The burst's white flash is harsh on a dark screen.** → It peaks at 60% opacity for under a tenth of a second, as in v2.2.8, and reduced motion skips the burst entirely.
- **[Risk] A glyph in CSS `content` is read by screen readers.** → `content: "✦" / ""` gives it an empty alternative text. The tile's name already says what the pack is.
- **[Trade-off] The kind no longer has a CSS frame on picture faces.** If a picture's printed frame were unclear, the kind would show only in the picture. → The pictures come from the owner's printed cards, whose frames are the kind colors (Kurallar: "Mor çerçeveli kartlar"). Cards without a picture keep the CSS frame.

## Migration Plan

This is a front-end change only. No data or rules change. Reverting the commit restores the old look.
