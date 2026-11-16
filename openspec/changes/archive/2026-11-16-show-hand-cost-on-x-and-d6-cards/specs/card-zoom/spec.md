# Spec Delta

## MODIFIED Requirements

### Requirement: Hand cost in the zoom view
When the zoom view is opened from a hand where the card's cost differs from its own cost, the picture SHALL show the same hand cost badge as the card's face in the hand, marked lower or higher, or left unmarked, in the same way.

#### Scenario: A cheaper card
- **WHEN** the DM has set the cost of Ayla's 3-cost card to "1", and Ayla zooms it from her hand
- **THEN** the picture shows a badge "1" marked as lower

#### Scenario: An X card with a number
- **WHEN** the DM has set the cost of Ayla's "Leon's Lanza", which costs "X", to "3", and Ayla zooms it from her hand
- **THEN** the picture shows an unmarked badge "3"

#### Scenario: The same card in the library
- **WHEN** a user zooms that card from the library
- **THEN** the picture has no badge
