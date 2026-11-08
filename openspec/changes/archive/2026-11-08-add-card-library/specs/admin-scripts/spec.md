# Spec Delta

## ADDED Requirements

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
