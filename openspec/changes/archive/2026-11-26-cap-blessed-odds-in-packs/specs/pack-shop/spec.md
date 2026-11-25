## MODIFIED Requirements

### Requirement: Blessed cards in rare packs
The Pack of a "Tek paket + Cursed" set SHALL draw its cards from that set's Rares and the Blessed cards in the pool with "Set paketlerinde çıkar" on, and the Golden Pack from every Rare and Blessed card in the pool with "Mechanic paketlerinde çıkar" on. Each of their 5 cards SHALL be Blessed with a 2% chance (spec: "Blessed cards come at 2% per card"). The Cursed Pack of such a set and the Cursed Golden Pack SHALL show no Blessed card: their 5 cards come from the same Rares alone.

#### Scenario: A Blessed card in a Pandemonium Pack
- **WHEN** Ayla opens the Pandemonium Pack while 25 Pandemonium Rares and 19 Blessed cards are candidates
- **THEN** each of its 5 cards is a Blessed card with a 2% chance, and a Pandemonium Rare otherwise

#### Scenario: A Cursed Golden Pack
- **WHEN** Ayla opens the Cursed Golden Pack
- **THEN** she sees 5 Rare cards and 1 Cursed card, and no Blessed card

#### Scenario: A Pandemonium Cursed Pack
- **WHEN** Ayla opens the Pandemonium Cursed Pack while Blessed cards with "Set paketlerinde çıkar" on are in the pool
- **THEN** she sees 5 Pandemonium Rares and 1 Cursed card, and no Blessed card

#### Scenario: Common cards of a one-pack set
- **WHEN** the set "Ulagal" has the "Tek paket + Cursed" layout and Common cards in the pool
- **THEN** no Common card of Ulagal can be among the cards of the Ballad of Ulagal Pack

#### Scenario: A Blessed card kept out of Golden Packs
- **WHEN** the Blessed card "Second Wind" has "Mechanic paketlerinde çıkar" off and "Set paketlerinde çıkar" on
- **THEN** no Golden Pack shows it, and the Pandemonium Pack can

### Requirement: Mechanic pack contents
A Mechanic Pack SHALL show 5 random cards of its mechanic pack from the pool, whose "Mechanic paketlerinde çıkar" is on. Each of its 5 cards SHALL be one of the mechanic pack's Blessed cards with a 2% chance, rolled on its own for each card (spec: "Blessed cards come at 2% per card"), and one of its normal cards otherwise.

#### Scenario: A Mechanic Pack
- **WHEN** Ayla opens the Blood & Battle Mechanic Pack
- **THEN** she sees 5 face-down cards whose mechanic pack is Blood & Battle

#### Scenario: The mechanic's own Blessed cards
- **WHEN** Ayla opens the Blood & Battle Mechanic Pack while the Blessed cards "Second Wind" (Blood & Battle) and "Fresh Start" (Risk & Reward) are in the pool
- **THEN** a card of the pack that rolls Blessed is "Second Wind", and the pack never shows "Fresh Start"

### Requirement: Cards in a pack are distinct and in the pool
A pack SHALL never show the same card twice, and every card with one copy it shows SHALL be in the pool when the pack opens. Every candidate SHALL have the same chance in its part of the pack: a Premium Pack's Rare, a card that rolled Blessed, the other cards, and a Cursed type's Cursed card.

#### Scenario: A card taken while opening
- **WHEN** another device takes a pool card at the moment Ayla's pack is being opened with it
- **THEN** the pack opens with a different card in its place, and Ayla is charged once

#### Scenario: Two cards roll Blessed
- **WHEN** two cards of a Golden Pack roll Blessed while 19 Blessed cards are candidates
- **THEN** the pack shows two different Blessed cards

### Requirement: Packs follow the pack flags
The Standard, Premium and Cursed Packs and a one-pack set's two packs SHALL show only cards whose "Set paketlerinde çıkar" is on. The Mechanic, Golden and Cursed Golden Packs SHALL show only cards whose "Mechanic paketlerinde çıkar" is on. A pack's Cursed card SHALL come from the Cursed Deck (spec: card-draws, "Cursed draw"). Other cards SHALL NOT be candidates. The server SHALL deny choosing or taking any other card from a pack, or a Blessed card from a Cursed type.

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

#### Scenario: A forged Blessed choice from a Cursed pack
- **WHEN** a player writes a choice of a Blessed card, with the pack flags on, from her open Cursed Golden Pack
- **THEN** the server denies it

## ADDED Requirements

### Requirement: Blessed cards come at 2% per card
In the packs that can show Blessed cards, each of the 5 cards SHALL be Blessed with a chance of exactly 1 in 50, rolled on its own, so a pack can show several Blessed cards. A card that rolls Blessed SHALL be a random Blessed candidate not already shown. When none is left, it SHALL be an ordinary candidate instead. The chance SHALL NOT depend on how many Blessed cards are in the pool.

#### Scenario: No card rolls Blessed
- **WHEN** none of the 5 cards of a Golden Pack rolls Blessed
- **THEN** the pack shows 5 Rares, even while Blessed cards are candidates

#### Scenario: Every Blessed card is held
- **WHEN** a card of a Pandemonium Pack rolls Blessed while no Blessed card is a candidate
- **THEN** that card is a Pandemonium Rare

#### Scenario: More Blessed cards, same chance
- **WHEN** the DM adds 10 more Blessed cards to the pool
- **THEN** each card of a Golden Pack is still Blessed with a 2% chance
