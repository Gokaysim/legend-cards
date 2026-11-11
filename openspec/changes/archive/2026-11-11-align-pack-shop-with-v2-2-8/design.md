# Design

## Context

See proposal.md for why. What each part must do is in the delta specs: `cardmaker-speech`, and the changed requirements of `card-images`, `visual-effects` and `pack-shop`. This is the current state that shapes the approach:

- **Pack tiles.** `PackTile` (`src/features/packs/PackTile.tsx`) is one `<li>` holding a `<button>` with `aria-label="<title> aç"`. The button holds the picture, held to `max-w-40` (160 px), then the name, then the price when `showPrice` is set. A frame wrapper (`pack-frame-premium` or `pack-frame-cursed` from `src/styles/effects.css`) surrounds the picture. A tile without a picture shows a glyph. The reason a pack cannot be opened is a `<p>` under the button, and the button's description.
- **Group tiles.** In `PackShopPage`, a set's group and the Golden Packs are inline `<Link>`s with a glyph (`♜`, `✦`) and the name. They have no picture.
- **The Cardmaker.** `Mascot` (`src/features/art/Mascot.tsx`) draws a picture stem, or nothing without one. `PageHeader` shows it at the right of the title. In an open group, `PackShopPage` draws the group's Cardmaker by the group's title, with the shop's as a stand-in, and the Golden Packs' larger. The Shops screen asks for `cardmaker_keep`, which has no picture, so it shows none.
- **Shop text.** `SHOP_SCREENS` (`src/app/screens.ts`) holds each shop's `summary`. `ShopsPage` shows it in the tile as the link's description. Nothing in the app holds the Mechanic Packs' descriptions or the Cardmaker's lines yet. They are in v2.2.8's `MECHANIC_SHOP_LINES`, lines 1071–1120.
- **Layout.** The sidebar appears from `lg` (1024 px). Below it, `MobileNav` takes over. `useDeckLayout` already reads `(hover: none)` through `matchMedia` and `useSyncExternalStore`, and `useReducedMotion` (`src/lib/`) does the same for reduced motion. jsdom has no `matchMedia`, and tests stub it with `vi.stubGlobal`.
- **Overlays.** The pack burst backdrop and the shocked pair are `fixed` at `z-50`. Dialogs are native `<dialog>`s in the top layer.
- **v2.2.8's numbers** used below come from its CSS:
  - lines 326–371: the shop grid, the tiles, and the price and name type
  - lines 503–566: the fixed `.page-mascot`, its sizes, and `mascot-hover-dismissed`
  - lines 590–604: `.mechanic-shop-bubble`

  Its event code (lines 1830–1850) shows the one-second delay, and that touch is ignored. These are references for values and behavior, not code to copy.

## Goals / Non-Goals

**Goals:**
- One place decides whether the Cardmaker stands in the corner, and the same answer turns the bubbles on. A phone never pays for any of it.
- The bubble's text lives with the thing it describes: the shops' text in `screens.ts`, the packs' text in the packs feature. `art/` draws a bubble, but does not know what it says.
- Tests can see the placement and the bubble in the DOM, as jsdom draws nothing.

**Non-Goals:**
- No pixel-exact copy of v2.2.8. Its sizes are followed, but the app's own grids and the sidebar width win where they differ.
- No change to any screen outside the shops.

## Decisions

### D1. "Wide with hover" is one live media query

`src/lib/useWideHover.ts` exports `useWideHover()`. It is true while `matchMedia('(hover: hover) and (min-width: 64rem)')` matches, and it follows changes through `useSyncExternalStore`, as `useReducedMotion` does. Where `matchMedia` is missing, as in jsdom without a stub, it is false, so the Cardmaker stays by the title.

- **Why both conditions.** 64rem is `lg`, where the sidebar layout begins. Below it, the page is the phone or tablet layout, and a fixed figure would cover the cards. Hover is needed because the bubble opens on hover, and the Cardmaker fades under the pointer. On a touch-only device she could never get out of the way.
- **Alternative: a CSS-only variant** that draws her in both places and hides one. It was rejected for three reasons. The bubble needs JavaScript anyway. jsdom cannot evaluate media queries, so tests could not tell the placements apart. And two `<img>` elements of one stem would sit in the DOM.

### D2. The screen chooses the placement

Each shop screen (`ShopsPage`, `PackShopPage`, `ElixirShopPage`) calls `useWideHover()`.
- **When true:** the screen passes `mascot={null}` to `PageHeader` or `Placeholder`, leaves the group header without its Cardmaker, and renders `<CornerCardmaker stem={…} size={…} />`.
- **When false:** everything stays as today.

`PageHeader` and `Placeholder` need no change.

The stem is chosen as today:
- **Pack Shop:** the main view shows `cardmaker_shop`.
- **A group:** a set's group shows its own Cardmaker, with the shop's as a stand-in. The Golden Packs show `cardmaker_gold` at `size="gold"`.
- **Shops:** the screen asks for `cardmaker_keep` while `art.mascotUrl('cardmaker_keep')` is not `null`, and for `cardmaker_shop` otherwise. This is the same stand-in pattern as the groups use. `screens.ts` keeps `cardmaker_keep` as the screen's own stem.

### D3. The corner Cardmaker

`src/features/art/CornerCardmaker.tsx` draws the `Mascot` in a `fixed` box:
- **Position:** `right-4.5 bottom-3`, so 18 px and 12 px.
- **Size `shop`:** `w-[min(430px,39vw)] h-[min(440px,62vh)]`.
- **Size `gold`:** `w-[min(625px,62vw)] h-[min(620px,80vh)]`.
- **The picture:** `object-contain object-right-bottom`.
- **Layer and pointer:** `z-20`, which keeps her below the burst and the shocked pair (`z-50`) and below dialogs. `pointer-events-none`. `aria-hidden`.
- **Test hook:** `data-corner-cardmaker` with the stem.

**Fading.** She never takes pointer events, so `:hover` cannot fade her. As in v2.2.8, she fades by hit-testing instead:
- **The pointer:** a `pointermove` listener on `document` checks mouse and pen moves only. Within one `requestAnimationFrame`, it tests whether the pointer is inside her box's `getBoundingClientRect()`.
- **The focus:** a `focusin` listener tests whether the focused element's rect overlaps her box.
- **The result:** while either is true, the box has `data-dismissed` and `opacity-0`. Her fade-out takes 170 ms and her return 320 ms, as in v2.2.8. `motion-reduce:transition-none` turns the fade into a switch.
- **Alternative:** taking pointer events and using `:hover`. It was rejected, because she would then swallow clicks on the tiles under her.

Her box is larger than her figure, because of `object-contain`. So the pointer fades her anywhere in that box, as in v2.2.8.

### D4. The speech state: a provider per screen, handlers on the tile

`src/features/art/cardmakerSpeech.ts` holds the context and:
- `useSpeechTrigger(line)`, for a tile
- `useSpokenLine()`, for the corner

`src/features/art/CardmakerSpeechProvider.tsx` holds `CardmakerSpeechProvider`. They are two files, as `tableContext.ts` and `TableProvider.tsx` are, so that a component file exports only components (Fast Refresh).

A `SpeechLine` is `{ title, summary, speech }`.

- **The provider.** It wraps a shop screen's content and holds the current line. It takes `isEnabled`, which is the screen's `useWideHover()`. It unmounts with the screen, so a bubble never outlives its screen.
- **The trigger.** `useSpeechTrigger(line)` returns handlers for the tile's `<li>`: `onPointerEnter`, `onPointerLeave`, `onFocus` and `onBlur`.
  - `pointerType === 'touch'` is ignored.
  - Entering starts a 1000 ms timer (`SPEECH_DELAY_MS`), and the line shows when it fires.
  - Leaving the tile, or a blur whose `relatedTarget` is outside the `<li>`, clears the timer and hides the line.
  - Entering another tile hides the line at once and starts a new timer.
  - When the provider is disabled, or `line` is `null`, the handlers are `{}`.
- **Why the `<li>`, not the button.** A Mechanic Pack that cannot be opened has a disabled button. Browsers fire no pointer events on a disabled control, but v2.2.8 lets such a pack speak, because its trigger is the tile's wrapper. React's `onFocus` and `onBlur` bubble, so the focus reaches the `<li>` from its button or link.
- **Alternative: a document-level `pointerover` with `data-*` lookups,** as in v2.2.8. It was rejected because it would tie the art feature to the markup of other features. The hook keeps each tile's line typed where the tile is built.

### D5. The bubble

`CornerCardmaker` renders the bubble while `useSpokenLine()` holds a line.

- **Position:** `fixed`, `bottom-9.5` (38 px). Its right edge sits 20 px left of the corner box: `right-[calc(18px+min(430px,39vw)+20px)]`. Bubbles only ever stand next to the `shop`-sized corner, because no screen with the Golden Packs' corner has a speaking tile.
- **Width:** `w-[min(470px,calc(100vw-16rem-min(430px,39vw)-4.5rem))]`. This keeps it clear of the 16rem sidebar. At 1024 px, it is about 300 px wide.
- **Look:** v2.2.8's cream bubble, through new tokens:
  - `bubble` `#fff5dc` and `bubble-deep` `#f3dfb7` (the gradient)
  - `bubble-line` `#d6ac68` (the 2 px border)
  - `bubble-title` `#5a2e24`, `bubble-ink` `#35231d` and `bubble-ink-muted` `#6d594e`

  Their contrast on both surfaces is at least 5.0:1. The lowest is `bubble-ink-muted` on `bubble-deep`. `theme.test.ts` gets these pairs.
- **The tail:** a `speech-bubble-tail` `@utility` in `effects.css` draws the tail that points at the Cardmaker, as a rotated pseudo-element, because the tail needs one.
- **Content:** the title in extra-bold `bubble-title`, the summary in bold `bubble-ink`, and the speech in `bubble-ink-muted` with `whitespace-pre-wrap`.
- **Motion:** `motion-safe:` adds v2.2.8's entrance (12 px rise and 0.97 scale, 220 ms). With reduced motion, it only appears.
- **Pointer:** `pointer-events-none`, so a click under it reaches the tile.
- **`aria-hidden="true"`.** Everything the bubble says is reachable elsewhere: the shop's summary as the tile's description, and the pack's summary in its confirmation. The speech is flavor.
  - *Alternative:* `role="status"` with `aria-live`, as in v2.2.8. It was rejected because it would announce every pass of the pointer, and repeat descriptions that screen readers already have.

### D6. Where the words live

- **Shops.** `SHOP_SCREENS` gets `speech` next to `summary`, with v2.2.8's `packshop` and `elixirshop` lines.
- **Packs.** `src/features/packs/packLines.ts` holds `PACK_LINES`, keyed by the normalized mechanic pack name:
  - the keys: `arcanusdivine`, `bloodbattle`, `dungeoneerskit`, `gamblersgambit`, `hornofplenty`, `legendsofold`, `permamancy`, `riskreward`, and the alias `riskandreward`
  - `GOLDEN_LINE`, the Golden Packs' line
  - `packLine(def)`, which returns the line or `null`: a Mechanic Pack's line by `normalize(def.mechanicPack)`, the Golden Pack's `GOLDEN_LINE`, and `null` for every other type, the Cursed Golden Pack included
- **Text.** The summaries and speeches are v2.2.8's, character for character, with one exception: "Blessed cartlar" becomes "Blessed kartlar", an obvious typo. Line breaks are kept.
- **Bubble titles.** A bubble's title is the tile's own name: `packTitle(def)`, "Golden Packs", or the shop's label. It is not v2.2.8's title, for two reasons. v2.2.8's titles are inconsistent: "Gambler's Gambit" has no "Pack", "Risk and Reward Pack" uses "and", and the Golden Packs tile says "Golden Pack". And the bubble should name what the pointer rests on.

### D7. Pack tiles in v2.2.8's order

`PackTile` keeps its button and its `aria-label`. Inside the button, from top to bottom:
1. **The price**, when `showPrice` is set: centered, `text-gold`, extra-bold.
2. **The picture** at `w-full`, in its frame wrapper. The `max-w-40` cap goes.
3. **The name**, left-aligned and bold, only when `hasNameOnTile(def.type)` is true or the tile has no picture.

- **`hasNameOnTile(type)`** in `catalog.ts` lists `mechanic`, `golden`, `cursedGolden`, `pandemonium` and `pandemoniumCursed`. The last one is the owner's choice. A pack without a picture shows its glyph and its name, so a tile is never only a glyph.
- **`variant`.** A new prop, `'shop' | 'group'`, sets v2.2.8's two scales:
  - `shop` (the main view): `p-4`, the price `text-sm`, the name `text-base`
  - `group` (inside a group): `p-5`, the price `text-base`, the name `text-lg` extra-bold
- **The grids keep their columns:** 2, 3 and 4 in the main view, and 1, 2 and 3 in a group. Each picture now fills its column. At 360 px, the main view's two columns are about 156 px wide, which fits "3 LP / 7.500 GP" at `text-sm`.
- **The disabled reason** stays under the button.

### D8. Group tiles

`PackShopPage`'s inline group links become `GroupTile` (`src/features/packs/GroupTile.tsx`), with the same link, URL and `aria-label`.
- **Picture:** `art.packUrl(group.packs[0].key) ?? art.backUrl(group.setCode)` for a set, and `art.packUrl('golden')` for the Golden Packs, through `usePicture`. The picture is `w-full` with `alt=""`.
- **Name:** under the picture, left-aligned.
- **Without a picture:** the glyph stays, `♜` for a set and `✦` for the Golden Packs.
- **Golden Packs:** keeps `border-gold` and its gold name.
- **Speech:** the Golden Packs tile speaks `GOLDEN_LINE`'s summary and speech under the title "Golden Packs". Each Mechanic Pack tile speaks its `packLine(def)` under `packTitle(def)`. Set groups have no line.

### D9. The Shops tiles

- **The summary** keeps its `<span id>` and the link's `aria-describedby`. When `useWideHover()` is true it gets `sr-only`, so screen readers still have it while sighted users get the bubble. Otherwise it shows as today.
- **The line:** each `<li>` takes `useSpeechTrigger({ title: label, summary, speech })`.

### D10. The confirmation's description

`PackConfirmDialog` shows `packLine(def)?.summary` as a `text-sm text-ink` paragraph, first in the dialog, above the "Kimin için" list. It has no dependency on the device.

### D11. Tests

- **`useWideHover.test.ts`:**
  - it is true only when the stubbed `matchMedia` matches
  - it follows a change event
  - it is false without `matchMedia`
- **`cardmakerSpeech.test.tsx`, with fake timers:**
  - a line shows after 1000 ms and not before
  - leaving cancels it
  - a touch is ignored
  - focus opens it, and a blur inside the `<li>` keeps it
  - a second tile replaces the first
  - a disabled provider gives no handlers
- **`CornerCardmaker.test.tsx`:**
  - `pointer-events-none` and `aria-hidden`
  - `data-dismissed` while a mocked rect holds the pointer or the focused element
  - the bubble's three texts
- **`PackShopPage.test.tsx`:**
  - The tile order in the DOM: the price before the picture, and the picture before the name.
  - Names only on the listed types, and on tiles without a picture. The test that expects names on Kesqer's packs changes.
  - The group pictures and their glyph fallback.
  - With `matchMedia` stubbed to match: the corner Cardmaker and no title Cardmaker, the Golden Packs' `size="gold"`, a Mechanic Pack's bubble after one second, and no bubble inside a group.
- **`PackConfirmDialog` (in `PackShopPage.test.tsx`):** Blood & Battle's and the Golden Pack's descriptions, and none for a Standard Pack.
- **`ShopsPage.test.tsx`:**
  - the stand-in Cardmaker
  - the summary visible without the stub, and `sr-only` with it, both as the link's description
  - the Pack Shop bubble
- **`theme.test.ts`:** the bubble ink pairs.
- **Manual, in Chrome:**
  - the corner, the fade, and the bubble at 1280 px and at 1024 px
  - the title placement and the summaries at 360 px, without horizontal scroll

### D12. The hand, in the confirmation

The owner asked for the DM's "Kimin için" select to sit inside the pack's confirmation instead of at the top of the Pack Shop.

- `PackShop` still finds the hand from `?for=`, else the first player who is not the DM, else the DM. It no longer renders a select.
- For the DM, it passes the profiles as `choices` and an `onOwnerChange` to `PackConfirmDialog`. The dialog renders the select under the description, above the price. A player keeps the read-only "Kimin için" row.
- A change writes `?for=` with `replace: true`. The next pack then starts at the same hand, a reload keeps it, and the dialog adds no history entries.
- A change resets the payment to the new hand's defaults: the player's LP at the LP price, or the purse at the GP price for the DM's own hand. It also clears any error.
- The select is disabled while the pack is opening.
- **Alternative:** keep the choice in the dialog's own state. Rejected: the next pack would go back to the link's hand.

## Risks / Trade-offs

- **The corner covers the bottom-right tiles.** → She takes no pointer events. She fades when the pointer or the focus reaches what she covers, and the page scrolls.
- **A bubble can cover the next row of tiles.** v2.2.8 has the same. → It takes no pointer events, and it closes as soon as the pointer moves to another tile.
- **A laptop with both touch and a trackpad** reports `hover: hover`. → It gets the corner. A touch there opens no bubble, and the trackpad fades her.
- **Resizing across 1024 px** switches the placement at once, and drops any open bubble. → This is acceptable, and the hook keeps it consistent.
- **The `getBoundingClientRect` hit test runs on pointer moves.** → It runs at most once per animation frame, only while a corner Cardmaker is mounted, and only for mouse and pen.
- **A screen reader user never hears the speech lines.** → They are flavor. The descriptions are reachable, as D5 and D9 describe.

## Migration Plan

This is a client-only change. It has no data, rules or deployment steps, and a revert of its commit rolls it back.
