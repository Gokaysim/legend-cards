# Spec Delta

## ADDED Requirements

### Requirement: Importing True Words from a CSV file
A True Words import script SHALL load the word definitions from one CSV file. Without a file option, it SHALL use the True Words file kept in the repository. Like the card import, it SHALL act on the local emulators unless a real project is named and confirmed.

#### Scenario: Importing the repository data
- **WHEN** an admin runs the True Words import script without a file option against empty emulators
- **THEN** the emulators hold 53 True Words

### Requirement: True Word file is validated before writing
The True Words import SHALL check the whole file before it writes anything. The file SHALL have the columns Name, Cost and Text, matched regardless of case. Other columns are ignored, and every value is trimmed. A row with an empty name or an empty cost, a cost longer than 10 characters, or a name that matches another row's SHALL be invalid. With any problem, the script SHALL stop, list each problem with its row number, and change nothing.

#### Scenario: Wrong file
- **WHEN** an admin passes a file with the columns Name, Cost and Effect, such as an Elixir file, as the True Words file
- **THEN** the script reports the missing Text column and stops, and no word changes

#### Scenario: An empty cost
- **WHEN** one row of the True Words file has an empty cost
- **THEN** the script reports that row's number, and no word changes, including the valid rows

#### Scenario: Duplicate names
- **WHEN** two rows of the True Words file are named "Ancient Word" and "ancient word"
- **THEN** the script reports both row numbers as a duplicate, and no word changes

### Requirement: Re-importing updates True Words by name
A row SHALL match a stored word whose name is equal when case, accents, spaces, and punctuation are ignored. A matched word whose definition differs SHALL be updated. A matched word that is the same SHALL NOT be written. A row without a match SHALL add a new word. The import SHALL NOT change any learned word, draft, or other data.

#### Scenario: Running the same import twice
- **WHEN** an admin runs the True Words import a second time with the same file
- **THEN** no word is written, and the report says every word is unchanged

#### Scenario: A changed cost
- **WHEN** an admin changes one word's cost in the file and runs the import
- **THEN** that word's cost is updated, its identity stays the same, and the report counts one updated word

### Requirement: True Words missing from the file are retired
A stored word that has no row in the file SHALL be marked as retired. It SHALL NOT be deleted. A retired word that appears in the file again SHALL become active again, with the definition from the file.

#### Scenario: A word removed from the file
- **WHEN** an admin removes a word's row from the file and runs the import
- **THEN** that word is marked as retired and is still stored

#### Scenario: A word comes back
- **WHEN** an admin adds that row back and runs the import again
- **THEN** the word is active again, under the same identity

### Requirement: True Words import report and dry run
After an import, the script SHALL report in Turkish how many words were added, updated, unchanged, retired, and brought back. A row with an empty text SHALL be imported with a warning. With a dry-run option, the script SHALL validate the file and print the same report without writing any word.

#### Scenario: Report after the first import
- **WHEN** an admin imports the repository file into empty emulators
- **THEN** the report shows 53 words added

#### Scenario: Previewing an import
- **WHEN** an admin runs the True Words import with the dry-run option after removing a row from the file
- **THEN** the report shows one word that would be retired, and no word changes
