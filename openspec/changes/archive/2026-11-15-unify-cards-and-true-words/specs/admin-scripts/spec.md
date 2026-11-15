# Spec Delta

## MODIFIED Requirements

### Requirement: Importing cards from CSV files
A card import script SHALL load card definitions from two CSV files: one for the Legend cards (normal and Blessed) and one for the Cursed cards. Without file options, it SHALL use both files kept in the repository. Given only one of the two files, it SHALL import only that deck and leave the other deck unchanged. Each card it adds SHALL get its kind's starting behavior flags (spec: definition-editing, "Starting values of the flags"); the files have no column for them.

#### Scenario: Importing the repository data
- **WHEN** an admin runs the card import script without file options against empty emulators
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
A True Words import script SHALL load the word definitions from one CSV file into the card definitions, as True Words with a True Word's starting behavior flags (spec: definition-editing, "Starting values of the flags"). Without a file option, it SHALL use the True Words file kept in the repository. Like the card import, it SHALL act on the local emulators unless a real project is named and confirmed.

#### Scenario: Importing the repository data
- **WHEN** an admin runs the True Words import script without a file option against empty emulators
- **THEN** the emulators hold 53 True Words

#### Scenario: A held word
- **WHEN** the import adds "Justice", whose text starts with "Held:"
- **THEN** it is a True Word that is listed, offered in drafts, and "Elde etkili"

### Requirement: Picture import records
A picture import that gives pictures SHALL write change records in the same run (spec: definition-editing, "Change records"). It writes one record readable by every signed-in user, naming the active and retired definitions with "Listede görünür" on that got a picture, and one readable by the DM only, naming the others that got one: the drafts and the definitions with "Listede görünür" off. A run that gives no picture SHALL write no record.

#### Scenario: Records of a first import
- **WHEN** the picture import gives pictures to 700 active cards and to the draft "The Cartographer"
- **THEN** one public record names the 700 cards, and one DM-only record names "The Cartographer"

#### Scenario: A hidden card
- **WHEN** the picture import gives pictures to 700 active cards, one of them "The Last Wish", whose "Listede görünür" is off
- **THEN** the public record names 699 cards, and a DM-only record names "The Last Wish"

#### Scenario: Nothing to add
- **WHEN** the picture import gives no picture
- **THEN** it writes no record
