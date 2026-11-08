# Spec Delta

## ADDED Requirements

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

### Requirement: Pool-only filter
The Kart kütüphanesi SHALL offer a "Yalnızca havuzdakiler" filter that, when on, lists only the cards in the pool: the normal cards without a holder and every Blessed card. It combines with the search and the other filters.

#### Scenario: Hiding held cards
- **WHEN** a user turns on "Yalnızca havuzdakiler" while Ayla holds "Aboleth's Eyes"
- **THEN** "Aboleth's Eyes" is not listed, the Blessed cards still are, and the count says how many cards are shown

### Requirement: Cursed card holders
The Cursed Deck SHALL show, for each Cursed card, the names of everyone who holds a copy of it, live.

#### Scenario: A Cursed card in two hands
- **WHEN** Ayla and Bora each hold "Visions of Death"
- **THEN** the Cursed Deck shows "Visions of Death" with both names

## MODIFIED Requirements

### Requirement: List view
Both screens SHALL offer a list view as a table with one row per card. The Kart kütüphanesi table SHALL have the columns Kart, Set, Cost, Rarity, Mechanic Pack, Metin, and Durum. The Cursed Deck table SHALL have the columns Kart, Cost, Metin, and Durum. The list SHALL start sorted by name. At narrow widths, the table SHALL scroll inside its own area, and the page SHALL NOT scroll horizontally.

#### Scenario: Switching views
- **WHEN** a user switches the Kart kütüphanesi from the card view to the list view
- **THEN** the same cards are listed as table rows, with the same search and filters applied

#### Scenario: Phone width
- **WHEN** the list view is shown 360 CSS pixels wide
- **THEN** the table scrolls sideways inside its area, and the page has no horizontal scrollbar

## REMOVED Requirements

### Requirement: No card writes from the application
**Reason**: A normal card now records its holder, and the holder changes when a card is given, used, discarded, or transferred from the application.
**Migration**: "Card definitions are read-only for the application" keeps every other card write closed, and the card-holdings rules decide holder changes.
