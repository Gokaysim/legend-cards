# Spec Delta

## Purpose

Gives every person who signs in a profile and a role. Every user is a player, and only an admin script can make someone the DM. Profiles are visible to all signed-in users, and the role decides which controls the application offers.

## ADDED Requirements

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
The server SHALL let a signed-in user create only their own profile, and only with the role "player" and the current server time as creation time. It SHALL let them update only the name and picture of their own profile. It SHALL deny every other profile write from the application, including all deletes, any change to a role, and any write to another user's profile, even when the writer is the DM.

#### Scenario: Claiming the DM role at creation
- **WHEN** a signed-in user tries to create their own profile with the role "dm"
- **THEN** the server denies the write

#### Scenario: Changing one's own role
- **WHEN** a player tries to change the role in their own profile
- **THEN** the server denies the write and the role does not change

#### Scenario: The DM edits another profile
- **WHEN** the DM tries to change another user's profile from the application
- **THEN** the server denies the write

#### Scenario: Extra fields
- **WHEN** a user tries to add a field other than the name and picture to their own profile
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
The shell SHALL show an "Oyuncular" list of every user who has a profile, with their name and picture, sorted by name. The DM SHALL be marked in the list. The list SHALL update in real time when someone signs up or a role changes.

#### Scenario: A new player signs up
- **WHEN** a new user signs in for the first time while another user has the application open
- **THEN** the new user appears in the other user's "Oyuncular" list without a reload

#### Scenario: Seeing who the DM is
- **WHEN** a player looks at the "Oyuncular" list
- **THEN** the DM's entry is marked as DM

### Requirement: DM-only controls
Controls meant only for the DM SHALL be shown to the DM and hidden from players. Until the signed-in user's profile has loaded, these controls SHALL stay hidden.

#### Scenario: A player opens a screen with DM controls
- **WHEN** a player opens a screen that contains a DM-only control
- **THEN** that control is not shown

#### Scenario: Profile still loading
- **WHEN** the signed-in user's profile has not loaded yet
- **THEN** no DM-only control is shown
