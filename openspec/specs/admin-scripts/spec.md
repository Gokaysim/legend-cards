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

### Requirement: Card file columns
The Legend card file SHALL have the columns Name, Set, Cost, Rarity, Text, and Mechanic Pack. The Cursed card file SHALL have the columns Name, Cost, and Text. Column names SHALL match regardless of case, and other columns SHALL be ignored, for example "Drawn?" and "Shuffle". Every value SHALL be trimmed of surrounding spaces.

#### Scenario: Extra columns
- **WHEN** the Legend card file also has the columns "Drawn?" and "Shuffle"
- **THEN** the import ignores them, and no card stores their values

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

### Requirement: Dry run
With a dry-run option, the card import SHALL validate the files and print the same report it would print for a real import, without writing any card or record.

#### Scenario: Previewing an import
- **WHEN** an admin runs the card import with the dry-run option after adding a row to a file
- **THEN** the report shows one card that would be added, and no card changes

### Requirement: Importing True Words from a CSV file
A True Words import script SHALL load the word definitions from one CSV file into the card definitions, as True Words with a True Word's starting behavior flags (spec: definition-editing, "Starting values of the flags"). Without a file option, it SHALL use the True Words file kept in the repository. Like the card import, it SHALL act on the local emulators unless a real project is named and confirmed.

#### Scenario: Importing the repository data
- **WHEN** an admin runs the True Words import script without a file option against empty emulators
- **THEN** the emulators hold 53 True Words

#### Scenario: A held word
- **WHEN** the import adds "Justice", whose text starts with "Held:"
- **THEN** it is a True Word that is listed, offered in drafts, and "Elde etkili"

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
