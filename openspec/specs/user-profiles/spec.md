# user-profiles Specification

## Purpose

Gives every person who signs in a profile and a role. Every user is a player, and only an admin script can make someone the DM. Profiles are visible to all signed-in users, and the role decides which controls the application offers.

## Requirements

### Requirement: Player profile at first sign-in
When a user signs in and has no profile yet, the application SHALL create one with their Google display name and profile picture, the role "player", and the time it was created. A profile SHALL NOT store the user's email address.

#### Scenario: First sign-in
- **WHEN** a user signs in for the first time
- **THEN** a profile exists for them with their Google display name and picture, the role "player", and its creation time

#### Scenario: No email in the profile
- **WHEN** any signed-in user reads another user's profile
- **THEN** the profile contains no email address

### Requirement: Profile kept in step with the Google account
When a signed-in user starts the application and their Google display name or picture differs from their profile, the application SHALL update the profile's name and picture. It SHALL NOT change the role or the creation time.

#### Scenario: Changed Google name
- **WHEN** a player changes their Google display name and opens the application again
- **THEN** their profile shows the new name, and their role and creation time are unchanged

### Requirement: Profiles readable by every signed-in user
Every signed-in user SHALL be able to read every profile, including the roles. Signed-out requests SHALL be denied.

#### Scenario: A player reads the user list
- **WHEN** a signed-in player reads the profiles
- **THEN** they get every user's profile, including who the DM is

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user tries to read a profile
- **THEN** the server denies it

### Requirement: Users change only their own name and picture
The server SHALL let a signed-in user create only their own profile, only as a player and with the server time as creation time, and update only its name, its picture and its dice style, which SHALL be one of the 8 dice styles (spec: dice-rolls, "Dice styles"). It SHALL deny every other profile write from the application, including all deletes, any role change, and any write to another user's profile, even by the DM. The exceptions are a player's LP: the DM changes it under the balances rules, and a player pays 1 LP for their own draw under the card-draws rules.

#### Scenario: Claiming the DM role at creation
- **WHEN** a signed-in user tries to create their own profile with the role "dm"
- **THEN** the server denies the write

#### Scenario: Changing one's own role
- **WHEN** a player tries to change the role in their own profile
- **THEN** the server denies the write and the role does not change

#### Scenario: The DM edits another profile
- **WHEN** the DM tries to change another user's name, picture, or role from the application
- **THEN** the server denies the write

#### Scenario: Extra fields
- **WHEN** a user tries to add a field other than the name, the picture and the dice style to their own profile
- **THEN** the server denies the write

#### Scenario: Choosing a dice style
- **WHEN** Bora sets his own dice style to Walnut
- **THEN** the server accepts the write, and no other field of his profile changes

#### Scenario: An unknown dice style
- **WHEN** Bora sets his own dice style to "Gold"
- **THEN** the server denies the write

#### Scenario: Another user's dice style
- **WHEN** Ayla, or the DM, sets Bora's dice style
- **THEN** the server denies the write

#### Scenario: The DM changes a player's LP
- **WHEN** the DM changes a player's LP together with the ledger entry that records it
- **THEN** the server accepts the write, and no other field of the profile changes

#### Scenario: A player pays for a draw
- **WHEN** a player draws a card and pays 1 LP, together with the draw and its ledger entry
- **THEN** the server accepts the lower LP, and no other field of the profile changes

#### Scenario: A player pays another player's LP
- **WHEN** a player lowers another player's LP for a draw
- **THEN** the server denies the write

### Requirement: Role shown in the shell
The shell SHALL show the signed-in user's role next to their name: "DM" for the DM, "Oyuncu" for a player. When the role changes, the shell SHALL show the new role without a page reload.

#### Scenario: The DM signs in
- **WHEN** the DM is signed in
- **THEN** the navigation area shows "DM" next to their name

#### Scenario: Role granted while the app is open
- **WHEN** an admin makes a signed-in player the DM while that player has the application open
- **THEN** their shell switches from "Oyuncu" to "DM" without a reload

### Requirement: Player list
The shell SHALL show an "Oyuncular" list of every user who has a profile, with their name and picture, sorted by name. The DM SHALL be marked in the list. The list SHALL update in real time when someone signs up or a role changes. Each name SHALL open that user's hand on the "Oyuncu elleri" screen, and the user whose hand is shown SHALL be marked. Each player's entry SHALL show their LP, live. The DM's entry SHALL show no LP.

#### Scenario: A new player signs up
- **WHEN** a new user signs in for the first time while another user has the application open
- **THEN** the new user appears in the other user's "Oyuncular" list without a reload

#### Scenario: Seeing who the DM is
- **WHEN** a player looks at the "Oyuncular" list
- **THEN** the DM's entry is marked as DM

#### Scenario: Opening a player's hand
- **WHEN** a user selects Bora in the "Oyuncular" list
- **THEN** the "Oyuncu elleri" screen shows Bora's hand, and Bora is marked in the list

#### Scenario: Seeing LP in the list
- **WHEN** Ayla has 7 LP
- **THEN** her entry in the "Oyuncular" list shows "7 LP", and the DM's entry shows no LP

#### Scenario: LP changes while the list is open
- **WHEN** the DM adds 2 LP to Ayla while another user has the application open
- **THEN** Ayla's entry in that user's list shows the new LP without a reload

### Requirement: DM-only controls
Controls meant only for the DM SHALL be shown to the DM and hidden from players. Until the signed-in user's profile has loaded, these controls SHALL stay hidden.

#### Scenario: A player opens a screen with DM controls
- **WHEN** a player opens a screen that contains a DM-only control
- **THEN** that control is not shown

#### Scenario: Profile still loading
- **WHEN** the signed-in user's profile has not loaded yet
- **THEN** no DM-only control is shown
