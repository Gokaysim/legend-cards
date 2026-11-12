## ADDED Requirements

### Requirement: Packs never show DM-only cards
No pack SHALL show a DM-only card: not among its cards, and not as its Cursed card. A DM-only card SHALL NOT count as a candidate for any part of a pack. The server SHALL deny choosing a DM-only card from a pack, and taking one as a pack's Cursed card.

#### Scenario: A DM-only Rare
- **WHEN** "The Last Wish" is a DM-only Kesqerian Nights Rare without a holder, and Ayla opens the Kesqerian Nights Premium Pack
- **THEN** the pack does not show "The Last Wish"

#### Scenario: A DM-only Cursed card
- **WHEN** "Visions of Death" is DM-only, and Ayla opens a Cursed Pack
- **THEN** its Cursed card is never "Visions of Death"

#### Scenario: A forged choice
- **WHEN** a player writes a pack choice of a DM-only card
- **THEN** the server denies it

## MODIFIED Requirements

### Requirement: Blessed cards in rare packs
The Pandemonium and Pandemonium Cursed Packs SHALL draw their 5 cards from the Pandemonium Rares in the pool together with every active Blessed card that is not DM-only. The Golden and Cursed Golden Packs SHALL draw theirs from every Rare in the pool together with every active Blessed card that is not DM-only. Each candidate SHALL have the same chance. The Golden Pack SHALL have no separate Blessed chance.

#### Scenario: A Blessed card in a Pandemonium Pack
- **WHEN** Ayla opens the Pandemonium Pack while 43 Pandemonium Rares and 19 Blessed cards are candidates
- **THEN** each of those 62 cards has the same chance to be among its 5 cards

#### Scenario: A Cursed Golden Pack
- **WHEN** Ayla opens the Cursed Golden Pack
- **THEN** she sees 5 cards drawn from the Rares and the Blessed cards, and 1 Cursed card
