## MODIFIED Requirements

### Requirement: Pack Shop layout
The Pack Shop screen SHALL show two sections. Set Packs has one group per set that has an active card, in the stored set order (spec: card-sets), then set codes that no stored set has, and selecting a group shows its packs and a way back. Mechanic Packs has one pack per mechanic pack in Turkish alphabetical order, its price in the section heading, and the Golden Packs group as its last tile. Every other pack SHALL show its price.

#### Scenario: Opening the Pack Shop
- **WHEN** a signed-in user opens the Pack Shop with the sets as the repository imports them
- **THEN** the screen shows "Set Packs" with a group per set, ending with Pandemonium, and "Mechanic Packs" with the heading price "4 LP / 10.000 GP", one tile per mechanic pack, and the "Golden Packs" group last

#### Scenario: A set's packs
- **WHEN** the user selects the "Kesqerian Nights Packs" group
- **THEN** the Standard, Premium and Cursed Packs of Kesqerian Nights are shown, each with its price, and a way back to the whole shop

#### Scenario: A reordered set
- **WHEN** the DM moves "Pandemonium" to the top of the order on the Setler screen
- **THEN** the Pandemonium group is the first group of Set Packs on every device, without a reload

### Requirement: Pack types
Each set with the "Standart / Premium / Cursed" layout SHALL have a Standard, a Premium and a Cursed Pack. Each set with the "Tek paket + Cursed" layout SHALL have a "<set> Pack" and a "<set> Cursed Pack", as Pandemonium has. Each mechanic pack SHALL have one Mechanic Pack. There SHALL be one Golden Pack and one Cursed Golden Pack across all sets. Pack names use the sets' official names.

#### Scenario: Pack names
- **WHEN** a user looks at the packs
- **THEN** they include "Kesqerian Nights Standard Pack", "Pandemonium Cursed Pack", "Blood & Battle Mechanic Pack", "Golden Pack" and "Cursed Golden Pack"

#### Scenario: No Standard Pack for Pandemonium
- **WHEN** a user opens the Pandemonium group
- **THEN** it shows only the Pandemonium Pack and the Pandemonium Cursed Pack

#### Scenario: Another set with one pack
- **WHEN** the DM gives the set "Ulagal" the "Tek paket + Cursed" layout
- **THEN** the Ballad of Ulagal group shows only the "Ballad of Ulagal Pack" and the "Ballad of Ulagal Cursed Pack", priced as the Pandemonium Pack and the Pandemonium Cursed Pack

#### Scenario: A set code no stored set has
- **WHEN** an active card has the set code "Zaddir", and no stored set has that code
- **THEN** the "Zaddir Packs" group shows a Standard, a Premium and a Cursed Pack

### Requirement: When a pack can be opened
A pack SHALL be openable only while the pool has enough cards for it, counting only the cards in the pool (Blessed cards are always in it). Standard: 9 cards of the set. Premium: 9 of the set, 3 of them Rare. Cursed: 5 Common cards of the set. A "Tek paket + Cursed" set's Pack: 9 Rares of the set. Its Cursed Pack: 5 Rares of the set. Mechanic: 29 cards of that mechanic pack. Golden: 49 Rares across all sets. Cursed Golden: 5 Rares across all sets.

#### Scenario: Too few cards in a set
- **WHEN** Ballad of Ulagal has 1 card in the pool
- **THEN** its Standard Pack cannot be opened, and the shop says in Turkish that the pool has too few cards for it

#### Scenario: Blessed cards count for a Mechanic Pack
- **WHEN** Blood & Battle has 27 normal cards and 3 Blessed cards in the pool
- **THEN** the Blood & Battle Mechanic Pack can be opened

#### Scenario: Blessed cards do not count as Rare
- **WHEN** the pool has 48 Rare cards and 19 Blessed cards
- **THEN** the Golden Pack cannot be opened

#### Scenario: The Pandemonium Pack
- **WHEN** Pandemonium has 8 Rares in the pool
- **THEN** the Pandemonium Pack cannot be opened, and the Pandemonium Cursed Pack can be, while the Cursed Deck has an active card

### Requirement: Blessed cards in rare packs
The Pack and the Cursed Pack of a "Tek paket + Cursed" set SHALL draw their 5 cards from that set's Rares in the pool together with every active Blessed card that is not DM-only. The Golden and Cursed Golden Packs SHALL draw theirs from every Rare in the pool together with every active Blessed card that is not DM-only. Each candidate SHALL have the same chance. The Golden Pack SHALL have no separate Blessed chance.

#### Scenario: A Blessed card in a Pandemonium Pack
- **WHEN** Ayla opens the Pandemonium Pack while 43 Pandemonium Rares and 19 Blessed cards are candidates
- **THEN** each of those 62 cards has the same chance to be among its 5 cards

#### Scenario: A Cursed Golden Pack
- **WHEN** Ayla opens the Cursed Golden Pack
- **THEN** she sees 5 cards drawn from the Rares and the Blessed cards, and 1 Cursed card

#### Scenario: Common cards of a one-pack set
- **WHEN** the set "Ulagal" has the "Tek paket + Cursed" layout and Common cards in the pool
- **THEN** no Common card of Ulagal can be among the cards of the Ballad of Ulagal Pack
