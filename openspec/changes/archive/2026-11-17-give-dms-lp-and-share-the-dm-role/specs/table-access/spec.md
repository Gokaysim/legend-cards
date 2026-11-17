# Spec Delta

## MODIFIED Requirements

### Requirement: The DM keeps their own address
The server SHALL deny removing the address of any user who is a DM from the list, the remover's own included. A DM's address SHALL become removable only after that user is made a player (spec: dm-roles).

#### Scenario: The DM removes their own address
- **WHEN** the DM, signed in as "dm@gmail.com", tries to remove "dm@gmail.com"
- **THEN** the server denies it, and the DM keeps access

#### Scenario: A DM removes another DM's address
- **WHEN** Gökay and Ayla are DMs, and Gökay tries to remove "ayla@gmail.com"
- **THEN** the server denies it, and Ayla keeps access

#### Scenario: After taking the role
- **WHEN** Gökay takes Ayla's DM role, and then removes "ayla@gmail.com"
- **THEN** the server accepts it

### Requirement: The "Masaya erişim" section
The Ayarlar screen SHALL show the DM a "Masaya erişim" section with a Turkish line saying that the Google accounts on the list may sign in, and one row per address. A linked row SHALL show that person's picture, name and address, and SHALL be marked "DM" when that person is a DM. The DM's own row SHALL also be marked as themselves. An unlinked row SHALL show its address and "Henüz giriş yapmadı". Linked rows SHALL come first, sorted by name, then unlinked rows, sorted by address. The section SHALL update live. Players SHALL NOT see the section.

#### Scenario: The DM's view
- **WHEN** the list holds "dm@gmail.com" and "ayla@gmail.com", both linked, and "bora@gmail.com", unlinked
- **THEN** the DM sees rows for the DM and Ayla with their names and pictures, then "bora@gmail.com" with "Henüz giriş yapmadı"

#### Scenario: The DM's own row
- **WHEN** the DM looks at their own row
- **THEN** it is marked as the DM and as themselves, and it has no "Çıkar" control

#### Scenario: Another DM's row
- **WHEN** Gökay and Ayla are DMs, and Gökay looks at Ayla's row
- **THEN** it is marked "DM", has "DM'liği al", and has no "Çıkar"

#### Scenario: A player's row
- **WHEN** Gökay, a DM, looks at the row of Bora, a linked player
- **THEN** it has "DM yap" and "Çıkar"

#### Scenario: A person enters while the DM watches
- **WHEN** Bora enters the application for the first time while the DM has the section open
- **THEN** Bora's row shows Bora's name and picture, without a reload

#### Scenario: A role changes while the DM watches
- **WHEN** Ayla's DM role is taken on another device while Gökay has the section open
- **THEN** Ayla's row loses its "DM" mark and shows "DM yap" and "Çıkar", without a reload

#### Scenario: A player opens the Ayarlar screen
- **WHEN** Ayla opens the Ayarlar screen
- **THEN** no "Masaya erişim" section and no email address is shown

#### Scenario: Phone width
- **WHEN** the section is shown 360 CSS pixels wide
- **THEN** the form, the rows and their controls fit the width, long addresses wrap, and the page has no horizontal scrollbar

### Requirement: Removing an address
Each row of a user who is not a DM SHALL have "Çıkar". Choosing it SHALL ask, in Turkish, whether to remove that address from the table, and say that the person's cards and LP are not deleted. Removing an address SHALL close that account's access only: its profile, cards, LP, characters, log entries and statistics SHALL stay, and the person SHALL stay in the "Oyuncular" list and in the DM's player choices.

#### Scenario: Removing a player's address
- **WHEN** the DM chooses "Çıkar" on "ayla@gmail.com" and confirms
- **THEN** the row disappears, Ayla can no longer use the application, and Ayla's profile, cards and LP are unchanged

#### Scenario: Declining the question
- **WHEN** the DM chooses "Çıkar" on "ayla@gmail.com" and then declines
- **THEN** the list does not change

#### Scenario: The removed player is still listed
- **WHEN** Ayla's address has been removed
- **THEN** Ayla still appears in the "Oyuncular" list, and the DM can still give Ayla LP

#### Scenario: Adding the address again
- **WHEN** the DM adds "ayla@gmail.com" again, and Ayla signs in
- **THEN** Ayla finds the same profile, cards and LP as before

#### Scenario: A DM's row
- **WHEN** Ayla is a DM
- **THEN** her row has no "Çıkar"
