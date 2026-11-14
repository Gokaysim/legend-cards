# Spec Delta

## MODIFIED Requirements

### Requirement: True Word steps need a connection
Starting, learning, skipping, cancelling, teaching, taking back, and using a word SHALL require a network connection. Offline, the application SHALL show a Turkish message and change nothing.

#### Scenario: Starting offline
- **WHEN** Ayla tries to start a draft without a connection
- **THEN** she sees a Turkish message, and no draft starts and no LP changes

#### Scenario: Using offline
- **WHEN** Ayla tries to use "Abyss" without a connection
- **THEN** she sees a Turkish message, no use is recorded, and her LP does not change

## ADDED Requirements

### Requirement: Using a True Word
The player who knows a word, and the DM, SHALL be able to use it with "Kullan", across the word's details. Using SHALL pay the word's cost from the player's LP, priced as a card's use is (spec: card-holdings, "The price of a use"). The player and the DM have the same limits and amount choice as for a card. The word SHALL stay with the player, and SHALL be usable any number of times. Other players SHALL NOT use it.

#### Scenario: A player uses a word
- **WHEN** Ayla, who has 6 LP, uses "Abyss", which costs 5
- **THEN** she has 1 LP on every device, and she still knows "Abyss"

#### Scenario: Using it again
- **WHEN** Ayla, who now has 1 LP, opens the use step of "Abyss" again
- **THEN** the confirm control is disabled, and a Turkish note says that it costs 5 LP and Ayla has 1 LP

#### Scenario: An X word
- **WHEN** Ayla uses a word that costs "X" and enters 2
- **THEN** she pays 2 LP

#### Scenario: A free word
- **WHEN** Ayla uses "Chaos", which costs 0
- **THEN** the use is recorded, and her LP does not change

#### Scenario: The DM uses a word for free
- **WHEN** the DM uses Ayla's "Abyss" with the amount 0
- **THEN** the use is recorded, and her LP does not change

#### Scenario: Another player
- **WHEN** Bora opens the details of Ayla's "Abyss"
- **THEN** he sees no "Kullan", and the server denies a use of it by him

#### Scenario: A word taken back
- **WHEN** a user tries to record a use of a word that the DM took back from Ayla
- **THEN** the server denies it

#### Scenario: A retired word
- **WHEN** Ayla uses "Abyss" after the DM retired it
- **THEN** the use is recorded, and she pays its cost

#### Scenario: While a pack is open
- **WHEN** a pack is open, and Ayla opens the details of "Abyss"
- **THEN** "Kullan" is disabled with the Turkish note that a pack is open

### Requirement: The use step of a word
The use step of a word SHALL show its price and the player's LP before and after the use, as a card's use step does (spec: card-holdings, "The use step shows the payment"). It SHALL NOT ask on which character the word was used. After the use, the details SHALL stay open and say in Turkish that the word was used, with the amount paid.

#### Scenario: A fixed price
- **WHEN** Ayla, who has 6 LP, opens the use step of "Abyss"
- **THEN** the step shows "5 LP", "6 LP → 1 LP", and "Kullanımı onayla (5 LP)"

#### Scenario: After the use
- **WHEN** Ayla confirms the use of "Abyss"
- **THEN** the details of "Abyss" stay open and say that it was used for 5 LP

### Requirement: Word use records
Each use of a word SHALL be recorded with the word, its name at the time, the player, the player's record of the word, who used it, when, the LP paid, and the ledger entry of the payment when it is more than 0. A use record SHALL never be changed or deleted. Every signed-in user SHALL be able to read every use record. Signed-out requests SHALL be denied.

#### Scenario: Recording a use
- **WHEN** Ayla uses "Abyss" for 5 LP
- **THEN** a use record holds "Abyss", Ayla, her record of the word, Ayla as the user, the time, 5 LP, and the ledger entry

#### Scenario: Changing a use
- **WHEN** any signed-in user, including the DM, tries to change or delete a use record
- **THEN** the server denies it

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user tries to read a use record
- **THEN** the server denies it

### Requirement: A word use agrees with its payment
The server SHALL accept a word use only together with its payment and the player's new LP, when it pays more than 0. It SHALL deny a use whose amount disagrees with its ledger entry, a player's use that pays anything other than the price, and a use of a word that the player does not know.

#### Scenario: A forged amount
- **WHEN** Ayla records a use of "Abyss", which costs 5, paying 1 LP
- **THEN** the server denies it

#### Scenario: A use without its payment
- **WHEN** a signed-in user records a 5 LP use of "Abyss" for Ayla without lowering her LP in the same write
- **THEN** the server denies it

#### Scenario: A word the player does not know
- **WHEN** Ayla records a use of "Aid", which she has not learned
- **THEN** the server denies it
