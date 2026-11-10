# Spec Delta

## MODIFIED Requirements

### Requirement: Card view
Both screens SHALL offer a card view that shows each listed card as a card face. The face SHALL show the cost, name, set, rarity, mechanic pack, and text. On a face with the card's picture, the set, rarity and mechanic pack SHALL show on hover or tap of the picture's set symbol. Its frame color, the printed one on a picture, SHALL show the card's kind: purple for Common, gold for Rare, white for Blessed, and red for Cursed. The Cursed Deck faces SHALL leave out set, rarity, and mechanic pack.

#### Scenario: Card view colors
- **WHEN** a user looks at a Common, a Rare, a Blessed, and a Cursed card without pictures in the card view
- **THEN** their frames are purple, gold, white, and red

#### Scenario: Card view with pictures
- **WHEN** a user looks at a Common and a Rare card with pictures in the card view
- **THEN** each shows its picture with its printed purple or gold frame, and no frame is drawn around the picture

#### Scenario: Phone width
- **WHEN** the card view is shown 360 CSS pixels wide
- **THEN** the card faces fit the width, and the page has no horizontal scrollbar
