# Spec Delta

## MODIFIED Requirements

### Requirement: The price of a use
A use's price SHALL follow the card's cost in this hand: the DM's cost override when set, otherwise the card's own cost. A whole number SHALL cost exactly that many LP. No cost SHALL cost nothing. "d6" SHALL cost the die rolled at the table, which the user enters as a whole number from 1 to 6. Any other cost, such as "X", SHALL cost the whole number of LP the user enters, from 0 up. Cursed cards SHALL pay as other cards do.

#### Scenario: A whole number
- **WHEN** Ayla uses a card that costs "2"
- **THEN** the price is 2 LP

#### Scenario: A cost override
- **WHEN** the DM has set the cost of Ayla's 3-cost card to "1", and Ayla uses it
- **THEN** the price is 1 LP

#### Scenario: An X card with a number in the hand
- **WHEN** the DM has set the cost of Ayla's "Leon's Lanza", which costs "X", to "3", and Ayla uses it
- **THEN** she is not asked for an amount, the confirm control reads "Kullanımı onayla (3 LP)", and she pays 3 LP

#### Scenario: A d6 card with a number in the hand
- **WHEN** the DM has set the cost of Ayla's "Hran's Diligent Defence", which costs "d6", to "4", and Ayla uses it
- **THEN** she is not asked for the die, and she pays 4 LP

#### Scenario: A forged amount on an X card with a number in the hand
- **WHEN** the DM has set the cost of Ayla's "X" card to "3", and Ayla closes it as used, paying 2 LP
- **THEN** the server denies it

#### Scenario: A Blessed card
- **WHEN** Ayla uses a Blessed card, which has no cost
- **THEN** the card is used without a payment, and her LP does not change

#### Scenario: A d6 card
- **WHEN** Ayla uses "Hran's Diligent Defence", which costs "d6", and enters 4
- **THEN** she pays 4 LP

#### Scenario: A die out of range
- **WHEN** Ayla enters 0 or 7 for a "d6" card
- **THEN** she cannot confirm the use

#### Scenario: An X card
- **WHEN** Ayla uses "Leon's Lanza", which costs "X", and enters 3
- **THEN** she pays 3 LP

#### Scenario: X as 0
- **WHEN** Ayla enters 0 for an "X" card
- **THEN** the card is used without a payment

#### Scenario: A Cursed card
- **WHEN** Ayla uses the Cursed card "Visions of Death", which costs "1"
- **THEN** she pays 1 LP

#### Scenario: Other text as the cost
- **WHEN** the DM has set the cost of Ayla's card to "X+1", and Ayla uses it
- **THEN** she enters the amount she pays, as for "X"
