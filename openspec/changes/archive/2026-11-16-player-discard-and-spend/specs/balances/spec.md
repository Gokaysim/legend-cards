## MODIFIED Requirements

### Requirement: The DM changes balances by hand
The DM SHALL be able to add a positive whole amount to, or subtract one from, any player's LP and the party purse. A single change SHALL be at most 1,000,000. Players SHALL NOT be able to change any balance, except as the exceptions below allow. The exceptions are a player's own change by hand that lowers their own LP (see "A player lowers their own LP"), a player's own payments from their LP (1 LP for a draw, their own pack's price, their own True Word draft's price, the price of using their own card or True Word), the payments and refunds of packs and True Word drafts, and the DM's payments for a player's card or True Word use, as the card-draws, pack-shop, card-holdings and true-words rules allow.

#### Scenario: The DM adds LP
- **WHEN** the DM adds 2 LP to Ayla, who has 5 LP
- **THEN** Ayla has 7 LP on every device

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

#### Scenario: Not a positive whole amount
- **WHEN** the DM enters 0, a negative number, or a fraction as the amount
- **THEN** the change cannot be made

### Requirement: A reason for every change
Every change of LP or GP by hand, whether the DM makes it or a player lowers their own LP, SHALL have a reason, written by the user who makes it, of 1 to 200 characters. A change by hand without a reason SHALL NOT be made. A draw payment, a pack or True Word draft payment, a pack or True Word draft refund, and a card or True Word use payment SHALL have no written reason. Their draw, pack opening, draft, holding or word use explains them.

#### Scenario: Giving a reason
- **WHEN** the DM adds 2 LP to Ayla with the reason "Boss'u yendi"
- **THEN** the change is made, and its record carries that reason

#### Scenario: No reason
- **WHEN** the DM tries to change a balance with an empty reason
- **THEN** the application does not make the change, and the server denies such a write

#### Scenario: A player's change without a reason
- **WHEN** Ayla tries to lower her own LP with an empty reason
- **THEN** the application does not make the change, and the server denies such a write

#### Scenario: A draw payment
- **WHEN** Ayla pays 1 LP for a draw
- **THEN** its record has no reason and names the draw

#### Scenario: A pack refund
- **WHEN** the DM cancels Ayla's open pack, for which she paid 2 LP
- **THEN** the refund's record has no reason and names the pack opening

#### Scenario: A True Word draft refund
- **WHEN** the DM cancels Ayla's open True Word draft, for which she paid 3 LP
- **THEN** the refund's record has no reason and names the draft

#### Scenario: A card use payment
- **WHEN** Ayla pays 2 LP to use "Aboleth's Eyes"
- **THEN** its record has no reason and names the card's holding

#### Scenario: A True Word use payment
- **WHEN** Ayla pays 5 LP to use "Abyss"
- **THEN** its record has no reason and names the word use

### Requirement: LP on the hand screen
Above a player's hand, the first stat SHALL be their LP, labelled "Legend Point", live. The DM SHALL be able to open the LP change dialog from there with "± LP". On their own hand, a player SHALL be able to open the "Legend Point harca" dialog from there with "− LP". A player's "− LP" SHALL be disabled while they have 0 LP. The DM's own hand SHALL show no LP.

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
- **WHEN** a user opens the DM's hand
- **THEN** no LP stat is shown

## ADDED Requirements

### Requirement: A player lowers their own LP
A player SHALL be able to lower their own LP by hand, by a positive whole amount no larger than their LP, with a reason. The change SHALL be recorded in the ledger as a change by hand made by that player. A player SHALL NOT raise their own LP by hand, and SHALL NOT change another player's LP or the party purse by hand.

#### Scenario: Spending for advantage
- **WHEN** Ayla, who has 5 LP, lowers her own LP by 1 with the reason "d20 avantajı"
- **THEN** she has 4 LP on every device, and the ledger has an entry for Ayla's LP with the change −1, the balance 4, the source "by hand", the reason "d20 avantajı", Ayla, and the time

#### Scenario: A player adds to their own LP by hand
- **WHEN** Ayla writes a change by hand that adds 1 LP to her own LP
- **THEN** the server denies the write

#### Scenario: A player lowers another player's LP
- **WHEN** Ayla writes a change by hand that lowers Bora's LP
- **THEN** the server denies the write

#### Scenario: A player lowers the purse
- **WHEN** Ayla writes a change by hand that lowers the party purse
- **THEN** the server denies the write

#### Scenario: Spending more than the balance
- **WHEN** Ayla, who has 1 LP, tries to lower her own LP by 2
- **THEN** a Turkish message says that Ayla has 1 LP, and her LP stays 1

#### Scenario: While a pack is open
- **WHEN** Ayla tries to lower her own LP while Bora's pack is open
- **THEN** her "− LP" control is disabled with a Turkish note that a pack is open, and the server denies such a write

### Requirement: The player's LP dialog
The "Legend Point harca" dialog SHALL show the player's LP now, an amount that starts at 1, a required reason, a "d20 avantajı" shortcut, the LP after the change while the amount is a whole number from 1 to the player's LP, and a single "− Düş" button. The shortcut SHALL set the reason to "d20 avantajı" and the amount to 1. The dialog SHALL have no control that adds LP, and SHALL close once the change is made.

#### Scenario: Opening the dialog
- **WHEN** Ayla, who has 5 LP, selects "− LP" on her own hand
- **THEN** the "Legend Point harca" dialog opens with "Şu an: 5 LP", the amount 1, an empty reason, "Sonra: 4 LP", and a disabled "− Düş"

#### Scenario: The shortcut
- **WHEN** Ayla enters 3 as the amount and selects "d20 avantajı"
- **THEN** the reason is "d20 avantajı", the amount is 1, and "− Düş" is enabled

#### Scenario: Spending
- **WHEN** Ayla, who has 5 LP, selects "− Düş" with the amount 1 and the reason "d20 avantajı"
- **THEN** the dialog closes, and the "Legend Point" stat of her hand shows 4

#### Scenario: No way to add
- **WHEN** Ayla opens the "Legend Point harca" dialog
- **THEN** it has no "+ Ekle" control
