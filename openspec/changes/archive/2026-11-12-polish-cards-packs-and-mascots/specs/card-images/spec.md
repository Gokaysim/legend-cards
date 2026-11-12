# Spec Delta

## ADDED Requirements

### Requirement: Short pack names in a group
Inside a group, the pack tiles SHALL be named "Standart", "Premium" and "Cursed" in a set's group, "Pandemonium" and "Cursed" in the Pandemonium group, and "Golden" and "Cursed Golden" in the Golden Packs group. Everywhere else, the pack keeps its full name, for example "Kesqerian Nights Standard Pack" in its confirmation and in the log.

#### Scenario: The Golden Packs
- **WHEN** a user opens the Golden Packs group
- **THEN** the tiles read "Golden" with "4 LP / 10.000 GP" under it and "Cursed Golden" with "3 LP / 7.500 GP" under it

#### Scenario: The confirmation
- **WHEN** Ayla selects the "Standart" tile of the Kesqerian Nights group
- **THEN** the confirmation names the pack "Kesqerian Nights Standard Pack"

## RENAMED Requirements

- FROM: `### Requirement: The Cardmaker in the shops' corner`
- TO: `### Requirement: The Cardmaker in the corner`

## MODIFIED Requirements

### Requirement: Cardbacks that give nothing away
Every face-down card of one spread SHALL show the same back:
- a Cursed draw, and a Cursed, Cursed Golden or Pandemonium Cursed Pack: the Cursed cardback
- a set's Standard, Premium or Pandemonium Pack: that set's cardback
- a Mechanic Pack: that Mechanic Pack's own picture, or the neutral back while it has none
- a random draw and a Golden Pack: the neutral back drawn without a picture

The back SHALL never depend on the card under it.

#### Scenario: A random draw
- **WHEN** Ayla draws a random card that turns out to be Blessed
- **THEN** its back is the neutral back, the same as for any other random draw

#### Scenario: A set pack
- **WHEN** a Kesqerian Nights Standard Pack opens
- **THEN** all its face-down cards show the Kesqerian Nights cardback

#### Scenario: A Cursed Pack
- **WHEN** a Kesqerian Nights Cursed Pack opens
- **THEN** all its face-down cards, the Cursed card included, show the Cursed cardback

#### Scenario: A Mechanic Pack
- **WHEN** a Blood & Battle Mechanic Pack opens, and one of its cards is Blessed
- **THEN** all its face-down cards, the Blessed card included, show the Blood & Battle pack picture

#### Scenario: A Mechanic Pack without a picture
- **WHEN** a Mechanic Pack opens whose pack picture is not built
- **THEN** all its face-down cards show the neutral back

#### Scenario: A Golden Pack
- **WHEN** a Golden Pack opens
- **THEN** all its face-down cards show the neutral back

### Requirement: Pack pictures in the shop
Each Pack Shop tile SHALL show the pack's picture across its width: a Mechanic Pack its mechanic's picture, the Golden and Cursed Golden Packs theirs, and a set's pack its own picture or else its set's cardback. A Mechanic Pack SHALL show its name under the picture and no price, because its price is in its section's heading. A pack inside a group SHALL show its short name under the picture and its price under the name. A tile without a picture SHALL show its glyph in the picture's place.

#### Scenario: A Mechanic Pack
- **WHEN** a user opens the Pack Shop
- **THEN** the Blood & Battle Mechanic Pack tile shows the Blood & Battle pack picture across its width and its name under it, with no price on the tile

#### Scenario: A set pack without its own picture
- **WHEN** a user opens the Kesqerian Nights group
- **THEN** its tiles show, in this order, the Kesqerian Nights cardback with "Standart" and "2 LP / 5.000 GP" under it, with "Premium" and "3 LP / 7.500 GP" under it, and with "Cursed" and "1 LP / 2.500 GP" under it

#### Scenario: The Pandemonium packs
- **WHEN** a user opens the Pandemonium group
- **THEN** its two tiles show the Pandemonium cardback, one with "Pandemonium" and the other with "Cursed" under it, each with "3 LP / 7.500 GP" under the name

#### Scenario: A pack without a picture
- **WHEN** the Kesqerian Nights group is shown where no pictures are built
- **THEN** each pack tile shows its glyph, its short name and its price

#### Scenario: A pack's name for screen readers
- **WHEN** a screen reader reaches the Kesqerian Nights Premium Pack tile
- **THEN** it reads the tile as "Kesqerian Nights Premium Pack aç"

### Requirement: The Cardmaker on screens
Each screen title SHALL show its Cardmaker picture, when there is one, as decoration without alternative text, unless the screen places her in the corner (see "The Cardmaker in the corner"):

| Screen | Cardmaker |
| --- | --- |
| Pack Shop | `cardmaker_shop` |
| Kart kütüphanesi | `cardmaker_lib` |
| Cursed Deck | `cardmaker_cursed` |
| True Words | `cardmaker_true` |
| İşlem Logu | `cardmaker_think` |
| Elixir Shop | `cardmaker_zaddir` |
| Kurallar | `cardmaker_wave` |
| Custom Card Draft | `cardmaker_custom` |
| Veri / Yedek | `cardmaker_peek` |

A screen whose Cardmaker has no picture SHALL show none. On a window narrower than 640 CSS pixels, no screen SHALL show a Cardmaker.

#### Scenario: The library
- **WHEN** a user opens the Kart kütüphanesi on a tablet 800 CSS pixels wide
- **THEN** the library's Cardmaker is shown next to its title

#### Scenario: The library on a phone
- **WHEN** a user opens the Kart kütüphanesi 360 CSS pixels wide
- **THEN** no Cardmaker is shown, next to the title or anywhere else

#### Scenario: A missing Cardmaker
- **WHEN** a user opens the Custom Card Draft on a tablet where `cardmaker_custom` has no picture
- **THEN** the title is shown without a picture

### Requirement: The Cardmaker of the pack groups
Each set group of the Pack Shop SHALL show its set's Cardmaker in place of the shop's, or the shop's while the set's has no picture. The Pandemonium group SHALL show `cardmaker_pandemonium`, and the Golden Packs group `cardmaker_gold`, larger. Like every Cardmaker, a group's Cardmaker SHALL NOT show on a window narrower than 640 CSS pixels.

#### Scenario: A set group
- **WHEN** a user opens the Ballad of Ulagal group on a tablet 800 CSS pixels wide
- **THEN** the Ulagal Cardmaker is shown with the group's title

#### Scenario: The Golden Packs on a desktop
- **WHEN** a user opens the Golden Packs group on a desktop window with a mouse
- **THEN** `cardmaker_gold` stands in the bottom-right corner, larger than the shop's Cardmaker there

#### Scenario: A set group on a phone
- **WHEN** a user opens the Ballad of Ulagal group 360 CSS pixels wide
- **THEN** no Cardmaker is shown, and the group's title and packs use the whole width

### Requirement: The shocked Cardmaker for a Blessed card
When a Blessed card is turned over in a draw or in an open pack, the shocked Cardmaker pair SHALL appear on both sides for about a second, on every device that sees it turn, except on a window narrower than 640 CSS pixels. A card that was already face up when the screen opened SHALL NOT start it. With reduced motion, the pair SHALL appear and disappear without movement.

#### Scenario: A Blessed card in a pack
- **WHEN** Ayla turns over a Blessed card in her open pack on a desktop while Bora watches on a tablet
- **THEN** both see the shocked Cardmaker pair for about a second

#### Scenario: Reopening a pack view
- **WHEN** Bora opens the pack view after the Blessed card was already turned
- **THEN** the shocked pair does not appear

#### Scenario: A phone
- **WHEN** Ayla turns over a Blessed card on a phone 360 CSS pixels wide
- **THEN** the shocked pair does not appear, and the card glows pearl white as before

### Requirement: The Cardmaker in the corner
On the shop screens (Shops, Pack Shop, Elixir Shop), the Kart kütüphanesi, the Cursed Deck, Kurallar, and the unbuilt screens, on a device with hover whose window is at least 1024 CSS pixels wide, the screen's Cardmaker SHALL stand fixed in the window's bottom-right corner instead of next to the title. She SHALL stay there while the page scrolls and SHALL never catch the pointer. She SHALL fade out while the pointer is over her, or the keyboard focus is on something under her.

#### Scenario: The Pack Shop on a desktop
- **WHEN** a user opens the Pack Shop on a 1280 CSS pixel wide window with a mouse and scrolls to the Mechanic Packs
- **THEN** `cardmaker_shop` stands in the bottom-right corner, and no Cardmaker is next to the title

#### Scenario: A pack under her
- **WHEN** the user moves the pointer over a Mechanic Pack that lies under the Cardmaker
- **THEN** the Cardmaker fades out, and selecting the pack opens its confirmation

#### Scenario: The keyboard under her
- **WHEN** a user tabs to the Risk & Reward Mechanic Pack while it lies under the Cardmaker
- **THEN** the Cardmaker fades out until the focus moves away from under her

#### Scenario: The library on a desktop
- **WHEN** a user opens the Kart kütüphanesi on a 1280 CSS pixel wide window with a mouse
- **THEN** `cardmaker_lib` stands in the bottom-right corner, no Cardmaker is next to the title, and a card under her makes her fade out when the pointer reaches it

#### Scenario: An unbuilt screen on a desktop
- **WHEN** a user opens Veri / Yedek on a 1280 CSS pixel wide window with a mouse
- **THEN** `cardmaker_peek` stands in the bottom-right corner

#### Scenario: A tablet
- **WHEN** a user opens the Pack Shop on a tablet 800 CSS pixels wide
- **THEN** `cardmaker_shop` is next to the title

#### Scenario: A phone
- **WHEN** a user opens the Pack Shop on a phone 360 CSS pixels wide
- **THEN** no Cardmaker is shown, in the corner or next to the title

#### Scenario: Another screen
- **WHEN** a user opens True Words on a 1280 CSS pixel wide window with a mouse
- **THEN** `cardmaker_true` is next to its title
