# Spec Delta

## MODIFIED Requirements

### Requirement: Card counts on the Setler screen
A set's card count SHALL count the cards of that set the viewer can see in the card lists: every card of the set, whatever its status, for the DM; the active cards whose "Listede görünür" is on for a player.

#### Scenario: A player's count
- **WHEN** Kesqer has 120 active cards, 1 draft and 1 active card with "Listede görünür" off
- **THEN** Ayla sees 120 for Kesqer, and the DM sees 122
