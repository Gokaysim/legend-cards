# Spec Delta

## MODIFIED Requirements

### Requirement: Equal chance from the pool
A random draw SHALL pick one card, each with the same chance, from the drawable cards: the active normal and Blessed cards whose "Kart çekmede çıkar" is on and that no one holds as their one copy. Held cards with one copy, Cursed cards, True Words, retired cards and cards whose "Kart çekmede çıkar" is off SHALL never be drawn. The server SHALL deny a random draw of any of them.

#### Scenario: A Blessed card can come up
- **WHEN** the pool holds 572 normal cards without a holder and 19 Blessed cards, and Ayla draws
- **THEN** each of the 591 cards has the same chance, including each Blessed card

#### Scenario: A held card
- **WHEN** Bora holds "Aboleth's Eyes", which has one copy
- **THEN** no random draw gives "Aboleth's Eyes"

#### Scenario: A forged draw of a held card
- **WHEN** a player writes a random draw of a card with one copy that Bora holds
- **THEN** the server denies it

#### Scenario: A forged random draw of a Cursed card
- **WHEN** a player writes a random draw of a Cursed card
- **THEN** the server denies it

#### Scenario: A DM-only card
- **WHEN** "The Last Wish" is an active normal card that no one holds, with "Kart çekmede çıkar" off
- **THEN** no random draw gives it, also not the DM's

#### Scenario: A forged draw of a DM-only card
- **WHEN** a player writes a random draw of "The Last Wish", whose "Kart çekmede çıkar" is off
- **THEN** the server denies it

#### Scenario: A repeatable card in a hand
- **WHEN** "Aboleth's Eyes" has "Birden fazla elde olabilir" on, and Bora holds it
- **THEN** a random draw can still give it

### Requirement: Cursed draw
The hand's owner and the DM SHALL be able to draw a random card from the Cursed Deck into that hand, free of charge. The Cursed Deck SHALL be the active Cursed cards whose "Cursed Deck'te çıkar" is on and that no one holds as their one copy, each with the same chance. Any other Cursed card SHALL never be drawn, and the server SHALL deny a Cursed draw of one. A player SHALL NOT make a Cursed draw into another player's hand.

#### Scenario: A player draws a Cursed card
- **WHEN** Ayla, who has 2 LP, selects "☠ Cursed Kart Çek" in her Cursed draw dialog
- **THEN** a Cursed card is added to the end of her hand, and she still has 2 LP

#### Scenario: Two Cursed cards
- **WHEN** Ayla draws a Cursed card twice in the same dialog
- **THEN** both Cursed cards are in her hand

#### Scenario: Into another hand
- **WHEN** Ayla tries to make a Cursed draw into Bora's hand
- **THEN** the server denies it

#### Scenario: An empty Cursed Deck
- **WHEN** the Cursed Deck has no active cards
- **THEN** the "☠ Cursed Kart Çek" button is disabled

#### Scenario: Only DM-only Cursed cards left
- **WHEN** every active Cursed card has "Cursed Deck'te çıkar" off
- **THEN** the "☠ Cursed Kart Çek" button is disabled

#### Scenario: A forged Cursed draw of a DM-only card
- **WHEN** Ayla writes a Cursed draw of "Visions of Death", whose "Cursed Deck'te çıkar" is off
- **THEN** the server denies it

#### Scenario: A Cursed card with one copy
- **WHEN** Bora holds "Where They Breed", whose "Birden fazla elde olabilir" is off
- **THEN** no Cursed draw gives it, and the server denies one
