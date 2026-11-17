# Spec Delta

## MODIFIED Requirements

### Requirement: The DM chooses the payment
When the DM opens a pack, the DM SHALL choose to charge the hand owner's LP or the party's GP. The amount SHALL start at the pack's price in that currency, and the DM SHALL be able to change it to any whole number from 0 to 1,000,000. 0 opens the pack for free. LP can be charged to any user's hand, a DM's included, and only from that hand's owner. An amount above the balance SHALL be refused, with a Turkish message naming the balance.

#### Scenario: The default amount
- **WHEN** the DM chooses to open a Golden Pack for Bora with GP
- **THEN** the amount starts at 10.000

#### Scenario: A changed amount
- **WHEN** the DM opens a Standard Pack for Bora, who has 4 LP, charging 1 LP
- **THEN** Bora has 3 LP

#### Scenario: A free opening
- **WHEN** the DM opens a pack for Bora with the amount 0
- **THEN** no balance changes, and the pack is recorded as free

#### Scenario: More than the purse
- **WHEN** the DM charges 7.500 GP while the party purse holds 5.000 GP
- **THEN** a Turkish message says that the purse holds 5.000 GP, and no pack opens

#### Scenario: A pack for the DM's own hand
- **WHEN** the DM, who has 3 LP, opens a Standard Pack into their own hand charging LP
- **THEN** the amount starts at 2, and after the opening the DM has 1 LP

#### Scenario: Another hand's LP
- **WHEN** the DM writes a pack opening into Bora's hand that charges Ayla's LP
- **THEN** the server denies it
