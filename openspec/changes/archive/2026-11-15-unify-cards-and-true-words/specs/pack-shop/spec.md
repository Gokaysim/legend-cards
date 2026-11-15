# Spec Delta

## ADDED Requirements

### Requirement: Packs follow the pack flags
The Standard, Premium and Cursed Packs and a one-pack set's two packs SHALL show only cards whose "Set paketlerinde çıkar" is on. The Mechanic, Golden and Cursed Golden Packs SHALL show only cards whose "Mechanic paketlerinde çıkar" is on. A pack's Cursed card SHALL come from the Cursed Deck (spec: card-draws, "Cursed draw"). Other cards SHALL NOT be candidates. The server SHALL deny choosing or taking any other card from a pack.

#### Scenario: A card kept out of set packs
- **WHEN** "The Last Wish" is a Kesqerian Nights Rare without a holder whose "Set paketlerinde çıkar" is off, and Ayla opens the Kesqerian Nights Premium Pack
- **THEN** the pack does not show "The Last Wish"

#### Scenario: Only in Mechanic Packs
- **WHEN** the same card has "Mechanic paketlerinde çıkar" on, and Ayla opens its Mechanic Pack
- **THEN** "The Last Wish" can be among its cards

#### Scenario: A Cursed card kept out of the deck
- **WHEN** "Visions of Death" has "Cursed Deck'te çıkar" off, and Ayla opens a Cursed Pack
- **THEN** its Cursed card is never "Visions of Death"

#### Scenario: A forged choice
- **WHEN** a player writes a choice from a set's pack of a card whose "Set paketlerinde çıkar" is off
- **THEN** the server denies it

## MODIFIED Requirements

### Requirement: When a pack can be opened
A pack SHALL be openable only while it has enough candidates: cards in the pool whose pack flag for that pack is on (spec: "Packs follow the pack flags"). A card with "Birden fazla elde olabilir" on is always in the pool. Standard: 9 cards of the set. Premium: 9 of the set, 3 of them Rare. Cursed: 5 Common cards of the set. A "Tek paket + Cursed" set's Pack: 9 Rares of the set. Its Cursed Pack: 5 Rares of the set. Mechanic: 29 cards of that mechanic pack. Golden: 49 Rares across all sets. Cursed Golden: 5 Rares across all sets.

#### Scenario: Too few cards in a set
- **WHEN** Ballad of Ulagal has 1 card in the pool
- **THEN** its Standard Pack cannot be opened, and the shop says in Turkish that the pool has too few cards for it

#### Scenario: Blessed cards count for a Mechanic Pack
- **WHEN** Blood & Battle has 27 normal cards and 3 Blessed cards in the pool, all with "Mechanic paketlerinde çıkar" on
- **THEN** the Blood & Battle Mechanic Pack can be opened

#### Scenario: Blessed cards do not count as Rare
- **WHEN** the pool has 48 Rare cards and 19 Blessed cards
- **THEN** the Golden Pack cannot be opened

#### Scenario: The Pandemonium Pack
- **WHEN** Pandemonium has 8 Rares in the pool
- **THEN** the Pandemonium Pack cannot be opened, and the Pandemonium Cursed Pack can be, while the Cursed Deck has an active card

#### Scenario: Cards kept out of set packs do not count
- **WHEN** Kesqerian Nights has 10 cards in the pool, 2 of them with "Set paketlerinde çıkar" off
- **THEN** its Standard Pack cannot be opened

### Requirement: Cursed packs need the Cursed Deck
The Cursed, Pandemonium Cursed and Cursed Golden Packs SHALL be openable only while the Cursed Deck (spec: card-draws, "Cursed draw") has at least one card, in addition to their own threshold.

#### Scenario: An empty Cursed Deck
- **WHEN** the Cursed Deck has no active cards
- **THEN** no Cursed, Pandemonium Cursed or Cursed Golden Pack can be opened, and the shop says why in Turkish

#### Scenario: Every Cursed card kept out of the deck
- **WHEN** every active Cursed card has "Cursed Deck'te çıkar" off
- **THEN** no Cursed, Pandemonium Cursed or Cursed Golden Pack can be opened

### Requirement: Set pack contents
A Standard Pack SHALL show 5 random cards of its set from the pool. A Premium Pack SHALL show 1 random Rare of its set and 4 more random cards of its set of any rarity. A Cursed Pack SHALL show 5 random Common cards of its set and 1 random Cursed card from the Cursed Deck. The set's cards SHALL be those whose "Set paketlerinde çıkar" is on. Each pack's cards SHALL be shown in random order.

#### Scenario: A Premium Pack
- **WHEN** Ayla opens the Kesqerian Nights Premium Pack
- **THEN** she sees 5 face-down Kesqerian Nights cards, at least one of them Rare

#### Scenario: A Cursed Pack
- **WHEN** Ayla opens the Kesqerian Nights Cursed Pack
- **THEN** she sees 6 face-down cards: 5 Common Kesqerian Nights cards and 1 Cursed card, in random order

### Requirement: Blessed cards in rare packs
The Pack and the Cursed Pack of a "Tek paket + Cursed" set SHALL draw their 5 cards from that set's Rares in the pool together with every active Blessed card in the pool, all of them with "Set paketlerinde çıkar" on. The Golden and Cursed Golden Packs SHALL draw theirs from every Rare in the pool together with every active Blessed card in the pool, all of them with "Mechanic paketlerinde çıkar" on. Each candidate SHALL have the same chance. The Golden Pack SHALL have no separate Blessed chance.

#### Scenario: A Blessed card in a Pandemonium Pack
- **WHEN** Ayla opens the Pandemonium Pack while 43 Pandemonium Rares and 19 Blessed cards are candidates
- **THEN** each of those 62 cards has the same chance to be among its 5 cards

#### Scenario: A Cursed Golden Pack
- **WHEN** Ayla opens the Cursed Golden Pack
- **THEN** she sees 5 cards drawn from the Rares and the Blessed cards, and 1 Cursed card

#### Scenario: Common cards of a one-pack set
- **WHEN** the set "Ulagal" has the "Tek paket + Cursed" layout and Common cards in the pool
- **THEN** no Common card of Ulagal can be among the cards of the Ballad of Ulagal Pack

#### Scenario: A Blessed card kept out of Golden Packs
- **WHEN** the Blessed card "Second Wind" has "Mechanic paketlerinde çıkar" off and "Set paketlerinde çıkar" on
- **THEN** no Golden Pack shows it, and the Pandemonium Pack can

### Requirement: Mechanic pack contents
A Mechanic Pack SHALL show 5 random cards of its mechanic pack from the pool, whose "Mechanic paketlerinde çıkar" is on. The mechanic pack's Blessed cards are among the candidates.

#### Scenario: A Mechanic Pack
- **WHEN** Ayla opens the Blood & Battle Mechanic Pack
- **THEN** she sees 5 face-down cards whose mechanic pack is Blood & Battle

### Requirement: Cards in a pack are distinct and in the pool
A pack SHALL never show the same card twice, and every card with one copy it shows SHALL be in the pool when the pack opens. Every candidate SHALL have the same chance in its part of the pack.

#### Scenario: A card taken while opening
- **WHEN** another device takes a pool card at the moment Ayla's pack is being opened with it
- **THEN** the pack opens with a different card in its place, and Ayla is charged once

### Requirement: Choosing a card
Once every card is face up, the hand's owner or the DM SHALL choose exactly one card that is not Cursed. It SHALL go to the end of the hand, a card with one copy SHALL leave the pool, and the pack SHALL end. The other shown cards SHALL stay where they were.

#### Scenario: Ayla chooses
- **WHEN** Ayla chooses "Aboleth's Eyes" from her open pack
- **THEN** "Aboleth's Eyes" is at the end of her hand, it is no longer in the pool, and the pack ends on every device

#### Scenario: The DM chooses for a player
- **WHEN** the DM chooses a card from Ayla's open pack
- **THEN** the card goes to Ayla's hand, and the pack ends

#### Scenario: Another player chooses
- **WHEN** Bora writes a choice into Ayla's open pack
- **THEN** the server denies it

## REMOVED Requirements

### Requirement: Packs never show DM-only cards
**Reason**: The DM-only flag is removed. "Packs follow the pack flags" covers what a pack may show, and a card whose "where" flags are all off is never a candidate.
**Migration**: None. "Sadece DM verebilir" turns the pack flags off.
