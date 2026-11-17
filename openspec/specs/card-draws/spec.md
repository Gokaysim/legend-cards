# card-draws Specification

## Purpose

Draws cards into a player's hand: a random draw from the pool that a player pays 1 LP for, the DM's free and filtered draws, and draws from the Cursed Deck. Every draw is kept as a permanent record that agrees with its holding and its payment.

## Requirements

### Requirement: Draw buttons on the hand screen
A hand SHALL show "🎲 Kart Çek" and "☠ Cursed Kart Çek" to that hand's owner and to the DM. Other players SHALL see neither button on that hand.

#### Scenario: A player's own hand
- **WHEN** Ayla opens her own hand
- **THEN** she sees "🎲 Kart Çek" and "☠ Cursed Kart Çek"

#### Scenario: Another player's hand
- **WHEN** Ayla opens Bora's hand
- **THEN** neither draw button is shown

#### Scenario: The DM
- **WHEN** the DM opens Bora's hand
- **THEN** the DM sees both draw buttons

### Requirement: A player draws for 1 LP
A player SHALL be able to draw a random card into their own hand for 1 LP. The card SHALL go to the end of the hand, and the player's LP SHALL drop by 1, in the same step.

#### Scenario: Drawing a card
- **WHEN** Ayla, who has 3 LP, selects "🎲 Kart Çek" in her draw dialog
- **THEN** one card is added to the end of her hand, and she has 2 LP on every device

### Requirement: Players draw only for themselves
The server SHALL deny a player's draw into any hand other than their own.

#### Scenario: Drawing into another hand
- **WHEN** Ayla tries to draw a card into Bora's hand
- **THEN** the server denies it, and nothing changes

### Requirement: A draw needs enough LP
A player with no LP SHALL NOT be able to draw a random card. The draw control SHALL then be disabled, with a Turkish note that 1 LP is needed. The server SHALL deny a paid draw that would bring LP below 0.

#### Scenario: No LP left
- **WHEN** Ayla has 0 LP and opens her draw dialog
- **THEN** the draw control is disabled, and a Turkish note says that a draw costs 1 LP

#### Scenario: A forged draw without LP
- **WHEN** a player with 0 LP writes a paid draw
- **THEN** the server denies it

### Requirement: Equal chance from the pool
A random draw SHALL pick one card, each with the same chance, from the drawable cards: the active normal and Blessed cards whose "Kart çekmede çıkar" is on and that no one holds as their one copy. Held cards with one copy, Cursed cards, True Words, retired cards and cards whose "Kart çekmede çıkar" is off SHALL never be drawn. The server SHALL deny a random draw of any of them.

#### Scenario: A Blessed card can come up
- **WHEN** the pool holds 572 normal cards without a holder and 19 Blessed cards, and Ayla draws
- **THEN** each of the 591 cards has the same chance, including each Blessed card

#### Scenario: A held card
- **WHEN** Bora holds "Aboleth's Eyes", which has one copy
- **THEN** no random draw gives "Aboleth's Eyes"

#### Scenario: A forged draw of a held card
- **WHEN** a player writes a random draw of a card with one copy that Bora holds
- **THEN** the server denies it

#### Scenario: A forged random draw of a Cursed card
- **WHEN** a player writes a random draw of a Cursed card
- **THEN** the server denies it

#### Scenario: A DM-only card
- **WHEN** "The Last Wish" is an active normal card that no one holds, with "Kart çekmede çıkar" off
- **THEN** no random draw gives it, also not the DM's

#### Scenario: A forged draw of a DM-only card
- **WHEN** a player writes a random draw of "The Last Wish", whose "Kart çekmede çıkar" is off
- **THEN** the server denies it

#### Scenario: A repeatable card in a hand
- **WHEN** "Aboleth's Eyes" has "Birden fazla elde olabilir" on, and Bora holds it
- **THEN** a random draw can still give it

### Requirement: The DM draws for free
The DM SHALL be able to draw a random card into any hand of a user who has a profile, without charging any LP.

#### Scenario: Drawing for a player
- **WHEN** the DM draws a card into Ayla's hand while she has 0 LP
- **THEN** the card is added to the end of her hand, and her LP stays 0

### Requirement: Filters for the DM's draws
The DM's draw dialog SHALL offer filters by set, cost, mechanic pack, rarity (Common, Rare, or Blessed), and a keyword that matches as the library search does. It SHALL show how many drawable cards match, and draw only among them. A player's draw dialog SHALL have filters only as the table's mode allows (spec: "A player's draw tools follow the mode"), and the server SHALL deny a player's draw that records filters the mode does not allow.

#### Scenario: Drawing a Rare card
- **WHEN** the DM chooses the rarity "Rare" and draws
- **THEN** the drawn card is a Rare card from the pool

#### Scenario: Drawing from one set
- **WHEN** the DM chooses the set "Kesqerian Nights" and the rarity "Rare", and draws
- **THEN** the drawn card is a Rare card of the set Kesqer from the pool

#### Scenario: Nothing matches
- **WHEN** the DM's filters match no drawable card
- **THEN** the dialog shows 0 matching cards in Turkish, and the draw control is disabled

#### Scenario: A player's dialog
- **WHEN** the mode is "Kapalı", and Ayla opens her draw dialog
- **THEN** no filters are shown

#### Scenario: The DM's dialog does not depend on the mode
- **WHEN** the mode is "Kapalı", and the DM opens a draw dialog
- **THEN** the DM's filters, keyword and "Destede ne var?" are offered as before

### Requirement: Cursed draw
The hand's owner and the DM SHALL be able to draw a random card from the Cursed Deck into that hand, free of charge. The Cursed Deck SHALL be the active Cursed cards whose "Cursed Deck'te çıkar" is on and that no one holds as their one copy, each with the same chance. Any other Cursed card SHALL never be drawn, and the server SHALL deny a Cursed draw of one. A player SHALL NOT make a Cursed draw into another player's hand.

#### Scenario: A player draws a Cursed card
- **WHEN** Ayla, who has 2 LP, selects "☠ Cursed Kart Çek" in her Cursed draw dialog
- **THEN** a Cursed card is added to the end of her hand, and she still has 2 LP

#### Scenario: Two Cursed cards
- **WHEN** Ayla draws a Cursed card twice in the same dialog
- **THEN** both Cursed cards are in her hand

#### Scenario: Into another hand
- **WHEN** Ayla tries to make a Cursed draw into Bora's hand
- **THEN** the server denies it

#### Scenario: An empty Cursed Deck
- **WHEN** the Cursed Deck has no active cards
- **THEN** the "☠ Cursed Kart Çek" button is disabled

#### Scenario: Only DM-only Cursed cards left
- **WHEN** every active Cursed card has "Cursed Deck'te çıkar" off
- **THEN** the "☠ Cursed Kart Çek" button is disabled

#### Scenario: A forged Cursed draw of a DM-only card
- **WHEN** Ayla writes a Cursed draw of "Visions of Death", whose "Cursed Deck'te çıkar" is off
- **THEN** the server denies it

#### Scenario: A Cursed card with one copy
- **WHEN** Bora holds "Where They Breed", whose "Birden fazla elde olabilir" is off
- **THEN** no Cursed draw gives it, and the server denies one

### Requirement: A draw is complete at once
Each draw SHALL add its card to the hand and charge its payment in one step, before the card is revealed. Closing the draw dialog SHALL never undo a draw.

#### Scenario: Closing without flipping
- **WHEN** Ayla draws a card and closes the dialog without flipping it
- **THEN** the card is in her hand, and her LP has dropped by 1

### Requirement: Drawing again
The draw dialog SHALL stay open after a draw and offer another draw. It SHALL show every card drawn in it, face down, in the order drawn.

#### Scenario: Three draws in a row
- **WHEN** Ayla, who has 5 LP, draws three times in one dialog
- **THEN** the dialog shows three face-down cards, her hand has three new cards, and she has 2 LP

### Requirement: Flipping a drawn card
Selecting a face-down card in the draw dialog SHALL reveal it, showing its name, kind, set, rarity, cost, and visible text. Only the hand's owner and the DM SHALL turn a drawn card. A revealed card SHALL stay revealed for good, and SHALL turn over on every device that shows its draw (spec: live-draws, "Cards turn over on every device").

#### Scenario: Revealing a card
- **WHEN** Ayla selects the face-down card she just drew
- **THEN** it turns over and shows its name and its visible text

#### Scenario: Revealed on the other screens
- **WHEN** Ayla turns over the card she just drew while Bora watches her draw
- **THEN** it turns over on Bora's screen too

### Requirement: Draw records
Each draw SHALL be stored permanently with its kind (random or Cursed), who drew, whose hand it went to, when, the card and its kind, the holding it opened, the payment (1 LP or none), the filters of whoever drew, if any, and its draw session (spec: live-draws). Random and Cursed draws SHALL never be changed or deleted. Pack openings are kept with the draws but follow the pack-shop rules: they change while the pack is open. Every signed-in user SHALL be able to read every draw. A draw record stored before draw sessions existed SHALL be read as having no session.

#### Scenario: Recording a paid draw
- **WHEN** Ayla draws "Aboleth's Eyes" for 1 LP
- **THEN** a draw record names Ayla as the drawer and the hand's owner, the time, "Aboleth's Eyes", the new holding, a payment of 1 LP, and the session of her draw dialog

#### Scenario: Recording a player's filters
- **WHEN** the mode is "Filtreli çekiş", and Ayla draws with the set "Kesqerian Nights" chosen
- **THEN** her draw record holds the set code "Kesqer" in its filters, with a payment of 1 LP

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

### Requirement: A taken card is replaced
When another device takes the picked pool card before a draw is saved, the application SHALL pick another drawable card and save the draw with it. The player SHALL be charged only once.

#### Scenario: Two devices at once
- **WHEN** Ayla draws while the DM gives the card her draw picked to Bora at the same moment
- **THEN** Bora holds that card, Ayla gets another card, and her LP drops by 1, not 2

### Requirement: Nothing to draw
When no card can be drawn, the draw dialog SHALL say so in Turkish, and no draw SHALL be made or charged.

#### Scenario: An empty pool
- **WHEN** every normal card is held, no Blessed card is active, and Ayla opens her draw dialog
- **THEN** the dialog says in Turkish that there is no card to draw, and the draw control is disabled

### Requirement: Draws need a connection
Drawing SHALL require a network connection. Offline, the draw dialog SHALL show a Turkish message, and nothing SHALL change.

#### Scenario: Offline draw
- **WHEN** Ayla tries to draw while her device is offline
- **THEN** a Turkish message says that a connection is needed, and neither her hand nor her LP changes

### Requirement: The set filter's choices
The set filter SHALL list each set that has a drawable card: first the stored sets, in the stored order, by their official names, then set codes that no stored set has, as written. It SHALL NOT list "Blessed", which the rarity filter offers. A set filter SHALL keep Blessed cards out of the draw.

#### Scenario: The order of the sets
- **WHEN** the stored order starts with Kesqer, then Havenholm, and both have drawable cards
- **THEN** the set filter lists "Kesqerian Nights" before "Havenholm"

#### Scenario: No Blessed choice
- **WHEN** the DM opens the set filter while Blessed cards are in the pool
- **THEN** "Blessed" is not among the sets

#### Scenario: A set without drawable cards
- **WHEN** every card of the set Ulagal is held
- **THEN** the set filter does not list "Ballad of Ulagal"

### Requirement: A draw records its set filter
A draw with filters, the DM's or a player's, SHALL record the chosen set's code with its other filters, or none. The server SHALL accept a set code of at most 100 characters in a draw's filters. A draw record stored before the set filter existed SHALL be read as having no set filter.

#### Scenario: Recording the set
- **WHEN** the DM draws with the set "Kesqerian Nights" chosen
- **THEN** the draw record's filters hold the set code "Kesqer"

#### Scenario: An older record
- **WHEN** the application reads a draw record whose filters have no set code
- **THEN** it reads the record without error, with no set filter

#### Scenario: A player's draw with a set
- **WHEN** the mode is "Kapalı", and a player writes a paid draw whose filters name a set
- **THEN** the server denies it

### Requirement: Filter choices show what remains
Each choice of the DM's set, cost, mechanic pack and rarity filters SHALL show how many drawable cards match it together with the other filters that are on. A chosen value SHALL stay listed when its count is 0.

#### Scenario: Counts under a set
- **WHEN** the DM chooses the set "Kesqerian Nights", and 24 of its drawable cards are Rare
- **THEN** the rarity choice "Rare" shows 24

#### Scenario: A chosen value that no longer matches
- **WHEN** the DM chose the cost "5", then chooses a mechanic pack with no drawable card of cost 5
- **THEN** the cost filter still shows "5" as chosen, with 0, and the dialog shows 0 matching cards

### Requirement: Clearing the filters
The DM's draw dialog SHALL show which filters are on. Each one SHALL be removable on its own, and "Temizle" SHALL remove them all. Closing the dialog SHALL drop the filters, so the next draw dialog starts without any.

#### Scenario: Clearing all filters
- **WHEN** the DM has the set and the rarity filters on and selects "Temizle"
- **THEN** no filter is on, and the count shows the whole pool

#### Scenario: Opening the dialog again
- **WHEN** the DM closes a draw dialog with the rarity "Rare" on and opens a draw dialog again
- **THEN** no filter is on

### Requirement: The DM sees the matching cards
The DM's draw dialog SHALL offer "Destede ne var?", which shows the cards that match the filters, face up. It SHALL be closed when the dialog opens. A player's dialog SHALL offer it only under "Kart seçme". The Cursed draw SHALL NOT offer it. Looking at the matching cards SHALL NOT change which card a draw gives.

#### Scenario: Looking into the deck
- **WHEN** the DM chooses the set "Kesqerian Nights" and the rarity "Rare", and selects "Destede ne var?"
- **THEN** the dialog shows the faces of the matching drawable cards

#### Scenario: A player's dialog
- **WHEN** the mode is "Filtreli çekiş", and Ayla opens her draw dialog
- **THEN** there is no "Destede ne var?"

#### Scenario: A player looks into the deck
- **WHEN** the mode is "Kart seçme", and Ayla chooses the set "Kesqerian Nights" and selects "Destede ne var?"
- **THEN** her dialog shows the faces of the drawable Kesqer cards

### Requirement: The draw table
The draw dialog SHALL show a deck with the number of cards a draw picks from on it, the draw control under the deck, and the drawn cards beside it. Above the table, chips SHALL name the kind of draw, whose hand the cards go to, and the price; a player's dialog SHALL also show their LP, and the mode while it is not "Kapalı". A dialog with filters SHALL show them in one row above the deck, each opening its choices. Under the table, a line with the live mark SHALL say in Turkish that everyone sees the draw live and that a turned card turns over for them too.

#### Scenario: The DM's deck
- **WHEN** the DM's filters match 24 drawable cards
- **THEN** the deck shows 24, and the draw control is under it

#### Scenario: A player's table
- **WHEN** the mode is "Kapalı", and Ayla, who has 2 LP, opens her draw dialog
- **THEN** it shows the deck, "2 LP", "Her kart 1 LP", and "🎲 Çek · 1 LP"

#### Scenario: The live line
- **WHEN** Ayla opens her draw dialog
- **THEN** a line under the table says in Turkish that everyone sees her draw live, with the cards she turns

#### Scenario: Phone width
- **WHEN** the DM's draw dialog with filters on and 3 drawn cards is shown 360 CSS pixels wide
- **THEN** the filters wrap onto more rows, an open filter's choices fit the dialog, and the page has no horizontal scrollbar

#### Scenario: A player's filters at phone width
- **WHEN** the mode is "Kart seçme", and Ayla's draw dialog with filters on is shown 360 CSS pixels wide
- **THEN** the filters wrap onto more rows, and the page has no horizontal scrollbar

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

### Requirement: A player's draw tools follow the mode
A player's random draw dialog SHALL offer tools by the table's "Oyuncu kart çekişi" (spec: table-settings): none under "Kapalı", the set, cost, mechanic pack and rarity filters under "Filtreli çekiş", and also the keyword and "Destede ne var?" under "Kart seçme". The draw SHALL still cost 1 LP, go only into the player's own hand, and pick at random among the matching drawable cards. A player's Cursed draw SHALL have no tools in any mode.

#### Scenario: A set draw after a boss
- **WHEN** the mode is "Filtreli çekiş", and Ayla, who has 2 LP, chooses the set "Kesqerian Nights" and draws
- **THEN** a card of the set Kesqer from the pool is added to her hand, and she has 1 LP

#### Scenario: No keyword under Filtreli çekiş
- **WHEN** the mode is "Filtreli çekiş", and Ayla opens her draw dialog
- **THEN** she sees the set, cost, mechanic pack and rarity filters, and no keyword and no "Destede ne var?"

#### Scenario: Picking one card
- **WHEN** the mode is "Kart seçme", and Ayla types a keyword that only "Aboleth's Eyes" in the pool matches, and draws
- **THEN** the deck shows 1, and "Aboleth's Eyes" is added to her hand for 1 LP

#### Scenario: A DM-only card stays out
- **WHEN** the mode is "Kart seçme", and Ayla types the name of "The Last Wish", whose "Kart çekmede çıkar" is off
- **THEN** the deck shows 0, and the draw control is disabled

#### Scenario: Kapalı
- **WHEN** the mode is "Kapalı", and Ayla opens her draw dialog
- **THEN** no filters, no keyword and no "Destede ne var?" are shown

#### Scenario: A Cursed draw
- **WHEN** the mode is "Kart seçme", and Ayla opens her Cursed draw dialog
- **THEN** no filters are shown

### Requirement: The server checks a player's filters against the mode
The server SHALL accept a player's paid random draw with filters only while the stored mode allows each recorded filter: none under "Kapalı", the set, cost, mechanic pack and rarity under "Filtreli çekiş", and also the keyword under "Kart seçme". It SHALL deny any other.

#### Scenario: Filters under Kapalı
- **WHEN** the mode is "Kapalı", and a player writes a paid draw whose filters name a set
- **THEN** the server denies it

#### Scenario: A keyword under Filtreli çekiş
- **WHEN** the mode is "Filtreli çekiş", and a player writes a paid draw whose filters hold a keyword
- **THEN** the server denies it

#### Scenario: A set under Filtreli çekiş
- **WHEN** the mode is "Filtreli çekiş", and a player writes a paid draw whose filters name a set and a rarity
- **THEN** the server accepts it

#### Scenario: A keyword under Kart seçme
- **WHEN** the mode is "Kart seçme", and a player writes a paid draw whose filters hold a keyword
- **THEN** the server accepts it

### Requirement: A player's filters work as the DM's
A player's filters SHALL behave as the DM's do: each choice shows how many drawable cards match it (spec: "Filter choices show what remains"), the set filter lists the sets as the DM's does (spec: "The set filter's choices"), the filters on are shown and can be removed one by one or with "Temizle", and closing the dialog drops them (spec: "Clearing the filters").

#### Scenario: Counts for a player
- **WHEN** the mode is "Filtreli çekiş", Ayla chooses the set "Kesqerian Nights", and 24 of its drawable cards are Rare
- **THEN** her rarity choice "Rare" shows 24

#### Scenario: Clearing a player's filters
- **WHEN** Ayla has the set and the rarity filters on and selects "Temizle"
- **THEN** no filter is on, and the deck shows the whole pool

### Requirement: The dialog follows a mode change
An open player draw dialog SHALL follow a change of the mode live. Filters that the new mode does not allow SHALL be cleared, and "Destede ne var?" SHALL close when it is no longer offered. When the server denies a draw because the mode changed meanwhile, the dialog SHALL say so in Turkish, nothing SHALL be charged, and the next draw SHALL use the new mode.

#### Scenario: The DM closes the mode
- **WHEN** Ayla has the set filter on in her open draw dialog, and the DM sets "Kapalı"
- **THEN** her filters go away, and the deck shows the whole pool

#### Scenario: From Kart seçme to Filtreli çekiş
- **WHEN** Ayla has a keyword and the rarity "Rare" on, with "Destede ne var?" open, and the DM sets "Filtreli çekiş"
- **THEN** the keyword is cleared and "Destede ne var?" closes, and the rarity "Rare" stays on

#### Scenario: A draw that crosses the change
- **WHEN** Ayla draws with the set filter on at the same moment the DM sets "Kapalı", and the server denies her draw
- **THEN** a Turkish message says that the DM changed the player draw mode, her LP does not change, and her filters go away

### Requirement: The mode in a player's dialog
A player's random draw dialog SHALL show the mode as a chip above the table while it is not "Kapalı".

#### Scenario: The chip
- **WHEN** the mode is "Kart seçme", and Ayla opens her draw dialog
- **THEN** a chip above the table names "Kart seçme"
