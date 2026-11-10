# visual-effects Specification

## Purpose

The decorative light and motion of cards, packs and tiles, following the legacy app v2.2.8: the tilt and glint, the deck layout, the glows, the draw spread, the pack tiles' frames, and the hover lifts. A visual effect is not a card effect (the card's text): it changes how something looks, never what it does.

## Requirements

### Requirement: Reduced motion stops every moving effect
When the device asks for reduced motion, no visual effect SHALL move: no tilt, glint, lift, angle, shimmer, pulse or burst. A card SHALL turn over at once. The glows and frames SHALL stay, because they do not move. Effects SHALL never hide information: every state they show SHALL also show as text or a mark.

#### Scenario: A hand with reduced motion
- **WHEN** a user whose device asks for reduced motion moves the mouse over a card in Ayla's hand
- **THEN** the card neither tilts nor lifts, the cards sit straight, and Ayla's active card still glows green with its "● Aktif" mark

### Requirement: Tilt and glint under a mouse pointer
In the card views of the hand, the library and the Cursed Deck, a card under a mouse pointer SHALL tilt toward the pointer by at most about 3 degrees. It SHALL grow very slightly, brighten a little, and show a soft light that follows the pointer. The card SHALL settle back when the pointer leaves. A touch, a pressed pen, and a card face inside a dialog SHALL NOT tilt it.

#### Scenario: Moving the mouse over a library card
- **WHEN** a user moves the mouse from the centre of "Aboleth's Eyes" toward its top-right corner in the library's card view
- **THEN** the card tilts toward that corner, a soft light follows the pointer, and the card settles flat when the pointer leaves

#### Scenario: Touching a card
- **WHEN** a user touches a card in the hand on a phone
- **THEN** the card does not tilt

### Requirement: The cards lie as a deck
In the card views of the hand, the library and the Cursed Deck, the cards SHALL be up to 235 CSS pixels wide. On a device with hover, they SHALL overlap by up to about a third of their width when that fits more cards into a row. The card under the pointer or the focus SHALL come to the front. Every few cards SHALL sit at an angle under half a degree, the same angle on every device. Without hover, cards SHALL NOT overlap.

#### Scenario: A wide hand
- **WHEN** Ayla's hand of 9 cards is shown on a 1280 CSS pixel wide desktop window
- **THEN** the cards overlap slightly, some sit at a slight angle, and the card under the pointer comes to the front whole

#### Scenario: A tablet without hover
- **WHEN** the library's card view is shown on a tablet without hover
- **THEN** the cards do not overlap, and the magnifier of every card can be tapped

#### Scenario: Phone width
- **WHEN** the hand's card view is shown 360 CSS pixels wide
- **THEN** the cards fit the width without overlap, and the page has no horizontal scrollbar

### Requirement: Active cards glow in the hand
In the hand's card view, an active card SHALL glow: a Cursed card red, a Blessed card pearl white, and any other card green. An inactive card SHALL NOT glow. The "● Aktif" mark SHALL stay.

#### Scenario: Three active cards
- **WHEN** Ayla's hand shows an active Common card, an active Cursed card and an active Blessed card
- **THEN** they glow green, red and pearl white, and each has the "● Aktif" mark

#### Scenario: An inactive card
- **WHEN** the DM switches Ayla's active card inactive
- **THEN** its glow goes away on every device that shows her hand

### Requirement: Held cards glow in the library
In the library's card view, a card that someone holds SHALL glow soft gold. This SHALL also hold for a Cursed card in the Cursed Deck that is in a hand. The "Elde: …" mark SHALL stay.

#### Scenario: A held card
- **WHEN** Ayla holds "Aboleth's Eyes" and a user opens the library's card view
- **THEN** "Aboleth's Eyes" glows soft gold and shows "Elde: Ayla", and a card in the pool does not glow

### Requirement: Revealed cards glow in their kind's color
In a draw and in an open pack, a face-up card SHALL glow in its kind's color: a Rare card orange, a Cursed card red, and a Blessed card pearl white. A Common card SHALL have only a drop shadow. A face-down card SHALL NOT glow, so that its back never gives the card away.

#### Scenario: A Blessed card turns over
- **WHEN** Ayla turns over a Blessed card in her draw
- **THEN** its face glows pearl white, and before the turn its back showed no glow

#### Scenario: A Common card
- **WHEN** Ayla turns over a Common card in an open pack
- **THEN** its face has a drop shadow and no colored glow

### Requirement: The draw spread
In the draw dialog, the drawn cards SHALL be about half as large again as a card in the hand's card view, and fit the dialog's width. They SHALL overlap slightly. The card under the pointer or the focus SHALL lift and come to the front. A card SHALL turn over in a soft turn of about two-thirds of a second.

#### Scenario: Five drawn cards
- **WHEN** the DM draws 5 cards for Ayla on a desktop
- **THEN** the face-down cards lie in an overlapping row, and the card under the pointer lifts above its neighbours

#### Scenario: Phone width
- **WHEN** the draw dialog with 5 drawn cards is shown 360 CSS pixels wide
- **THEN** every card fits the dialog, and the page has no horizontal scrollbar

### Requirement: The open pack's selected card glows
In an open pack, the selected card and the chosen card SHALL glow gold. Once every card is face up, a card that can be selected SHALL glow gold under the pointer.

#### Scenario: Selecting a card
- **WHEN** every card of Ayla's open pack is face up and she selects "Aboleth's Eyes"
- **THEN** "Aboleth's Eyes" glows gold

#### Scenario: Before every card is turned
- **WHEN** a card of Ayla's open pack is still face down and she moves the pointer over a face-up card
- **THEN** the face-up card does not glow gold

### Requirement: Premium and Cursed pack tiles
In the Pack Shop, a set's Premium Pack tile SHALL show its picture in a gold ridged frame with a "✦" corner. A slow shimmer SHALL run over it. The Cursed, Cursed Golden and Pandemonium Cursed Pack tiles SHALL show theirs in a red ridged frame with a "☠" corner. Other tiles SHALL have no such frame. The tiles SHALL keep their names and prices.

#### Scenario: A set's packs
- **WHEN** a user opens the Kesqerian Nights group
- **THEN** the Premium Pack has the gold frame with "✦" and a shimmer, the Cursed Pack has the red frame with "☠", and the Standard Pack has neither

#### Scenario: The Golden Packs
- **WHEN** a user opens the Golden Packs group
- **THEN** the Cursed Golden Pack has the red frame with "☠", and the Golden Pack shows its own picture without a frame

### Requirement: Pack tiles respond to the pointer
A pack tile that can be opened SHALL lift slightly and brighten under the pointer or the focus. A pack tile that cannot be opened SHALL look greyed out, and SHALL still show why it cannot be opened.

#### Scenario: A pack that cannot be opened
- **WHEN** Ayla has too little LP for a Premium Pack
- **THEN** its tile is greyed out, does not lift, and says why it cannot be opened

### Requirement: True Word glows
A True Word tile of an active word SHALL glow purple, and SHALL keep its "● Aktif" mark. A True Word tile that opens something when selected SHALL lift slightly under the pointer or the focus. In the hand summary, the name of an active True Word SHALL have a purple glow.

#### Scenario: An active word
- **WHEN** the DM switches Ayla's "Abyss" active
- **THEN** its tile on her True Words tab glows purple with the "● Aktif" mark, and "✦ Abyss" in her hand summary has a purple glow

### Requirement: Shop choices and the Cardmaker
On the Shops screen, the two shop choices SHALL lift slightly under the pointer or the focus. A Cardmaker picture SHALL have a soft drop shadow.

#### Scenario: Choosing a shop
- **WHEN** a user moves the pointer over "Pack Shop" on the Shops screen
- **THEN** the choice lifts slightly
