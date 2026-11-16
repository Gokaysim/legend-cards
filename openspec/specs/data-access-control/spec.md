# data-access-control Specification

## Purpose

Decides who may read and write each piece of stored data, and enforces those decisions on the server. Access is closed by default and is opened only on purpose, one data path at a time, with tests.

## Requirements

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

### Requirement: Access rules are tested
Every access rule SHALL have automated tests that run against a local server emulator. The tests SHALL show both that intended access is allowed and that every other access is denied. A data path SHALL NOT be opened without such tests.

#### Scenario: Running the rule tests
- **WHEN** a developer runs the access-rule test suite
- **THEN** it runs against the local emulator, checks the deny-by-default and signed-out cases, and fails if any of them allows access

### Requirement: Accounts not on the list have no access
The server SHALL treat a signed-in account that is not on the access list (spec: table-access, "Accounts on the list") like a request without a signed-in user, for every data path and every file. The one exception SHALL be reading its own list entry. Wherever an access rule grants something to signed-in users, it SHALL grant it only to accounts on the list.

#### Scenario: Unlisted read
- **WHEN** Cem, signed in with a verified Google address that is not on the list, tries to read the profiles, the cards or the İşlem Logu records
- **THEN** the server denies every read

#### Scenario: Unlisted profile
- **WHEN** Cem tries to create a player profile for Cem's own account
- **THEN** the server denies the write

#### Scenario: Unlisted file write
- **WHEN** an account that is not on the list tries to store a photo for a character
- **THEN** the server denies it

#### Scenario: Unverified address
- **WHEN** an account whose address is on the list but not verified tries to read any document
- **THEN** the server denies the read

#### Scenario: Removed from the list
- **WHEN** the DM removes "ayla@gmail.com", and Ayla then tries to read Ayla's hand or draw a card
- **THEN** the server denies the read and the draw

#### Scenario: Pictures stay public
- **WHEN** an account that is not on the list opens the picture file of "Aboleth's Eyes"
- **THEN** the server allows it, as it does for a request without a signed-in user
