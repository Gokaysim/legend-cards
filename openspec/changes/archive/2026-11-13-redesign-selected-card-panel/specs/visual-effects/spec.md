# Spec Delta

## MODIFIED Requirements

### Requirement: The selected card glows
Where the card details show beside the hand, the selected card in the hand's card view SHALL glow soft gold. An active card SHALL keep its active glow when it is selected. The panel SHALL carry the selected card's name as its heading for screen readers, while its picture shows the name on screen, and screen readers SHALL hear which card is selected.

#### Scenario: Selecting an inactive card
- **WHEN** Ayla selects her inactive "Night Owl" in a window 1280 CSS pixels wide
- **THEN** "Night Owl" glows soft gold in the hand, and a screen reader hears the panel headed "Night Owl"

#### Scenario: Selecting an active card
- **WHEN** Ayla selects her active "Aboleth's Eyes" in a wide window
- **THEN** it keeps its green glow and its "● Aktif" mark in the hand, the panel shows the "Aktif" badge, and a screen reader hears the panel headed "Aboleth's Eyes"
