# Spec Delta

## MODIFIED Requirements

### Requirement: Pack pictures in the shop
Each Pack Shop tile SHALL show the pack's picture across its width: a Mechanic Pack its mechanic's picture, the Golden and Cursed Golden Packs theirs, and a set's pack its own picture or else its set's cardback. The price SHALL be above the picture, except on a Mechanic Pack, whose price is in its section's heading. Only Mechanic, Golden, Cursed Golden, Pandemonium and Pandemonium Cursed Packs, and packs without a picture, SHALL show their name under it.

#### Scenario: A Mechanic Pack
- **WHEN** a user opens the Pack Shop
- **THEN** the Blood & Battle Mechanic Pack tile shows the Blood & Battle pack picture across its width and its name under it, with no price on the tile

#### Scenario: A set pack without its own picture
- **WHEN** a user opens the Kesqerian Nights group
- **THEN** its Standard, Premium and Cursed Pack tiles show their prices above the Kesqerian Nights cardback, and no name under it

#### Scenario: The Pandemonium packs
- **WHEN** a user opens the Pandemonium group
- **THEN** the Pandemonium Pack and the Pandemonium Cursed Pack each show "3 LP / 7.500 GP" above the Pandemonium cardback and their names under it

#### Scenario: A pack without a picture
- **WHEN** the Kesqerian Nights group is shown where no pictures are built
- **THEN** each pack tile shows its price, its glyph and its name

#### Scenario: A pack's name for screen readers
- **WHEN** a screen reader reaches the Kesqerian Nights Premium Pack tile
- **THEN** it reads the tile as "Kesqerian Nights Premium Pack aç"

### Requirement: The Cardmaker on screens
Each screen title SHALL show its Cardmaker picture, when there is one, as decoration without alternative text:

| Screen | Cardmaker |
| --- | --- |
| Pack Shop | `cardmaker_shop` |
| Kart kütüphanesi | `cardmaker_lib` |
| Cursed Deck | `cardmaker_cursed` |
| True Words | `cardmaker_true` |
| İşlem Logu | `cardmaker_think` |
| Elixir Shop | `cardmaker_zaddir` |
| Kurallar | `cardmaker_wave` |
| Veri / Yedek | `cardmaker_peek` |

A screen whose Cardmaker has no picture SHALL show none.

#### Scenario: The library
- **WHEN** a user opens the Kart kütüphanesi
- **THEN** the library's Cardmaker is shown next to its title

#### Scenario: A missing Cardmaker
- **WHEN** a user opens the Custom Card Draft, whose Cardmaker has no picture
- **THEN** the title is shown without a picture

### Requirement: The Cardmaker of the pack groups
Each set group of the Pack Shop SHALL show its set's Cardmaker in place of the shop's, or the shop's while the set's has no picture. The Pandemonium group SHALL show `cardmaker_pandemonium`, and the Golden Packs group `cardmaker_gold`, larger.

#### Scenario: A set group
- **WHEN** a user opens the Ballad of Ulagal group on a phone
- **THEN** the Ulagal Cardmaker is shown with the group's title

#### Scenario: The Golden Packs on a desktop
- **WHEN** a user opens the Golden Packs group on a desktop window with a mouse
- **THEN** `cardmaker_gold` stands in the bottom-right corner, larger than the shop's Cardmaker there

## ADDED Requirements

### Requirement: Pictures of the pack groups
In the Pack Shop's main view, each set's group tile SHALL show the picture of its first pack, or else its set's cardback. The Golden Packs tile SHALL show the Golden Pack's picture. The group's name SHALL be under the picture. A group without a picture SHALL keep its glyph and its name.

#### Scenario: The Set Packs
- **WHEN** a user opens the Pack Shop
- **THEN** the "Kesqerian Nights Packs" tile shows the Kesqerian Nights cardback with "Kesqerian Nights Packs" under it

#### Scenario: The Golden Packs
- **WHEN** a user opens the Pack Shop
- **THEN** the "Golden Packs" tile shows the Golden Pack picture with "Golden Packs" under it

#### Scenario: No pictures built
- **WHEN** the Pack Shop is shown where no pictures are built
- **THEN** each set's group shows "♜" with its name, and the Golden Packs "✦" with its name

### Requirement: The Cardmaker in the shops' corner
On the Shops, Pack Shop and Elixir Shop screens, on a device with hover whose window is at least 1024 CSS pixels wide, the screen's Cardmaker SHALL stand fixed in the window's bottom-right corner instead of next to the title. She SHALL stay there while the page scrolls. She SHALL never catch the pointer. She SHALL fade out while the pointer is over her, or the keyboard focus is on something under her. Elsewhere she SHALL stay next to the title.

#### Scenario: The Pack Shop on a desktop
- **WHEN** a user opens the Pack Shop on a 1280 CSS pixel wide window with a mouse and scrolls to the Mechanic Packs
- **THEN** `cardmaker_shop` stands in the bottom-right corner, and no Cardmaker is next to the title

#### Scenario: A pack under her
- **WHEN** the user moves the pointer over a Mechanic Pack that lies under the Cardmaker
- **THEN** the Cardmaker fades out, and selecting the pack opens its confirmation

#### Scenario: The keyboard under her
- **WHEN** a user tabs to the Risk & Reward Mechanic Pack while it lies under the Cardmaker
- **THEN** the Cardmaker fades out until the focus moves away from under her

#### Scenario: A phone
- **WHEN** a user opens the Pack Shop on a phone
- **THEN** `cardmaker_shop` is next to the title

#### Scenario: Another screen
- **WHEN** a user opens the Kart kütüphanesi on a 1280 CSS pixel wide window with a mouse
- **THEN** the library's Cardmaker is next to its title

### Requirement: The Shops screen's Cardmaker
The Shops screen's Cardmaker SHALL be `cardmaker_keep`, or the Pack Shop's `cardmaker_shop` while `cardmaker_keep` has no picture.

#### Scenario: The Shops screen
- **WHEN** a user opens the Shops screen
- **THEN** `cardmaker_keep` is shown

#### Scenario: The Shops screen without its own picture
- **WHEN** a user opens the Shops screen while `cardmaker_keep` has no picture
- **THEN** the Pack Shop's Cardmaker is shown
