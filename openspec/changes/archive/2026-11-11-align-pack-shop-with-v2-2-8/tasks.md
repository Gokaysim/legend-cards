# Tasks

## 1. The words and the bubble's colors

- [x] 1.1 Create `src/features/packs/packLines.ts` (design D6):
  - `PACK_LINES`, keyed by the normalized mechanic pack name: `arcanusdivine`, `bloodbattle`, `dungeoneerskit`, `gamblersgambit`, `hornofplenty`, `legendsofold`, `permamancy`, `riskreward`, and `riskandreward` as an alias of `riskreward`
  - `GOLDEN_LINE`
  - `packLine(def)`, which returns a Mechanic Pack's line by `normalize(def.mechanicPack)`, `GOLDEN_LINE` for the Golden Pack, and `null` otherwise

  Each line is `{ summary, speech }`, copied from v2.2.8's `MECHANIC_SHOP_LINES` (lines 1084–1119) with its line breaks, and with "Blessed cartlar" fixed to "Blessed kartlar". Add `packLines.test.ts`. It checks:
  - Blood & Battle's summary
  - "Risk & Reward" and "Risk and Reward" find the same line
  - the Golden Pack's line has the fixed word
  - a Standard Pack, the Cursed Golden Pack and an unknown mechanic pack give `null`

  Verify: the tests pass.
- [x] 1.2 In `src/app/screens.ts`, give each `SHOP_SCREENS` entry a `speech`: v2.2.8's `packshop` and `elixirshop` lines (design D6). Verify: `npm run typecheck` passes.
- [x] 1.3 Add the bubble tokens to `src/styles/theme.css` (design D5), each with a comment naming what it is for:
  - the surfaces `bubble` `#fff5dc` and `bubble-deep` `#f3dfb7`
  - the border `bubble-line` `#d6ac68`
  - the inks `bubble-title` `#5a2e24`, `bubble-ink` `#35231d` and `bubble-ink-muted` `#6d594e`

  Add the three inks on both surfaces to `src/styles/theme.test.ts`. Verify: `theme.test.ts` passes.
- [x] 1.4 Add the `speech-bubble-tail` `@utility` to `src/styles/effects.css`. It is a rotated square on the bubble's right edge, pointing at the Cardmaker, in `bubble-deep` with the `bubble-line` border, as v2.2.8's `.mechanic-shop-bubble:before`. Verify: `npm run check` passes.

## 2. Wide with hover

- [x] 2.1 Create `src/lib/useWideHover.ts` (design D1). It is true while `(hover: hover) and (min-width: 64rem)` matches, live through `useSyncExternalStore`, and false without `matchMedia`. Add `useWideHover.test.ts`, which stubs `matchMedia` as `useDeckLayout.test.ts` does. It checks:
  - true when the query matches, and false when it does not
  - a change event switches it
  - false without `matchMedia`

  In `docs/conventions.md`, add the hook to the `lib/` list. Verify: the tests pass.

## 3. Pack tiles in v2.2.8's order

- [x] 3.1 Add `hasNameOnTile(type)` to `src/features/packs/catalog.ts` (design D7). It is true for `mechanic`, `golden`, `cursedGolden`, `pandemonium` and `pandemoniumCursed`. Extend `catalog.test.ts` for all eight types. Verify: the tests pass.
- [x] 3.2 Rework `PackTile` (design D7):
  - Inside the button: the price on top when `showPrice` is set, the picture at `w-full` in its frame wrapper with the `max-w-40` cap gone, then the name. The name shows only when `hasNameOnTile` is true or there is no picture.
  - A new `variant` prop, `'shop' | 'group'`, with v2.2.8's two scales.
  - The button, its `aria-label`, the disabled reason, the frames, the lift and the greyed-out look stay.
  - `PackShopPage` passes `variant="group"` inside a group and `variant="shop"` for the Mechanic Packs.

  Update the `pack pictures` tests in `PackShopPage.test.tsx`:
  - Kesqer's Standard, Premium and Cursed Packs show their prices and the cardback, but not their names.
  - The two Pandemonium packs and the Golden Packs show their names.
  - A Mechanic Pack shows its name and no price.
  - In DOM order, the price comes before the picture, and the picture before the name.
  - A pack without a picture keeps its glyph and its name.
  - The button's name is still "<title> aç".

  Verify: the tests pass, and the `pack frames` and `when a pack can be opened` tests still pass.
- [x] 3.3 In `docs/domain.md`, Pictures, rewrite the "Pack Shop tiles" bullet: the price above a picture that fills the tile, and which packs keep their name. Record that the owner chose to name the Pandemonium Cursed Pack, though v2.2.8 does not, on 2026-11-11. Verify: `npm run check` passes.

## 4. Group pictures

- [x] 4.1 Create `src/features/packs/GroupTile.tsx` from `PackShopPage`'s inline group links (design D8):
  - the same link, URL and `aria-label`
  - the picture at `w-full` with `alt=""`: for a set, its first pack's picture, or else its set's cardback; for the Golden Packs, the Golden Pack picture
  - the name under the picture
  - the glyph `♜` or `✦` without a picture
  - the Golden Packs' gold border and name

  Use it in `PackShopPage`. Add tests to `PackShopPage.test.tsx`:
  - "Kesqerian Nights Packs" shows the Kesqer cardback
  - "Golden Packs" shows the Golden Pack picture
  - a set without a cardback keeps `♜` with its name
  - with no pictures, every group shows its glyph and its name

  Verify: the tests pass, and the `Pack Shop layout` tests still pass.
- [x] 4.2 In `docs/domain.md`, Pictures, add that the group tiles show their set's cardback and the Golden Pack picture. Verify: `npm run check` passes.

## 5. What a pack holds, before paying

- [x] 5.1 In `PackConfirmDialog`, show `packLine(def)?.summary` as the dialog's first paragraph, above the "Kimin için" list (design D10). Add tests to `PackShopPage.test.tsx`:
  - the Blood & Battle Mechanic Pack's confirmation shows its summary
  - the Golden Pack's shows "Sadece Rare kartlar ve Blessed kartlar içerir."
  - a Kesqerian Nights Standard Pack's shows none

  Verify: the tests pass.

## 6. The Cardmaker in the corner

- [x] 6.1 Create `src/features/art/CornerCardmaker.tsx` (design D3):
  - the `Mascot` in a fixed box, `right-4.5 bottom-3`, `z-20`
  - `pointer-events-none` and `aria-hidden`
  - `data-corner-cardmaker` with the stem
  - the `shop` and `gold` sizes, with `object-contain object-right-bottom`

  For the fading, a mouse-and-pen `pointermove` listener and a `focusin` listener on `document` hit-test the box once per animation frame and set `data-dismissed` with `opacity-0`. The fade-out takes 170 ms and the return 320 ms, with `motion-reduce:transition-none`. Both listeners are removed on unmount. Add `CornerCardmaker.test.tsx`, which mocks `getBoundingClientRect`. It checks:
  - the classes and the attributes
  - `data-dismissed` while the pointer is inside the box, and not outside it
  - a touch move does not dismiss her
  - `data-dismissed` while the focused element overlaps the box
  - nothing renders without the picture

  Verify: the tests pass.
- [x] 6.2 Place the Cardmaker on the shop screens with `useWideHover()` (design D2):
  - **`PackShopPage`:** the main view's `cardmaker_shop`, a group's own Cardmaker with the shop's as a stand-in, and the Golden Packs' `cardmaker_gold` at `size="gold"`. Each is in the corner when the hook is true, with the title and the group header left without a Cardmaker. Otherwise they stay by the title, as today.
  - **`ShopsPage`:** `cardmaker_keep` while it has a picture, else `cardmaker_shop`, by the title or in the corner.
  - **`ElixirShopPage`:** `cardmaker_zaddir`, by the title or in the corner.

  In `PackShopPage.test.tsx`, with `matchMedia` stubbed to match:
  - the corner shows `cardmaker_shop`, and the header has no `data-mascot`
  - a set group shows its own corner Cardmaker
  - the Golden Packs show `size="gold"`

  Without the stub, the existing "the groups' Cardmakers" tests still pass. In `ShopsPage.test.tsx`, test the stand-in, both with and without a `cardmaker_keep` picture, and the corner. Verify: the tests pass.
- [x] 6.3 Update `docs/domain.md`:
  - **Pictures, the Cardmaker bullet:** the shop screens' corner placement on a wide screen with a mouse, and the fade. The Shops screen shows `cardmaker_shop` until `cardmaker_keep` exists.
  - **Deliberate decisions:** the owner chose the corner for the shops only, and only with hover from 1024 px, on 2026-11-11.

  In `docs/conventions.md`, add `CornerCardmaker` to the `art/` list. Verify: `npm run check` passes.

## 7. Speech bubbles

- [x] 7.1 Create `src/features/art/cardmakerSpeech.ts` and `src/features/art/CardmakerSpeechProvider.tsx` (design D4):
  - `SpeechLine`
  - `CardmakerSpeechProvider` with `isEnabled`
  - `useSpeechTrigger(line)`, which returns `onPointerEnter`, `onPointerLeave`, `onFocus` and `onBlur` for a tile's `<li>`, or `{}` when disabled or without a line
  - `useSpokenLine()`
  - `SPEECH_DELAY_MS = 1000`

  Add `cardmakerSpeech.test.tsx` with fake timers. It checks:
  - a line shows after 1000 ms and not at 999
  - leaving before the delay shows nothing
  - a touch is ignored
  - focus opens a line, and moving the focus inside the `<li>` keeps it
  - a second tile hides the first at once and shows after its own delay
  - unmounting clears the timer
  - a disabled provider gives `{}`

  Verify: the tests pass.
- [x] 7.2 Render the bubble in `CornerCardmaker` while `useSpokenLine()` holds a line (design D5):
  - placed at the corner's left, and clear of the sidebar
  - `bubble` to `bubble-deep`, with the `bubble-line` border and `speech-bubble-tail`
  - the title, the summary, and the speech with `whitespace-pre-wrap`
  - `pointer-events-none` and `aria-hidden`
  - the `motion-safe:` entrance

  Extend `CornerCardmaker.test.tsx` for the three texts and the attributes. Verify: the tests pass.
- [x] 7.3 Wire the triggers (design D8, D9):
  - **`PackShopPage`:** wraps its content in `CardmakerSpeechProvider` with `isEnabled={useWideHover()}`. In the main view, each Mechanic Pack's `<li>` speaks `packLine(def)` under `packTitle(def)`, through a new optional prop on `PackTile`. The Golden Packs tile speaks `GOLDEN_LINE` under "Golden Packs". Nothing in a group speaks.
  - **`ShopsPage`:** each shop's `<li>` speaks its label, summary and speech. The summary gets `sr-only` when the hook is true.

  Add tests, with `matchMedia` stubbed and fake timers:
  - hovering Blood & Battle shows its bubble after a second
  - a disabled Mechanic Pack still speaks
  - tabbing to the Golden Packs shows their bubble
  - no bubble inside the Kesqer group
  - no bubble without the stub
  - on Shops, the Pack Shop bubble shows, and the summary is `sr-only` but still the link's description; without the stub, it is visible

  Verify: the tests pass, and `ShopsPage.test.tsx`'s summary test still passes.
- [x] 7.4 In `docs/domain.md`:
  - **Pictures:** add a bullet on the speech bubbles: where they show, their one-second delay, and that the descriptions are also in the Shops tiles and the pack confirmation.
  - **"Changes since v2.1.15":** mark the speech bubbles as built.

  In `docs/conventions.md`, add `cardmakerSpeech` to the `art/` list. Verify: `npm run check` passes.

## 8. Integration checks

- [x] 8.1 Run `npm run check` and `npm run test:emulator`. Verify: both pass.
- [x] 8.2 Check in Chrome against the emulators, signed in as the DM test account:
  - **At 1280 px:**
    - the Pack Shop's group pictures, and the tiles' price, picture and name
    - the corner Cardmaker, which stays while scrolling and fades under the pointer and under the focus
    - a Mechanic Pack's bubble after a second, and the Golden Packs' bubble
    - no bubble in a group
    - the Golden Packs' larger Cardmaker
    - the Shops bubbles with the stand-in Cardmaker
    - Blood & Battle's description in its confirmation
  - **At 1024 px:** the bubble stays clear of the sidebar.
  - **At 360 px, in a fixed iframe:**
    - the Cardmaker by the title, no bubbles
    - the Shops summaries visible
    - no horizontal scroll on Shops, the Pack Shop, a group and the Golden Packs

  Verify: each point is seen, and is noted in this task.

  Seen on 2026-11-11, in the owner's Chrome window (1545 px wide, which is wide with hover) and in fixed iframes, as the DM "Otter Otter":
  - **Main view:**
    - The 12 set groups show their cardbacks, and the Golden Packs the Golden Pack picture, each with its name under it, as in v2.2.8.
    - The Mechanic Packs show their pictures across the tile and their names under them, with no price.
  - **Groups:**
    - Kesqer's three packs show the price above the cardback, in the gold or red frame, with no name.
    - The two Pandemonium packs show "3 LP / 7.500 GP" and their names.
    - The Golden Packs show both pictures with their names, and a larger `cardmaker_gold` in the corner.
    - Resting on a pack inside a group opened no bubble.
  - **The corner:**
    - `cardmaker_shop` stood in the bottom-right corner and stayed there while scrolling.
    - With the pointer over her, she faded out, and the Havenholm group under her still highlighted.
    - Focusing the Risk & Reward Mechanic Pack under her set `data-dismissed` and opacity 0, and moving the focus away brought her back.
  - **Bubbles:**
    - Blood & Battle's bubble opened after a second at her left, with its name, its description and her line.
    - The Golden Packs' bubble opened the same way.
    - On Shops, `cardmaker_shop` stood in the corner, and "Pack Shop" opened its bubble.
    - The Elixir Shop showed `cardmaker_zaddir` in the corner.
  - **Confirmation:** Blood & Battle's confirmation showed "Combat etkileri, saldırı ve hasar zarlarıyla ilgili kartları içerir." above "Kimin için". It was closed with Escape, and nothing was opened.
  - **1024 px iframe:** the window counted as wide, and the bubble spanned 290–587 px, clear of the sidebar, which ends at 256 px. There was no horizontal scroll.
  - **360 px iframe:**
    - Shops, the Pack Shop, Kesqer, the Golden Packs, Pandemonium and the Elixir Shop scrolled 360 of 360, with no horizontal scroll.
    - No screen had a corner Cardmaker or a bubble.
    - Each title or group title had its Cardmaker, and both Shops summaries were visible.
- [x] 8.3 Stop every process on the project's ports with SIGINT to its process group, and let the emulators export. Verify: `lsof -nP -iTCP -sTCP:LISTEN` shows nothing on 5173, 4173, 8080, 9099, 4000, 4400, 4500, 9150 or 5002.

## 9. The hand, in the confirmation

- [x] 9.1 Move the DM's "Kimin için" select into `PackConfirmDialog` (design D12):
  - The dialog takes `choices` and `onOwnerChange`. For the DM, it renders the select under the description, resets the payment to the new hand's defaults on a change, and disables it while opening. A player keeps the read-only row.
  - `PackShop` no longer renders the select. It passes the profiles and writes `?for=` with `replace: true`.
  - Update both doc comments.

  Verify: `npm run typecheck` passes.
- [x] 9.2 Update `PackShopPage.test.tsx`:
  - the screen has no "Kimin için" select, for the DM or a player
  - the dialog's select starts at the link's hand, and at the first player who is not the DM without a link
  - picking Bora shows Bora's LP, and opens into Bora's hand
  - the next pack starts at Bora
  - picking the DM's own hand switches to the purse at the GP price
  - a player's dialog names their own hand, with no select

  Verify: the tests pass.
- [x] 9.3 Run `npm run check` and `npm run test:emulator`. Verify: both pass.

## Workflow follow-up

- Archive the change with `/opsx:archive` after the owner has reviewed it.
