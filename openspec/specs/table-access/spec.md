# table-access Specification

## Purpose

Decides who may use Legend Card Manager. The DM keeps a list of Google email addresses on the Ayarlar screen. Only accounts on the list get in, and nobody can sign up on their own.

## Requirements

### Requirement: The access list
The application SHALL keep a list of the Google email addresses that may use it. It SHALL store each address in lowercase, without surrounding spaces, and at most once. An address SHALL stay on the list until it is removed. Adding an address SHALL NOT need an account to exist for it yet.

#### Scenario: Address stored in lowercase
- **WHEN** the DM adds " Ayla@Gmail.com "
- **THEN** the list holds "ayla@gmail.com"

#### Scenario: Address added before the account exists
- **WHEN** the DM adds "cem@gmail.com", and Cem has never opened the application
- **THEN** the list holds "cem@gmail.com"

### Requirement: Accounts on the list
An account SHALL count as on the list only when its email address is verified and its email address, in lowercase, is on the list.

#### Scenario: A listed account
- **WHEN** Ayla signs in with the verified Google address "ayla@gmail.com", and "ayla@gmail.com" is on the list
- **THEN** Ayla's account is on the list

#### Scenario: Letter case does not matter
- **WHEN** an account's verified address is "Ayla@Gmail.com", and the list holds "ayla@gmail.com"
- **THEN** the account is on the list

#### Scenario: An unverified address
- **WHEN** an account's address is "ayla@gmail.com" but not verified, and "ayla@gmail.com" is on the list
- **THEN** the account is not on the list

#### Scenario: An address that is not on the list
- **WHEN** Cem signs in with "cem@gmail.com", and that address is not on the list
- **THEN** Cem's account is not on the list

### Requirement: Only the DM manages the list
The server SHALL let only the DM read the whole list, add an address and remove one. It SHALL let any signed-in account read its own entry, whether or not the entry exists. It SHALL deny every other read and write of the list, including changing an existing entry's address or adding time.

#### Scenario: The DM adds an address
- **WHEN** the DM adds "bora@gmail.com"
- **THEN** the server accepts it, and the entry records when it was added

#### Scenario: A player reads the list
- **WHEN** Ayla tries to read the list or another person's entry
- **THEN** the server denies it

#### Scenario: A player adds an address
- **WHEN** Ayla tries to add "cem@gmail.com", or to remove "bora@gmail.com"
- **THEN** the server denies it

#### Scenario: An unlisted account reads its own entry
- **WHEN** Cem, who is not on the list, reads the entry for "cem@gmail.com"
- **THEN** the server allows the read and reports that the entry does not exist

#### Scenario: An unlisted account adds itself
- **WHEN** Cem tries to add "cem@gmail.com"
- **THEN** the server denies it

#### Scenario: A malformed address
- **WHEN** the DM tries to store an entry whose address has capital letters, has no "@", or is longer than 254 characters
- **THEN** the server denies it

#### Scenario: Adding an address twice
- **WHEN** the DM tries to add "ayla@gmail.com" while it is already on the list
- **THEN** the server denies the write, and the existing entry does not change

### Requirement: The DM keeps their own address
The server SHALL deny the DM removing their own address from the list.

#### Scenario: The DM removes their own address
- **WHEN** the DM, signed in as "dm@gmail.com", tries to remove "dm@gmail.com"
- **THEN** the server denies it, and the DM keeps access

### Requirement: Linking an entry to its account
When a person enters the application and their entry is not yet linked to an account, the application SHALL link the entry to their account. The server SHALL let an account link only its own entry, only to itself, and only while the entry is unlinked. Nobody, the DM included, SHALL change or remove a link.

#### Scenario: The first entry
- **WHEN** Bora's address is on the list, and Bora enters the application for the first time
- **THEN** the entry for "bora@gmail.com" is linked to Bora's account

#### Scenario: Linking another person's entry
- **WHEN** Ayla tries to link the entry for "bora@gmail.com" to any account
- **THEN** the server denies it

#### Scenario: Changing a link
- **WHEN** Bora, or the DM, tries to change or remove the link of the entry for "bora@gmail.com" after it is linked
- **THEN** the server denies it

### Requirement: The "Masaya erişim" section
The Ayarlar screen SHALL show the DM a "Masaya erişim" section with a Turkish line saying that the Google accounts on the list may sign in, and one row per address. A linked row SHALL show that person's picture, name and address. An unlinked row SHALL show its address and "Henüz giriş yapmadı". Linked rows SHALL come first, sorted by name, then unlinked rows, sorted by address. The section SHALL update live. Players SHALL NOT see the section.

#### Scenario: The DM's view
- **WHEN** the list holds "dm@gmail.com" and "ayla@gmail.com", both linked, and "bora@gmail.com", unlinked
- **THEN** the DM sees rows for the DM and Ayla with their names and pictures, then "bora@gmail.com" with "Henüz giriş yapmadı"

#### Scenario: The DM's own row
- **WHEN** the DM looks at their own row
- **THEN** it is marked as the DM and as themselves, and it has no "Çıkar" control

#### Scenario: A person enters while the DM watches
- **WHEN** Bora enters the application for the first time while the DM has the section open
- **THEN** Bora's row shows Bora's name and picture, without a reload

#### Scenario: A player opens the Ayarlar screen
- **WHEN** Ayla opens the Ayarlar screen
- **THEN** no "Masaya erişim" section and no email address is shown

#### Scenario: Phone width
- **WHEN** the section is shown 360 CSS pixels wide
- **THEN** the form and the rows fit the width, long addresses wrap, and the page has no horizontal scrollbar

### Requirement: Adding an address from the section
The "Masaya erişim" section SHALL let the DM type an email address and add it with "Ekle". It SHALL remove surrounding spaces and use lowercase. It SHALL show "Geçerli bir e-posta adresi gir." for a malformed address, and "Bu e-posta zaten listede." for an address already on the list, and add nothing in either case.

#### Scenario: Adding an address
- **WHEN** the DM types "Cem@Gmail.com" and chooses "Ekle"
- **THEN** "cem@gmail.com" appears in the list with "Henüz giriş yapmadı", and the field is cleared

#### Scenario: A malformed address
- **WHEN** the DM types "cem.gmail.com" and chooses "Ekle"
- **THEN** the section shows "Geçerli bir e-posta adresi gir.", and the list does not change

#### Scenario: An address already on the list
- **WHEN** the DM types "AYLA@gmail.com" while "ayla@gmail.com" is on the list, and chooses "Ekle"
- **THEN** the section shows "Bu e-posta zaten listede.", and the list does not change

### Requirement: Removing an address
Each row except the DM's own SHALL have "Çıkar". Choosing it SHALL ask, in Turkish, whether to remove that address from the table, and say that the person's cards and LP are not deleted. Removing an address SHALL close that account's access only: its profile, cards, LP, characters, log entries and statistics SHALL stay, and the person SHALL stay in the "Oyuncular" list and in the DM's player choices.

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

### Requirement: List changes are not logged
Adding, linking and removing addresses SHALL NOT create İşlem Logu events, so that no address reaches the players.

#### Scenario: Adding an address
- **WHEN** the DM adds "cem@gmail.com"
- **THEN** the İşlem Logu shows no new event
