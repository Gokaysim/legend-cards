# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Character tiles`
- TO: `### Requirement: Character tabs`

- FROM: `### Requirement: Character details beside the tiles`
- TO: `### Requirement: The selected character's view`

## MODIFIED Requirements

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
On the Karakterler tab, the hand's user and the DM SHALL see a "+ Karakter ekle" button after the character tabs. It SHALL open a form with the name and an optional photo. Saving SHALL add the character to that hand's user and SHALL select it. Other players SHALL NOT see the button.

#### Scenario: Ayla adds a character
- **WHEN** Ayla chooses "+ Karakter ekle" on her own hand, types "Thorin", chooses a photo and saves
- **THEN** "Thorin" shows among her character tabs, selected, and its view shows the photo

#### Scenario: Another player's hand
- **WHEN** Bora opens the Karakterler tab of Ayla's hand
- **THEN** he sees no "+ Karakter ekle" button

#### Scenario: An empty name
- **WHEN** Ayla tries to save the form with an empty name, or only spaces
- **THEN** the form says in Turkish that the name is needed, and nothing is saved

### Requirement: The selected character's view
Under the character tabs, the tab SHALL show the selected character's view: its photo in a large 3:4 frame, its name and its owner, then its controls and "Aktif efektler". In a window at least 640 CSS pixels wide the photo SHALL show at the left of the rest, and above it otherwise. The view SHALL show on every window width, in the tab and never in a dialog. When the tab opens, and when the selected character is archived, the first active character SHALL be selected.

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
For the owner and the DM, the selected character's view SHALL offer "✎ Düzenle" and "Arşivle". "✎ Düzenle" SHALL open the character's form with its name and photo, where the photo can be kept, replaced or removed. Other players SHALL see the view without these controls. A change SHALL show on every device without a reload.

#### Scenario: Changing the photo
- **WHEN** Ayla opens "✎ Düzenle" on "Thorin", chooses a new photo and saves
- **THEN** the tab and the view of "Thorin" show the new photo on every device

#### Scenario: Removing the photo
- **WHEN** the DM removes the photo of Ayla's "Thorin"
- **THEN** the tab and the view of "Thorin" show "T" in their frames

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
