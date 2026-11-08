# activity-log Specification

## Purpose

Shows what happened in the game on the İşlem Logu screen: the card movements and the balance changes, in one permanent list read from the records that the other capabilities keep.

## Requirements

### Requirement: One list of what happened
The İşlem Logu screen SHALL list, newest first and live, every card given, drawn, used, discarded, and transferred, and every LP and GP change. The list SHALL be read from the card holdings, the draw records, and the ledger, so it never disagrees with them. Switching a card active, notes, and cost overrides SHALL NOT be listed.

#### Scenario: Events from both sources
- **WHEN** the DM gives Ayla a card and then adds 2 LP to Bora
- **THEN** the log shows the LP change first and the card given below it

#### Scenario: A draw among the events
- **WHEN** the DM adds 2 LP to Bora, and then Ayla draws a card
- **THEN** the log shows the draw first and the LP change below it

#### Scenario: Live update
- **WHEN** Ayla uses a card while Bora has the log open
- **THEN** the event appears at the top of Bora's log without a reload

#### Scenario: State changes are not events
- **WHEN** the DM makes a card in Ayla's hand active
- **THEN** the log shows no new event

### Requirement: Log readable by every signed-in user
Every signed-in user SHALL see the whole log, including the events of other players.

#### Scenario: A player reads the log
- **WHEN** Ayla opens the İşlem Logu
- **THEN** she sees the events of every player, including Bora's LP changes

### Requirement: Permanent history
The log SHALL keep every event across sessions and devices. Reloading the application or signing in on another device SHALL show the same events.

#### Scenario: Next session
- **WHEN** a user opens the İşlem Logu a week after an event
- **THEN** that event is still listed

### Requirement: Event rows
Each event SHALL show its time, the name of the user who did it with the DM marked, and what happened, in Turkish. A card event SHALL name the card and the player. A used card SHALL show the character, if one was given. A balance change SHALL show the account, the change, the balance before and after, and the reason.

#### Scenario: A used card
- **WHEN** Ayla uses "Aboleth's Eyes" on "Thorin"
- **THEN** the event shows the time, Ayla, "Aboleth's Eyes", and "Thorin"

#### Scenario: An LP change
- **WHEN** the DM adds 2 LP to Ayla, who had 5 LP, with the reason "Boss'u yendi"
- **THEN** the event shows the time, the DM's name marked as DM, Ayla, +2 LP, 5 → 7, and "Boss'u yendi"

#### Scenario: A GP change
- **WHEN** the DM adds 5,000 GP to a purse of 7,500 GP with the reason "Ejderha hazinesi"
- **THEN** the event shows "Grup kesesi", +5.000 GP, 7.500 → 12.500, and "Ejderha hazinesi"

### Requirement: A transfer is one event
A transfer SHALL appear as one event that names the card, the player who had it, and the player who got it.

#### Scenario: Transferring a card
- **WHEN** the DM transfers "Aboleth's Eyes" from Ayla to Bora
- **THEN** the log shows one event naming "Aboleth's Eyes", Ayla, and Bora, and no separate event for the card given to Bora

### Requirement: Grouped by day
The log SHALL group its events under the date they happened on, in Turkish, with the newest day first.

#### Scenario: Events on two days
- **WHEN** events happened on 7 and 8 November 2026
- **THEN** the events of 8 November are listed under their date, above those of 7 November under theirs

### Requirement: Paging
The log SHALL first show the 50 most recent events. When there are older events, a "Daha fazla" control SHALL show 50 more each time.

#### Scenario: A long history
- **WHEN** a user opens the log while there are 120 events
- **THEN** the 50 most recent events are shown, and "Daha fazla" shows the next 50

#### Scenario: Everything shown
- **WHEN** every event is shown
- **THEN** no "Daha fazla" control is shown

### Requirement: Player filter
The log SHALL offer a filter for one user. With a user chosen, it SHALL list only the cards that user received, including the cards drawn into their hand, the cards that left their hand, and the changes of their LP. Party purse changes SHALL be listed only without a filter.

#### Scenario: Filtering by a player
- **WHEN** a user chooses Ayla in the filter
- **THEN** only the card events of Ayla's hand and Ayla's LP changes are listed

#### Scenario: Draws in the filter
- **WHEN** a user chooses Ayla in the filter after the DM drew a card into Ayla's hand and Bora drew one into his own
- **THEN** the draw into Ayla's hand is listed, and Bora's draw is not

#### Scenario: A transfer between two players
- **WHEN** a user chooses Bora in the filter after the DM transferred a card from Ayla to Bora
- **THEN** the transfer is listed

### Requirement: Log states
While the log is loading, the screen SHALL show a loading indicator. If it cannot be loaded, it SHALL show a Turkish error message. When there are no events, it SHALL say so in Turkish.

#### Scenario: No events yet
- **WHEN** a user opens the İşlem Logu before any card was given or any balance changed
- **THEN** the screen says in Turkish that there are no events yet

#### Scenario: Load error
- **WHEN** the events cannot be read
- **THEN** the screen shows a Turkish error message

### Requirement: A draw is one event
A draw SHALL appear as one event that names who drew, the player whose hand the card went to, the card, whether it was a Cursed draw, the payment of 1 LP if any, and the DM's filters if any. The draw's holding and its ledger entry SHALL NOT appear as separate events.

#### Scenario: A paid draw
- **WHEN** Ayla draws "Aboleth's Eyes" for 1 LP
- **THEN** the log shows one event naming Ayla, "Aboleth's Eyes", and −1 LP, and no separate event for the card given or for the LP change

#### Scenario: The DM draws for a player
- **WHEN** the DM draws a card into Bora's hand with the rarity filter "Rare"
- **THEN** the event shows the DM's name marked as DM, Bora, the card, and the filter "Rare", and no payment

#### Scenario: A Cursed draw
- **WHEN** Ayla draws the Cursed card "Visions of Death"
- **THEN** the event says that Ayla drew a Cursed card and names "Visions of Death"
