# Spec Delta

## MODIFIED Requirements

### Requirement: The DM changes balances by hand
The DM SHALL be able to add a positive whole amount to, or subtract one from, any user's LP, the DM's own and other DMs' included, and the party purse. A single change SHALL be at most 1,000,000. Players SHALL NOT be able to change any balance, except as the exceptions below allow. The exceptions are a player's own change by hand that lowers their own LP (see "A player lowers their own LP"), a player's own payments from their LP (a draw's price, their own pack's price, their own True Word draft's price, the price of using their own card or True Word), the payments and refunds of packs and True Word drafts, and the DM's payments for a draw or for a card or True Word use, as the card-draws, pack-shop, card-holdings and true-words rules allow.

#### Scenario: The DM adds LP
- **WHEN** the DM adds 2 LP to Ayla, who has 5 LP
- **THEN** Ayla has 7 LP on every device

#### Scenario: The DM gives themselves LP
- **WHEN** the DM, who has 0 LP, adds 3 LP to their own LP with the reason "NPC ödülü"
- **THEN** the DM has 3 LP on every device, and the ledger records the DM as both the account and the one who made the change

#### Scenario: A DM changes another DM's LP
- **WHEN** Gökay and Ayla are DMs, and Gökay subtracts 1 LP from Ayla, who has 4 LP
- **THEN** Ayla has 3 LP

#### Scenario: The DM subtracts GP
- **WHEN** the DM subtracts 2,500 GP from a party purse of 12,500 GP
- **THEN** the party purse is 10,000 GP

#### Scenario: A player raises their own LP
- **WHEN** a player tries to raise their own LP
- **THEN** the server denies the write

#### Scenario: A player lowers their own LP without a draw
- **WHEN** a player lowers their own LP with a ledger entry whose source is none of a change by hand, a draw, a pack, a True Word draft, or a use
- **THEN** the server denies the write

#### Scenario: A player pays for a pack
- **WHEN** Ayla, who has 5 LP, opens a Standard Pack
- **THEN** her LP drops to 3, recorded as a pack payment

#### Scenario: A player pays for a True Word draft
- **WHEN** Ayla, who knows 2 True Words and has 5 LP, starts a draft
- **THEN** her LP drops to 2, recorded as a True Word draft payment

#### Scenario: A player pays for a card's use
- **WHEN** Ayla, who has 5 LP, uses her 2-cost card
- **THEN** her LP drops to 3, recorded as a card use payment

#### Scenario: A player pays for a True Word's use
- **WHEN** Ayla, who has 6 LP, uses "Abyss", which costs 5
- **THEN** her LP drops to 1, recorded as a True Word use payment

#### Scenario: The DM charges a draw
- **WHEN** the player draw mode is "Filtreli çekiş", and the DM draws a card into Bora's hand at 2 LP while he has 5 LP
- **THEN** his LP drops to 3, recorded as a draw payment made by the DM

#### Scenario: A player pays for another player's use
- **WHEN** Ayla lowers Bora's LP with a payment for the use of Bora's card
- **THEN** the server denies the write

#### Scenario: A player pays for another player's draw
- **WHEN** Ayla lowers Bora's LP with a payment for a draw
- **THEN** the server denies the write

#### Scenario: A player changes a DM's LP
- **WHEN** Ayla, a player, writes a change by hand to the DM's LP
- **THEN** the server denies the write

#### Scenario: Not a positive whole amount
- **WHEN** the DM enters 0, a negative number, or a fraction as the amount
- **THEN** the change cannot be made

### Requirement: Permanent ledger
Every change SHALL be recorded in the ledger with the currency (LP or GP), the account (the player or the party), the change, the balance after it, its source (by hand, a draw, a pack, a True Word draft, a card use, or a True Word use), the reason for a change by hand, the draw, pack opening, draft, holding or word use for a payment or a refund, who made the change, and when. Ledger entries SHALL never be changed or deleted.

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
