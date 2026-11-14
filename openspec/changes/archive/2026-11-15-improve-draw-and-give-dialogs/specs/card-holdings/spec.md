# Spec Delta

## MODIFIED Requirements

### Requirement: The DM gives cards
The DM SHALL be able to give any active card, of any kind, to any user who has a profile, from a "+ Kart ver" dialog on the hand screen. The dialog searches the cards as the library search does, filters them, and shows each card's status. Players SHALL NOT be able to give cards, not even to themselves. A player's only ways to open a holding for themselves SHALL be a draw, as the card-draws rules allow, and a choice from their own open pack, as the pack-shop rules allow.

#### Scenario: Searching and giving
- **WHEN** the DM opens "+ Kart ver" on Ayla's hand, searches for "aboleth", selects "Aboleth's Eyes" and gives it
- **THEN** the card is added to the end of Ayla's hand

#### Scenario: A player tries to give a card
- **WHEN** a player creates a holding for themselves given by "dm"
- **THEN** the server denies it

#### Scenario: A player's holding without a draw
- **WHEN** a player creates a holding for themselves given by "draw" without the draw that it names
- **THEN** the server denies it

#### Scenario: A player's holding without a pack choice
- **WHEN** a player creates a holding for themselves given by "pack" without choosing it from their open pack in the same write
- **THEN** the server denies it

#### Scenario: Giving to someone without a profile
- **WHEN** the DM creates a holding for a user ID that has no profile
- **THEN** the server denies it

## ADDED Requirements

### Requirement: Browsing the cards to give
"+ Kart ver" SHALL list every active card before any search or filter, sorted by name in Turkish alphabetical order. It SHALL show 20 cards at first, and "Daha fazla göster" SHALL add 20 more each time. It SHALL show how many cards match.

#### Scenario: Opening the dialog
- **WHEN** the DM opens "+ Kart ver" with 744 active cards
- **THEN** the dialog shows 20 cards and says that 744 cards match

#### Scenario: Showing more
- **WHEN** the DM selects "Daha fazla göster" once
- **THEN** the dialog shows 40 cards

### Requirement: Filters in Kart ver
"+ Kart ver" SHALL offer filters by set, cost, mechanic pack and kind (Common, Rare, Blessed, Cursed), and a "Yalnızca havuzdakiler" switch, which combine with each other and with the search. The set filter SHALL list sets as the draw's set filter does, over the active cards. Choices SHALL show counts and clear as in the DM's draw dialog. Closing the dialog SHALL drop them.

#### Scenario: One set's Rare cards
- **WHEN** the DM chooses the set "Kesqerian Nights" and the kind "Rare"
- **THEN** the dialog lists only Kesqer's active Rare cards, and shows their number

#### Scenario: Cursed cards
- **WHEN** the DM chooses the kind "Cursed"
- **THEN** the dialog lists only active Cursed cards

#### Scenario: Only the pool
- **WHEN** the DM turns on "Yalnızca havuzdakiler"
- **THEN** the dialog lists only the normal cards without a holder and the Blessed cards, none of them DM-only

### Requirement: Cards to give as faces
"+ Kart ver" SHALL show each result as its card face, with its status as a badge at the top of the face, clear of its cost: "Havuzda", the holders' names, "DM'e özel", or "Cursed". At 360 CSS pixels wide, the faces SHALL stand in two columns, and the page SHALL NOT scroll horizontally.

#### Scenario: A held card
- **WHEN** Bora holds "Aboleth's Eyes" and the DM finds it in "+ Kart ver"
- **THEN** its face shows a badge with Bora's name

#### Scenario: Phone width
- **WHEN** "+ Kart ver" is shown 360 CSS pixels wide
- **THEN** the faces stand in two columns, and the page has no horizontal scrollbar

### Requirement: Giving the selected card
Selecting a face in "+ Kart ver" SHALL select that card, and a bar at the bottom of the dialog SHALL name it and the receiver, with a control that gives it. For a held normal card, the bar SHALL name the holder and offer "Ek kopya ver" and "Vazgeç". After a give, the dialog SHALL say what was given, and stay open.

#### Scenario: Giving a card from the pool
- **WHEN** the DM selects "Ahriman's Diary", which is in the pool, and gives it to Ayla from the bar
- **THEN** Ayla holds it, and the dialog says "Verildi: Ahriman's Diary → Ayla" and stays open

#### Scenario: A held card asks first
- **WHEN** the DM selects "Aboleth's Eyes", which Bora holds
- **THEN** the bar says that Bora holds it and offers "Ek kopya ver" and "Vazgeç", and nothing is given yet

#### Scenario: Keyboard
- **WHEN** the DM moves the focus to a face and presses Enter
- **THEN** that card is selected, and the bar names it
