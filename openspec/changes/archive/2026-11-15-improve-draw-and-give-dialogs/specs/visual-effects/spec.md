# Spec Delta

## MODIFIED Requirements

### Requirement: The draw spread
In the draw dialog, the drawn cards SHALL lie beside the deck as a fan: each card slightly turned, overlapping its neighbour, and about half as large again as a card in the hand's card view. They SHALL fit the dialog's width, wrapping under the deck when the dialog is narrow. The card under the pointer or the focus SHALL lift and come to the front. A card SHALL turn over in a soft turn of about two-thirds of a second. With reduced motion, the cards SHALL lie straight and SHALL NOT lift.

#### Scenario: Five drawn cards
- **WHEN** the DM draws 5 cards for Ayla on a desktop
- **THEN** the face-down cards lie in an overlapping fan beside the deck, and the card under the pointer lifts above its neighbours

#### Scenario: Reduced motion
- **WHEN** Ayla, whose device asks for reduced motion, draws 3 cards
- **THEN** the cards lie straight, side by side, and nothing lifts under the pointer

#### Scenario: Phone width
- **WHEN** the draw dialog with 5 drawn cards is shown 360 CSS pixels wide
- **THEN** every card fits the dialog, and the page has no horizontal scrollbar
