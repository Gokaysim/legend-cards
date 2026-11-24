# Spec Delta

## MODIFIED Requirements

### Requirement: Card definitions
Every card SHALL be stored once, with a kind, a status (spec: definition-editing), its behavior flags (spec: definition-editing, "Behavior flags") and its definition: name, set code, cost, rarity, mechanic pack, and text. The kind SHALL be one of "normal", "blessed", "cursed", "trueWord" or "custom". A Blessed card SHALL have no set code and no rarity. A Cursed card, a True Word and a Custom Card SHALL have no set code, no rarity, and no mechanic pack. A Custom Card SHALL also have its effects and its draft (spec: custom-cards). A cost MAY be absent, except for a True Word that is not a draft. Each card keeps its cost as written, for example "X" or "d6". A draft MAY lack the other fields its kind requires.

#### Scenario: A Blessed card
- **WHEN** a user looks at a Blessed card
- **THEN** it shows "Blessed" in place of a set, "—" as its rarity, and its mechanic pack

#### Scenario: A Cursed card
- **WHEN** a user looks at a Cursed card
- **THEN** it shows its name, cost, and text, and has no rarity or mechanic pack

#### Scenario: A card without a cost
- **WHEN** a user looks at a card whose cost is absent
- **THEN** the cost shows as "—"

#### Scenario: A cost that is not a number
- **WHEN** a user looks at a card whose cost is "d6"
- **THEN** the cost shows as "d6"

#### Scenario: A draft without a set
- **WHEN** the DM looks at the normal draft "The Cartographer", which has no set, rarity or mechanic pack
- **THEN** its set, rarity and mechanic pack show as empty, and it is marked "Taslak"

#### Scenario: A True Word among the definitions
- **WHEN** a user opens the Kütüphane's Kartlar tab or its Cursed tab
- **THEN** no True Word is listed there

#### Scenario: A Custom Card among the definitions
- **WHEN** the DM or a player opens any tab of the Kütüphane, with any filter
- **THEN** no Custom Card is listed there, and none is counted

### Requirement: Who writes card definitions
The application SHALL change a card's definition and status only through the DM's steps in definition-editing. It SHALL create a Custom Card only with the last pick of its draft (spec: custom-cards). It SHALL change a card's holder only as the card-holdings rules allow. The server SHALL deny a write that changes a card's holder together with its definition or status.

#### Scenario: Text changed together with the holder
- **WHEN** the DM gives a card and, in the same write, changes its text
- **THEN** the server denies the whole write

#### Scenario: A player changes a definition
- **WHEN** a signed-in player tries to change a card's text
- **THEN** the server denies the write, and the card does not change

#### Scenario: A player creates a Custom Card without a draft
- **WHEN** Ayla writes a Custom Card for herself without finishing an open draft of hers
- **THEN** the server denies it
