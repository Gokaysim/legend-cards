## MODIFIED Requirements

### Requirement: Blessed chance in a draw
The rules SHALL say that, in a card draw, every card in the deck has the same chance, Blessed cards among them. They SHALL NOT state a fixed percentage for finding a Blessed card in a draw, because the app gives every drawable card the same chance.

#### Scenario: Reading the Blessed rarity
- **WHEN** a user reads "Blessed Kartların Nadirliği"
- **THEN** it says that every card in the deck has the same chance in a draw, Blessed cards among them, and it states no percentage

### Requirement: Blessed cards in packs and mechanics
The rules SHALL name Mechanic, Golden and Pandemonium Packs as the packs where Blessed cards can be found, and SHALL say that each card of those packs is Blessed with a 2% chance and that the Cursed packs give no Blessed card. They SHALL say that each mechanic has its own Blessed cards, without a count or a formula, because the card data decides how many there are.

#### Scenario: Reading where Blessed cards come from
- **WHEN** a user reads "Paketlerdeki Blessed Kartlar"
- **THEN** it names Mechanic, Golden and Pandemonium Packs, and it does not mention Rare Packs

#### Scenario: Reading the Blessed chance in packs
- **WHEN** a user reads "Paketlerdeki Blessed Kartlar"
- **THEN** it says "Mechanic, Golden ve Pandemonium Pack'lerinde her kartın Blessed çıkma şansı %2'dir yavrum; Cursed paketlerde Blessed çıkmaz."

#### Scenario: No per-mechanic formula
- **WHEN** a user reads "Paketlerdeki Blessed Kartlar"
- **THEN** it says each mechanic has its own Blessed cards, and it does not say "one more for every 50 cards"
