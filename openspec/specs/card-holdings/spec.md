# card-holdings Specification

## Purpose

Records which player holds which card, from the moment a card is given until it leaves the hand, and keeps that history permanently. It decides who may give, use, discard, transfer, activate, annotate, and re-cost held cards, and shows each player's hand on the "Oyuncu elleri" screen.

## Requirements

### Requirement: Holding records
Every time a player receives a card, the application SHALL record a holding: the card, the player, when it was given, by whom, and how ("dm", "transfer", "draw" or "pack"). A holding received through a draw SHALL name its draw, and one received from a pack SHALL name its pack opening. A holding starts open. When the card leaves the hand, the holding SHALL be closed with when, by whom, and why ("used", "discarded" or "transferred"). A holding closed as used SHALL also record the LP paid for the use, and the ledger entry of that payment when it is more than 0. Holdings SHALL never be deleted.

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

#### Scenario: A paid use is recorded
- **WHEN** Ayla uses her 2-cost "Aboleth's Eyes"
- **THEN** its closed holding records 2 LP as paid, and the ledger entry of that payment

#### Scenario: A free use is recorded
- **WHEN** Ayla uses a card that costs "0"
- **THEN** its closed holding records 0 LP as paid, and no ledger entry

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
A normal card SHALL be out of the pool while it has a holder, and back in the pool when its holder's holding closes, unless it is DM-only: a DM-only card is never in the pool, and its holder is only cleared. Cursed and Blessed cards SHALL never have a holder. Any number of players can hold them, any number of times.

#### Scenario: Giving a pool card
- **WHEN** the DM gives a normal card that is in the pool to Ayla
- **THEN** the card is out of the pool, and Ayla is its holder

#### Scenario: Using a normal card
- **WHEN** Ayla uses that card
- **THEN** the card is back in the pool and has no holder

#### Scenario: A Cursed card twice
- **WHEN** the DM gives the Cursed card "Visions of Death" to Ayla and then to Bora
- **THEN** both hold it, and it stays in the Cursed Deck

#### Scenario: Using a DM-only card
- **WHEN** Ayla uses the DM-only normal card "The Last Wish"
- **THEN** it has no holder, is not in the pool, and the DM can give it again

#### Scenario: The flag is turned off
- **WHEN** the DM turns off the DM-only flag of "The Last Wish" while no one holds it
- **THEN** the card is in the pool

### Requirement: One holder at a time
The server SHALL keep a normal card's holder consistent with its holdings: a holder is set only from the pool by opening that holding, moved only by a transfer, and cleared only by closing that holding. When two devices give the same pool card at the same moment, exactly one SHALL succeed.

#### Scenario: Two devices race
- **WHEN** the DM's phone and laptop give the same pool card to two players at the same moment
- **THEN** one player holds it, and the other attempt fails with a Turkish message that the card was just taken

#### Scenario: A forged holder
- **WHEN** a signed-in user sets a card's holder without opening a matching holding
- **THEN** the server denies the write

### Requirement: The DM gives cards
The DM SHALL be able to give any active card, of any kind, to any user who has a profile, from a "+ Kart ver" dialog on the hand screen. The dialog searches the cards as the library search does, filters them, and shows each card's status. Players SHALL NOT be able to give cards, not even to themselves. A player's only ways to open a holding for themselves SHALL be a draw, as the card-draws rules allow, and a choice from their own open pack, as the pack-shop rules allow.

#### Scenario: Searching and giving
- **WHEN** the DM opens "+ Kart ver" on Ayla's hand, searches for "aboleth", selects "Aboleth's Eyes" and gives it
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
A player SHALL be able to use a card in their own hand, and the DM a card in any hand. Using asks, optionally, on which character the card was used: one of the table's characters, or a name typed for one that has none. The use SHALL pay its amount from the holder's LP, in the same step that closes the holding with the reason "used" and that character. Players SHALL NOT be able to use other players' cards.

#### Scenario: A player uses their card
- **WHEN** Ayla, who has 5 LP, uses her 2-cost "Aboleth's Eyes" on her character "Thorin"
- **THEN** the card leaves her hand, its holding is closed as used on "Thorin", and she has 3 LP on every device

#### Scenario: Using another player's card
- **WHEN** Ayla tries to close a holding in Bora's hand
- **THEN** the server denies it

#### Scenario: A use without its payment
- **WHEN** a signed-in user closes Ayla's 2-cost card as used without lowering her LP in the same write
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
Above the hand, the screen SHALL show how many cards the hand holds, how many effects are active, how many distinct sets the cards come from, how many are Cursed, and how many True Words the player knows. The active effects SHALL count the active cards, the active True Words, and the stored effects on the player's active characters. It SHALL list the active cards with their visible text, marking the Cursed ones, then the active True Words, marked ✦, then each active character's stored effects under its name, and the sets with their card counts. True Words SHALL NOT count as cards. The active effects list SHALL open from the "Aktif efekt ⓘ" stat and the sets list from the "Farklı set ⓘ" stat: while the pointer rests on the stat, while the stat has the keyboard focus, and after a tap on it until the focus leaves it. Screen readers SHALL be able to read both lists at all times. The lists SHALL NOT widen the page.

#### Scenario: Reading the summary
- **WHEN** Ayla holds 3 Kesqer cards, 1 Havenholm card, and 1 Cursed card, and 2 of the cards are active
- **THEN** the summary shows 5 cards, 2 active, 2 sets, and 1 Cursed card, and lists the 2 active cards and both sets with their counts

#### Scenario: True Words in the summary
- **WHEN** Ayla holds 5 cards, 2 of them active, and knows 3 True Words, 1 of them "Abyss", which is active
- **THEN** the summary shows 5 cards, 3 active, and 3 True Words, and lists "Abyss" marked ✦ after the 2 active cards

#### Scenario: Character effects in the summary
- **WHEN** Ayla holds 1 active card, "Thorin" has 2 stored effects, and her archived "Kuzgun" has 1
- **THEN** the summary shows 3 active, and lists the active card, then "Thorin" with its 2 effects

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
In a window at least 1024 CSS pixels wide, the Kartlar tab SHALL show a panel labelled "Seçili Kart" at the right of the hand. Selecting a card SHALL show its details there, with the same contents and controls as the dialog on narrow windows. The panel SHALL stay in view while the page scrolls. The selected card SHALL be marked in both views. Without a selection, the panel SHALL show an empty card slot with "Bir kart seç" and "Elden bir karta tıkla, ayrıntıları burada görünsün."

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
- **THEN** the panel shows an empty card slot with "Bir kart seç" and "Elden bir karta tıkla, ayrıntıları burada görünsün."

#### Scenario: The card leaves the hand
- **WHEN** the panel shows Ayla's "Night Owl", and the DM discards it on another device
- **THEN** the panel goes back to the empty card slot with "Bir kart seç"

#### Scenario: Scrolling a long hand
- **WHEN** Ayla scrolls down her hand of 20 cards and selects the last one
- **THEN** the panel with its details is in view without scrolling back up

### Requirement: Card details in a dialog on narrow windows
In a window narrower than 1024 CSS pixels, selecting a card SHALL open its details in a dialog, and the hand SHALL have no side panel. The dialog SHALL be titled with the card's name and hold the same details as the panel. From 640 CSS pixels, the face SHALL stand at the left of the rest. Crossing 1024 CSS pixels, for example by turning a tablet, SHALL clear the selection, so no dialog opens by itself.

#### Scenario: Selecting a card on a phone
- **WHEN** Ayla selects "Aboleth's Eyes" in her hand on a phone
- **THEN** its details open in a dialog titled "Aboleth's Eyes", with the face above the labels, the note and "Kullan"

#### Scenario: Selecting a card on a tablet
- **WHEN** Ayla selects "Aboleth's Eyes" in her hand on a tablet 800 CSS pixels wide
- **THEN** its details open in a dialog with the face at the left of the labels, the note and "Kullan"

#### Scenario: Turning a tablet
- **WHEN** a card's details show in the panel on a tablet 1100 CSS pixels wide, and the tablet is turned to 800 CSS pixels wide
- **THEN** no dialog opens, and no card is selected

### Requirement: The card's face and labels in the details
The card details SHALL show the card's face large, glowing as a revealed card of its kind does, or with its active glow while active, with the card's marks "Aktif" and "Ek kopya" as badges at the top. Under the face, labels SHALL give the set, the rarity, the cost and the mechanic pack: a Cursed card only "Cursed" and its cost, a Blessed card "Blessed", its cost and its mechanic pack. Under a picture, the card's name and text SHALL NOT be written again.

#### Scenario: A Rare card
- **WHEN** Ayla selects her inactive "Aa-Uskh's Resuscitation", a Rare Kesqerian Nights card of Risk & Reward that costs 1, in a window 1280 CSS pixels wide
- **THEN** the panel shows its picture across the panel's width, glowing orange, with the labels "Kesqerian Nights", "Rare", "Cost 1" and "Risk & Reward" under it, and no line that repeats its name or text

#### Scenario: An active extra copy
- **WHEN** the DM selects an active extra copy in Ayla's hand
- **THEN** the details show the badges "Aktif" and "Ek kopya" at the top, and the face glows green

#### Scenario: A Cursed card
- **WHEN** Ayla selects the Cursed card "Abandon All Hope", which costs 1
- **THEN** the labels under its face are "Cursed" and "Cost 1"

#### Scenario: A changed cost
- **WHEN** the DM has set the cost of Ayla's 3-cost card to "1", and Ayla selects it
- **THEN** its cost label reads "Cost 1 (temel: 3)"

#### Scenario: A card without a picture
- **WHEN** Ayla selects a card where no pictures are built
- **THEN** the details show the card's face without pictures, with its name and text, and the labels under it

#### Scenario: Screen readers
- **WHEN** a screen reader reaches the details of "Aa-Uskh's Resuscitation"
- **THEN** it hears the card's name as the details' heading, and the card's text

### Requirement: The holder and the note in the details
The card details SHALL say who holds the card, as "<name>'in elinde" with the Turkish suffix that fits the name. The card note SHALL show on cream note paper labelled "Kart notu". The holder and the DM SHALL edit it there. Any other user SHALL read it, or "Not yok." when it is empty.

#### Scenario: The holder writes a note
- **WHEN** Ayla opens the details of a card in her hand
- **THEN** the details say "Ayla'nın elinde", and she can type the card's note on the note paper

#### Scenario: Another player reads the note
- **WHEN** Bora opens the details of Ayla's card that has the note "Boss savaşında kullan"
- **THEN** the note paper shows "Boss savaşında kullan" as text, without a field

#### Scenario: No note
- **WHEN** Bora opens the details of Ayla's card that has no note
- **THEN** the note paper says "Not yok."

### Requirement: Actions in the card details
In the card details, "Kullan" SHALL be the main action, across the details' width. The DM's own controls SHALL be in a separate section headed "DM araçları":
- the cost in this hand, with the card's own cost as "temel: <cost>"
- "Aktif et" or "Aktifliği kaldır", "Başkasına ver" and "At", as three equal buttons

Each confirmation step SHALL open in place of the buttons. A control the user may not use SHALL NOT show.

#### Scenario: The holder
- **WHEN** Ayla opens the details of a card in her hand
- **THEN** she sees "Kullan" across the details, and no "DM araçları" section

#### Scenario: The DM
- **WHEN** the DM opens the details of a card in Ayla's hand
- **THEN** the DM sees "Kullan", and under "DM araçları" the cost field with "temel: 1", "Aktif et", "Başkasına ver" and "At"

#### Scenario: Another player
- **WHEN** Bora opens the details of a card in Ayla's hand
- **THEN** he sees neither "Kullan" nor the "DM araçları" section

#### Scenario: A confirmation step
- **WHEN** the DM selects "At" in the details
- **THEN** the question whether to discard the card opens in place of the buttons, with "Evet, at" and "Vazgeç"

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

### Requirement: DM-only cards reach hands only from the DM
A DM-only card SHALL come into a hand only by the DM's give or by a transfer. Once given, it SHALL show in the hand, its details and the log's give event to every signed-in user, as any held card does. A DM-only normal card SHALL still have one holder at a time.

#### Scenario: Giving a DM-only card
- **WHEN** the DM opens "+ Kart ver" on Ayla's hand, searches for "last wish", and gives the DM-only card "The Last Wish"
- **THEN** the card is added to the end of Ayla's hand, and Bora sees it there

#### Scenario: A player's hand
- **WHEN** Ayla holds "The Last Wish" and opens it from her hand
- **THEN** she sees its face, text and details as for any held card

### Requirement: The price of a use
A use's price SHALL follow the card's cost in this hand: the DM's cost override when set, otherwise the card's own cost. A whole number SHALL cost exactly that many LP. No cost SHALL cost nothing. "d6" SHALL cost the die rolled at the table, which the user enters as a whole number from 1 to 6. Any other cost, such as "X", SHALL cost the whole number of LP the user enters, from 0 up. Cursed cards SHALL pay as other cards do.

#### Scenario: A whole number
- **WHEN** Ayla uses a card that costs "2"
- **THEN** the price is 2 LP

#### Scenario: A cost override
- **WHEN** the DM has set the cost of Ayla's 3-cost card to "1", and Ayla uses it
- **THEN** the price is 1 LP

#### Scenario: A Blessed card
- **WHEN** Ayla uses a Blessed card, which has no cost
- **THEN** the card is used without a payment, and her LP does not change

#### Scenario: A d6 card
- **WHEN** Ayla uses "Hran's Diligent Defence", which costs "d6", and enters 4
- **THEN** she pays 4 LP

#### Scenario: A die out of range
- **WHEN** Ayla enters 0 or 7 for a "d6" card
- **THEN** she cannot confirm the use

#### Scenario: An X card
- **WHEN** Ayla uses "Leon's Lanza", which costs "X", and enters 3
- **THEN** she pays 3 LP

#### Scenario: X as 0
- **WHEN** Ayla enters 0 for an "X" card
- **THEN** the card is used without a payment

#### Scenario: A Cursed card
- **WHEN** Ayla uses the Cursed card "Visions of Death", which costs "1"
- **THEN** she pays 1 LP

#### Scenario: Other text as the cost
- **WHEN** the DM has set the cost of Ayla's card to "X+1", and Ayla uses it
- **THEN** she enters the amount she pays, as for "X"

### Requirement: A player pays the price
When a player uses a card in their own hand, they SHALL pay its price from their own LP. A player whose LP is below the price SHALL NOT use the card. The confirm control is then disabled, with a Turkish note naming the price and their LP. The server SHALL deny a player's use that pays anything other than the price.

#### Scenario: Not enough LP
- **WHEN** Ayla, who has 1 LP, opens the use step of a 3-cost card
- **THEN** the confirm control is disabled, and a Turkish note says that the card costs 3 LP and Ayla has 1 LP

#### Scenario: A forged amount
- **WHEN** Ayla closes her 3-cost card as used, paying 1 LP
- **THEN** the server denies it

#### Scenario: LP changed on another device
- **WHEN** Ayla, who has 3 LP, confirms the use of a 2-cost card while the DM lowers her LP to 1 on another device
- **THEN** the card stays in her hand, she has 1 LP, and a Turkish message says that she has 1 LP

#### Scenario: The price changed meanwhile
- **WHEN** Ayla's use step shows 2 LP, and the DM changes that card's cost to "3" before she confirms
- **THEN** the step shows 3 LP, and a confirmation that would pay the old price is not made

### Requirement: The DM chooses the amount of a use
When the DM uses a card in a player's hand, the amount SHALL start at the price, or be empty when the user enters the price. The DM SHALL be able to set any whole number from 0 to that player's LP. The amount SHALL be taken from that player's LP, and with 0 the card SHALL be used for free. A card in the DM's own hand SHALL be used without a payment.

#### Scenario: The DM charges the price
- **WHEN** the DM uses Ayla's 2-cost card and keeps the amount 2
- **THEN** Ayla's LP drops by 2, and the ledger records the DM as the one who made the change

#### Scenario: A free use by the DM
- **WHEN** the DM uses Ayla's 3-cost card with the amount 0
- **THEN** the card leaves her hand, and her LP does not change

#### Scenario: More than the player has
- **WHEN** the DM enters 6 for Ayla's card while Ayla has 5 LP
- **THEN** the DM cannot confirm the use

#### Scenario: An X card for the DM
- **WHEN** the DM opens the use step of Ayla's "X" card
- **THEN** the amount is empty, and the DM must enter one to confirm

#### Scenario: The DM's own hand
- **WHEN** the DM uses a card in the DM's own hand
- **THEN** no amount is asked, and no balance changes

### Requirement: The use step shows the payment
The use step SHALL show the price and the holder's LP before and after the use. A price the user enters SHALL have its own field: "Zar sonucu (1–6)" for "d6", or "Kaç LP ödenecek?" for any other cost. The DM's field SHALL be labelled "Tutar (<name>'nın LP'sinden)" with the Turkish suffix that fits the name, and noted "0 = ücretsiz". The confirm control SHALL name the amount when it is more than 0, as "Kullanımı onayla (2 LP)".

#### Scenario: A fixed price
- **WHEN** Ayla, who has 5 LP, opens the use step of a 2-cost card
- **THEN** the step shows "2 LP", "5 LP → 3 LP", and "Kullanımı onayla (2 LP)"

#### Scenario: A die to enter
- **WHEN** Ayla opens the use step of a "d6" card
- **THEN** the step shows the field "Zar sonucu (1–6)", and confirming waits for a value

#### Scenario: The DM's field
- **WHEN** the DM opens the use step of Ayla's 2-cost card
- **THEN** the step shows "Tutar (Ayla'nın LP'sinden)" with 2, and "0 = ücretsiz"

#### Scenario: Nothing to pay
- **WHEN** Ayla opens the use step of a Blessed card
- **THEN** the step shows no amount, and the confirm control reads "Kullanımı onayla"

### Requirement: Choosing the character of a use
The use step SHALL ask "Hangi karakter üzerinde?" with a list. It SHALL start at "Karakter seçilmedi". It SHALL then list every active character at the table, grouped under each owner's name, with the holder's group first and the other groups in the order of the "Oyuncular" list. The last choice SHALL be "Başka (yaz)…". Archived characters SHALL NOT be listed.

#### Scenario: The list
- **WHEN** Bora opens the use step of a card in his hand, Ayla owns "Thorin" and "Kuzgun", and Bora owns "Elara"
- **THEN** the list shows "Karakter seçilmedi", then Bora's group with "Elara", then Ayla's group with "Thorin" and "Kuzgun", then "Başka (yaz)…"

#### Scenario: Using without a character
- **WHEN** Ayla confirms a use with "Karakter seçilmedi"
- **THEN** the holding is closed as used with no character

#### Scenario: An archived character
- **WHEN** Ayla has archived "Kuzgun", and she opens the use step of a card
- **THEN** "Kuzgun" is not in the list

#### Scenario: A character added meanwhile
- **WHEN** Ayla's use step is open, and Bora adds "Elara" on another device
- **THEN** "Elara" shows in Ayla's list without a reload

### Requirement: A typed character
Choosing "Başka (yaz)…" SHALL show a text field for the character's name, of at most 100 characters. A use with a typed name SHALL record that name and no character. A use with "Başka (yaz)…" and an empty field SHALL record no character.

#### Scenario: An enemy
- **WHEN** the DM uses Ayla's card with "Başka (yaz)…" and types "Goblin şefi"
- **THEN** the holding is closed as used on "Goblin şefi", with no character record

#### Scenario: An empty field
- **WHEN** Ayla chooses "Başka (yaz)…", leaves the field empty and confirms
- **THEN** the holding is closed as used with no character

### Requirement: The character of a use is recorded
A holding closed as used on a chosen character SHALL record that character and its name at the time of the use. A later rename or archive of the character SHALL NOT change the holding. The server SHALL deny a use on a character that does not exist or is archived, or whose recorded name is not the character's name.

#### Scenario: A later rename
- **WHEN** Ayla used a card on "Thorin", and later renames "Thorin" to "Thorin Oakenshield"
- **THEN** the holding and the İşlem Logu still name "Thorin"

#### Scenario: Archived meanwhile
- **WHEN** Bora's use step has "Kuzgun" chosen, and Ayla archives "Kuzgun" before Bora confirms
- **THEN** the card stays in Bora's hand, and a Turkish message says that the character is no longer available

#### Scenario: A forged name
- **WHEN** a signed-in user closes a holding as used on "Thorin" with the recorded name "Elara"
- **THEN** the server denies it

#### Scenario: An old holding
- **WHEN** a user opens the İşlem Logu, and a holding was closed as used on "Thorin" before characters existed
- **THEN** the event still shows "Thorin"

### Requirement: Adding the effect of a card's use
When a character is chosen from the list, the use step SHALL show "Aktif efekt olarak ekle", checked. With it checked, the use SHALL add the card's effect to that character in the same step (spec: character-effects, "Effects of a use"). Without a chosen character, with a typed name, or with the box unchecked, the use SHALL add no effect.

#### Scenario: Checked by default
- **WHEN** Ayla chooses "Thorin" in the use step of "Lord Vulfric's Valour" and confirms
- **THEN** the card is used, and "Thorin" has its effect

#### Scenario: An instant card
- **WHEN** Ayla chooses "Thorin", unchecks "Aktif efekt olarak ekle", and confirms
- **THEN** the card is used on "Thorin", and no effect is added

#### Scenario: A typed name
- **WHEN** the DM chooses "Başka (yaz)…" and types "Goblin şefi"
- **THEN** the step shows no "Aktif efekt olarak ekle", and the use adds no effect

### Requirement: Browsing the cards to give
"+ Kart ver" SHALL list every active card before any search or filter, sorted by name in Turkish alphabetical order. It SHALL show 20 cards at first, and "Daha fazla göster" SHALL add 20 more each time. It SHALL show how many cards match.

#### Scenario: Opening the dialog
- **WHEN** the DM opens "+ Kart ver" with 744 active cards
- **THEN** the dialog shows 20 cards and says that 744 cards match

#### Scenario: Showing more
- **WHEN** the DM selects "Daha fazla göster" once
- **THEN** the dialog shows 40 cards

### Requirement: Filters in Kart ver
"+ Kart ver" SHALL offer filters by set, cost, mechanic pack and kind (Common, Rare, Blessed, Cursed), and a "Yalnızca havuzdakiler" switch, which combine with each other and with the search. The set filter SHALL list sets as the draw's set filter does, over the active cards. Choices SHALL show counts and clear as in the DM's draw dialog. Closing the dialog SHALL drop them.

#### Scenario: One set's Rare cards
- **WHEN** the DM chooses the set "Kesqerian Nights" and the kind "Rare"
- **THEN** the dialog lists only Kesqer's active Rare cards, and shows their number

#### Scenario: Cursed cards
- **WHEN** the DM chooses the kind "Cursed"
- **THEN** the dialog lists only active Cursed cards

#### Scenario: Only the pool
- **WHEN** the DM turns on "Yalnızca havuzdakiler"
- **THEN** the dialog lists only the normal cards without a holder and the Blessed cards, none of them DM-only

### Requirement: Cards to give as faces
"+ Kart ver" SHALL show each result as its card face, with its status as a badge at the top of the face, clear of its cost: "Havuzda", the holders' names, "DM'e özel", or "Cursed". At 360 CSS pixels wide, the faces SHALL stand in two columns, and the page SHALL NOT scroll horizontally.

#### Scenario: A held card
- **WHEN** Bora holds "Aboleth's Eyes" and the DM finds it in "+ Kart ver"
- **THEN** its face shows a badge with Bora's name

#### Scenario: Phone width
- **WHEN** "+ Kart ver" is shown 360 CSS pixels wide
- **THEN** the faces stand in two columns, and the page has no horizontal scrollbar

### Requirement: Giving the selected card
Selecting a face in "+ Kart ver" SHALL select that card, and a bar at the bottom of the dialog SHALL name it and the receiver, with a control that gives it. For a held normal card, the bar SHALL name the holder and offer "Ek kopya ver" and "Vazgeç". After a give, the dialog SHALL say what was given, and stay open.

#### Scenario: Giving a card from the pool
- **WHEN** the DM selects "Ahriman's Diary", which is in the pool, and gives it to Ayla from the bar
- **THEN** Ayla holds it, and the dialog says "Verildi: Ahriman's Diary → Ayla" and stays open

#### Scenario: A held card asks first
- **WHEN** the DM selects "Aboleth's Eyes", which Bora holds
- **THEN** the bar says that Bora holds it and offers "Ek kopya ver" and "Vazgeç", and nothing is given yet

#### Scenario: Keyboard
- **WHEN** the DM moves the focus to a face and presses Enter
- **THEN** that card is selected, and the bar names it

### Requirement: History link in the card details
The card details of a hand SHALL show the link "Kart geçmişi →" under the card's labels, for every user who sees the details, in the panel beside the hand and in the dialog on narrow windows. It SHALL open the card's Kart geçmişi (spec: card-stats), and SHALL stay apart from "Kullan" and the "DM araçları" section.

#### Scenario: Opening the history from a hand
- **WHEN** Bora selects "Aboleth's Eyes" in Ayla's hand and follows "Kart geçmişi →"
- **THEN** the Kart geçmişi of "Aboleth's Eyes" opens

#### Scenario: A Cursed card in a hand
- **WHEN** Ayla follows "Kart geçmişi →" in the details of her Cursed card "Abandon All Hope"
- **THEN** its Kart geçmişi opens under the Cursed Deck's address

#### Scenario: A held DM-only card
- **WHEN** Ayla follows "Kart geçmişi →" in the details of the DM-only card "The Last Wish" in Bora's hand
- **THEN** its Kart geçmişi opens
