# Spec Delta

## ADDED Requirements

### Requirement: What a pack holds, before paying
The confirmation of a Mechanic Pack, and of the Golden Pack, SHALL show what the pack holds, in v2.2.8's Turkish words, above the payment. This SHALL hold on every device. The other packs, and a Mechanic Pack that v2.2.8 has no words for, SHALL show no description.

#### Scenario: A Mechanic Pack
- **WHEN** Ayla selects the Blood & Battle Mechanic Pack on her phone
- **THEN** its confirmation shows "Combat etkileri, saldırı ve hasar zarlarıyla ilgili kartları içerir." above the payment

#### Scenario: The Golden Pack
- **WHEN** the DM selects the Golden Pack
- **THEN** its confirmation shows "Sadece Rare kartlar ve Blessed kartlar içerir."

#### Scenario: A set's pack
- **WHEN** Ayla selects the Kesqerian Nights Standard Pack
- **THEN** its confirmation shows no description

## MODIFIED Requirements

### Requirement: Who a pack is for
A player SHALL open packs only into their own hand. The DM SHALL choose the hand in the pack's confirmation: any user who has a profile. The choice SHALL start at the hand the link names, or else at the first player who is not the DM, and the next pack SHALL start at the DM's last choice. The Pack Shop screen SHALL have no hand picker of its own.

#### Scenario: A player's Pack Shop
- **WHEN** Ayla opens a pack
- **THEN** it is opened into Ayla's hand

#### Scenario: The DM picks a player
- **WHEN** the DM opens a pack for Bora
- **THEN** it is opened into Bora's hand

#### Scenario: The DM changes the hand in the confirmation
- **WHEN** the DM comes from Ayla's "🎁 Pack Shop" link, selects a pack, and picks Bora in its confirmation
- **THEN** the confirmation starts at Ayla, the payment then offers Bora's LP, and the pack opens into Bora's hand

#### Scenario: The next pack
- **WHEN** the DM then selects another pack
- **THEN** its confirmation starts at Bora

#### Scenario: A player opens a pack for someone else
- **WHEN** a player writes a pack opening into another player's hand
- **THEN** the server denies it
