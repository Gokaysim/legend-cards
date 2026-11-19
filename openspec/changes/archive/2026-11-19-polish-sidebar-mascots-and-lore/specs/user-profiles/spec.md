# Spec Delta

## ADDED Requirements

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
