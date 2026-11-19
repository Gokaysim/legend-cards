# Spec Delta

## ADDED Requirements

### Requirement: Combats of any size
A combat SHALL open with any mix of characters and NPCs up to the 50-combatant limit, however many of them are characters. The same SHALL hold for characters added with "+ Ekle", while the rolls come in and during the fight.

#### Scenario: A full table
- **WHEN** the setup has 12 characters checked, the DM adds "Goblin" with the count 6, and selects "Modifier iste"
- **THEN** a combat opens with the 12 characters and Goblin 1 to Goblin 6, and every device shows all 18

#### Scenario: Fifty combatants
- **WHEN** the setup has 26 characters checked, the DM adds two groups of 12 NPCs, and selects "Modifier iste"
- **THEN** a combat opens with all 50 combatants

#### Scenario: Many characters added later
- **WHEN** a combat holds 2 combatants and the DM adds 10 characters with "+ Ekle"
- **THEN** the combat holds all 12

#### Scenario: Many characters added during the fight
- **WHEN** the fight is in round 2 and the DM adds 10 characters with "+ Ekle"
- **THEN** the 10 characters are last, marked "elle eklendi", in the order the DM added them

### Requirement: A setup that is cut short
When a combat has opened but some of the chosen characters could not be added, the combat SHALL stay open with the combatants already in it, and the DM SHALL see a message that names the characters left out and says that "+ Ekle" adds them. The same SHALL hold when "+ Ekle" adds only some of the chosen characters.

#### Scenario: The connection drops during the setup
- **WHEN** the DM opens a combat with 12 characters and "Goblin" ×4, and the connection drops after the first characters are in
- **THEN** the combat is open with the characters that were added and the four goblins, rolled, and the DM's message names the other characters and points to "+ Ekle"

#### Scenario: Nothing was written
- **WHEN** opening a combat fails before the combat is open
- **THEN** no combat is open, and the DM sees the same message as before for a failed step
