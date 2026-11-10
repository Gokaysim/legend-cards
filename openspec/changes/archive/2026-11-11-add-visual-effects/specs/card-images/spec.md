# Spec Delta

## MODIFIED Requirements

### Requirement: Card faces with pictures
A card face with a picture SHALL show the picture, with the card's name as its alternative text, without a frame of its own: the picture's printed frame shows the card's kind. It SHALL write nothing about the card under it. The face SHALL keep its marks. The cost, name and text SHALL stay readable to screen readers. This SHALL hold in the library, the Cursed Deck, the hand, the card details, and the revealed cards of draws and packs.

#### Scenario: A card in the library
- **WHEN** a user looks at "Aboleth's Eyes" in the library's card view
- **THEN** its face shows its picture, with its printed purple frame, without a frame around it and with no text under it

#### Scenario: A card with a picture next to one without
- **WHEN** the Cursed Deck shows "Scorched Earth", which has no picture, next to "Visions of Death", which has one
- **THEN** "Scorched Earth" has its CSS face in a red frame, and "Visions of Death" shows only its picture
