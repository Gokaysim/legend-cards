## ADDED Requirements

### Requirement: DM-only cards reach hands only from the DM
A DM-only card SHALL come into a hand only by the DM's give or by a transfer. Once given, it SHALL show in the hand, its details and the log's give event to every signed-in user, as any held card does. A DM-only normal card SHALL still have one holder at a time.

#### Scenario: Giving a DM-only card
- **WHEN** the DM opens "+ Kart ver" on Ayla's hand, searches for "last wish", and gives the DM-only card "The Last Wish"
- **THEN** the card is added to the end of Ayla's hand, and Bora sees it there

#### Scenario: A player's hand
- **WHEN** Ayla holds "The Last Wish" and opens it from her hand
- **THEN** she sees its face, text and details as for any held card

## MODIFIED Requirements

### Requirement: Normal cards leave the pool while held
A normal card SHALL be out of the pool while it has a holder, and back in the pool when its holder's holding closes, unless it is DM-only: a DM-only card is never in the pool, and its holder is only cleared. Cursed and Blessed cards SHALL never have a holder. Any number of players can hold them, any number of times.

#### Scenario: Giving a pool card
- **WHEN** the DM gives a normal card that is in the pool to Ayla
- **THEN** the card is out of the pool, and Ayla is its holder

#### Scenario: Using a normal card
- **WHEN** Ayla uses that card
- **THEN** the card is back in the pool and has no holder

#### Scenario: A Cursed card twice
- **WHEN** the DM gives the Cursed card "Visions of Death" to Ayla and then to Bora
- **THEN** both hold it, and it stays in the Cursed Deck

#### Scenario: Using a DM-only card
- **WHEN** Ayla uses the DM-only normal card "The Last Wish"
- **THEN** it has no holder, is not in the pool, and the DM can give it again

#### Scenario: The flag is turned off
- **WHEN** the DM turns off the DM-only flag of "The Last Wish" while no one holds it
- **THEN** the card is in the pool
