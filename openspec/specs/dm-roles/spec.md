# dm-roles Specification

## Purpose

Decides who is a DM. Several users may be DMs at once, and a DM grants, takes and gives up the role from the Ayarlar screen, with a permanent record of each change and server rules that keep at least one DM in normal use.

## Requirements

### Requirement: Several DMs
Any number of users SHALL have the role "dm" at once. Every DM SHALL have the same powers, the ones the other capabilities give "the DM". A DM's own actions SHALL be checked against the role the user has when acting.

#### Scenario: Two DMs
- **WHEN** Gökay and Ayla both have the role "dm"
- **THEN** each of them sees the DM controls, and each may give LP, give cards and change the table settings

#### Scenario: Acting after losing the role
- **WHEN** Gökay takes the DM role from Ayla, and Ayla's device then tries to give Bora a card
- **THEN** the server denies it

### Requirement: Making a player a DM
A DM SHALL be able to make another user who has a profile a DM, with "DM yap" on that user's row in "Masaya erişim". It SHALL ask, in Turkish, whether to make that person a DM, and say that a DM has every DM power. After confirming, the person SHALL be a DM on every device, without a reload.

#### Scenario: Granting the role
- **WHEN** Gökay, a DM, chooses "DM yap" on Ayla's row and confirms
- **THEN** Ayla's role is "dm", her shell shows "DM" without a reload, and her row is marked DM

#### Scenario: Declining the question
- **WHEN** Gökay chooses "DM yap" on Ayla's row and then declines
- **THEN** Ayla stays a player

#### Scenario: A person who has not entered yet
- **WHEN** "cem@gmail.com" is on the list but Cem has never entered
- **THEN** Cem's row has no "DM yap"

### Requirement: Taking the role from another DM
A DM SHALL be able to take the DM role from another DM, with "DM'liği al" on that DM's row. It SHALL ask, in Turkish, whether to make that person a player, and say that their cards and LP stay. After confirming, the person SHALL be a player on every device, without a reload, and their DM-only screens and controls SHALL go away.

#### Scenario: Taking the role
- **WHEN** Gökay chooses "DM'liği al" on Ayla's row, while Ayla is a DM, and confirms
- **THEN** Ayla's role is "player", her shell shows "Oyuncu" without a reload, and her LP and cards are unchanged

#### Scenario: The person is on a DM-only screen
- **WHEN** Ayla has the "Masaya erişim" section open as a DM, and Gökay takes her DM role
- **THEN** the section disappears from Ayla's screen, and no error message is shown

### Requirement: Stepping down
A DM SHALL be able to give up their own DM role with "DM'likten çık" on their own row, only while at least one other user is a DM. It SHALL ask for confirmation. While they are the only DM, their row SHALL show no "DM'likten çık", and the server SHALL deny it.

#### Scenario: Stepping down with another DM
- **WHEN** Gökay and Ayla are DMs, and Gökay chooses "DM'likten çık" and confirms
- **THEN** Gökay is a player, and Ayla is still a DM

#### Scenario: The only DM
- **WHEN** Gökay is the only DM
- **THEN** his own row has no "DM'likten çık", and the server denies a write that makes him a player

### Requirement: Role changes are guarded by the server
The server SHALL accept a role change of a profile only from a DM, only from "player" to "dm" or from "dm" to "player", only together with the role change record that records it, and only to the role field. A DM making themselves a player SHALL name another user who is a DM at that moment. Players SHALL NOT change any role, their own included. Accounts not on the access list SHALL NOT change any role.

#### Scenario: A player makes themselves a DM
- **WHEN** Ayla, a player, writes the role "dm" into her own profile, with or without a record
- **THEN** the server denies it

#### Scenario: A change without its record
- **WHEN** Gökay, a DM, writes the role "dm" into Ayla's profile without a role change record
- **THEN** the server denies it

#### Scenario: A change with other fields
- **WHEN** Gökay makes Ayla a DM and changes her LP in the same write
- **THEN** the server denies it

#### Scenario: Stepping down without another DM
- **WHEN** Gökay, the only DM, makes himself a player and names Bora, a player, as the other DM
- **THEN** the server denies it

#### Scenario: An unknown role
- **WHEN** Gökay writes the role "admin" into Ayla's profile
- **THEN** the server denies it

### Requirement: Role change records
Each role change made in the app SHALL be stored permanently with who made it, when, whose role changed, the role before and the role after. Only a DM SHALL create one, together with the role change it records. Every signed-in user on the access list SHALL be able to read every record. No record SHALL be changed or deleted. Role changes made by the admin script SHALL have no record.

#### Scenario: A stored change
- **WHEN** Gökay makes Ayla a DM
- **THEN** a record names Gökay, the time, Ayla, "player" before and "dm" after

#### Scenario: A record without its change
- **WHEN** Gökay writes a role change record for Ayla without changing her role
- **THEN** the server denies it

#### Scenario: Changing a record
- **WHEN** any signed-in user, a DM included, tries to change or delete a role change record
- **THEN** the server denies it

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user, or from an account not on the list, tries to read a role change record
- **THEN** the server denies it

### Requirement: Role changes need a connection
Changing a role SHALL require a network connection. Offline, "Masaya erişim" SHALL show a Turkish message, and no role SHALL change.

#### Scenario: Offline change
- **WHEN** Gökay confirms "DM yap" on Ayla's row while his device is offline
- **THEN** a Turkish message says that a connection is needed, and Ayla stays a player

### Requirement: Role changes work while a pack is open
A role change SHALL be accepted while a pack or a True Word draft is open. It SHALL move no card and no balance.

#### Scenario: During a pack
- **WHEN** Bora has a pack open, and Gökay makes Ayla a DM
- **THEN** Ayla is a DM, and Bora's pack stays open
