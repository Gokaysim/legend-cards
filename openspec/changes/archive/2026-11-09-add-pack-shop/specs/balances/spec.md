# Spec Delta

## MODIFIED Requirements

### Requirement: The DM changes balances by hand
The DM SHALL be able to add a positive whole amount to, or subtract one from, any player's LP and the party purse. A single change SHALL be at most 1,000,000. Players SHALL NOT be able to change any balance, not even their own. The exceptions are a player's own LP, which drops by 1 when they pay for a draw, as the card-draws rules allow, and by the pack's price when they pay for their own pack, and the payments and refunds of packs, as the pack-shop rules allow.

#### Scenario: The DM adds LP
- **WHEN** the DM adds 2 LP to Ayla, who has 5 LP
- **THEN** Ayla has 7 LP on every device

#### Scenario: The DM subtracts GP
- **WHEN** the DM subtracts 2,500 GP from a party purse of 12,500 GP
- **THEN** the party purse is 10,000 GP

#### Scenario: A player raises their own LP
- **WHEN** a player tries to change their own LP
- **THEN** the server denies the write

#### Scenario: A player lowers their own LP without a draw
- **WHEN** a player lowers their own LP with a ledger entry whose source is neither a draw nor a pack
- **THEN** the server denies the write

#### Scenario: A player pays for a pack
- **WHEN** Ayla, who has 5 LP, opens a Standard Pack
- **THEN** her LP drops to 3, recorded as a pack payment

#### Scenario: Not a positive whole amount
- **WHEN** the DM enters 0, a negative number, or a fraction as the amount
- **THEN** the change cannot be made

### Requirement: A reason for every change
Every change of LP or GP that the DM makes by hand SHALL have a reason, written by the DM, of 1 to 200 characters. A change by hand without a reason SHALL NOT be made. A draw payment, a pack payment, and a pack refund SHALL have no written reason. Their draw or pack opening explains them.

#### Scenario: Giving a reason
- **WHEN** the DM adds 2 LP to Ayla with the reason "Boss'u yendi"
- **THEN** the change is made, and its record carries that reason

#### Scenario: No reason
- **WHEN** the DM tries to change a balance with an empty reason
- **THEN** the application does not make the change, and the server denies such a write

#### Scenario: A draw payment
- **WHEN** Ayla pays 1 LP for a draw
- **THEN** its record has no reason and names the draw

#### Scenario: A pack refund
- **WHEN** the DM cancels Ayla's open pack, for which she paid 2 LP
- **THEN** the refund's record has no reason and names the pack opening

### Requirement: Permanent ledger
Every change SHALL be recorded in the ledger with the currency (LP or GP), the account (the player or the party), the change, the balance after it, its source (by hand, a draw, or a pack), the reason for a change by hand, the draw or pack opening for a payment or a refund, who made the change, and when. Ledger entries SHALL never be changed or deleted.

#### Scenario: Recording a change
- **WHEN** the DM adds 2 LP to Ayla, who has 5 LP, with the reason "Boss'u yendi"
- **THEN** the ledger has an entry for Ayla's LP with the change +2, the balance 7, the source "by hand", the reason "Boss'u yendi", the DM, and the time

#### Scenario: Recording a draw payment
- **WHEN** Ayla, who has 3 LP, pays for a draw
- **THEN** the ledger has an entry for Ayla's LP with the change −1, the balance 2, the source "draw", the draw, Ayla, and the time

#### Scenario: Recording a GP pack payment
- **WHEN** the DM opens a Golden Pack for Bora, paid with 10,000 GP from a party purse of 12,500 GP
- **THEN** the ledger has an entry for the party's GP with the change −10,000, the balance 2,500, the source "pack", the pack opening, the DM, and the time

#### Scenario: Recording a pack refund
- **WHEN** the DM cancels that pack
- **THEN** the ledger has an entry for the party's GP with the change +10,000, the balance 12,500, the source "pack", and the same pack opening

#### Scenario: Changing an entry
- **WHEN** any signed-in user, including the DM, tries to change or delete a ledger entry
- **THEN** the server denies it
