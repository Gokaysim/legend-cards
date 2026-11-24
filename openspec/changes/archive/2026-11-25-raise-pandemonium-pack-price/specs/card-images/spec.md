# Spec Delta

## MODIFIED Requirements

### Requirement: Pack pictures in the shop
Each Pack Shop tile SHALL show the pack's picture across its width: a Mechanic Pack its mechanic's picture, the Golden and Cursed Golden Packs theirs, and a set's pack its set's cardback. A Mechanic Pack SHALL show its name under the picture and no price, because its price is in its section's heading. A pack inside a group SHALL show its short name under the picture and its price under the name. A tile without a picture SHALL show its glyph in the picture's place.

#### Scenario: A Mechanic Pack
- **WHEN** a user opens the Pack Shop
- **THEN** the Blood & Battle Mechanic Pack tile shows the Blood & Battle pack picture across its width and its name under it, with no price on the tile

#### Scenario: A set pack without its own picture
- **WHEN** a user opens the Kesqerian Nights group
- **THEN** its tiles show, in this order, the Kesqerian Nights cardback with "Standart" and "2 LP / 5.000 GP" under it, with "Premium" and "3 LP / 7.500 GP" under it, and with "Cursed" and "1 LP / 2.500 GP" under it

#### Scenario: The Pandemonium packs
- **WHEN** a user opens the Pandemonium group
- **THEN** its two tiles show the Pandemonium cardback, one with "Pandemonium" and "4 LP / 10.000 GP" under it, and the other with "Cursed" and "3 LP / 7.500 GP" under it

#### Scenario: A pack without a picture
- **WHEN** the Kesqerian Nights group is shown while the set has no cardback
- **THEN** each pack tile shows its glyph, its short name and its price

#### Scenario: A pack's name for screen readers
- **WHEN** a screen reader reaches the Kesqerian Nights Premium Pack tile
- **THEN** it reads the tile as "Kesqerian Nights Premium Pack aç"
