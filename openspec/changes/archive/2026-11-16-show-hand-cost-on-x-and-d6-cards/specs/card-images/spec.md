# Spec Delta

## MODIFIED Requirements

### Requirement: Hand cost on a picture
When a card's cost in a hand differs from its own cost, its face with a picture SHALL show the hand cost as a badge on the picture's cost corner. Two numbers SHALL differ by value, and other costs as text without surrounding spaces or letter case. The badge SHALL be marked lower or higher when both costs are numbers, and otherwise SHALL show unmarked in the neutral look of the badge on a face without a picture. Either way, its title and screen reader text SHALL name the card's own cost.

#### Scenario: A cheaper card
- **WHEN** the DM sets the cost of Ayla's 3-cost card with a picture to "1"
- **THEN** the face shows a badge "1" on the picture, marked as lower

#### Scenario: An X card with a number
- **WHEN** the DM sets the cost of Ayla's "Leon's Lanza", which costs "X" and has a picture, to "3"
- **THEN** the face shows a badge "3" on the picture, neither green nor red, and a screen reader hears its cost as 3 with "temel cost: X"

#### Scenario: A d6 card with a number
- **WHEN** the DM sets the cost of Ayla's "Hran's Diligent Defence", which costs "d6" and has a picture, to "4"
- **THEN** the face shows an unmarked badge "4" on the picture

#### Scenario: A number card given an X
- **WHEN** the DM sets the cost of Ayla's 3-cost card with a picture to "X"
- **THEN** the face shows an unmarked badge "X" on the picture

#### Scenario: The same cost written another way
- **WHEN** the DM sets the cost of Ayla's 3-cost card with a picture to "3,0", or the cost of her "d6" card to "D6"
- **THEN** the face shows no badge on the picture
