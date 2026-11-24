# activity-log Specification

## Purpose

Shows what happened in the game on the İşlem Logu screen: the card movements and the balance changes, in one permanent list read from the records that the other capabilities keep.

## Requirements

### Requirement: One list of what happened
The İşlem Logu screen SHALL list, newest first and live, every card given, drawn, used, discarded, and transferred, every pack opened, every True Word draft, every Custom Card draft, every word the DM teaches or takes back, every use of a card or True Word that stays in the hand, every LP and GP change, every set change, every change of the player draw mode, every reset of the dice channel, every DM role change made in the app, and every start and end of a fight. It SHALL be read from the holdings (the learned True Words among them), the draws, packs, True Word drafts and Custom Card drafts, the use records, the ledger, the set change records, the table change records, the role change records and the combat change records, so it never disagrees with them. Switching a card or a word active, notes, cost overrides, definition changes and imports SHALL NOT be listed.

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
- **THEN** the log shows the LP change at the top, and no event of the text change

#### Scenario: A set change among the events
- **WHEN** the DM adds 2 LP to Bora, and then renames the set "Ulagal"
- **THEN** the log shows the set change first and the LP change below it

#### Scenario: A mode change among the events
- **WHEN** the DM adds 2 LP to Bora, and then sets the player draw mode to "Filtreli çekiş"
- **THEN** the log shows the mode change first and the LP change below it

#### Scenario: A role change among the events
- **WHEN** the DM adds 2 LP to Bora, and then makes Ayla a DM
- **THEN** the log shows the role change first and the LP change below it

#### Scenario: A fight among the events
- **WHEN** the DM adds 2 LP to Bora, and then starts a fight
- **THEN** the log shows the start of the fight first and the LP change below it

#### Scenario: A dice reset among the events
- **WHEN** the DM adds 2 LP to Bora, and then resets the dice channel
- **THEN** the log shows the reset first and the LP change below it

#### Scenario: Live update
- **WHEN** Ayla uses a card while Bora has the log open
- **THEN** the event appears at the top of Bora's log without a reload

#### Scenario: State changes are not events
- **WHEN** the DM makes a card in Ayla's hand active, or one of her True Words
- **THEN** the log shows no new event

#### Scenario: A taught word is not a card given
- **WHEN** the DM teaches Bora "Aid"
- **THEN** the log shows that the DM taught Bora "Aid", and no event of a card given

#### Scenario: A Custom Card draft among the events
- **WHEN** the DM adds 2 LP to Bora, and then Ayla starts a Custom Card draft
- **THEN** the log shows the draft first and the LP change below it

### Requirement: Log readable by every signed-in user
Every signed-in user SHALL see the whole log, including the events of other players. The DM and the players SHALL see the same events.

#### Scenario: A player reads the log
- **WHEN** Ayla opens the İşlem Logu
- **THEN** she sees the events of every player, including Bora's LP changes

#### Scenario: Draft work in a player's log
- **WHEN** the DM adds the draft "Bard's Encore", edits it, publishes it, and then gives it to Ayla, and both open the İşlem Logu
- **THEN** both see the same events: the card given to Ayla, and nothing of the draft's add, edit or publish

### Requirement: Permanent history
The log SHALL keep every event across sessions and devices. Reloading the application or signing in on another device SHALL show the same events.

#### Scenario: Next session
- **WHEN** a user opens the İşlem Logu a week after an event
- **THEN** that event is still listed

### Requirement: Event rows
Each event SHALL show its time, the name of the user who did it with the DM marked, and what happened, in Turkish. A card event SHALL name the card and the player. When the user who used or discarded a card is its holder, the row's name SHALL name the player, and the sentence SHALL NOT repeat whose hand it was. A used card SHALL show the character, if one was given, and the LP paid, if more than 0. A balance change SHALL show the account, the change, the balance before and after, and the reason.

#### Scenario: A used card
- **WHEN** Ayla uses "Aboleth's Eyes" on "Thorin"
- **THEN** the event shows the time, Ayla, "Aboleth's Eyes", and "Thorin"

#### Scenario: A paid use
- **WHEN** Ayla uses her 2-cost "Aboleth's Eyes" on "Thorin"
- **THEN** the event reads "Aboleth's Eyes kartını Thorin üzerinde kullandı (−2 LP)."

#### Scenario: A free use
- **WHEN** the DM uses Ayla's 3-cost "Aboleth's Eyes" with the amount 0
- **THEN** the event names Ayla and the card, and shows no payment

#### Scenario: The DM discards a card
- **WHEN** the DM discards "Aboleth's Eyes" from Ayla's hand
- **THEN** the event shows the DM's name marked as DM, and reads "Ayla'nın elinden Aboleth's Eyes kartını attı."

#### Scenario: A player discards their own card
- **WHEN** Ayla discards "Aboleth's Eyes" from her own hand
- **THEN** the event shows Ayla's name, not marked as DM, and reads "Aboleth's Eyes kartını attı."

#### Scenario: An LP change
- **WHEN** the DM adds 2 LP to Ayla, who had 5 LP, with the reason "Boss'u yendi"
- **THEN** the event shows the time, the DM's name marked as DM, Ayla, +2 LP, 5 → 7, and "Boss'u yendi"

#### Scenario: A player's own LP change
- **WHEN** Ayla, who had 5 LP, lowers her own LP by 1 with the reason "d20 avantajı"
- **THEN** the event shows the time, Ayla's name not marked as DM, Ayla as the account, −1 LP, 5 → 4, and "d20 avantajı"

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
The log SHALL offer a filter for one user. With a user chosen, it SHALL list only the cards that user received, including the cards drawn into their hand and the packs opened for them, the cards that left their hand, their True Word drafts, their Custom Card drafts, the True Words the DM taught them or took back from them, the uses of their True Words, the changes of their LP, and the changes of their role. Party purse changes, player draw mode changes, dice channel resets and fights SHALL be listed only without a filter.

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

#### Scenario: Mode changes in the filter
- **WHEN** a user chooses Ayla in the filter after the DM set the player draw mode to "Filtreli çekiş"
- **THEN** the mode change is not listed

#### Scenario: Fights in the filter
- **WHEN** a user chooses Ayla in the filter after a fight in which Ayla's "Thorn" took part
- **THEN** the fight's start and end are not listed

#### Scenario: Role changes in the filter
- **WHEN** a DM made Ayla a DM and then took Bora's DM role, and a user chooses Ayla in the filter
- **THEN** the change of Ayla's role is listed, and the change of Bora's role is not

#### Scenario: A dice reset in the filter
- **WHEN** a user chooses Bora in the filter after the DM reset the dice channel
- **THEN** the reset is not listed

#### Scenario: Filtering a Custom Card draft
- **WHEN** the DM started a Custom Card draft for Bora, and a user chooses Bora in the filter
- **THEN** the draft's event is listed

### Requirement: Log states
While the log is loading, the screen SHALL show a loading indicator. If it cannot be loaded, it SHALL show a Turkish error message. When there are no events, it SHALL say so in Turkish.

#### Scenario: No events yet
- **WHEN** a user opens the İşlem Logu before any card was given or any balance changed
- **THEN** the screen says in Turkish that there are no events yet

#### Scenario: Load error
- **WHEN** the events cannot be read
- **THEN** the screen shows a Turkish error message

### Requirement: A draw is one event
A draw SHALL appear as one event that names who drew, the player whose hand the card went to, the card, whether it was a Cursed draw, the LP paid if any, and its filters if any, the DM's or a player's. A set filter SHALL be named by the set's official name, or by its code when no stored set has it. The draw's holding and its ledger entry SHALL NOT appear as separate events.

#### Scenario: A paid draw
- **WHEN** Ayla draws "Aboleth's Eyes" for 1 LP
- **THEN** the log shows one event naming Ayla, "Aboleth's Eyes", and −1 LP, and no separate event for the card given or for the LP change

#### Scenario: The DM draws for a player
- **WHEN** the mode is "Kapalı", and the DM draws a card into Bora's hand with the rarity filter "Rare"
- **THEN** the event shows the DM's name marked as DM, Bora, the card, and the filter "Rare", and no payment

#### Scenario: The DM charges a draw
- **WHEN** the mode is "Filtreli çekiş", and the DM draws "Aboleth's Eyes" into Bora's hand at 2 LP
- **THEN** the event shows the DM's name marked as DM, Bora, "Aboleth's Eyes", and −2 LP, and no separate event for Bora's LP change

#### Scenario: A player's draw at another price
- **WHEN** the mode is "Filtreli çekiş", and Ayla draws "Aboleth's Eyes" at 3 LP
- **THEN** the event shows Ayla, "Aboleth's Eyes", and −3 LP

#### Scenario: A free draw while the mode is on
- **WHEN** the mode is "Kart seçme", and Ayla draws "Aboleth's Eyes" at 0 LP
- **THEN** the event shows Ayla and "Aboleth's Eyes", and no payment

#### Scenario: The DM draws from one set
- **WHEN** the DM draws a card into Bora's hand with the set filter Kesqer and the rarity filter "Rare"
- **THEN** the event shows the filters "Kesqerian Nights" and "Rare"

#### Scenario: A player's filtered draw
- **WHEN** the mode is "Kart seçme", and Ayla draws "Aboleth's Eyes" for 1 LP with a keyword
- **THEN** the event shows Ayla, "Aboleth's Eyes", −1 LP, and the keyword among the filters

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

### Requirement: A kept card's use is one event
A use of a card that stays in the hand SHALL appear as one event, at the time it was used, with the same text as a card that leaves the hand (spec: "Event rows"). Each use SHALL be its own event.

#### Scenario: Using a kept card twice
- **WHEN** Ayla uses her kept 2-cost card "Lucky Coin" on "Thorin", and later again without a character
- **THEN** the log shows "Lucky Coin kartını Thorin üzerinde kullandı (−2 LP)." and, above it, "Lucky Coin kartını kullandı (−2 LP)."

### Requirement: Player draw mode changes are events
Each change of the table's "Oyuncu kart çekişi" (spec: table-settings) SHALL appear as one event, visible to every signed-in user. It names the DM who changed it and the new mode, in Turkish, for example "oyuncu kart çekişini “Filtreli çekiş” yaptı." after the DM's name.

#### Scenario: Turning a mode on
- **WHEN** the DM sets "Filtreli çekiş", and Ayla opens the İşlem Logu
- **THEN** she sees one event naming the DM and "Filtreli çekiş"

#### Scenario: Closing it from the banner
- **WHEN** the DM selects "Kapat" on the banner while the mode is "Kart seçme"
- **THEN** the log shows one event naming the DM and "Kapalı"

### Requirement: Fights are events
Starting a fight with "Başlat" and ending a started fight SHALL each appear as one event, visible to every signed-in user, naming the DM. The start SHALL read "savaşı başlattı: <n> katılımcı." and the end "savaşı bitirdi: <n> tur." after the DM's name. Ending a combat before its fight started SHALL NOT be listed, and neither SHALL rolls, turns, reordering, adding or removing.

#### Scenario: A fight's two events
- **WHEN** the DM starts a fight with 6 combatants and ends it in round 5
- **THEN** the log shows "savaşı başlattı: 6 katılımcı." and, above it, "savaşı bitirdi: 5 tur.", both naming the DM

#### Scenario: A combat given up before the fight
- **WHEN** the DM asks for initiative and then selects "Vazgeç"
- **THEN** the log shows no event for it

### Requirement: Combat change records
Each start and end of a fight SHALL be stored as one record, with the DM, the server time, the step, and the number of combatants or rounds. Every signed-in user SHALL read them. Only the DM SHALL create one, together with the combat change it records. Records SHALL NOT be changed or deleted.

#### Scenario: A player writes a record
- **WHEN** Ayla tries to create a combat change record
- **THEN** the server denies it

#### Scenario: Changing a record
- **WHEN** the DM tries to change the round count of an earlier fight's end
- **THEN** the server denies it

### Requirement: DM role changes are events
Each role change made in the app (spec: dm-roles) SHALL appear as one event, visible to every signed-in user. It SHALL name the DM who made it and, in Turkish after that DM's name, what happened: "<name>'ı DM yaptı." for a grant, "<name>'ın DM'liğini aldı." for a role taken, and "DM'likten çıktı." for a DM stepping down, with the Turkish suffixes that fit the name. Role changes made by the admin script SHALL NOT appear.

#### Scenario: Granting the role
- **WHEN** Gökay makes Ayla a DM, and Bora opens the İşlem Logu
- **THEN** he sees one event with Gökay's name marked as DM and "Ayla'yı DM yaptı."

#### Scenario: Taking the role
- **WHEN** Gökay takes the DM role from Ayla
- **THEN** the log shows one event with Gökay's name and "Ayla'nın DM'liğini aldı."

#### Scenario: Stepping down
- **WHEN** Gökay steps down while Ayla is a DM
- **THEN** the log shows one event with Gökay's name and "DM'likten çıktı."

#### Scenario: The admin script
- **WHEN** an admin makes Bora a DM with the role script
- **THEN** the log shows no new event

### Requirement: Dice channel resets are events
Each reset of the dice channel (spec: dice-rolls, "Resetting the dice channel") SHALL appear as one event, visible to every signed-in user. It SHALL name the DM who reset it and read "zar kanalını sıfırladı: <n> atış." after the DM's name, where <n> is the number of rolls deleted. The rolls themselves SHALL still not be events.

#### Scenario: A reset in the log
- **WHEN** the DM resets a dice channel of 142 rolls, and Ayla opens the İşlem Logu
- **THEN** she sees one event with the DM's name marked as DM and "zar kanalını sıfırladı: 142 atış."

### Requirement: The DM's definition work stays out of the log
The İşlem Logu SHALL NOT list definition changes or imports, for the DM or for a player. This covers adding, editing, publishing, retiring, bringing back and deleting a card or a True Word, and the card, word and picture imports. Their change records SHALL still be written and kept as before (spec: definition-editing, "Change records"). The log SHALL NOT read them.

#### Scenario: An edit
- **WHEN** the DM changes the text of "Aboleth's Eyes", and the DM opens the İşlem Logu
- **THEN** the log shows no event for it, and its change record is stored

#### Scenario: A publish
- **WHEN** the DM publishes the draft "Bard's Encore", and Ayla opens the İşlem Logu
- **THEN** the log shows no event for it

#### Scenario: An import
- **WHEN** the picture import gives pictures to 700 cards
- **THEN** the log shows no event for it

#### Scenario: Game events stay
- **WHEN** the DM edits "Aboleth's Eyes", and then Ahmet uses it and discards another card
- **THEN** the log shows Ahmet's use and discard, and no event of the edit

### Requirement: A Custom Card draft is one event
A Custom Card draft SHALL appear as one event, at the time it started. It names who started it, the user it is for, the card cost, the payment or "ücretsiz", and how it ended: the card made with its effects, or a cancel with its refund. While the draft is open, the event says so and SHALL update live. Its card, payment and refund SHALL NOT appear as separate events.

#### Scenario: A finished draft
- **WHEN** Ayla starts a 3-cost draft for 3 LP and finishes it with Caster, Draw and Gold
- **THEN** the log shows one event naming Ayla, "3-Cost Custom Card", −3 LP, and Caster, Draw and Gold, and no separate event for the card or the LP change

#### Scenario: A cancelled draft
- **WHEN** the DM cancels a 5-cost draft that Bora paid 5 LP for
- **THEN** the draft's event says that the DM cancelled it and refunded 5 LP, and there is no separate event for the refund

#### Scenario: An open draft
- **WHEN** Ayla has started a draft and has made one pick
- **THEN** the event says that Ayla's draft is open, and it changes as soon as the draft ends

#### Scenario: Using the card later
- **WHEN** Ayla uses her Custom Card
- **THEN** the log shows the use as for any card, naming "3-Cost Custom Card"

### Requirement: Player names link to their hands
In an event row, the name of the user who did it and every player the sentence names SHALL be a link to that player's hand on "Oyuncu elleri". The link SHALL cover the name only, and a Turkish suffix after the name SHALL stay outside it. A name SHALL be a link only when the user has a profile.

#### Scenario: The user who did it
- **WHEN** Ayla used "Aboleth's Eyes", and Bora selects "Ayla" at the top of that event
- **THEN** Ayla's hand opens

#### Scenario: A player in the sentence
- **WHEN** the DM discarded "Aboleth's Eyes" from Ayla's hand, and a user opens the log
- **THEN** the event reads "Ayla'nın elinden Aboleth's Eyes kartını attı.", with "Ayla" as a link to Ayla's hand and "'nın elinden" outside the link

#### Scenario: Both players of a transfer
- **WHEN** the DM transferred "Aboleth's Eyes" from Ayla to Bora
- **THEN** "Ayla" and "Bora" in the event are links to their own hands

#### Scenario: An LP change
- **WHEN** the DM added 2 LP to Ayla
- **THEN** "Ayla" before the change is a link to Ayla's hand

#### Scenario: The DM's own name
- **WHEN** the DM gave Ayla a card
- **THEN** the DM's name at the top of the event is a link to the DM's hand, and the DM mark stays beside it

#### Scenario: A user without a profile
- **WHEN** an event names a user whose profile no longer exists
- **THEN** that name reads "İsimsiz oyuncu" and is not a link

### Requirement: Card names link to their Kart geçmişi
In an event row, a card's name, the cards a pack showed among them, SHALL be a link to that card's Kart geçmişi when the viewer may open that page (spec: card-stats, "Who opens a card's page"). Otherwise the name SHALL read as it does without links.

#### Scenario: A used card
- **WHEN** Ayla used "Aboleth's Eyes", and Bora selects "Aboleth's Eyes" in that event
- **THEN** the Kart geçmişi of "Aboleth's Eyes" opens

#### Scenario: The cards a pack showed
- **WHEN** a pack showed "Aboleth's Eyes", "Bard's Encore" and "Visions of Death"
- **THEN** each of the three names in the event's "Sunulan:" line is a link to that card's Kart geçmişi

#### Scenario: A Custom Card
- **WHEN** Ayla finished a Custom Card draft
- **THEN** the card's name in the event is a link to that card's Kart geçmişi

#### Scenario: A hidden card no one holds, for a player
- **WHEN** Ayla discarded a card whose "Listede görünür" is off, no one holds it now, and Bora opens the log
- **THEN** the card's name is shown in bold and is not a link

#### Scenario: The same card for the DM
- **WHEN** the DM opens the log in the same situation
- **THEN** the card's name is a link to its Kart geçmişi

### Requirement: Names without a page are not links
An event row SHALL NOT turn into a link a name that has no page of its own: a True Word, "Import", "Grup kesesi", and "DM" in a sentence such as "DM iptal etti". These SHALL read as they do without links.

#### Scenario: A True Word use
- **WHEN** Ayla used "Abyss"
- **THEN** "Abyss" is shown in bold and is not a link, and "Ayla" at the top is a link to her hand

#### Scenario: A party purse change
- **WHEN** the DM added 5,000 GP to the party purse
- **THEN** "Grup kesesi" is not a link

#### Scenario: A cancelled pack
- **WHEN** the DM cancelled a pack that Bora opened
- **THEN** "DM" in "DM iptal etti" is not a link

### Requirement: Links look like the Kütüphane's card links
The log's links SHALL keep the text's colour and weight at rest, turn gold and underlined on hover, and show a visible focus outline when they have the keyboard focus. At 360 CSS pixels wide, a row with links SHALL wrap as before and the page SHALL NOT scroll horizontally.

#### Scenario: Hover
- **WHEN** the pointer rests on a player's name in an event
- **THEN** the name turns gold and underlined

#### Scenario: Keyboard
- **WHEN** a user moves the focus with Tab through an event
- **THEN** each link in it gets the focus in reading order and shows a focus outline
