# Proposal

## Why

The owner compared the shop screens with v2.2.8 (2026-11-11) and asked for two things:
- the part under each pack should look as it does there
- the missing pictures should be there

Three things differ from v2.2.8 today:
- **Missing pictures.** The Set Packs groups and the Golden Packs group show a glyph (`♜`, `✦`). v2.2.8 shows the set's cardback and the Golden Pack picture, and those pictures are already built.
- **Small pictures.** Each pack's picture is held to 160 px, with the name and the price below it. v2.2.8 shows the price above a picture that fills the tile, and names only some packs.
- **No speech bubbles.** The Cardmaker never speaks. In v2.2.8, she stands fixed in the bottom-right corner, and a bubble tells what a Mechanic Pack, the Golden Packs or a shop holds. Earlier changes postponed the bubbles to "a later change". This is that change.

## What Changes

- **Group pictures.** In the Pack Shop's main view:
  - A set's group tile shows the picture of the set's first pack, or else the set's cardback.
  - The Golden Packs tile shows the Golden Pack picture.
  - The glyph stays only for a group without a picture. The group's name stays under the picture.
- **Pack tiles as in v2.2.8:**
  - The price is above the picture. Mechanic Packs have no price on the tile, because their price is in the section heading.
  - The picture fills the tile's width.
  - The pack's name is under the picture only for Mechanic, Golden, Cursed Golden, Pandemonium and Pandemonium Cursed Packs. v2.2.8 leaves the name off the Pandemonium Cursed Pack. The owner chose to show it, because the two Pandemonium packs share a picture and a price.
  - A set's Standard, Premium and Cursed Packs show no name. Their frame and price tell them apart, and screen readers still hear the name.
  - A tile without a picture keeps its glyph and its name.
  - A pack that cannot be opened still says why under the tile.
- **The Cardmaker in the corner.** On a device with a mouse and a window at least 1024 CSS pixels wide, the shop screens show their Cardmaker fixed in the bottom-right corner, as v2.2.8 does. Those screens are Shops, the Pack Shop with its groups, and the Elixir Shop.
  - The Golden Packs' Cardmaker is larger there.
  - She fades out while the pointer is over her, or the keyboard focus is on something under her. What lies under her stays readable and clickable.
  - On phones, tablets and narrow windows, she stays next to the title, as today.
  - The other screens do not change.
- **Speech bubbles.** Where the Cardmaker stands in the corner, a speech bubble opens at her left when the pointer or the keyboard focus rests on certain tiles for one second:
  - on the Shops screen, on "Pack Shop" and "Elixir Shop"
  - in the Pack Shop's main view, on each Mechanic Pack and on the Golden Packs tile
  - It shows the tile's name, what it holds, and the Cardmaker's line, in v2.2.8's Turkish words. It closes when the pointer or the focus leaves.
  - There are no bubbles inside a group, as in v2.2.8.
- **Shops screen Cardmaker.** The Shops screen shows `cardmaker_shop` until `cardmaker_keep` exists. The owner chose this, because the archives have no `cardmaker_keep` and the shop lines are hers.
- **Descriptions without a bubble:**
  - The Shops screen keeps each shop's description in its tile on phones, tablets and narrow windows. Where the bubble shows, the description moves into it, as in v2.2.8.
  - A Mechanic Pack's and the Golden Pack's description is also shown in its confirmation dialog, above the payment, on every device. A player then sees what a pack holds before paying.
- **The DM picks the hand in the confirmation.** The owner asked on 2026-11-11 for the "Kimin için" select to move from the top of the Pack Shop into the pack's confirmation dialog. It starts at the hand the link names, or else at the first player who is not the DM. The next pack starts at the DM's last choice.

Out of scope:
- Moving the Cardmaker to the corner on the other screens.
- A `cardmaker_keep` picture. It is not in the archives. When the owner adds it, `npm run build-art` picks it up and it replaces the stand-in.
- The Elixir Shop itself. Its screen is still a placeholder, and only its Cardmaker moves.
- v2.2.8's "5000 GP" spelling. Prices keep the spec's "5.000 GP".

## Capabilities

### New Capabilities
- `cardmaker-speech`: the Cardmaker's speech bubbles. It covers which tiles make her speak, what a bubble says, when it opens and closes, and the devices it shows on.

### Modified Capabilities
- `card-images`:
  - "Pack pictures in the shop": the price is above the picture, which fills the tile. The name stays only on the listed packs. The group tiles now have pictures.
  - "The Cardmaker on screens": the "missing Cardmaker" example moves to the Custom Card Draft.
  - A new requirement, "The Shops screen's Cardmaker": `cardmaker_keep`, or `cardmaker_shop` while `cardmaker_keep` has no picture.
  - "The Cardmaker of the pack groups": a group's Cardmaker stands in the corner there too, and the Golden Packs' one is larger.
- `visual-effects`: "Premium and Cursed pack tiles" says that the tiles keep their names and prices. It now says that they keep their prices, and names as `card-images` lists them.
- `pack-shop`:
  - A new requirement, "What a pack holds, before paying": the confirmation dialog shows a Mechanic Pack's or the Golden Pack's description.
  - "Who a pack is for": the DM chooses the hand in the confirmation, and the screen has no hand picker of its own.

## Impact

- **New code:**
  - `src/lib/useWideHover.ts`: whether the device has hover and the window is at least 1024 CSS pixels wide, live
  - `src/features/art/CornerCardmaker.tsx`: the fixed Cardmaker, which fades under the pointer, and its bubble
  - `src/features/art/cardmakerSpeech.ts` and `src/features/art/CardmakerSpeechProvider.tsx`: the bubble's state and the one-second delay, shared by a screen's tiles and its corner
  - `src/features/packs/packLines.ts`: v2.2.8's descriptions and lines of the Mechanic Packs and the Golden Packs
- **Changed code:**
  - `src/features/packs/PackTile.tsx`: price on top, a full-width picture, and the name only where listed
  - `src/features/packs/PackShopPage.tsx`: group pictures, the corner Cardmaker, and the bubble's triggers
  - `src/features/packs/PackConfirmDialog.tsx`: the pack's description
  - `src/features/shops/ShopsPage.tsx`, `src/features/shops/ElixirShopPage.tsx`: the corner Cardmaker, the stand-in Cardmaker, the bubble and the description
  - `src/features/packs/catalog.ts`: which pack types keep their name on the tile
  - `src/app/screens.ts`: each shop's line next to its summary
  - `src/styles/effects.css`: the bubble's tail
  - `src/styles/theme.css` and `src/styles/theme.test.ts`: the bubble's cream surface and its ink, with contrast checks
- **Tests:**
  - unit tests for the tiles, the group pictures, the dialog's description, the hook, the corner and the bubble's delay
  - the existing Pack Shop and Shops tests where a name or a summary moves
  - a manual check in Chrome at desktop width and at 360 px
- **Docs:** `docs/domain.md`, Pictures: the tiles, the corner Cardmaker and the bubbles.
- **Data and rules:** none. No Firestore path or rule changes.
- **Dependencies:** none new.
