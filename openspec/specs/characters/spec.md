# characters Specification

## Purpose

Keeps the table's characters in the app: each user's player characters and the DM's NPCs, each with a name and a photo. Other features refer to them, for example when a card is used on one.

## Requirements

### Requirement: Character records
A character SHALL belong to one user, its owner, and SHALL have a name of 1 to 40 characters and at most one photo. A user SHALL be able to own any number of characters. A character SHALL also record who added it and when, and, once it has rolled initiative, SHALL keep the modifier it last rolled with (spec: initiative-tracker). Characters SHALL show on every device without a reload.

#### Scenario: Two characters
- **WHEN** Ayla adds "Thorin" and then "Kuzgun"
- **THEN** Ayla owns both characters, and each records Ayla as the one who added it, and the time

#### Scenario: Live on every device
- **WHEN** Ayla adds "Thorin" while Bora has her hand open
- **THEN** "Thorin" shows on Bora's screen without a reload

#### Scenario: Remembering the modifier
- **WHEN** Ayla rolls initiative for "Thorin" with +3
- **THEN** "Thorin" keeps +3, and the next combat offers +3 for it

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
The owner and the DM SHALL be able to rename a character, change or remove its photo, archive it and bring it back, and change its initiative modifier. The server SHALL deny these changes by anyone else, and SHALL deny every change of a character's owner, its creator or its creation time.

#### Scenario: The owner renames
- **WHEN** Ayla renames "Thorin" to "Thorin Oakenshield"
- **THEN** the character shows the new name on every device

#### Scenario: Another player edits
- **WHEN** Bora tries to rename Ayla's "Thorin"
- **THEN** the server denies it

#### Scenario: Changing the owner
- **WHEN** the DM tries to give Ayla's "Thorin" to Bora
- **THEN** the server denies it

#### Scenario: Another player's modifier
- **WHEN** Bora tries to change the initiative modifier of Ayla's "Thorin"
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
The server SHALL deny a character without exactly its stored fields, with a name outside 1 to 40 characters, an owner without a profile, or a photo that is not a stored photo of this character. The initiative modifier SHALL be optional, and when present a whole number from −10 to +30. A new character SHALL be stored unarchived, with the signed-in user as its creator and the server time as its creation time.

#### Scenario: A name too long
- **WHEN** Ayla tries to store a character whose name has 41 characters
- **THEN** the server denies it

#### Scenario: Another character's photo
- **WHEN** Ayla tries to set the photo of "Thorin" to the stored photo of Bora's "Elara"
- **THEN** the server denies it

#### Scenario: A forged creator
- **WHEN** Ayla tries to store a new character that names the DM as the one who added it
- **THEN** the server denies it

#### Scenario: A modifier out of range
- **WHEN** Ayla tries to set the initiative modifier of "Thorin" to 31
- **THEN** the server denies it

#### Scenario: A character without a modifier
- **WHEN** a character that has never rolled initiative is read
- **THEN** it is valid, and the next combat offers 0 for it

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
The hand screen SHALL have a "🧝 Karakterler" tab after "✦ True Words", for every user. It SHALL show the active characters of the hand's user as a row of character tabs, in the order they were added, headed for example "Ayla — Karakterler", with the selected character's view under the row. The Karakterler tab SHALL take the full width of the hand, with no side panel beside it. The tab SHALL be kept in the URL, so reloading opens it again. The player note SHALL show under it.

#### Scenario: Opening the tab
- **WHEN** Bora opens the Karakterler tab of Ayla's hand, and Ayla has added "Thorin" and then "Kuzgun"
- **THEN** he sees "Ayla — Karakterler" with the tabs "Thorin" and then "Kuzgun", the view of "Thorin" under them, and Ayla's player note under it

#### Scenario: Reloading the tab
- **WHEN** Ayla reloads the browser while the Karakterler tab of her hand is open
- **THEN** the Karakterler tab of her hand is shown again

#### Scenario: No characters
- **WHEN** a user opens the Karakterler tab of a hand whose user has no active characters
- **THEN** the tab says in Turkish that there are no characters yet, and shows no character's view

#### Scenario: No side panel
- **WHEN** a user opens the Karakterler tab in a window 1280 CSS pixels wide
- **THEN** no "Seçili Karakter" panel shows beside the tab

### Requirement: Character tabs
Each character tab SHALL show a small thumbnail of the character's photo in a 3:4 frame, with the character's name beside it. A character without a photo, or whose photo cannot be loaded, SHALL show the first letter of its name in the thumbnail instead. The selected character's tab SHALL be marked. The row SHALL wrap onto more lines when it does not fit, and SHALL fit a phone 360 CSS pixels wide without a horizontal scrollbar.

#### Scenario: A character without a photo
- **WHEN** a user opens the Karakterler tab of Ayla's hand, and "Kuzgun" has no photo
- **THEN** the tab of "Kuzgun" shows "K" in its thumbnail, and the name "Kuzgun"

#### Scenario: On a phone
- **WHEN** a user opens the Karakterler tab of a hand with 5 characters on a phone 360 CSS pixels wide
- **THEN** the tabs wrap onto more lines and show without a horizontal scrollbar

#### Scenario: The marked tab
- **WHEN** Bora selects "Kuzgun" on Ayla's Karakterler tab
- **THEN** the tab of "Kuzgun" is marked, and the tab of "Thorin" is not

### Requirement: Adding a character from the tab
On the Karakterler tab, the hand's user and the DM SHALL see a "+ Karakter ekle" button after the character tabs. It SHALL open a form with the name, an optional photo and an optional sheet link. Saving SHALL add the character to that hand's user and SHALL select it. Other players SHALL NOT see the button.

#### Scenario: Ayla adds a character
- **WHEN** Ayla chooses "+ Karakter ekle" on her own hand, types "Thorin", chooses a photo and saves
- **THEN** "Thorin" shows among her character tabs, selected, and its view shows the photo

#### Scenario: Adding with a sheet link
- **WHEN** Ayla chooses "+ Karakter ekle", types "Thorin" and "https://docs.google.com/document/d/abc" as its sheet link, and saves
- **THEN** "Thorin" shows selected, and its view shows "📄 Karakter kağıdı"

#### Scenario: Another player's hand
- **WHEN** Bora opens the Karakterler tab of Ayla's hand
- **THEN** he sees no "+ Karakter ekle" button

#### Scenario: An empty name
- **WHEN** Ayla tries to save the form with an empty name, or only spaces
- **THEN** the form says in Turkish that the name is needed, and nothing is saved

### Requirement: The selected character's view
Under the character tabs, the tab SHALL show the selected character's view: its photo in a large 3:4 frame, its name, its owner and its sheet link, then its controls and "Aktif efektler". In a window at least 640 CSS pixels wide the photo SHALL show at the left of the rest, and above it otherwise. The view SHALL show on every window width, in the tab and never in a dialog. When the tab opens, and when the selected character is archived, the first active character SHALL be selected.

#### Scenario: No selection
- **WHEN** Bora opens Ayla's Karakterler tab, and Ayla has "Thorin" and then "Kuzgun"
- **THEN** the tab of "Thorin" is marked, and the view of "Thorin" shows under the tabs

#### Scenario: Selecting on a desktop
- **WHEN** Bora selects "Kuzgun" on Ayla's Karakterler tab in a window 1280 CSS pixels wide
- **THEN** the view of "Kuzgun" shows under the tabs with its photo at the left of its name, and the tab of "Kuzgun" is marked

#### Scenario: Selecting another character
- **WHEN** Bora selects the tab of "Kuzgun"
- **THEN** the view shows "Kuzgun" in place of "Thorin"

#### Scenario: Selecting on a phone
- **WHEN** Bora selects "Kuzgun" on a phone 360 CSS pixels wide
- **THEN** the view of "Kuzgun" shows under the tabs with its photo above its name, and no dialog opens

#### Scenario: The selected character is archived
- **WHEN** "Kuzgun" is selected, and Ayla archives it on another device
- **THEN** the view shows "Thorin", the first active character

### Requirement: Editing in the details
For the owner and the DM, the selected character's view SHALL offer "✎ Düzenle" and "Arşivle". "✎ Düzenle" SHALL open the character's form with its name, photo and sheet link, where the photo can be kept, replaced or removed. Other players SHALL see the view without these controls. A change SHALL show on every device without a reload.

#### Scenario: Changing the photo
- **WHEN** Ayla opens "✎ Düzenle" on "Thorin", chooses a new photo and saves
- **THEN** the tab and the view of "Thorin" show the new photo on every device

#### Scenario: Removing the photo
- **WHEN** the DM removes the photo of Ayla's "Thorin"
- **THEN** the tab and the view of "Thorin" show "T" in their frames

#### Scenario: Changing the sheet link
- **WHEN** the DM opens "✎ Düzenle" on Ayla's "Thorin", which shows its current sheet link, types a new one and saves
- **THEN** "📄 Karakter kağıdı" in the view of "Thorin" opens the new link on every device

#### Scenario: Another player's view
- **WHEN** Bora selects Ayla's "Thorin"
- **THEN** he sees its photo, name and owner, and no editing controls

### Requirement: Archived characters on the tab
Under the selected character's view, the tab SHALL show a collapsed "Arşivlenen karakterler (<count>)" list when the hand's user has archived characters. Opened, it SHALL list each archived character with its photo and name, and for the owner and the DM a "Geri al" control that brings it back.

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

### Requirement: Character sheet links
A character SHALL have at most one character sheet link: a web address that starts with `http://` or `https://`, of at most 2048 characters. A character without a link SHALL be valid. The server SHALL deny a link with any other start, or a longer one. Every signed-in user SHALL see a character's link, and a new or changed link SHALL show on every device without a reload.

#### Scenario: A link on a character
- **WHEN** Ayla stores "https://docs.google.com/document/d/abc" as the sheet link of "Thorin", while Bora has her hand open
- **THEN** "Thorin" keeps the link, and Bora sees it without a reload

#### Scenario: A character without a link
- **WHEN** a character that never had a sheet link is read
- **THEN** it is valid, and it has no link

#### Scenario: A script as a link
- **WHEN** Ayla's device tries to store "javascript:alert(1)" as the sheet link of "Thorin"
- **THEN** the server denies it

#### Scenario: A link too long
- **WHEN** Ayla's device tries to store a sheet link of 2049 characters for "Thorin"
- **THEN** the server denies it

### Requirement: Who changes a sheet link
The owner and the DM SHALL be able to add, change and remove a character's sheet link, on an archived character too. The server SHALL deny it for anyone else.

#### Scenario: The DM links an NPC
- **WHEN** the DM adds a sheet link to the DM's own "Goblin şefi"
- **THEN** "Goblin şefi" keeps the link

#### Scenario: The DM links a player's character
- **WHEN** the DM changes the sheet link of Ayla's "Thorin"
- **THEN** "Thorin" keeps the new link

#### Scenario: Another player changes a link
- **WHEN** Bora tries to change or remove the sheet link of Ayla's "Thorin"
- **THEN** the server denies it

### Requirement: The sheet link in the form
The character's form SHALL have an optional "Karakter kağıdı linki" field, filled with the stored link. A link typed without `http://` or `https://` SHALL get `https://` in front. A link that the app cannot read as a web address, or one with another start, SHALL get a Turkish message, and the form SHALL save nothing and keep its fields. An empty field SHALL remove the link.

#### Scenario: A link without its start
- **WHEN** Ayla types "docs.google.com/document/d/abc" as the sheet link of "Thorin" and saves
- **THEN** the link of "Thorin" is "https://docs.google.com/document/d/abc"

#### Scenario: Another start
- **WHEN** Ayla types "javascript:alert(1)" as the sheet link of "Thorin" and saves
- **THEN** the form says in Turkish that the link must start with http:// or https://, keeps her text, and nothing is saved

#### Scenario: Not a web address
- **WHEN** Ayla types "https://" as the sheet link of "Thorin" and saves
- **THEN** the form says in Turkish that the link is not valid, and nothing is saved

#### Scenario: Removing the link
- **WHEN** Ayla empties the sheet link field of "Thorin" and saves
- **THEN** "Thorin" has no link, and its view shows no "📄 Karakter kağıdı"

#### Scenario: A link offline
- **WHEN** Ayla adds a sheet link to "Thorin" while offline
- **THEN** her device shows the link at once, and the other devices show it when her connection returns

### Requirement: Opening a character sheet
When the selected character has a sheet link, its view SHALL show "📄 Karakter kağıdı" under its name and owner, with the name of the link's site next to it, for every signed-in user. Choosing it SHALL open the link in a new browser tab and leave the hand open. A character without a link SHALL show no such control.

#### Scenario: Opening the sheet
- **WHEN** Bora selects Ayla's "Thorin", whose sheet link is "https://docs.google.com/document/d/abc", and chooses "📄 Karakter kağıdı"
- **THEN** he sees "docs.google.com" next to it, the sheet opens in a new browser tab, and Ayla's hand stays open in the app

#### Scenario: No link
- **WHEN** Bora selects Ayla's "Kuzgun", which has no sheet link
- **THEN** the view of "Kuzgun" shows no "📄 Karakter kağıdı"
