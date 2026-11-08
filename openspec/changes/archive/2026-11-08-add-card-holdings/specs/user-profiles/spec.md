# Spec Delta

## MODIFIED Requirements

### Requirement: Player list
The shell SHALL show an "Oyuncular" list of every user who has a profile, with their name and picture, sorted by name. The DM SHALL be marked in the list. The list SHALL update in real time when someone signs up or a role changes. Each name SHALL open that user's hand on the "Oyuncu elleri" screen, and the user whose hand is shown SHALL be marked.

#### Scenario: A new player signs up
- **WHEN** a new user signs in for the first time while another user has the application open
- **THEN** the new user appears in the other user's "Oyuncular" list without a reload

#### Scenario: Seeing who the DM is
- **WHEN** a player looks at the "Oyuncular" list
- **THEN** the DM's entry is marked as DM

#### Scenario: Opening a player's hand
- **WHEN** a user selects Bora in the "Oyuncular" list
- **THEN** the "Oyuncu elleri" screen shows Bora's hand, and Bora is marked in the list
