# Spec Delta

## MODIFIED Requirements

### Requirement: Draw records
Each draw SHALL be stored permanently with its kind (random or Cursed), who drew, whose hand it went to, when, the card and its kind, the holding it opened, the payment (1 LP or none), and the DM's filters, if any. Random and Cursed draws SHALL never be changed or deleted. Pack openings are kept with the draws but follow the pack-shop rules: they change while the pack is open. Every signed-in user SHALL be able to read every draw.

#### Scenario: Recording a paid draw
- **WHEN** Ayla draws "Aboleth's Eyes" for 1 LP
- **THEN** a draw record names Ayla as the drawer and the hand's owner, the time, "Aboleth's Eyes", the new holding, and a payment of 1 LP

#### Scenario: Changing a draw
- **WHEN** any signed-in user, including the DM, tries to change or delete a random or Cursed draw record
- **THEN** the server denies it

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user tries to read a draw record
- **THEN** the server denies it
