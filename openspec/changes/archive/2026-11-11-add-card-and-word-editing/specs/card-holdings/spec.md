# Spec Delta

## MODIFIED Requirements

### Requirement: Retired cards stay in hands
A held card that the DM retires SHALL stay in its holder's hand with its last stored definition, until its holding closes. Every signed-in user SHALL still see it in that hand. A retired card SHALL NOT be given, drawn or chosen from a pack. When its holding closes, a retired normal card SHALL NOT return to the pool.

#### Scenario: Retiring a held card
- **WHEN** the DM retires a card that Ayla holds
- **THEN** the card is still in Ayla's hand on every device, and it is no longer listed in the library

#### Scenario: Using a retired card
- **WHEN** Ayla uses the retired normal card "Aboleth's Eyes"
- **THEN** it leaves her hand, and it is not in the pool

#### Scenario: Giving a retired card
- **WHEN** the DM tries to give the retired card "Aboleth's Eyes"
- **THEN** the "+ Kart ver" dialog does not offer it, and the server denies such a write
