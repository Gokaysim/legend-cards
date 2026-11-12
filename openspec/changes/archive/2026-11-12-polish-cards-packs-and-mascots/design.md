# Design

## Context

See proposal.md for why. What each part must do is in the delta specs: `card-images`, `card-zoom`, `app-shell` and `rules-page`. This is the current state that shapes the approach:

- **Backs.** `SpreadBack` (`src/features/art/spreadBack.ts`) is `neutral`, `cursed` or `set`, and `spreadBackUrl` turns it into a picture URL, `null` meaning the CSS back. `spreadBackOf(packType, setCode)` in `src/features/packs/catalog.ts` picks a pack's back. `OpenPackView` calls it, and `DrawDialog` passes `NEUTRAL_BACK` or `CURSED_BACK`. The Mechanic Packs' pictures are in the art manifest under `mechanic:<name>` (`art.packUrl`). They are 563×788, the cards' size.
- **The zoom view.**
  - `CardFace` owns `isZoomOpen` and renders `CardZoomDialog` from its magnifier, and the focus returns to the magnifier on close.
  - A face with `onOpen` (the hand) has a whole-face `<button>` under its controls. A picture face's picture box lets the pointer through to it.
  - `CardZoomDialog` uses `Dialog`, whose header always holds the `<h2>` title and the "✕ Kapat" button, and whose `closeOnBackdrop` closes on a press that starts and ends outside the dialog box.
- **Pack tiles.** `PackTile` shows the price on top in a group, the picture, and the name only for `hasNameOnTile` types. Its `aria-label` is `packTitle(def) + " aç"`.
- **The Cardmaker.**
  - `PageHeader` shows a `Mascot` by the title.
  - The shop screens use `useWideHover()` (hover and at least 64rem) to show `CornerCardmaker` instead. `useMediaQuery` is false where `matchMedia` is missing, as in jsdom.
  - `PackShopPage` also draws a group's Cardmaker by the group's title.
  - `useBlessedShock` draws its own `<img>` pair.
- **Unbuilt screens.** `Placeholder` (`src/components/ui/`) shows `PageHeader` and one muted line. `ElixirShopPage` already puts its Cardmaker in the corner on its own.
- **Kurallar.** `RulesContent` spans the full content width.

## Goals / Non-Goals

**Goals:**
- One place decides where a screen's Cardmaker goes (corner, title or nowhere), and every screen asks it.
- The double click cannot reach a face that did not see the first click. A dialog or a turned card that appears under the pointer never zooms by accident.
- The zoom view keeps the `Dialog` behavior that already works: top layer, Escape, the backdrop press rule, and nesting inside the card details.

**Non-Goals:**
- No change to the magnifier, its hover rule, or the zoom view without a picture.
- No new art. The Golden Pack keeps the neutral back, by the owner's choice.
- No change to the True Words screen, İşlem Logu, or the hand's Cardmaker (it has none).
- No change to the True Word zoom (`TrueWordZoomDialog`). The owner's request was about cards. Its `Dialog` keeps the default variant.

## Decisions

### D1. A Mechanic Pack's back is its pack picture

`SpreadBack` gets a fourth kind, `{ kind: 'pack'; packKey: string }`, and `spreadBackUrl` returns `art.packUrl(packKey)` for it. Without that picture it returns `null`, which is the neutral CSS back, the same fallback a set without a cardback has. `spreadBackOf` takes the pack record's `{ packType, setCode, mechanicPack }`, as `burstArtUrl` already does, and returns `{ kind: 'pack', packKey: 'mechanic:<name>' }` for a Mechanic Pack. Golden and random draws stay `NEUTRAL_BACK`. `FaceDownCard`'s tone stays `neutral` for this kind, so the CSS fallback looks as today.

- **Why a new kind and not `set`:** the key lives in the pack manifest, not the cardbacks, and naming it keeps `spreadBackUrl` a plain switch.
- **Alternative: the card's own set back, as v2.2.8 does.** The owner turned it down for random draws, and it would give a Blessed card away.

### D2. The double click is counted by the face itself

`CardFace` handles the double click from a click whose `detail` is 2. It zooms only if two things hold:
1. The same face saw the first press, which is recorded on `pointerdown` together with the press's `pointerType`.
2. That pointer was a `mouse`.

Then it sets `isZoomOpen`, as the magnifier does, and the focus returns to the magnifier on close. A click on the face's own controls (magnifier, ✎, the set symbol) is left out. They carry a `data-face-control` attribute, and the handler ignores a click inside one.

- **The narrow hand.** The first click opens `HoldingDialog`. The second press lands in the dialog, on another face, which never saw the first press. So nothing zooms.
- **The wide hand.** The face stays mounted when it becomes selected, so the second click zooms it.
- **A face-down card.** The first click turns it, and the face that appears never saw that press.
- **Alternative: React's `onDoubleClick`.** `dblclick` is dispatched to whatever lies under the second click, can be the new dialog's face, and carries no pointer type. It was rejected.
- **Alternative: delaying the single click.** The owner chose not to slow the hand down.

### D3. A bare variant of `Dialog`

`Dialog` gets `bare?: boolean`. A bare dialog has these differences:
- It has no header and no padding, and no surface of its own: transparent, no border.
- It is named by `aria-label={title}` instead of `aria-labelledby`.
- It leaves the close control to its content.

Everything else is shared: `showModal`, the `close` event filter, the backdrop press rule, and the backdrop color. `CardZoomDialog` uses it. The dialog box is sized to the card, so "outside the card" is the backdrop. The content is the picture with its cost badge, or the face without pictures, and a round "✕" button named "Kapat". The button is placed `fixed` in the window's top-right corner, inside the dialog, so it never covers the card and stays in the top layer. `Dialog` has no transform, so `fixed` keeps to the viewport.

- **Alternative: a separate `<dialog>` in `CardZoomDialog`.** It would duplicate the nesting and backdrop handling that the card details rely on.

### D4. Short names on group tiles

`catalog.ts` gets `packShortName(def)`:

| Pack type | Short name |
| --- | --- |
| Standard | Standart |
| Premium | Premium |
| Cursed | Cursed |
| Pandemonium | Pandemonium |
| Pandemonium Cursed | Cursed |
| Golden | Golden |
| Cursed Golden | Cursed Golden |

`PackTile` lays out its tiles in two ways:
- **The `group` variant:** picture (or glyph), short name, then price.
- **The `shop` variant (Mechanic Packs):** picture, then its full `packTitle`, with no price.

`hasNameOnTile` and its list go, because every tile now shows a name. The `aria-label` stays `packTitle(def) + " aç"`, and the confirmation and the log keep `packTitle`. "Standart" is the Turkish spelling the owner chose for the tile alone.

### D5. One hook places the Cardmaker

`src/lib/` gets `usePhoneWidth()`. It is true while `(width < 40rem)` matches, which is Tailwind's `sm`, so 640 px. Without `matchMedia` it is false, so tests and old browsers keep the Cardmaker.

Two guards use it, so every Cardmaker obeys it without each screen checking:
- `Mascot` renders nothing on a phone. This covers titles, pack groups and the corner.
- `useBlessedShock`'s `shock()` does nothing on a phone.

`PageHeader` gets `mascotPlacement?: 'title' | 'corner'`, which defaults to `title`. With `corner`, it calls `useWideHover()`:
- **When it is true:** it renders `<CornerCardmaker stem={mascot} />` instead of the title's `Mascot`.
- **Otherwise:** the title's `Mascot` stays.

These screens pass `corner`:
- Kart kütüphanesi
- Cursed Deck
- Kurallar
- the Shops screen
- `Placeholder`, which passes it for every unbuilt screen: Custom Card Draft, Veri / Yedek and the Elixir Shop

`ShopsPage` and `ElixirShopPage` drop their own `useWideHover` code. `PackShopPage` keeps its own logic, because an open group swaps the stem and size and draws the group's Cardmaker by the group's title.

- **Alternative: the same three lines repeated on every screen.** That is today's pattern for three screens. It would become seven copies, each able to forget the phone rule.

### D6. Kurallar's readable width

`RulesContent`'s sections get `max-w-[70ch]`. On a 1440 px window with the 16rem sidebar, the text ends about 600 px in. The corner Cardmaker (`min(430px, 39vw)`) then stands in the free space. On 1024–1280 px windows, she can still reach the text's right edge. There, the existing fade under the pointer or the focus applies.

### D7. The "Yakında" panel

The neutral CSS back is drawn in `FaceDownCard` today. Its look moves into `src/features/art/NeutralCardBack.tsx`, which both `FaceDownCard` and `Placeholder` use, so the "Yakında" card is the same back that random draws show.

`Placeholder` keeps `PageHeader` and its `actions`. The note line is replaced by a centered panel:
- the card, about 9rem wide and a little tilted
- "Yakında" with Tailwind's `uppercase`, `tracking-[0.35em]`, gold and extra-bold. It is written in mixed case, so screen readers say the word and do not spell it, and `lang="tr"` makes the uppercase "YAKINDA".
- an ornament row: two lines and a "✦"
- "Bu ekran henüz hazır değil." in small, muted text

Two new animations go into `theme.css`:
- `card-drift`: about 6 s, a few pixels up and down and a slight rotation, ease-in-out, infinite
- `back-glint`: a light band crossing the card every few seconds

Both are applied under `motion-safe:` only, so reduced motion shows a still card.

### D8. `docs/domain.md`

These parts are updated with the owner's choices of 2026-11-12:
- the back table and its "neutral back" deliberate decision: a Mechanic Pack now shows its pack picture, and the rule that a back never gives a card away still holds
- the Pack Shop tiles bullet: short names with the price under them
- the Cardmaker bullets: the corner on more screens, none on phones, no shocked pair on phones
- the deliberate decision "The Cardmaker stands in the corner only in the shops"

## Risks / Trade-offs

- **[Risk] The corner Cardmaker covers library cards on a 1024–1280 px window.**
  - She fades while the pointer is over her or the focus is under her, as in the shops.
  - A double click on a covered card still works, because she never takes the pointer.
- **[Risk] A trackpad "tap to click" reports `pointerType` `mouse`.**
  - That is the intended behavior for a laptop.
  - A pen counts as touch, so a double tap of a pen does not zoom.
- **[Risk] jsdom and the click count.**
  - Tests drive the double click with `user.dblClick`, which sends `pointerdown` with `pointerType: 'mouse'` and clicks with `detail` 1 and 2.
  - A touch double tap is driven with `pointerType: 'touch'`.
- **[Trade-off] The zoom view loses its text line.**
  - The set, cost and rarity are on the picture, or on the face without pictures, and in the card details.
  - Screen readers still get the card's name as the dialog's name, and the picture's alternative text.
- **[Trade-off] No Cardmaker on phones also removes the shocked pair there.** The Blessed card's pearl glow still marks the moment.
