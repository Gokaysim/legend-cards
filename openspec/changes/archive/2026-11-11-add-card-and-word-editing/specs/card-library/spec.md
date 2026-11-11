# Spec Delta

## MODIFIED Requirements

### Requirement: Card definitions
Every card SHALL be stored once, with a kind, a status (spec: definition-editing) and its definition: name, set code, cost, rarity, mechanic pack, and text. The kind SHALL be one of "normal", "blessed" or "cursed". A Blessed card SHALL have no set code and no rarity. A Cursed card SHALL have no set code, no rarity, and no mechanic pack. A cost MAY be absent. Each card keeps its cost as written, for example "X" or "d6". A draft MAY lack the other fields its kind requires.

#### Scenario: A Blessed card
- **WHEN** a user looks at a Blessed card
- **THEN** it shows "Blessed" in place of a set, "—" as its rarity, and its mechanic pack

#### Scenario: A Cursed card
- **WHEN** a user looks at a Cursed card
- **THEN** it shows its name, cost, and text, and has no rarity or mechanic pack

#### Scenario: A card without a cost
- **WHEN** a user looks at a card whose cost is absent
- **THEN** the cost shows as "—"

#### Scenario: A cost that is not a number
- **WHEN** a user looks at a card whose cost is "d6"
- **THEN** the cost shows as "d6"

#### Scenario: A draft without a set
- **WHEN** the DM looks at the normal draft "The Cartographer", which has no set, rarity or mechanic pack
- **THEN** its set, rarity and mechanic pack show as empty, and it is marked "Taslak"

### Requirement: Cards readable by every signed-in user
Every signed-in user SHALL be able to read every active and every retired card, the DM and the players alike. Only the DM SHALL be able to read a draft. A player's device SHALL never receive a draft. Signed-out requests SHALL be denied.

#### Scenario: A player reads the cards
- **WHEN** a signed-in player reads the cards
- **THEN** they get every active and retired card definition, including the Cursed cards, and no draft

#### Scenario: A player reads a draft
- **WHEN** a signed-in player tries to read the draft "Bard's Encore"
- **THEN** the server denies it

#### Scenario: The DM reads the cards
- **WHEN** the signed-in DM reads the cards
- **THEN** they get every card, including the drafts

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user tries to read a card
- **THEN** the server denies it

### Requirement: Retired cards are hidden
A draft or a retired card SHALL NOT appear in a player's Kart kütüphanesi or Cursed Deck, or in their counts. The DM SHALL see them there only through the status filter. A retired card's stored definition SHALL be kept.

#### Scenario: A card removed from the data
- **WHEN** the DM retires a card
- **THEN** it no longer appears in the Kart kütüphanesi, and the card count is one lower

#### Scenario: A draft
- **WHEN** the DM adds the draft "Bard's Encore"
- **THEN** no player's Kart kütüphanesi lists it, and the players' card count does not change

### Requirement: Kart kütüphanesi lists the Legend cards live
The Kart kütüphanesi screen SHALL list every active normal and Blessed card, and no Cursed card. It SHALL show the number of cards it lists. A change to the cards SHALL appear on every open device without a page reload.

#### Scenario: Opening the library
- **WHEN** a signed-in user opens the Kart kütüphanesi after the initial data was imported
- **THEN** the screen lists 588 cards, none of them Cursed, and says that it shows 588 cards

#### Scenario: An import while the screen is open
- **WHEN** an import adds an active card while a user has the Kart kütüphanesi open
- **THEN** the new card appears on that user's screen without a reload

#### Scenario: A card published while the screen is open
- **WHEN** the DM publishes a draft while Ayla has the Kart kütüphanesi open
- **THEN** the card appears on Ayla's screen without a reload

## REMOVED Requirements

### Requirement: Card definitions are read-only for the application
**Reason**: The DM now adds and edits cards in the application (spec: definition-editing). The import script is no longer the only writer.
**Migration**: "Who writes card definitions" below keeps the holder rules and the ban on mixing a holder change with a definition change. The DM's steps and their checks are in definition-editing.

## ADDED Requirements

### Requirement: Who writes card definitions
The application SHALL change a card's definition and status only through the DM's steps in definition-editing. It SHALL change a normal card's holder only as the card-holdings rules allow. The server SHALL deny a write that changes a card's holder together with its definition or status.

#### Scenario: Text changed together with the holder
- **WHEN** the DM gives a card and, in the same write, changes its text
- **THEN** the server denies the whole write

#### Scenario: A player changes a definition
- **WHEN** a signed-in player tries to change a card's text
- **THEN** the server denies the write, and the card does not change

### Requirement: The DM's status filter
For the DM, the Kart kütüphanesi and the Cursed Deck SHALL offer a status filter with "Yayında", "Taslak", "Kaldırıldı" and "Hepsi", starting at "Yayında". It SHALL combine with the search and the other filters, and the count SHALL follow it. With "Taslak", "Kaldırıldı" or "Hepsi" chosen, each card's face and list row SHALL show its status. Players SHALL NOT see the filter.

#### Scenario: Finding the drafts
- **WHEN** the DM chooses "Taslak" in the Kart kütüphanesi after the initial data was imported
- **THEN** only "Hrolf's Hornswaggle", "The Grand Finale" and "The Cartographer" are listed, each marked "Taslak"

#### Scenario: A retired card in a hand
- **WHEN** the DM chooses "Kaldırıldı" while Ayla holds the retired card "Aboleth's Eyes"
- **THEN** "Aboleth's Eyes" is listed, marked "Kaldırıldı", with "Elde: Ayla" as its status

#### Scenario: A player's library
- **WHEN** Ayla opens the Kart kütüphanesi
- **THEN** she sees no status filter, and only active cards are listed
