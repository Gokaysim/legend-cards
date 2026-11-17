# Spec Delta

## ADDED Requirements

### Requirement: Delaying a turn
While their character's combatant is active, its owner SHALL have "Turumu beklet" beside "Turumu bitirdim". It SHALL make the next combatant active and move the delaying combatant to the place right after it, for the rest of the fight. When the delaying combatant is last, the first combatant of the next round SHALL become active, and the delaying combatant SHALL move to second place. With one combatant, "Turumu beklet" SHALL be disabled.

#### Scenario: Ayla delays
- **WHEN** the order is "Goblin 1", "Thorn", "Elara", "Goblin 2", Ayla's "Thorn" is active in round 2, and Ayla selects "Turumu beklet"
- **THEN** every device shows "Goblin 1", "Elara", "Thorn", "Goblin 2", with "Elara" active in round 2

#### Scenario: Ending the delayed turn
- **WHEN** Ayla has delayed "Thorn" behind "Elara", and Bora selects "Turumu bitirdim" for "Elara"
- **THEN** "Thorn" is active, and Ayla sees "Sıra sende: Thorn"

#### Scenario: The delay stays
- **WHEN** Ayla has delayed "Thorn" behind "Elara" in round 2, and round 3 starts
- **THEN** "Elara" still comes before "Thorn"

#### Scenario: Delaying from the last place
- **WHEN** the order is "Goblin 1", "Elara", "Thorn", Ayla's "Thorn" is active in round 2, and Ayla selects "Turumu beklet"
- **THEN** the order is "Goblin 1", "Thorn", "Elara", with "Goblin 1" active in round 3

#### Scenario: The next one is told
- **WHEN** Ayla delays "Thorn", and Bora's "Elara" comes next
- **THEN** Bora sees "Sıra sende: Elara"

#### Scenario: Alone in the fight
- **WHEN** "Thorn" is the only combatant and is active
- **THEN** Ayla's "Turumu beklet" is disabled

#### Scenario: Pressing twice
- **WHEN** Ayla selects "Turumu beklet" twice quickly
- **THEN** "Thorn" moves one place only, and "Elara" stays active

#### Scenario: Offline
- **WHEN** Ayla has no connection while "Thorn" is active
- **THEN** her "Turumu beklet" is disabled, with a note that it needs a connection

## MODIFIED Requirements

### Requirement: Who changes a combat
Only the DM SHALL open, start, reorder, end a combat, add or remove combatants, step back, and clear a roll. A player SHALL only write the roll of their own character's combatant, once and together with its roll record, move the turn on by one while their character is active, and delay their active character by one place as in "Delaying a turn". The server SHALL deny the rest, and every request without a signed-in user.

#### Scenario: A player reorders
- **WHEN** Ayla tries to move "Thorn" to the top
- **THEN** the server denies it

#### Scenario: A forged total
- **WHEN** Ayla writes a total for "Thorn" that differs from the roll record she writes with it
- **THEN** the server denies it

#### Scenario: Signed out
- **WHEN** a request without a signed-in user reads the combat
- **THEN** the server denies it

#### Scenario: Delaying another player's character
- **WHEN** Bora's "Elara" is active and Ayla tries to delay it
- **THEN** the server denies it

#### Scenario: A delay that moves further
- **WHEN** Ayla's "Thorn" is active and Ayla tries to move it two places down while making the next combatant active
- **THEN** the server denies it
