## MODIFIED Requirements

### Requirement: Equal chance from the pool
A random draw SHALL pick one card, each with the same chance, from the drawable cards: the active normal cards that no one holds, and every active Blessed card, none of them DM-only. Held normal cards, Cursed cards, retired cards and DM-only cards SHALL never be drawn. The server SHALL deny a random draw of any of them.

#### Scenario: A Blessed card can come up
- **WHEN** the pool holds 572 normal cards without a holder and 19 Blessed cards, and Ayla draws
- **THEN** each of the 591 cards has the same chance, including each Blessed card

#### Scenario: A held card
- **WHEN** Bora holds "Aboleth's Eyes"
- **THEN** no random draw gives "Aboleth's Eyes"

#### Scenario: A forged draw of a held card
- **WHEN** a player writes a random draw of a normal card that Bora holds
- **THEN** the server denies it

#### Scenario: A forged random draw of a Cursed card
- **WHEN** a player writes a random draw of a Cursed card
- **THEN** the server denies it

#### Scenario: A DM-only card
- **WHEN** "The Last Wish" is an active DM-only normal card that no one holds
- **THEN** no random draw gives it, also not the DM's

#### Scenario: A forged draw of a DM-only card
- **WHEN** a player writes a random draw of the DM-only card "The Last Wish"
- **THEN** the server denies it

### Requirement: Cursed draw
The hand's owner and the DM SHALL be able to draw a random card from the Cursed Deck into that hand, each active Cursed card that is not DM-only with the same chance, free of charge. A DM-only Cursed card SHALL never be drawn, and the server SHALL deny a Cursed draw of one. A player SHALL NOT make a Cursed draw into another player's hand.

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
- **WHEN** every active Cursed card is DM-only
- **THEN** the "☠ Cursed Kart Çek" button is disabled

#### Scenario: A forged Cursed draw of a DM-only card
- **WHEN** Ayla writes a Cursed draw of the DM-only Cursed card "Visions of Death"
- **THEN** the server denies it
