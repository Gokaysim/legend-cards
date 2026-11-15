# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: True Word definitions
Each True Word SHALL have a name, a cost as written (for example "1", "0" or "X"), an effect text, a status: draft, active or retired (spec: definition-editing), and the behavior flags of a True Word (spec: definition-editing, "Behavior flags"). Every signed-in user SHALL be able to read the active and retired words. Only the DM SHALL be able to read a draft. Only the import script and the DM SHALL write words. A retired word SHALL stay with the players who know it, with its last stored definition. A word that is not active SHALL never be offered in a draft or taught. A word whose "Draft'ta çıkar" is off SHALL never be offered in a draft, and the DM SHALL still be able to teach it.

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

#### Scenario: A word kept out of drafts
- **WHEN** the active word "Justice" has "Draft'ta çıkar" off
- **THEN** no draft offers it, and the DM can teach it

### Requirement: True Words screen
The True Words screen SHALL list every active word, sorted by name, with its name, its cost shown as "<cost> LP", and its visible text. Text in square brackets SHALL be hidden, as in the card library. A player's screen SHALL leave out the words whose "Listede görünür" is off, also while someone knows them; the DM's screen SHALL list them, marked "🔒 DM". A player SHALL see the screen for themselves. The DM SHALL choose the player. The words the chosen player knows SHALL be marked "Biliyor". The DM SHALL also get "+ True Word ekle", "✎ Düzenle" on each word, and the status filter with "Yayında", "Taslak", "Kaldırıldı", "🔒 DM" and "Hepsi", starting at "Yayında". "🔒 DM" SHALL list the words of every status whose "Listede görünür" is off.

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

#### Scenario: A hidden word
- **WHEN** the active word "Justice" has "Listede görünür" off, and Ayla opens the True Words screen
- **THEN** "Justice" is not listed, and the DM's screen lists it marked "🔒 DM"

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

### Requirement: The DM teaches a word
The DM SHALL be able to teach any player any active word that player does not know, whatever its flags, without a draft and without charging LP. It is done from a "+ True Word öğret" dialog on the player's True Words tab, which searches the words by name and text. The word SHALL join the player's True Words, active when its "Elde etkili" is on and inactive otherwise. Players SHALL NOT teach words.

#### Scenario: Teaching a word
- **WHEN** the DM teaches Bora "Aid"
- **THEN** "Aid" is among Bora's True Words, and Bora's LP does not change

#### Scenario: Teaching a hidden word
- **WHEN** the DM teaches Bora "Justice", whose "Listede görünür" and "Draft'ta çıkar" are off
- **THEN** "Justice" is among Bora's True Words

#### Scenario: A player teaches a word
- **WHEN** Ayla tries to add a word to her own True Words without a draft
- **THEN** the server denies it

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

### Requirement: True Words tab on the hand screen
The hand screen SHALL have a "✦ True Words" tab after "♠ Kartlar". The True Words tab SHALL list the player's words in the order learned, live, each as its picture with its active state, or, without a picture, as its name and visible text. Selecting a word SHALL show its details, in the same frame as a card's details:
- its picture large, glowing purple while active, with an "Aktif" badge at the top
- its cost in this hand and how it was learned, as labels
- who knows it, as "<name> biliyor"
- its note on cream paper, editable by the player and the DM
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
- **WHEN** the DM selects "Justice", whose "Elde etkili" is on, on Ayla's True Words tab
- **THEN** the details offer, under "DM araçları", the cost in this hand with "temel: <cost>", switching it active, and taking it back

#### Scenario: A word without a held effect in the DM's details
- **WHEN** the DM selects "Abyss", whose "Elde etkili" is off, on Ayla's True Words tab
- **THEN** "DM araçları" offers the cost and taking it back, and no switch

#### Scenario: A note
- **WHEN** Ayla's "Abyss" has the note "Boss savaşında kullan", and a user selects it
- **THEN** the details show the note on cream paper

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
