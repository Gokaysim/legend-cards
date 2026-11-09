# Spec Delta

## MODIFIED Requirements

### Requirement: The table waits for an open pack
While a pack is open, the server SHALL deny every card draw, pack opening, card given, used, discarded or transferred, every LP or GP change, and every True Word draft started, learned from, skipped or cancelled, and every True Word taught or taken back, by anyone, the DM included, except the open pack's own steps. The application SHALL disable those controls and say in Turkish that a pack is open. Notes, switching cards and True Words active, and cost overrides SHALL stay available.

#### Scenario: Drawing during a pack
- **WHEN** Bora tries to draw a card while Ayla's pack is open
- **THEN** the draw controls are disabled with a Turkish note, and the server denies a draw that is written anyway

#### Scenario: The DM changes LP during a pack
- **WHEN** the DM tries to add LP to Bora while Ayla's pack is open
- **THEN** the change cannot be made, and the server denies it

#### Scenario: Writing a note during a pack
- **WHEN** Bora edits a card's note while Ayla's pack is open
- **THEN** the note is saved

#### Scenario: A True Word draft during a pack
- **WHEN** Bora has an open True Word draft, and Ayla opens a pack before he learns a word
- **THEN** Bora's learn and skip controls are disabled with a Turkish note until the pack ends, and his draft stays open

#### Scenario: Switching a True Word during a pack
- **WHEN** the DM makes Bora's "Aid" active while Ayla's pack is open
- **THEN** the change is saved
