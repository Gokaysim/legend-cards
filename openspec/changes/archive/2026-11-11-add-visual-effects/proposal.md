# Proposal

## Why

The legacy app v2.2.8 makes its cards feel physical:
- The cards tilt toward the pointer and catch the light.
- The hand and the library lie as a slightly uneven deck.
- Active, held and revealed cards glow in their kind's color.
- An opening pack swells and bursts in a flash of light.

The new app has only the flip, a plain CSS burst and the shocked Cardmaker. The owner noticed that these effects are missing (2026-11-10) and asked for all of them.

## What Changes

- **Frameless picture faces.** A card face with a picture no longer has the kind's CSS border. The picture's own printed frame already shows the kind. A face without a picture keeps its colored border. The owner chose this on 2026-11-10, as in v2.2.8. The marks ("● Aktif", "Ek kopya", "Elde: …") stay, so a state never rests on color alone.
- **Tilt and glint.** In the card views of the hand, the library and the Cursed Deck, a card under a mouse pointer tilts toward it by a few degrees. It grows very slightly, brightens a little, and a soft light follows the pointer across it. Touch, a pressed pen, and reduced motion leave the card still.
- **A physical deck.** These card views lay the cards out as a deck:
  - The cards are larger, up to 235 px wide.
  - They overlap a little when that fits more cards into a row.
  - Every few cards sit at a slight angle, under half a degree.
  - The card under the pointer or the focus comes to the front.
  - On a device without hover, the cards do not overlap, so every magnifier stays reachable.
  - With reduced motion, the cards sit straight.
- **State glows:**
  - In the hand, an active card glows green. An active Cursed card glows red, and an active Blessed card pearl white.
  - In the library, a card someone holds glows soft gold.
  - In an open pack, the selected or chosen card glows gold in place of today's ring.
- **Kind glow on a revealed card.** In a draw and in an open pack, a face-up Rare card glows orange, a Cursed card red, and a Blessed card pearl white. A Common card has only a drop shadow.
- **The draw spread.** The drawn cards are larger, as in v2.2.8, and overlap slightly. The card under the pointer or the focus lifts and comes to the front. The flip slows to v2.2.8's softer 0.68-second turn.
- **The pack burst in full.** Today a CSS glyph swells and fades. Instead, the opening animation shows the pack's own art:
  - a set's pack shows its cardback, and the other packs their pack picture, with the CSS glyph as fallback
  - it swells in three pulses that grow brighter, inside a halo of light
  - the screen flashes warm white at the end
  - it runs for about 2.85 seconds, as in v2.2.8
- **Pack tiles:**
  - A set's Premium Pack has a gold ridged frame, a "✦" corner and a slow shimmer.
  - The Cursed, Cursed Golden and Pandemonium Cursed Packs have a red ridged frame and a "☠" corner.
  - A pack that can be opened lifts and brightens under the pointer. One that cannot is greyed out.
- **True Words:**
  - An active word's tile glows purple.
  - A tile that opens something lifts under the pointer.
  - Active True Words in the hand summary get a purple text glow.
- **Smaller touches:**
  - The two shop choices lift under the pointer.
  - The Cardmaker pictures get a soft drop shadow.
- **Reduced motion everywhere.** Under `prefers-reduced-motion`, every effect that moves stops: the tilt, the lifts, the shimmer, the angles and the burst. The flip switches at once. The glows stay, because they do not move.

Out of scope:
- **The hover preview.** It was left out on purpose in `add-card-images`, and the magnifier from `add-card-zoom` covers it.
- **The Cardmaker's speech bubbles** in the shops. They are a later change.
- **The pack tearing animation.** v2.2.8 itself replaced it with the burst.
- **The library's zoom slider and the True Words strip beside the hand.** These are layout features, not effects.
- **Elixir and Custom Card effects.** Their screens are not built yet. Each brings its own effects.
- **A selection glow in the hand and the library.** In the new app, selecting a hand card opens a dialog, and a library card has no selected state.

## Capabilities

### New Capabilities
- `visual-effects`: the decorative light and motion of cards, packs and tiles. It covers:
  - the tilt and glint
  - the deck layout and its angles
  - the state glows and the kind glow on revealed cards
  - the draw spread
  - the pack tiles' frames and shimmer
  - the hover lifts and the True Word glows
  - the reduced-motion rule for all of them

  A visual effect is not a card effect (the card's text).

### Modified Capabilities
- `card-images`: "Card faces with pictures" says that the picture sits "inside its kind's frame color". It now says that a face with a picture has no CSS frame, and the picture's printed frame shows the kind.
- `card-library`: "Card view" says that the frame color shows the card's kind. It now holds for a face without a picture. A face with a picture shows the kind through its picture.
- `pack-shop`: "Opening animation" now names what swells and bursts: the set's cardback or the pack's picture. It also adds the brightening, the halo and the closing flash.

## Impact

- **New code:**
  - `src/features/cards/useCardTilt.ts`, the pointer tilt
  - `src/features/cards/useDeckLayout.ts`, the deck's card width and overlap
  - `src/styles/effects.css`, the effects that need pseudo-elements or CSS variables:
    - the glint
    - the pack tiles' frames and shimmer
    - the burst's halo and flash
- **Changed code:**
  - `src/styles/theme.css`: the glow drop-shadow tokens, the burst and shimmer keyframes, and the flip's timing
  - `src/features/cards/CardFace.tsx`: frameless picture faces, the tilt, the glow
  - `src/features/hands/HandView.tsx` and `src/features/cards/CardBrowser.tsx`: the deck layout
  - `src/features/draws/FaceDownCard.tsx` and `src/features/draws/DrawDialog.tsx`: the kind glow, the spread, the flip timing
  - `src/features/packs/OpenPackView.tsx`: the burst with its art, and the gold glow
  - `src/features/packs/PackTile.tsx` and `src/features/packs/PackShopPage.tsx`: the frames, the shimmer, the lift, the greyed-out look
  - `src/features/true-words/TrueWordTile.tsx`, `src/features/true-words/HandTrueWords.tsx` and `src/features/hands/HandSummary.tsx`: the True Word glows and lifts
  - `src/features/shops/ShopsPage.tsx` and `src/features/art/Mascot.tsx`: the lift and the shadow
- **Tests:**
  - unit tests for the tilt hook and the deck layout
  - unit tests for the glow and kind attributes on faces, the burst's art, and the pack tile decoration
  - the card face and card view tests that look for the frame
  - a manual check in Chrome, at desktop width and at 360 px
- **Docs:**
  - `docs/domain.md`: the frameless faces, and "visual effect" in the glossary
  - `docs/conventions.md`: where effect CSS lives, and the reduced-motion rule
- **Data and rules:** none. No Firestore path or rule changes.
- **Dependencies:** none new.
