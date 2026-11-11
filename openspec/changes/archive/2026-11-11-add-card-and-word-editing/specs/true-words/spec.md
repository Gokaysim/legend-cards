# Spec Delta

## MODIFIED Requirements

### Requirement: True Word definitions
Each True Word SHALL have a name, a cost as written (for example "1", "0" or "X"), an effect text, and a status: draft, active or retired (spec: definition-editing). Every signed-in user SHALL be able to read the active and retired words. Only the DM SHALL be able to read a draft. Only the import script and the DM SHALL write words. A retired word SHALL stay with the players who know it, with its last stored definition. A word that is not active SHALL never be offered in a draft or taught.

#### Scenario: Reading the words
- **WHEN** a signed-in user opens the True Words screen after the words were imported
- **THEN** they see every active word with its name, cost and text

#### Scenario: Writing a word from the application
- **WHEN** a signed-in player tries to create, change or delete a word
- **THEN** the server denies it

#### Scenario: A player reads a draft
- **WHEN** a signed-in player tries to read the draft word "Echo"
- **THEN** the server denies it

#### Scenario: A retired word
- **WHEN** the DM retires "Abyss", which Ayla knows
- **THEN** "Abyss" stays among Ayla's True Words, and no draft offers it and the DM cannot teach it

#### Scenario: A draft word
- **WHEN** "Echo" is a draft
- **THEN** no draft offers it, the DM cannot teach it, and no player's True Words screen lists it

### Requirement: True Words screen
The True Words screen SHALL list every active word, sorted by name, with its name, its cost shown as "<cost> LP", and its visible text. Text in square brackets SHALL be hidden, as in the card library. A player SHALL see the screen for themselves. The DM SHALL choose the player. The words the chosen player knows SHALL be marked "Biliyor". The DM SHALL also get "+ True Word ekle", "✎ Düzenle" on each word, and the status filter, starting at "Yayında".

#### Scenario: A player's view
- **WHEN** Ayla, who knows "Abyss", opens the True Words screen
- **THEN** every active word is listed, and "Abyss" is marked "Biliyor"

#### Scenario: The DM chooses a player
- **WHEN** the DM chooses Bora on the True Words screen
- **THEN** the words Bora knows are marked, and the draft controls act for Bora

#### Scenario: An X cost
- **WHEN** the list shows "Dragon", whose cost is "X"
- **THEN** its cost reads "X LP"

#### Scenario: The DM's drafts
- **WHEN** the DM chooses "Taslak" in the status filter
- **THEN** only the draft words are listed, each marked "Taslak", with its "✎ Düzenle" control

#### Scenario: A player's controls
- **WHEN** Ayla opens the True Words screen
- **THEN** she sees no status filter, no "+ True Word ekle" and no "✎ Düzenle"
