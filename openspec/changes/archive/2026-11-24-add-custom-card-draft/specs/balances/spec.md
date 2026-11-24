# Spec Delta

## MODIFIED Requirements

### Requirement: Permanent ledger
Every change SHALL be recorded in the ledger with the currency (LP or GP), the account (the player or the party), the change, the balance after it, its source (by hand, a draw, a pack, a True Word draft, a Custom Card draft, a card use, or a True Word use), the reason for a change by hand, the draw, pack opening, draft, holding or word use for a payment or a refund, who made the change, and when. Ledger entries SHALL never be changed or deleted.

#### Scenario: Recording a change
- **WHEN** the DM adds 2 LP to Ayla, who has 5 LP, with the reason "Boss'u yendi"
- **THEN** the ledger has an entry for Ayla's LP with the change +2, the balance 7, the source "by hand", the reason "Boss'u yendi", the DM, and the time

#### Scenario: Recording a draw payment
- **WHEN** Ayla, who has 3 LP, pays for a draw
- **THEN** the ledger has an entry for Ayla's LP with the change −1, the balance 2, the source "draw", the draw, Ayla, and the time

#### Scenario: Recording a draw payment at another price
- **WHEN** the player draw mode is "Kart seçme", and the DM draws into Bora's hand at 3 LP while he has 4 LP
- **THEN** the ledger has an entry for Bora's LP with the change −3, the balance 1, the source "draw", the draw, the DM, and the time

#### Scenario: Recording a GP pack payment
- **WHEN** the DM opens a Golden Pack for Bora, paid with 10,000 GP from a party purse of 12,500 GP
- **THEN** the ledger has an entry for the party's GP with the change −10,000, the balance 2,500, the source "pack", the pack opening, the DM, and the time

#### Scenario: Recording a pack refund
- **WHEN** the DM cancels that pack
- **THEN** the ledger has an entry for the party's GP with the change +10,000, the balance 12,500, the source "pack", and the same pack opening

#### Scenario: Recording a True Word draft payment
- **WHEN** the DM starts a True Word draft for Bora, who has 4 LP, for 2 LP
- **THEN** the ledger has an entry for Bora's LP with the change −2, the balance 2, the source "True Word draft", the draft, the DM, and the time

#### Scenario: Recording a card use payment
- **WHEN** the DM uses Bora's 3-cost card, and Bora has 4 LP
- **THEN** the ledger has an entry for Bora's LP with the change −3, the balance 1, the source "card use", the card's holding, the DM, and the time

#### Scenario: Recording a True Word use payment
- **WHEN** Ayla, who has 6 LP, uses "Abyss", which costs 5
- **THEN** the ledger has an entry for Ayla's LP with the change −5, the balance 1, the source "True Word use", the word use, Ayla, and the time

#### Scenario: Changing an entry
- **WHEN** any signed-in user, including the DM, tries to change or delete a ledger entry
- **THEN** the server denies it

#### Scenario: Recording a Custom Card draft payment
- **WHEN** Ayla, who has 5 LP, starts a 3-cost Custom Card draft
- **THEN** the ledger has an entry for Ayla's LP with the change −3, the balance 2, the source "Custom Card draft", the draft, Ayla, and the time

#### Scenario: Recording a Custom Card draft refund
- **WHEN** the DM cancels that draft
- **THEN** the ledger has an entry for Ayla's LP with the change +3, the balance 5, the source "Custom Card draft", and the same draft
