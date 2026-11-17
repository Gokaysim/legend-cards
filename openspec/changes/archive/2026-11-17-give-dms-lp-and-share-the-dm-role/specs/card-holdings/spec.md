# Spec Delta

## MODIFIED Requirements

### Requirement: The DM chooses the amount of a use
When the DM uses a card in any hand, a DM's own included, the amount SHALL start at the price, or be empty when the user enters the price. The DM SHALL be able to set any whole number from 0 to the holder's LP. The amount SHALL be taken from the holder's LP, and with 0 the card SHALL be used for free.

#### Scenario: The DM charges the price
- **WHEN** the DM uses Ayla's 2-cost card and keeps the amount 2
- **THEN** Ayla's LP drops by 2, and the ledger records the DM as the one who made the change

#### Scenario: A free use by the DM
- **WHEN** the DM uses Ayla's 3-cost card with the amount 0
- **THEN** the card leaves her hand, and her LP does not change

#### Scenario: More than the player has
- **WHEN** the DM enters 6 for Ayla's card while Ayla has 5 LP
- **THEN** the DM cannot confirm the use

#### Scenario: An X card for the DM
- **WHEN** the DM opens the use step of Ayla's "X" card
- **THEN** the amount is empty, and the DM must enter one to confirm

#### Scenario: The DM's own hand
- **WHEN** the DM, who has 4 LP, uses a 2-cost card in the DM's own hand and keeps the amount 2
- **THEN** the DM's LP drops to 2, recorded as a card use payment

#### Scenario: The DM's own hand for free
- **WHEN** the DM, who has 0 LP, uses a 3-cost card in the DM's own hand
- **THEN** the amount can only be 0, and the card is used without a payment
