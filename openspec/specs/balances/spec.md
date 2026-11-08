# balances Specification

## Purpose

Tracks the players' Legend Points (LP) and the party's shared GP, and keeps a permanent ledger of every change. It decides who may change a balance and how, and where the balances are shown.

## Requirements

### Requirement: Legend Points per player
Every player SHALL have an LP balance, a whole number that starts at 0. The DM SHALL have no LP: it is not shown for the DM, and it cannot be changed.

#### Scenario: A new player
- **WHEN** a user signs in for the first time
- **THEN** their LP is 0

#### Scenario: The DM's LP
- **WHEN** the DM tries to change the LP of a user whose role is DM
- **THEN** the server denies the write

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
The DM SHALL be able to add a positive whole amount to, or subtract one from, any player's LP and the party purse. A single change SHALL be at most 1,000,000. Players SHALL NOT be able to change any balance, not even their own. The one exception is a player's own LP, which drops by 1 when they pay for a draw, as the card-draws rules allow.

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
- **WHEN** a player lowers their own LP by 1 with a ledger entry whose source is not a draw
- **THEN** the server denies the write

#### Scenario: Not a positive whole amount
- **WHEN** the DM enters 0, a negative number, or a fraction as the amount
- **THEN** the change cannot be made

### Requirement: A reason for every change
Every change of LP or GP that the DM makes by hand SHALL have a reason, written by the DM, of 1 to 200 characters. A change by hand without a reason SHALL NOT be made. A draw payment SHALL have no written reason. Its draw explains it.

#### Scenario: Giving a reason
- **WHEN** the DM adds 2 LP to Ayla with the reason "Boss'u yendi"
- **THEN** the change is made, and its record carries that reason

#### Scenario: No reason
- **WHEN** the DM tries to change a balance with an empty reason
- **THEN** the application does not make the change, and the server denies such a write

#### Scenario: A draw payment
- **WHEN** Ayla pays 1 LP for a draw
- **THEN** its record has no reason and names the draw

### Requirement: No negative balances
LP and GP SHALL never go below 0. Subtracting more than the current balance SHALL be refused with a Turkish message that names the current balance, and nothing SHALL change.

#### Scenario: Subtracting too much
- **WHEN** the DM tries to subtract 5 LP from Ayla, who has 3 LP
- **THEN** a Turkish message says that Ayla has 3 LP, and her LP stays 3

#### Scenario: A forged negative balance
- **WHEN** a signed-in user writes a balance below 0
- **THEN** the server denies the write

### Requirement: Permanent ledger
Every change SHALL be recorded in the ledger with the currency (LP or GP), the account (the player or the party), the change, the balance after it, its source (by hand, or a draw), the reason for a change by hand, the draw for a draw payment, who made the change, and when. Ledger entries SHALL never be changed or deleted.

#### Scenario: Recording a change
- **WHEN** the DM adds 2 LP to Ayla, who has 5 LP, with the reason "Boss'u yendi"
- **THEN** the ledger has an entry for Ayla's LP with the change +2, the balance 7, the source "by hand", the reason "Boss'u yendi", the DM, and the time

#### Scenario: Recording a draw payment
- **WHEN** Ayla, who has 3 LP, pays for a draw
- **THEN** the ledger has an entry for Ayla's LP with the change −1, the balance 2, the source "draw", the draw, Ayla, and the time

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
Above a player's hand, the first stat SHALL be their LP, labelled "Legend Point", live. The DM SHALL be able to open the LP change dialog from there. The DM's own hand SHALL show no LP.

#### Scenario: A player's hand
- **WHEN** a user opens Ayla's hand while she has 7 LP
- **THEN** the first stat above the hand is "Legend Point" with 7

#### Scenario: The DM changes LP from the hand
- **WHEN** the DM opens the LP change on Ayla's hand, enters 2 and the reason "Boss'u yendi", and selects "+ Ekle"
- **THEN** Ayla's LP rises by 2

#### Scenario: A player's controls
- **WHEN** a player opens any hand
- **THEN** no control to change LP is shown

#### Scenario: The DM's own hand
- **WHEN** a user opens the DM's hand
- **THEN** no LP stat is shown

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
