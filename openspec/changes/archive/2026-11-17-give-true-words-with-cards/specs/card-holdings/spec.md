# Spec Delta

## MODIFIED Requirements

### Requirement: The DM gives cards
The DM SHALL be able to give any active card, of the kind normal, Blessed or Cursed, whatever its behavior flags, to any user who has a profile, from a "+ Kart ver" dialog on the hand screen. The same dialog SHALL also offer every active True Word, and giving one SHALL teach it as the DM's teach step does (spec: true-words, "The DM teaches a word"). The dialog searches the cards and words as the library search does, filters them, and shows each one's status. Players SHALL NOT be able to give cards, not even to themselves. A player's only ways to open a holding for themselves SHALL be a draw, as the card-draws rules allow, and a choice from their own open pack, as the pack-shop rules allow.

#### Scenario: Searching and giving
- **WHEN** the DM opens "+ Kart ver" on Ayla's hand, searches for "aboleth", selects "Aboleth's Eyes" and gives it
- **THEN** the card is added to the end of Ayla's hand

#### Scenario: Giving a card only the DM gives
- **WHEN** the DM gives "The Last Wish", whose four "where" flags are off, to Ayla
- **THEN** the card is added to the end of Ayla's hand, and Bora sees it there

#### Scenario: Giving a True Word only the DM gives
- **WHEN** the DM opens "+ Kart ver" on Ayla's hand, searches for "ascend", selects "Ascend 3", whose "Draft'ta çıkar" is off, and confirms
- **THEN** "Ascend 3" is among Ayla's True Words, recorded as taught by the DM, and her LP does not change

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

### Requirement: Browsing the cards to give
"+ Kart ver" SHALL list every active card and every active True Word before any search or filter, together, sorted by name in Turkish alphabetical order. It SHALL show 20 at first, and "Daha fazla göster" SHALL add 20 more each time. It SHALL show how many cards and words match, as one number.

#### Scenario: Opening the dialog
- **WHEN** the DM opens "+ Kart ver" with 744 active cards and 26 active True Words
- **THEN** the dialog shows 20 of them and says that 770 match

#### Scenario: Showing more
- **WHEN** the DM selects "Daha fazla göster" once
- **THEN** the dialog shows 40 of them

#### Scenario: Searching a word
- **WHEN** the DM searches for "ascend"
- **THEN** the dialog lists the active True Words and cards whose name or text matches, the words "Ascend 1", "Ascend 2" and "Ascend 3" among them

### Requirement: Filters in Kart ver
"+ Kart ver" SHALL offer filters by set, cost, mechanic pack and kind (Common, Rare, Blessed, Cursed, True Word), and a "Yalnızca havuzdakiler" switch, which combine with each other and with the search. The set filter SHALL list sets as the draw's set filter does, over the active cards. A True Word SHALL match no set and no mechanic pack. "Yalnızca havuzdakiler" SHALL keep the cards in the pool and the words whose "Draft'ta çıkar" is on. Choices SHALL show counts and clear as in the DM's draw dialog. Closing the dialog SHALL drop them.

#### Scenario: One set's Rare cards
- **WHEN** the DM chooses the set "Kesqerian Nights" and the kind "Rare"
- **THEN** the dialog lists only Kesqer's active Rare cards, and shows their number

#### Scenario: Cursed cards
- **WHEN** the DM chooses the kind "Cursed"
- **THEN** the dialog lists only active Cursed cards

#### Scenario: True Words
- **WHEN** the DM chooses the kind "True Word"
- **THEN** the dialog lists only active True Words, those whose "Draft'ta çıkar" is off included, and shows their number

#### Scenario: A set leaves the words out
- **WHEN** the DM chooses the set "Kesqerian Nights"
- **THEN** the dialog lists no True Word

#### Scenario: Only the pool
- **WHEN** the DM turns on "Yalnızca havuzdakiler"
- **THEN** the dialog lists only the normal cards without a holder, the Blessed cards, and the True Words whose "Draft'ta çıkar" is on, none of them DM-only

### Requirement: Cards to give as faces
"+ Kart ver" SHALL show each result as its card face, with its status as a badge at the top of the face, clear of its cost. A card's badge SHALL be "Havuzda", the holders' names, "DM'e özel", or "Cursed". A True Word's badge SHALL be "Biliyor" when the receiver knows it, otherwise "DM'e özel" when its "Draft'ta çıkar" is off, otherwise the names of those who know it, and none when no one does. At 360 CSS pixels wide, the faces SHALL stand in two columns, and the page SHALL NOT scroll horizontally.

#### Scenario: A held card
- **WHEN** Bora holds "Aboleth's Eyes" and the DM finds it in "+ Kart ver"
- **THEN** its face shows a badge with Bora's name

#### Scenario: A word only the DM gives
- **WHEN** the DM finds "Ascend 3", whose "Draft'ta çıkar" is off and which no one knows, in "+ Kart ver" on Ayla's hand
- **THEN** its face shows the badge "DM'e özel"

#### Scenario: A word others know
- **WHEN** Bora knows "Aid", and the DM finds it in "+ Kart ver" on Ayla's hand
- **THEN** its face shows a badge with Bora's name

#### Scenario: A word the receiver knows
- **WHEN** Ayla knows "Abyss", and the DM finds it in "+ Kart ver" on Ayla's hand
- **THEN** its face shows the badge "Biliyor"

#### Scenario: Phone width
- **WHEN** "+ Kart ver" is shown 360 CSS pixels wide
- **THEN** the faces stand in two columns, and the page has no horizontal scrollbar

### Requirement: Giving the selected card
Selecting a face in "+ Kart ver" SHALL select that card or word, and a bar at the bottom of the dialog SHALL name it and the receiver, with a control that gives it: "Ver" for a card, "Öğret" for a True Word. For a held normal card, the bar SHALL name the holder and offer "Ek kopya ver" and "Vazgeç". A word SHALL never ask about an extra copy. A word the receiver knows SHALL NOT be selectable. After a give, the dialog SHALL say what was given or taught, and stay open.

#### Scenario: Giving a card from the pool
- **WHEN** the DM selects "Ahriman's Diary", which is in the pool, and gives it to Ayla from the bar
- **THEN** Ayla holds it, and the dialog says "Verildi: Ahriman's Diary → Ayla" and stays open

#### Scenario: A held card asks first
- **WHEN** the DM selects "Aboleth's Eyes", which Bora holds
- **THEN** the bar says that Bora holds it and offers "Ek kopya ver" and "Vazgeç", and nothing is given yet

#### Scenario: Teaching a word from the bar
- **WHEN** the DM selects "Aid", which Bora knows, on Ayla's "+ Kart ver" and confirms with "Öğret"
- **THEN** Ayla knows "Aid", the dialog says "Öğretildi: Aid → Ayla" and stays open, and the face of "Aid" now shows "Biliyor"

#### Scenario: A known word cannot be selected
- **WHEN** the DM selects "Abyss", which Ayla knows, on Ayla's "+ Kart ver"
- **THEN** nothing is selected, and the bar does not offer to teach it

#### Scenario: Keyboard
- **WHEN** the DM moves the focus to a face and presses Enter
- **THEN** that card is selected, and the bar names it
