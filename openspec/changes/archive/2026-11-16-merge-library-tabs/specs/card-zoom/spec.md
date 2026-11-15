## MODIFIED Requirements

### Requirement: Magnifier on card faces
Every card face SHALL have a magnifier control in its top-right corner, named "<card name>: büyüt" for screen readers. This SHALL hold in every tab of the Kütüphane, True Word faces included, the hand's card view, the card details, and the revealed cards of draws and packs. A face-down card and a row of a list view SHALL NOT have one.

#### Scenario: A face in the library
- **WHEN** a user looks at "Aboleth's Eyes" in the Kartlar tab's card view
- **THEN** its face has a magnifier named "Aboleth's Eyes: büyüt" in its top-right corner

#### Scenario: A True Word face
- **WHEN** a user looks at "Abyss" in the True Words tab's card view
- **THEN** its face has a magnifier named "Abyss: büyüt" in its top-right corner

#### Scenario: A revealed card
- **WHEN** Ayla turns over the second card of her draw
- **THEN** its face has a magnifier, and the cards still face down have none

#### Scenario: The card details
- **WHEN** Ayla opens the details of a card in her hand
- **THEN** the face in the details has a magnifier

#### Scenario: The list view
- **WHEN** a user switches the library to the list view
- **THEN** no row has a magnifier

### Requirement: Zoom view contents
The zoom view SHALL show only the card: its picture as large as the screen allows, up to the picture's own size, and a small round close button in a corner. It SHALL show no title, no line with the set, cost and rarity, and no other text. Screen readers SHALL hear the view named after the card.

#### Scenario: A Legend card
- **WHEN** a user zooms "Aboleth's Eyes"
- **THEN** the view shows the card's picture and a small round close button, with no title and no line under it, and a screen reader names the view "Aboleth's Eyes"

#### Scenario: A Blessed card
- **WHEN** a user zooms the Blessed card "Second Wind"
- **THEN** the view shows its picture alone, with no "Blessed" line

#### Scenario: A Cursed card
- **WHEN** a user zooms the Cursed card "Abandon All Hope", which costs 1
- **THEN** the view shows its picture alone, with no "Cursed · Cost 1" line

#### Scenario: A True Word
- **WHEN** a user zooms "Aid", which has a picture, in the Kütüphane's True Words tab
- **THEN** the view shows its picture alone, and a screen reader names the view "Aid"

#### Scenario: A marked hand card
- **WHEN** Ayla zooms her active card that has a note
- **THEN** the view shows the picture, without the "● Aktif" mark, the note icon, the note's text, or any card control

### Requirement: Zoom view without a picture
For a card or True Word without a picture, or whose picture fails to load, the zoom view SHALL show its face without pictures in place of the picture, larger than a face in the library. The face SHALL show its cost, name and visible text, and its set, rarity and mechanic pack unless it is a Cursed card or a True Word.

#### Scenario: No pictures built
- **WHEN** a user zooms "Aboleth's Eyes" where no pictures are built
- **THEN** the view shows the card's face with its cost, name, text, "Kesqerian Nights", "Common" and "Arcanus Divine", larger than in the library, and nothing fails

#### Scenario: A Cursed card without a picture
- **WHEN** a user zooms the Cursed card "Scorched Earth", which has no picture
- **THEN** the view shows its face with its cost, name and text, and no set, rarity or mechanic pack

#### Scenario: A True Word without a picture
- **WHEN** a user zooms "Abyss", which has no picture and costs 5, in the Kütüphane's True Words tab
- **THEN** the view shows its face in the True Words color with "5", "Abyss" and its text, and no set, rarity or mechanic pack
