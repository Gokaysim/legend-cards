## MODIFIED Requirements

### Requirement: Legend card rows
A Legend card row whose Set is "Blessed" SHALL become a Blessed card, and its rarity SHALL be "—", "Blessed" (in any letter case) or empty; each of them SHALL store the card without a rarity. Every other row SHALL become a normal card, with the rarity "Common", "Rare" or empty. A row with an empty Set SHALL become a normal card without a set. A "—" in the Cost column SHALL mean the card has no cost. In the other columns, a "—" SHALL count as empty.

#### Scenario: A Blessed row
- **WHEN** the Legend card file has a row with the set "Blessed", the cost "—", the rarity "—", and the mechanic pack "Risk & Reward"
- **THEN** that card is stored as an active Blessed card, with no set, no rarity, no cost, and the mechanic pack "Risk & Reward"

#### Scenario: A Blessed row that names its rarity "Blessed"
- **WHEN** the Legend card file has a row with the set "Blessed" and the rarity "Blessed"
- **THEN** that card is stored as a Blessed card with no rarity, as with the rarity "—"

#### Scenario: A Blessed row with another rarity
- **WHEN** the Legend card file has a row with the set "Blessed" and the rarity "Rare"
- **THEN** the import stops with that row's number and changes nothing

#### Scenario: A row without a set
- **WHEN** the Legend card file has the row "The Cartographer" with an empty Set, Rarity and Mechanic Pack
- **THEN** that card is added as a normal draft without a set, a rarity or a mechanic pack

#### Scenario: A row with an empty cost
- **WHEN** the Legend card file has the row "The Grand Finale" with an empty Cost
- **THEN** that card is added as a draft without a cost
