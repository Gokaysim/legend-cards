## MODIFIED Requirements

### Requirement: One list of what happened
The İşlem Logu screen SHALL list, newest first and live, every card given, drawn, used, discarded, and transferred, every pack opened, every True Word draft, every word the DM teaches or takes back, every use of a card or True Word that stays in the hand, every LP and GP change, every definition change, every set change, every change of the player draw mode, every reset of the dice channel, every DM role change made in the app, and every start and end of a fight. It SHALL be read from the holdings (the learned True Words among them), the draws, packs and True Word drafts, the use records, the ledger, the change records, the set change records, the table change records, the role change records and the combat change records, so it never disagrees with them. Switching a card or a word active, notes, and cost overrides SHALL NOT be listed.

#### Scenario: Events from both sources
- **WHEN** the DM gives Ayla a card and then adds 2 LP to Bora
- **THEN** the log shows the LP change first and the card given below it

#### Scenario: A draw among the events
- **WHEN** the DM adds 2 LP to Bora, and then Ayla draws a card
- **THEN** the log shows the draw first and the LP change below it

#### Scenario: A pack among the events
- **WHEN** the DM adds 2 LP to Bora, and then Ayla opens a pack
- **THEN** the log shows the pack first and the LP change below it

#### Scenario: A True Word draft among the events
- **WHEN** the DM adds 2 LP to Bora, and then Ayla starts a True Word draft
- **THEN** the log shows the draft first and the LP change below it

#### Scenario: A True Word use among the events
- **WHEN** the DM adds 2 LP to Bora, and then Ayla uses "Abyss"
- **THEN** the log shows the use of "Abyss" first and the LP change below it

#### Scenario: A definition change among the events
- **WHEN** the DM adds 2 LP to Bora, and then fixes the text of "Aboleth's Eyes"
- **THEN** the log shows the text change first and the LP change below it

#### Scenario: A set change among the events
- **WHEN** the DM adds 2 LP to Bora, and then renames the set "Ulagal"
- **THEN** the log shows the set change first and the LP change below it

#### Scenario: A mode change among the events
- **WHEN** the DM adds 2 LP to Bora, and then sets the player draw mode to "Filtreli çekiş"
- **THEN** the log shows the mode change first and the LP change below it

#### Scenario: A role change among the events
- **WHEN** the DM adds 2 LP to Bora, and then makes Ayla a DM
- **THEN** the log shows the role change first and the LP change below it

#### Scenario: A fight among the events
- **WHEN** the DM adds 2 LP to Bora, and then starts a fight
- **THEN** the log shows the start of the fight first and the LP change below it

#### Scenario: A dice reset among the events
- **WHEN** the DM adds 2 LP to Bora, and then resets the dice channel
- **THEN** the log shows the reset first and the LP change below it

#### Scenario: Live update
- **WHEN** Ayla uses a card while Bora has the log open
- **THEN** the event appears at the top of Bora's log without a reload

#### Scenario: State changes are not events
- **WHEN** the DM makes a card in Ayla's hand active, or one of her True Words
- **THEN** the log shows no new event

#### Scenario: A taught word is not a card given
- **WHEN** the DM teaches Bora "Aid"
- **THEN** the log shows that the DM taught Bora "Aid", and no event of a card given

### Requirement: Player filter
The log SHALL offer a filter for one user. With a user chosen, it SHALL list only the cards that user received, including the cards drawn into their hand and the packs opened for them, the cards that left their hand, their True Word drafts, the True Words the DM taught them or took back from them, the uses of their True Words, the changes of their LP, and the changes of their role. Party purse changes, definition changes, player draw mode changes, dice channel resets and fights SHALL be listed only without a filter.

#### Scenario: Filtering by a player
- **WHEN** a user chooses Ayla in the filter
- **THEN** only the card events of Ayla's hand, Ayla's True Word events, and Ayla's LP changes are listed

#### Scenario: Draws in the filter
- **WHEN** a user chooses Ayla in the filter after the DM drew a card into Ayla's hand and Bora drew one into his own
- **THEN** the draw into Ayla's hand is listed, and Bora's draw is not

#### Scenario: Packs in the filter
- **WHEN** a user chooses Ayla in the filter after the DM opened a pack for Ayla
- **THEN** that pack is listed

#### Scenario: True Words in the filter
- **WHEN** a user chooses Ayla in the filter after the DM started a draft for Ayla and taught Bora a word
- **THEN** Ayla's draft is listed, and the word taught to Bora is not

#### Scenario: True Word uses in the filter
- **WHEN** a user chooses Ayla in the filter after Ayla used "Abyss" and Bora used "Aid"
- **THEN** Ayla's use of "Abyss" is listed, and Bora's use of "Aid" is not

#### Scenario: A transfer between two players
- **WHEN** a user chooses Bora in the filter after the DM transferred a card from Ayla to Bora
- **THEN** the transfer is listed

#### Scenario: Definition changes in the filter
- **WHEN** a user chooses Ayla in the filter after the DM changed the text of a card that Ayla holds
- **THEN** the text change is not listed

#### Scenario: Mode changes in the filter
- **WHEN** a user chooses Ayla in the filter after the DM set the player draw mode to "Filtreli çekiş"
- **THEN** the mode change is not listed

#### Scenario: Fights in the filter
- **WHEN** a user chooses Ayla in the filter after a fight in which Ayla's "Thorn" took part
- **THEN** the fight's start and end are not listed

#### Scenario: Role changes in the filter
- **WHEN** a DM made Ayla a DM and then took Bora's DM role, and a user chooses Ayla in the filter
- **THEN** the change of Ayla's role is listed, and the change of Bora's role is not

#### Scenario: A dice reset in the filter
- **WHEN** a user chooses Bora in the filter after the DM reset the dice channel
- **THEN** the reset is not listed

## ADDED Requirements

### Requirement: Dice channel resets are events
Each reset of the dice channel (spec: dice-rolls, "Resetting the dice channel") SHALL appear as one event, visible to every signed-in user. It SHALL name the DM who reset it and read "zar kanalını sıfırladı: <n> atış." after the DM's name, where <n> is the number of rolls deleted. The rolls themselves SHALL still not be events.

#### Scenario: A reset in the log
- **WHEN** the DM resets a dice channel of 142 rolls, and Ayla opens the İşlem Logu
- **THEN** she sees one event with the DM's name marked as DM and "zar kanalını sıfırladı: 142 atış."
