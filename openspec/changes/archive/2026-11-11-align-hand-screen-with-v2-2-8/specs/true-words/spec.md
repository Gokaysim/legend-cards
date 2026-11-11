# Spec Delta

## MODIFIED Requirements

### Requirement: True Words tab on the hand screen
The hand screen SHALL have a "✦ True Words" tab after "♠ Kartlar". The True Words tab SHALL list the player's words in the order learned, live, each as its picture with its active state, or, without a picture, as its name and visible text. Selecting a word SHALL show its details: its picture, name, cost, visible text, how it was learned, and its active state. In a window at least 1024 CSS pixels wide, the details SHALL show in a "Seçili True Word" panel at the right of the tab, which says "Detaylarını görmek için bir True Word seç." without a selection. In a narrower window, they SHALL open in a dialog. The tab SHALL link to the True Words screen for that player. With no word learned, it SHALL say "Henüz True Word öğrenilmedi."

#### Scenario: Opening the tab
- **WHEN** a user opens the True Words tab of Ayla's hand, and Ayla learned "Aid" and then "Abyss", which both have pictures
- **THEN** the tab shows the picture of "Aid" first and of "Abyss" second

#### Scenario: A word without a picture
- **WHEN** Ayla knows "Abyss", which has no picture, and a user opens her True Words tab
- **THEN** "Abyss" shows its name and its text

#### Scenario: Selecting a word on a desktop
- **WHEN** a user selects "Aid" on the True Words tab of Ayla's hand in a window 1280 CSS pixels wide
- **THEN** the "Seçili True Word" panel shows its picture, name, cost, text, how Ayla learned it, and whether it is active, and no dialog opens

#### Scenario: Selecting a word on a phone
- **WHEN** a user selects "Aid" on the True Words tab of Ayla's hand on a phone
- **THEN** its details open in a dialog

#### Scenario: No words yet
- **WHEN** a user opens the True Words tab of Bora's hand, and Bora knows no word
- **THEN** the tab says "Henüz True Word öğrenilmedi."

#### Scenario: The DM's details
- **WHEN** the DM selects "Abyss" on Ayla's True Words tab
- **THEN** the details offer switching it active and taking it back

## ADDED Requirements

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
