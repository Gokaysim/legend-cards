# card-library Specification

## Purpose

Keeps the card definitions of the DM's side card system, the Legend cards (normal and Blessed) and the Cursed cards, and lets every signed-in user browse them live in the Kart kütüphanesi and the Cursed Deck.

## Requirements

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
The Kart kütüphanesi screen SHALL list every active normal and Blessed card, and no Cursed card; a player's screen leaves out the DM-only cards. It SHALL show the number of cards it lists. A change to the cards SHALL appear on every open device without a page reload.

#### Scenario: Opening the library
- **WHEN** a signed-in user opens the Kart kütüphanesi after the initial data was imported
- **THEN** the screen lists 588 cards, none of them Cursed, and says that it shows 588 cards

#### Scenario: An import while the screen is open
- **WHEN** an import adds an active card while a user has the Kart kütüphanesi open
- **THEN** the new card appears on that user's screen without a reload

#### Scenario: A card published while the screen is open
- **WHEN** the DM publishes a draft while Ayla has the Kart kütüphanesi open
- **THEN** the card appears on Ayla's screen without a reload

#### Scenario: A card marked DM-only while the screen is open
- **WHEN** the DM marks an active card DM-only while Ayla has the Kart kütüphanesi open
- **THEN** the card disappears from Ayla's screen without a reload

### Requirement: Pool status in the library
The Kart kütüphanesi SHALL show each card's status, live. A normal card without a holder is "Havuzda". A held normal card is "Elde:" with the names of everyone holding a copy, and its card face is marked. A Blessed card is always "Havuzda", followed by the names of those holding it, if any. A DM-only card is never in the pool: it is "DM'e özel", followed by "Elde:" and the names of those holding it, if any. The screen SHALL show how many cards are in the pool and how many copies are in hands.

#### Scenario: A held card
- **WHEN** Ayla holds "Aboleth's Eyes"
- **THEN** the library shows it as "Elde: Ayla" and marks its face

#### Scenario: Back in the pool
- **WHEN** Ayla uses that card while another user has the library open
- **THEN** the card shows as "Havuzda" there without a reload, and the pool count is one higher

#### Scenario: A Blessed card in a hand
- **WHEN** Ayla holds the Blessed card "Second Wind"
- **THEN** the library shows it as "Havuzda · Elde: Ayla"

#### Scenario: A DM-only card in a hand
- **WHEN** Bora holds the DM-only card "The Last Wish", and the DM opens the library
- **THEN** it shows as "DM'e özel · Elde: Bora", and the pool count leaves it out

### Requirement: Cursed Deck lists the Cursed cards live
The Cursed Deck screen SHALL list every active Cursed card, and no other card; a player's screen leaves out the DM-only cards. It SHALL show the number of cards it lists. A change to the cards SHALL appear on every open device without a page reload.

#### Scenario: Opening the Cursed Deck
- **WHEN** a signed-in user opens the Cursed Deck after the initial data was imported
- **THEN** the screen lists 154 cards, all of them Cursed

#### Scenario: A DM-only Cursed card
- **WHEN** "Visions of Death" is DM-only, and Ayla opens the Cursed Deck
- **THEN** it is not listed, and the DM's Cursed Deck lists it marked "🔒 DM"

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
Both screens SHALL offer a card view that shows each listed card as a card face. The face SHALL show the cost, name, set, rarity, mechanic pack, and text. On a face with the card's picture, the set, rarity and mechanic pack SHALL show on hover or tap of the picture's set symbol. Its frame color, the printed one on a picture, SHALL show the card's kind: purple for Common, gold for Rare, white for Blessed, and red for Cursed. The Cursed Deck faces SHALL leave out set, rarity, and mechanic pack.

#### Scenario: Card view colors
- **WHEN** a user looks at a Common, a Rare, a Blessed, and a Cursed card without pictures in the card view
- **THEN** their frames are purple, gold, white, and red

#### Scenario: Card view with pictures
- **WHEN** a user looks at a Common and a Rare card with pictures in the card view
- **THEN** each shows its picture with its printed purple or gold frame, and no frame is drawn around the picture

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
The Kart kütüphanesi SHALL offer a "▥ Havuz Dağılımı" dialog, live, over the drawable cards: the active normal cards without a holder and every active Blessed card, none of them DM-only. It SHALL show how many cards that is, and each rarity's and each set's share as a percentage and a count. Blessed cards SHALL count as the rarity "Blessed" and the set "Blessed". Each rarity SHALL list its sets with their counts.

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

#### Scenario: A DM-only card
- **WHEN** the DM marks an active Rare card without a holder as DM-only while the dialog is open
- **THEN** the total and the Rare count are one lower without a reload

### Requirement: Who writes card definitions
The application SHALL change a card's definition and status only through the DM's steps in definition-editing. It SHALL change a normal card's holder only as the card-holdings rules allow. The server SHALL deny a write that changes a card's holder together with its definition or status.

#### Scenario: Text changed together with the holder
- **WHEN** the DM gives a card and, in the same write, changes its text
- **THEN** the server denies the whole write

#### Scenario: A player changes a definition
- **WHEN** a signed-in player tries to change a card's text
- **THEN** the server denies the write, and the card does not change

### Requirement: The DM's status filter
For the DM, the Kart kütüphanesi and the Cursed Deck SHALL offer a status filter with "Yayında", "Taslak", "Kaldırıldı", "DM'e özel" and "Hepsi", starting at "Yayında". "DM'e özel" SHALL list the DM-only cards of every status. It SHALL combine with the search and the other filters, and the count SHALL follow it. With "Taslak", "Kaldırıldı" or "Hepsi" chosen, each card's face and list row SHALL show its status. Players SHALL NOT see the filter.

#### Scenario: Finding the drafts
- **WHEN** the DM chooses "Taslak" in the Kart kütüphanesi after the initial data was imported
- **THEN** only "Hrolf's Hornswaggle", "The Grand Finale" and "The Cartographer" are listed, each marked "Taslak"

#### Scenario: A retired card in a hand
- **WHEN** the DM chooses "Kaldırıldı" while Ayla holds the retired card "Aboleth's Eyes"
- **THEN** "Aboleth's Eyes" is listed, marked "Kaldırıldı", with "Elde: Ayla" as its status

#### Scenario: A player's library
- **WHEN** Ayla opens the Kart kütüphanesi
- **THEN** she sees no status filter, and only active cards are listed

#### Scenario: Finding the DM-only cards
- **WHEN** the DM chooses "DM'e özel" while "The Last Wish" is active and "Crown of Ash" is a draft, both DM-only
- **THEN** only those two are listed, each marked "🔒 DM"

### Requirement: DM-only cards are hidden from players
A DM-only card SHALL NOT appear in a player's Kart kütüphanesi or Cursed Deck, or in their counts, also while someone holds it. The hiding is in the interface only: a player's device still reads the card, because the hands show it. The DM SHALL see DM-only cards in the lists, marked "🔒 DM" on their face and list row.

#### Scenario: A player's library
- **WHEN** "The Last Wish" is an active DM-only card, and Ayla opens the Kart kütüphanesi
- **THEN** it is not listed, and the card count leaves it out

#### Scenario: A held DM-only card
- **WHEN** the DM gives "The Last Wish" to Bora, and Ayla opens the Kart kütüphanesi
- **THEN** it is still not listed

#### Scenario: The DM's library
- **WHEN** the DM opens the Kart kütüphanesi
- **THEN** "The Last Wish" is listed and marked "🔒 DM"
