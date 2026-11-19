# Spec Delta

## MODIFIED Requirements

### Requirement: A draw is one event
A draw SHALL appear as one event that names who drew, the player whose hand the card went to, the card, whether it was a Cursed draw, the LP paid if any, and its filters if any, the DM's or a player's. A set filter SHALL be named by the set's official name, or by its code when no stored set has it. The draw's holding and its ledger entry SHALL NOT appear as separate events.

#### Scenario: A paid draw
- **WHEN** Ayla draws "Aboleth's Eyes" for 1 LP
- **THEN** the log shows one event naming Ayla, "Aboleth's Eyes", and −1 LP, and no separate event for the card given or for the LP change

#### Scenario: The DM draws for a player
- **WHEN** the mode is "Kapalı", and the DM draws a card into Bora's hand with the rarity filter "Rare"
- **THEN** the event shows the DM's name marked as DM, Bora, the card, and the filter "Rare", and no payment

#### Scenario: The DM charges a draw
- **WHEN** the mode is "Filtreli çekiş", and the DM draws "Aboleth's Eyes" into Bora's hand at 2 LP
- **THEN** the event shows the DM's name marked as DM, Bora, "Aboleth's Eyes", and −2 LP, and no separate event for Bora's LP change

#### Scenario: A player's draw at another price
- **WHEN** the mode is "Filtreli çekiş", and Ayla draws "Aboleth's Eyes" at 3 LP
- **THEN** the event shows Ayla, "Aboleth's Eyes", and −3 LP

#### Scenario: A free draw while the mode is on
- **WHEN** the mode is "Kart seçme", and Ayla draws "Aboleth's Eyes" at 0 LP
- **THEN** the event shows Ayla and "Aboleth's Eyes", and no payment

#### Scenario: The DM draws from one set
- **WHEN** the DM draws a card into Bora's hand with the set filter Kesqer and the rarity filter "Rare"
- **THEN** the event shows the filters "Kesqerian Nights" and "Rare"

#### Scenario: A player's filtered draw
- **WHEN** the mode is "Kart seçme", and Ayla draws "Aboleth's Eyes" for 1 LP with a keyword
- **THEN** the event shows Ayla, "Aboleth's Eyes", −1 LP, and the keyword among the filters

#### Scenario: A Cursed draw
- **WHEN** Ayla draws the Cursed card "Visions of Death"
- **THEN** the event says that Ayla drew a Cursed card and names "Visions of Death"
