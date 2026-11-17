## MODIFIED Requirements

### Requirement: The deck's back
The deck SHALL show the back of the next draw: the chosen set's cardback while a set filter is on, the DM's or a player's, the Cursed cardback in a Cursed draw, and otherwise the neutral back. Each face-down card SHALL show the Cursed cardback in a Cursed draw, and in a random draw the card's own back (spec: card-images, "Cardbacks of face-down cards"): the Blessed cardback for a Blessed card, and otherwise the cardback of the card's set. A back without a picture SHALL show the neutral back.

#### Scenario: A set-filtered draw
- **WHEN** the DM chooses the set "Kesqerian Nights" and draws a card
- **THEN** the deck and the face-down card show the Kesqer cardback

#### Scenario: A draw without a set filter
- **WHEN** the DM draws with only the rarity "Rare" chosen, and the card drawn is of Kesqerian Nights
- **THEN** the deck shows the neutral back, and the face-down card the Kesqer cardback

#### Scenario: A Blessed card without a set filter
- **WHEN** the DM draws without a set filter, and the card drawn is Blessed
- **THEN** the deck shows the neutral back, and the face-down card the Blessed cardback

#### Scenario: Changing the set between draws
- **WHEN** the DM draws a card of Pandemonium without a set filter, then chooses "Kesqerian Nights" and draws another
- **THEN** the first face-down card shows the Pandemonium cardback, the second the Kesqer cardback, and the deck the Kesqer cardback

#### Scenario: A Cursed draw
- **WHEN** Ayla makes a Cursed draw
- **THEN** the deck and the face-down card show the Cursed cardback

#### Scenario: A player's set draw
- **WHEN** the mode is "Filtreli çekiş", and Ayla chooses the set "Kesqerian Nights" and draws
- **THEN** the deck and the face-down card show the Kesqer cardback, on her screen and on every watching screen

#### Scenario: Watching a random draw
- **WHEN** Bora watches Ayla draw a Blessed card without a set filter
- **THEN** the face-down card shows the Blessed cardback on his screen too, in the open view and in the banner
