# card-zoom Specification

## Purpose

Lets every user open any card face large in a zoom view, from a magnifier in the face's corner, so that the card's picture and printed text can be read on any screen.

## Requirements

### Requirement: Magnifier on card faces
Every card face SHALL have a magnifier control in its top-right corner, named "<card name>: büyüt" for screen readers. This SHALL hold in the Kart kütüphanesi, the Cursed Deck, the hand's card view, the card details, and the revealed cards of draws and packs. A face-down card and a row of a list view SHALL NOT have one.

#### Scenario: A face in the library
- **WHEN** a user looks at "Aboleth's Eyes" in the library's card view
- **THEN** its face has a magnifier named "Aboleth's Eyes: büyüt" in its top-right corner

#### Scenario: A revealed card
- **WHEN** Ayla turns over the second card of her draw
- **THEN** its face has a magnifier, and the cards still face down have none

#### Scenario: The card details
- **WHEN** Ayla opens the details of a card in her hand
- **THEN** the face in the details has a magnifier

#### Scenario: The list view
- **WHEN** a user switches the library to the list view
- **THEN** no row has a magnifier

### Requirement: When the magnifier shows
The magnifier SHALL show while the pointer rests on its face or the focus is inside the face, and SHALL be hidden otherwise. On a device without hover, it SHALL show at all times. While hidden, it SHALL stay available to screen readers and the keyboard.

#### Scenario: The pointer rests on a face
- **WHEN** a user rests the pointer anywhere on a face in the library
- **THEN** the magnifier shows in its top-right corner, and it goes away when the pointer leaves the face

#### Scenario: A phone
- **WHEN** a user opens the library on a phone, which has no hover
- **THEN** every face shows its magnifier

#### Scenario: The keyboard
- **WHEN** a user moves the focus with the Tab key onto a face's magnifier
- **THEN** the magnifier shows while it has the focus

### Requirement: Opening the zoom view
Selecting the magnifier SHALL open that card's zoom view. In the hand's card view, selecting the rest of the face SHALL still open the card details, and selecting the magnifier SHALL NOT open them. The zoom view SHALL open only on the device where it was selected, SHALL write nothing, and SHALL be available to every signed-in user, also while a pack is open.

#### Scenario: Zooming in the library
- **WHEN** a user selects the magnifier of "Aboleth's Eyes" in the library
- **THEN** the zoom view of "Aboleth's Eyes" opens

#### Scenario: Zooming a hand card
- **WHEN** Ayla selects the magnifier of a card in her hand's card view
- **THEN** the zoom view opens, and the card details do not

#### Scenario: Opening the details
- **WHEN** Ayla selects a card in her hand's card view anywhere outside its magnifier
- **THEN** the card details open, as before

#### Scenario: Zooming a card in someone else's pack
- **WHEN** Ayla's pack is open, and Bora selects the magnifier of a turned card in it
- **THEN** Bora sees the zoom view, and Ayla's screen does not change

### Requirement: Double click opens the zoom view
With a mouse, a double click on a card face, outside its controls, SHALL open the card's zoom view, as its magnifier does. In the hand's card view the first click still selects the card: on a wide window the zoom view opens over the details beside the hand, and on a narrower window only the card details dialog opens. A double tap on a touch screen, and a double click that turns a face-down card, SHALL NOT open it.

#### Scenario: Zooming in the library
- **WHEN** a user double-clicks "Aboleth's Eyes" in the library's card view
- **THEN** the zoom view of "Aboleth's Eyes" opens

#### Scenario: A hand on a wide window
- **WHEN** Ayla double-clicks a card in her hand on a 1280 CSS pixel wide window
- **THEN** the card's details show beside the hand, and its zoom view opens over them

#### Scenario: A hand on a narrower window
- **WHEN** Ayla double-clicks a card in her hand with a mouse on an 800 CSS pixel wide window
- **THEN** the card details dialog opens, the zoom view does not, and the face's magnifier still opens it

#### Scenario: Turning a card
- **WHEN** Ayla double-clicks a face-down card of her draw
- **THEN** the card turns over, and no zoom view opens

#### Scenario: A double tap
- **WHEN** Ayla double-taps a card in the library on a phone
- **THEN** no zoom view opens, and its magnifier still opens it

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

#### Scenario: A marked hand card
- **WHEN** Ayla zooms her active card that has a note
- **THEN** the view shows the picture, without the "● Aktif" mark, the note icon, the note's text, or any card control

### Requirement: Hand cost in the zoom view
When the zoom view is opened from a hand where the card's cost differs from its own cost, the picture SHALL show the same hand cost badge as the card's face in the hand, marked lower or higher in the same way.

#### Scenario: A cheaper card
- **WHEN** the DM has set the cost of Ayla's 3-cost card to "1", and Ayla zooms it from her hand
- **THEN** the picture shows a badge "1" marked as lower

#### Scenario: The same card in the library
- **WHEN** a user zooms that card from the library
- **THEN** the picture has no badge

### Requirement: Zoom view without a picture
For a card without a picture, or whose picture fails to load, the zoom view SHALL show the card's face without pictures in place of the picture, larger than a face in the library. The face SHALL show its cost, name and visible text, and its set, rarity and mechanic pack unless it is a Cursed card.

#### Scenario: No pictures built
- **WHEN** a user zooms "Aboleth's Eyes" where no pictures are built
- **THEN** the view shows the card's face with its cost, name, text, "Kesqerian Nights", "Common" and "Arcanus Divine", larger than in the library, and nothing fails

#### Scenario: A Cursed card without a picture
- **WHEN** a user zooms the Cursed card "Scorched Earth", which has no picture
- **THEN** the view shows its face with its cost, name and text, and no set, rarity or mechanic pack

### Requirement: Closing the zoom view
The zoom view SHALL close with its close button, named "Kapat" for screen readers, with Escape, or with a click or tap outside the card, and the focus SHALL return to the magnifier of the face it was opened from. A press that starts on the card SHALL NOT close it. Opened inside the card details, a draw or an open pack, closing it SHALL leave that dialog open as it was. It SHALL also close when the face it was opened from leaves the screen.

#### Scenario: Closing with the button
- **WHEN** a user selects the close button in the zoom view of a library card
- **THEN** the view closes, and the focus is on that card's magnifier

#### Scenario: Closing after a double click
- **WHEN** a user opened the zoom view of a library card with a double click, and presses Escape
- **THEN** the view closes, and the focus is on that card's magnifier

#### Scenario: Closing with a click outside
- **WHEN** a user clicks or taps anywhere outside the card in the zoom view of a library card
- **THEN** the view closes

#### Scenario: A click on the card
- **WHEN** a user clicks the picture in the zoom view, or starts a press on it and releases it outside the card
- **THEN** the view stays open

#### Scenario: A click outside inside the card details
- **WHEN** Ayla zooms the face in a card's details and clicks outside the card
- **THEN** only the zoom view closes, and the card details stay open

#### Scenario: Escape inside the card details
- **WHEN** Ayla zooms the face in a card's details and presses Escape
- **THEN** only the zoom view closes, and the card details stay open

#### Scenario: Closing inside an open pack
- **WHEN** Ayla zooms a turned card of her open pack and closes the zoom view
- **THEN** her pack view stays open, with the same cards turned and the same card selected

#### Scenario: The card leaves the hand
- **WHEN** Bora is zooming a card in Ayla's hand, and the DM discards that card
- **THEN** the zoom view closes on Bora's screen

### Requirement: Zoom view at phone width
At 360 CSS pixels wide, the zoom view, with its picture or its face without pictures, SHALL fit the screen, and the page SHALL NOT scroll horizontally.

#### Scenario: Zooming on a phone
- **WHEN** a user zooms a card on a screen 360 CSS pixels wide
- **THEN** the whole card is visible inside the view, and the page has no horizontal scrollbar
