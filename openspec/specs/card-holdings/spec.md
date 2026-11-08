# card-holdings Specification

## Purpose

Records which player holds which card, from the moment a card is given until it leaves the hand, and keeps that history permanently. It decides who may give, use, discard, transfer, activate, annotate, and re-cost held cards, and shows each player's hand on the "Oyuncu elleri" screen.

## Requirements

### Requirement: Holding records
Every time a player receives a card, the application SHALL record a holding: the card, the player, when it was given, by whom, and how ("dm" or "transfer"). A holding starts open. When the card leaves the hand, the holding SHALL be closed with when, by whom, and why ("used", "discarded" or "transferred"). Holdings SHALL never be deleted.

#### Scenario: The DM gives a card
- **WHEN** the DM gives "Aboleth's Eyes" to Ayla
- **THEN** an open holding records "Aboleth's Eyes", Ayla, the time, the DM as the giver, and "dm" as the way it was given

#### Scenario: History survives
- **WHEN** Ayla uses that card
- **THEN** the holding is still stored, closed with the time, Ayla as the one who closed it, and "used" as the reason

#### Scenario: Deleting a holding
- **WHEN** any signed-in user, including the DM, tries to delete a holding
- **THEN** the server denies it

### Requirement: Holdings readable by every signed-in user
Every signed-in user SHALL be able to read every holding, open or closed, of every player. Signed-out requests SHALL be denied.

#### Scenario: A player looks at another hand
- **WHEN** Ayla opens Bora's hand
- **THEN** she sees every card Bora holds

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user tries to read a holding
- **THEN** the server denies it

### Requirement: Normal cards leave the pool while held
A normal card SHALL be out of the pool while it has a holder, and back in the pool when its holder's holding closes. Cursed and Blessed cards SHALL never have a holder. Any number of players can hold them, any number of times.

#### Scenario: Giving a pool card
- **WHEN** the DM gives a normal card that is in the pool to Ayla
- **THEN** the card is out of the pool, and Ayla is its holder

#### Scenario: Using a normal card
- **WHEN** Ayla uses that card
- **THEN** the card is back in the pool and has no holder

#### Scenario: A Cursed card twice
- **WHEN** the DM gives the Cursed card "Visions of Death" to Ayla and then to Bora
- **THEN** both hold it, and it stays in the Cursed Deck

### Requirement: One holder at a time
The server SHALL keep a normal card's holder consistent with its holdings: a holder is set only from the pool by opening that holding, moved only by a transfer, and cleared only by closing that holding. When two devices give the same pool card at the same moment, exactly one SHALL succeed.

#### Scenario: Two devices race
- **WHEN** the DM's phone and laptop give the same pool card to two players at the same moment
- **THEN** one player holds it, and the other attempt fails with a Turkish message that the card was just taken

#### Scenario: A forged holder
- **WHEN** a signed-in user sets a card's holder without opening a matching holding
- **THEN** the server denies the write

### Requirement: The DM gives cards
The DM SHALL be able to give any active card, of any kind, to any user who has a profile, from a "+ Kart ver" dialog on the hand screen. The dialog searches the cards as the library search does and shows each card's status. Players SHALL NOT be able to give cards, not even to themselves.

#### Scenario: Searching and giving
- **WHEN** the DM opens "+ Kart ver" on Ayla's hand, searches for "aboleth", and gives "Aboleth's Eyes"
- **THEN** the card is added to the end of Ayla's hand

#### Scenario: A player tries to give a card
- **WHEN** a player creates a holding for themselves
- **THEN** the server denies it

#### Scenario: Giving to someone without a profile
- **WHEN** the DM creates a holding for a user ID that has no profile
- **THEN** the server denies it

### Requirement: DM extra copy of a held card
When the DM gives a normal card that someone already holds, the dialog SHALL name the holder and ask for confirmation. Once confirmed, the player SHALL get an extra copy: a holding of its own, which leaves the card's holder unchanged. Closing an extra copy SHALL NOT return the card to the pool.

#### Scenario: Confirming an extra copy
- **WHEN** the DM gives "Aboleth's Eyes", which Bora holds, to Ayla and confirms the extra copy
- **THEN** Ayla holds a copy, and Bora is still the card's holder

#### Scenario: Cancelling
- **WHEN** the DM gives a card that Bora holds and does not confirm
- **THEN** nothing changes

### Requirement: Using a card
A player SHALL be able to use a card in their own hand, and the DM a card in any hand. Using asks, optionally, on which character the card was used, as free text. The holding SHALL close with the reason "used" and that text. Players SHALL NOT be able to use other players' cards.

#### Scenario: A player uses their card
- **WHEN** Ayla uses "Aboleth's Eyes" on "Thorin"
- **THEN** the card leaves her hand, and its holding is closed as used on "Thorin"

#### Scenario: Using another player's card
- **WHEN** Ayla tries to close a holding in Bora's hand
- **THEN** the server denies it

### Requirement: Discarding a card
The DM SHALL be able to discard a card from any hand without it being used, after a confirmation. The holding SHALL close with the reason "discarded". Players SHALL NOT be able to discard.

#### Scenario: The DM discards
- **WHEN** the DM discards a normal card from Ayla's hand and confirms
- **THEN** the card leaves her hand, its holding is closed as discarded, and the card is back in the pool

#### Scenario: A player discards
- **WHEN** a player closes their own holding with the reason "discarded"
- **THEN** the server denies it

### Requirement: Transferring a card
The DM SHALL be able to transfer a card from one player's hand to another's, after a confirmation. The old holding SHALL close as "transferred", and a new holding SHALL open for the receiver with the way "transfer", the same note, cost override, and active state, at the end of their hand. A normal card's holder SHALL move with it. Players SHALL NOT be able to transfer.

#### Scenario: Moving a card
- **WHEN** the DM transfers "Aboleth's Eyes" from Ayla to Bora and confirms
- **THEN** it is at the end of Bora's hand with its note, Ayla's holding is closed as transferred, and Bora is the card's holder

#### Scenario: A player transfers
- **WHEN** a player tries to transfer a card
- **THEN** the server denies it

### Requirement: Active cards
The DM SHALL be able to switch any held card active or inactive. Players SHALL NOT be able to change whether a card is active. Active cards SHALL be marked in the hand.

#### Scenario: Activating a card
- **WHEN** the DM makes "Aboleth's Eyes" in Ayla's hand active
- **THEN** it is marked active in her hand on every device

#### Scenario: A player activates
- **WHEN** a player tries to switch their own card active
- **THEN** the server denies it

### Requirement: Card notes
The holder of a card and the DM SHALL be able to write a note on that held card, up to 1000 characters. Other players SHALL NOT be able to change it. A card with a note SHALL be marked in the hand.

#### Scenario: A player writes a note
- **WHEN** Ayla writes "Boss savaşında kullan" on her card and leaves the field
- **THEN** the note is saved and shown on every device

#### Scenario: Another player's note
- **WHEN** Bora tries to change the note on Ayla's card
- **THEN** the server denies it

### Requirement: Cost override
The DM SHALL be able to set a cost for one held card that replaces the card's own cost in that hand, up to 10 characters. An empty value SHALL restore the card's own cost. When both costs are numbers, the hand SHALL mark whether the new cost is lower or higher. Players SHALL NOT be able to change it.

#### Scenario: A cheaper card
- **WHEN** the DM sets the cost of Ayla's 3-cost card to "1"
- **THEN** her hand shows the cost 1, marked as lower

#### Scenario: Back to the card's cost
- **WHEN** the DM clears that cost override
- **THEN** her hand shows the card's own cost again

### Requirement: Only open holdings change
Once a holding is closed, the server SHALL deny every further change to it.

#### Scenario: Changing a closed holding
- **WHEN** the DM tries to change the note of a holding that was closed as used
- **THEN** the server denies it

### Requirement: Hand screen per player
The "Oyuncu elleri" screen SHALL show one player's hand, and each player's hand SHALL have its own URL. A player opening the screen SHALL see their own hand. The DM SHALL see the first user of the "Oyuncular" list who is not the DM, or their own hand when there is none. The screen SHALL name whose hand it shows.

#### Scenario: A player opens the screen
- **WHEN** Ayla opens "Oyuncu elleri"
- **THEN** she sees her own hand, titled with her name

#### Scenario: The DM opens the screen
- **WHEN** the DM opens "Oyuncu elleri" and the "Oyuncular" list is Ayla, Bora, and the DM
- **THEN** the DM sees Ayla's hand

#### Scenario: Reloading a hand URL
- **WHEN** a user reloads the browser on Bora's hand URL
- **THEN** Bora's hand is shown again

#### Scenario: An unknown player
- **WHEN** a user opens the hand URL of a user ID that has no profile
- **THEN** the screen says in Turkish that there is no such player

### Requirement: Hand contents
The hand SHALL list the player's open holdings in the order they were received, live on every device. It SHALL offer a card view and a list view. The list view SHALL have the columns #, Kart, Set, Cost, Rarity, Mechanic Pack, Metin, and Durum. An empty hand SHALL say so in Turkish.

#### Scenario: Order of receipt
- **WHEN** Ayla received "B" and then "A"
- **THEN** her hand shows "B" first and "A" second

#### Scenario: Live update
- **WHEN** the DM gives Ayla a card while Bora has her hand open
- **THEN** the card appears on Bora's screen without a reload

#### Scenario: Empty hand
- **WHEN** a user opens the hand of a player who holds no cards
- **THEN** the screen says in Turkish that the hand has no cards yet

### Requirement: Hand summary
Above the hand, the screen SHALL show how many cards the hand holds, how many are active, how many distinct sets they come from, and how many are Cursed. It SHALL list the active cards with their visible text, marking the Cursed ones, and the sets with their card counts.

#### Scenario: Reading the summary
- **WHEN** Ayla holds 3 Kesqer cards, 1 Havenholm card, and 1 Cursed card, and 2 of the cards are active
- **THEN** the summary shows 5 cards, 2 active, 2 sets, and 1 Cursed card, and lists the 2 active cards and both sets with their counts

### Requirement: Retired cards stay in hands
A held card that an import retires SHALL stay in its holder's hand with its last stored definition, until its holding closes.

#### Scenario: Retiring a held card
- **WHEN** an import retires a card that Ayla holds
- **THEN** the card is still in Ayla's hand, and it is no longer listed in the library
