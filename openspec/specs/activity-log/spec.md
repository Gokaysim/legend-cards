# activity-log Specification

## Purpose

Shows what happened in the game on the İşlem Logu screen: the card movements and the balance changes, in one permanent list read from the records that the other capabilities keep.

## Requirements

### Requirement: One list of what happened
The İşlem Logu screen SHALL list, newest first and live, every card given, drawn, used, discarded, and transferred, every pack opened, every True Word draft, every word the DM teaches or takes back, every True Word use, every LP and GP change, every definition change, and every set change. It SHALL be read from the holdings, draws, packs, True Word drafts, learned words and word uses, the ledger, the change records and the set change records, so it never disagrees with them. Switching a card or a word active, notes, and cost overrides SHALL NOT be listed.

#### Scenario: Events from both sources
- **WHEN** the DM gives Ayla a card and then adds 2 LP to Bora
- **THEN** the log shows the LP change first and the card given below it

#### Scenario: A draw among the events
- **WHEN** the DM adds 2 LP to Bora, and then Ayla draws a card
- **THEN** the log shows the draw first and the LP change below it

#### Scenario: A pack among the events
- **WHEN** the DM adds 2 LP to Bora, and then Ayla opens a pack
- **THEN** the log shows the pack first and the LP change below it

#### Scenario: A True Word draft among the events
- **WHEN** the DM adds 2 LP to Bora, and then Ayla starts a True Word draft
- **THEN** the log shows the draft first and the LP change below it

#### Scenario: A True Word use among the events
- **WHEN** the DM adds 2 LP to Bora, and then Ayla uses "Abyss"
- **THEN** the log shows the use of "Abyss" first and the LP change below it

#### Scenario: A definition change among the events
- **WHEN** the DM adds 2 LP to Bora, and then fixes the text of "Aboleth's Eyes"
- **THEN** the log shows the text change first and the LP change below it

#### Scenario: A set change among the events
- **WHEN** the DM adds 2 LP to Bora, and then renames the set "Ulagal"
- **THEN** the log shows the set change first and the LP change below it

#### Scenario: Live update
- **WHEN** Ayla uses a card while Bora has the log open
- **THEN** the event appears at the top of Bora's log without a reload

#### Scenario: State changes are not events
- **WHEN** the DM makes a card in Ayla's hand active, or one of her True Words
- **THEN** the log shows no new event

### Requirement: Log readable by every signed-in user
Every signed-in user SHALL see the whole log, including the events of other players. The one exception is the DM's work on drafts, which SHALL be listed for the DM only (spec: definition-editing, "Who reads the change records").

#### Scenario: A player reads the log
- **WHEN** Ayla opens the İşlem Logu
- **THEN** she sees the events of every player, including Bora's LP changes

#### Scenario: Draft work in a player's log
- **WHEN** the DM adds the draft "Bard's Encore", edits it, and then publishes it, and Ayla opens the İşlem Logu
- **THEN** Ayla sees only the publish, and the DM sees all three events

### Requirement: Permanent history
The log SHALL keep every event across sessions and devices. Reloading the application or signing in on another device SHALL show the same events.

#### Scenario: Next session
- **WHEN** a user opens the İşlem Logu a week after an event
- **THEN** that event is still listed

### Requirement: Event rows
Each event SHALL show its time, the name of the user who did it with the DM marked, and what happened, in Turkish. A card event SHALL name the card and the player. A used card SHALL show the character, if one was given, and the LP paid, if more than 0. A balance change SHALL show the account, the change, the balance before and after, and the reason.

#### Scenario: A used card
- **WHEN** Ayla uses "Aboleth's Eyes" on "Thorin"
- **THEN** the event shows the time, Ayla, "Aboleth's Eyes", and "Thorin"

#### Scenario: A paid use
- **WHEN** Ayla uses her 2-cost "Aboleth's Eyes" on "Thorin"
- **THEN** the event reads "Aboleth's Eyes kartını Thorin üzerinde kullandı (−2 LP)."

#### Scenario: A free use
- **WHEN** the DM uses Ayla's 3-cost "Aboleth's Eyes" with the amount 0
- **THEN** the event names Ayla and the card, and shows no payment

#### Scenario: An LP change
- **WHEN** the DM adds 2 LP to Ayla, who had 5 LP, with the reason "Boss'u yendi"
- **THEN** the event shows the time, the DM's name marked as DM, Ayla, +2 LP, 5 → 7, and "Boss'u yendi"

#### Scenario: A GP change
- **WHEN** the DM adds 5,000 GP to a purse of 7,500 GP with the reason "Ejderha hazinesi"
- **THEN** the event shows "Grup kesesi", +5.000 GP, 7.500 → 12.500, and "Ejderha hazinesi"

### Requirement: A transfer is one event
A transfer SHALL appear as one event that names the card, the player who had it, and the player who got it.

#### Scenario: Transferring a card
- **WHEN** the DM transfers "Aboleth's Eyes" from Ayla to Bora
- **THEN** the log shows one event naming "Aboleth's Eyes", Ayla, and Bora, and no separate event for the card given to Bora

### Requirement: Grouped by day
The log SHALL group its events under the date they happened on, in Turkish, with the newest day first.

#### Scenario: Events on two days
- **WHEN** events happened on 7 and 8 November 2026
- **THEN** the events of 8 November are listed under their date, above those of 7 November under theirs

### Requirement: Paging
The log SHALL first show the 50 most recent events. When there are older events, a "Daha fazla" control SHALL show 50 more each time.

#### Scenario: A long history
- **WHEN** a user opens the log while there are 120 events
- **THEN** the 50 most recent events are shown, and "Daha fazla" shows the next 50

#### Scenario: Everything shown
- **WHEN** every event is shown
- **THEN** no "Daha fazla" control is shown

### Requirement: Player filter
The log SHALL offer a filter for one user. With a user chosen, it SHALL list only the cards that user received, including the cards drawn into their hand and the packs opened for them, the cards that left their hand, their True Word drafts, the True Words the DM taught them or took back from them, the uses of their True Words, and the changes of their LP. Party purse changes and definition changes SHALL be listed only without a filter.

#### Scenario: Filtering by a player
- **WHEN** a user chooses Ayla in the filter
- **THEN** only the card events of Ayla's hand, Ayla's True Word events, and Ayla's LP changes are listed

#### Scenario: Draws in the filter
- **WHEN** a user chooses Ayla in the filter after the DM drew a card into Ayla's hand and Bora drew one into his own
- **THEN** the draw into Ayla's hand is listed, and Bora's draw is not

#### Scenario: Packs in the filter
- **WHEN** a user chooses Ayla in the filter after the DM opened a pack for Ayla
- **THEN** that pack is listed

#### Scenario: True Words in the filter
- **WHEN** a user chooses Ayla in the filter after the DM started a draft for Ayla and taught Bora a word
- **THEN** Ayla's draft is listed, and the word taught to Bora is not

#### Scenario: True Word uses in the filter
- **WHEN** a user chooses Ayla in the filter after Ayla used "Abyss" and Bora used "Aid"
- **THEN** Ayla's use of "Abyss" is listed, and Bora's use of "Aid" is not

#### Scenario: A transfer between two players
- **WHEN** a user chooses Bora in the filter after the DM transferred a card from Ayla to Bora
- **THEN** the transfer is listed

#### Scenario: Definition changes in the filter
- **WHEN** a user chooses Ayla in the filter after the DM changed the text of a card that Ayla holds
- **THEN** the text change is not listed

### Requirement: Log states
While the log is loading, the screen SHALL show a loading indicator. If it cannot be loaded, it SHALL show a Turkish error message. When there are no events, it SHALL say so in Turkish.

#### Scenario: No events yet
- **WHEN** a user opens the İşlem Logu before any card was given or any balance changed
- **THEN** the screen says in Turkish that there are no events yet

#### Scenario: Load error
- **WHEN** the events cannot be read
- **THEN** the screen shows a Turkish error message

### Requirement: A draw is one event
A draw SHALL appear as one event that names who drew, the player whose hand the card went to, the card, whether it was a Cursed draw, the payment of 1 LP if any, and the DM's filters if any. A set filter SHALL be named by the set's official name, or by its code when no stored set has it. The draw's holding and its ledger entry SHALL NOT appear as separate events.

#### Scenario: A paid draw
- **WHEN** Ayla draws "Aboleth's Eyes" for 1 LP
- **THEN** the log shows one event naming Ayla, "Aboleth's Eyes", and −1 LP, and no separate event for the card given or for the LP change

#### Scenario: The DM draws for a player
- **WHEN** the DM draws a card into Bora's hand with the rarity filter "Rare"
- **THEN** the event shows the DM's name marked as DM, Bora, the card, and the filter "Rare", and no payment

#### Scenario: The DM draws from one set
- **WHEN** the DM draws a card into Bora's hand with the set filter Kesqer and the rarity filter "Rare"
- **THEN** the event shows the filters "Kesqerian Nights" and "Rare"

#### Scenario: A Cursed draw
- **WHEN** Ayla draws the Cursed card "Visions of Death"
- **THEN** the event says that Ayla drew a Cursed card and names "Visions of Death"

### Requirement: A pack opening is one event
A pack opening SHALL appear as one event, at the time it was opened. It names who opened it, the hand it is for, the pack, the payment or "ücretsiz", the cards it showed, and how it ended: the chosen card with the mandatory Cursed card, or a cancel with its refund. While the pack is open, the event says so, and it SHALL update live. Its holdings, payment and refund SHALL NOT appear as separate events.

#### Scenario: A chosen pack
- **WHEN** Ayla opens a Kesqerian Nights Standard Pack for 2 LP and chooses "Aboleth's Eyes"
- **THEN** the log shows one event naming Ayla, the pack, −2 LP and "Aboleth's Eyes", and no separate event for the card given or for the LP change

#### Scenario: A Cursed Pack
- **WHEN** Ayla chooses "Aboleth's Eyes" from a Cursed Pack that showed "Visions of Death"
- **THEN** the event names both "Aboleth's Eyes" and the Cursed card "Visions of Death"

#### Scenario: A cancelled pack
- **WHEN** the DM cancels a pack that Bora paid 3 LP for
- **THEN** the pack's event says that the DM cancelled it and refunded 3 LP, and there is no separate event for the refund

#### Scenario: An open pack
- **WHEN** Ayla has opened a pack and has not chosen yet
- **THEN** the event says that Ayla is opening the pack, and it changes to her choice as soon as she chooses

### Requirement: A True Word draft is one event
A True Word draft SHALL appear as one event, at the time it started. It names who started it, the player it is for, the payment or "ücretsiz", the 3 words it showed, and how it ended: the word learned, "pas geçti", or a cancel with its refund. While the draft is open, the event says so, and it SHALL update live. Its learned word, payment and refund SHALL NOT appear as separate events.

#### Scenario: A learned word
- **WHEN** Ayla starts a draft for 3 LP and learns "Abyss"
- **THEN** the log shows one event naming Ayla, −3 LP, the 3 words, and "Abyss", and no separate event for the word or for the LP change

#### Scenario: A skipped draft
- **WHEN** Bora skips a draft that the DM started for him for free
- **THEN** the event names the DM, Bora, "ücretsiz", the 3 words, and says that Bora skipped it

#### Scenario: A cancelled draft
- **WHEN** the DM cancels a draft that Ayla paid 3 LP for
- **THEN** the draft's event says that the DM cancelled it and refunded 3 LP, and there is no separate event for the refund

#### Scenario: An open draft
- **WHEN** Ayla has started a draft and has not chosen yet
- **THEN** the event says that Ayla's draft is open, and it changes as soon as the draft ends

### Requirement: True Words taught and taken back are events
A True Word the DM teaches SHALL appear as one event naming the DM, the player, and the word. A True Word the DM takes back SHALL appear as one event, at the time it was taken back, naming the DM, the player, and the word.

#### Scenario: Teaching a word
- **WHEN** the DM teaches Bora "Aid"
- **THEN** the log shows an event that the DM taught Bora "Aid"

#### Scenario: Taking back a word
- **WHEN** the DM takes back "Abyss" from Ayla
- **THEN** the log shows an event that the DM took back "Abyss" from Ayla, and the event of how she learned it stays

### Requirement: Definition changes are events
Each definition change record SHALL appear as one event. It names who made the change (the DM, or "Import"), the card or word, and the step: added, edited, published, retired, brought back or deleted. An edit SHALL show each changed field before and after. A publish and an add straight to active SHALL show the definition. Events of the DM's work on drafts and on DM-only cards SHALL be marked as visible to the DM only.

#### Scenario: An edit
- **WHEN** the DM changes the cost of "Aboleth's Eyes" from "2" to "3"
- **THEN** the log shows one event naming the DM, "Aboleth's Eyes", and the cost "2 → 3"

#### Scenario: A retire
- **WHEN** the DM retires the True Word "Abyss"
- **THEN** the log shows that the DM retired the True Word "Abyss"

#### Scenario: Draft work in the DM's log
- **WHEN** the DM adds the draft "Bard's Encore" and opens the İşlem Logu
- **THEN** the event of adding it is marked as visible to the DM only

#### Scenario: Work on a DM-only card
- **WHEN** the DM changes the text of the active DM-only card "The Last Wish"
- **THEN** the DM's log marks that event as visible to the DM only, and Ayla's log does not show it

### Requirement: Text changes in the log
An edit event SHALL show a text before and after by its visible part, without bracket text, as the card screens do. When only the bracket text changed, the event SHALL say in Turkish that the hidden part of the text changed.

#### Scenario: A visible text change
- **WHEN** the DM changes the text of "Aboleth's Eyes"
- **THEN** the event shows the old and the new visible text

#### Scenario: A bracket-only change
- **WHEN** the DM changes "[Uno]" to "[Duo]" in the text of "Hrolf's Hornswaggle"
- **THEN** the event says that the hidden part of the text changed, and shows no bracket text

### Requirement: An import is one event
An import's change record SHALL appear as one event naming "Import", whether cards or True Words were added or got pictures, how many, and their names. A player SHALL see only the event of the active additions, or of the active and retired definitions that got pictures, leaving out DM-only cards.

#### Scenario: The first import
- **WHEN** the repository card files were imported into empty emulators, and Ayla opens the İşlem Logu
- **THEN** she sees one event that the import added 742 cards, and no event of the 3 drafts

#### Scenario: A picture import
- **WHEN** the picture import gave pictures to 700 active cards and to the draft "The Cartographer", and Ayla opens the İşlem Logu
- **THEN** she sees one event that the import gave pictures to 700 cards, and no event of "The Cartographer"

#### Scenario: A picture for a DM-only card
- **WHEN** the picture import gave pictures to 700 active cards, one of them the DM-only card "The Last Wish", and Ayla opens the İşlem Logu
- **THEN** she sees one event that the import gave pictures to 699 cards, and the DM's log also shows a DM-only event naming "The Last Wish"

### Requirement: Picture changes in the log
An edit event SHALL name a picture change in Turkish as "Resim: eklendi" when a definition without a picture got one, "Resim: değişti" when its picture was replaced, and "Resim: kaldırıldı" when it was removed. It SHALL NOT show the picture's address. A publish or an add straight to active with a picture SHALL say that the definition has a picture.

#### Scenario: A replaced picture
- **WHEN** the DM saves a new picture for "Aboleth's Eyes"
- **THEN** the log shows one event naming the DM, "Aboleth's Eyes", and "Resim: değişti"

#### Scenario: A removed picture with another change
- **WHEN** the DM removes the picture of "Aboleth's Eyes" and changes its cost from "2" to "3" in one save
- **THEN** the event shows "Resim: kaldırıldı" and the cost "2 → 3"

### Requirement: The DM-only flag in the log
An edit event that turns a card's DM-only flag on or off SHALL show it as a changed field: "DM'e özel: hayır → evet" or "DM'e özel: evet → hayır". A player SHALL see that event, because the card is visible to players on one side of it.

#### Scenario: Marking a card DM-only
- **WHEN** the DM marks the active card "Aboleth's Eyes" as DM-only, and Ayla opens the İşlem Logu
- **THEN** she sees one event naming the DM, "Aboleth's Eyes", and "DM'e özel: hayır → evet"

### Requirement: Set changes are events
Each set change record SHALL appear as one event, visible to every signed-in user. It names who made the change (the DM, or "Import"), the set by its official name, and the step: added, edited, moved or deleted. An edit SHALL name the changed fields in Turkish ("Ad", "Alias'lar", "Paketler", "Cardback", "Cardmaker"), without their values. An import SHALL name the sets it added and the sets that got pictures.

#### Scenario: A rename
- **WHEN** the DM changes the name of "Ulagal", and Ayla opens the İşlem Logu
- **THEN** she sees one event naming the DM, the set, the edit, and "Ad"

#### Scenario: A move
- **WHEN** the DM selects "↑" on "Ulagal"
- **THEN** the log shows one event that the DM moved Ballad of Ulagal up in the order

#### Scenario: The set import
- **WHEN** the set import added the 12 sets with their pictures
- **THEN** the log shows one event naming "Import" and the 12 sets

### Requirement: A use's payment is part of the use
A card's or a True Word's use payment SHALL appear only inside its use event, never as a separate balance change.

#### Scenario: One event for a paid card use
- **WHEN** Ayla uses her 2-cost "Aboleth's Eyes"
- **THEN** the log shows one event for the use with "−2 LP", and no separate LP change

#### Scenario: One event for a paid word use
- **WHEN** Ayla uses "Abyss" for 5 LP
- **THEN** the log shows one event for the use with "−5 LP", and no separate LP change

### Requirement: A True Word use is one event
A True Word use SHALL appear as one event, at the time it was used. It names who used the word, the player whose word it is when the DM used it, the word, the character it was used on, if one was given, and the LP paid, if more than 0.

#### Scenario: A player uses a word
- **WHEN** Ayla uses "Abyss" for 5 LP
- **THEN** the event reads "Abyss True Word'ünü kullandı (−5 LP).", with Ayla as the user

#### Scenario: The DM uses a player's word
- **WHEN** the DM uses Ayla's "Abyss" for 5 LP
- **THEN** the event reads "Ayla'nın Abyss True Word'ünü kullandı (−5 LP).", with the DM as the user

#### Scenario: A free use
- **WHEN** Ayla uses "Chaos", which costs 0
- **THEN** the event reads "Chaos True Word'ünü kullandı.", with Ayla as the user

#### Scenario: A use on a character
- **WHEN** Ayla uses "Abyss" on "Thorin" for 5 LP
- **THEN** the event reads "Abyss True Word'ünü Thorin üzerinde kullandı (−5 LP).", with Ayla as the user
