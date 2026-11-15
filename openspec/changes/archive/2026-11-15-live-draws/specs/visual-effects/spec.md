# Spec Delta

## MODIFIED Requirements

### Requirement: The draw spread
In the draw dialog, the watching view of a draw (spec: live-draws) and the open pack view, the cards SHALL lie beside the deck or the pack as a fan: each card slightly turned, overlapping its neighbour, and about half as large again as a card in the hand's card view, or smaller where needed to fit. They SHALL fit the view's width, wrapping under the deck when it is narrow. The card under the pointer or the focus SHALL lift and come to the front. A card SHALL turn over in a soft turn of about two-thirds of a second. With reduced motion, the cards SHALL lie straight and SHALL NOT lift.

#### Scenario: Five drawn cards
- **WHEN** the DM draws 5 cards for Ayla on a desktop
- **THEN** the face-down cards lie in an overlapping fan beside the deck, and the card under the pointer lifts above its neighbours

#### Scenario: An open pack
- **WHEN** Ayla's Cursed Pack opens with 6 cards on a desktop
- **THEN** its cards lie in an overlapping fan beside the pack, within the view's width

#### Scenario: Reduced motion
- **WHEN** Ayla, whose device asks for reduced motion, draws 3 cards
- **THEN** the cards lie straight, side by side, and nothing lifts under the pointer

#### Scenario: Phone width
- **WHEN** the draw dialog with 5 drawn cards is shown 360 CSS pixels wide
- **THEN** every card fits the dialog, and the page has no horizontal scrollbar

## ADDED Requirements

### Requirement: The live mark
The draw dialog, the watching view, the open pack view and their banners SHALL mark a draw or a pack that is going on with a small green dot that pulses softly. Once it has ended, the mark SHALL go away. With reduced motion, the dot SHALL NOT pulse.

#### Scenario: A watching view
- **WHEN** Bora watches Ayla's open session
- **THEN** a pulsing green dot shows beside "Canlı"

#### Scenario: Reduced motion
- **WHEN** Bora, whose device asks for reduced motion, watches Ayla's session
- **THEN** the green dot shows without pulsing

### Requirement: A Cursed table
The table of a Cursed draw, in the draw dialog and in the watching view, SHALL take a deep red tint in place of the usual one, with the Cursed cardback on its deck.

#### Scenario: Watching a Cursed draw
- **WHEN** Ayla watches the DM draw a Cursed card into Bora's hand
- **THEN** the table is tinted red, and its deck shows the Cursed cardback
