# Spec Delta

## MODIFIED Requirements

### Requirement: Where the Cardmaker speaks
The Cardmaker SHALL speak only where she stands in the bottom-right corner (spec: card-images), and only while she is not gone after the pointer reached her. These tiles make her speak:
- on the Shops screen: "Pack Shop" and "Elixir Shop"
- in the Pack Shop's main view: each Mechanic Pack that has a line, and the Golden Packs tile

Nothing else SHALL make her speak. The bubble opens at her left, near the bottom of the window.

#### Scenario: A Mechanic Pack
- **WHEN** a user on a desktop window with a mouse rests the pointer on the Blood & Battle Mechanic Pack
- **THEN** a speech bubble opens at the left of the Cardmaker in the bottom-right corner

#### Scenario: Inside a group
- **WHEN** a user on a desktop window with a mouse rests the pointer on the Kesqerian Nights Premium Pack
- **THEN** no bubble opens

#### Scenario: A phone
- **WHEN** a user touches the Blood & Battle Mechanic Pack on a phone
- **THEN** no bubble opens, and the pack's confirmation opens as before

#### Scenario: After she went
- **WHEN** the pointer made the Cardmaker go in the Pack Shop, and the user rests the pointer on the Blood & Battle Mechanic Pack
- **THEN** no bubble opens
