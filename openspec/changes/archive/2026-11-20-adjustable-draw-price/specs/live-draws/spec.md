# Spec Delta

## MODIFIED Requirements

### Requirement: What the watching view shows
The watching view SHALL show whose hand the cards go to, who draws when it is not the hand's owner, whether it is a random or a Cursed draw, and the session's payment so far: the sum of its cards' prices ("−3 LP"), or "Ücretsiz" when nothing was paid. A session card stored without a price SHALL count 1 LP for a player's random draw into their own hand and nothing otherwise. It SHALL show the deck with the number of cards in its pool, and the session's cards in the order drawn, each face down until it is turned. It SHALL NOT list the filters of a draw, the DM's or a player's. A face-down card SHALL show the back its draw had (spec: card-draws, "The deck's back").

#### Scenario: A player's paid draw
- **WHEN** Bora watches Ayla draw two cards for 1 LP each
- **THEN** his view says that Ayla is drawing into her own hand, shows "−2 LP", and shows two face-down cards

#### Scenario: The DM's filtered draw
- **WHEN** the table's player draw mode is "Kapalı", and Bora watches the DM draw into Ayla's hand with the rarity "Rare" chosen
- **THEN** his view says that the DM is drawing into Ayla's hand, "Ücretsiz", and names no filter

#### Scenario: Prices set while the mode is on
- **WHEN** the table's player draw mode is "Filtreli çekiş", and Bora watches the DM draw into Ayla's hand once at 1 LP and once at 2 LP
- **THEN** his view says that the DM is drawing into Ayla's hand and shows "−3 LP"

#### Scenario: Free draws while the mode is on
- **WHEN** the table's player draw mode is "Kart seçme", and Bora watches Ayla draw one card at 0 LP
- **THEN** his view shows "Ücretsiz"

#### Scenario: A set-filtered draw
- **WHEN** Bora watches the DM draw with the set "Kesqerian Nights" chosen
- **THEN** the face-down card shows the Kesqer cardback

#### Scenario: A player's filtered draw
- **WHEN** the table's player draw mode is "Kart seçme", and Bora watches Ayla draw one card for 1 LP with a keyword and the set "Kesqerian Nights" chosen
- **THEN** his view says that Ayla is drawing into her own hand, shows "−1 LP", names no filter, and the face-down card shows the Kesqer cardback

#### Scenario: An older session
- **WHEN** Bora's view shows a session whose two cards were stored without a price, drawn by Ayla into her own hand
- **THEN** it shows "−2 LP"

### Requirement: Session records
Each session SHALL be stored with its kind, the hand's owner, who draws, when it started, its draws in order with each card, its back and its price, which cards are turned, when it last changed, and when and by whom it ended. Every signed-in user SHALL be able to read every session. No session SHALL be deleted. A session card stored before prices were stored SHALL be read without error.

#### Scenario: A stored session
- **WHEN** Ayla draws "Aboleth's Eyes" for 1 LP and turns it over
- **THEN** her session record names her as owner and drawer, holds "Aboleth's Eyes" as its first card with the price 1, and marks it turned

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user tries to read a session
- **THEN** the server denies it

#### Scenario: Deleting a session
- **WHEN** any signed-in user, including the DM, tries to delete a session
- **THEN** the server denies it

### Requirement: Session steps agree
The server SHALL accept a new session only together with its first draw, and a session's new card only together with that draw, by the same drawer, into the same hand, of the same kind, with the draw's price. It SHALL accept a turn only of a card the session holds, once, and an end only once, by the hand's owner or the DM, now. It SHALL deny any other change.

#### Scenario: A session without its draw
- **WHEN** a player writes a new session without a draw
- **THEN** the server denies it

#### Scenario: Another drawer's card
- **WHEN** the DM writes a draw into Ayla's session that Ayla started
- **THEN** the server denies it

#### Scenario: A card with another price
- **WHEN** a player writes a draw at 2 LP whose session card records the price 1
- **THEN** the server denies the whole write

#### Scenario: Turning a card that is not there
- **WHEN** Ayla writes a turn of a fourth card into a session of three
- **THEN** the server denies it
