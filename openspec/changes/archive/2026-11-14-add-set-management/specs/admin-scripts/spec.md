## ADDED Requirements

### Requirement: Importing sets from a CSV file
A set import script SHALL load sets from one CSV file, by default the sets file kept in the repository. The file SHALL have the columns Code, Name, Aliases and Packs, matched regardless of case. Aliases SHALL be separated by commas inside the cell. Packs SHALL be "standard" or "pandemonium". The rows' order SHALL be the order of the sets it adds. Like the other imports, it SHALL act on the local emulators unless a real project is named and confirmed.

#### Scenario: The repository's sets
- **WHEN** an admin runs the set import against empty emulators
- **THEN** the 12 sets are stored in the file's order, from "The End is Nigh" to "Pandemonium", with "Pandemonium" having the "Tek paket + Cursed" layout

### Requirement: The set file is validated before writing
The set import SHALL check the whole file before it writes anything. A missing column, an empty code or name, a value longer than 100 characters, more than 10 aliases, an unknown Packs value, the code "Blessed", or two rows that share a code, a name or a spelling among their codes and aliases SHALL stop it. It SHALL list each problem with its row number and change nothing.

#### Scenario: Two rows for one set
- **WHEN** the set file has the codes "Kesqer" and "kesqer"
- **THEN** the import stops, names both rows, and stores nothing

### Requirement: The set import only adds
A set row SHALL be left alone when a stored set has a code or alias equal to its code, ignoring case, accents and spaces. Every other row SHALL add a set after the stored ones, in the file's order. The import SHALL NOT change, reorder or delete a stored set. A second run with the same file SHALL change nothing.

#### Scenario: A renamed set
- **WHEN** the DM renamed "Ulagal" in the app, and the set import runs again
- **THEN** "Ulagal" keeps the DM's name, and no set is added

### Requirement: Set pictures from the archives
Given a folder with the `.7z` archives and loose PNG files, the set import SHALL match each set's `<set>_cb` and `cardmaker_<set>` file by its code, official name or alias, and the picture aliases, convert them as the picture build does, and store them for the set. It SHALL give a picture only to a set that has never had one, never one whose picture the DM removed, and SHALL never replace a picture.

#### Scenario: The first run with pictures
- **WHEN** an admin runs the set import with the archive folder after the 12 sets were stored without pictures
- **THEN** each of the 12 sets gets its cardback and its Cardmaker, and the archives are unchanged

#### Scenario: A picture the DM removed
- **WHEN** the DM removed the Cardmaker of "Ulagal", and the set import runs again with the archive folder
- **THEN** "Ulagal" stays without a Cardmaker

### Requirement: Set import report and dry run
After a set import, the script SHALL report in Turkish how many sets were added and how many were already stored, naming the added ones, and with an archive folder how many cardbacks and Cardmakers were stored, which sets still have none, and which files matched no set. With a dry-run option, it SHALL print the same report without writing anything.

#### Scenario: A dry run
- **WHEN** an admin runs the set import with the dry-run option against empty emulators
- **THEN** the report says 12 sets would be added, and no set is stored

### Requirement: A set import is recorded
A set import that adds sets or stores pictures SHALL write one set change record in the same run, naming "Import", the sets it added, and the sets that got pictures (spec: card-sets, "Set change records").

#### Scenario: The first import
- **WHEN** the set import adds the 12 sets
- **THEN** one record names "Import" and the 12 sets

## MODIFIED Requirements

### Requirement: Import report
After an import, the script SHALL report in Turkish, for each deck, how many cards were added as active, how many were added as drafts, how many were already stored and left alone, and how many stored cards got a status. It SHALL name each card added as a draft, with its empty fields. It SHALL list warnings for set codes that no stored set has as its code or alias, and for mechanic packs that are not among the eight known ones. Warnings SHALL NOT stop the import.

#### Scenario: Report after the first import
- **WHEN** an admin imports the repository data into empty emulators, after the set import
- **THEN** the report shows 588 Legend cards added as active and 3 as drafts, naming "Hrolf's Hornswaggle" and "The Grand Finale" without a cost and "The Cartographer" without a set, a rarity and a mechanic pack, and 154 Cursed cards added as active

#### Scenario: Unknown set code
- **WHEN** the Legend card file has a card with a set code that no stored set has as its code or alias
- **THEN** the card is imported, and the report warns about that set code and says in Turkish to add the set on the Setler screen

#### Scenario: No sets stored
- **WHEN** an admin runs the card import before the set import
- **THEN** the cards are imported, and the report warns about every set code
