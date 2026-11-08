# Spec Delta

## ADDED Requirements

### Requirement: Initial card data in the repository
The repository SHALL keep the owner's initial data as CSV files in one data folder, with one file each for the Legend cards, the Cursed cards, and the True Words. The files SHALL keep the owner's content unchanged. A single documented command SHALL load the card files into the running local emulators.

#### Scenario: Loading the cards for development
- **WHEN** a developer starts the local development command on a fresh clone and runs the documented card import command
- **THEN** the Kart kütüphanesi and the Cursed Deck show the owner's cards

#### Scenario: Finding the data
- **WHEN** a developer looks for the owner's card data
- **THEN** they find the Legend card, Cursed card, and True Words files in the data folder, under names that say what each holds
