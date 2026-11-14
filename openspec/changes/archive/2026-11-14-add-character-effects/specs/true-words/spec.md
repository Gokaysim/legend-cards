# Spec Delta

## MODIFIED Requirements

### Requirement: The use step of a word
The use step of a word SHALL show its price and the player's LP before and after the use, as a card's use step does (spec: card-holdings, "The use step shows the payment"). It SHALL ask on which character the word was used, with the same list as a card's use step (spec: card-holdings, "Choosing the character of a use", "A typed character"), the player's group first, and SHALL offer "Aktif efekt olarak ekle" as a card's does. After the use, the details SHALL stay open and say in Turkish that the word was used, with the amount paid.

#### Scenario: A fixed price
- **WHEN** Ayla, who has 6 LP, opens the use step of "Abyss"
- **THEN** the step shows "5 LP", "6 LP → 1 LP", and "Kullanımı onayla (5 LP)"

#### Scenario: After the use
- **WHEN** Ayla confirms the use of "Abyss"
- **THEN** the details of "Abyss" stay open and say that it was used for 5 LP

#### Scenario: Using a word on a character
- **WHEN** Ayla chooses "Thorin" in the use step of "Abyss", keeps "Aktif efekt olarak ekle" checked, and confirms
- **THEN** the use names "Thorin", and "Thorin" has the effect of "Abyss" marked "True Word" from a use

#### Scenario: No character
- **WHEN** Ayla confirms the use of "Abyss" with "Karakter seçilmedi"
- **THEN** the use names no character, and no effect is added

### Requirement: Word use records
Each use of a word SHALL be recorded with the word, its name at the time, the player, the player's record of the word, who used it, when, the LP paid, and the ledger entry of the payment when it is more than 0. A use on a character SHALL also record the character's name at the time, and the character when it was chosen from the list. A use record SHALL never be changed or deleted. Every signed-in user SHALL be able to read every use record. Signed-out requests SHALL be denied.

#### Scenario: Recording a use
- **WHEN** Ayla uses "Abyss" for 5 LP
- **THEN** a use record holds "Abyss", Ayla, her record of the word, Ayla as the user, the time, 5 LP, and the ledger entry

#### Scenario: Recording the character
- **WHEN** Ayla uses "Abyss" on "Thorin", chosen from the list
- **THEN** the use record also holds "Thorin" and that character

#### Scenario: A forged character
- **WHEN** a signed-in user records a use on "Thorin" with the recorded name "Elara", or on an archived character
- **THEN** the server denies it

#### Scenario: An old use record
- **WHEN** a user opens the İşlem Logu, and "Abyss" was used before characters could be named
- **THEN** the event shows the use without a character

#### Scenario: Changing a use
- **WHEN** any signed-in user, including the DM, tries to change or delete a use record
- **THEN** the server denies it

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user tries to read a use record
- **THEN** the server denies it
