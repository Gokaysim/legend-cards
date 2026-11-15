# Spec Delta

## MODIFIED Requirements

### Requirement: What the watching view shows
The watching view SHALL show whose hand the cards go to, who draws when it is not the hand's owner, whether it is a random or a Cursed draw, and the payment per card ("−1 LP" or "ücretsiz"). It SHALL show the deck with the number of cards in its pool, and the session's cards in the order drawn, each face down until it is turned. It SHALL NOT list the filters of a draw, the DM's or a player's. A face-down card SHALL show the back its draw had (spec: card-draws, "The deck's back").

#### Scenario: A player's paid draw
- **WHEN** Bora watches Ayla draw two cards for 1 LP each
- **THEN** his view says that Ayla is drawing into her own hand at 1 LP per card, and shows two face-down cards

#### Scenario: The DM's filtered draw
- **WHEN** Bora watches the DM draw into Ayla's hand with the rarity "Rare" chosen
- **THEN** his view says that the DM is drawing into Ayla's hand, free, and names no filter

#### Scenario: A set-filtered draw
- **WHEN** Bora watches the DM draw with the set "Kesqerian Nights" chosen
- **THEN** the face-down card shows the Kesqer cardback

#### Scenario: A player's filtered draw
- **WHEN** the table's player draw mode is "Kart seçme", and Bora watches Ayla draw with a keyword and the set "Kesqerian Nights" chosen
- **THEN** his view says that Ayla is drawing into her own hand at 1 LP per card, names no filter, and the face-down card shows the Kesqer cardback
