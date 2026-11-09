# player-notes Specification

## Purpose

Keeps two free-text notes for each player: a player note that the player and the DM write and the whole table reads, and a DM note that only the DM can read or write. They are shown on the hand screen's Notlar tab.

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
On a player's device, the application SHALL NOT request any DM note and SHALL NOT show a DM note section, not even an empty or hidden one.

#### Scenario: A player opens the Notlar tab
- **WHEN** Ayla opens the Notlar tab of her own hand
- **THEN** she sees only her player note, and her device makes no request for a DM note

### Requirement: Notlar tab on the hand screen
The hand screen SHALL have a "✎ Notlar" tab after "✦ True Words". The tab SHALL be kept in the URL, so reloading opens it again. It SHALL show the player note: as an editable field to that player and to the DM, and as read-only text to other players. To the DM only, it SHALL also show the DM note as an editable field, marked "Yalnızca DM görür".

#### Scenario: A player's own notes
- **WHEN** Ayla opens the Notlar tab of her hand
- **THEN** she sees her player note as an editable field

#### Scenario: Another player's notes
- **WHEN** Bora opens the Notlar tab of Ayla's hand
- **THEN** he sees Ayla's player note as read-only text

#### Scenario: The DM's view
- **WHEN** the DM opens the Notlar tab of Ayla's hand
- **THEN** the DM sees Ayla's player note and her DM note, both editable, and the DM note is marked "Yalnızca DM görür"

#### Scenario: Reloading the tab
- **WHEN** a user reloads the browser while the Notlar tab of Bora's hand is open
- **THEN** the Notlar tab of Bora's hand is shown again

### Requirement: The DM note stays on its tab
The DM note SHALL appear only on the Notlar tab. It SHALL NOT appear on the other tabs or in the hand summary, so a DM screen that faces the table shows it only after the DM opens the tab.

#### Scenario: The DM shows a hand to the table
- **WHEN** the DM has Ayla's hand open on the Kartlar tab, and Ayla has a DM note
- **THEN** nothing on the screen shows the DM note or its text

### Requirement: Notlar tab marker
The tab's label SHALL carry a marker, "✎ Notlar •", while the player note has text other than spaces and line breaks. The DM note SHALL NOT affect the marker.

#### Scenario: A player note exists
- **WHEN** a user opens Ayla's hand, and her player note has text
- **THEN** the tab reads "✎ Notlar •"

#### Scenario: Only a DM note exists
- **WHEN** the DM opens Bora's hand, and Bora's player note is empty but his DM note has text
- **THEN** the tab reads "✎ Notlar", without the marker

### Requirement: Saving a note
A note SHALL be saved when its field loses focus, if its text changed, and SHALL show on every device without a reload. A change from another device SHALL NOT replace the text in a field while the user is typing in it. When two users save the same note, the text saved last SHALL be the note.

#### Scenario: Live on another device
- **WHEN** Ayla edits her player note and leaves the field, while Bora has her Notlar tab open
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
- **WHEN** Bora opens the Notlar tab of Ayla's hand, and Ayla has never written a player note
- **THEN** the player note reads "Not yok."

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
