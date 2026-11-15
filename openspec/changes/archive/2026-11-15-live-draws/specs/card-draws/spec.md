# Spec Delta

## MODIFIED Requirements

### Requirement: Flipping a drawn card
Selecting a face-down card in the draw dialog SHALL reveal it, showing its name, kind, set, rarity, cost, and visible text. Only the hand's owner and the DM SHALL turn a drawn card. A revealed card SHALL stay revealed for good, and SHALL turn over on every device that shows its draw (spec: live-draws, "Cards turn over on every device").

#### Scenario: Revealing a card
- **WHEN** Ayla selects the face-down card she just drew
- **THEN** it turns over and shows its name and its visible text

#### Scenario: Revealed on the other screens
- **WHEN** Ayla turns over the card she just drew while Bora watches her draw
- **THEN** it turns over on Bora's screen too

### Requirement: Draw records
Each draw SHALL be stored permanently with its kind (random or Cursed), who drew, whose hand it went to, when, the card and its kind, the holding it opened, the payment (1 LP or none), the DM's filters, if any, and its draw session (spec: live-draws). Random and Cursed draws SHALL never be changed or deleted. Pack openings are kept with the draws but follow the pack-shop rules: they change while the pack is open. Every signed-in user SHALL be able to read every draw. A draw record stored before draw sessions existed SHALL be read as having no session.

#### Scenario: Recording a paid draw
- **WHEN** Ayla draws "Aboleth's Eyes" for 1 LP
- **THEN** a draw record names Ayla as the drawer and the hand's owner, the time, "Aboleth's Eyes", the new holding, a payment of 1 LP, and the session of her draw dialog

#### Scenario: Changing a draw
- **WHEN** any signed-in user, including the DM, tries to change or delete a random or Cursed draw record
- **THEN** the server denies it

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user tries to read a draw record
- **THEN** the server denies it

#### Scenario: An older record
- **WHEN** the application reads a draw record without a session
- **THEN** it reads the record without error, and the İşlem Logu and the statistics show it as before

### Requirement: Draw, holding, card, and payment agree
The server SHALL accept a draw only together with the holding it opens, the drawn normal card's new holder, its draw session's new or added card, and, for a paid draw, its ledger entry and the new LP. It SHALL accept each of those writes as part of a draw only together with that draw.

#### Scenario: A draw without its holding
- **WHEN** a player writes a draw record without opening the holding it names
- **THEN** the server denies it

#### Scenario: A paid draw without payment
- **WHEN** a player writes a random draw for their own hand without the ledger entry and the lower LP
- **THEN** the server denies the whole write

#### Scenario: Paying the wrong amount
- **WHEN** a player writes a random draw whose payment lowers their LP by 2
- **THEN** the server denies the whole write

#### Scenario: A free draw by a player
- **WHEN** a player writes a random draw marked as free
- **THEN** the server denies it

#### Scenario: A draw without its session
- **WHEN** a player writes a random draw that names no session, or a session that does not take this card in the same write
- **THEN** the server denies the whole write

### Requirement: The draw table
The draw dialog SHALL show a deck with the number of cards a draw picks from on it, the draw control under the deck, and the drawn cards beside it. Above the table, chips SHALL name the kind of draw, whose hand the cards go to, and the price; a player's dialog SHALL also show their LP. The DM's dialog SHALL show its filters in one row above the deck, each opening its choices. Under the table, a line with the live mark SHALL say in Turkish that everyone sees the draw live and that a turned card turns over for them too.

#### Scenario: The DM's deck
- **WHEN** the DM's filters match 24 drawable cards
- **THEN** the deck shows 24, and the draw control is under it

#### Scenario: A player's table
- **WHEN** Ayla, who has 2 LP, opens her draw dialog
- **THEN** it shows the deck, "2 LP", "Her kart 1 LP", and "🎲 Çek · 1 LP"

#### Scenario: The live line
- **WHEN** Ayla opens her draw dialog
- **THEN** a line under the table says in Turkish that everyone sees her draw live, with the cards she turns

#### Scenario: Phone width
- **WHEN** the DM's draw dialog with filters on and 3 drawn cards is shown 360 CSS pixels wide
- **THEN** the filters wrap onto more rows, an open filter's choices fit the dialog, and the page has no horizontal scrollbar
