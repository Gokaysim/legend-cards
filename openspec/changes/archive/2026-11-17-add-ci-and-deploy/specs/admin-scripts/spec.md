# Spec Delta

## MODIFIED Requirements

### Requirement: Importing cards from CSV files
A card import script SHALL load card definitions from two CSV files: one for the Legend cards (normal and Blessed) and one for the Cursed cards. Without file options, it SHALL use both files in the local data folder (spec: developer-workflow, "The owner's data stays out of the repository"). Given only one of the two files, it SHALL import only that deck and leave the other deck unchanged. Each card it adds SHALL get its kind's starting behavior flags (spec: definition-editing, "Starting values of the flags"); the files have no column for them.

#### Scenario: Importing the repository data
- **WHEN** an admin with the owner's files in the data folder runs the card import script without file options against empty emulators
- **THEN** the emulators hold 591 Legend cards (572 normal, 3 of them drafts, and 19 Blessed) and 154 Cursed cards

#### Scenario: Importing one deck
- **WHEN** an admin runs the card import script with only a Cursed card file
- **THEN** the Cursed cards are imported, and no Legend card changes

#### Scenario: The flags of an imported card
- **WHEN** the import adds the normal card "Aesna's Assist", whose text starts with "Held:"
- **THEN** it is listed, drawn and in both kinds of packs, has one copy, is "Elde etkili", leaves an effect when used, and leaves the hand when used

#### Scenario: An imported Cursed card
- **WHEN** the import adds the Cursed card "Visions of Death"
- **THEN** it is listed and in the Cursed Deck, any number of hands can hold it, and its pack flags are off

### Requirement: Importing True Words from a CSV file
A True Words import script SHALL load the word definitions from one CSV file into the card definitions, as True Words with a True Word's starting behavior flags (spec: definition-editing, "Starting values of the flags"). Without a file option, it SHALL use the True Words file in the local data folder. Like the card import, it SHALL act on the local emulators unless a real project is named and confirmed.

#### Scenario: Importing the repository data
- **WHEN** an admin with the owner's True Words file in the data folder runs the True Words import script without a file option against empty emulators
- **THEN** the emulators hold 53 True Words

#### Scenario: A held word
- **WHEN** the import adds "Justice", whose text starts with "Held:"
- **THEN** it is a True Word that is listed, offered in drafts, and "Elde etkili"

### Requirement: Importing sets from a CSV file
A set import script SHALL load sets from one CSV file, by default the sets file in the local data folder. The file SHALL have the columns Code, Name, Aliases and Packs, matched regardless of case. Aliases SHALL be separated by commas inside the cell. Packs SHALL be "standard" or "pandemonium". The rows' order SHALL be the order of the sets it adds. Like the other imports, it SHALL act on the local emulators unless a real project is named and confirmed.

#### Scenario: The repository's sets
- **WHEN** an admin with the owner's set file in the data folder runs the set import against empty emulators
- **THEN** the 12 sets are stored in the file's order, from "The End is Nigh" to "Pandemonium", with "Pandemonium" having the "Tek paket + Cursed" layout

## ADDED Requirements

### Requirement: A missing data file
When a file that a script reads by default is missing from the local data folder, the script SHALL stop before it reads the archives or writes anything. It SHALL print a Turkish message that names the missing file, says it is kept only on the owner's machine, and names the option that takes another file, where there is one. This SHALL hold for the card, True Words and set imports, for the picture alias table, and for the picture build and the picture import.

#### Scenario: Importing on a fresh clone
- **WHEN** an admin runs the card import script without file options on a clone whose data folder holds only its documentation
- **THEN** the script names the missing Legend card file in Turkish, mentions `--legend` and `--cursed`, and writes nothing

#### Scenario: The alias table is missing
- **WHEN** an admin runs the picture import with the archives while the alias table is not in the data folder
- **THEN** the script names the missing alias table in Turkish and stops before it extracts anything

#### Scenario: A file given by option
- **WHEN** an admin runs the True Words import with `--file` pointing at a CSV file outside the data folder, on a clone whose data folder is empty
- **THEN** the import reads that file and does not ask for the default one
