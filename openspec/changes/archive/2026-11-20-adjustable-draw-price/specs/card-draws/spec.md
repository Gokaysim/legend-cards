# Spec Delta

## ADDED Requirements

### Requirement: The draw price while the mode is on
While the table's "Oyuncu kart çekişi" is "Filtreli çekiş" or "Kart seçme", the random draw dialog of a player and of the DM SHALL show a price control that starts at 1 LP each time the dialog opens. It SHALL take any whole number of LP from 0 to 1,000,000. Each draw SHALL cost the price shown when it is made, paid from the hand owner's LP; 0 SHALL be a free draw. Under "Kapalı" and in a Cursed draw there SHALL be no price control.

#### Scenario: The default price
- **WHEN** the mode is "Filtreli çekiş", and Ayla, who has 4 LP, opens her draw dialog
- **THEN** the price control shows 1 LP, and the draw control reads "🎲 Çek · 1 LP"

#### Scenario: A player raises the price
- **WHEN** the mode is "Filtreli çekiş", and Ayla, who has 4 LP, sets the price to 3 and draws
- **THEN** a card is added to her hand, and she has 1 LP

#### Scenario: A free draw by a player
- **WHEN** the mode is "Kart seçme", and Ayla, who has 0 LP, sets the price to 0
- **THEN** the draw control reads "🎲 Çek" and is enabled, and her draw leaves her LP at 0

#### Scenario: Different prices in one dialog
- **WHEN** the mode is "Filtreli çekiş", and Ayla, who has 5 LP, draws once at 1 LP, then sets 2 and draws again
- **THEN** her two draw records hold the prices 1 and 2, and she has 2 LP

#### Scenario: The DM's default price
- **WHEN** the mode is "Filtreli çekiş", and the DM opens a draw dialog for Bora, who has 3 LP
- **THEN** the price control shows 1 LP, the dialog shows Bora's 3 LP, and a draw leaves Bora with 2 LP

#### Scenario: The DM draws for free
- **WHEN** the mode is "Filtreli çekiş", and the DM sets the price to 0 and draws into Bora's hand
- **THEN** the card is added to his hand, and his LP does not change

#### Scenario: Reopening the dialog
- **WHEN** Ayla set the price to 3, closes her draw dialog, and opens it again while the mode is still on
- **THEN** the price control shows 1 LP

#### Scenario: Kapalı
- **WHEN** the mode is "Kapalı", and Ayla or the DM opens a random draw dialog
- **THEN** no price control is shown

#### Scenario: A Cursed draw
- **WHEN** the mode is "Kart seçme", and Ayla opens her Cursed draw dialog
- **THEN** no price control is shown, and the draw is free

#### Scenario: Phone width
- **WHEN** the mode is "Kart seçme", and a draw dialog with the price control and the filters is shown 360 CSS pixels wide
- **THEN** the price control fits the width with its buttons in view, and the page has no horizontal scrollbar

### Requirement: The server checks the draw price
The server SHALL accept a player's random draw at a price other than 1 LP, a free draw included, only while the stored mode is "Filtreli çekiş" or "Kart seçme". It SHALL accept the DM's random draw into any hand free, or paid at any whole price from 1 to 1,000,000 LP from the hand owner's LP, in any mode. A paid draw's ledger entry SHALL take exactly the draw's price from the hand owner's LP, and a draw SHALL name an entry exactly when its price is above 0.

#### Scenario: Another price under Kapalı
- **WHEN** the mode is "Kapalı", and a player writes a draw for their own hand at 2 LP with its entry and lower LP
- **THEN** the server denies the whole write

#### Scenario: A free draw under Kapalı
- **WHEN** the mode is "Kapalı", and a player writes a random draw for their own hand marked as free
- **THEN** the server denies it

#### Scenario: Another price while the mode is on
- **WHEN** the mode is "Filtreli çekiş", and a player writes a draw for their own hand at 3 LP with an entry of −3 and LP lowered by 3
- **THEN** the server accepts it

#### Scenario: A price and an entry that disagree
- **WHEN** the mode is "Filtreli çekiş", and a player writes a draw at 3 LP whose entry takes 1 LP
- **THEN** the server denies the whole write

#### Scenario: The DM charges a player
- **WHEN** the DM writes a draw into Bora's hand at 2 LP with an entry of −2 on Bora's LP and his LP lowered by 2
- **THEN** the server accepts it

#### Scenario: The DM charges the wrong account
- **WHEN** the DM writes a draw into Bora's hand at 2 LP whose entry takes the LP of Ayla
- **THEN** the server denies the whole write

#### Scenario: A price over the limit or not whole
- **WHEN** a player or the DM writes a draw at 1,000,001 LP, at 1.5 LP, or at a negative price
- **THEN** the server denies it

#### Scenario: A player charges another player
- **WHEN** a player writes a ledger entry for a draw that takes LP from another player
- **THEN** the server denies it

## MODIFIED Requirements

### Requirement: A player draws for 1 LP
A player SHALL be able to draw a random card into their own hand for 1 LP, or, while the player draw mode is on, for the price they set (spec: "The draw price while the mode is on"). The card SHALL go to the end of the hand, and the player's LP SHALL drop by the price, in the same step.

#### Scenario: Drawing a card
- **WHEN** Ayla, who has 3 LP, selects "🎲 Kart Çek" in her draw dialog
- **THEN** one card is added to the end of her hand, and she has 2 LP on every device

#### Scenario: Drawing at another price
- **WHEN** the mode is "Filtreli çekiş", and Ayla, who has 3 LP, draws at 2 LP
- **THEN** one card is added to the end of her hand, and she has 1 LP on every device

### Requirement: A draw needs enough LP
A paid draw SHALL need at least its price in the hand owner's LP. While the hand owner has less, the draw control SHALL be disabled, with a Turkish note that names the price. The server SHALL deny a paid draw that would bring LP below 0.

#### Scenario: No LP left
- **WHEN** Ayla has 0 LP and opens her draw dialog
- **THEN** the draw control is disabled, and a Turkish note says that a draw costs 1 LP

#### Scenario: A price above the LP
- **WHEN** the mode is "Filtreli çekiş", and Ayla, who has 2 LP, sets the price to 3
- **THEN** the draw control is disabled, and a Turkish note says that this draw needs 3 LP

#### Scenario: The DM's price above the owner's LP
- **WHEN** the mode is "Filtreli çekiş", and the DM sets the price to 2 for Bora, who has 1 LP
- **THEN** the draw control is disabled, and a Turkish note says that the draw needs 2 LP

#### Scenario: A forged draw without LP
- **WHEN** a player with 0 LP writes a paid draw
- **THEN** the server denies it

### Requirement: The DM draws for free
The DM SHALL be able to draw a random card into any hand of a user who has a profile, without charging any LP while the player draw mode is "Kapalı". While the mode is on, the DM's draw SHALL cost the price set in the dialog, 1 LP by default, from the hand owner's LP, and a price of 0 SHALL keep it free (spec: "The draw price while the mode is on").

#### Scenario: Drawing for a player
- **WHEN** the mode is "Kapalı", and the DM draws a card into Ayla's hand while she has 0 LP
- **THEN** the card is added to the end of her hand, and her LP stays 0

#### Scenario: Drawing for a player while the mode is on
- **WHEN** the mode is "Kart seçme", and the DM draws a card into Ayla's hand at the default price while she has 2 LP
- **THEN** the card is added to the end of her hand, and she has 1 LP

### Requirement: Draw records
Each draw SHALL be stored permanently with its kind (random or Cursed), who drew, whose hand it went to, when, the card and its kind, the holding it opened, the payment (an amount of the hand owner's LP, or none), the filters of whoever drew, if any, and its draw session (spec: live-draws). Random and Cursed draws SHALL never be changed or deleted. Pack openings are kept with the draws but follow the pack-shop rules: they change while the pack is open. Every signed-in user SHALL be able to read every draw. A draw record stored before draw sessions existed SHALL be read as having no session.

#### Scenario: Recording a paid draw
- **WHEN** Ayla draws "Aboleth's Eyes" for 1 LP
- **THEN** a draw record names Ayla as the drawer and the hand's owner, the time, "Aboleth's Eyes", the new holding, a payment of 1 LP, and the session of her draw dialog

#### Scenario: Recording a player's filters
- **WHEN** the mode is "Filtreli çekiş", and Ayla draws with the set "Kesqerian Nights" chosen
- **THEN** her draw record holds the set code "Kesqer" in its filters, with a payment of 1 LP

#### Scenario: Recording another price
- **WHEN** the mode is "Filtreli çekiş", and the DM draws "Aboleth's Eyes" into Bora's hand at 3 LP
- **THEN** the draw record names the DM as the drawer, Bora as the hand's owner, and a payment of 3 LP

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
The server SHALL accept a draw only together with the holding it opens, the drawn normal card's new holder, its draw session's new or added card, and, for a paid draw, its ledger entry and the hand owner's new LP. It SHALL accept each of those writes as part of a draw only together with that draw.

#### Scenario: A draw without its holding
- **WHEN** a player writes a draw record without opening the holding it names
- **THEN** the server denies it

#### Scenario: A paid draw without payment
- **WHEN** a player writes a random draw for their own hand without the ledger entry and the lower LP
- **THEN** the server denies the whole write

#### Scenario: Paying the wrong amount
- **WHEN** a player writes a random draw at 1 LP whose payment lowers their LP by 2
- **THEN** the server denies the whole write

#### Scenario: A free draw by a player
- **WHEN** the mode is "Kapalı", and a player writes a random draw marked as free
- **THEN** the server denies it

#### Scenario: A DM's paid draw without payment
- **WHEN** the DM writes a draw into Bora's hand at 2 LP without the ledger entry and Bora's lower LP
- **THEN** the server denies the whole write

#### Scenario: A draw without its session
- **WHEN** a player writes a random draw that names no session, or a session that does not take this card in the same write
- **THEN** the server denies the whole write

### Requirement: The draw table
The draw dialog SHALL show a deck with the number of cards a draw picks from on it, the draw control under the deck, and the drawn cards beside it. Above the table, chips SHALL name the kind of draw, whose hand the cards go to, and the price; a paid or priced dialog SHALL also show the hand owner's LP, and a player's dialog the mode while it is not "Kapalı". While the mode is on, a random draw dialog SHALL show the price control above the deck. A dialog with filters SHALL show them in one row above the deck, each opening its choices. Under the table, a line with the live mark SHALL say in Turkish that everyone sees the draw live and that a turned card turns over for them too.

#### Scenario: The DM's deck
- **WHEN** the DM's filters match 24 drawable cards
- **THEN** the deck shows 24, and the draw control is under it

#### Scenario: A player's table
- **WHEN** the mode is "Kapalı", and Ayla, who has 2 LP, opens her draw dialog
- **THEN** it shows the deck, "2 LP", "Her kart 1 LP", and "🎲 Çek · 1 LP"

#### Scenario: A priced table
- **WHEN** the mode is "Filtreli çekiş", and Ayla, who has 5 LP, sets the price to 2
- **THEN** it shows "5 LP", "Her kart 2 LP", the price control at 2, and "🎲 Çek · 2 LP"

#### Scenario: A free priced table
- **WHEN** the mode is "Filtreli çekiş", and the DM sets the price to 0 for Bora's draw
- **THEN** it shows Bora's LP, "Ücretsiz", the price control at 0, and "🎲 Çek"

#### Scenario: The live line
- **WHEN** Ayla opens her draw dialog
- **THEN** a line under the table says in Turkish that everyone sees her draw live, with the cards she turns

#### Scenario: Phone width
- **WHEN** the DM's draw dialog with filters on and 3 drawn cards is shown 360 CSS pixels wide
- **THEN** the filters wrap onto more rows, an open filter's choices fit the dialog, and the page has no horizontal scrollbar

#### Scenario: A player's filters at phone width
- **WHEN** the mode is "Kart seçme", and Ayla's draw dialog with filters on is shown 360 CSS pixels wide
- **THEN** the filters wrap onto more rows, and the page has no horizontal scrollbar

### Requirement: A player's draw tools follow the mode
A player's random draw dialog SHALL offer tools by the table's "Oyuncu kart çekişi" (spec: table-settings): none under "Kapalı", the set, cost, mechanic pack and rarity filters and the price control under "Filtreli çekiş", and also the keyword and "Destede ne var?" under "Kart seçme". The draw SHALL cost the price set, 1 LP by default, go only into the player's own hand, and pick at random among the matching drawable cards. A player's Cursed draw SHALL have no tools in any mode.

#### Scenario: A set draw after a boss
- **WHEN** the mode is "Filtreli çekiş", and Ayla, who has 2 LP, chooses the set "Kesqerian Nights" and draws
- **THEN** a card of the set Kesqer from the pool is added to her hand, and she has 1 LP

#### Scenario: No keyword under Filtreli çekiş
- **WHEN** the mode is "Filtreli çekiş", and Ayla opens her draw dialog
- **THEN** she sees the set, cost, mechanic pack and rarity filters and the price control, and no keyword and no "Destede ne var?"

#### Scenario: Picking one card
- **WHEN** the mode is "Kart seçme", and Ayla types a keyword that only "Aboleth's Eyes" in the pool matches, and draws
- **THEN** the deck shows 1, and "Aboleth's Eyes" is added to her hand for 1 LP

#### Scenario: A DM-only card stays out
- **WHEN** the mode is "Kart seçme", and Ayla types the name of "The Last Wish", whose "Kart çekmede çıkar" is off
- **THEN** the deck shows 0, and the draw control is disabled

#### Scenario: Kapalı
- **WHEN** the mode is "Kapalı", and Ayla opens her draw dialog
- **THEN** no filters, no keyword, no "Destede ne var?" and no price control are shown

#### Scenario: A Cursed draw
- **WHEN** the mode is "Kart seçme", and Ayla opens her Cursed draw dialog
- **THEN** no filters are shown

### Requirement: The dialog follows a mode change
An open draw dialog SHALL follow a change of the mode live. Filters that the new mode does not allow SHALL be cleared, and "Destede ne var?" SHALL close when it is no longer offered. On every change of the mode, the price SHALL go back to the default: the price control shows 1 LP while the mode is on, and under "Kapalı" a player's draw costs 1 LP and the DM's is free. When the server denies a draw because the mode changed meanwhile, the dialog SHALL say so in Turkish, nothing SHALL be charged, and the next draw SHALL use the new mode.

#### Scenario: The DM closes the mode
- **WHEN** Ayla has the set filter on in her open draw dialog, and the DM sets "Kapalı"
- **THEN** her filters go away, and the deck shows the whole pool

#### Scenario: From Kart seçme to Filtreli çekiş
- **WHEN** Ayla has a keyword and the rarity "Rare" on, with "Destede ne var?" open, and the DM sets "Filtreli çekiş"
- **THEN** the keyword is cleared and "Destede ne var?" closes, and the rarity "Rare" stays on

#### Scenario: The price after the mode closes
- **WHEN** Ayla set the price to 3 in her open draw dialog, and the DM sets "Kapalı"
- **THEN** the price control goes away, and the draw control reads "🎲 Çek · 1 LP"

#### Scenario: The DM's price after the mode closes
- **WHEN** the DM's open draw dialog for Bora shows the price 2, and the mode is set to "Kapalı"
- **THEN** the price control goes away, and the dialog shows "Ücretsiz"

#### Scenario: A draw that crosses the change
- **WHEN** Ayla draws with the set filter on at the same moment the DM sets "Kapalı", and the server denies her draw
- **THEN** a Turkish message says that the DM changed the player draw mode, her LP does not change, and her filters go away

#### Scenario: A price that crosses the change
- **WHEN** Ayla draws at 3 LP at the same moment the DM sets "Kapalı", and the server denies her draw
- **THEN** a Turkish message says that the DM changed the player draw mode, her LP does not change, and the next draw costs 1 LP
