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
The card form SHALL offer the stored sets by their official names in the stored order (spec: card-sets), "Common" and "Rare", and the eight mechanic packs, each with an empty choice for a draft. A set or mechanic pack outside those lists that a card already has SHALL be kept and shown as written. The cost SHALL be free text of at most 10 characters, and empty or "—" means no cost. The text SHALL be at most 2000 characters, and the form SHALL show its bracket text.

#### Scenario: Choosing a set
- **WHEN** the DM adds a normal card
- **THEN** the set choice lists the stored sets' names in the stored order

#### Scenario: A set added on the Setler screen
- **WHEN** the DM adds the set "Zaddir" and then adds a normal card
- **THEN** the set choice offers "Zaddir"'s official name last, and choosing it stores the code "Zaddir" on the card

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
The DM SHALL delete a draft with "Sil", after a confirmation. The definition SHALL be gone, and its change records SHALL stay. Its picture file, if it has one, SHALL be deleted too. An active or retired definition SHALL NOT be deleted.

#### Scenario: Deleting a draft
- **WHEN** the DM deletes the draft "Bard's Encore"
- **THEN** "Bard's Encore" is no longer stored, and the DM's log still lists its records

#### Scenario: Deleting a draft with a picture
- **WHEN** the DM deletes the draft "Bard's Encore", which has a picture
- **THEN** its picture file is deleted too

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

### Requirement: The picture in the forms
The card and True Word forms SHALL show a "Resim" section with the definition's picture, or a note that it has none. It SHALL offer "Resim seç" to choose a new picture, and "Resmi kaldır" while there is a picture. A chosen picture SHALL be shown in the form before it is saved. A picture change SHALL take effect only when the form is saved, and closing the form without saving SHALL change nothing.

#### Scenario: Adding a card with a picture
- **WHEN** the DM adds the card "Bard's Encore", chooses a picture with "Resim seç", and chooses "Kaydet"
- **THEN** the form showed the picture before saving, and "Bard's Encore" is stored as a draft with that picture

#### Scenario: Replacing a picture
- **WHEN** the DM opens "Aboleth's Eyes", chooses a new picture, and chooses "Kaydet"
- **THEN** "Aboleth's Eyes" shows the new picture on every device

#### Scenario: Removing a picture
- **WHEN** the DM opens "Aboleth's Eyes", chooses "Resmi kaldır", and chooses "Kaydet"
- **THEN** "Aboleth's Eyes" has no picture, and its face has its CSS look on every device

#### Scenario: Closing without saving
- **WHEN** the DM chooses a new picture for "Aboleth's Eyes" and closes the form without saving
- **THEN** "Aboleth's Eyes" keeps its picture

#### Scenario: A word's picture
- **WHEN** the DM opens the True Word "Abyss", chooses a new picture, and chooses "Kaydet"
- **THEN** "Abyss" shows the new picture on the True Words screen and in the hands of the players who know it

### Requirement: Downloading a picture
While a definition has a stored picture, its form SHALL offer "İndir", which SHALL download the stored picture as a WebP file named after the definition's identity. A picture chosen but not yet saved SHALL NOT be offered for download.

#### Scenario: Downloading a card's picture
- **WHEN** the DM opens "Aboleth's Eyes" and chooses "İndir"
- **THEN** the browser saves `legend-abolethseyes.webp`, the picture the card shows

#### Scenario: A card without a picture
- **WHEN** the DM opens "Scorched Earth", which has no picture
- **THEN** no "İndir" control is offered

### Requirement: Preparing a picture
The form SHALL accept a PNG, JPEG or WebP file of at most 20 MB, and SHALL prepare it on the DM's device as a stored picture (spec: card-images, "Converted pictures"). Preparing SHALL work in Chrome. When the file is not such a picture, is too large, or the browser cannot prepare it, the form SHALL say why in Turkish and keep the picture it had.

#### Scenario: A PDF
- **WHEN** the DM chooses a PDF file with "Resim seç"
- **THEN** the form says in Turkish that only PNG, JPEG or WebP pictures can be used, and the picture does not change

#### Scenario: A browser that cannot prepare it
- **WHEN** the DM chooses a picture in a browser that cannot make a WebP file
- **THEN** the form says in Turkish that this browser cannot prepare the picture and names Chrome, and the picture does not change

### Requirement: Picture changes are definition steps
A picture change SHALL be saved in the same step and change record as the other fields of that save. It SHALL be possible whatever the definition's status, also while a pack is open. A definition SHALL be complete without a picture. Retiring and bringing back SHALL NOT change the picture.

#### Scenario: A picture during an open pack
- **WHEN** Ayla has an open pack, and the DM saves a new picture for the active card "Aboleth's Eyes"
- **THEN** the picture is saved

#### Scenario: Publishing without a picture
- **WHEN** the DM publishes the complete draft "Bard's Encore", which has no picture
- **THEN** it is active, with its CSS face

#### Scenario: Recording a picture change
- **WHEN** the DM saves a new picture and a new cost for "Aboleth's Eyes"
- **THEN** one change record names both the picture change and the new cost

### Requirement: Replaced picture files are deleted
After a save that replaces or removes a picture, the file that is no longer used SHALL be deleted. When that deletion fails, the save SHALL still count, and no error SHALL be shown. When a save fails, the file uploaded for it SHALL be deleted again, and the definition SHALL keep the picture it had.

#### Scenario: Replacing deletes the old file
- **WHEN** the DM saves a new picture for "Aboleth's Eyes"
- **THEN** the file of its old picture is deleted

#### Scenario: A refused save
- **WHEN** the DM saves a new picture for "Aboleth's Eyes" after it changed on another device
- **THEN** the save is refused, "Aboleth's Eyes" keeps its picture, and the uploaded file is deleted

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
