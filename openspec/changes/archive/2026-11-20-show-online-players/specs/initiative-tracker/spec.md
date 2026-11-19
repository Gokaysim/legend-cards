# Spec Delta

## MODIFIED Requirements

### Requirement: Setting up a combat
"Savaş başlat" SHALL show the table's unarchived characters grouped by owner, with the characters of every player who is online (spec: player-presence, "Who counts as online") checked, and the characters of offline players and the DM's own characters unchecked. Each offline player's group SHALL be marked as offline. While presence has not loaded, every player's characters SHALL be checked. The checked characters SHALL be chosen when the setup opens: a player who comes or goes while it is open SHALL NOT change them. The DM SHALL be able to check and uncheck them, and add NPCs. "Modifier iste" SHALL open the combat with the checked characters and the added NPCs, and SHALL be disabled while there are none. Closing the setup SHALL store nothing.

#### Scenario: The default choice
- **WHEN** Ayla owns "Thorn" and "Kuzgun", Bora owns "Elara", the DM owns "Goblin şefi", Ayla and Bora are online, and the DM selects "Savaş başlat"
- **THEN** "Thorn", "Kuzgun" and "Elara" are checked, and "Goblin şefi" is not

#### Scenario: An offline player
- **WHEN** Ayla owns "Thorn", Bora owns "Elara", Ayla is online, Bora is offline, and the DM selects "Savaş başlat"
- **THEN** "Thorn" is checked, "Elara" is not, and Bora's group is marked as offline

#### Scenario: Bringing an offline player's character in
- **WHEN** Bora is offline, the DM checks "Elara" in the setup and selects "Modifier iste"
- **THEN** a combat opens with "Elara" among its combatants

#### Scenario: Presence not loaded
- **WHEN** nobody's presence has loaded yet, and the DM selects "Savaş başlat"
- **THEN** every player's characters are checked, and no group is marked as offline

#### Scenario: A player comes online during the setup
- **WHEN** the setup is open with "Elara" unchecked because Bora was offline, and Bora opens the application
- **THEN** "Elara" stays unchecked, and Bora's group is no longer marked as offline

#### Scenario: Asking for initiative
- **WHEN** the DM unchecks "Kuzgun" and selects "Modifier iste"
- **THEN** a combat opens with "Thorn" and "Elara", and every device shows it

#### Scenario: Nobody chosen
- **WHEN** the DM unchecks every character and has added no NPC
- **THEN** "Modifier iste" is disabled
