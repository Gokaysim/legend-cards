# Spec Delta

## MODIFIED Requirements

### Requirement: Domain reference document
The repository SHALL contain a domain reference document that explains what Legend Card Manager is: a tracking tool for a DM's side card system in a D&D 5e group, not a game engine. It SHALL define the domain terms and list the game rules observed in the current legacy reference version, marking which rules are deliberate design decisions. It SHALL also record the legacy rules page's table rules, and list each disagreement with observed behavior as an open question until the owner settles it.

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
- **WHEN** a contributor reads how many Blessed cards each mechanic has
- **THEN** the domain reference shows the rules page's statement and the legacy application's behavior, records the owner's decision that the card data decides, and notes that the app's Kurallar screen follows that decision

#### Scenario: A disagreement still open
- **WHEN** the legacy rules page and the observed behavior disagree on a point the owner has not decided
- **THEN** the domain reference lists that point as an open question for the DM, with both sides
