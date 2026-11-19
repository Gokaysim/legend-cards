# live-draws Specification

## Purpose

Lets the whole table watch a random or Cursed draw as it happens: each opening of the draw dialog becomes a draw session that every device shows live, with its cards turning over everywhere.

## Requirements

### Requirement: A draw session
Each opening of the draw dialog that draws at least one card SHALL make one draw session. The session SHALL start with its first draw, in the same step, and every later draw of the same dialog SHALL join it in its own step. Opening and closing the dialog without drawing SHALL make no session. Opening the dialog again SHALL start a new session.

#### Scenario: Three draws, one session
- **WHEN** Ayla draws three cards in one draw dialog
- **THEN** one session holds the three cards, in the order drawn

#### Scenario: No draw
- **WHEN** Ayla opens her draw dialog and closes it without drawing
- **THEN** no session is made, and no other device shows anything

#### Scenario: A second dialog
- **WHEN** Ayla draws one card, closes the dialog, opens it again and draws another
- **THEN** each card is in its own session

### Requirement: Everyone watches a draw
When a session starts, every signed-in user other than the one who draws SHALL see it on whatever screen they are on, live, opened in full. Random and Cursed draws, a player's own draws and the DM's draws into a player's hand SHALL all be shown. Showing a session SHALL NOT stop anyone from drawing, opening a pack, or changing anything.

#### Scenario: A player watches
- **WHEN** Ayla draws a card while Bora is on the library screen
- **THEN** Bora's screen shows Ayla's draw with the card face down

#### Scenario: The DM draws for a player
- **WHEN** the DM draws a Cursed card into Bora's hand
- **THEN** Bora and Ayla see the draw, and the DM's own screen shows only the draw dialog

#### Scenario: Drawing while watching
- **WHEN** Bora watches Ayla's draw and selects "🎲 Kart Çek" in his own hand
- **THEN** his draw dialog opens, and he can draw

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

### Requirement: Cards turn over on every device
Turning a card of a session over, in the draw dialog or in a watching view, SHALL turn it over on every device that shows the session, live. A turned card SHALL stay face up for the rest of the session and after it ends. Turning SHALL work while a pack is open.

#### Scenario: Ayla turns a card
- **WHEN** Ayla turns over the second card in her draw dialog
- **THEN** that card turns over on Bora's and the DM's screens too

#### Scenario: Reopening a watching view
- **WHEN** Bora shrinks Ayla's draw after one card was turned, and shows it again
- **THEN** that card is still face up

### Requirement: Who turns the cards
Only the hand's owner and the DM SHALL turn the cards of a session, in the draw dialog or in the watching view. Other players SHALL see the cards without a control to turn them, and the server SHALL deny their turns.

#### Scenario: The owner turns a card the DM drew
- **WHEN** the DM draws a card into Bora's hand, and Bora selects it in his watching view
- **THEN** it turns over on every device

#### Scenario: Another player tries to turn a card
- **WHEN** Bora writes a turned card into Ayla's session
- **THEN** the server denies it

### Requirement: Closing the dialog ends the session
Closing the draw dialog SHALL end its session. Every card still face down SHALL then turn over on every device. An ended session SHALL take no more draws or turns.

#### Scenario: Closing with cards face down
- **WHEN** Ayla closes her draw dialog with two of her three cards still face down
- **THEN** the session ends, and all three cards show face up on Bora's screen

#### Scenario: A draw after the end
- **WHEN** a draw is written into a session that has ended
- **THEN** the server denies it

### Requirement: How a session ended stays in view
An expanded watching view SHALL keep showing an ended session, with its cards face up and a Turkish line that names how many cards went to whose hand, until the user closes it. A watching view that was shrunk to its banner SHALL go away when its session ends.

#### Scenario: Watching to the end
- **WHEN** Ayla closes her draw dialog while Bora's view of it is expanded
- **THEN** Bora's view says that 3 cards were added to Ayla's hand, with the cards face up, until he closes it

#### Scenario: A banner at the end
- **WHEN** Ayla's session ends while Bora has shrunk it to its banner
- **THEN** the banner goes away

### Requirement: A stale session ends on its own
A session with no draw, turn or end for 10 minutes SHALL count as ended on every device, without being written, with its cards face up. This covers a dialog whose device closed or lost its connection. A draw dialog whose session has counted as ended SHALL start a new session with its next draw.

#### Scenario: A closed tab
- **WHEN** Ayla closes her browser tab during a session, and 10 minutes pass with no change to it
- **THEN** Bora's screen shows the session as ended, with every card face up

#### Scenario: Drawing after a long pause
- **WHEN** Ayla's draw dialog stays open for 10 minutes with no change, and she draws again
- **THEN** the card starts a new session, which every other device shows from the start

### Requirement: The DM ends a session
The DM SHALL be able to end any open session from its watching view or its banner. Ending it SHALL work as closing the dialog does. A player SHALL NOT end another player's session.

#### Scenario: Ending a forgotten session
- **WHEN** the DM ends Ayla's open session from its banner
- **THEN** the session ends on every device, and its cards show face up

#### Scenario: A player ends another's session
- **WHEN** Bora writes the end of Ayla's session
- **THEN** the server denies it

### Requirement: Shrinking the watching view
Any user SHALL be able to shrink a watching view to a banner and show it again from there, only on their own device. The banner SHALL name whose draw it is, show the session's cards as small pictures (face up when turned, the back otherwise), and offer "Göster".

#### Scenario: Shrinking
- **WHEN** Bora shrinks Ayla's draw while one of three cards is face up
- **THEN** a banner says that Ayla is drawing cards, with one small face and two small backs, and selecting "Göster" shows the draw again

#### Scenario: Only on one device
- **WHEN** Bora shrinks Ayla's draw
- **THEN** the DM's view of it stays expanded

### Requirement: Several sessions at once
When more than one session is open, each device SHALL show the newest one expanded, unless the user shrank it, and every other open session as its banner. A newer session SHALL take the expanded place from an older one, which then shows as its banner.

#### Scenario: Two players draw
- **WHEN** Ayla starts a session and Bora starts one a moment later, while the DM watches
- **THEN** the DM sees Bora's draw expanded and Ayla's as a banner

#### Scenario: Back to the older session
- **WHEN** the DM selects "Göster" on Ayla's banner while Bora's draw is expanded
- **THEN** Ayla's draw shows expanded, and Bora's as its banner

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
