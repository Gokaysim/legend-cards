# pack-shop Specification

## Purpose

Lets players and the DM open card packs from the Pack Shop, watch an open pack live on every device, and choose a card from it, while the rest of the table waits for that choice.

## Requirements

### Requirement: Pack Shop layout
The Pack Shop screen SHALL show two sections. Set Packs has one group per set that has an active card, in the stored set order (spec: card-sets), then set codes that no stored set has, and selecting a group shows its packs and a way back. Mechanic Packs has one pack per mechanic pack in Turkish alphabetical order, its price in the section heading, and the Golden Packs group as its last tile. Every other pack SHALL show its price.

#### Scenario: Opening the Pack Shop
- **WHEN** a signed-in user opens the Pack Shop with the sets as the repository imports them
- **THEN** the screen shows "Set Packs" with a group per set, ending with Pandemonium, and "Mechanic Packs" with the heading price "4 LP / 10.000 GP", one tile per mechanic pack, and the "Golden Packs" group last

#### Scenario: A set's packs
- **WHEN** the user selects the "Kesqerian Nights Packs" group
- **THEN** the Standard, Premium and Cursed Packs of Kesqerian Nights are shown, each with its price, and a way back to the whole shop

#### Scenario: A reordered set
- **WHEN** the DM moves "Pandemonium" to the top of the order on the Setler screen
- **THEN** the Pandemonium group is the first group of Set Packs on every device, without a reload

### Requirement: Pack types
Each set with the "Standart / Premium / Cursed" layout SHALL have a Standard, a Premium and a Cursed Pack. Each set with the "Tek paket + Cursed" layout SHALL have a "<set> Pack" and a "<set> Cursed Pack", as Pandemonium has. Each mechanic pack SHALL have one Mechanic Pack. There SHALL be one Golden Pack and one Cursed Golden Pack across all sets. Pack names use the sets' official names.

#### Scenario: Pack names
- **WHEN** a user looks at the packs
- **THEN** they include "Kesqerian Nights Standard Pack", "Pandemonium Cursed Pack", "Blood & Battle Mechanic Pack", "Golden Pack" and "Cursed Golden Pack"

#### Scenario: No Standard Pack for Pandemonium
- **WHEN** a user opens the Pandemonium group
- **THEN** it shows only the Pandemonium Pack and the Pandemonium Cursed Pack

#### Scenario: Another set with one pack
- **WHEN** the DM gives the set "Ulagal" the "Tek paket + Cursed" layout
- **THEN** the Ballad of Ulagal group shows only the "Ballad of Ulagal Pack" and the "Ballad of Ulagal Cursed Pack", priced as the Pandemonium Pack and the Pandemonium Cursed Pack

#### Scenario: A set code no stored set has
- **WHEN** an active card has the set code "Zaddir", and no stored set has that code
- **THEN** the "Zaddir Packs" group shows a Standard, a Premium and a Cursed Pack

### Requirement: Pack prices
Each pack type SHALL have this price in LP and in GP:

| Pack | LP | GP |
| --- | --- | --- |
| Standard | 2 | 5.000 |
| Premium | 3 | 7.500 |
| Cursed | 1 | 2.500 |
| Pandemonium | 3 | 7.500 |
| Pandemonium Cursed | 3 | 7.500 |
| Mechanic | 4 | 10.000 |
| Golden | 4 | 10.000 |
| Cursed Golden | 3 | 7.500 |

#### Scenario: A price label
- **WHEN** a user looks at a Standard Pack
- **THEN** it shows "2 LP / 5.000 GP"

### Requirement: When a pack can be opened
A pack SHALL be openable only while it has enough candidates: cards in the pool whose pack flag for that pack is on (spec: "Packs follow the pack flags"). A card with "Birden fazla elde olabilir" on is always in the pool. Standard: 9 cards of the set. Premium: 9 of the set, 3 of them Rare. Cursed: 5 Common cards of the set. A "Tek paket + Cursed" set's Pack: 9 Rares of the set. Its Cursed Pack: 5 Rares of the set. Mechanic: 29 cards of that mechanic pack. Golden: 49 Rares across all sets. Cursed Golden: 5 Rares across all sets.

#### Scenario: Too few cards in a set
- **WHEN** Ballad of Ulagal has 1 card in the pool
- **THEN** its Standard Pack cannot be opened, and the shop says in Turkish that the pool has too few cards for it

#### Scenario: Blessed cards count for a Mechanic Pack
- **WHEN** Blood & Battle has 27 normal cards and 3 Blessed cards in the pool, all with "Mechanic paketlerinde çıkar" on
- **THEN** the Blood & Battle Mechanic Pack can be opened

#### Scenario: Blessed cards do not count as Rare
- **WHEN** the pool has 48 Rare cards and 19 Blessed cards
- **THEN** the Golden Pack cannot be opened

#### Scenario: The Pandemonium Pack
- **WHEN** Pandemonium has 8 Rares in the pool
- **THEN** the Pandemonium Pack cannot be opened, and the Pandemonium Cursed Pack can be, while the Cursed Deck has an active card

#### Scenario: Cards kept out of set packs do not count
- **WHEN** Kesqerian Nights has 10 cards in the pool, 2 of them with "Set paketlerinde çıkar" off
- **THEN** its Standard Pack cannot be opened

### Requirement: Cursed packs need the Cursed Deck
The Cursed, Pandemonium Cursed and Cursed Golden Packs SHALL be openable only while the Cursed Deck (spec: card-draws, "Cursed draw") has at least one card, in addition to their own threshold.

#### Scenario: An empty Cursed Deck
- **WHEN** the Cursed Deck has no active cards
- **THEN** no Cursed, Pandemonium Cursed or Cursed Golden Pack can be opened, and the shop says why in Turkish

#### Scenario: Every Cursed card kept out of the deck
- **WHEN** every active Cursed card has "Cursed Deck'te çıkar" off
- **THEN** no Cursed, Pandemonium Cursed or Cursed Golden Pack can be opened

### Requirement: Set pack contents
A Standard Pack SHALL show 5 random cards of its set from the pool. A Premium Pack SHALL show 1 random Rare of its set and 4 more random cards of its set of any rarity. A Cursed Pack SHALL show 5 random Common cards of its set and 1 random Cursed card from the Cursed Deck. The set's cards SHALL be those whose "Set paketlerinde çıkar" is on. Each pack's cards SHALL be shown in random order.

#### Scenario: A Premium Pack
- **WHEN** Ayla opens the Kesqerian Nights Premium Pack
- **THEN** she sees 5 face-down Kesqerian Nights cards, at least one of them Rare

#### Scenario: A Cursed Pack
- **WHEN** Ayla opens the Kesqerian Nights Cursed Pack
- **THEN** she sees 6 face-down cards: 5 Common Kesqerian Nights cards and 1 Cursed card, in random order

### Requirement: Blessed cards in rare packs
The Pack and the Cursed Pack of a "Tek paket + Cursed" set SHALL draw their 5 cards from that set's Rares in the pool together with every active Blessed card in the pool, all of them with "Set paketlerinde çıkar" on. The Golden and Cursed Golden Packs SHALL draw theirs from every Rare in the pool together with every active Blessed card in the pool, all of them with "Mechanic paketlerinde çıkar" on. Each candidate SHALL have the same chance. The Golden Pack SHALL have no separate Blessed chance.

#### Scenario: A Blessed card in a Pandemonium Pack
- **WHEN** Ayla opens the Pandemonium Pack while 43 Pandemonium Rares and 19 Blessed cards are candidates
- **THEN** each of those 62 cards has the same chance to be among its 5 cards

#### Scenario: A Cursed Golden Pack
- **WHEN** Ayla opens the Cursed Golden Pack
- **THEN** she sees 5 cards drawn from the Rares and the Blessed cards, and 1 Cursed card

#### Scenario: Common cards of a one-pack set
- **WHEN** the set "Ulagal" has the "Tek paket + Cursed" layout and Common cards in the pool
- **THEN** no Common card of Ulagal can be among the cards of the Ballad of Ulagal Pack

#### Scenario: A Blessed card kept out of Golden Packs
- **WHEN** the Blessed card "Second Wind" has "Mechanic paketlerinde çıkar" off and "Set paketlerinde çıkar" on
- **THEN** no Golden Pack shows it, and the Pandemonium Pack can

### Requirement: Mechanic pack contents
A Mechanic Pack SHALL show 5 random cards of its mechanic pack from the pool, whose "Mechanic paketlerinde çıkar" is on. The mechanic pack's Blessed cards are among the candidates.

#### Scenario: A Mechanic Pack
- **WHEN** Ayla opens the Blood & Battle Mechanic Pack
- **THEN** she sees 5 face-down cards whose mechanic pack is Blood & Battle

### Requirement: Cards in a pack are distinct and in the pool
A pack SHALL never show the same card twice, and every card with one copy it shows SHALL be in the pool when the pack opens. Every candidate SHALL have the same chance in its part of the pack.

#### Scenario: A card taken while opening
- **WHEN** another device takes a pool card at the moment Ayla's pack is being opened with it
- **THEN** the pack opens with a different card in its place, and Ayla is charged once

### Requirement: Who a pack is for
A player SHALL open packs only into their own hand. The DM SHALL choose the hand in the pack's confirmation: any user who has a profile. The choice SHALL start at the hand the link names, or else at the first player who is not the DM, and the next pack SHALL start at the DM's last choice. The Pack Shop screen SHALL have no hand picker of its own.

#### Scenario: A player's Pack Shop
- **WHEN** Ayla opens a pack
- **THEN** it is opened into Ayla's hand

#### Scenario: The DM picks a player
- **WHEN** the DM opens a pack for Bora
- **THEN** it is opened into Bora's hand

#### Scenario: The DM changes the hand in the confirmation
- **WHEN** the DM comes from Ayla's "🎁 Pack Shop" link, selects a pack, and picks Bora in its confirmation
- **THEN** the confirmation starts at Ayla, the payment then offers Bora's LP, and the pack opens into Bora's hand

#### Scenario: The next pack
- **WHEN** the DM then selects another pack
- **THEN** its confirmation starts at Bora

#### Scenario: A player opens a pack for someone else
- **WHEN** a player writes a pack opening into another player's hand
- **THEN** the server denies it

### Requirement: A player pays with LP
A player SHALL pay the pack's LP price from their own LP when the pack opens. A player with less LP than the price SHALL NOT be able to open it: the shop says in Turkish how much LP is needed. The server SHALL deny a player's opening that pays a different amount, pays with GP, or brings their LP below 0.

#### Scenario: Paying for a pack
- **WHEN** Ayla, who has 5 LP, opens a Standard Pack
- **THEN** she has 3 LP on every device as the pack opens

#### Scenario: Not enough LP
- **WHEN** Ayla, who has 1 LP, looks at a Standard Pack
- **THEN** she cannot open it, and the shop says that 2 LP are needed

#### Scenario: A player pays with GP
- **WHEN** a player writes a pack opening paid from the party purse
- **THEN** the server denies it

### Requirement: The DM chooses the payment
When the DM opens a pack, the DM SHALL choose to charge the hand owner's LP or the party's GP. The amount SHALL start at the pack's price in that currency, and the DM SHALL be able to change it to any whole number from 0 to 1,000,000. 0 opens the pack for free. LP can be charged to any user's hand, a DM's included, and only from that hand's owner. An amount above the balance SHALL be refused, with a Turkish message naming the balance.

#### Scenario: The default amount
- **WHEN** the DM chooses to open a Golden Pack for Bora with GP
- **THEN** the amount starts at 10.000

#### Scenario: A changed amount
- **WHEN** the DM opens a Standard Pack for Bora, who has 4 LP, charging 1 LP
- **THEN** Bora has 3 LP

#### Scenario: A free opening
- **WHEN** the DM opens a pack for Bora with the amount 0
- **THEN** no balance changes, and the pack is recorded as free

#### Scenario: More than the purse
- **WHEN** the DM charges 7.500 GP while the party purse holds 5.000 GP
- **THEN** a Turkish message says that the purse holds 5.000 GP, and no pack opens

#### Scenario: A pack for the DM's own hand
- **WHEN** the DM, who has 3 LP, opens a Standard Pack into their own hand charging LP
- **THEN** the amount starts at 2, and after the opening the DM has 1 LP

#### Scenario: Another hand's LP
- **WHEN** the DM writes a pack opening into Bora's hand that charges Ayla's LP
- **THEN** the server denies it

### Requirement: One open pack at a time
At most one pack SHALL be open across the whole group. While a pack is open, opening another SHALL be refused with a Turkish message naming whose pack is open. When two devices open packs at the same moment, exactly one SHALL succeed, and the other SHALL NOT be charged.

#### Scenario: A second pack
- **WHEN** Bora tries to open a pack while Ayla's pack is open
- **THEN** a Turkish message says that Ayla is opening a pack, and nothing opens or is charged

#### Scenario: Two devices at once
- **WHEN** Ayla and Bora open packs at the same moment
- **THEN** exactly one pack opens, and only its owner is charged

### Requirement: The table waits for an open pack
While a pack is open, the server SHALL deny every card draw, pack opening, card given, used, discarded or transferred, every LP or GP change, and every True Word draft started, learned from, skipped or cancelled, and every True Word taught or taken back, by anyone, the DM included, except the open pack's own steps. The application SHALL disable those controls and say in Turkish that a pack is open. Notes, switching cards and True Words active, and cost overrides SHALL stay available.

#### Scenario: Drawing during a pack
- **WHEN** Bora tries to draw a card while Ayla's pack is open
- **THEN** the draw controls are disabled with a Turkish note, and the server denies a draw that is written anyway

#### Scenario: The DM changes LP during a pack
- **WHEN** the DM tries to add LP to Bora while Ayla's pack is open
- **THEN** the change cannot be made, and the server denies it

#### Scenario: Writing a note during a pack
- **WHEN** Bora edits a card's note while Ayla's pack is open
- **THEN** the note is saved

#### Scenario: A True Word draft during a pack
- **WHEN** Bora has an open True Word draft, and Ayla opens a pack before he learns a word
- **THEN** Bora's learn and skip controls are disabled with a Turkish note until the pack ends, and his draft stays open

#### Scenario: Switching a True Word during a pack
- **WHEN** the DM makes Bora's "Aid" active while Ayla's pack is open
- **THEN** the change is saved

### Requirement: Everyone watches the open pack
When a pack opens, every signed-in user SHALL see it on whatever screen they are on, live. The view shows whose hand it is for, who opened it, the pack, the payment, and its cards, and it turns each card over on every device as soon as it is turned. Any user SHALL be able to shrink the view to a banner that names the open pack, and open it again from there.

#### Scenario: A player watches
- **WHEN** Ayla opens a pack while Bora is on the library screen
- **THEN** Bora's screen shows Ayla's pack with its cards face down

#### Scenario: A card turned over
- **WHEN** Ayla turns over the third card
- **THEN** that card turns over on Bora's and the DM's screens too

#### Scenario: Shrinking the view
- **WHEN** Bora shrinks the open pack view
- **THEN** a banner says that Ayla is opening a pack, and selecting it shows the pack again

### Requirement: Opening animation
Before its cards appear, an opening pack SHALL show a short animation of about three seconds in which the pack swells in three pulses and bursts. The pack SHALL be a set's cardback for the packs of one set, and the pack's own picture for the others; without that picture, it SHALL be drawn without one. Each pulse SHALL be brighter than the last, a halo of light SHALL grow around it, and the screen SHALL flash warm white as it bursts. With reduced motion, the cards SHALL appear without it.

#### Scenario: A set's pack
- **WHEN** a Kesqerian Nights Premium Pack opens for Ayla
- **THEN** the Kesqerian Nights cardback swells in three brightening pulses inside a growing halo, bursts in a warm white flash, and the face-down cards appear

#### Scenario: A Mechanic Pack
- **WHEN** a Blood & Battle Mechanic Pack opens
- **THEN** the Blood & Battle pack picture swells and bursts

#### Scenario: No picture
- **WHEN** a pack opens whose cardback or pack picture is missing
- **THEN** the pack is drawn without a picture, and swells and bursts the same way

#### Scenario: Reduced motion
- **WHEN** a user whose device asks for reduced motion sees a pack open
- **THEN** the cards appear at once

### Requirement: Turning cards over
Only the hand's owner and the DM SHALL be able to turn over the cards of an open pack, one at a time. A turned card SHALL stay face up. Other users only watch.

#### Scenario: The owner turns a card
- **WHEN** Ayla selects a face-down card in her open pack
- **THEN** it turns over and shows its name, kind, set, rarity, cost and text

#### Scenario: Another player tries to turn a card
- **WHEN** Bora writes a turned card into Ayla's open pack
- **THEN** the server denies it

### Requirement: Every card is turned before choosing
No card SHALL be chosen until every card of the pack is face up. Selecting a face-up card earlier SHALL only remind the user in Turkish to turn over every card. The server SHALL deny a choice while a card is still face down.

#### Scenario: Choosing too early
- **WHEN** Ayla selects a face-up card while two cards are still face down
- **THEN** a Turkish reminder asks her to turn over every card, and nothing is chosen

### Requirement: Choosing a card
Once every card is face up, the hand's owner or the DM SHALL choose exactly one card that is not Cursed. It SHALL go to the end of the hand, a card with one copy SHALL leave the pool, and the pack SHALL end. The other shown cards SHALL stay where they were.

#### Scenario: Ayla chooses
- **WHEN** Ayla chooses "Aboleth's Eyes" from her open pack
- **THEN** "Aboleth's Eyes" is at the end of her hand, it is no longer in the pool, and the pack ends on every device

#### Scenario: The DM chooses for a player
- **WHEN** the DM chooses a card from Ayla's open pack
- **THEN** the card goes to Ayla's hand, and the pack ends

#### Scenario: Another player chooses
- **WHEN** Bora writes a choice into Ayla's open pack
- **THEN** the server denies it

### Requirement: The mandatory Cursed card
In Cursed, Pandemonium Cursed and Cursed Golden Packs, the Cursed card SHALL NOT be choosable and SHALL NOT be refusable. It SHALL go to the hand together with the chosen card, in the same step. A pack can only escape its Cursed card through the DM's cancel.

#### Scenario: A Cursed Pack's choice
- **WHEN** Ayla chooses "Aboleth's Eyes" from a Cursed Pack that shows "Visions of Death"
- **THEN** both "Visions of Death" and "Aboleth's Eyes" are added to the end of her hand

#### Scenario: Choosing the Cursed card
- **WHEN** Ayla selects the Cursed card in her open Cursed Pack
- **THEN** nothing is chosen, and the card is marked as mandatory

### Requirement: The DM cancels a pack
Only the DM SHALL be able to cancel an open pack, after a confirmation. A cancel SHALL give no card, SHALL refund the whole payment to the balance it came from, and SHALL end the pack. The hand's owner SHALL NOT be able to cancel or leave a pack.

#### Scenario: A refunded pack
- **WHEN** the DM cancels Ayla's open Standard Pack, for which she paid 2 LP
- **THEN** Ayla gets the 2 LP back, no card is added, and the pack ends on every device

#### Scenario: A GP refund
- **WHEN** the DM cancels a pack that was paid with 7.500 GP
- **THEN** the party purse gets the 7.500 GP back

#### Scenario: A player cancels
- **WHEN** Ayla writes a cancel of her own open pack
- **THEN** the server denies it

### Requirement: An open pack survives
An open pack SHALL stay open until it is chosen from or cancelled. Closing the view, leaving the screen, reloading, signing out, or losing the connection SHALL NOT end it. Coming back SHALL show the same cards, with the same cards face up.

#### Scenario: Reloading during a pack
- **WHEN** Ayla reloads the application with two of her pack's cards face up
- **THEN** her open pack is shown again with the same cards, two of them face up

### Requirement: Pack records
Every pack opening SHALL be stored permanently with:
- who opened it, the hand it is for, and when
- the pack type, and its set or mechanic pack
- the cards shown, in order, and which are face up
- the payment, and its status: open, chosen, or cancelled
- when and by whom it ended, the chosen and the Cursed card with their holdings, and the refund

Every signed-in user SHALL read every pack opening. One that has ended SHALL never change. None SHALL be deleted.

#### Scenario: Recording a choice
- **WHEN** Ayla chooses "Aboleth's Eyes" from a Standard Pack for 2 LP
- **THEN** the pack record names Ayla, the pack, its five cards, the 2 LP payment, "Aboleth's Eyes" with its new holding, and when and by whom it was chosen

#### Scenario: Changing an ended pack
- **WHEN** any signed-in user, including the DM, changes or deletes a pack record that has ended
- **THEN** the server denies it

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user tries to read a pack record
- **THEN** the server denies it

### Requirement: Pack steps agree
The server SHALL accept an opening only together with taking the table for that pack and, when paid, its ledger entry and new balance. It SHALL accept a choice only together with the holdings it opens, a normal card's new holder, and freeing the table, and a cancel only together with its refund, when paid, and freeing the table. Each part written alone SHALL be denied.

#### Scenario: A choice without its holding
- **WHEN** a signed-in user marks an open pack as chosen without creating the holding it names
- **THEN** the server denies the write

#### Scenario: Taking the table alone
- **WHEN** a signed-in user marks the table as taken without opening a pack in the same write
- **THEN** the server denies it

### Requirement: Pack steps need a connection
Opening, choosing and cancelling a pack SHALL require a network connection. Offline, the application SHALL show a Turkish message, and nothing SHALL change.

#### Scenario: Opening offline
- **WHEN** Ayla tries to open a pack while offline
- **THEN** a Turkish message says that a connection is needed, and no pack opens

### Requirement: Pack Shop link on the hand screen
The hand screen SHALL offer a "🎁 Pack Shop" link that opens the Pack Shop.

#### Scenario: Going to the Pack Shop from a hand
- **WHEN** Ayla selects "🎁 Pack Shop" on her hand
- **THEN** the Pack Shop screen is shown

### Requirement: What a pack holds, before paying
The confirmation of a Mechanic Pack, and of the Golden Pack, SHALL show what the pack holds, in v2.2.8's Turkish words, above the payment. This SHALL hold on every device. The other packs, and a Mechanic Pack that v2.2.8 has no words for, SHALL show no description.

#### Scenario: A Mechanic Pack
- **WHEN** Ayla selects the Blood & Battle Mechanic Pack on her phone
- **THEN** its confirmation shows "Combat etkileri, saldırı ve hasar zarlarıyla ilgili kartları içerir." above the payment

#### Scenario: The Golden Pack
- **WHEN** the DM selects the Golden Pack
- **THEN** its confirmation shows "Sadece Rare kartlar ve Blessed kartlar içerir."

#### Scenario: A set's pack
- **WHEN** Ayla selects the Kesqerian Nights Standard Pack
- **THEN** its confirmation shows no description

### Requirement: Packs follow the pack flags
The Standard, Premium and Cursed Packs and a one-pack set's two packs SHALL show only cards whose "Set paketlerinde çıkar" is on. The Mechanic, Golden and Cursed Golden Packs SHALL show only cards whose "Mechanic paketlerinde çıkar" is on. A pack's Cursed card SHALL come from the Cursed Deck (spec: card-draws, "Cursed draw"). Other cards SHALL NOT be candidates. The server SHALL deny choosing or taking any other card from a pack.

#### Scenario: A card kept out of set packs
- **WHEN** "The Last Wish" is a Kesqerian Nights Rare without a holder whose "Set paketlerinde çıkar" is off, and Ayla opens the Kesqerian Nights Premium Pack
- **THEN** the pack does not show "The Last Wish"

#### Scenario: Only in Mechanic Packs
- **WHEN** the same card has "Mechanic paketlerinde çıkar" on, and Ayla opens its Mechanic Pack
- **THEN** "The Last Wish" can be among its cards

#### Scenario: A Cursed card kept out of the deck
- **WHEN** "Visions of Death" has "Cursed Deck'te çıkar" off, and Ayla opens a Cursed Pack
- **THEN** its Cursed card is never "Visions of Death"

#### Scenario: A forged choice
- **WHEN** a player writes a choice from a set's pack of a card whose "Set paketlerinde çıkar" is off
- **THEN** the server denies it

### Requirement: The open pack lies on the draw table
The open pack view SHALL use the draw table (spec: card-draws, "The draw table"). The pack, with its number of cards on it, SHALL stand where the deck stands, and its cards SHALL lie beside it. Above the table, the same chips as a draw SHALL name the pack, whose hand it is for and the payment, with the live mark and "Masa bekliyor" while it is open. Its title SHALL read "<owner> Pack açıyor".

#### Scenario: Watching a set pack
- **WHEN** Bora watches Ayla's open Kesqerian Nights Standard Pack, paid with 2 LP
- **THEN** his view reads "Ayla Pack açıyor", shows the chips "Kesqerian Nights Standard Pack", "Ayla'nın eline", "−2 LP" and "Masa bekliyor", and the Kesqer cardback with 5 on it beside the cards

#### Scenario: After the pack ends
- **WHEN** Ayla chooses a card and Bora's view stays open
- **THEN** "Masa bekliyor" and the live mark are gone, and the view says what was chosen

### Requirement: Draws and packs share one banner
The banner of a shrunk pack SHALL be the same as the banner of a shrunk draw (spec: live-draws, "Shrinking the watching view"): the live mark, a line that names the open pack, its cards as small pictures (face up when turned, the back otherwise), and "Göster".

#### Scenario: A shrunk pack
- **WHEN** Bora shrinks Ayla's open pack with three of its five cards face up
- **THEN** the banner shows the live mark, "Ayla Pack açıyor", three small faces and two small backs, and "Göster"
