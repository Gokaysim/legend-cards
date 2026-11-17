# Spec Delta

## MODIFIED Requirements

### Requirement: Character tabs
Each active character of the hand's user SHALL have a tab of its own in the hand's tab row, in the order added. Each character tab SHALL show a small thumbnail of the character's photo in a 3:4 frame, with the character's name beside it. A character without a photo, or whose photo cannot be loaded, SHALL show the first letter of its name in the thumbnail instead. A long name SHALL be cut short with "…", and screen readers SHALL still hear it whole. The open character's tab SHALL be marked. A hand whose user has no active characters SHALL show no character tab.

#### Scenario: A character without a photo
- **WHEN** a user opens Ayla's hand, and "Kuzgun" has no photo
- **THEN** the tab of "Kuzgun" shows "K" in its thumbnail, and the name "Kuzgun"

#### Scenario: On a phone
- **WHEN** a user opens a hand with 5 characters on a phone 360 CSS pixels wide
- **THEN** the character tabs wrap with the rest of the tab row and show without a horizontal scrollbar

#### Scenario: A long name
- **WHEN** Ayla has "Thorin Demirsakal Ormanların Koruyucusu" and a user opens her hand on a phone 360 CSS pixels wide
- **THEN** its tab shows the start of the name followed by "…", and a screen reader reads the whole name

#### Scenario: The marked tab
- **WHEN** Bora opens the tab of Ayla's "Kuzgun"
- **THEN** the tab of "Kuzgun" is marked, and the tabs of "Thorin" and "♠ Kartlar" are not

#### Scenario: No characters
- **WHEN** a user opens the hand of a user who has no active characters
- **THEN** the tab row shows no character tab

### Requirement: Adding a character from the tab
In the hand's tab row, the hand's user and the DM SHALL see a "+" control after the character tabs, which screen readers read as "Karakter ekle". It SHALL open a form with the name, an optional photo and an optional sheet link. Saving SHALL add the character to that hand's user and SHALL open its tab. Other players SHALL NOT see the control.

#### Scenario: Ayla adds a character
- **WHEN** Ayla chooses "+" on her own hand, types "Thorin", chooses a photo and saves
- **THEN** "Thorin" shows among her character tabs, open, and its view shows the photo

#### Scenario: Adding with a sheet link
- **WHEN** Ayla chooses "+", types "Thorin" and "https://docs.google.com/document/d/abc" as its sheet link, and saves
- **THEN** the tab of "Thorin" is open, and its view shows "📄 Karakter kağıdı"

#### Scenario: Adding the first character
- **WHEN** Ayla has no characters, chooses "+" on her own hand, types "Thorin" and saves
- **THEN** the tab of "Thorin" shows in the row, open

#### Scenario: Another player's hand
- **WHEN** Bora opens Ayla's hand
- **THEN** he sees no "+" control to add a character

#### Scenario: An empty name
- **WHEN** Ayla tries to save the form with an empty name, or only spaces
- **THEN** the form says in Turkish that the name is needed, and nothing is saved

### Requirement: The selected character's view
Opening a character's tab SHALL show its view under the tab row, across the full width of the hand, with no side panel beside it, and the player note under it: its photo in a large 3:4 frame, its name, its owner and its sheet link, then its controls and "Aktif efektler". In a window at least 640 CSS pixels wide the photo SHALL show at the left of the rest, and above it otherwise. The view SHALL show on every window width, never in a dialog. The open character SHALL be kept in the URL, so reloading opens it again. When the open character is archived, or the URL names a character that is not an active character of the hand's user, the first active character SHALL open, or the Kartlar tab when there is none. A link to the former Karakterler tab SHALL open the first active character, or the Kartlar tab when there is none.

#### Scenario: No selection
- **WHEN** Bora opens Ayla's hand, and Ayla has "Thorin" and then "Kuzgun"
- **THEN** the Kartlar tab is open, and no character's view shows

#### Scenario: Selecting on a desktop
- **WHEN** Bora opens the tab of Ayla's "Kuzgun" in a window 1280 CSS pixels wide
- **THEN** the view of "Kuzgun" shows under the tab row with its photo at the left of its name, no "Seçili Karakter" panel shows beside it, and Ayla's player note shows under it

#### Scenario: Selecting another character
- **WHEN** the view of "Thorin" is open and Bora opens the tab of "Kuzgun"
- **THEN** the view shows "Kuzgun" in place of "Thorin"

#### Scenario: Selecting on a phone
- **WHEN** Bora opens the tab of "Kuzgun" on a phone 360 CSS pixels wide
- **THEN** the view of "Kuzgun" shows under the tab row with its photo above its name, and no dialog opens

#### Scenario: Reloading a character
- **WHEN** Ayla reloads the browser while the tab of her "Kuzgun" is open
- **THEN** the tab of "Kuzgun" is open again

#### Scenario: The selected character is archived
- **WHEN** "Kuzgun" is open, and Ayla archives it on another device while "Thorin" is still active
- **THEN** the view shows "Thorin", the first active character

#### Scenario: The last character is archived
- **WHEN** "Thorin" is Ayla's only active character and is open, and the DM archives it
- **THEN** the Kartlar tab of her hand opens

#### Scenario: An old Karakterler link
- **WHEN** a user opens the URL of the former Karakterler tab of Ayla's hand, and Ayla has "Thorin" and then "Kuzgun"
- **THEN** the tab of "Thorin" is open

#### Scenario: An old Karakterler link without characters
- **WHEN** a user opens the URL of the former Karakterler tab of Bora's hand, and Bora has no active characters
- **THEN** the Kartlar tab of Bora's hand opens

### Requirement: Archived characters on the tab
When the hand's user has archived characters, the hand's tab row SHALL show "Arşiv (<count>)". Choosing it SHALL open a dialog titled "Arşivlenen karakterler" that lists each archived character with its photo and name, and for the owner and the DM a "Geri al" control that brings it back. A character brought back SHALL show again among the character tabs.

#### Scenario: Opening the list
- **WHEN** Ayla has archived "Kuzgun", and she chooses "Arşiv (1)"
- **THEN** a dialog titled "Arşivlenen karakterler" shows "Kuzgun" with "Geri al"

#### Scenario: Bringing a character back
- **WHEN** Ayla chooses "Geri al" on "Kuzgun" in the dialog
- **THEN** the tab of "Kuzgun" shows again in the tab row, and the row no longer shows "Arşiv"

#### Scenario: Another player's view
- **WHEN** Bora chooses "Arşiv (1)" on Ayla's hand
- **THEN** the dialog shows "Kuzgun" without "Geri al"

#### Scenario: Nothing archived
- **WHEN** a user opens the hand of a user who has archived no characters
- **THEN** the tab row shows no "Arşiv"

## REMOVED Requirements

### Requirement: Karakterler tab
**Reason**: The characters become tabs of their own in the hand's tab row (see `card-holdings`, "The hand's tab row"), so the "🧝 Karakterler" tab with its inner row of character tabs goes away.
**Migration**: Each character is opened from its own tab; the former Karakterler tab's URL opens the first active character (see "The selected character's view").
