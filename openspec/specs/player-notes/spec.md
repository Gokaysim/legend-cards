# player-notes Specification

## Purpose

Keeps two free-text notes for each player: a player note that the player and the DM write and the whole table reads, and a DM note that only the DM can read or write. The player note is shown under every tab of the player's hand, and the DM note on the DM's own DM notu tab there.

## Requirements

### Requirement: Player note
Every user with a profile SHALL have one player note of up to 2000 characters. The user themselves and the DM SHALL be able to write it. The server SHALL deny every other write, including one by another player, and SHALL deny deleting a note.

#### Scenario: A player writes their own note
- **WHEN** Ayla writes "Kayıp kardeşini arıyor" in her player note
- **THEN** the note is saved

#### Scenario: The DM writes a player's note
- **WHEN** the DM writes in Ayla's player note
- **THEN** the note is saved

#### Scenario: Another player's note
- **WHEN** Bora tries to change Ayla's player note
- **THEN** the server denies it

#### Scenario: Too long
- **WHEN** Ayla tries to save a player note of 2001 characters
- **THEN** the server denies it

#### Scenario: Deleting a note
- **WHEN** the DM tries to delete Ayla's player note
- **THEN** the server denies it

### Requirement: Player notes readable by every signed-in user
Every signed-in user SHALL be able to read every player note. Signed-out requests SHALL be denied.

#### Scenario: Reading another player's note
- **WHEN** Bora reads Ayla's player note
- **THEN** he gets its text

#### Scenario: Signed out
- **WHEN** a request without a signed-in user reads Ayla's player note
- **THEN** the server denies it

### Requirement: DM note
Every user with a profile SHALL have one DM note of up to 2000 characters. Only the DM SHALL be able to read and write it. The server SHALL deny every read and write of any DM note by a player, including the note about that player, and SHALL deny deleting a note.

#### Scenario: The DM writes a DM note
- **WHEN** the DM writes "Kardeşi aslında hayatta" in Ayla's DM note
- **THEN** the note is saved, and only the DM can read it

#### Scenario: A player reads a DM note
- **WHEN** Ayla tries to read the DM note about herself or about Bora
- **THEN** the server denies it

#### Scenario: A player writes a DM note
- **WHEN** Ayla tries to write any DM note
- **THEN** the server denies it

### Requirement: Players never load a DM note
On a player's device, the application SHALL NOT request any DM note and SHALL NOT show a DM note section or the DM notu tab, not even an empty or hidden one.

#### Scenario: A player opens the Notlar tab
- **WHEN** Ayla opens the URL of the former Notlar tab of her own hand
- **THEN** the Kartlar tab shows only her player note, and her device makes no request for a DM note

#### Scenario: A player opens their hand
- **WHEN** Ayla opens her own hand and switches between its tabs
- **THEN** she sees only her player note, no DM notu tab, and her device makes no request for a DM note

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

### Requirement: Notes are not table actions
Writing a note SHALL NOT be listed in the İşlem Logu. Notes SHALL stay editable while a pack is open.

#### Scenario: Not in the log
- **WHEN** Ayla saves her player note
- **THEN** the İşlem Logu lists no event for it

#### Scenario: During an open pack
- **WHEN** Bora's pack is open, and the DM edits Ayla's DM note
- **THEN** the note is saved

### Requirement: Offline note edits
A note edited without a connection SHALL show the new text on that device at once, and SHALL be saved when the connection returns.

#### Scenario: Editing offline
- **WHEN** Ayla edits her player note without a connection, and the connection returns later
- **THEN** the note is saved then, and other devices see it

### Requirement: Note records
Each note SHALL store its text, who changed it last, and the server time of that change. The server SHALL deny a note whose last editor is not the signed-in user or whose time is not the server time, a note with any other field, and a note for a user who has no profile.

#### Scenario: A forged editor
- **WHEN** Ayla saves her player note naming Bora as its last editor
- **THEN** the server denies it

#### Scenario: A note for an unknown user
- **WHEN** the DM saves a DM note for a user ID that has no profile
- **THEN** the server denies it
