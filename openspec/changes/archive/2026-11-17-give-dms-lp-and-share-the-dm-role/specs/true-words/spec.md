# Spec Delta

## MODIFIED Requirements

### Requirement: The DM chooses the amount
When the DM starts a draft, for a player or for a DM, the DM's own hand included, the amount SHALL start at the draft's price, and the DM SHALL be able to change it to any whole number from 0 to that user's LP. The amount SHALL be taken from that user's LP, in the same step that starts the draft. With 0 the draft SHALL start for free. A draft SHALL never be paid with GP.

#### Scenario: The DM keeps the price
- **WHEN** the DM starts a draft for Bora, who knows 1 word and has 4 LP, without changing the amount
- **THEN** Bora pays 2 LP and has 2 LP

#### Scenario: A free draft
- **WHEN** the DM starts a draft for Bora with the amount 0
- **THEN** the draft starts, and Bora's LP does not change

#### Scenario: More than the player has
- **WHEN** the DM enters 5 for Bora, who has 4 LP
- **THEN** the draft cannot be started, with a Turkish message naming Bora's LP

#### Scenario: A draft for the DM's own hand
- **WHEN** the DM, who knows no words and has 3 LP, starts a draft for themselves without changing the amount
- **THEN** the DM pays 1 LP and has 2 LP

### Requirement: Using a True Word
The player who knows a word, and the DM, SHALL be able to use it with "Kullan", across the word's details. Using SHALL pay the word's cost from the LP of the user who knows it, a DM included, priced as a card's use is (spec: card-holdings, "The price of a use"). The player and the DM have the same limits and amount choice as for a card. The word SHALL stay with the player, and SHALL be usable any number of times. Other players SHALL NOT use it.

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

#### Scenario: A word in the DM's own hand
- **WHEN** the DM, who has 6 LP and knows "Abyss", which costs 5, uses it and keeps the amount 5
- **THEN** the DM has 1 LP, and the use is recorded as a True Word use payment
