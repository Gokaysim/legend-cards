# Spec Delta

## MODIFIED Requirements

### Requirement: One list of what happened
The İşlem Logu screen SHALL list, newest first and live, every card given, drawn, used, discarded, and transferred, every pack opened, every True Word draft, every word the DM teaches or takes back, every LP and GP change, and every definition change. It SHALL be read from the holdings, draws, packs, True Word drafts and learned words, the ledger, and the change records, so it never disagrees with them. Switching a card or a word active, notes, and cost overrides SHALL NOT be listed.

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

#### Scenario: A definition change among the events
- **WHEN** the DM adds 2 LP to Bora, and then fixes the text of "Aboleth's Eyes"
- **THEN** the log shows the text change first and the LP change below it

#### Scenario: Live update
- **WHEN** Ayla uses a card while Bora has the log open
- **THEN** the event appears at the top of Bora's log without a reload

#### Scenario: State changes are not events
- **WHEN** the DM makes a card in Ayla's hand active, or one of her True Words
- **THEN** the log shows no new event

### Requirement: Log readable by every signed-in user
Every signed-in user SHALL see the whole log, including the events of other players. The one exception is the DM's work on drafts, which SHALL be listed for the DM only (spec: definition-editing, "Who reads the change records").

#### Scenario: A player reads the log
- **WHEN** Ayla opens the İşlem Logu
- **THEN** she sees the events of every player, including Bora's LP changes

#### Scenario: Draft work in a player's log
- **WHEN** the DM adds the draft "Bard's Encore", edits it, and then publishes it, and Ayla opens the İşlem Logu
- **THEN** Ayla sees only the publish, and the DM sees all three events

### Requirement: Player filter
The log SHALL offer a filter for one user. With a user chosen, it SHALL list only the cards that user received, including the cards drawn into their hand and the packs opened for them, the cards that left their hand, their True Word drafts, the True Words the DM taught them or took back from them, and the changes of their LP. Party purse changes and definition changes SHALL be listed only without a filter.

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

#### Scenario: A transfer between two players
- **WHEN** a user chooses Bora in the filter after the DM transferred a card from Ayla to Bora
- **THEN** the transfer is listed

#### Scenario: Definition changes in the filter
- **WHEN** a user chooses Ayla in the filter after the DM changed the text of a card that Ayla holds
- **THEN** the text change is not listed

## ADDED Requirements

### Requirement: Definition changes are events
Each definition change record SHALL appear as one event. It names who made the change (the DM, or "Import"), the card or word, and the step: added, edited, published, retired, brought back or deleted. An edit SHALL show each changed field before and after. A publish and an add straight to active SHALL show the definition. Events of the DM's work on drafts SHALL be marked as visible to the DM only.

#### Scenario: An edit
- **WHEN** the DM changes the cost of "Aboleth's Eyes" from "2" to "3"
- **THEN** the log shows one event naming the DM, "Aboleth's Eyes", and the cost "2 → 3"

#### Scenario: A retire
- **WHEN** the DM retires the True Word "Abyss"
- **THEN** the log shows that the DM retired the True Word "Abyss"

#### Scenario: Draft work in the DM's log
- **WHEN** the DM adds the draft "Bard's Encore" and opens the İşlem Logu
- **THEN** the event of adding it is marked as visible to the DM only

### Requirement: Text changes in the log
An edit event SHALL show a text before and after by its visible part, without bracket text, as the card screens do. When only the bracket text changed, the event SHALL say in Turkish that the hidden part of the text changed.

#### Scenario: A visible text change
- **WHEN** the DM changes the text of "Aboleth's Eyes"
- **THEN** the event shows the old and the new visible text

#### Scenario: A bracket-only change
- **WHEN** the DM changes "[Uno]" to "[Duo]" in the text of "Hrolf's Hornswaggle"
- **THEN** the event says that the hidden part of the text changed, and shows no bracket text

### Requirement: An import is one event
An import's change record SHALL appear as one event naming "Import", whether cards or True Words were added, how many, and their names. A player SHALL see only the event of the active additions.

#### Scenario: The first import
- **WHEN** the repository card files were imported into empty emulators, and Ayla opens the İşlem Logu
- **THEN** she sees one event that the import added 742 cards, and no event of the 3 drafts
