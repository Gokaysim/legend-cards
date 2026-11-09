# card-library Specification

## Purpose

Keeps the card definitions of the DM's side card system, the Legend cards (normal and Blessed) and the Cursed cards, and lets every signed-in user browse them live in the Kart kütüphanesi and the Cursed Deck.

## Requirements

### Requirement: Card definitions
Every card SHALL be stored once, with a kind and its definition: name, set code, cost, rarity, mechanic pack, and text. The kind SHALL be one of "normal", "blessed" or "cursed". A Blessed card SHALL have no set code and no rarity. A Cursed card SHALL have no set code, no rarity, and no mechanic pack. A cost MAY be absent. Each card keeps its cost as written, for example "X" or "d6".

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

### Requirement: Cards readable by every signed-in user
Every signed-in user SHALL be able to read every card, the DM and the players alike. Signed-out requests SHALL be denied.

#### Scenario: A player reads the cards
- **WHEN** a signed-in player reads the cards
- **THEN** they get every card definition, including the Cursed and the retired cards

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user tries to read a card
- **THEN** the server denies it

### Requirement: Card definitions are read-only for the application
The server SHALL deny every write from the application that creates a card, deletes a card, or changes any card field other than its holder, by any user, including the DM. Card definitions SHALL change only through the card import script. A holder SHALL change only as the card-holdings rules allow.

#### Scenario: The DM changes a card
- **WHEN** the signed-in DM tries to change a card's text from the application
- **THEN** the server denies the write and the card does not change

#### Scenario: A player adds a card
- **WHEN** a signed-in player tries to create a card
- **THEN** the server denies the write

#### Scenario: Deleting a card
- **WHEN** any signed-in user tries to delete a card
- **THEN** the server denies the delete

#### Scenario: Text changed together with the holder
- **WHEN** the DM gives a card and, in the same write, changes its text
- **THEN** the server denies the whole write

### Requirement: Retired cards are hidden
A card marked as retired SHALL NOT appear in the Kart kütüphanesi, in the Cursed Deck, or in their counts. Its stored definition SHALL be kept.

#### Scenario: A card removed from the data
- **WHEN** a card has been retired by an import
- **THEN** it no longer appears in the Kart kütüphanesi, and the card count is one lower

### Requirement: Kart kütüphanesi lists the Legend cards live
The Kart kütüphanesi screen SHALL list every active normal and Blessed card, and no Cursed card. It SHALL show the number of cards it lists. A change to the cards SHALL appear on every open device without a page reload.

#### Scenario: Opening the library
- **WHEN** a signed-in user opens the Kart kütüphanesi after the initial data was imported
- **THEN** the screen lists 590 cards, none of them Cursed, and says that it shows 590 cards

#### Scenario: An import while the screen is open
- **WHEN** an import adds a card while a user has the Kart kütüphanesi open
- **THEN** the new card appears on that user's screen without a reload

### Requirement: Pool status in the library
The Kart kütüphanesi SHALL show each card's status, live. A normal card without a holder is "Havuzda". A held normal card is "Elde:" with the names of everyone holding a copy, and its card face is marked. A Blessed card is always "Havuzda", followed by the names of those holding it, if any. The screen SHALL show how many cards are in the pool and how many copies are in hands.

#### Scenario: A held card
- **WHEN** Ayla holds "Aboleth's Eyes"
- **THEN** the library shows it as "Elde: Ayla" and marks its face

#### Scenario: Back in the pool
- **WHEN** Ayla uses that card while another user has the library open
- **THEN** the card shows as "Havuzda" there without a reload, and the pool count is one higher

#### Scenario: A Blessed card in a hand
- **WHEN** Ayla holds the Blessed card "Second Wind"
- **THEN** the library shows it as "Havuzda · Elde: Ayla"

### Requirement: Cursed Deck lists the Cursed cards live
The Cursed Deck screen SHALL list every active Cursed card, and no other card. It SHALL show the number of cards it lists. A change to the cards SHALL appear on every open device without a page reload.

#### Scenario: Opening the Cursed Deck
- **WHEN** a signed-in user opens the Cursed Deck after the initial data was imported
- **THEN** the screen lists 154 cards, all of them Cursed

### Requirement: Cursed card holders
The Cursed Deck SHALL show, for each Cursed card, the names of everyone who holds a copy of it, live.

#### Scenario: A Cursed card in two hands
- **WHEN** Ayla and Bora each hold "Visions of Death"
- **THEN** the Cursed Deck shows "Visions of Death" with both names

### Requirement: Card loading states
While the cards are loading, both screens SHALL show a loading indicator. If the cards cannot be loaded, they SHALL show a Turkish error message instead of the list. When there are no cards at all, they SHALL say so in Turkish.

#### Scenario: No cards imported yet
- **WHEN** a signed-in user opens the Cursed Deck before any card was imported
- **THEN** the screen says in Turkish that there are no cards yet

#### Scenario: Load error
- **WHEN** the cards cannot be read
- **THEN** the screen shows a Turkish error message and no card list

### Requirement: Card search
Both screens SHALL offer a search field. A query is split at commas and semicolons into terms, and a card matches only when every term appears in it. A term SHALL be matched against the card's name, set code, official set name, cost, rarity, mechanic pack, and text, including the hidden bracket text, and against the word "Blessed" or "Cursed" for those kinds. Matching SHALL ignore case, accents, spaces, and punctuation.

#### Scenario: Several terms
- **WHEN** a user searches the Kart kütüphanesi for "discard, draw"
- **THEN** only cards that contain both "discard" and "draw" are listed

#### Scenario: Accents and case
- **WHEN** a user searches for "brunn"
- **THEN** the card "Brünn's Batallion" is listed

#### Scenario: Official set name
- **WHEN** a user searches for "Kesqerian"
- **THEN** the cards of the set "Kesqer" are listed

#### Scenario: No match
- **WHEN** a search matches no card
- **THEN** the screen says in Turkish that no card was found, and lists none

### Requirement: Hidden bracket text
Text inside square brackets in a card's text SHALL NOT be shown anywhere on these screens. It SHALL still be searchable.

#### Scenario: A card with bracket text
- **WHEN** a user looks at a card whose text is "[Uno] Add +10 a d20 roll. If this is your only card, add +20."
- **THEN** the shown text is "Add +10 a d20 roll. If this is your only card, add +20."

#### Scenario: Searching bracket text
- **WHEN** a user searches the Kart kütüphanesi for "uno"
- **THEN** that card is listed

### Requirement: Official set names
The screens SHALL show a card's set by its official name, taken from a fixed list. A set code missing from that list SHALL be shown as written. Blessed cards SHALL show "Blessed" in place of a set.

#### Scenario: A known set
- **WHEN** a user looks at a card with the set code "Kesqer"
- **THEN** its set shows as "Kesqerian Nights"

#### Scenario: A set code with different capitalization
- **WHEN** a user looks at a card with the set code "The End Is Nigh"
- **THEN** its set shows as "The End is Nigh"

### Requirement: Library filters
The Kart kütüphanesi SHALL offer a set filter and a mechanic pack filter, which combine with each other and with the search. The set filter SHALL list the sets that have cards, in the fixed shop order, followed by "Blessed" when Blessed cards exist. The mechanic pack filter SHALL list the mechanic packs that have cards, in Turkish alphabetical order.

#### Scenario: Filtering by set
- **WHEN** a user picks "Kesqerian Nights" in the set filter
- **THEN** only the cards of the set "Kesqer" are listed, and the count says so

#### Scenario: Blessed cards
- **WHEN** a user picks "Blessed" in the set filter
- **THEN** only the 19 Blessed cards are listed

#### Scenario: Combined filters
- **WHEN** a user picks a set and a mechanic pack and types a search
- **THEN** only cards that match all three are listed

### Requirement: Pool-only filter
The Kart kütüphanesi SHALL offer a "Yalnızca havuzdakiler" filter that, when on, lists only the cards in the pool: the normal cards without a holder and every Blessed card. It combines with the search and the other filters.

#### Scenario: Hiding held cards
- **WHEN** a user turns on "Yalnızca havuzdakiler" while Ayla holds "Aboleth's Eyes"
- **THEN** "Aboleth's Eyes" is not listed, the Blessed cards still are, and the count says how many cards are shown

### Requirement: Card view
Both screens SHALL offer a card view that shows each listed card as a card face. The face SHALL show the cost, name, set, rarity, mechanic pack, and text. On a face with the card's picture, the set, rarity and mechanic pack SHALL show on hover or tap of the picture's set symbol. Its frame color SHALL show the card's kind: purple for Common, gold for Rare, white for Blessed, and red for Cursed. The Cursed Deck faces SHALL leave out set, rarity, and mechanic pack.

#### Scenario: Card view colors
- **WHEN** a user looks at a Common, a Rare, a Blessed, and a Cursed card in the card view
- **THEN** their frames are purple, gold, white, and red

#### Scenario: Phone width
- **WHEN** the card view is shown 360 CSS pixels wide
- **THEN** the card faces fit the width, and the page has no horizontal scrollbar

### Requirement: List view
Both screens SHALL offer a list view as a table with one row per card. The Kart kütüphanesi table SHALL have the columns Kart, Set, Cost, Rarity, Mechanic Pack, Metin, and Durum. The Cursed Deck table SHALL have the columns Kart, Cost, Metin, and Durum. The list SHALL start sorted by name. At narrow widths, the table SHALL scroll inside its own area, and the page SHALL NOT scroll horizontally.

#### Scenario: Switching views
- **WHEN** a user switches the Kart kütüphanesi from the card view to the list view
- **THEN** the same cards are listed as table rows, with the same search and filters applied

#### Scenario: Phone width
- **WHEN** the list view is shown 360 CSS pixels wide
- **THEN** the table scrolls sideways inside its area, and the page has no horizontal scrollbar

### Requirement: List sorting
Selecting a column heading in the list view SHALL sort the list by that column, and selecting it again SHALL reverse the order. Sorting SHALL use Turkish alphabetical order, with numbers in numeric order. When two cards have numeric costs, the Cost column SHALL compare them as numbers. Cards without a cost SHALL come last in both directions. Cards with equal values SHALL be ordered by name.

#### Scenario: Sorting by cost
- **WHEN** a user sorts the list by Cost
- **THEN** the cards with cost 0 come first, then 1, 2, 3, 5, and 6, cards with equal costs are in name order, and the cards without a cost come last

#### Scenario: Reversing the order
- **WHEN** a user selects the Cost heading a second time
- **THEN** the list is sorted by cost in descending order

### Requirement: Pool distribution
The Kart kütüphanesi SHALL offer a "▥ Havuz Dağılımı" dialog, live, over the drawable cards: the active normal cards without a holder and every active Blessed card. It SHALL show how many cards that is, and each rarity's and each set's share as a percentage and a count. Blessed cards SHALL count as the rarity "Blessed" and the set "Blessed". Each rarity SHALL list its sets with their counts.

#### Scenario: Reading the distribution
- **WHEN** the drawable cards are 300 Common, 100 Rare, and 20 Blessed cards, and a user opens "▥ Havuz Dağılımı"
- **THEN** the dialog shows 420 cards, and in Turkish number format Common "%71,4" (300), Rare "%23,8" (100), and Blessed "%4,8" (20)

#### Scenario: Sets within a rarity
- **WHEN** 60 of the 100 drawable Rare cards are from Kesqer
- **THEN** the Rare entry lists "Kesqerian Nights" with 60

#### Scenario: A card is drawn
- **WHEN** a normal card is drawn while a user has the dialog open
- **THEN** the counts and shares update without a reload

#### Scenario: An empty pool
- **WHEN** no card can be drawn and a user opens the dialog
- **THEN** it says in Turkish that the pool has no cards to show
