# card-library Specification

## Purpose

Keeps the card definitions of the DM's side card system, the Legend cards (normal and Blessed) and the Cursed cards, and lets every signed-in user browse them live in the Kütüphane: its Kartlar and Cursed tabs, and its True Words tab with the same browser.

## Requirements

### Requirement: Card definitions
Every card SHALL be stored once, with a kind, a status (spec: definition-editing), its behavior flags (spec: definition-editing, "Behavior flags") and its definition: name, set code, cost, rarity, mechanic pack, and text. The kind SHALL be one of "normal", "blessed", "cursed", "trueWord" or "custom". A Blessed card SHALL have no set code and no rarity. A Cursed card, a True Word and a Custom Card SHALL have no set code, no rarity, and no mechanic pack. A Custom Card SHALL also have its effects and its draft (spec: custom-cards). A cost MAY be absent, except for a True Word that is not a draft. Each card keeps its cost as written, for example "X" or "d6". A draft MAY lack the other fields its kind requires.

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

#### Scenario: A True Word among the definitions
- **WHEN** a user opens the Kütüphane's Kartlar tab or its Cursed tab
- **THEN** no True Word is listed there

#### Scenario: A Custom Card among the definitions
- **WHEN** the DM or a player opens any tab of the Kütüphane, with any filter
- **THEN** no Custom Card is listed there, and none is counted

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
A draft or a retired card or True Word SHALL NOT appear in any tab of a player's Kütüphane, or in its counts. The DM SHALL see them there only through the status filter. A retired definition's stored fields SHALL be kept.

#### Scenario: A card removed from the data
- **WHEN** the DM retires a card
- **THEN** it no longer appears in the Kütüphane's Kartlar tab, and the tab's count is one lower

#### Scenario: A draft
- **WHEN** the DM adds the draft "Bard's Encore"
- **THEN** no player's Kütüphane lists it, and the players' Kartlar count does not change

#### Scenario: A retired True Word
- **WHEN** the DM retires the True Word "Abyss"
- **THEN** it no longer appears in a player's True Words tab, and that tab's count is one lower

### Requirement: The Kartlar tab lists the Legend cards live
The Kütüphane's Kartlar tab SHALL list every active normal and Blessed card, and no Cursed card or True Word; a player's tab leaves out the cards whose "Listede görünür" is off. It SHALL show the number of cards it lists. A change to the cards SHALL appear on every open device without a page reload.

#### Scenario: Opening the library
- **WHEN** a signed-in user opens the Kartlar tab after the initial data was imported
- **THEN** the tab lists 588 cards, none of them Cursed, and says that it shows 588 cards

#### Scenario: An import while the screen is open
- **WHEN** an import adds an active card while a user has the Kartlar tab open
- **THEN** the new card appears on that user's screen without a reload

#### Scenario: A card published while the screen is open
- **WHEN** the DM publishes a draft while Ayla has the Kartlar tab open
- **THEN** the card appears on Ayla's screen without a reload

#### Scenario: A card marked DM-only while the screen is open
- **WHEN** the DM turns off "Listede görünür" of an active card while Ayla has the Kartlar tab open
- **THEN** the card disappears from Ayla's screen without a reload

### Requirement: Pool status in the library
The Kartlar tab SHALL show each card's status, live. A card is in the pool when it is active, no one holds it as its one copy, and at least one of "Kart çekmede çıkar", "Set paketlerinde çıkar" and "Mechanic paketlerinde çıkar" is on. Such a card is "Havuzda". A held card with one copy is "Elde:" with the names of everyone holding a copy, and its card face is marked. A card with "Birden fazla elde olabilir" on is "Havuzda" followed by the names of those holding it, if any. A card with those three flags off is never in the pool: it is "DM'e özel", followed by "Elde:" and the names of those holding it, if any. The tab SHALL show how many cards are in the pool and how many copies are in hands.

#### Scenario: A held card
- **WHEN** Ayla holds "Aboleth's Eyes"
- **THEN** the library shows it as "Elde: Ayla" and marks its face

#### Scenario: Back in the pool
- **WHEN** Ayla uses that card while another user has the library open
- **THEN** the card shows as "Havuzda" there without a reload, and the pool count is one higher

#### Scenario: A Blessed card in a hand
- **WHEN** Ayla holds the Blessed card "Second Wind", whose "Birden fazla elde olabilir" is on
- **THEN** the library shows it as "Havuzda · Elde: Ayla"

#### Scenario: A DM-only card in a hand
- **WHEN** Bora holds "The Last Wish", whose three channel flags are off, and the DM opens the library
- **THEN** it shows as "DM'e özel · Elde: Bora", and the pool count leaves it out

#### Scenario: A card only in packs
- **WHEN** "Crown of Ash" has "Kart çekmede çıkar" off and "Set paketlerinde çıkar" on, and no one holds it
- **THEN** it shows as "Havuzda", and the pool count includes it

### Requirement: The Cursed tab lists the Cursed cards live
The Kütüphane's Cursed tab SHALL list every active Cursed card, and no other card; a player's tab leaves out the cards whose "Listede görünür" is off. It SHALL show the number of cards it lists. A change to the cards SHALL appear on every open device without a page reload.

#### Scenario: Opening the Cursed Deck
- **WHEN** a signed-in user opens the Kütüphane's Cursed tab after the initial data was imported
- **THEN** the tab lists 154 cards, all of them Cursed

#### Scenario: A DM-only Cursed card
- **WHEN** "Visions of Death" has "Listede görünür" off, and Ayla opens the Cursed tab
- **THEN** it is not listed, and the DM's Cursed tab lists it marked "🔒 DM"

### Requirement: Cursed card holders
The Cursed tab SHALL show, for each Cursed card, the names of everyone who holds a copy of it, live. It SHALL show how many copies of Cursed cards are in hands.

#### Scenario: A Cursed card in two hands
- **WHEN** Ayla and Bora each hold "Visions of Death"
- **THEN** the Cursed tab shows "Visions of Death" with both names

#### Scenario: Copies in hands
- **WHEN** Ayla and Bora each hold "Visions of Death", and Bora also holds "Scorched Earth"
- **THEN** the Cursed tab says that 3 copies are in hands

### Requirement: Card loading states
While the definitions are loading, every tab of the Kütüphane SHALL show a loading indicator. If they cannot be loaded, it SHALL show a Turkish error message instead of the list. When the tab has nothing to list at all, it SHALL say so in Turkish.

#### Scenario: No cards imported yet
- **WHEN** a signed-in user opens the Cursed tab before any card was imported
- **THEN** the tab says in Turkish that there are no cards yet

#### Scenario: No True Words yet
- **WHEN** a signed-in user opens the True Words tab before any True Word was imported
- **THEN** the tab says in Turkish that there are no True Words yet

#### Scenario: Load error
- **WHEN** the cards cannot be read
- **THEN** the tab shows a Turkish error message and no card list

### Requirement: Card search
Every tab of the Kütüphane SHALL offer a search field. A query is split at commas and semicolons into terms, and a definition matches only when every term appears in it. A term SHALL be matched against the definition's name, set code, official set name, cost, rarity, mechanic pack, and text, including the hidden bracket text, and against the word "Blessed" or "Cursed" for those kinds. Matching SHALL ignore case, accents, spaces, and punctuation.

#### Scenario: Several terms
- **WHEN** a user searches the Kartlar tab for "discard, draw"
- **THEN** only cards that contain both "discard" and "draw" are listed

#### Scenario: Accents and case
- **WHEN** a user searches for "brunn"
- **THEN** the card "Brünn's Batallion" is listed

#### Scenario: Official set name
- **WHEN** a user searches for "Kesqerian"
- **THEN** the cards of the set "Kesqer" are listed

#### Scenario: Searching the True Words
- **WHEN** a user searches the True Words tab for "abyss"
- **THEN** only the words whose name or text contains "abyss" are listed

#### Scenario: No match
- **WHEN** a search matches nothing in the open tab
- **THEN** the tab says in Turkish that nothing was found, and lists nothing

### Requirement: Hidden bracket text
Text inside square brackets in a card's or True Word's text SHALL NOT be shown anywhere in the Kütüphane. It SHALL still be searchable.

#### Scenario: A card with bracket text
- **WHEN** a user looks at a card whose text is "[Uno] Add +10 a d20 roll. If this is your only card, add +20."
- **THEN** the shown text is "Add +10 a d20 roll. If this is your only card, add +20."

#### Scenario: Searching bracket text
- **WHEN** a user searches the Kartlar tab for "uno"
- **THEN** that card is listed

### Requirement: Official set names
The screens SHALL show a card's set by the official name of its stored set (spec: card-sets, "A card's set"). A set code that no stored set has SHALL be shown as written. Blessed cards SHALL show "Blessed" in place of a set.

#### Scenario: A known set
- **WHEN** a user looks at a card with the set code "Kesqer"
- **THEN** its set shows as "Kesqerian Nights"

#### Scenario: A set code with different capitalization
- **WHEN** a user looks at a card with the set code "The End Is Nigh"
- **THEN** its set shows as "The End is Nigh"

#### Scenario: A renamed set
- **WHEN** the DM changes the name of the set "Ulagal" to "The Ballad of Ulagal" while Ayla has the library open
- **THEN** the cards of Ulagal show "The Ballad of Ulagal" without a reload

### Requirement: Library filters
The Kartlar tab SHALL offer a set filter and a mechanic pack filter, which combine with each other, with the Cost filter and with the search. The set filter SHALL list the sets that have cards, in the stored order, then set codes that no stored set has, followed by "Blessed" when Blessed cards exist. The mechanic pack filter SHALL list the mechanic packs that have cards, in Turkish alphabetical order.

#### Scenario: Filtering by set
- **WHEN** a user picks "Kesqerian Nights" in the set filter
- **THEN** only the cards of the set "Kesqer" are listed, and the count says so

#### Scenario: Blessed cards
- **WHEN** a user picks "Blessed" in the set filter
- **THEN** only the 19 Blessed cards are listed

#### Scenario: Combined filters
- **WHEN** a user picks a set and a mechanic pack and types a search
- **THEN** only cards that match all three are listed

#### Scenario: The stored order
- **WHEN** the DM moves "Ulagal" before "Havenholm" on the Setler screen
- **THEN** the set filter lists "Ballad of Ulagal" before "Throne of Havenholm"

#### Scenario: Other tabs
- **WHEN** a user opens the Cursed tab or the True Words tab
- **THEN** neither offers a set filter or a mechanic pack filter

### Requirement: Pool-only filter
The Kartlar tab SHALL offer a "Yalnızca havuzdakiler" filter that, when on, lists only the cards in the pool (spec: "Pool status in the library"). It combines with the search and the other filters.

#### Scenario: Hiding held cards
- **WHEN** a user turns on "Yalnızca havuzdakiler" while Ayla holds "Aboleth's Eyes"
- **THEN** "Aboleth's Eyes" is not listed, the Blessed cards still are, and the count says how many cards are shown

#### Scenario: A card only the DM gives
- **WHEN** the DM turns on "Yalnızca havuzdakiler" while no one holds "The Last Wish", whose three channel flags are off
- **THEN** "The Last Wish" is not listed

### Requirement: Card view
Every tab SHALL offer a card view that shows each listed card or True Word as a face. The face SHALL show the cost, name, set, rarity, mechanic pack, and text. On a face with the picture, the set, rarity and mechanic pack SHALL show on hover or tap of the picture's set symbol. Its frame color, the printed one on a picture, SHALL show the kind: purple for Common, gold for Rare, white for Blessed, red for Cursed, and the True Words color for a True Word. The faces of the Cursed and True Words tabs SHALL leave out set, rarity, and mechanic pack.

#### Scenario: Card view colors
- **WHEN** a user looks at a Common, a Rare, a Blessed, and a Cursed card without pictures in the card view
- **THEN** their frames are purple, gold, white, and red

#### Scenario: Card view with pictures
- **WHEN** a user looks at a Common and a Rare card with pictures in the card view
- **THEN** each shows its picture with its printed purple or gold frame, and no frame is drawn around the picture

#### Scenario: A True Word without a picture
- **WHEN** a user looks at "Abyss", which has no picture and costs 5, in the True Words tab's card view
- **THEN** its face has a frame in the True Words color, unlike the purple of a Common card, and shows "5", "Abyss" and its visible text, and no set, rarity or mechanic pack

#### Scenario: A True Word with a picture
- **WHEN** a user looks at "Aid", which has a picture, in the True Words tab's card view
- **THEN** its face shows the picture of "Aid", with no frame drawn around it and no text under it

#### Scenario: Phone width
- **WHEN** the card view of any tab is shown 360 CSS pixels wide
- **THEN** the faces fit the width, and the page has no horizontal scrollbar

### Requirement: List view
Every tab SHALL offer a list view as a table with one row per card or True Word. The Kartlar tab's table SHALL have the columns Kart, Set, Cost, Rarity, Mechanic Pack, Metin, and Durum. The tables of the Cursed and True Words tabs SHALL have the columns Kart, Cost, Metin, and Durum. The list SHALL start sorted by name. At narrow widths, the table SHALL scroll inside its own area, and the page SHALL NOT scroll horizontally.

#### Scenario: Switching views
- **WHEN** a user switches the Kartlar tab from the card view to the list view
- **THEN** the same cards are listed as table rows, with the same search and filters applied

#### Scenario: The True Words as a list
- **WHEN** a user switches the True Words tab to the list view
- **THEN** each listed word is a row with its name, its cost, its visible text and its Durum

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
The Kartlar tab SHALL offer a "▥ Havuz Dağılımı" dialog, live, over the cards a random draw can give (spec: card-draws, "Equal chance from the pool"). It SHALL show how many cards that is, and each rarity's and each set's share as a percentage and a count. Blessed cards SHALL count as the rarity "Blessed" and the set "Blessed". Each rarity SHALL list its sets with their counts.

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
- **WHEN** the DM turns off "Kart çekmede çıkar" of an active Rare card without a holder while the dialog is open
- **THEN** the total and the Rare count are one lower without a reload

#### Scenario: Other tabs
- **WHEN** a user opens the Cursed tab or the True Words tab
- **THEN** no "▥ Havuz Dağılımı" control is shown

### Requirement: Who writes card definitions
The application SHALL change a card's definition and status only through the DM's steps in definition-editing. It SHALL create a Custom Card only with the last pick of its draft (spec: custom-cards). It SHALL change a card's holder only as the card-holdings rules allow. The server SHALL deny a write that changes a card's holder together with its definition or status.

#### Scenario: Text changed together with the holder
- **WHEN** the DM gives a card and, in the same write, changes its text
- **THEN** the server denies the whole write

#### Scenario: A player changes a definition
- **WHEN** a signed-in player tries to change a card's text
- **THEN** the server denies the write, and the card does not change

#### Scenario: A player creates a Custom Card without a draft
- **WHEN** Ayla writes a Custom Card for herself without finishing an open draft of hers
- **THEN** the server denies it

### Requirement: The DM's status filter
For the DM, every tab of the Kütüphane SHALL offer a status filter with "Yayında", "Taslak", "Kaldırıldı", "🔒 DM" and "Hepsi", starting at "Yayında". "🔒 DM" SHALL list the definitions of every status whose "Listede görünür" is off. It SHALL combine with the search and the other filters, and the count SHALL follow it. With "Taslak", "Kaldırıldı" or "Hepsi" chosen, each face and list row SHALL show its status. Players SHALL NOT see the filter.

#### Scenario: Finding the drafts
- **WHEN** the DM chooses "Taslak" in the Kartlar tab after the initial data was imported
- **THEN** only "Hrolf's Hornswaggle", "The Grand Finale" and "The Cartographer" are listed, each marked "Taslak"

#### Scenario: A retired card in a hand
- **WHEN** the DM chooses "Kaldırıldı" while Ayla holds the retired card "Aboleth's Eyes"
- **THEN** "Aboleth's Eyes" is listed, marked "Kaldırıldı", with "Elde: Ayla" as its status

#### Scenario: A player's library
- **WHEN** Ayla opens any tab of the Kütüphane
- **THEN** she sees no status filter, and only active definitions are listed

#### Scenario: Finding the DM-only cards
- **WHEN** the DM chooses "🔒 DM" while "The Last Wish" is active and "Crown of Ash" is a draft, both with "Listede görünür" off
- **THEN** only those two are listed, each marked "🔒 DM"

### Requirement: History control on library faces
Each card face in the card views of the Kartlar and Cursed tabs SHALL have a "geçmiş" control with a clock icon in the face's top row, named "<card name>: geçmiş" for screen readers: left of the DM's edit control, or left of the magnifier where there is none. It SHALL show and hide as the magnifier does, and selecting it SHALL open the card's Kart geçmişi (spec: card-stats). A True Word face SHALL have none.

#### Scenario: A player's face
- **WHEN** Ayla rests the pointer on "Aboleth's Eyes" in the Kartlar tab
- **THEN** its face shows the clock control left of the magnifier, named "Aboleth's Eyes: geçmiş"

#### Scenario: The DM's face
- **WHEN** the DM rests the pointer on "Aboleth's Eyes" in the Kartlar tab
- **THEN** the clock control is left of the edit control, which is left of the magnifier

#### Scenario: Opening the history
- **WHEN** a user selects the clock control of "Abandon All Hope" in the Cursed tab
- **THEN** the Kart geçmişi of "Abandon All Hope" opens

#### Scenario: A phone
- **WHEN** a user opens the Kartlar tab on a phone, which has no hover
- **THEN** every face shows its clock control

#### Scenario: Zooming still works
- **WHEN** a user double-clicks the face of "Aboleth's Eyes" outside its controls
- **THEN** the zoom view opens, and the Kart geçmişi does not

#### Scenario: A True Word face
- **WHEN** a user rests the pointer on "Abyss" in the True Words tab
- **THEN** its face shows the magnifier and no clock control

#### Scenario: Other faces
- **WHEN** a user looks at the faces in a hand, a draw, a pack or the card details
- **THEN** none of them has the clock control

### Requirement: History links in the list views
In the list views of the Kartlar and Cursed tabs, each card's name in the Kart column SHALL be a link to the card's Kart geçmişi (spec: card-stats). In the True Words tab's list view, a word's name SHALL NOT be a link.

#### Scenario: Following a name
- **WHEN** a user selects "Aboleth's Eyes" in the Kartlar tab's list view
- **THEN** the Kart geçmişi of "Aboleth's Eyes" opens

#### Scenario: A True Word's row
- **WHEN** a user looks at the row of "Abyss" in the True Words tab's list view
- **THEN** its name is plain text, not a link

### Requirement: Cards not listed for players
A card or True Word whose "Listede görünür" is off SHALL NOT appear in any tab of a player's Kütüphane, or in its counts, also while someone holds or knows it. The hiding is in the interface only: a player's device still reads the definition, because the hands show it. The DM SHALL see such definitions in the lists, marked "🔒 DM" on their face and list row.

#### Scenario: A player's library
- **WHEN** "The Last Wish" is an active card with "Listede görünür" off, and Ayla opens the Kartlar tab
- **THEN** it is not listed, and the card count leaves it out

#### Scenario: A held hidden card
- **WHEN** the DM gives "The Last Wish" to Bora, and Ayla opens the Kartlar tab
- **THEN** it is still not listed

#### Scenario: The DM's library
- **WHEN** the DM opens the Kartlar tab
- **THEN** "The Last Wish" is listed and marked "🔒 DM"

#### Scenario: A listed card that is never drawn
- **WHEN** "Crown of Ash" has "Listede görünür" on and its three channel flags off, and Ayla opens the Kartlar tab
- **THEN** "Crown of Ash" is listed

### Requirement: The Kütüphane screen and its tabs
The Kütüphane screen SHALL have the title "Kütüphane" and three tabs, in this order: "♠ Kartlar", "☠ Cursed" and "✦ True Words". Each tab SHALL show how many active definitions it lists for the user. Kartlar SHALL be open by default. The open tab SHALL be kept in the URL, so a reload or a bookmark opens it again. Each time a tab is opened, its search and filters SHALL start empty.

#### Scenario: Opening the Kütüphane
- **WHEN** a signed-in user opens the Kütüphane after the initial data was imported
- **THEN** the Kartlar tab is open, and the tabs read "♠ Kartlar (588)", "☠ Cursed (154)" and "✦ True Words" with the number of active True Words

#### Scenario: Switching tabs
- **WHEN** a user selects "☠ Cursed"
- **THEN** the Cursed tab is open, the address names the Cursed tab, and "Kütüphane" stays marked in the navigation

#### Scenario: Reloading a tab
- **WHEN** a user reloads the browser on the Cursed tab
- **THEN** the Kütüphane opens again on its Cursed tab

#### Scenario: A player's counts
- **WHEN** "The Last Wish" is active with "Listede görünür" off, and Ayla and the DM open the Kütüphane
- **THEN** Ayla's Kartlar count leaves "The Last Wish" out, and the DM's includes it

#### Scenario: Filters start afresh
- **WHEN** a user searches the Kartlar tab for "draw", opens the Cursed tab, and comes back to Kartlar
- **THEN** the Kartlar search is empty, and every card is listed

#### Scenario: Phone width
- **WHEN** the Kütüphane is shown 360 CSS pixels wide
- **THEN** the three tabs fit the width, and the page has no horizontal scrollbar

### Requirement: Cost filter
Every tab of the Kütüphane SHALL offer a Cost filter with "Tüm cost'lar" and each cost its definitions have, once: numbers first in numeric order, then the others in Turkish alphabetical order. Costs SHALL be compared trimmed and ignoring case. The filter SHALL combine with the search and the other filters, and the count SHALL follow it.

#### Scenario: Filtering the Cursed cards by cost
- **WHEN** a user picks "2" in the Cost filter of the Cursed tab
- **THEN** only the Cursed cards that cost 2 are listed, and the count says how many

#### Scenario: An X cost
- **WHEN** a user picks "X" in the Cost filter of the True Words tab
- **THEN** only the words whose cost is "X" are listed

#### Scenario: The order of the choices
- **WHEN** the listed cards cost "0", "1", "10", "2", "X" and "d6"
- **THEN** the Cost filter offers "0", "1", "2", "10", "d6" and "X", in that order, after "Tüm cost'lar"

#### Scenario: Combined filters
- **WHEN** a user picks "Kesqerian Nights" in the set filter and "1" in the Cost filter of the Kartlar tab, and searches for "draw"
- **THEN** only the Kesqer cards that cost 1 and contain "draw" are listed

### Requirement: Held-only filter in the Cursed tab
The Cursed tab SHALL offer a "Yalnızca eldekiler" filter that, when on, lists only the Cursed cards that at least one player holds, live. It SHALL combine with the search and the other filters.

#### Scenario: The curses in play
- **WHEN** Ayla and Bora hold "Visions of Death", no one holds "Scorched Earth", and a user turns on "Yalnızca eldekiler"
- **THEN** "Visions of Death" is listed, "Scorched Earth" is not, and the count says how many cards are shown

#### Scenario: A curse drawn while the filter is on
- **WHEN** Bora draws "Abandon All Hope" while Ayla has "Yalnızca eldekiler" on
- **THEN** "Abandon All Hope" appears on Ayla's screen without a reload

### Requirement: Durum of a True Word
The True Words tab SHALL show each word's Durum, live: "Bilenler:" with the names of the players who know it, or "—" when no one does. A word whose "Draft'ta çıkar" is off SHALL be "DM'e özel", followed by " · Bilenler:" and the names, if anyone knows it.

#### Scenario: A word two players know
- **WHEN** Ayla and Bora know "Abyss"
- **THEN** its Durum reads "Bilenler: Ayla, Bora"

#### Scenario: A word no one knows
- **WHEN** no player knows "Bind"
- **THEN** its Durum reads "—"

#### Scenario: A word kept out of drafts
- **WHEN** "Justice" has "Draft'ta çıkar" off, and the DM taught it to Bora
- **THEN** its Durum reads "DM'e özel · Bilenler: Bora"

#### Scenario: A word taken back
- **WHEN** the DM takes back "Abyss" from Bora while Ayla has the True Words tab open
- **THEN** its Durum reads "Bilenler: Ayla" on her screen without a reload

### Requirement: Unlearned-only filter in the True Words tab
The True Words tab SHALL offer a "Yalnızca öğrenilmemişler" filter that, when on, lists only the words that the chosen player (spec: true-words, "The Kütüphane's True Words tab") does not know, live. It SHALL combine with the search and the other filters.

#### Scenario: A player's unlearned words
- **WHEN** Ayla, who knows "Abyss" and "Aid", turns on "Yalnızca öğrenilmemişler"
- **THEN** neither "Abyss" nor "Aid" is listed, and every other active word is

#### Scenario: The DM chooses a player
- **WHEN** the DM chooses Bora and turns on "Yalnızca öğrenilmemişler"
- **THEN** only the words Bora does not know are listed

#### Scenario: Learning while the filter is on
- **WHEN** Ayla learns "Bind" from her draft while her filter is on
- **THEN** "Bind" leaves the list without a reload
