# Spec Delta

## MODIFIED Requirements

### Requirement: Legend Points per player
Every user, a DM included, SHALL have an LP balance, a whole number that starts at 0. A DM's LP SHALL follow the same rules as a player's, except where a rule names the DM's powers. A user's LP SHALL stay when their role changes.

#### Scenario: A new player
- **WHEN** a user signs in for the first time
- **THEN** their LP is 0

#### Scenario: The DM's LP
- **WHEN** the DM, who never had LP, opens their own hand
- **THEN** it shows 0 LP

#### Scenario: A role change keeps LP
- **WHEN** Ayla has 7 LP and is made a DM, and later a player again
- **THEN** she has 7 LP throughout

### Requirement: The DM changes balances by hand
The DM SHALL be able to add a positive whole amount to, or subtract one from, any user's LP, the DM's own and other DMs' included, and the party purse. A single change SHALL be at most 1,000,000. Players SHALL NOT be able to change any balance, except as the exceptions below allow. The exceptions are a player's own change by hand that lowers their own LP (see "A player lowers their own LP"), a player's own payments from their LP (1 LP for a draw, their own pack's price, their own True Word draft's price, the price of using their own card or True Word), the payments and refunds of packs and True Word drafts, and the DM's payments for a card or True Word use, as the card-draws, pack-shop, card-holdings and true-words rules allow.

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

#### Scenario: A player pays for another player's use
- **WHEN** Ayla lowers Bora's LP with a payment for the use of Bora's card
- **THEN** the server denies the write

#### Scenario: A player changes a DM's LP
- **WHEN** Ayla, a player, writes a change by hand to the DM's LP
- **THEN** the server denies the write

#### Scenario: Not a positive whole amount
- **WHEN** the DM enters 0, a negative number, or a fraction as the amount
- **THEN** the change cannot be made

### Requirement: LP on the hand screen
Above a user's hand, the first stat SHALL be their LP, labelled "Legend Point", live, on a DM's hand too. The DM SHALL be able to open the LP change dialog from there with "± LP", on any hand, the DM's own included. On their own hand, a player SHALL be able to open the "Legend Point harca" dialog from there with "− LP". A player's "− LP" SHALL be disabled while they have 0 LP.

#### Scenario: A player's hand
- **WHEN** a user opens Ayla's hand while she has 7 LP
- **THEN** the first stat above the hand is "Legend Point" with 7

#### Scenario: The DM changes LP from the hand
- **WHEN** the DM opens the LP change on Ayla's hand, enters 2 and the reason "Boss'u yendi", and selects "+ Ekle"
- **THEN** Ayla's LP rises by 2

#### Scenario: A player's own hand
- **WHEN** Ayla opens her own hand while she has 5 LP
- **THEN** the "Legend Point" stat shows "− LP", and no "± LP"

#### Scenario: A player without LP
- **WHEN** Ayla opens her own hand while she has 0 LP
- **THEN** her "− LP" control is disabled

#### Scenario: A player's controls
- **WHEN** Bora opens Ayla's hand
- **THEN** no control to change LP is shown

#### Scenario: The DM's own hand
- **WHEN** the DM opens their own hand while they have 3 LP
- **THEN** the first stat is "Legend Point" with 3, with "± LP" and no "− LP"

#### Scenario: A player looks at the DM's hand
- **WHEN** Bora opens the DM's hand while the DM has 3 LP
- **THEN** the "Legend Point" stat shows 3, and no control to change LP is shown
