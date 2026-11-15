## RENAMED Requirements

- FROM: `### Requirement: True Words screen`
- TO: `### Requirement: The Kütüphane's True Words tab`

## MODIFIED Requirements

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
The Kütüphane's True Words tab SHALL list every active word, sorted by name, as every tab lists its definitions (spec: card-library). A player SHALL see the tab for themselves. The DM SHALL choose the player in "Kimin için", kept in the URL. The words the chosen player knows SHALL be marked "Biliyor" on their face and list row. The count line SHALL say how many words that player knows. The chosen player's draft controls and open draft SHALL show above the list. A player's tab SHALL leave out the words whose "Listede görünür" is off (spec: card-library, "Cards not listed for players"). The DM SHALL also get "+ True Word ekle", "✎ Düzenle" on each word, and the status filter (spec: card-library, "The DM's status filter").

#### Scenario: A player's view
- **WHEN** Ayla, who knows "Abyss", opens the True Words tab
- **THEN** every active word is listed, "Abyss" is marked "Biliyor", and the count line says "Ayla 1 True Word biliyor"

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
