## MODIFIED Requirements

### Requirement: Card form fields
The card form SHALL offer the stored sets by their official names in the stored order (spec: card-sets), "Common" and "Rare", and the eight mechanic packs, each with an empty choice for a draft. A set or mechanic pack outside those lists that a card already has SHALL be kept and shown as written. The cost SHALL be free text of at most 10 characters, and empty or "—" means no cost. The text SHALL be at most 2000 characters, and the form SHALL show its bracket text.

#### Scenario: Choosing a set
- **WHEN** the DM adds a normal card
- **THEN** the set choice lists the stored sets' names in the stored order

#### Scenario: A set added on the Setler screen
- **WHEN** the DM adds the set "Zaddir" and then adds a normal card
- **THEN** the set choice offers "Zaddir"'s official name last, and choosing it stores the code "Zaddir" on the card

#### Scenario: Editing bracket text
- **WHEN** the DM edits "Hrolf's Hornswaggle", whose text starts with "[Uno]"
- **THEN** the form shows the text with "[Uno]", and saving keeps it

#### Scenario: A cost that is too long
- **WHEN** the DM enters a cost of 11 characters
- **THEN** the form refuses it with a Turkish message, and nothing is saved
