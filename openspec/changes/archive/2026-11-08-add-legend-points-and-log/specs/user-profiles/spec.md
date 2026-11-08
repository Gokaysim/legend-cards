# Spec Delta

## MODIFIED Requirements

### Requirement: Users change only their own name and picture
The server SHALL let a signed-in user create only their own profile, and only with the role "player" and the current server time as creation time. It SHALL let them update only the name and picture of their own profile. It SHALL deny every other profile write from the application, including all deletes, any change to a role, and any write to another user's profile, even when the writer is the DM. The one exception is a player's LP, which the DM changes as the balances rules allow.

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
- **WHEN** a user tries to add a field other than the name and picture to their own profile
- **THEN** the server denies the write

#### Scenario: The DM changes a player's LP
- **WHEN** the DM changes a player's LP together with the ledger entry that records it
- **THEN** the server accepts the write, and no other field of the profile changes

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
