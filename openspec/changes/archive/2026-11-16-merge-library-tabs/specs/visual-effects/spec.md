## MODIFIED Requirements

### Requirement: Tilt and glint under a mouse pointer
In the card views of the hand and of every tab of the Kütüphane, True Word faces included, a card under a mouse pointer SHALL tilt toward the pointer by at most about 3 degrees. It SHALL grow very slightly, brighten a little, and show a soft light that follows the pointer. The card SHALL settle back when the pointer leaves. A touch, a pressed pen, and a card face inside a dialog SHALL NOT tilt it.

#### Scenario: Moving the mouse over a library card
- **WHEN** a user moves the mouse from the centre of "Aboleth's Eyes" toward its top-right corner in the Kartlar tab's card view
- **THEN** the card tilts toward that corner, a soft light follows the pointer, and the card settles flat when the pointer leaves

#### Scenario: A True Word face
- **WHEN** a user moves the mouse over "Abyss" in the True Words tab's card view
- **THEN** its face tilts toward the pointer and settles flat when the pointer leaves

#### Scenario: Touching a card
- **WHEN** a user touches a card in the hand on a phone
- **THEN** the card does not tilt

### Requirement: The cards lie as a deck
In the card views of the hand and of every tab of the Kütüphane, the cards SHALL be up to 235 CSS pixels wide. On a device with hover, they SHALL overlap by up to about a third of their width when that fits more cards into a row. The card under the pointer or the focus SHALL come to the front. Every few cards SHALL sit at an angle under half a degree, the same angle on every device. Without hover, cards SHALL NOT overlap.

#### Scenario: A wide hand
- **WHEN** Ayla's hand of 9 cards is shown on a 1280 CSS pixel wide desktop window
- **THEN** the cards overlap slightly, some sit at a slight angle, and the card under the pointer comes to the front whole

#### Scenario: A tablet without hover
- **WHEN** the Kartlar tab's card view is shown on a tablet without hover
- **THEN** the cards do not overlap, and the magnifier of every card can be tapped

#### Scenario: The True Words as a deck
- **WHEN** the True Words tab's card view is shown on a 1280 CSS pixel wide desktop window with a mouse
- **THEN** the word faces lie as the cards of the Kartlar tab do

#### Scenario: Phone width
- **WHEN** the hand's card view is shown 360 CSS pixels wide
- **THEN** the cards fit the width without overlap, and the page has no horizontal scrollbar

### Requirement: Held cards glow in the library
In the Kartlar tab's card view, a card that someone holds SHALL glow soft gold. This SHALL also hold for a Cursed card in the Cursed tab that is in a hand. The "Elde: …" mark SHALL stay. A True Word face SHALL NOT glow because someone knows it.

#### Scenario: A held card
- **WHEN** Ayla holds "Aboleth's Eyes" and a user opens the Kartlar tab's card view
- **THEN** "Aboleth's Eyes" glows soft gold and shows "Elde: Ayla", and a card in the pool does not glow

#### Scenario: A held Cursed card
- **WHEN** Bora holds "Visions of Death" and a user opens the Cursed tab's card view
- **THEN** "Visions of Death" glows soft gold and shows "Elde: Bora"

#### Scenario: A known True Word
- **WHEN** Ayla knows "Abyss" and a user opens the True Words tab's card view
- **THEN** "Abyss" does not glow
