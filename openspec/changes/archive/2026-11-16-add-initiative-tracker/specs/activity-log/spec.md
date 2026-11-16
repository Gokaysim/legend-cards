# Spec Delta

## MODIFIED Requirements

### Requirement: One list of what happened
The İşlem Logu screen SHALL list, newest first and live, every card given, drawn, used, discarded, and transferred, every pack opened, every True Word draft, every word the DM teaches or takes back, every use of a card or True Word that stays in the hand, every LP and GP change, every definition change, every set change, every change of the player draw mode, and every start and end of a fight. It SHALL be read from the holdings (the learned True Words among them), the draws, packs and True Word drafts, the use records, the ledger, the change records, the set change records, the table change records and the combat change records, so it never disagrees with them. Switching a card or a word active, notes, and cost overrides SHALL NOT be listed.

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

#### Scenario: A fight among the events
- **WHEN** the DM adds 2 LP to Bora, and then starts a fight
- **THEN** the log shows the start of the fight first and the LP change below it

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
The log SHALL offer a filter for one user. With a user chosen, it SHALL list only the cards that user received, including the cards drawn into their hand and the packs opened for them, the cards that left their hand, their True Word drafts, the True Words the DM taught them or took back from them, the uses of their True Words, and the changes of their LP. Party purse changes, definition changes, player draw mode changes and fights SHALL be listed only without a filter.

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

## ADDED Requirements

### Requirement: Fights are events
Starting a fight with "Başlat" and ending a started fight SHALL each appear as one event, visible to every signed-in user, naming the DM. The start SHALL read "savaşı başlattı: <n> katılımcı." and the end "savaşı bitirdi: <n> tur." after the DM's name. Ending a combat before its fight started SHALL NOT be listed, and neither SHALL rolls, turns, reordering, adding or removing.

#### Scenario: A fight's two events
- **WHEN** the DM starts a fight with 6 combatants and ends it in round 5
- **THEN** the log shows "savaşı başlattı: 6 katılımcı." and, above it, "savaşı bitirdi: 5 tur.", both naming the DM

#### Scenario: A combat given up before the fight
- **WHEN** the DM asks for initiative and then selects "Vazgeç"
- **THEN** the log shows no event for it

### Requirement: Combat change records
Each start and end of a fight SHALL be stored as one record, with the DM, the server time, the step, and the number of combatants or rounds. Every signed-in user SHALL read them. Only the DM SHALL create one, together with the combat change it records. Records SHALL NOT be changed or deleted.

#### Scenario: A player writes a record
- **WHEN** Ayla tries to create a combat change record
- **THEN** the server denies it

#### Scenario: Changing a record
- **WHEN** the DM tries to change the round count of an earlier fight's end
- **THEN** the server denies it
