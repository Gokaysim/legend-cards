# Spec Delta

## MODIFIED Requirements

### Requirement: Domain reference document
The repository SHALL contain a domain reference document that explains what Legend Card Manager is: a tracking tool for a DM's side card system in a D&D 5e group, not a game engine. It SHALL define the domain terms and list the game rules observed in the current legacy reference version, marking which rules are deliberate design decisions. It SHALL also record the table rules stated on the legacy rules page, and list where they disagree with the observed behavior as open questions.

#### Scenario: Looking up a term
- **WHEN** a contributor looks for the meaning of a domain term such as Legend Points, Set, Mechanic Pack, Rarity, Cursed card, Blessed card, Pool, Hand, Pack type, True Word, Cardmaker, Shops, Elixir, or Custom Card
- **THEN** the domain reference defines it

#### Scenario: Checking a legacy rule
- **WHEN** a contributor wants to know when a Golden Pack can be opened in the legacy application
- **THEN** the domain reference states the rule as observed in legacy v2.2.8, and notes that it is a deliberate design decision

#### Scenario: Checking a changed price
- **WHEN** a contributor looks up the price label of a Mechanic Pack
- **THEN** the domain reference gives "4 LP / 10000 GP" as observed in legacy v2.2.8

#### Scenario: A table rule that the application does not follow
- **WHEN** a contributor reads where Blessed cards can come from
- **THEN** the domain reference shows both the legacy application's behavior and the rules page's statement, and lists the disagreement as an open question for the DM

### Requirement: Legacy design reference
The legacy single-file application SHALL be kept unchanged in a dedicated reference folder. Version v2.2.8 SHALL be the current design and behavior reference, and the earlier v2.1.15 file SHALL be kept unchanged as history. The folder's documentation SHALL name the current version and record a checksum for each file. The legacy files SHALL NOT be part of the application build.

#### Scenario: Building the application
- **WHEN** the production build runs
- **THEN** the output contains no copy of either legacy reference file

#### Scenario: Finding the current reference
- **WHEN** a contributor opens the legacy reference folder's documentation
- **THEN** it names v2.2.8 as the current reference, describes v2.1.15 as the earlier version, and gives a checksum for each file
