# Spec Delta

## MODIFIED Requirements

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
