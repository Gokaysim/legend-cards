## ADDED Requirements

### Requirement: Set changes are events
Each set change record SHALL appear as one event, visible to every signed-in user. It names who made the change (the DM, or "Import"), the set by its official name, and the step: added, edited, moved or deleted. An edit SHALL name the changed fields in Turkish ("Ad", "Alias'lar", "Paketler", "Cardback", "Cardmaker"), without their values. An import SHALL name the sets it added and the sets that got pictures.

#### Scenario: A rename
- **WHEN** the DM changes the name of "Ulagal", and Ayla opens the İşlem Logu
- **THEN** she sees one event naming the DM, the set, the edit, and "Ad"

#### Scenario: A move
- **WHEN** the DM selects "↑" on "Ulagal"
- **THEN** the log shows one event that the DM moved Ballad of Ulagal up in the order

#### Scenario: The set import
- **WHEN** the set import added the 12 sets with their pictures
- **THEN** the log shows one event naming "Import" and the 12 sets

## MODIFIED Requirements

### Requirement: One list of what happened
The İşlem Logu screen SHALL list, newest first and live, every card given, drawn, used, discarded, and transferred, every pack opened, every True Word draft, every word the DM teaches or takes back, every LP and GP change, every definition change, and every set change. It SHALL be read from the holdings, draws, packs, True Word drafts and learned words, the ledger, the change records and the set change records, so it never disagrees with them. Switching a card or a word active, notes, and cost overrides SHALL NOT be listed.

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

#### Scenario: A set change among the events
- **WHEN** the DM adds 2 LP to Bora, and then renames the set "Ulagal"
- **THEN** the log shows the set change first and the LP change below it

#### Scenario: Live update
- **WHEN** Ayla uses a card while Bora has the log open
- **THEN** the event appears at the top of Bora's log without a reload

#### Scenario: State changes are not events
- **WHEN** the DM makes a card in Ayla's hand active, or one of her True Words
- **THEN** the log shows no new event
