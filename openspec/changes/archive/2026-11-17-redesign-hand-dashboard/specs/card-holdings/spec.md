# Spec Delta

## MODIFIED Requirements

### Requirement: Hand summary
Above the hand, the screen SHALL show three stats in one strip: "Legend Point", "Kartlar" with how many cards the hand holds, and one stat with how many Cursed cards the hand holds, marked ☠, beside how many True Words the player knows, marked ✦. Both counts SHALL show, 0 included. True Words SHALL NOT count as cards. The "Kartlar ⓘ" stat SHALL open the list of the hand's sets with their card counts, headed with how many sets there are: while the pointer rests on the stat, while the stat has the keyboard focus, and after a tap on it until the user taps elsewhere. Screen readers SHALL be able to read the list at all times. The list SHALL NOT widen the page. The three stats SHALL stay in one row on a phone 360 CSS pixels wide. The summary SHALL NOT show a count or a list of active effects, nor a count of sets of its own.

#### Scenario: Reading the summary
- **WHEN** Ayla holds 3 Kesqer cards, 1 Havenholm card, and 1 Cursed card, and knows 2 True Words
- **THEN** the summary shows "Legend Point", 5 under "Kartlar", and ☠ 1 beside ✦ 2

#### Scenario: True Words in the summary
- **WHEN** Ayla holds 5 cards and knows 3 True Words
- **THEN** "Kartlar" shows 5, and ✦ shows 3

#### Scenario: Nothing Cursed and no True Words
- **WHEN** Bora holds 2 cards, none Cursed, and knows no True Word
- **THEN** the third stat shows ☠ 0 beside ✦ 0

#### Scenario: Pointing at the cards
- **WHEN** a user rests the mouse pointer on the "Kartlar ⓘ" stat of Ayla's hand, who holds 3 Kesqer cards and 1 Havenholm card
- **THEN** a list headed with 2 sets shows Kesqer with 3 cards and Havenholm with 1, and it goes away when the pointer leaves the stat

#### Scenario: Pointing at the active effects
- **WHEN** a user rests the mouse pointer on the third stat of Ayla's hand, who holds 2 active cards
- **THEN** no list of active effects shows

#### Scenario: Tapping the sets on a phone
- **WHEN** a user taps the "Kartlar ⓘ" stat of Ayla's hand on a phone 360 CSS pixels wide
- **THEN** the list of her sets with their card counts shows without a horizontal scrollbar, and it goes away when the user taps elsewhere

#### Scenario: Lists closed
- **WHEN** a user opens Ayla's hand and the "Kartlar ⓘ" stat is not pointed at, focused or tapped
- **THEN** the sets list does not show on the screen, and a screen reader can still read it

#### Scenario: One row on a phone
- **WHEN** a user opens Ayla's hand on a phone 360 CSS pixels wide
- **THEN** the three stats show side by side in one row, without a horizontal scrollbar

#### Scenario: Character effects in the summary
- **WHEN** Ayla holds 2 active cards and "Thorin" has a stored effect
- **THEN** the summary shows no active effect count and no list of active effects

## ADDED Requirements

### Requirement: The hand's tab row
Under the stats, the hand screen SHALL show one row of tabs: "♠ Kartlar", "✦ True Words", a tab for each active character of the hand's user in the order added, a "+" control to add a character (for that user and the DM), "Arşiv (<count>)" for everyone when the user has archived characters, and "🔒 DM notu" last (for the DM alone). The open tab SHALL be marked. The row SHALL wrap onto more lines when it does not fit, without a horizontal scrollbar at 360 CSS pixels.

#### Scenario: A player's own hand
- **WHEN** Ayla, who has "Thorin" and then "Mira" and no archived character, opens her own hand
- **THEN** the row shows "♠ Kartlar", "✦ True Words", "Thorin", "Mira" and "+", in that order, with "♠ Kartlar" marked

#### Scenario: Another player's view
- **WHEN** Bora opens Ayla's hand, and Ayla has archived "Kuzgun"
- **THEN** the row shows "♠ Kartlar", "✦ True Words", "Thorin", "Mira" and "Arşiv (1)", and no "+" and no "🔒 DM notu"

#### Scenario: The DM's view
- **WHEN** the DM opens Ayla's hand, and Ayla has archived "Kuzgun"
- **THEN** the row shows "♠ Kartlar", "✦ True Words", "Thorin", "Mira", "+", "Arşiv (1)" and "🔒 DM notu", in that order

#### Scenario: A narrow window
- **WHEN** a user opens a hand with 5 characters on a phone 360 CSS pixels wide
- **THEN** the row wraps onto more lines, and the page has no horizontal scrollbar

#### Scenario: Above the content
- **WHEN** a user opens Ayla's hand in a window 1280 CSS pixels wide
- **THEN** the row shows under the stats and above the open tab's content, across the width of the hand
