# Spec Delta

## MODIFIED Requirements

### Requirement: Importing cards from CSV files
A card import script SHALL load card definitions from two CSV files: one for the Legend cards (normal and Blessed) and one for the Cursed cards. Without file options, it SHALL use both files kept in the repository. Given only one of the two files, it SHALL import only that deck and leave the other deck unchanged.

#### Scenario: Importing the repository data
- **WHEN** an admin runs the card import script without file options against empty emulators
- **THEN** the emulators hold 591 Legend cards (572 normal, 3 of them drafts, and 19 Blessed) and 154 Cursed cards

#### Scenario: Importing one deck
- **WHEN** an admin runs the card import script with only a Cursed card file
- **THEN** the Cursed cards are imported, and no Legend card changes

### Requirement: Card files are validated before writing
The import SHALL check every file completely before it writes anything. If a required column is missing, or if any row is invalid, it SHALL stop, list each problem with its file and row number, and change nothing. Two rows in one file whose names match SHALL count as invalid. An empty value SHALL NOT make a row invalid: it makes the card a draft.

#### Scenario: Wrong file
- **WHEN** an admin passes the True Words file as the Legend card file
- **THEN** the script reports the missing columns and stops, and no card changes

#### Scenario: Invalid rarity
- **WHEN** one row of the Legend card file has the rarity "Epic"
- **THEN** the script reports that row's number and its rarity, and no card changes, including the valid rows

#### Scenario: Duplicate names
- **WHEN** two rows of the Legend card file are named "Aboleth's Eyes" and "Aboleths Eyes"
- **THEN** the script reports both row numbers as a duplicate, and no card changes

#### Scenario: An empty rarity
- **WHEN** one row of the Legend card file has a set but an empty rarity
- **THEN** the script does not stop, and that card is added as a draft without a rarity

### Requirement: Legend card rows
A Legend card row whose Set is "Blessed" SHALL become a Blessed card, and its rarity SHALL be "—" or empty. Every other row SHALL become a normal card, with the rarity "Common", "Rare" or empty. A row with an empty Set SHALL become a normal card without a set. A "—" in the Cost column SHALL mean the card has no cost. In the other columns, a "—" SHALL count as empty.

#### Scenario: A Blessed row
- **WHEN** the Legend card file has a row with the set "Blessed", the cost "—", the rarity "—", and the mechanic pack "Risk & Reward"
- **THEN** that card is stored as an active Blessed card, with no set, no rarity, no cost, and the mechanic pack "Risk & Reward"

#### Scenario: A row without a set
- **WHEN** the Legend card file has the row "The Cartographer" with an empty Set, Rarity and Mechanic Pack
- **THEN** that card is added as a normal draft without a set, a rarity or a mechanic pack

#### Scenario: A row with an empty cost
- **WHEN** the Legend card file has the row "The Grand Finale" with an empty Cost
- **THEN** that card is added as a draft without a cost

### Requirement: Cursed card rows
Every row of the Cursed card file SHALL become a Cursed card with its name, cost, and text. A Set column in that file SHALL be ignored. A "—" in the Cost column SHALL mean the card has no cost.

#### Scenario: A Cursed row
- **WHEN** the Cursed card file has the row "Visions of Death" with the set "Cursed" and the cost "1"
- **THEN** that card is stored as an active Cursed card, with the cost "1" and no set

#### Scenario: A Cursed row without a text
- **WHEN** a row of the Cursed card file has an empty Text
- **THEN** that card is added as a draft

### Requirement: Import report
After an import, the script SHALL report in Turkish, for each deck, how many cards were added as active, how many were added as drafts, how many were already stored and left alone, and how many stored cards got a status. It SHALL name each card added as a draft, with its empty fields. It SHALL list warnings for set codes without an official name, and for mechanic packs that are not among the eight known ones. Warnings SHALL NOT stop the import.

#### Scenario: Report after the first import
- **WHEN** an admin imports the repository data into empty emulators
- **THEN** the report shows 588 Legend cards added as active and 3 as drafts, naming "Hrolf's Hornswaggle" and "The Grand Finale" without a cost and "The Cartographer" without a set, a rarity and a mechanic pack, and 154 Cursed cards added as active

#### Scenario: Unknown set code
- **WHEN** the Legend card file has a card with a set code that is not in the official set list
- **THEN** the card is imported, and the report warns about that set code

### Requirement: Dry run
With a dry-run option, the card import SHALL validate the files and print the same report it would print for a real import, without writing any card or record.

#### Scenario: Previewing an import
- **WHEN** an admin runs the card import with the dry-run option after adding a row to a file
- **THEN** the report shows one card that would be added, and no card changes

### Requirement: True Word file is validated before writing
The True Words import SHALL check the whole file before it writes anything. The file SHALL have the columns Name, Cost and Text, matched regardless of case. Other columns are ignored, and every value is trimmed. A row with an empty name, a cost longer than 10 characters, or a name that matches another row's SHALL be invalid. With any problem, the script SHALL stop, list each problem with its row number, and change nothing.

#### Scenario: Wrong file
- **WHEN** an admin passes a file with the columns Name, Cost and Effect, such as an Elixir file, as the True Words file
- **THEN** the script reports the missing Text column and stops, and no word changes

#### Scenario: An empty cost
- **WHEN** one row of the True Words file has an empty cost
- **THEN** the script does not stop, and that word is added as a draft without a cost

#### Scenario: A cost that is too long
- **WHEN** one row of the True Words file has a cost of 11 characters
- **THEN** the script reports that row's number, and no word changes, including the valid rows

#### Scenario: Duplicate names
- **WHEN** two rows of the True Words file are named "Ancient Word" and "ancient word"
- **THEN** the script reports both row numbers as a duplicate, and no word changes

### Requirement: True Words import report and dry run
After an import, the script SHALL report in Turkish how many words were added as active, how many were added as drafts, how many were already stored and left alone, and how many stored words got a status. It SHALL name each word added as a draft, with its empty fields. With a dry-run option, the script SHALL validate the file and print the same report without writing any word or record.

#### Scenario: Report after the first import
- **WHEN** an admin imports the repository file into empty emulators
- **THEN** the report shows 53 words added as active and none as drafts

#### Scenario: Previewing an import
- **WHEN** an admin runs the True Words import with the dry-run option after adding a row to the file
- **THEN** the report shows one word that would be added, and no word changes

## REMOVED Requirements

### Requirement: Re-importing updates cards by name
**Reason**: The DM now changes cards in the application (spec: definition-editing). An import that updated cards would overwrite the DM's changes.
**Migration**: "The card import only adds" below. To change a stored card, the DM edits it in the application.

### Requirement: Cards missing from their file are retired
**Reason**: Cards the DM adds in the application are not in the files, so an import would retire them.
**Migration**: The DM retires a card in the application (spec: definition-editing).

### Requirement: Re-importing updates True Words by name
**Reason**: The DM now changes True Words in the application (spec: definition-editing). An import that updated words would overwrite the DM's changes.
**Migration**: "The True Words import only adds" below. To change a stored word, the DM edits it in the application.

### Requirement: True Words missing from the file are retired
**Reason**: Words the DM adds in the application are not in the file, so an import would retire them.
**Migration**: The DM retires a word in the application (spec: definition-editing).

## ADDED Requirements

### Requirement: The card import only adds
A card row SHALL be left alone when its deck already has a card with the identity that row's name gives, or a card whose name is equal when case, accents, spaces and punctuation are ignored. Every other row SHALL add a new card. An import SHALL NOT change, retire or delete any stored card, whatever its status.

#### Scenario: Running the same import twice
- **WHEN** an admin runs the card import a second time with the same files
- **THEN** no card is written, and the report says every card was already stored

#### Scenario: A changed text in the file
- **WHEN** an admin changes one card's text in the Legend card file and runs the import
- **THEN** the stored card keeps its text, and the report counts it as already stored

#### Scenario: A card the DM renamed
- **WHEN** the DM renamed "Aboleth's Eyes" to "Eyes of the Aboleth", and an admin runs the import with the repository files
- **THEN** no new "Aboleth's Eyes" is added

#### Scenario: A card missing from the file
- **WHEN** an admin removes a card's row from the Cursed card file and runs the import
- **THEN** that card keeps its status and definition

### Requirement: The True Words import only adds
A word row SHALL be left alone when a word with the identity that row's name gives, or a word whose name is equal when case, accents, spaces and punctuation are ignored, is already stored. Every other row SHALL add a new word. An import SHALL NOT change, retire or delete any stored word, whatever its status, or any learned word, draft or other data.

#### Scenario: Running the same import twice
- **WHEN** an admin runs the True Words import a second time with the same file
- **THEN** no word is written, and the report says every word was already stored

#### Scenario: A changed cost in the file
- **WHEN** an admin changes one word's cost in the file and runs the import
- **THEN** the stored word keeps its cost

### Requirement: Imported definitions are active unless a value is missing
A definition that an import adds SHALL be active when its row has a value in every column its kind uses, and a draft otherwise. A normal card uses Set, Cost, Rarity, Mechanic Pack and Text. A Blessed card uses Cost, Mechanic Pack and Text. A Cursed card and a True Word use Cost and Text. A "—" in the Cost column of a card file counts as a value, and in the True Words file it counts as empty.

#### Scenario: A complete row
- **WHEN** a Legend card row has a set, the cost "2", the rarity "Rare", a mechanic pack and a text
- **THEN** the card is added as active

#### Scenario: A word without a text
- **WHEN** a row of the True Words file has an empty Text
- **THEN** that word is added as a draft

### Requirement: Imports give stored definitions a status
Before it adds anything, each import SHALL give every stored definition of its kind that has no status one: retired when it was marked retired, and active otherwise. It SHALL change nothing else about that definition. A stored definition that has a status SHALL NOT be touched. A dry run SHALL only count them.

#### Scenario: Upgrading the stored cards
- **WHEN** the emulators hold cards stored before definitions had a status, one of them marked retired, and an admin runs the card import
- **THEN** every stored card has a status, the one marked retired is retired, and the report counts them

#### Scenario: Nothing to upgrade
- **WHEN** an admin runs the card import again
- **THEN** no stored card is upgraded

### Requirement: An import is recorded
An import that adds definitions SHALL write change records in the same run (spec: definition-editing, "Change records"). It writes one record readable by every signed-in user that names the active additions, and one readable only by the DM that names the draft additions. Each record names the import, not a user, as the one who made the change. An import that adds nothing, and a dry run, SHALL write no record.

#### Scenario: The first import
- **WHEN** an admin imports the repository card files into empty emulators
- **THEN** a record readable by everyone names the 742 active cards, and a record readable only by the DM names the 3 drafts

#### Scenario: Nothing added
- **WHEN** an admin runs the same import again
- **THEN** no record is written
