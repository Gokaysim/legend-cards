# Spec Delta

## MODIFIED Requirements

### Requirement: The DM teaches a word
The DM SHALL be able to teach any player any active word that player does not know, whatever its flags, without a draft and without charging LP. It is done from "+ Kart ver" on the hand screen (spec: card-holdings, "The DM gives cards"). The "+ True Word öğret" control on the player's True Words tab SHALL open "+ Kart ver" for that player with the kind "True Word" chosen. The word SHALL join the player's True Words, active when its "Elde etkili" is on and inactive otherwise. Players SHALL NOT teach words.

#### Scenario: Teaching a word
- **WHEN** the DM teaches Bora "Aid"
- **THEN** "Aid" is among Bora's True Words, and Bora's LP does not change

#### Scenario: Teaching a hidden word
- **WHEN** the DM teaches Bora "Justice", whose "Listede görünür" and "Draft'ta çıkar" are off
- **THEN** "Justice" is among Bora's True Words

#### Scenario: A hidden word is offered
- **WHEN** the DM opens "+ Kart ver" on Bora's hand and chooses the kind "True Word"
- **THEN** "Justice", whose "Listede görünür" and "Draft'ta çıkar" are off, is listed and can be selected

#### Scenario: The shortcut on the True Words tab
- **WHEN** the DM selects "+ True Word öğret" on the True Words tab of Bora's hand
- **THEN** "+ Kart ver" opens for Bora with the kind "True Word" chosen, and lists only active True Words

#### Scenario: A taught word stays out of drafts
- **WHEN** the DM teaches Bora "Justice", whose "Draft'ta çıkar" is off, and Ayla starts a draft
- **THEN** "Justice" is not among the 3 words of Ayla's draft

#### Scenario: A player teaches a word
- **WHEN** Ayla tries to add a word to her own True Words without a draft
- **THEN** the server denies it
