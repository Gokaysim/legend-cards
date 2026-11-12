# Proposal

## Why

The owner went through the app after the v2.2.8 alignment and asked for six polish items. Each one is small, but together they change how cards, packs and the Cardmaker feel on every screen:

- A Mechanic Pack opens on the plain neutral back, while every set pack shows a picture back.
- Zooming a card needs the small magnifier, and the zoom view repeats information that the picture already shows.
- A set's three pack tiles show no names.
- The Cardmaker stands in the corner only in the shops.
- On a phone, the Cardmaker takes room from the cards.
- Unbuilt screens show a bare line of text.

## What Changes

- **Mechanic Pack backs.** The face-down cards of an open Mechanic Pack show that pack's own picture as their back, or the neutral back while it has none. A random draw and a Golden Pack keep the neutral back. Every card of one spread still shows the same back, chosen by the spread, so no back gives a card away.
- **Double click to zoom.** A double click with a mouse on a card face opens its zoom view. The magnifier stays as it is, for touch screens, the keyboard and the hand on a narrower window. There, the first click opens the card details dialog.
- **A bare zoom view.** The zoom view shows only the card: the picture, or the face without pictures, and a hand cost badge when the hand changes the cost. A small round "✕" button closes it. The title, the "set · Cost · rarity" line and the "✕ Kapat" text button are removed. The view keeps the card's name for screen readers.
- **Named pack tiles.** Inside a group, every pack tile shows its picture, then a short name, then its price under the name:
  - in a set group, "Standart", "Premium" and "Cursed"
  - in the Pandemonium group, "Pandemonium" and "Cursed"
  - in the Golden Packs group, "Golden" and "Cursed Golden"

  The price leaves its place above the picture. Screen readers still hear the full pack name.
- **The Cardmaker in the corner on more screens.** On a wide window with a mouse, the Cardmaker stands in the bottom-right corner, as she does in the shops, on these screens too:
  - Kart kütüphanesi
  - Cursed Deck
  - Kurallar
  - the unbuilt screens (Custom Card Draft, Veri / Yedek)

  The Kurallar text gets a readable width, so she stands beside it. True Words and İşlem Logu keep her next to the title.
- **No Cardmaker on phones.** On a window narrower than 640 CSS pixels, no Cardmaker is shown anywhere. This covers the screens' titles, the pack groups, and the shocked pair for a Blessed card. Tablets and narrow desktop windows keep her next to the title.
- **A styled "Yakında" screen.** An unbuilt screen keeps its title row. Under it, it shows a neutral card back drifting slowly, "YAKINDA" in gold with an ornament line, and "Bu ekran henüz hazır değil." in small, muted text. Under reduced motion, the card stays still.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-images`: the Mechanic Pack's back; named group tiles with the price under the name; the Cardmaker's corner on more screens and none on phones, for the shocked pair as well.
- `card-zoom`: a double click opens the zoom view; the view shows only the card, the hand cost badge, and a small close button.
- `app-shell`: the unbuilt screens' "Yakında" look.
- `rules-page`: the Cardmaker's place on Kurallar and the text's readable width.

## Impact

- **Code:**
  - `src/features/art/spreadBack.ts`, `src/features/packs/catalog.ts` (`spreadBackOf`) and `OpenPackView.tsx`
  - `src/features/cards/CardFace.tsx` and `CardZoomDialog.tsx`, `src/components/ui/Dialog.tsx` (a variant without the header)
  - `src/features/draws/FaceDownCard.tsx`, so a turning double click does not zoom
  - `src/features/packs/PackTile.tsx` and `catalog.ts` (the short names)
  - `PageHeader`, `Placeholder`, `LibraryPage`, `CursedDeckPage`, `RulesPage`, `CustomDraftPage`, `SettingsPage`, `PackShopPage`, `useBlessedShock`
  - a hook for the phone width
- **Tests:** unit tests for each of the above. No Firestore, rules or emulator change.
- **Docs:**
  - `docs/domain.md`: the back table, the "Deliberate decisions" on the neutral back and on the Cardmaker's corner, and the Pack Shop tiles and Cardmaker bullets
- **Data and art:** none. The Mechanic Packs' pictures already have the cards' 563×788 size.
