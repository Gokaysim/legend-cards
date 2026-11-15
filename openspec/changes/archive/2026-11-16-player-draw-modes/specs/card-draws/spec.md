# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: The deck's back
The deck and each face-down card SHALL show the back of the deck at the moment the card was drawn: the chosen set's cardback while a set filter is on, the DM's or a player's, the Cursed cardback in a Cursed draw, and otherwise the neutral back. A set without a cardback picture SHALL show the neutral back.

#### Scenario: A set-filtered draw
- **WHEN** the DM chooses the set "Kesqerian Nights" and draws a card
- **THEN** the deck and the face-down card show the Kesqer cardback

#### Scenario: A draw without a set filter
- **WHEN** the DM draws with only the rarity "Rare" chosen
- **THEN** the deck and the face-down card show the neutral back

#### Scenario: Changing the set between draws
- **WHEN** the DM draws one card without a set filter, then chooses "Kesqerian Nights" and draws another
- **THEN** the first face-down card shows the neutral back, and the second the Kesqer cardback

#### Scenario: A player's set draw
- **WHEN** the mode is "Filtreli çekiş", and Ayla chooses the set "Kesqerian Nights" and draws
- **THEN** the deck and the face-down card show the Kesqer cardback, on her screen and on every watching screen
