# definition-editing Specification

## Purpose

Lets the DM add, edit, publish, retire, bring back and delete card and True Word definitions in the application, with every step recorded permanently.

## Requirements

### Requirement: Definition statuses
Every card and every True Word SHALL have exactly one status: draft, active or retired. A draft is being prepared by the DM. An active definition is in play. A retired definition is out of play, but it is kept with its last definition for the hands that hold it and the players who know it. The interface SHALL call the statuses "Taslak", "Yayında" and "Kaldırıldı".

#### Scenario: A new draft
- **WHEN** the DM saves a new card with "Kaydet"
- **THEN** the card is stored with the status draft, and the DM sees it marked "Taslak"

#### Scenario: A retired card
- **WHEN** the DM looks at a retired card
- **THEN** it is marked "Kaldırıldı"

### Requirement: Only the DM manages definitions
Only the DM SHALL add, edit, publish, retire, bring back or delete a card or a True Word in the application. The server SHALL deny these steps to players. Players SHALL see no controls for them.

#### Scenario: The DM fixes a text
- **WHEN** the DM changes the text of "Aboleth's Eyes"
- **THEN** the change is saved

#### Scenario: A player changes a card
- **WHEN** Ayla tries to change the text of "Aboleth's Eyes"
- **THEN** the server denies it, and the card does not change

#### Scenario: A player adds a word
- **WHEN** Ayla tries to create a True Word
- **THEN** the server denies it

#### Scenario: No controls for players
- **WHEN** Ayla opens the Kart kütüphanesi, the Cursed Deck or the True Words screen
- **THEN** she sees no "+ Kart ekle", "+ True Word ekle" or "✎ Düzenle" control

### Requirement: Adding a card
The DM SHALL add a normal or Blessed card from "+ Kart ekle" on the Kart kütüphanesi, and a Cursed card from "+ Kart ekle" on the Cursed Deck. The form SHALL ask for the fields of the card's kind. "Kaydet" SHALL store the card as a draft, even with empty fields. "Kaydet ve yayınla" SHALL store it as active, and SHALL be possible only when the card is complete.

#### Scenario: Saving an unfinished card
- **WHEN** the DM adds the normal card "Bard's Encore" with a set and a rarity, but no text, and chooses "Kaydet"
- **THEN** "Bard's Encore" is stored as a draft

#### Scenario: Adding and publishing at once
- **WHEN** the DM fills in every field of the new Cursed card "Hollow Bones" on the Cursed Deck and chooses "Kaydet ve yayınla"
- **THEN** "Hollow Bones" is active, and it is listed on the Cursed Deck of every device

#### Scenario: Publishing an incomplete card at once
- **WHEN** the DM adds a normal card without a mechanic pack
- **THEN** "Kaydet ve yayınla" is not possible, and the form names the empty mechanic pack in Turkish

### Requirement: Adding a True Word
The DM SHALL add a True Word from "+ True Word ekle" on the True Words screen, with its name, cost and text. "Kaydet" SHALL store it as a draft, even with empty fields. "Kaydet ve yayınla" SHALL store it as active, and SHALL be possible only when the word is complete.

#### Scenario: Adding a word as a draft
- **WHEN** the DM adds the word "Echo" with a cost but no text, and chooses "Kaydet"
- **THEN** "Echo" is stored as a draft

#### Scenario: Adding and publishing a word
- **WHEN** the DM adds the word "Echo" with the cost "2" and a text, and chooses "Kaydet ve yayınla"
- **THEN** "Echo" is active and can be offered in a draft

### Requirement: Card form fields
The card form SHALL offer the official sets in the shop order, "Common" and "Rare", and the eight mechanic packs, each with an empty choice for a draft. A set or mechanic pack outside those lists that a card already has SHALL be kept and shown as written. The cost SHALL be free text of at most 10 characters, and empty or "—" means no cost. The text SHALL be at most 2000 characters, and the form SHALL show its bracket text.

#### Scenario: Choosing a set
- **WHEN** the DM adds a normal card
- **THEN** the set choice lists the official set names in the shop order

#### Scenario: Editing bracket text
- **WHEN** the DM edits "Hrolf's Hornswaggle", whose text starts with "[Uno]"
- **THEN** the form shows the text with "[Uno]", and saving keeps it

#### Scenario: A cost that is too long
- **WHEN** the DM enters a cost of 11 characters
- **THEN** the form refuses it with a Turkish message, and nothing is saved

### Requirement: Names are unique
Every definition SHALL have a name. Two cards of the same deck, or two True Words, SHALL NOT have names that are equal when case, accents, spaces and punctuation are ignored. The form SHALL refuse such a name with a Turkish message, both when adding and when renaming.

#### Scenario: A name already used
- **WHEN** the DM adds a Legend card named "aboleths eyes" while "Aboleth's Eyes" exists
- **THEN** the form says in Turkish that a card with that name exists, and nothing is saved

#### Scenario: The same name in the other deck
- **WHEN** the DM adds a Cursed card with the same name as a Legend card
- **THEN** the card is saved

#### Scenario: An empty name
- **WHEN** the DM tries to save a card without a name
- **THEN** the form refuses it with a Turkish message

### Requirement: Editing a definition
The DM SHALL edit any card or True Word from its "✎ Düzenle" control, whatever its status. A change to an active or retired definition SHALL show on every device without a reload, also in the hands that hold the card and on the True Words tabs of the players who know the word. A renamed card or word SHALL keep its identity, its holdings and its picture.

#### Scenario: Fixing a held card
- **WHEN** Ayla holds "Aboleth's Eyes", and the DM changes its cost from "2" to "3"
- **THEN** Ayla's hand shows the cost "3" on every device without a reload

#### Scenario: Renaming a card with a picture
- **WHEN** the DM renames "Aboleth's Eyes", which has a picture and is in Ayla's hand, to "Eyes of the Aboleth"
- **THEN** the card keeps its picture and stays in Ayla's hand under the new name

#### Scenario: Editing a word someone knows
- **WHEN** Ayla knows "Abyss", and the DM changes its text
- **THEN** Ayla's True Words tab shows the new text without a reload

### Requirement: Complete definitions
A definition is complete when every field its kind requires has a value:
- a normal card: a set, a rarity, a mechanic pack and a text
- a Blessed card: a mechanic pack and a text
- a Cursed card: a text
- a True Word: a cost and a text

A card's cost SHALL never be required. A draft MAY be incomplete. The server SHALL deny every write that leaves an active or retired definition incomplete.

#### Scenario: A card without a cost
- **WHEN** a normal card has a set, a rarity, a mechanic pack and a text, but no cost
- **THEN** it is complete, and its cost shows as "—"

#### Scenario: Emptying a field of an active card
- **WHEN** the DM empties the text of the active card "Aboleth's Eyes" and saves
- **THEN** the form says in Turkish that an active card needs a text, and the server denies such a write

#### Scenario: A word without a cost
- **WHEN** a True Word draft has a text but no cost
- **THEN** it is incomplete

### Requirement: Publishing a draft
The DM SHALL publish a complete draft with "Yayınla". It SHALL become active: players can see it, and it counts wherever active definitions count. An active card is in the pool, the draws, the packs and their thresholds, and in "+ Kart ver". An active word is in the True Word drafts and can be taught. An incomplete draft SHALL NOT be published, and the form SHALL name its empty fields in Turkish.

#### Scenario: Publishing a card
- **WHEN** the DM publishes the complete draft "Bard's Encore"
- **THEN** it appears in the Kart kütüphanesi of every device, and it can be drawn

#### Scenario: Publishing an incomplete card
- **WHEN** the DM tries to publish "The Cartographer", which has no set, rarity or mechanic pack
- **THEN** it stays a draft, and the form names the empty set, rarity and mechanic pack

### Requirement: Retiring and bringing back
The DM SHALL retire an active definition with "Kaldır", after a confirmation, and bring a retired one back with "Geri al". A retired definition SHALL stay with the hands that hold it and the players who know it. A draft SHALL never be retired. An active or retired definition SHALL never become a draft again.

#### Scenario: Retiring a held card
- **WHEN** Ayla holds "Aboleth's Eyes", and the DM retires it
- **THEN** it leaves the Kart kütüphanesi and the pool, and it stays in Ayla's hand

#### Scenario: Bringing a card back
- **WHEN** the DM brings back the retired card "Aboleth's Eyes", which no one holds
- **THEN** it is active, it is listed in the Kart kütüphanesi, and it is in the pool

#### Scenario: Back to draft
- **WHEN** the DM tries to make the active card "Aboleth's Eyes" a draft
- **THEN** the server denies it

### Requirement: Deleting a draft
The DM SHALL delete a draft with "Sil", after a confirmation. The definition SHALL be gone, and its change records SHALL stay. An active or retired definition SHALL NOT be deleted.

#### Scenario: Deleting a draft
- **WHEN** the DM deletes the draft "Bard's Encore"
- **THEN** "Bard's Encore" is no longer stored, and the DM's log still lists its records

#### Scenario: Deleting an active card
- **WHEN** the DM tries to delete the active card "Aboleth's Eyes"
- **THEN** no "Sil" control is offered, and the server denies such a delete

### Requirement: A card's kind changes only in a draft
A card's kind SHALL change only while the card is a draft, and only between normal and Blessed. A Cursed card SHALL stay Cursed, and a Legend card SHALL never become Cursed.

#### Scenario: A draft becomes Blessed
- **WHEN** the DM changes the draft "Bard's Encore" from normal to Blessed
- **THEN** it is saved as a Blessed draft, without a set or a rarity

#### Scenario: An active card changes its kind
- **WHEN** the DM tries to make the active card "Aboleth's Eyes" Blessed
- **THEN** the form offers no kind choice, and the server denies such a write

### Requirement: Status steps wait for an open pack
While a pack is open, the server SHALL deny publishing, retiring, bringing back and deleting, and the controls SHALL say in Turkish that the table is waiting for the pack. Adding a draft and changing the fields of any definition SHALL stay possible.

#### Scenario: Retiring during a pack
- **WHEN** Ayla has an open pack, and the DM tries to retire a card
- **THEN** the card stays active, and the DM sees that the table is waiting for the pack

#### Scenario: Fixing a text during a pack
- **WHEN** Ayla has an open pack, and the DM fixes a typo in a card's text
- **THEN** the change is saved

### Requirement: Change records
Every add, edit, publish, retire, bring-back and delete SHALL be recorded in the same step. A record names who did it, when, the definition, the step, and each changed field's value before and after. A record SHALL never change and SHALL never be deleted. The server SHALL deny a definition change without its record, and a record without its change.

#### Scenario: Recording an edit
- **WHEN** the DM changes the cost of "Aboleth's Eyes" from "2" to "3"
- **THEN** a record names the DM, the time, "Aboleth's Eyes", the edit, and the cost "2" before and "3" after

#### Scenario: A change without a record
- **WHEN** the DM writes a new text to a card without its record
- **THEN** the server denies it

#### Scenario: Changing a record
- **WHEN** the DM tries to change or delete a change record
- **THEN** the server denies it

### Requirement: Who reads the change records
A record of a step that players can see SHALL be readable by every signed-in user. Those steps are a publish, an add straight to active, a change to an active or retired definition, a retire and a bring-back. A record of work on a draft SHALL be readable by the DM only, even after the draft is published. That work is adding, editing or deleting a draft.

#### Scenario: A player reads a publish
- **WHEN** the DM publishes "Bard's Encore", and Ayla reads the change records
- **THEN** she can read the record of the publish

#### Scenario: A player reads draft work
- **WHEN** Ayla tries to read the record of the DM adding "Bard's Encore" as a draft
- **THEN** the server denies it, also after "Bard's Encore" is published

### Requirement: A changed definition is not overwritten unseen
If a definition changes on another device while the DM's form for it is open, saving the form SHALL NOT overwrite that change. The form SHALL say in Turkish that the definition has changed, and SHALL show its new values.

#### Scenario: Two devices
- **WHEN** the DM opens "Aboleth's Eyes" on a tablet and on a laptop, saves a new text on the laptop, and then saves a new cost on the tablet
- **THEN** the tablet's save is refused with a Turkish message, and the tablet shows the laptop's text

### Requirement: Definition steps need a connection
Adding, editing, publishing, retiring, bringing back and deleting SHALL require a network connection. Offline, the application SHALL show a Turkish message and change nothing.

#### Scenario: Publishing offline
- **WHEN** the DM tries to publish a draft without a connection
- **THEN** a Turkish message is shown, and the draft stays a draft
