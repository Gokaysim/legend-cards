# Spec Delta

## ADDED Requirements

### Requirement: Player note under the hand
On every tab of the hand screen, the player note SHALL show under the tab's content, titled "Oyuncu notu". It SHALL be an editable field for that player and for the DM, and read-only text for other players.

#### Scenario: A player's own note
- **WHEN** Ayla opens her hand
- **THEN** she sees her player note as an editable field under her cards

#### Scenario: Another player's note
- **WHEN** Bora opens Ayla's hand
- **THEN** he sees Ayla's player note as read-only text under her cards

#### Scenario: The DM edits a player's note
- **WHEN** the DM opens Ayla's hand
- **THEN** the DM sees Ayla's player note as an editable field under her cards

#### Scenario: On the True Words tab
- **WHEN** Ayla opens the True Words tab of her hand
- **THEN** her player note shows under her True Words

### Requirement: DM notu tab
For the DM only, the hand screen SHALL have a "🔒 DM notu" tab after "✦ True Words". It SHALL show the DM note as an editable field, marked "Yalnızca DM görür". The tab SHALL be kept in the URL, so reloading opens it again. A player SHALL have no such tab, and the tab's URL SHALL open the Kartlar tab for them. A link to the former Notlar tab SHALL open the Kartlar tab.

#### Scenario: The DM's view
- **WHEN** the DM opens the DM notu tab of Ayla's hand
- **THEN** the DM sees Ayla's DM note as an editable field, marked "Yalnızca DM görür", with her player note under it

#### Scenario: Reloading the tab
- **WHEN** the DM reloads the browser while the DM notu tab of Bora's hand is open
- **THEN** the DM notu tab of Bora's hand is shown again

#### Scenario: A player's tabs
- **WHEN** Ayla opens any hand
- **THEN** she sees the "♠ Kartlar" and "✦ True Words" tabs, and no DM notu tab

#### Scenario: A player opens the tab's URL
- **WHEN** Ayla opens the URL of the DM notu tab of her own hand
- **THEN** the Kartlar tab of her hand is shown

#### Scenario: An old Notlar link
- **WHEN** a user opens the URL of the former Notlar tab of Ayla's hand
- **THEN** the Kartlar tab of Ayla's hand is shown, with her player note under her cards

## MODIFIED Requirements

### Requirement: Players never load a DM note
On a player's device, the application SHALL NOT request any DM note and SHALL NOT show a DM note section or the DM notu tab, not even an empty or hidden one.

#### Scenario: A player opens the Notlar tab
- **WHEN** Ayla opens the URL of the former Notlar tab of her own hand
- **THEN** the Kartlar tab shows only her player note, and her device makes no request for a DM note

#### Scenario: A player opens their hand
- **WHEN** Ayla opens her own hand and switches between its tabs
- **THEN** she sees only her player note, no DM notu tab, and her device makes no request for a DM note

### Requirement: The DM note stays on its tab
The DM note SHALL appear only on the DM notu tab. It SHALL NOT appear on the other tabs, under the hand, or in the hand summary, so a DM screen that faces the table shows it only after the DM opens the tab.

#### Scenario: The DM shows a hand to the table
- **WHEN** the DM has Ayla's hand open on the Kartlar tab, and Ayla has a DM note
- **THEN** nothing on the screen shows the DM note or its text

#### Scenario: The DM's tab label
- **WHEN** the DM opens Bora's hand, and Bora has a DM note
- **THEN** the tab still reads "🔒 DM notu", without any mark that a note exists

### Requirement: Saving a note
A note SHALL be saved when its field loses focus, if its text changed, and SHALL show on every device without a reload. A change from another device SHALL NOT replace the text in a field while the user is typing in it. When two users save the same note, the text saved last SHALL be the note.

#### Scenario: Live on another device
- **WHEN** Ayla edits her player note and leaves the field, while Bora has her hand open
- **THEN** Bora sees the new text without a reload

#### Scenario: Typing while the DM saves
- **WHEN** Ayla is typing in her player note, and the DM saves a change to it from another device
- **THEN** Ayla's field keeps what she is typing, and when she leaves the field, her text is saved and becomes the note

### Requirement: Last editor and empty notes
Each note SHALL show who changed it last and when, as "Son düzenleyen: <name> · <day, month and time>". A note with no text other than spaces and line breaks SHALL show "Not yok." to users who cannot edit it.

#### Scenario: Showing the last editor
- **WHEN** the DM last changed Ayla's player note on 9 November at 14:32
- **THEN** the note shows "Son düzenleyen: <DM's name> · 9 Kas 14:32"

#### Scenario: An empty note
- **WHEN** Bora opens Ayla's hand, and Ayla has never written a player note
- **THEN** the player note under her cards reads "Not yok."

## REMOVED Requirements

### Requirement: Notlar tab on the hand screen
**Reason**: The owner asked for the hand screen to follow v2.2.8 (2026-11-11). There, the player's notes show under the hand at all times. The player note moves under the hand, and the DM note gets its own DM-only tab.
**Migration**: See "Player note under the hand" and "DM notu tab". A link to the former Notlar tab opens the Kartlar tab, where the player note now shows. No stored data changes.

### Requirement: Notlar tab marker
**Reason**: The marker told users that the player note had text while the note sat on its own tab. The note now shows under the hand on every tab, so the marker has nothing left to tell. The DM notu tab carries no marker, so it never hints that a DM note exists.
**Migration**: None. No stored data changes.
