# Spec Delta

## MODIFIED Requirements

### Requirement: Filters for the DM's draws
The DM's draw dialog SHALL offer filters by set, cost, mechanic pack, rarity (Common, Rare, or Blessed), and a keyword that matches as the library search does. It SHALL show how many drawable cards match, and draw only among them. A player's draw dialog SHALL have no filters, and the server SHALL deny a player's draw that records filters.

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
- **WHEN** Ayla opens her draw dialog
- **THEN** no filters are shown

## ADDED Requirements

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
A DM's draw SHALL record the chosen set's code with its other filters, or none. The server SHALL accept a set code of at most 100 characters in a draw's filters. A draw record stored before the set filter existed SHALL be read as having no set filter.

#### Scenario: Recording the set
- **WHEN** the DM draws with the set "Kesqerian Nights" chosen
- **THEN** the draw record's filters hold the set code "Kesqer"

#### Scenario: An older record
- **WHEN** the application reads a draw record whose filters have no set code
- **THEN** it reads the record without error, with no set filter

#### Scenario: A player's draw with a set
- **WHEN** a player writes a paid draw whose filters name a set
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
The DM's draw dialog SHALL offer "Destede ne var?", which shows the cards that match the filters, face up. It SHALL be closed when the dialog opens. A player's dialog and the Cursed draw SHALL NOT offer it. Looking at the matching cards SHALL NOT change which card a draw gives.

#### Scenario: Looking into the deck
- **WHEN** the DM chooses the set "Kesqerian Nights" and the rarity "Rare", and selects "Destede ne var?"
- **THEN** the dialog shows the faces of the matching drawable cards

#### Scenario: A player's dialog
- **WHEN** Ayla opens her draw dialog
- **THEN** there is no "Destede ne var?"

### Requirement: The draw table
The draw dialog SHALL show a deck with the number of cards a draw picks from on it, the draw control under the deck, and the drawn cards beside it. A player's dialog SHALL show their LP. The DM's dialog SHALL show its filters in one row above the deck, each opening its choices.

#### Scenario: The DM's deck
- **WHEN** the DM's filters match 24 drawable cards
- **THEN** the deck shows 24, and the draw control is under it

#### Scenario: A player's table
- **WHEN** Ayla, who has 2 LP, opens her draw dialog
- **THEN** it shows the deck, "2 LP", and "🎲 Çek · 1 LP"

#### Scenario: Phone width
- **WHEN** the DM's draw dialog with filters on and 3 drawn cards is shown 360 CSS pixels wide
- **THEN** the filters wrap onto more rows, an open filter's choices fit the dialog, and the page has no horizontal scrollbar

### Requirement: The deck's back
The deck and each face-down card SHALL show the back of the deck at the moment the card was drawn: the chosen set's cardback while the DM's set filter is on, the Cursed cardback in a Cursed draw, and otherwise the neutral back. A set without a cardback picture SHALL show the neutral back.

#### Scenario: A set-filtered draw
- **WHEN** the DM chooses the set "Kesqerian Nights" and draws a card
- **THEN** the deck and the face-down card show the Kesqer cardback

#### Scenario: A draw without a set filter
- **WHEN** the DM draws with only the rarity "Rare" chosen
- **THEN** the deck and the face-down card show the neutral back

#### Scenario: Changing the set between draws
- **WHEN** the DM draws one card without a set filter, then chooses "Kesqerian Nights" and draws another
- **THEN** the first face-down card shows the neutral back, and the second the Kesqer cardback
