# Spec Delta

## MODIFIED Requirements

### Requirement: True Word glows
A True Word tile of an active word SHALL glow purple, and SHALL keep its "● Aktif" mark. A True Word tile that opens something when selected SHALL lift slightly under the pointer or the focus. In the hand summary, the name of an active True Word SHALL have a purple glow. An active word that peeks out above the hand SHALL glow purple too.

#### Scenario: An active word
- **WHEN** the DM switches Ayla's "Abyss" active
- **THEN** its tile on her True Words tab glows purple with the "● Aktif" mark, "✦ Abyss" in her hand summary has a purple glow, and its picture above her hand glows purple

## ADDED Requirements

### Requirement: The selected card glows
Where the card details show beside the hand, the selected card in the hand's card view SHALL glow soft gold. An active card SHALL keep its active glow when it is selected. The panel's heading, which names the card, SHALL be the selection's text, and screen readers SHALL hear which card is selected.

#### Scenario: Selecting an inactive card
- **WHEN** Ayla selects her inactive "Night Owl" in a window 1280 CSS pixels wide
- **THEN** "Night Owl" glows soft gold, and the panel is headed with its name

#### Scenario: Selecting an active card
- **WHEN** Ayla selects her active "Aboleth's Eyes" in a wide window
- **THEN** it keeps its green glow and its "● Aktif" mark, and the panel is headed with its name

### Requirement: The hand's stat colors
Above the hand, the "☠ Cursed kart" stat SHALL have a dark red surface and a red border, with its number in red. The "✦ True Words" stat SHALL have a dark purple surface and a purple border, with its number in purple. The numbers of the other stats SHALL be gold. Every label and number SHALL keep at least 4.5:1 contrast against its surface.

#### Scenario: Reading the stats
- **WHEN** a user opens Ayla's hand
- **THEN** the Cursed stat is red, the True Words stat is purple, and the Legend Point, card, active effect and set numbers are gold
