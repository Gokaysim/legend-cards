# Spec Delta

## MODIFIED Requirements

### Requirement: Stored picture files
A stored picture SHALL be a WebP file of at most 1 MB, kept under its card's, word's or set's identity. Its file name SHALL carry a hash of its content, so a changed picture gets a new address. The server SHALL refuse any other file, and any file outside the card, word and set pictures and the character photos (spec: characters, "Character photo files").

#### Scenario: A file that is not WebP
- **WHEN** the DM's device tries to store a PNG file as a card picture
- **THEN** the server refuses it

#### Scenario: A file that is too large
- **WHEN** the DM's device tries to store a 2 MB WebP file as a card picture
- **THEN** the server refuses it

#### Scenario: A file elsewhere
- **WHEN** the DM's device tries to store a file outside the card, word and set pictures and the character photos
- **THEN** the server refuses it

#### Scenario: A set picture
- **WHEN** the DM's device stores a 300 KB WebP file as the cardback of "Kesqer"
- **THEN** the server accepts it
