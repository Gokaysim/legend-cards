# Spec Delta

## MODIFIED Requirements

### Requirement: True Words tab on the hand screen
The hand screen SHALL have a "✦ True Words" tab after "♠ Kartlar". The True Words tab SHALL list the player's words in the order learned, live, with each word's name, cost, visible text, and active state. Selecting a word SHALL open its details. The tab SHALL link to the True Words screen for that player. With no word learned, it SHALL say "Henüz True Word öğrenilmedi."

#### Scenario: Opening the tab
- **WHEN** a user opens the True Words tab of Ayla's hand, and Ayla learned "Aid" and then "Abyss"
- **THEN** the tab lists "Aid" first and "Abyss" second, with their costs and texts

#### Scenario: No words yet
- **WHEN** a user opens the True Words tab of Bora's hand, and Bora knows no word
- **THEN** the tab says "Henüz True Word öğrenilmedi."

#### Scenario: The DM's details
- **WHEN** the DM selects "Abyss" on Ayla's True Words tab
- **THEN** the details offer switching it active and taking it back
