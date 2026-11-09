# Spec Delta

## MODIFIED Requirements

### Requirement: Holding records
Every time a player receives a card, the application SHALL record a holding: the card, the player, when it was given, by whom, and how ("dm", "transfer", "draw" or "pack"). A holding received through a draw SHALL name its draw, and one received from a pack SHALL name its pack opening. A holding starts open. When the card leaves the hand, the holding SHALL be closed with when, by whom, and why ("used", "discarded" or "transferred"). Holdings SHALL never be deleted.

#### Scenario: The DM gives a card
- **WHEN** the DM gives "Aboleth's Eyes" to Ayla
- **THEN** an open holding records "Aboleth's Eyes", Ayla, the time, the DM as the giver, and "dm" as the way it was given

#### Scenario: A drawn card
- **WHEN** Ayla draws "Aboleth's Eyes"
- **THEN** an open holding records "Aboleth's Eyes", Ayla, the time, Ayla as the giver, "draw" as the way it was given, and the draw

#### Scenario: A card chosen from a pack
- **WHEN** the DM chooses "Aboleth's Eyes" from Ayla's open pack
- **THEN** an open holding records "Aboleth's Eyes", Ayla, the time, the DM as the giver, "pack" as the way it was given, and the pack opening

#### Scenario: History survives
- **WHEN** Ayla uses that card
- **THEN** the holding is still stored, closed with the time, Ayla as the one who closed it, and "used" as the reason

#### Scenario: Deleting a holding
- **WHEN** any signed-in user, including the DM, tries to delete a holding
- **THEN** the server denies it

### Requirement: The DM gives cards
The DM SHALL be able to give any active card, of any kind, to any user who has a profile, from a "+ Kart ver" dialog on the hand screen. The dialog searches the cards as the library search does and shows each card's status. Players SHALL NOT be able to give cards, not even to themselves. A player's only ways to open a holding for themselves SHALL be a draw, as the card-draws rules allow, and a choice from their own open pack, as the pack-shop rules allow.

#### Scenario: Searching and giving
- **WHEN** the DM opens "+ Kart ver" on Ayla's hand, searches for "aboleth", and gives "Aboleth's Eyes"
- **THEN** the card is added to the end of Ayla's hand

#### Scenario: A player tries to give a card
- **WHEN** a player creates a holding for themselves given by "dm"
- **THEN** the server denies it

#### Scenario: A player's holding without a draw
- **WHEN** a player creates a holding for themselves given by "draw" without the draw that it names
- **THEN** the server denies it

#### Scenario: A player's holding without a pack choice
- **WHEN** a player creates a holding for themselves given by "pack" without choosing it from their open pack in the same write
- **THEN** the server denies it

#### Scenario: Giving to someone without a profile
- **WHEN** the DM creates a holding for a user ID that has no profile
- **THEN** the server denies it
