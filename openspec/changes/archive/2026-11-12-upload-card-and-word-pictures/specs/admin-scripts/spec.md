# Spec Delta

## ADDED Requirements

### Requirement: Picture import
A picture import script SHALL read the `.7z` archives and loose PNG files in a folder given on the command line, without changing them. It SHALL match the card and True Word pictures among them against the stored definitions (spec: card-images), and store each matched picture for its definition. It SHALL check the alias table before it extracts or writes anything. Without 7-Zip it SHALL stop with a Turkish message saying how to install it.

#### Scenario: Importing into the emulators
- **WHEN** an admin runs the picture import with the folder that holds the five archives, while the emulators run with the owner's cards and words
- **THEN** every stored card and word with a matching file has its picture on every device, and the archives are unchanged

#### Scenario: A real project
- **WHEN** an admin runs the picture import with `--project` naming a real project and confirms it
- **THEN** the pictures are stored in that project's file storage, and its definitions point at them

#### Scenario: No 7-Zip
- **WHEN** the picture import runs on a machine without 7-Zip
- **THEN** it stops with a Turkish message naming `brew install sevenzip`, and stores nothing

### Requirement: The picture import only adds
The picture import SHALL give a picture only to a definition that has never had one. It SHALL never replace a definition's picture, and never give a picture back to a definition whose picture the DM removed. A second run with the same files SHALL change nothing. A run that stops halfway SHALL leave the definitions it reached with their pictures, and a later run SHALL add the rest.

#### Scenario: A picture the DM uploaded
- **WHEN** the DM uploaded a picture for "Aboleth's Eyes", and the picture import runs with `abolethseyes.png`
- **THEN** "Aboleth's Eyes" keeps the DM's picture

#### Scenario: A picture the DM removed
- **WHEN** the DM removed the picture of "Aboleth's Eyes", and the picture import runs with `abolethseyes.png`
- **THEN** "Aboleth's Eyes" stays without a picture

#### Scenario: Running twice
- **WHEN** the picture import runs a second time with the same archives
- **THEN** it stores no picture, and its report says that every matched definition already has one

#### Scenario: An interrupted run
- **WHEN** a picture import stops after storing half of the pictures, and an admin runs it again
- **THEN** the second run stores the other half

### Requirement: Picture import report and dry run
After a picture import, the script SHALL report in Turkish how many cards, Cursed cards, Blessed cards and True Words got a picture, how many already had one, and how many the DM had removed. It SHALL name each stored definition that has no picture after the run, and list the duplicates and the unknown files. With a dry-run option it SHALL print the same report without storing or writing anything.

#### Scenario: Previewing an import
- **WHEN** an admin runs the picture import with the dry-run option
- **THEN** the report shows what would be stored, including that "Scorched Earth" would have no picture, and no file or definition changes

### Requirement: Picture import records
A picture import that gives pictures SHALL write change records in the same run (spec: definition-editing, "Change records"). It writes one record readable by every signed-in user, naming the active and retired definitions that got a picture, and one readable by the DM only, naming the drafts that got one. A run that gives no picture SHALL write no record.

#### Scenario: Records of a first import
- **WHEN** the picture import gives pictures to 700 active cards and to the draft "The Cartographer"
- **THEN** one public record names the 700 cards, and one DM-only record names "The Cartographer"

#### Scenario: Nothing to add
- **WHEN** the picture import gives no picture
- **THEN** it writes no record
