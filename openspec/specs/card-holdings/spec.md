# card-holdings Specification

## Purpose

Records which player holds which card, from the moment a card is given until it leaves the hand, and keeps that history permanently. It decides who may give, use, discard, transfer, activate, annotate, and re-cost held cards, and shows each player's hand on the "Oyuncu elleri" screen.

## Requirements

### Requirement: Holding records
Every time a player receives a card, the application SHALL record a holding: the card, the player, when it was given, by whom, and how ("dm", "transfer", "draw" or "pack"). A holding received through a draw SHALL name its draw, and one received from a pack SHALL name its pack opening. A holding starts open. When the card leaves the hand, the holding SHALL be closed with when, by whom, and why ("used", "discarded" or "transferred"). Holdings SHALL never be deleted.

#### Scenario: The DM gives a card
- **WHEN** the DM gives "Aboleth's Eyes" to Ayla
- **THEN** an open holding records "Aboleth's Eyes", Ayla, the time, the DM as the giver, and "dm" as the way it was given

#### Scenario: A drawn card
- **WHEN** Ayla draws "Aboleth's Eyes"
- **THEN** an open holding records "Aboleth's Eyes", Ayla, the time, Ayla as the giver, "draw" as the way it was given, and the draw

#### Scenario: A card chosen from a pack
- **WHEN** the DM chooses "Aboleth's Eyes" from Ayla's open pack
- **THEN** an open holding records "Aboleth's Eyes", Ayla, the time, the DM as the giver, "pack" as the way it was given, and the pack opening

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
The DM SHALL be able to give any active card, of any kind, to any user who has a profile, from a "+ Kart ver" dialog on the hand screen. The dialog searches the cards as the library search does and shows each card's status. Players SHALL NOT be able to give cards, not even to themselves. A player's only ways to open a holding for themselves SHALL be a draw, as the card-draws rules allow, and a choice from their own open pack, as the pack-shop rules allow.

#### Scenario: Searching and giving
- **WHEN** the DM opens "+ Kart ver" on Ayla's hand, searches for "aboleth", and gives "Aboleth's Eyes"
- **THEN** the card is added to the end of Ayla's hand

#### Scenario: A player tries to give a card
- **WHEN** a player creates a holding for themselves given by "dm"
- **THEN** the server denies it

#### Scenario: A player's holding without a draw
- **WHEN** a player creates a holding for themselves given by "draw" without the draw that it names
- **THEN** the server denies it

#### Scenario: A player's holding without a pack choice
- **WHEN** a player creates a holding for themselves given by "pack" without choosing it from their open pack in the same write
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
The holder of a card and the DM SHALL be able to write a note on that held card, up to 1000 characters. Other players SHALL NOT be able to change it. The face of a held card with a note SHALL show a note icon "✎" in its bottom-left corner while the pointer rests on the face or the focus is inside it, and at all times on a device without hover. Screen readers SHALL read "Not var" on that face at all times.

#### Scenario: A player writes a note
- **WHEN** Ayla writes "Boss savaşında kullan" on her card and leaves the field
- **THEN** the note is saved and shown on every device

#### Scenario: Another player's note
- **WHEN** Bora tries to change the note on Ayla's card
- **THEN** the server denies it

#### Scenario: The note icon on hover
- **WHEN** a user rests the pointer on a card with a note in Ayla's hand
- **THEN** the "✎" icon shows in the face's bottom-left corner, and it goes away when the pointer leaves the face

#### Scenario: No mark under the face
- **WHEN** a user looks at a card with a note in Ayla's hand without resting the pointer on it
- **THEN** the face shows no note icon and no "Not var" mark, and a screen reader still reads "Not var" on it

#### Scenario: The note icon on a phone
- **WHEN** a user opens Ayla's hand on a phone, which has no hover
- **THEN** every card with a note shows the "✎" icon at all times

#### Scenario: A card without a note
- **WHEN** a user rests the pointer on a card without a note in Ayla's hand
- **THEN** no note icon shows

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
The "Oyuncu elleri" screen SHALL show one player's hand, and each player's hand SHALL have its own URL. A player opening the screen SHALL see their own hand. The DM SHALL see the first user of the "Oyuncular" list who is not the DM, or their own hand when there is none. The screen SHALL be titled "Oyuncu elleri", and the open tab's panel SHALL name whose hand it shows, for example "Ayla — Kart Eli" on the Kartlar tab.

#### Scenario: A player opens the screen
- **WHEN** Ayla opens "Oyuncu elleri"
- **THEN** she sees her own hand under the title "Oyuncu elleri", headed "Ayla — Kart Eli"

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
Above the hand, the screen SHALL show how many cards the hand holds, how many effects are active, how many distinct sets the cards come from, how many are Cursed, and how many True Words the player knows. The active effects SHALL count the active cards and the active True Words. It SHALL list the active cards with their visible text, marking the Cursed ones, then the active True Words, marked ✦, and the sets with their card counts. True Words SHALL NOT count as cards. The active effects list SHALL open from the "Aktif efekt ⓘ" stat and the sets list from the "Farklı set ⓘ" stat: while the pointer rests on the stat, while the stat has the keyboard focus, and after a tap on it until the focus leaves it. Screen readers SHALL be able to read both lists at all times. The lists SHALL NOT widen the page.

#### Scenario: Reading the summary
- **WHEN** Ayla holds 3 Kesqer cards, 1 Havenholm card, and 1 Cursed card, and 2 of the cards are active
- **THEN** the summary shows 5 cards, 2 active, 2 sets, and 1 Cursed card, and lists the 2 active cards and both sets with their counts

#### Scenario: True Words in the summary
- **WHEN** Ayla holds 5 cards, 2 of them active, and knows 3 True Words, 1 of them "Abyss", which is active
- **THEN** the summary shows 5 cards, 3 active, and 3 True Words, and lists "Abyss" marked ✦ after the 2 active cards

#### Scenario: Pointing at the active effects
- **WHEN** a user rests the mouse pointer on the "Aktif efekt ⓘ" stat of Ayla's hand
- **THEN** the list of her active effects shows, and it goes away when the pointer leaves the stat

#### Scenario: Tapping the sets on a phone
- **WHEN** a user taps the "Farklı set ⓘ" stat of Ayla's hand on a phone 360 CSS pixels wide
- **THEN** the list of her sets with their card counts shows without a horizontal scrollbar, and it goes away when the user taps elsewhere

#### Scenario: Lists closed
- **WHEN** a user opens Ayla's hand and neither stat is pointed at, focused or tapped
- **THEN** neither list shows on the screen, and a screen reader can still read both

### Requirement: Card details beside the hand
In a window at least 1024 CSS pixels wide, the Kartlar tab SHALL show a "Seçili Kart" panel at the right of the hand. Selecting a card SHALL show its details there, with the same contents and controls as the dialog on narrow windows. The panel SHALL stay in view while the page scrolls. The selected card SHALL be marked in both views. Without a selection, the panel SHALL say "Detayları görmek için elden bir kart seç."

#### Scenario: Selecting a card on a desktop
- **WHEN** Ayla selects "Aboleth's Eyes" in her hand in a window 1280 CSS pixels wide
- **THEN** its details show in the "Seçili Kart" panel at the right of the hand, no dialog opens, and the card is marked as selected

#### Scenario: Selecting another card
- **WHEN** the panel shows "Aboleth's Eyes", and Ayla selects "Night Owl"
- **THEN** the panel shows "Night Owl", and only "Night Owl" is marked as selected

#### Scenario: The list view
- **WHEN** Ayla selects "Night Owl" in the list view of her hand in a wide window
- **THEN** its row is marked as selected, and its details show in the panel

#### Scenario: No selection
- **WHEN** a user opens Ayla's hand in a wide window
- **THEN** the panel says "Detayları görmek için elden bir kart seç."

#### Scenario: The card leaves the hand
- **WHEN** the panel shows Ayla's "Night Owl", and the DM discards it on another device
- **THEN** the panel goes back to "Detayları görmek için elden bir kart seç."

#### Scenario: Scrolling a long hand
- **WHEN** Ayla scrolls down her hand of 20 cards and selects the last one
- **THEN** the panel with its details is in view without scrolling back up

### Requirement: Card details in a dialog on narrow windows
In a window narrower than 1024 CSS pixels, selecting a card SHALL open its details in a dialog, and the hand SHALL have no side panel. Crossing 1024 CSS pixels, for example by turning a tablet, SHALL clear the selection, so no dialog opens by itself.

#### Scenario: Selecting a card on a phone
- **WHEN** Ayla selects "Aboleth's Eyes" in her hand on a phone
- **THEN** its details open in a dialog

#### Scenario: Turning a tablet
- **WHEN** a card's details show in the panel on a tablet 1100 CSS pixels wide, and the tablet is turned to 800 CSS pixels wide
- **THEN** no dialog opens, and no card is selected

### Requirement: Retired cards stay in hands
A held card that the DM retires SHALL stay in its holder's hand with its last stored definition, until its holding closes. Every signed-in user SHALL still see it in that hand. A retired card SHALL NOT be given, drawn or chosen from a pack. When its holding closes, a retired normal card SHALL NOT return to the pool.

#### Scenario: Retiring a held card
- **WHEN** the DM retires a card that Ayla holds
- **THEN** the card is still in Ayla's hand on every device, and it is no longer listed in the library

#### Scenario: Using a retired card
- **WHEN** Ayla uses the retired normal card "Aboleth's Eyes"
- **THEN** it leaves her hand, and it is not in the pool

#### Scenario: Giving a retired card
- **WHEN** the DM tries to give the retired card "Aboleth's Eyes"
- **THEN** the "+ Kart ver" dialog does not offer it, and the server denies such a write
