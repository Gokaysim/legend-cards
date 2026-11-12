## ADDED Requirements

### Requirement: DM-only cards
A card of any kind SHALL be either DM-only or not, independent of its status. A DM-only card is one that only the DM gives: no draw or pack gives it, and players do not find it in the card lists. A card stored without the flag SHALL read as not DM-only. True Words SHALL have no such flag. The interface SHALL call the flag "Sadece DM verebilir", and mark such a card "DM'e özel".

#### Scenario: A stored card
- **WHEN** the DM looks at a card that was imported before the flag existed
- **THEN** it is not DM-only

#### Scenario: A DM-only Cursed card
- **WHEN** the DM marks the Cursed card "Visions of Death" as DM-only
- **THEN** it stays a Cursed card, and its status does not change

### Requirement: Setting the DM-only flag
The card form SHALL offer a "Sadece DM verebilir" checkbox, for a new card and for a stored card in every status. Saving a changed flag SHALL be an edit of the card, with its change record. Only the DM SHALL change the flag; the server SHALL deny anyone else.

#### Scenario: Marking an active card
- **WHEN** the DM checks "Sadece DM verebilir" on the active card "Aboleth's Eyes" and saves
- **THEN** the card is DM-only, and a change record names the edit with the flag before and after

#### Scenario: Adding a DM-only draft
- **WHEN** the DM adds the card "The Last Wish" with the box checked and "Kaydet"
- **THEN** it is stored as a DM-only draft

#### Scenario: A player sets the flag
- **WHEN** a player writes the flag on a card
- **THEN** the server denies it

## MODIFIED Requirements

### Requirement: Status steps wait for an open pack
While a pack is open, the server SHALL deny publishing, retiring, bringing back, deleting, and turning a card's DM-only flag on or off, and the controls SHALL say in Turkish that the table is waiting for the pack. Adding a draft and changing the other fields of any definition SHALL stay possible.

#### Scenario: Retiring during a pack
- **WHEN** Ayla has an open pack, and the DM tries to retire a card
- **THEN** the card stays active, and the DM sees that the table is waiting for the pack

#### Scenario: Fixing a text during a pack
- **WHEN** Ayla has an open pack, and the DM fixes a typo in a card's text
- **THEN** the change is saved

#### Scenario: Marking a card DM-only during a pack
- **WHEN** Ayla has an open pack, and the DM tries to mark "Aboleth's Eyes" as DM-only
- **THEN** the card stays as it was, and the DM sees that the table is waiting for the pack

### Requirement: Who reads the change records
A record SHALL be readable by every signed-in user when its definition is visible to players before or after the step: active or retired, and not DM-only. Those are a publish, an add straight to active, a change to such a definition, a retire, a bring-back, and turning the DM-only flag on or off. Any other record SHALL be readable by the DM only, even after the definition becomes visible: work on a draft, and work on a DM-only card.

#### Scenario: A player reads a publish
- **WHEN** the DM publishes "Bard's Encore", and Ayla reads the change records
- **THEN** she can read the record of the publish

#### Scenario: A player reads draft work
- **WHEN** Ayla tries to read the record of the DM adding "Bard's Encore" as a draft
- **THEN** the server denies it, also after "Bard's Encore" is published

#### Scenario: A player reads work on a DM-only card
- **WHEN** the DM changes the text of the active DM-only card "The Last Wish", and Ayla tries to read that record
- **THEN** the server denies it

#### Scenario: A player reads a flag change
- **WHEN** the DM turns off the DM-only flag of the active card "The Last Wish", and Ayla reads the change records
- **THEN** she can read the record of that edit
