# card-sets Specification

## Purpose

Keeps the card sets as data the DM manages in the application: each set's code, official name, aliases, shop position, pack layout and pictures, and the Setler screen that lists and changes them.

## Requirements

### Requirement: Stored sets
Each set SHALL be stored once, with its code, its official name, its aliases, its position in the shop order, its pack layout, its cardback and its Cardmaker picture. The code SHALL be how card data names the set. "Blessed" SHALL NOT be a set.

#### Scenario: A stored set
- **WHEN** the 12 sets are imported from the repository
- **THEN** the set "Kesqer" is stored with the official name "Kesqerian Nights", no aliases, position 5, the Standard/Premium/Cursed layout, and its cardback and Cardmaker

#### Scenario: Blessed is not a set
- **WHEN** the DM tries to add a set with the code "Blessed"
- **THEN** the form refuses it with a Turkish message, and nothing is saved

### Requirement: A card's set
A card SHALL belong to the stored set whose code or alias equals its set code when case, accents and spaces are ignored. A set code that no stored set has SHALL stay on the card and be shown as written.

#### Scenario: A different spelling
- **WHEN** a card has the set code "The End Is Nigh"
- **THEN** it belongs to the set "The End is Nigh"

#### Scenario: An alias
- **WHEN** a card has the set code "Ragnarök"
- **THEN** it belongs to the set "Nordhallr"

#### Scenario: An unknown set code
- **WHEN** a card has the set code "Zaddir", and no stored set has that code or alias
- **THEN** the card keeps "Zaddir", and the screens show "Zaddir"

### Requirement: Distinct codes, names and aliases
No two sets SHALL share a code, an official name, or a spelling among their codes and aliases, compared ignoring case, accents and spaces. The form SHALL refuse such a value with a Turkish message, when adding and when editing.

#### Scenario: A duplicate code
- **WHEN** the DM adds a set with the code "kesqer"
- **THEN** the form says in Turkish that the set already exists, and nothing is saved

#### Scenario: An alias that is another set's code
- **WHEN** the DM gives the set "Pentagon" the alias "Rhodelen"
- **THEN** the form refuses it with a Turkish message, and nothing is saved

### Requirement: Field limits
A set's code and official name SHALL be required, each at most 100 characters. A set SHALL have at most 10 aliases, each at most 100 characters. Values SHALL be trimmed, and empty aliases SHALL be dropped.

#### Scenario: No name
- **WHEN** the DM saves a new set without an official name
- **THEN** the form says in Turkish that the name is required, and nothing is saved

#### Scenario: Spaces around a value
- **WHEN** the DM enters " Kesqerian Nights " as the name
- **THEN** the name is saved as "Kesqerian Nights"

### Requirement: Pack layouts
A set's pack layout SHALL be one of two: "Standart / Premium / Cursed", or "Tek paket + Cursed", which gives the set one pack and one Cursed pack as Pandemonium has (spec: pack-shop).

#### Scenario: Pandemonium's layout
- **WHEN** the sets are imported from the repository
- **THEN** Pandemonium has the "Tek paket + Cursed" layout, and every other set the "Standart / Premium / Cursed" layout

### Requirement: Sets readable by every signed-in user
Every signed-in user SHALL read every stored set and see a change on every device without a reload.

#### Scenario: A renamed set
- **WHEN** the DM changes the name of the set "Ulagal" while Ayla has the Pack Shop open
- **THEN** Ayla's shop shows the new name without a reload

### Requirement: Only the DM manages sets
Only the DM SHALL add, edit, reorder or delete a set, or store or delete a set's picture. The server SHALL deny these steps to players. Players SHALL see no controls for them.

#### Scenario: A player edits a set
- **WHEN** Ayla tries to change the name of the set "Kesqer"
- **THEN** the server denies it

#### Scenario: A player's Setler screen
- **WHEN** Ayla opens the Setler screen
- **THEN** she sees the sets without "+ Set ekle", "↑", "↓" or "✎ Düzenle"

### Requirement: The Setler screen
The Setler screen SHALL list the stored sets live, in their order, one row each, with its number in the order, its cardback, its official name, its code and aliases, its pack layout, and its card count. The DM's rows SHALL also have "↑", "↓" and "✎ Düzenle", and the screen a "+ Set ekle" control.

#### Scenario: The DM opens the screen
- **WHEN** the DM opens the Setler screen
- **THEN** the screen shows "+ Set ekle" and 12 rows from "The End is Nigh" to "Pandemonium", each with its cardback, name, code, layout, card count, "↑", "↓" and "✎ Düzenle"

#### Scenario: A set without a cardback
- **WHEN** a set has no cardback
- **THEN** its row shows the neutral back in the cardback's place

### Requirement: Card counts on the Setler screen
A set's card count SHALL count the cards of that set the viewer can see in the card lists: every card of the set, whatever its status, for the DM; the active cards whose "Listede görünür" is on for a player.

#### Scenario: A player's count
- **WHEN** Kesqer has 120 active cards, 1 draft and 1 active card with "Listede görünür" off
- **THEN** Ayla sees 120 for Kesqer, and the DM sees 122

### Requirement: The Setler screen at phone width
At 360 CSS pixels wide, each set SHALL be one card with its cardback, name, code and card count, and the DM's controls in one row under it. The screen SHALL NOT scroll horizontally.

#### Scenario: A phone
- **WHEN** the DM opens the Setler screen 360 CSS pixels wide
- **THEN** each set is a card with its controls under it, and the page has no horizontal scrollbar

### Requirement: Adding a set
"+ Set ekle" SHALL open the set form empty, with the "Standart / Premium / Cursed" layout chosen. Saving a valid form SHALL store the set at the end of the order. The new set SHALL have no packs in the Pack Shop until it has an active card.

#### Scenario: A new set
- **WHEN** the DM adds the set "Zaddir" named "Tower of Zaddir"
- **THEN** it is the last row of the Setler screen, the card form offers it, and the Pack Shop shows no group for it

#### Scenario: The first active card
- **WHEN** the DM publishes the first card of the set "Zaddir"
- **THEN** the Pack Shop shows the "Tower of Zaddir Packs" group in the set's place in the order

### Requirement: Editing a set
"✎ Düzenle" SHALL open the set form with the set's values. The DM SHALL change its official name, aliases, pack layout and pictures. The code SHALL be shown and SHALL NOT change; the server SHALL deny a change of the code.

#### Scenario: A new name
- **WHEN** the DM changes the name of "Ulagal" to "The Ballad of Ulagal"
- **THEN** every screen that names the set shows "The Ballad of Ulagal", including the cards' sets, the shop and the pack names

#### Scenario: The code
- **WHEN** the DM opens the form of "Kesqer"
- **THEN** the code "Kesqer" is shown and cannot be edited

### Requirement: Reordering sets
"↑" and "↓" SHALL swap a set with the set before or after it in the order. The first set's "↑" and the last set's "↓" SHALL be disabled. The new order SHALL show live everywhere the sets are ordered.

#### Scenario: Moving a set up
- **WHEN** the DM selects "↑" on "Ulagal", ninth in the order
- **THEN** Ulagal is eighth and Havenholm ninth, on the Setler screen, in the Pack Shop, in the card form's set choice and in the library's set filter

### Requirement: Deleting a set
The set form SHALL offer "Sil" only while no card has that set, whatever the card's status. "Sil" SHALL delete the set after a confirmation, together with its picture files. While cards have the set, the form SHALL show "Sil" disabled with the number of those cards in Turkish.

#### Scenario: A set in use
- **WHEN** the DM opens the form of "Kesqer", which 122 cards have
- **THEN** "Sil" is disabled, and the form says "122 kart bu seti kullanıyor."

#### Scenario: An unused set
- **WHEN** the DM deletes the set "Zaddir", which no card has, and confirms
- **THEN** the set is gone from every screen, and its cardback and Cardmaker files are deleted

### Requirement: The pictures in the set form
The set form SHALL show a "Cardback" and a "Cardmaker" section, each with its picture or a note that there is none, and "Resim seç", "Resmi kaldır" while there is a picture, and "İndir" while there is a stored one. A chosen picture SHALL be shown before saving and stored on save.

#### Scenario: Choosing a cardback
- **WHEN** the DM chooses a PNG file as the cardback of "Zaddir" and saves
- **THEN** the set's rows and its face-down cards show the new cardback on every device

#### Scenario: Removing the Cardmaker
- **WHEN** the DM removes the Cardmaker of "Ulagal" and saves
- **THEN** the Ballad of Ulagal group shows the shop's Cardmaker

### Requirement: Preparing a set picture
The form SHALL accept a PNG, JPEG or WebP file of at most 20 MB and prepare it on the DM's device as a stored picture: a cardback at most 563 × 788 pixels, a Cardmaker at most 480 pixels high with its transparency kept. Preparing SHALL work in Chrome. Another file, a file too large, or a picture over 1 MB after preparing SHALL be refused with a Turkish message.

#### Scenario: A large Cardmaker
- **WHEN** the DM chooses a 1000 × 1500 pixel transparent PNG as a Cardmaker
- **THEN** the stored picture is a 320 × 480 pixel WebP with its transparency

#### Scenario: Not a picture
- **WHEN** the DM chooses a PDF file as a cardback
- **THEN** the form refuses it with a Turkish message, and nothing changes

### Requirement: Replaced set pictures are deleted
After a save that replaces or removes a set picture, the file no longer used SHALL be deleted. When that deletion fails, the save SHALL still count, and no error SHALL be shown. When a save fails, the file uploaded for it SHALL be deleted again, and the set SHALL keep its picture.

#### Scenario: A replaced cardback
- **WHEN** the DM replaces the cardback of "Kesqer" and saves
- **THEN** the old cardback file is deleted

### Requirement: Set steps wait for an open pack
While a pack is open, the server SHALL deny changing a set's pack layout and deleting a set, and the form SHALL say in Turkish that the table is waiting for the pack. Adding a set and changing its name, aliases, order or pictures SHALL stay possible.

#### Scenario: A layout change during a pack
- **WHEN** Ayla has an open pack, and the DM changes the layout of "Ulagal"
- **THEN** the layout stays as it was, and the DM sees that the table is waiting for the pack

#### Scenario: A rename during a pack
- **WHEN** Ayla has an open pack, and the DM changes the name of "Ulagal"
- **THEN** the change is saved

### Requirement: Set change records
Every add, edit, reorder and delete of a set SHALL write a record in the same step, naming who did it, when, the set's code and name, the step, and the names of the changed fields. A record SHALL be readable by every signed-in user, and SHALL never change or be deleted. The server SHALL deny a set change without its record.

#### Scenario: Recording a rename
- **WHEN** the DM changes the name of "Ulagal"
- **THEN** a record names the DM, the time, "Ulagal", the edit, and the changed name field

#### Scenario: A change without a record
- **WHEN** the DM writes a new name to a set without its record
- **THEN** the server denies it

### Requirement: A changed set is not overwritten unseen
If a set changes on another device while the DM's form for it is open, saving the form SHALL NOT overwrite that change. The form SHALL say in Turkish that the set has changed, and SHALL show its new values.

#### Scenario: Two devices
- **WHEN** the DM has the form of "Ulagal" open on a laptop and renames the set on a tablet
- **THEN** saving on the laptop does not overwrite the new name, and the form shows it

### Requirement: Set steps need a connection
Adding, editing, reordering and deleting a set SHALL require a network connection. Offline, the application SHALL show a Turkish message and change nothing.

#### Scenario: Offline
- **WHEN** the DM selects "↑" on a set while offline
- **THEN** a Turkish message says a connection is needed, and the order stays as it was

### Requirement: Set names lead to their statistics
On the Setler screen, each set's official name SHALL be a link to the set's Set istatistikleri page (spec: card-stats), for every user, in the table on wide windows and in the cards at phone width.

#### Scenario: Following a set's name
- **WHEN** Ayla selects "Kesqerian Nights" on the Setler screen
- **THEN** the Set istatistikleri of Kesqerian Nights opens

#### Scenario: A phone
- **WHEN** the DM selects "Kesqerian Nights" on the Setler screen 360 CSS pixels wide
- **THEN** the Set istatistikleri of Kesqerian Nights opens
