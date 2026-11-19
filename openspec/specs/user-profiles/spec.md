# user-profiles Specification

## Purpose

Gives every person who signs in a profile and a role. Every user starts as a player; a DM can make others DMs from the app (spec: dm-roles), and the admin script can set any role. Profiles are visible to all signed-in users, and the role decides which controls the application offers.

## Requirements

### Requirement: Player profile at first sign-in
When a user whose account is on the access list (spec: table-access, "Accounts on the list") signs in and has no profile yet, the application SHALL create one with their Google display name and profile picture, the role "player", and the time it was created. An account that is not on the list SHALL get no profile. A profile SHALL NOT store the user's email address.

#### Scenario: First sign-in
- **WHEN** a user whose account is on the list signs in for the first time
- **THEN** a profile exists for them with their Google display name and picture, the role "player", and its creation time

#### Scenario: Sign-in with an account that is not on the list
- **WHEN** Cem signs in with an account that is not on the list
- **THEN** no profile is created for Cem

#### Scenario: No email in the profile
- **WHEN** any signed-in user reads another user's profile
- **THEN** the profile contains no email address

### Requirement: Profile kept in step with the Google account
When a signed-in user starts the application and their Google display name or picture differs from their profile, the application SHALL update the profile's name and picture. It SHALL NOT change the role or the creation time.

#### Scenario: Changed Google name
- **WHEN** a player changes their Google display name and opens the application again
- **THEN** their profile shows the new name, and their role and creation time are unchanged

### Requirement: Profiles readable by every signed-in user
Every signed-in user whose account is on the access list SHALL be able to read every profile, including the roles. Signed-out requests, and requests from accounts that are not on the list, SHALL be denied.

#### Scenario: A player reads the user list
- **WHEN** a signed-in player reads the profiles
- **THEN** they get every user's profile, including who the DM is

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user tries to read a profile
- **THEN** the server denies it

#### Scenario: Unlisted read
- **WHEN** Cem, signed in with an account that is not on the list, tries to read a profile
- **THEN** the server denies it

### Requirement: Users change only their own name and picture
The server SHALL let a signed-in user whose account is on the access list create only their own profile, only as a player and with the server time as creation time, and update only its name, its picture and its dice style, which SHALL be one of the 8 dice styles (spec: dice-rolls, "Dice styles"). It SHALL deny every other profile write from the application, including all deletes, any write to another user's name, picture or dice style, even by the DM, and every write from an account that is not on the list. The exceptions are a user's LP, changed under the balances, card-draws, pack-shop, card-holdings and true-words rules, and a role, changed by a DM under the dm-roles rules (spec: dm-roles, "Role changes are guarded by the server").

#### Scenario: Claiming the DM role at creation
- **WHEN** a signed-in user tries to create their own profile with the role "dm"
- **THEN** the server denies the write

#### Scenario: Creating a profile without being on the list
- **WHEN** Cem, whose account is not on the list, tries to create a player profile for Cem's own account
- **THEN** the server denies the write

#### Scenario: Changing one's own role
- **WHEN** a player tries to change the role in their own profile
- **THEN** the server denies the write and the role does not change

#### Scenario: The DM edits another profile
- **WHEN** the DM tries to change another user's name or picture from the application
- **THEN** the server denies the write

#### Scenario: The DM changes a role with its record
- **WHEN** the DM makes Ayla a DM together with the role change record
- **THEN** the server accepts the write, and no other field of Ayla's profile changes

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

#### Scenario: The DM changes their own LP
- **WHEN** the DM changes their own LP together with the ledger entry that records it
- **THEN** the server accepts the write, and no other field of the profile changes

#### Scenario: A player pays for a draw
- **WHEN** a player draws a card and pays 1 LP, together with the draw and its ledger entry
- **THEN** the server accepts the lower LP, and no other field of the profile changes

#### Scenario: A player pays another player's LP
- **WHEN** a player lowers another player's LP for a draw
- **THEN** the server denies the write

### Requirement: Role shown in the shell
The shell SHALL show the signed-in user's role next to their name: "DM" for a DM, "Oyuncu" for a player. When the role changes, whether by a DM in the app or by the admin script, the shell SHALL show the new role without a page reload.

#### Scenario: The DM signs in
- **WHEN** the DM is signed in
- **THEN** the navigation area shows "DM" next to their name

#### Scenario: Role granted while the app is open
- **WHEN** an admin makes a signed-in player the DM while that player has the application open
- **THEN** their shell switches from "Oyuncu" to "DM" without a reload

#### Scenario: Role granted by a DM while the app is open
- **WHEN** a DM makes Ayla a DM while Ayla has the application open
- **THEN** Ayla's shell switches from "Oyuncu" to "DM" without a reload

#### Scenario: Role taken while the app is open
- **WHEN** a DM takes the DM role from Ayla while Ayla has the application open
- **THEN** Ayla's shell switches from "DM" to "Oyuncu", and her DM-only controls go away, without a reload

### Requirement: Player list
The shell SHALL show an "Oyuncular" list of every user who has a profile, with their name and picture, sorted with the online users first (spec: player-presence, "Who counts as online") and by name within each group. Every DM SHALL be marked in the list. The list SHALL update in real time when someone on the access list enters for the first time or a role changes. A user whose address was removed from the access list SHALL stay in the list. Each name SHALL open that user's hand on the "Oyuncu elleri" screen, and the user whose hand is shown SHALL be marked. Each entry, a DM's included, SHALL show that user's LP, live.

#### Scenario: A new player signs up
- **WHEN** a user whose account is on the list signs in for the first time while another user has the application open
- **THEN** the new user appears in the other user's "Oyuncular" list without a reload

#### Scenario: A removed player stays
- **WHEN** the DM removes "ayla@gmail.com" from the access list
- **THEN** Ayla stays in the "Oyuncular" list with Ayla's LP

#### Scenario: Seeing who the DM is
- **WHEN** a player looks at the "Oyuncular" list
- **THEN** the DM's entry is marked as DM

#### Scenario: Two DMs
- **WHEN** Gökay and Ayla are DMs, and Bora looks at the "Oyuncular" list
- **THEN** both Gökay's and Ayla's entries are marked as DM

#### Scenario: Opening a player's hand
- **WHEN** a user selects Bora in the "Oyuncular" list
- **THEN** the "Oyuncu elleri" screen shows Bora's hand, and Bora is marked in the list

#### Scenario: Seeing LP in the list
- **WHEN** Ayla has 7 LP and the DM has 2 LP
- **THEN** her entry in the "Oyuncular" list shows "7 LP", and the DM's entry shows "2 LP"

#### Scenario: LP changes while the list is open
- **WHEN** the DM adds 2 LP to Ayla while another user has the application open
- **THEN** Ayla's entry in that user's list shows the new LP without a reload

#### Scenario: A role changes while the list is open
- **WHEN** a DM makes Ayla a DM while Bora has the application open
- **THEN** Ayla's entry in Bora's list is marked as DM without a reload

#### Scenario: Online users first
- **WHEN** Can and Gökay are online, and Ayla, Bora and Deniz are offline
- **THEN** the list shows Can, Gökay, Ayla, Bora, Deniz in that order

#### Scenario: Someone comes online
- **WHEN** Deniz, who was offline, opens the application while Bora has the list open
- **THEN** Deniz moves into the online group in Bora's list without a reload

#### Scenario: Before presence has loaded
- **WHEN** the profiles have loaded but nobody's presence has loaded yet
- **THEN** the list shows every user, sorted by name, with only the signed-in user marked online

#### Scenario: Other lists keep the name order
- **WHEN** Can is online and Ayla is offline, and the DM opens a list of users outside the "Oyuncular" list
- **THEN** Ayla comes before Can there, as before

### Requirement: DM-only controls
Controls meant only for the DM SHALL be shown to the DM and hidden from players. Until the signed-in user's profile has loaded, these controls SHALL stay hidden.

#### Scenario: A player opens a screen with DM controls
- **WHEN** a player opens a screen that contains a DM-only control
- **THEN** that control is not shown

#### Scenario: Profile still loading
- **WHEN** the signed-in user's profile has not loaded yet
- **THEN** no DM-only control is shown

### Requirement: Collapsing the player list
The "Oyuncular" heading SHALL be a toggle that shows and hides the list, with the number of users in the list next to it, in the sidebar and in the mobile menu. It SHALL tell screen readers whether the list is open. The list SHALL start open. The device SHALL remember the choice across reloads, the same for the sidebar and the mobile menu. Nothing about it SHALL be stored for the account.

#### Scenario: Closing the list
- **WHEN** a user selects "Oyuncular" while 5 users are in the list
- **THEN** the names are hidden, and the heading still shows "Oyuncular" with 5

#### Scenario: Opening it again
- **WHEN** the user selects "Oyuncular" on the closed list
- **THEN** the names are shown again

#### Scenario: After a reload
- **WHEN** a user closed the list and reloads the browser
- **THEN** the list is still closed

#### Scenario: The mobile menu
- **WHEN** a user closed the list in the sidebar, and later opens the mobile menu on the same device in a narrow window
- **THEN** the list in the mobile menu is closed

#### Scenario: Another device
- **WHEN** a user closed the list on a desktop and opens the application on a phone for the first time
- **THEN** the list on the phone is open

#### Scenario: Live while closed
- **WHEN** a new user enters for the first time while another user's list is closed
- **THEN** the count next to "Oyuncular" goes up without a reload

### Requirement: Online mark in the player list
Each online user's entry in the "Oyuncular" list SHALL carry a mark on their picture, and screen readers SHALL announce the entry as online. The link that opens the user's hand SHALL still be named by the user alone. An offline user's entry SHALL carry no mark. The mark SHALL change live as users come and go.

#### Scenario: An online player
- **WHEN** Ayla is online and Bora looks at the list
- **THEN** Ayla's entry shows the online mark, and a screen reader hears that Ayla is online

#### Scenario: An offline player
- **WHEN** Can is offline
- **THEN** Can's entry shows no online mark

#### Scenario: Someone goes offline
- **WHEN** Ayla closes the application while Bora has the list open
- **THEN** Ayla's mark disappears from Bora's list without a reload

### Requirement: Online count next to the heading
Next to "Oyuncular", after the number of users, the heading SHALL show how many users are online, in the form "(6 · 3 çevrimiçi)". It SHALL show it whether the list is open or closed, and whether offline users are hidden or not. Until presence has loaded, the heading SHALL show only the number of users.

#### Scenario: Three of six online
- **WHEN** 6 users are in the list and 3 of them are online
- **THEN** the heading reads "Oyuncular (6 · 3 çevrimiçi)"

#### Scenario: Counting while closed
- **WHEN** the list is closed and another user comes online
- **THEN** the online number next to the heading goes up without a reload

### Requirement: Hiding offline users
While the "Oyuncular" list is open, a small icon button next to the heading SHALL hide and show the offline users. It SHALL tell screen readers its purpose and whether hiding is on. Offline users SHALL be shown at first. The device SHALL remember the choice across reloads, the same for the sidebar and the mobile menu. Nothing about it SHALL be stored for the account.

#### Scenario: Hiding offline users
- **WHEN** Ayla and Gökay are online, Bora and Can are offline, and a user selects the icon
- **THEN** the list shows only Ayla and Gökay, and the heading still reads "Oyuncular (4 · 2 çevrimiçi)"

#### Scenario: Showing them again
- **WHEN** the user selects the icon again
- **THEN** Bora and Can are shown again

#### Scenario: Someone comes online while hidden
- **WHEN** offline users are hidden and Bora opens the application
- **THEN** Bora appears in the list without a reload

#### Scenario: The shown hand stays
- **WHEN** offline users are hidden and the "Oyuncu elleri" screen shows Can's hand while Can is offline
- **THEN** Can stays in the list, marked as the hand shown, without the online mark

#### Scenario: Remembered on the device
- **WHEN** a user hid offline users in the sidebar, reloads the browser and opens the mobile menu in a narrow window
- **THEN** the mobile menu's list hides offline users too

#### Scenario: The list is closed
- **WHEN** the "Oyuncular" list is closed
- **THEN** the hide icon is not shown

#### Scenario: Before presence has loaded
- **WHEN** offline users are hidden and nobody's presence has loaded yet
- **THEN** the list shows every user
