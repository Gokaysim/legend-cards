# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
