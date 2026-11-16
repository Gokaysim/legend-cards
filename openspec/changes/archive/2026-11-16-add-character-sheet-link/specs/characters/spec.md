# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
