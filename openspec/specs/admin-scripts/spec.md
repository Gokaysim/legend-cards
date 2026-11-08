# admin-scripts Specification

## Purpose

Provides command-line scripts that maintain Legend Card Manager data with admin rights, outside the application's access rules. The same scripts work against the local emulators and against a real project, safely, so data work is never done twice.

## Requirements

### Requirement: Emulators by default
An admin script run without naming a project SHALL act only on the local emulators of the demo project. If the emulators are not reachable, it SHALL stop with a clear message and change nothing.

#### Scenario: Running against the emulators
- **WHEN** a developer runs an admin script without a project option while the emulators are running
- **THEN** the script changes data only in the local emulators

#### Scenario: Emulators not running
- **WHEN** a developer runs an admin script without a project option while the emulators are stopped
- **THEN** the script stops with a message saying the emulators are not reachable, and no data changes anywhere

### Requirement: Real project only on explicit request
An admin script SHALL act on a real project only when that project's ID is passed explicitly. Before changing anything, it SHALL name the target project and wait for confirmation, unless the run passes an explicit flag that skips the question. Without confirmation it SHALL change nothing.

#### Scenario: Confirmed run on a real project
- **WHEN** an admin runs a script with a real project ID and confirms the named project
- **THEN** the script changes data in that project

#### Scenario: Declined confirmation
- **WHEN** an admin runs a script with a real project ID and does not confirm
- **THEN** the script stops and no data changes

### Requirement: Setting a user's role
A role script SHALL set the role of the user with a given email address to "dm" or "player". It SHALL report the user's name, the old role, and the new role. Setting the role a user already has SHALL change nothing and say so.

#### Scenario: Making someone the DM
- **WHEN** an admin runs the role script with a player's email address and the role "dm"
- **THEN** that user's profile has the role "dm", and the script reports their name, "player", and "dm"

#### Scenario: Removing the DM role
- **WHEN** an admin runs the role script with the DM's email address and the role "player"
- **THEN** that user's profile has the role "player"

#### Scenario: Role already set
- **WHEN** an admin sets a user's role to the role they already have
- **THEN** nothing changes and the script says the role was already set

### Requirement: Role script refuses unknown users
The role script SHALL stop without changing anything when no account uses the given email address, when the account has no profile yet, or when the role is neither "dm" nor "player".

#### Scenario: Unknown email address
- **WHEN** an admin runs the role script with an email address that has no account
- **THEN** the script stops with a message that no such user exists, and nothing changes

#### Scenario: Account without a profile
- **WHEN** an admin runs the role script for an account that has never opened the application
- **THEN** the script stops with a message that the user must sign in to the application once first, and nothing changes

#### Scenario: Invalid role
- **WHEN** an admin runs the role script with a role other than "dm" or "player"
- **THEN** the script stops with a message listing the valid roles, and nothing changes

### Requirement: Importing cards from CSV files
A card import script SHALL load card definitions from two CSV files: one for the Legend cards (normal and Blessed) and one for the Cursed cards. Without file options, it SHALL use both files kept in the repository. Given only one of the two files, it SHALL import only that deck and leave the other deck unchanged.

#### Scenario: Importing the repository data
- **WHEN** an admin runs the card import script without file options against empty emulators
- **THEN** the emulators hold 590 Legend cards (571 normal and 19 Blessed) and 154 Cursed cards

#### Scenario: Importing one deck
- **WHEN** an admin runs the card import script with only a Cursed card file
- **THEN** the Cursed cards are imported, and no Legend card changes

### Requirement: Card files are validated before writing
The import SHALL check every file completely before it writes anything. If a required column is missing, or if any row is invalid, it SHALL stop, list each problem with its file and row number, and change nothing. Two rows in one file whose names match SHALL count as invalid.

#### Scenario: Wrong file
- **WHEN** an admin passes the True Words file as the Legend card file
- **THEN** the script reports the missing columns and stops, and no card changes

#### Scenario: Invalid rarity
- **WHEN** one row of the Legend card file has the rarity "Epic"
- **THEN** the script reports that row's number and its rarity, and no card changes, including the valid rows

#### Scenario: Duplicate names
- **WHEN** two rows of the Legend card file are named "Aboleth's Eyes" and "Aboleths Eyes"
- **THEN** the script reports both row numbers as a duplicate, and no card changes

### Requirement: Card file columns
The Legend card file SHALL have the columns Name, Set, Cost, Rarity, Text, and Mechanic Pack. The Cursed card file SHALL have the columns Name, Cost, and Text. Column names SHALL match regardless of case, and other columns SHALL be ignored, for example "Drawn?" and "Shuffle". Every value SHALL be trimmed of surrounding spaces.

#### Scenario: Extra columns
- **WHEN** the Legend card file also has the columns "Drawn?" and "Shuffle"
- **THEN** the import ignores them, and no card stores their values

### Requirement: Legend card rows
A Legend card row whose Set is "Blessed" SHALL become a Blessed card, and its rarity SHALL be "—" or empty. Every other row SHALL become a normal card with the rarity "Common" or "Rare". A row with an empty Set SHALL be skipped with a warning, as the legacy app hid such cards. An empty cost or "—" SHALL mean the card has no cost.

#### Scenario: A Blessed row
- **WHEN** the Legend card file has a row with the set "Blessed", the rarity "—", and the mechanic pack "Risk & Reward"
- **THEN** that card is stored as Blessed, with no set, no rarity, no cost, and the mechanic pack "Risk & Reward"

#### Scenario: A row without a set
- **WHEN** the Legend card file has the row "The Cartographer" with an empty Set
- **THEN** that row is not imported, and the report warns that it was skipped because it has no set

### Requirement: Cursed card rows
Every row of the Cursed card file SHALL become a Cursed card with its name, cost, and text. A Set column in that file SHALL be ignored.

#### Scenario: A Cursed row
- **WHEN** the Cursed card file has the row "Visions of Death" with the set "Cursed" and the cost "1"
- **THEN** that card is stored as Cursed, with the cost "1" and no set

### Requirement: Re-importing updates cards by name
A row SHALL match a stored card of the same deck whose name is equal when case, accents, spaces, and punctuation are ignored. A matched card whose definition differs SHALL be updated. A matched card that is the same SHALL NOT be written. A row without a match SHALL add a new card. An import SHALL NOT change any card data other than the definition and the retired flag.

#### Scenario: Running the same import twice
- **WHEN** an admin runs the card import a second time with the same files
- **THEN** no card is written, and the report says every card is unchanged

#### Scenario: A changed text
- **WHEN** an admin changes one card's text in the Legend card file and runs the import
- **THEN** that card's text is updated, its identity stays the same, and the report counts one updated card

### Requirement: Cards missing from their file are retired
A stored card of an imported deck that has no row in that deck's file SHALL be marked as retired. It SHALL NOT be deleted. A retired card that appears in its file again SHALL become active again, with the definition from the file.

#### Scenario: A card removed from the file
- **WHEN** an admin removes a card's row from the Cursed card file and runs the import
- **THEN** that card is marked as retired and is still stored

#### Scenario: A card comes back
- **WHEN** an admin adds that row back and runs the import again
- **THEN** the card is active again, under the same identity

### Requirement: Import report
After an import, the script SHALL report in Turkish, for each deck, how many cards were added, updated, unchanged, retired, and brought back. It SHALL list warnings for skipped rows, for set codes without an official name, and for mechanic packs that are not among the eight known ones. Warnings SHALL NOT stop the import.

#### Scenario: Report after the first import
- **WHEN** an admin imports the repository data into empty emulators
- **THEN** the report shows 590 Legend cards and 154 Cursed cards added, and warns that "The Cartographer" was skipped

#### Scenario: Unknown set code
- **WHEN** the Legend card file has a card with a set code that is not in the official set list
- **THEN** the card is imported, and the report warns about that set code

### Requirement: Dry run
With a dry-run option, the card import SHALL validate the files and print the same report it would print for a real import, without writing any card.

#### Scenario: Previewing an import
- **WHEN** an admin runs the card import with the dry-run option after removing a row from a file
- **THEN** the report shows one card that would be retired, and no card changes
