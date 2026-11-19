# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
