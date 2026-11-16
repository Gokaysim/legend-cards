# Spec Delta

## ADDED Requirements

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
