## MODIFIED Requirements

### Requirement: Official set names
The screens SHALL show a card's set by the official name of its stored set (spec: card-sets, "A card's set"). A set code that no stored set has SHALL be shown as written. Blessed cards SHALL show "Blessed" in place of a set.

#### Scenario: A known set
- **WHEN** a user looks at a card with the set code "Kesqer"
- **THEN** its set shows as "Kesqerian Nights"

#### Scenario: A set code with different capitalization
- **WHEN** a user looks at a card with the set code "The End Is Nigh"
- **THEN** its set shows as "The End is Nigh"

#### Scenario: A renamed set
- **WHEN** the DM changes the name of the set "Ulagal" to "The Ballad of Ulagal" while Ayla has the library open
- **THEN** the cards of Ulagal show "The Ballad of Ulagal" without a reload

### Requirement: Library filters
The Kart kütüphanesi SHALL offer a set filter and a mechanic pack filter, which combine with each other and with the search. The set filter SHALL list the sets that have cards, in the stored order, then set codes that no stored set has, followed by "Blessed" when Blessed cards exist. The mechanic pack filter SHALL list the mechanic packs that have cards, in Turkish alphabetical order.

#### Scenario: Filtering by set
- **WHEN** a user picks "Kesqerian Nights" in the set filter
- **THEN** only the cards of the set "Kesqer" are listed, and the count says so

#### Scenario: Blessed cards
- **WHEN** a user picks "Blessed" in the set filter
- **THEN** only the 19 Blessed cards are listed

#### Scenario: Combined filters
- **WHEN** a user picks a set and a mechanic pack and types a search
- **THEN** only cards that match all three are listed

#### Scenario: The stored order
- **WHEN** the DM moves "Ulagal" before "Havenholm" on the Setler screen
- **THEN** the set filter lists "Ballad of Ulagal" before "Throne of Havenholm"
