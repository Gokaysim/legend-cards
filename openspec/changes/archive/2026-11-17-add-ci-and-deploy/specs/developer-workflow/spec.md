# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Initial card data in the repository`
- TO: `### Requirement: The owner's data stays out of the repository`

## MODIFIED Requirements

### Requirement: The owner's data stays out of the repository
The owner's initial data SHALL be kept as CSV files in one local data folder: one file each for the Legend cards, the Cursed cards, the True Words and the sets, plus the picture alias table. The listing of the picture archives SHALL be kept there too. Version control SHALL ignore these files, and no commit in the repository's history SHALL contain them. The files SHALL keep the owner's content unchanged. A single documented command SHALL load the card files into the running local emulators. The folder's documentation SHALL stay in the repository and describe every file and its columns.

#### Scenario: Loading the cards for development
- **WHEN** a developer who has the owner's files in the data folder starts the local development command and runs the documented card import command
- **THEN** the Kart kütüphanesi and the Cursed Deck show the owner's cards

#### Scenario: Finding the data
- **WHEN** the owner looks for their card data on their own machine
- **THEN** they find the Legend card, Cursed card, True Words and set files in the data folder, under names that say what each holds

#### Scenario: Reading the public repository
- **WHEN** someone browses the public repository or any commit of its history
- **THEN** they find the data folder's documentation, and no card text, no True Word text and no listing of the picture archives

#### Scenario: Adding a file by mistake
- **WHEN** a developer runs `git status` after copying the owner's CSV files into the data folder
- **THEN** the files are not offered for commit

## ADDED Requirements

### Requirement: Checks without the owner's data
The quality check and emulator test commands SHALL pass on a clone that has none of the owner's local data files. Tests of the CSV readers and the imports SHALL use small invented files kept with the tests. Checks that need the owner's real data SHALL run when that data is present, and SHALL be skipped, not failed, when it is absent.

#### Scenario: A fresh clone
- **WHEN** a developer clones the repository, installs the dependencies and runs the quality check command without adding any data file
- **THEN** it passes

#### Scenario: On the owner's machine
- **WHEN** the owner runs the quality check command with their data files in the data folder
- **THEN** the checks of the real data run too: the card and word counts, the picture inventory and the name normalization of every real card

#### Scenario: A data change that loses a picture
- **WHEN** the owner renames a card in their CSV file so that no archive file matches it any longer, and runs the quality check command
- **THEN** the picture inventory check fails and names the card
