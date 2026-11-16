# Spec Delta

## MODIFIED Requirements

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
