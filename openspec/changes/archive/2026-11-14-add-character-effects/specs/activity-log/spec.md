# Spec Delta

## MODIFIED Requirements

### Requirement: A True Word use is one event
A True Word use SHALL appear as one event, at the time it was used. It names who used the word, the player whose word it is when the DM used it, the word, the character it was used on, if one was given, and the LP paid, if more than 0.

#### Scenario: A player uses a word
- **WHEN** Ayla uses "Abyss" for 5 LP
- **THEN** the event reads "Abyss True Word'ünü kullandı (−5 LP).", with Ayla as the user

#### Scenario: The DM uses a player's word
- **WHEN** the DM uses Ayla's "Abyss" for 5 LP
- **THEN** the event reads "Ayla'nın Abyss True Word'ünü kullandı (−5 LP).", with the DM as the user

#### Scenario: A free use
- **WHEN** Ayla uses "Chaos", which costs 0
- **THEN** the event reads "Chaos True Word'ünü kullandı.", with Ayla as the user

#### Scenario: A use on a character
- **WHEN** Ayla uses "Abyss" on "Thorin" for 5 LP
- **THEN** the event reads "Abyss True Word'ünü Thorin üzerinde kullandı (−5 LP).", with Ayla as the user
