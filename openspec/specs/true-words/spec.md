# true-words Specification

## Purpose

Lets players learn True Words through a paid draft of three random words on the Kütüphane's True Words tab, lets the DM teach a word directly or take one back, and shows each player's learned words and which of them are active.

## Requirements

### Requirement: True Word definitions
Each True Word SHALL have a name, a cost as written (for example "1", "0" or "X"), an effect text, a status: draft, active or retired (spec: definition-editing), and the behavior flags of a True Word (spec: definition-editing, "Behavior flags"). Every signed-in user SHALL be able to read the active and retired words. Only the DM SHALL be able to read a draft. Only the import script and the DM SHALL write words. A retired word SHALL stay with the players who know it, with its last stored definition. A word that is not active SHALL never be offered in a draft or taught. A word whose "Draft'ta çıkar" is off SHALL never be offered in a draft, and the DM SHALL still be able to teach it.

#### Scenario: Reading the words
- **WHEN** a signed-in user opens the Kütüphane's True Words tab after the words were imported
- **THEN** they see every active word with its name, cost and text

#### Scenario: Writing a word from the application
- **WHEN** a signed-in player tries to create, change or delete a word
- **THEN** the server denies it

#### Scenario: A player reads a draft
- **WHEN** a signed-in player tries to read the draft word "Echo"
- **THEN** the server denies it

#### Scenario: A retired word
- **WHEN** the DM retires "Abyss", which Ayla knows
- **THEN** "Abyss" stays among Ayla's True Words, and no draft offers it and the DM cannot teach it

#### Scenario: A draft word
- **WHEN** "Echo" is a draft
- **THEN** no draft offers it, the DM cannot teach it, and no player's True Words tab lists it

#### Scenario: A word kept out of drafts
- **WHEN** the active word "Justice" has "Draft'ta çıkar" off
- **THEN** no draft offers it, and the DM can teach it

### Requirement: The Kütüphane's True Words tab
The Kütüphane's True Words tab SHALL list every active word, sorted by name, as every tab lists its definitions (spec: card-library). A player SHALL see the tab for themselves. The DM SHALL choose the player in "Kimin için", kept in the URL. The words the chosen player knows SHALL be marked "Biliyor" on their face and list row. The draft section above the list SHALL say how many words that player knows; the list's count line SHALL NOT repeat it. The chosen player's draft controls and open draft SHALL show above the list. A player's tab SHALL leave out the words whose "Listede görünür" is off (spec: card-library, "Cards not listed for players"). The DM SHALL also get "+ True Word ekle", "✎ Düzenle" on each word, and the status filter (spec: card-library, "The DM's status filter").

#### Scenario: A player's view
- **WHEN** Ayla, who knows "Abyss", opens the True Words tab
- **THEN** every active word is listed, "Abyss" is marked "Biliyor", and the draft section says "Ayla · 1 True Word biliyor"

#### Scenario: The DM chooses a player
- **WHEN** the DM chooses Bora in "Kimin için"
- **THEN** the words Bora knows are marked, the draft controls act for Bora, and the address names Bora

#### Scenario: An X cost
- **WHEN** the tab shows "Dragon", whose cost is "X"
- **THEN** its face and its list row show the cost "X"

#### Scenario: The DM's drafts
- **WHEN** the DM chooses "Taslak" in the status filter of the True Words tab
- **THEN** only the draft words are listed, each marked "Taslak", with its "✎ Düzenle" control

#### Scenario: A player's controls
- **WHEN** Ayla opens the True Words tab
- **THEN** she sees no "Kimin için", no status filter, no "+ True Word ekle" and no "✎ Düzenle"

#### Scenario: A hidden word
- **WHEN** the active word "Justice" has "Listede görünür" off, and Ayla opens the True Words tab
- **THEN** "Justice" is not listed, and the DM's True Words tab lists it marked "🔒 DM"

#### Scenario: The DM edits a word
- **WHEN** the DM selects "✎ Düzenle" on the face of "Abyss"
- **THEN** the True Word form opens for "Abyss"

#### Scenario: An open draft on the tab
- **WHEN** Ayla has an open draft and opens the True Words tab
- **THEN** her open draft shows above the list with its 3 words

### Requirement: Starting a draft
A player SHALL be able to start a True Word draft for themselves, and the DM for any player. A draft SHALL need at least 3 active words that the player does not know and whose "Draft'ta çıkar" is on. It SHALL show 3 of them, each with the same chance, in random order. With fewer than 3, the start control SHALL be disabled with a Turkish note, and no draft SHALL start.

#### Scenario: Starting a draft
- **WHEN** Ayla starts a draft for herself
- **THEN** the draft shows 3 words that Ayla does not know

#### Scenario: Too few words left
- **WHEN** only 2 active words remain that Bora does not know
- **THEN** the start control is disabled with the note "Draft için en az 3 öğrenilmemiş True Word gerekli."

#### Scenario: A player starts a draft for another player
- **WHEN** Ayla tries to start a draft for Bora
- **THEN** the server denies it

#### Scenario: Words kept out of drafts
- **WHEN** 4 active words remain that Bora does not know, and 2 of them have "Draft'ta çıkar" off
- **THEN** the start control is disabled with the same note

### Requirement: Draft price
A draft SHALL cost 1 LP plus the number of True Words the player knows when it starts. A player SHALL pay exactly that from their own LP, in the same step that starts the draft. A player with less LP SHALL NOT start a draft. The control is then disabled with a Turkish note naming the price and their LP. The server SHALL deny any other amount from a player.

#### Scenario: Paying for a draft
- **WHEN** Ayla, who knows 2 words and has 5 LP, starts a draft
- **THEN** she pays 3 LP, and she has 2 LP on every device

#### Scenario: The first draft
- **WHEN** Bora, who knows no word, starts a draft
- **THEN** he pays 1 LP

#### Scenario: Not enough LP
- **WHEN** Ayla knows 3 words and has 2 LP
- **THEN** her start control is disabled with a note that the draft costs 4 LP and she has 2 LP

#### Scenario: A wrong amount
- **WHEN** Ayla, who knows 2 words, writes a draft of her own that pays 1 LP
- **THEN** the server denies it

### Requirement: The DM chooses the amount
When the DM starts a draft, for a player or for a DM, the DM's own hand included, the amount SHALL start at the draft's price, and the DM SHALL be able to change it to any whole number from 0 to that user's LP. The amount SHALL be taken from that user's LP, in the same step that starts the draft. With 0 the draft SHALL start for free. A draft SHALL never be paid with GP.

#### Scenario: The DM keeps the price
- **WHEN** the DM starts a draft for Bora, who knows 1 word and has 4 LP, without changing the amount
- **THEN** Bora pays 2 LP and has 2 LP

#### Scenario: A free draft
- **WHEN** the DM starts a draft for Bora with the amount 0
- **THEN** the draft starts, and Bora's LP does not change

#### Scenario: More than the player has
- **WHEN** the DM enters 5 for Bora, who has 4 LP
- **THEN** the draft cannot be started, with a Turkish message naming Bora's LP

#### Scenario: A draft for the DM's own hand
- **WHEN** the DM, who knows no words and has 3 LP, starts a draft for themselves without changing the amount
- **THEN** the DM pays 1 LP and has 2 LP

### Requirement: One open draft per player
A player SHALL have at most one open draft. While it is open, no other draft SHALL be started for that player, by them or by the DM. Drafts of different players SHALL be open at the same time.

#### Scenario: A second draft
- **WHEN** Ayla has an open draft, and the DM tries to start another one for her
- **THEN** the start control leads to her open draft instead, and the server denies a second draft

#### Scenario: Two players at once
- **WHEN** Ayla has an open draft, and Bora starts one
- **THEN** Bora's draft starts

### Requirement: Learning a word
The draft's player and the DM SHALL be able to learn one of the 3 words it shows. The word SHALL join the player's True Words, active when its "Elde etkili" is on and inactive otherwise, and the draft SHALL end, in one step. A shown word that the player has come to know since the draft started SHALL be marked and SHALL NOT be learnable. Other players SHALL NOT act on the draft.

#### Scenario: Learning
- **WHEN** Ayla learns "Abyss", whose "Elde etkili" is off, from her draft
- **THEN** "Abyss" is among her True Words, inactive, and the draft has ended

#### Scenario: Learning a held word
- **WHEN** Ayla learns "Justice", whose "Elde etkili" is on, from her draft
- **THEN** "Justice" is among her True Words, active

#### Scenario: The DM learns for the player
- **WHEN** the DM learns "Aid" from Bora's open draft
- **THEN** "Aid" is among Bora's True Words, and the draft names the DM as the one who ended it

#### Scenario: Another player
- **WHEN** Bora tries to learn a word from Ayla's draft
- **THEN** the server denies it

#### Scenario: A word taught meanwhile
- **WHEN** the DM teaches Ayla "Abyss" while her open draft shows it
- **THEN** her draft marks "Abyss" as known, and she can learn only one of the other two

### Requirement: Skipping a draft
The draft's player and the DM SHALL be able to skip the draft with "Pas Geç". The draft SHALL end without a word, and its payment SHALL NOT be refunded.

#### Scenario: Skipping
- **WHEN** Ayla, who paid 3 LP for her draft, chooses "Pas Geç"
- **THEN** the draft ends without a word, and her LP stays as it was after the payment

### Requirement: The DM cancels a draft
Only the DM SHALL be able to cancel an open draft, after a confirmation. The draft SHALL end without a word, and its payment SHALL be refunded in full to the player's LP, in the same step.

#### Scenario: Cancelling with a refund
- **WHEN** the DM cancels Ayla's open draft, for which she paid 3 LP
- **THEN** the draft ends without a word, and Ayla gets 3 LP back

#### Scenario: Cancelling a free draft
- **WHEN** the DM cancels a draft that was started for free
- **THEN** the draft ends, and no LP changes

#### Scenario: A player cancels
- **WHEN** Ayla tries to cancel her own draft
- **THEN** the server denies it

### Requirement: An open draft survives
Closing the draft view, reloading, or losing the connection SHALL NOT end a draft. While a draft is open, the player's True Words tab on the hand screen and the Kütüphane's True Words tab, with that player chosen, SHALL show it, with its 3 words, live, to every signed-in user. The player and the DM SHALL be able to return to it and act.

#### Scenario: Reloading during a draft
- **WHEN** Ayla reloads the application while her draft is open
- **THEN** her True Words tab shows the open draft with the same 3 words, and she can still learn one

#### Scenario: Watching a draft
- **WHEN** Bora has Ayla's True Words tab open while she learns "Abyss"
- **THEN** Bora sees the draft end and "Abyss" appear among her words without a reload

#### Scenario: The DM in the Kütüphane
- **WHEN** Ayla has an open draft, and the DM chooses Ayla in the Kütüphane's True Words tab
- **THEN** the tab shows her open draft, and the DM can act on it

### Requirement: Drafts do not hold the table
Two players SHALL be able to know the same word. A draft SHALL NOT keep its words from other players' drafts. An open draft SHALL NOT stop anyone from drawing, opening a pack, moving a card or changing a balance.

#### Scenario: The same word for two players
- **WHEN** Ayla knows "Abyss", and Bora learns "Abyss" from his draft
- **THEN** both know "Abyss"

#### Scenario: Drawing during a draft
- **WHEN** Bora draws a card while Ayla's draft is open
- **THEN** the draw is made

### Requirement: No word twice
A player SHALL never know the same word twice, however they learned it. The server SHALL deny learning or teaching a word that the player already knows.

#### Scenario: Teaching a known word
- **WHEN** the DM tries to teach Ayla "Abyss", which she knows
- **THEN** the teach dialog does not offer it, and the server denies such a write

### Requirement: The DM teaches a word
The DM SHALL be able to teach any player any active word that player does not know, whatever its flags, without a draft and without charging LP. It is done from "+ Kart ver" on the hand screen (spec: card-holdings, "The DM gives cards"). The "+ True Word öğret" control on the player's True Words tab SHALL open "+ Kart ver" for that player with the kind "True Word" chosen. The word SHALL join the player's True Words, active when its "Elde etkili" is on and inactive otherwise. Players SHALL NOT teach words.

#### Scenario: Teaching a word
- **WHEN** the DM teaches Bora "Aid"
- **THEN** "Aid" is among Bora's True Words, and Bora's LP does not change

#### Scenario: Teaching a hidden word
- **WHEN** the DM teaches Bora "Justice", whose "Listede görünür" and "Draft'ta çıkar" are off
- **THEN** "Justice" is among Bora's True Words

#### Scenario: A hidden word is offered
- **WHEN** the DM opens "+ Kart ver" on Bora's hand and chooses the kind "True Word"
- **THEN** "Justice", whose "Listede görünür" and "Draft'ta çıkar" are off, is listed and can be selected

#### Scenario: The shortcut on the True Words tab
- **WHEN** the DM selects "+ True Word öğret" on the True Words tab of Bora's hand
- **THEN** "+ Kart ver" opens for Bora with the kind "True Word" chosen, and lists only active True Words

#### Scenario: A taught word stays out of drafts
- **WHEN** the DM teaches Bora "Justice", whose "Draft'ta çıkar" is off, and Ayla starts a draft
- **THEN** "Justice" is not among the 3 words of Ayla's draft

#### Scenario: A player teaches a word
- **WHEN** Ayla tries to add a word to her own True Words without a draft
- **THEN** the server denies it

### Requirement: The DM takes back a word
The DM SHALL be able to take back a word that a player knows, after a confirmation, to correct a mistake. The word SHALL leave the player's True Words. Its record SHALL be closed with when and by whom, never deleted. A player SHALL NOT take back or forget a word. A word taken back SHALL be learnable and teachable again.

#### Scenario: Taking back a word
- **WHEN** the DM takes back "Abyss" from Ayla
- **THEN** "Abyss" is no longer among her True Words, and its record shows when the DM took it back

#### Scenario: A player forgets a word
- **WHEN** Ayla tries to remove "Abyss" from her True Words
- **THEN** the server denies it

#### Scenario: Learning it again
- **WHEN** the DM teaches Ayla "Abyss" after taking it back
- **THEN** "Abyss" is among her True Words again, with a new record

### Requirement: Active True Words
The DM SHALL be able to switch a word a player knows active or inactive when the word's "Elde etkili" is on. A word without it SHALL have no switch, and SHALL NOT count or show as active. Players SHALL NOT change whether a word is active. Active words SHALL be marked on the True Words tab. Switching a word active SHALL stay possible while a pack is open.

#### Scenario: Switching a word on
- **WHEN** the DM makes Ayla's "Justice", whose "Elde etkili" is on, active
- **THEN** "Justice" is marked active on every device

#### Scenario: A word without a held effect
- **WHEN** the DM opens the details of Ayla's "Abyss", whose "Elde etkili" is off
- **THEN** the details offer no "Aktif et", and the server denies switching it active

#### Scenario: The flag is turned off
- **WHEN** the DM turns off "Elde etkili" of "Justice" while it is active in Ayla's hand
- **THEN** "Justice" no longer shows as active anywhere

#### Scenario: A player switches a word
- **WHEN** Ayla tries to make her own "Justice" active
- **THEN** the server denies it

### Requirement: Learned word records
Each word a player learns SHALL be recorded with the word, the player, when, by whom, how (from a draft, naming it, or taught by the DM), whether it is active, its note, and its cost in that hand. Once taken back, the record SHALL hold when and by whom. A record SHALL never be deleted, and a closed record SHALL never change. Every signed-in user SHALL be able to read every record.

#### Scenario: Recording a learned word
- **WHEN** Ayla learns "Abyss" from her draft
- **THEN** a record names "Abyss", Ayla, the time, Ayla as the learner, and the draft

#### Scenario: Changing a closed record
- **WHEN** the DM tries to make a taken-back word active
- **THEN** the server denies it

### Requirement: Draft records
Each draft SHALL be stored with these fields:
- the player, who started it, and when
- the 3 words shown, in order
- the payment: an LP amount, or none
- its status: open, learned, skipped or cancelled
- when and by whom it ended
- the word learned, with its record
- the refund

An ended draft SHALL never change. No draft SHALL be deleted. Every signed-in user SHALL be able to read every draft.

#### Scenario: Recording a paid draft
- **WHEN** Ayla starts a draft for 3 LP
- **THEN** a draft record names Ayla as the player and the starter, the time, the 3 words, and a payment of 3 LP, with the status open

#### Scenario: Changing an ended draft
- **WHEN** any signed-in user, including the DM, tries to change or delete an ended draft
- **THEN** the server denies it

### Requirement: Draft steps agree
The server SHALL accept each draft step only together with the writes that go with it:
- a draft's start, with its payment and the player's new LP
- learning a word, with the word's new record
- a cancel, with its refund and the player's new LP

It SHALL deny a step that does not agree with the others.

#### Scenario: A start without its payment
- **WHEN** Ayla writes a draft of her own that names a payment, without the ledger entry and her new LP
- **THEN** the server denies it

#### Scenario: A learned word without its draft
- **WHEN** Ayla writes a learned word record that names her open draft, without ending the draft
- **THEN** the server denies it

### Requirement: True Words tab on the hand screen
The hand screen SHALL have a "✦ True Words" tab after "♠ Kartlar". The True Words tab SHALL list the player's words in the order learned, live, each as its picture with its active state, or, without a picture, as its name and visible text. Selecting a word SHALL show its details, in the same frame as a card's details:
- its picture large, glowing purple while active, with an "Aktif" badge at the top
- its cost in this hand and how it was learned, as labels
- who knows it, as "<name> biliyor"
- its note on cream paper, editable by the player and the DM
- without a picture, its name and visible text

Under a picture, the word's name and text SHALL NOT be written again. Screen readers still hear them.

In a window at least 1024 CSS pixels wide, the details SHALL show in a panel labelled "Seçili True Word" at the right of the tab. Without a selection, that panel SHALL show an empty slot with "Bir True Word seç" and "Bir True Word'e tıkla, ayrıntıları burada görünsün." In a narrower window, the details SHALL open in a dialog. The tab's "✦ True Word Draft" link SHALL open the Kütüphane's True Words tab for that player. With no word learned, it SHALL say "Henüz True Word öğrenilmedi."

#### Scenario: Opening the tab
- **WHEN** a user opens the True Words tab of Ayla's hand, and Ayla learned "Aid" and then "Abyss", which both have pictures
- **THEN** the tab shows the picture of "Aid" first and of "Abyss" second

#### Scenario: A word without a picture
- **WHEN** Ayla knows "Abyss", which has no picture, and a user opens her True Words tab
- **THEN** "Abyss" shows its name and its text

#### Scenario: Selecting a word on a desktop
- **WHEN** a user selects the active "Aid", which Ayla learned from a draft and which costs 1, on the True Words tab of Ayla's hand in a window 1280 CSS pixels wide
- **THEN** the "Seçili True Word" panel shows the "Aktif" badge, the picture of "Aid" large and glowing purple, the labels "1 LP" and "Draft'tan öğrendi", and "Ayla biliyor", and no dialog opens

#### Scenario: No word selected
- **WHEN** a user opens the True Words tab of Ayla's hand in a wide window
- **THEN** the panel shows an empty slot with "Bir True Word seç"

#### Scenario: Selecting a word on a phone
- **WHEN** a user selects "Aid" on the True Words tab of Ayla's hand on a phone
- **THEN** its details open in a dialog

#### Scenario: No words yet
- **WHEN** a user opens the True Words tab of Bora's hand, and Bora knows no word
- **THEN** the tab says "Henüz True Word öğrenilmedi."

#### Scenario: The DM's details
- **WHEN** the DM selects "Justice", whose "Elde etkili" is on, on Ayla's True Words tab
- **THEN** the details offer, under "DM araçları", the cost in this hand with "temel: <cost>", switching it active, and taking it back

#### Scenario: A word without a held effect in the DM's details
- **WHEN** the DM selects "Abyss", whose "Elde etkili" is off, on Ayla's True Words tab
- **THEN** "DM araçları" offers the cost and taking it back, and no switch

#### Scenario: A note
- **WHEN** Ayla's "Abyss" has the note "Boss savaşında kullan", and a user selects it
- **THEN** the details show the note on cream paper

#### Scenario: The DM follows the draft link
- **WHEN** the DM selects "✦ True Word Draft" on the True Words tab of Bora's hand
- **THEN** the Kütüphane opens on its True Words tab with Bora chosen

#### Scenario: A player follows the draft link
- **WHEN** Ayla selects "✦ True Word Draft" on her own True Words tab
- **THEN** the Kütüphane opens on its True Words tab for Ayla

### Requirement: Active True Words above the hand
On the Kartlar tab, the pictures of the player's active words SHALL peek out above the top of the hand, overlapping a little, in the order learned, live. A word without a picture SHALL show ✦ and its name there. Selecting one SHALL show it large with its name, only on that device and without writing anything. With no active word, nothing SHALL show there. The page SHALL NOT scroll sideways because of them.

#### Scenario: Two active words
- **WHEN** Ayla knows "Aid", "Abyss" and "Bind", and "Aid" and "Bind" are active
- **THEN** the pictures of "Aid" and "Bind" peek out above her hand, in that order, and "Abyss" is not there

#### Scenario: Switching a word off
- **WHEN** the DM switches Ayla's "Aid" inactive while Bora has her hand open
- **THEN** "Aid" leaves the top of her hand on Bora's screen without a reload

#### Scenario: Showing a word large
- **WHEN** a user selects "Bind" above Ayla's hand
- **THEN** "Bind" shows large with its name, and "✕ Kapat", Escape or a click outside closes it

#### Scenario: No active word
- **WHEN** a user opens Bora's hand, and none of his words is active
- **THEN** nothing peeks out above his hand

#### Scenario: Phone width
- **WHEN** Ayla's hand with three active words is shown 360 CSS pixels wide
- **THEN** the words peek out above the hand, and the page has no horizontal scrollbar

### Requirement: True Word steps need a connection
Starting, learning, skipping, cancelling, teaching, taking back, and using a word SHALL require a network connection. Offline, the application SHALL show a Turkish message and change nothing.

#### Scenario: Starting offline
- **WHEN** Ayla tries to start a draft without a connection
- **THEN** she sees a Turkish message, and no draft starts and no LP changes

#### Scenario: Using offline
- **WHEN** Ayla tries to use "Abyss" without a connection
- **THEN** she sees a Turkish message, no use is recorded, and her LP does not change

### Requirement: Using a True Word
The player who knows a word, and the DM, SHALL be able to use it with "Kullan", across the word's details. Using SHALL pay the word's cost from the LP of the user who knows it, a DM included, priced as a card's use is (spec: card-holdings, "The price of a use"). The player and the DM have the same limits and amount choice as for a card. The word SHALL stay with the player, and SHALL be usable any number of times. Other players SHALL NOT use it.

#### Scenario: A player uses a word
- **WHEN** Ayla, who has 6 LP, uses "Abyss", which costs 5
- **THEN** she has 1 LP on every device, and she still knows "Abyss"

#### Scenario: Using it again
- **WHEN** Ayla, who now has 1 LP, opens the use step of "Abyss" again
- **THEN** the confirm control is disabled, and a Turkish note says that it costs 5 LP and Ayla has 1 LP

#### Scenario: An X word
- **WHEN** Ayla uses a word that costs "X" and enters 2
- **THEN** she pays 2 LP

#### Scenario: A free word
- **WHEN** Ayla uses "Chaos", which costs 0
- **THEN** the use is recorded, and her LP does not change

#### Scenario: The DM uses a word for free
- **WHEN** the DM uses Ayla's "Abyss" with the amount 0
- **THEN** the use is recorded, and her LP does not change

#### Scenario: Another player
- **WHEN** Bora opens the details of Ayla's "Abyss"
- **THEN** he sees no "Kullan", and the server denies a use of it by him

#### Scenario: A word taken back
- **WHEN** a user tries to record a use of a word that the DM took back from Ayla
- **THEN** the server denies it

#### Scenario: A retired word
- **WHEN** Ayla uses "Abyss" after the DM retired it
- **THEN** the use is recorded, and she pays its cost

#### Scenario: While a pack is open
- **WHEN** a pack is open, and Ayla opens the details of "Abyss"
- **THEN** "Kullan" is disabled with the Turkish note that a pack is open

#### Scenario: A word in the DM's own hand
- **WHEN** the DM, who has 6 LP and knows "Abyss", which costs 5, uses it and keeps the amount 5
- **THEN** the DM has 1 LP, and the use is recorded as a True Word use payment

### Requirement: The use step of a word
The use step of a word SHALL show its price and the player's LP before and after the use, as a card's use step does (spec: card-holdings, "The use step shows the payment"). It SHALL ask on which character the word was used, with the same list as a card's use step (spec: card-holdings, "Choosing the character of a use", "A typed character"), the player's group first. When the word's "Kullanınca efekt bırakır" is on, it SHALL offer "Aktif efekt olarak ekle" as a card's does; otherwise it SHALL NOT. After the use, the details SHALL stay open and say in Turkish that the word was used, with the amount paid.

#### Scenario: A fixed price
- **WHEN** Ayla, who has 6 LP, opens the use step of "Abyss"
- **THEN** the step shows "5 LP", "6 LP → 1 LP", and "Kullanımı onayla (5 LP)"

#### Scenario: After the use
- **WHEN** Ayla confirms the use of "Abyss"
- **THEN** the details of "Abyss" stay open and say that it was used for 5 LP

#### Scenario: Using a word on a character
- **WHEN** Ayla chooses "Thorin" in the use step of "Abyss", keeps "Aktif efekt olarak ekle" checked, and confirms
- **THEN** the use names "Thorin", and "Thorin" has the effect of "Abyss" marked "True Word" from a use

#### Scenario: No character
- **WHEN** Ayla confirms the use of "Abyss" with "Karakter seçilmedi"
- **THEN** the use names no character, and no effect is added

#### Scenario: A word that leaves no effect
- **WHEN** Ayla chooses "Thorin" in the use step of "Aid", whose "Kullanınca efekt bırakır" is off
- **THEN** the step shows no "Aktif efekt olarak ekle", and the use adds no effect

### Requirement: Word use records
Each use of a word SHALL be recorded with the word, its name at the time, the player, the player's record of the word, who used it, when, the LP paid, and the ledger entry of the payment when it is more than 0. A use on a character SHALL also record the character's name at the time, and the character when it was chosen from the list. A use record SHALL never be changed or deleted. Every signed-in user SHALL be able to read every use record. Signed-out requests SHALL be denied.

#### Scenario: Recording a use
- **WHEN** Ayla uses "Abyss" for 5 LP
- **THEN** a use record holds "Abyss", Ayla, her record of the word, Ayla as the user, the time, 5 LP, and the ledger entry

#### Scenario: Recording the character
- **WHEN** Ayla uses "Abyss" on "Thorin", chosen from the list
- **THEN** the use record also holds "Thorin" and that character

#### Scenario: A forged character
- **WHEN** a signed-in user records a use on "Thorin" with the recorded name "Elara", or on an archived character
- **THEN** the server denies it

#### Scenario: An old use record
- **WHEN** a user opens the İşlem Logu, and "Abyss" was used before characters could be named
- **THEN** the event shows the use without a character

#### Scenario: Changing a use
- **WHEN** any signed-in user, including the DM, tries to change or delete a use record
- **THEN** the server denies it

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user tries to read a use record
- **THEN** the server denies it

### Requirement: A word use agrees with its payment
The server SHALL accept a word use only together with its payment and the player's new LP, when it pays more than 0. It SHALL deny a use whose amount disagrees with its ledger entry, a player's use that pays anything other than the price, and a use of a word that the player does not know.

#### Scenario: A forged amount
- **WHEN** Ayla records a use of "Abyss", which costs 5, paying 1 LP
- **THEN** the server denies it

#### Scenario: A use without its payment
- **WHEN** a signed-in user records a 5 LP use of "Abyss" for Ayla without lowering her LP in the same write
- **THEN** the server denies it

#### Scenario: A word the player does not know
- **WHEN** Ayla records a use of "Aid", which she has not learned
- **THEN** the server denies it

### Requirement: Notes and costs on known words
The player who knows a word and the DM SHALL be able to write a note on it, up to 1000 characters, as on a held card (spec: card-holdings, "Card notes"). The DM SHALL be able to set a cost for the word in that player's hand, up to 10 characters, as for a held card (spec: card-holdings, "Cost override"). That cost SHALL be the price of the word's uses in that hand. Other players SHALL NOT change either.

#### Scenario: A player writes a note
- **WHEN** Ayla writes "Boss savaşında kullan" on her "Abyss" and leaves the field
- **THEN** the note is saved and shown in the details of "Abyss" on every device

#### Scenario: A cheaper word
- **WHEN** the DM sets the cost of Ayla's "Abyss", which costs 5, to "3", and Ayla uses it
- **THEN** she pays 3 LP

#### Scenario: Another player's note
- **WHEN** Bora tries to change the note on Ayla's "Abyss"
- **THEN** the server denies it
