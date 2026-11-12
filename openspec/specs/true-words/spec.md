# true-words Specification

## Purpose

Lets players learn True Words through a paid draft of three random words, lets the DM teach a word directly or take one back, and shows each player's learned words and which of them are active.

## Requirements

### Requirement: True Word definitions
Each True Word SHALL have a name, a cost as written (for example "1", "0" or "X"), an effect text, and a status: draft, active or retired (spec: definition-editing). Every signed-in user SHALL be able to read the active and retired words. Only the DM SHALL be able to read a draft. Only the import script and the DM SHALL write words. A retired word SHALL stay with the players who know it, with its last stored definition. A word that is not active SHALL never be offered in a draft or taught.

#### Scenario: Reading the words
- **WHEN** a signed-in user opens the True Words screen after the words were imported
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
- **THEN** no draft offers it, the DM cannot teach it, and no player's True Words screen lists it

### Requirement: True Words screen
The True Words screen SHALL list every active word, sorted by name, with its name, its cost shown as "<cost> LP", and its visible text. Text in square brackets SHALL be hidden, as in the card library. A player SHALL see the screen for themselves. The DM SHALL choose the player. The words the chosen player knows SHALL be marked "Biliyor". The DM SHALL also get "+ True Word ekle", "✎ Düzenle" on each word, and the status filter, starting at "Yayında".

#### Scenario: A player's view
- **WHEN** Ayla, who knows "Abyss", opens the True Words screen
- **THEN** every active word is listed, and "Abyss" is marked "Biliyor"

#### Scenario: The DM chooses a player
- **WHEN** the DM chooses Bora on the True Words screen
- **THEN** the words Bora knows are marked, and the draft controls act for Bora

#### Scenario: An X cost
- **WHEN** the list shows "Dragon", whose cost is "X"
- **THEN** its cost reads "X LP"

#### Scenario: The DM's drafts
- **WHEN** the DM chooses "Taslak" in the status filter
- **THEN** only the draft words are listed, each marked "Taslak", with its "✎ Düzenle" control

#### Scenario: A player's controls
- **WHEN** Ayla opens the True Words screen
- **THEN** she sees no status filter, no "+ True Word ekle" and no "✎ Düzenle"

### Requirement: Starting a draft
A player SHALL be able to start a True Word draft for themselves, and the DM for any player. A draft SHALL need at least 3 active words that the player does not know. It SHALL show 3 of them, each with the same chance, in random order. With fewer than 3, the start control SHALL be disabled with a Turkish note, and no draft SHALL start.

#### Scenario: Starting a draft
- **WHEN** Ayla starts a draft for herself
- **THEN** the draft shows 3 words that Ayla does not know

#### Scenario: Too few words left
- **WHEN** only 2 active words remain that Bora does not know
- **THEN** the start control is disabled with the note "Draft için en az 3 öğrenilmemiş True Word gerekli."

#### Scenario: A player starts a draft for another player
- **WHEN** Ayla tries to start a draft for Bora
- **THEN** the server denies it

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
When the DM starts a draft, the amount SHALL start at the draft's price, and the DM SHALL be able to change it to any whole number from 0 to the player's LP. The amount SHALL be taken from that player's LP, in the same step that starts the draft. With 0 the draft SHALL start for free. A draft SHALL never be paid with GP.

#### Scenario: The DM keeps the price
- **WHEN** the DM starts a draft for Bora, who knows 1 word and has 4 LP, without changing the amount
- **THEN** Bora pays 2 LP and has 2 LP

#### Scenario: A free draft
- **WHEN** the DM starts a draft for Bora with the amount 0
- **THEN** the draft starts, and Bora's LP does not change

#### Scenario: More than the player has
- **WHEN** the DM enters 5 for Bora, who has 4 LP
- **THEN** the draft cannot be started, with a Turkish message naming Bora's LP

### Requirement: One open draft per player
A player SHALL have at most one open draft. While it is open, no other draft SHALL be started for that player, by them or by the DM. Drafts of different players SHALL be open at the same time.

#### Scenario: A second draft
- **WHEN** Ayla has an open draft, and the DM tries to start another one for her
- **THEN** the start control leads to her open draft instead, and the server denies a second draft

#### Scenario: Two players at once
- **WHEN** Ayla has an open draft, and Bora starts one
- **THEN** Bora's draft starts

### Requirement: Learning a word
The draft's player and the DM SHALL be able to learn one of the 3 words it shows. The word SHALL join the player's True Words, inactive, and the draft SHALL end, in one step. A shown word that the player has come to know since the draft started SHALL be marked and SHALL NOT be learnable. Other players SHALL NOT act on the draft.

#### Scenario: Learning
- **WHEN** Ayla learns "Abyss" from her draft
- **THEN** "Abyss" is among her True Words, inactive, and the draft has ended

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
Closing the draft view, reloading, or losing the connection SHALL NOT end a draft. While a draft is open, the player's True Words tab and the True Words screen SHALL show it, with its 3 words, live, to every signed-in user. The player and the DM SHALL be able to return to it and act.

#### Scenario: Reloading during a draft
- **WHEN** Ayla reloads the application while her draft is open
- **THEN** her True Words tab shows the open draft with the same 3 words, and she can still learn one

#### Scenario: Watching a draft
- **WHEN** Bora has Ayla's True Words tab open while she learns "Abyss"
- **THEN** Bora sees the draft end and "Abyss" appear among her words without a reload

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
The DM SHALL be able to teach any player any active word that player does not know, without a draft and without charging LP. It is done from a "+ True Word öğret" dialog on the player's True Words tab, which searches the words by name and text. The word SHALL join the player's True Words, inactive. Players SHALL NOT teach words.

#### Scenario: Teaching a word
- **WHEN** the DM teaches Bora "Aid"
- **THEN** "Aid" is among Bora's True Words, and Bora's LP does not change

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
The DM SHALL be able to switch any word a player knows active or inactive. Players SHALL NOT change whether a word is active. Active words SHALL be marked on the True Words tab. Switching a word active SHALL stay possible while a pack is open.

#### Scenario: Switching a word on
- **WHEN** the DM makes Ayla's "Abyss" active
- **THEN** "Abyss" is marked active on every device

#### Scenario: A player switches a word
- **WHEN** Ayla tries to make her own "Abyss" active
- **THEN** the server denies it

### Requirement: Learned word records
Each word a player learns SHALL be recorded with the word, the player, when, by whom, how (from a draft, naming it, or taught by the DM), and whether it is active. Once taken back, the record SHALL hold when and by whom. A record SHALL never be deleted, and a closed record SHALL never change. Every signed-in user SHALL be able to read every record.

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
- its cost and how it was learned, as labels
- who knows it, as "<name> biliyor"
- without a picture, its name and visible text

Under a picture, the word's name and text SHALL NOT be written again. Screen readers still hear them.

In a window at least 1024 CSS pixels wide, the details SHALL show in a panel labelled "Seçili True Word" at the right of the tab. Without a selection, that panel SHALL show an empty slot with "Bir True Word seç" and "Bir True Word'e tıkla, ayrıntıları burada görünsün." In a narrower window, the details SHALL open in a dialog. The tab SHALL link to the True Words screen for that player. With no word learned, it SHALL say "Henüz True Word öğrenilmedi."

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
- **WHEN** the DM selects "Abyss" on Ayla's True Words tab
- **THEN** the details offer, under "DM araçları", switching it active and taking it back

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
Starting, learning, skipping, cancelling, teaching, and taking back SHALL require a network connection. Offline, the application SHALL show a Turkish message and change nothing.

#### Scenario: Starting offline
- **WHEN** Ayla tries to start a draft without a connection
- **THEN** she sees a Turkish message, and no draft starts and no LP changes
