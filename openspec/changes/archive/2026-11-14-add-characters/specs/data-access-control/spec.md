# Spec Delta

## MODIFIED Requirements

### Requirement: Deny by default
The server SHALL deny every read and write to any stored data path, or any path in the file storage, that no access rule explicitly grants. This SHALL hold for both signed-in and signed-out users.

#### Scenario: Signed-in user reads an unopened path
- **WHEN** a signed-in user tries to read a document at a path that no rule grants
- **THEN** the server denies the read

#### Scenario: Signed-in user writes an unopened path
- **WHEN** a signed-in user tries to create or change a document at a path that no rule grants
- **THEN** the server denies the write and the data does not change

#### Scenario: A file outside the pictures
- **WHEN** a signed-in user, the DM included, tries to read or store a file in the file storage outside the card, word and set pictures and the character photos
- **THEN** the server denies it

### Requirement: Signed-out users have no access
The server SHALL deny every read and write from a request without a signed-in user, for every data path and every file. This holds for paths opened by later changes too. The exceptions SHALL be reading a stored card, word or set picture (spec: card-images, "Anyone may open a stored picture") and a character photo (spec: characters, "Character photo files"), which anyone may open by its address.

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user tries to read any document
- **THEN** the server denies the read

#### Scenario: Signed-out write
- **WHEN** a request without a signed-in user tries to write any document
- **THEN** the server denies the write

#### Scenario: Signed-out picture read
- **WHEN** a request without a signed-in user reads the picture file of "Aboleth's Eyes"
- **THEN** the server allows it

#### Scenario: Signed-out photo read
- **WHEN** a request without a signed-in user reads the photo file of Ayla's character "Thorin"
- **THEN** the server allows it

#### Scenario: Signed-out picture write
- **WHEN** a request without a signed-in user tries to store or delete a card, word or set picture, or a character photo
- **THEN** the server denies it

#### Scenario: Signed-out set read
- **WHEN** a request without a signed-in user tries to read the stored set "Kesqer"
- **THEN** the server denies the read

#### Scenario: Signed-out character read
- **WHEN** a request without a signed-in user tries to read the character "Thorin"
- **THEN** the server denies the read
