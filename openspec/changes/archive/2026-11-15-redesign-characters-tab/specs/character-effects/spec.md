# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: The effect count on a tile`
- TO: `### Requirement: The effect count on a character's tab`

## MODIFIED Requirements

### Requirement: The effect count on a character's tab
A character's tab SHALL show how many effects are on it, held ones and active True Words included, as "✦ <count>". A tab without effects SHALL show no count. The count SHALL change on every device without a reload.

#### Scenario: A count
- **WHEN** "Thorin" has one card effect, and Ayla holds one active card
- **THEN** the tab of "Thorin" shows "✦ 2", and the tab of "Kuzgun" shows "✦ 1"

#### Scenario: No effects
- **WHEN** a character has no effects, and its player holds no active card or word
- **THEN** its tab shows no count
