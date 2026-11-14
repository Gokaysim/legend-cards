# characters Specification

## Purpose

Keeps the table's characters in the app: each user's player characters and the DM's NPCs, each with a name and a photo. Other features refer to them, for example when a card is used on one.

## Requirements

### Requirement: Character records
A character SHALL belong to one user, its owner, and SHALL have a name of 1 to 40 characters and at most one photo. A user SHALL be able to own any number of characters. A character SHALL also record who added it and when. Characters SHALL show on every device without a reload.

#### Scenario: Two characters
- **WHEN** Ayla adds "Thorin" and then "Kuzgun"
- **THEN** Ayla owns both characters, and each records Ayla as the one who added it, and the time

#### Scenario: Live on every device
- **WHEN** Ayla adds "Thorin" while Bora has her hand open
- **THEN** "Thorin" shows on Bora's screen without a reload

### Requirement: Who adds a character
A player SHALL be able to add characters that they own. The DM SHALL be able to add characters for any user who has a profile, the DM included. The server SHALL deny every other added character, including a player's character for another user.

#### Scenario: A player adds their own character
- **WHEN** Ayla adds "Thorin" on her own hand
- **THEN** "Thorin" is stored with Ayla as its owner

#### Scenario: The DM adds an NPC
- **WHEN** the DM adds "Goblin şefi" on the DM's own hand
- **THEN** "Goblin şefi" is stored with the DM as its owner

#### Scenario: The DM adds a character for a player
- **WHEN** the DM adds "Elara" on Bora's hand
- **THEN** "Elara" is stored with Bora as its owner, and the DM as the one who added it

#### Scenario: A player adds for someone else
- **WHEN** Ayla tries to store a character owned by Bora
- **THEN** the server denies it

### Requirement: Who edits a character
The owner and the DM SHALL be able to rename a character, change or remove its photo, archive it and bring it back. The server SHALL deny these changes by anyone else, and SHALL deny every change of a character's owner, its creator or its creation time.

#### Scenario: The owner renames
- **WHEN** Ayla renames "Thorin" to "Thorin Oakenshield"
- **THEN** the character shows the new name on every device

#### Scenario: Another player edits
- **WHEN** Bora tries to rename Ayla's "Thorin"
- **THEN** the server denies it

#### Scenario: Changing the owner
- **WHEN** the DM tries to give Ayla's "Thorin" to Bora
- **THEN** the server denies it

### Requirement: Characters are archived, never deleted
A character SHALL never be deleted. The owner or the DM SHALL archive a character they no longer need. An archived character SHALL keep its name and photo, and the owner or the DM SHALL be able to bring it back. The server SHALL deny every delete.

#### Scenario: Archiving
- **WHEN** Ayla archives "Kuzgun"
- **THEN** "Kuzgun" leaves her characters and shows among her archived characters

#### Scenario: Bringing back
- **WHEN** Ayla brings back the archived "Kuzgun"
- **THEN** "Kuzgun" shows among her characters again, with its photo

#### Scenario: Deleting
- **WHEN** any signed-in user, the DM included, tries to delete a character
- **THEN** the server denies it

### Requirement: Characters readable by every signed-in user
Every signed-in user SHALL be able to read every character, archived ones included. Signed-out requests SHALL be denied.

#### Scenario: Another player's characters
- **WHEN** Bora opens Ayla's hand
- **THEN** he can see Ayla's characters

#### Scenario: Signed out
- **WHEN** a request without a signed-in user tries to read a character
- **THEN** the server denies it

### Requirement: Valid character records
The server SHALL deny a character without exactly its stored fields, with a name outside 1 to 40 characters, an owner without a profile, or a photo that is not a stored photo of this character. A new character SHALL be stored unarchived, with the signed-in user as its creator and the server time as its creation time.

#### Scenario: A name too long
- **WHEN** Ayla tries to store a character whose name has 41 characters
- **THEN** the server denies it

#### Scenario: Another character's photo
- **WHEN** Ayla tries to set the photo of "Thorin" to the stored photo of Bora's "Elara"
- **THEN** the server denies it

#### Scenario: A forged creator
- **WHEN** Ayla tries to store a new character that names the DM as the one who added it
- **THEN** the server denies it

### Requirement: Preparing a character photo
A photo SHALL be chosen as a PNG, JPEG or WebP file of at most 20 MB. The app SHALL crop it from the center to a 3:4 portrait and store it as a WebP file of at most 600 × 800 pixels and at most 1 MB. A smaller photo SHALL NOT be enlarged. Any other file, or one the browser cannot read or convert, SHALL get a Turkish message and SHALL NOT be stored.

#### Scenario: A landscape photo
- **WHEN** Ayla chooses a JPEG of 1600 × 900 pixels for "Thorin"
- **THEN** the stored photo is the middle 675 × 900 pixels, scaled to 600 × 800, as WebP

#### Scenario: A small photo
- **WHEN** Ayla chooses a PNG of 300 × 300 pixels
- **THEN** the stored photo is the middle 225 × 300 pixels, not enlarged

#### Scenario: A file that is not a picture
- **WHEN** Ayla chooses a PDF file as a photo
- **THEN** a Turkish message says which files are accepted, and nothing is stored

### Requirement: Character photo files
A character photo SHALL be stored under its character's identity, as a WebP file of at most 1 MB whose name carries a hash of its content. The owner and the DM SHALL be able to store and delete the photo files of a character. Anyone who knows a photo's address SHALL be able to open it. The server SHALL deny every other write.

#### Scenario: The owner uploads
- **WHEN** Ayla's device stores a 200 KB WebP file as the photo of "Thorin"
- **THEN** the server accepts it

#### Scenario: Another player uploads
- **WHEN** Bora's device tries to store a file as the photo of Ayla's "Thorin"
- **THEN** the server denies it

#### Scenario: A file that is not WebP
- **WHEN** Ayla's device tries to store a PNG file as the photo of "Thorin"
- **THEN** the server refuses it

#### Scenario: Opening a photo's address
- **WHEN** someone who is not signed in opens the address of the photo of "Thorin"
- **THEN** the photo is shown

### Requirement: Karakterler tab
The hand screen SHALL have a "🧝 Karakterler" tab after "✦ True Words", for every user. It SHALL show the active characters of the hand's user as tiles, in the order they were added, headed for example "Ayla — Karakterler". The tab SHALL be kept in the URL, so reloading opens it again. The player note SHALL show under it.

#### Scenario: Opening the tab
- **WHEN** Bora opens the Karakterler tab of Ayla's hand, and Ayla has added "Thorin" and then "Kuzgun"
- **THEN** he sees "Ayla — Karakterler" with "Thorin" and then "Kuzgun", and Ayla's player note under them

#### Scenario: Reloading the tab
- **WHEN** Ayla reloads the browser while the Karakterler tab of her hand is open
- **THEN** the Karakterler tab of her hand is shown again

#### Scenario: No characters
- **WHEN** a user opens the Karakterler tab of a hand whose user has no active characters
- **THEN** the tab says in Turkish that there are no characters yet

### Requirement: Character tiles
Each tile SHALL show the character's photo in a 3:4 frame, with the character's name under it. A character without a photo, or whose photo cannot be loaded, SHALL show the first letter of its name in the frame instead. The tiles SHALL fit a phone 360 CSS pixels wide without a horizontal scrollbar.

#### Scenario: A character without a photo
- **WHEN** a user opens the Karakterler tab of Ayla's hand, and "Kuzgun" has no photo
- **THEN** the tile of "Kuzgun" shows "K" in its frame, and the name "Kuzgun"

#### Scenario: On a phone
- **WHEN** a user opens the Karakterler tab of a hand with 5 characters on a phone 360 CSS pixels wide
- **THEN** the tiles show without a horizontal scrollbar

### Requirement: Adding a character from the tab
On the Karakterler tab, the hand's user and the DM SHALL see a "Karakter ekle" tile. It SHALL open a form with the name and an optional photo. Saving SHALL add the character to that hand's user. Other players SHALL NOT see the tile.

#### Scenario: Ayla adds a character
- **WHEN** Ayla chooses "Karakter ekle" on her own hand, types "Thorin", chooses a photo and saves
- **THEN** "Thorin" shows among her characters with the photo

#### Scenario: Another player's hand
- **WHEN** Bora opens the Karakterler tab of Ayla's hand
- **THEN** he sees no "Karakter ekle" tile

#### Scenario: An empty name
- **WHEN** Ayla tries to save the form with an empty name, or only spaces
- **THEN** the form says in Turkish that the name is needed, and nothing is saved

### Requirement: Character details beside the tiles
Selecting a tile SHALL show the character's details: its photo, its name and its owner. In a window at least 1024 CSS pixels wide they SHALL show in a "Seçili Karakter" panel at the right of the tiles, and in a dialog otherwise. Without a selection, the panel SHALL show an empty slot with "Bir karakter seç". The selected tile SHALL be marked.

#### Scenario: Selecting on a desktop
- **WHEN** Bora selects "Thorin" on Ayla's Karakterler tab in a window 1280 CSS pixels wide
- **THEN** the details of "Thorin" show in the "Seçili Karakter" panel, and its tile is marked

#### Scenario: Selecting on a phone
- **WHEN** Bora selects "Thorin" on a phone 360 CSS pixels wide
- **THEN** the details of "Thorin" open in a dialog

#### Scenario: No selection
- **WHEN** a user opens the Karakterler tab in a wide window
- **THEN** the panel shows an empty slot with "Bir karakter seç"

### Requirement: Editing in the details
For the owner and the DM, the details SHALL offer "✎ Düzenle" and "Arşivle". "✎ Düzenle" SHALL open the character's form with its name and photo, where the photo can be kept, replaced or removed. Other players SHALL see the details without these controls. A change SHALL show on every device without a reload.

#### Scenario: Changing the photo
- **WHEN** Ayla opens "✎ Düzenle" on "Thorin", chooses a new photo and saves
- **THEN** the tile and the details of "Thorin" show the new photo on every device

#### Scenario: Removing the photo
- **WHEN** the DM removes the photo of Ayla's "Thorin"
- **THEN** the tile of "Thorin" shows "T" in its frame

#### Scenario: Another player's view
- **WHEN** Bora selects Ayla's "Thorin"
- **THEN** he sees its photo, name and owner, and no editing controls

### Requirement: Archived characters on the tab
Under the tiles, the tab SHALL show a collapsed "Arşivlenen karakterler (<count>)" list when the hand's user has archived characters. Opened, it SHALL list each archived character with its photo and name, and for the owner and the DM a "Geri al" control that brings it back.

#### Scenario: Opening the list
- **WHEN** Ayla has archived "Kuzgun", and she opens "Arşivlenen karakterler (1)"
- **THEN** "Kuzgun" shows there with "Geri al"

#### Scenario: Nothing archived
- **WHEN** a user opens the Karakterler tab of a hand whose user has archived no characters
- **THEN** no archived list shows

### Requirement: Character changes are not table actions
Adding, editing, archiving and bringing back a character SHALL NOT be listed in the İşlem Logu. They SHALL stay possible while a pack is open.

#### Scenario: While a pack is open
- **WHEN** the DM has opened a pack for Bora, and Ayla adds "Thorin"
- **THEN** "Thorin" is stored

#### Scenario: The log
- **WHEN** Ayla renames "Thorin"
- **THEN** the İşlem Logu lists nothing new

### Requirement: Characters without a connection
A character added, renamed, archived or brought back without a connection SHALL show on that device at once, and SHALL be saved when the connection returns. Storing a photo SHALL need a connection: without one, the form SHALL say so in Turkish and keep its fields.

#### Scenario: Renaming offline
- **WHEN** Ayla renames "Thorin" while offline
- **THEN** her device shows the new name at once, and the other devices show it when her connection returns

#### Scenario: A photo offline
- **WHEN** Ayla chooses a new photo for "Thorin" while offline, and saves
- **THEN** a Turkish message says that a photo needs a connection, and the form keeps the chosen photo
