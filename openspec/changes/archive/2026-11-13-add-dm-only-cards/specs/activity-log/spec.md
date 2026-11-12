## ADDED Requirements

### Requirement: The DM-only flag in the log
An edit event that turns a card's DM-only flag on or off SHALL show it as a changed field: "DM'e özel: hayır → evet" or "DM'e özel: evet → hayır". A player SHALL see that event, because the card is visible to players on one side of it.

#### Scenario: Marking a card DM-only
- **WHEN** the DM marks the active card "Aboleth's Eyes" as DM-only, and Ayla opens the İşlem Logu
- **THEN** she sees one event naming the DM, "Aboleth's Eyes", and "DM'e özel: hayır → evet"

## MODIFIED Requirements

### Requirement: Definition changes are events
Each definition change record SHALL appear as one event. It names who made the change (the DM, or "Import"), the card or word, and the step: added, edited, published, retired, brought back or deleted. An edit SHALL show each changed field before and after. A publish and an add straight to active SHALL show the definition. Events of the DM's work on drafts and on DM-only cards SHALL be marked as visible to the DM only.

#### Scenario: An edit
- **WHEN** the DM changes the cost of "Aboleth's Eyes" from "2" to "3"
- **THEN** the log shows one event naming the DM, "Aboleth's Eyes", and the cost "2 → 3"

#### Scenario: A retire
- **WHEN** the DM retires the True Word "Abyss"
- **THEN** the log shows that the DM retired the True Word "Abyss"

#### Scenario: Draft work in the DM's log
- **WHEN** the DM adds the draft "Bard's Encore" and opens the İşlem Logu
- **THEN** the event of adding it is marked as visible to the DM only

#### Scenario: Work on a DM-only card
- **WHEN** the DM changes the text of the active DM-only card "The Last Wish"
- **THEN** the DM's log marks that event as visible to the DM only, and Ayla's log does not show it

### Requirement: An import is one event
An import's change record SHALL appear as one event naming "Import", whether cards or True Words were added or got pictures, how many, and their names. A player SHALL see only the event of the active additions, or of the active and retired definitions that got pictures, leaving out DM-only cards.

#### Scenario: The first import
- **WHEN** the repository card files were imported into empty emulators, and Ayla opens the İşlem Logu
- **THEN** she sees one event that the import added 742 cards, and no event of the 3 drafts

#### Scenario: A picture import
- **WHEN** the picture import gave pictures to 700 active cards and to the draft "The Cartographer", and Ayla opens the İşlem Logu
- **THEN** she sees one event that the import gave pictures to 700 cards, and no event of "The Cartographer"

#### Scenario: A picture for a DM-only card
- **WHEN** the picture import gave pictures to 700 active cards, one of them the DM-only card "The Last Wish", and Ayla opens the İşlem Logu
- **THEN** she sees one event that the import gave pictures to 699 cards, and the DM's log also shows a DM-only event naming "The Last Wish"
