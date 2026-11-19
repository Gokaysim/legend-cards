# balances Specification

## Purpose

Tracks the players' Legend Points (LP) and the party's shared GP, and keeps a permanent ledger of every change. It decides who may change a balance and how, and where the balances are shown.

## Requirements

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

### Requirement: Party purse
The group SHALL share one GP balance, the party purse, a whole number that starts at 0.

#### Scenario: Before any GP change
- **WHEN** a user looks at the party purse before the DM ever changed it
- **THEN** it shows 0 GP

### Requirement: Balances readable by every signed-in user
Every signed-in user SHALL be able to read every LP balance, the party purse, and every ledger entry. Signed-out requests SHALL be denied.

#### Scenario: A player reads the balances
- **WHEN** Ayla looks at Bora's LP and at the party purse
- **THEN** she sees both

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user tries to read the party purse or a ledger entry
- **THEN** the server denies it

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

### Requirement: No negative balances
LP and GP SHALL never go below 0. Subtracting more than the current balance SHALL be refused with a Turkish message that names the current balance, and nothing SHALL change.

#### Scenario: Subtracting too much
- **WHEN** the DM tries to subtract 5 LP from Ayla, who has 3 LP
- **THEN** a Turkish message says that Ayla has 3 LP, and her LP stays 3

#### Scenario: A forged negative balance
- **WHEN** a signed-in user writes a balance below 0
- **THEN** the server denies the write

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

### Requirement: Balance and ledger agree
The server SHALL accept a balance change only together with the ledger entry that explains it, and a ledger entry only together with the balance change it records. The entry's balance after SHALL equal the new balance, and its change SHALL equal the difference.

#### Scenario: A balance without an entry
- **WHEN** the DM changes a player's LP without writing a ledger entry
- **THEN** the server denies the write

#### Scenario: An entry without a balance change
- **WHEN** the DM writes a ledger entry and leaves the balance unchanged
- **THEN** the server denies the write

#### Scenario: Entry and balance disagree
- **WHEN** the DM writes an entry with the change +2 while the balance rises by 3
- **THEN** the server denies the whole write

### Requirement: Changes from two devices both count
When two devices change the same balance at the same moment, both changes SHALL be applied and recorded, one after the other. Neither SHALL be lost.

#### Scenario: Two DM devices
- **WHEN** the DM's phone and laptop each add 1 LP to Ayla, who has 5 LP, at the same moment
- **THEN** Ayla has 7 LP, and the ledger has two entries with the balances 6 and 7

### Requirement: Balance changes need a connection
Changing a balance SHALL require a network connection. Offline, the application SHALL show a Turkish message and change nothing.

#### Scenario: Offline change
- **WHEN** the DM tries to add LP while the device is offline
- **THEN** a Turkish message says that a connection is needed, and the balance does not change

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

### Requirement: Party purse in the navigation
The navigation area SHALL show the party purse, labelled "Grup kesesi", above the "Oyuncular" list, live, with Turkish digit grouping, for example "12.500 GP". The DM SHALL be able to open the GP change dialog from there.

#### Scenario: Seeing the purse
- **WHEN** a signed-in user looks at the navigation area while the purse holds 12,500 GP
- **THEN** it shows "Grup kesesi" with "12.500 GP" above the "Oyuncular" list

#### Scenario: The DM changes GP
- **WHEN** the DM opens the GP change from the purse, enters 5000 and the reason "Ejderha hazinesi", and selects "+ Ekle"
- **THEN** the purse rises by 5,000 GP on every device

#### Scenario: A player's purse
- **WHEN** a player looks at the purse
- **THEN** no control to change GP is shown

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
