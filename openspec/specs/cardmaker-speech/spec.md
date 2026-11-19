# cardmaker-speech Specification

## Purpose

The Cardmaker's speech bubbles in the shops, following the legacy app v2.2.8. Resting on a shop or a pack makes her say what it holds and add a line of her own.

## Requirements

### Requirement: Where the Cardmaker speaks
The Cardmaker SHALL speak only where she stands in the bottom-right corner (spec: card-images), and only while she is not gone after the pointer reached her. These tiles make her speak:
- on the Shops screen: "Pack Shop" and "Elixir Shop"
- in the Pack Shop's main view: each Mechanic Pack that has a line, and the Golden Packs tile

Nothing else SHALL make her speak. The bubble opens at her left, near the bottom of the window.

#### Scenario: A Mechanic Pack
- **WHEN** a user on a desktop window with a mouse rests the pointer on the Blood & Battle Mechanic Pack
- **THEN** a speech bubble opens at the left of the Cardmaker in the bottom-right corner

#### Scenario: Inside a group
- **WHEN** a user on a desktop window with a mouse rests the pointer on the Kesqerian Nights Premium Pack
- **THEN** no bubble opens

#### Scenario: A phone
- **WHEN** a user touches the Blood & Battle Mechanic Pack on a phone
- **THEN** no bubble opens, and the pack's confirmation opens as before

#### Scenario: After she went
- **WHEN** the pointer made the Cardmaker go in the Pack Shop, and the user rests the pointer on the Blood & Battle Mechanic Pack
- **THEN** no bubble opens

### Requirement: What a bubble says
A bubble SHALL show three lines in v2.2.8's Turkish words:
- the tile's name
- what it holds
- the Cardmaker's own line

It SHALL keep the line breaks of her words. Obvious typos SHALL be fixed. Her voice SHALL stay as written.

#### Scenario: Blood & Battle
- **WHEN** the bubble opens for the Blood & Battle Mechanic Pack
- **THEN** it shows "Blood & Battle Mechanic Pack", "Combat etkileri, saldırı ve hasar zarlarıyla ilgili kartları içerir." and the Cardmaker's line that starts "Aman dikkat et kendine evladım."

#### Scenario: The Pack Shop on the Shops screen
- **WHEN** the bubble opens for "Pack Shop" on the Shops screen
- **THEN** it shows "Pack Shop", "Spesifik bir set veya mekanikten 5 kart gör, birini seç." and the Cardmaker's line that starts "Yavrum benim kartlar ne ara böyle karaborsaya düşmüş?"

#### Scenario: The Golden Packs
- **WHEN** the bubble opens for the Golden Packs tile
- **THEN** it shows "Golden Packs", "Sadece Rare kartlar ve Blessed kartlar içerir." and "Yavrum sandığa dikkat yalnız, bazen ısırabilir..."

### Requirement: When a bubble opens and closes
A bubble SHALL open after the mouse pointer or the keyboard focus has rested on a speaking tile for one second. It SHALL close as soon as the pointer or the focus leaves that tile, or the screen changes. Moving to another tile SHALL close the bubble and start the second again. A touch SHALL never open a bubble.

#### Scenario: Passing over a tile
- **WHEN** a user moves the mouse across the Arcanus Divine Mechanic Pack in less than a second
- **THEN** no bubble opens

#### Scenario: The keyboard
- **WHEN** a user tabs to the Golden Packs tile and waits a second
- **THEN** the Golden Packs bubble opens, and it closes when the focus moves on

#### Scenario: From one pack to the next
- **WHEN** the Blood & Battle bubble is open and the user moves the pointer onto the Horn of Plenty Mechanic Pack
- **THEN** the Blood & Battle bubble closes at once, and after a second the Horn of Plenty bubble opens

### Requirement: A bubble hides nothing
A bubble SHALL never catch the pointer: whatever lies under it can still be selected. What it holds SHALL be readable without it:
- Each shop's description SHALL stay in its tile wherever no bubble can open. It SHALL be the tile's description for screen readers everywhere.
- A pack's description SHALL be in its confirmation dialog (spec: pack-shop).

With reduced motion, a bubble SHALL appear and disappear without moving.

#### Scenario: The Shops screen on a phone
- **WHEN** a user opens the Shops screen on a phone
- **THEN** the "Pack Shop" tile shows "Spesifik bir set veya mekanikten 5 kart gör, birini seç."

#### Scenario: Selecting under a bubble
- **WHEN** the Blood & Battle bubble covers part of the Legends of Old Mechanic Pack, and the user clicks that part
- **THEN** the Legends of Old Mechanic Pack's confirmation opens
