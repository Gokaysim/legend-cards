# Spec Delta

## ADDED Requirements

### Requirement: Player names link to their hands
In an event row, the name of the user who did it and every player the sentence names SHALL be a link to that player's hand on "Oyuncu elleri". The link SHALL cover the name only, and a Turkish suffix after the name SHALL stay outside it. A name SHALL be a link only when the user has a profile.

#### Scenario: The user who did it
- **WHEN** Ayla used "Aboleth's Eyes", and Bora selects "Ayla" at the top of that event
- **THEN** Ayla's hand opens

#### Scenario: A player in the sentence
- **WHEN** the DM discarded "Aboleth's Eyes" from Ayla's hand, and a user opens the log
- **THEN** the event reads "Ayla'nın elinden Aboleth's Eyes kartını attı.", with "Ayla" as a link to Ayla's hand and "'nın elinden" outside the link

#### Scenario: Both players of a transfer
- **WHEN** the DM transferred "Aboleth's Eyes" from Ayla to Bora
- **THEN** "Ayla" and "Bora" in the event are links to their own hands

#### Scenario: An LP change
- **WHEN** the DM added 2 LP to Ayla
- **THEN** "Ayla" before the change is a link to Ayla's hand

#### Scenario: The DM's own name
- **WHEN** the DM gave Ayla a card
- **THEN** the DM's name at the top of the event is a link to the DM's hand, and the DM mark stays beside it

#### Scenario: A user without a profile
- **WHEN** an event names a user whose profile no longer exists
- **THEN** that name reads "İsimsiz oyuncu" and is not a link

### Requirement: Card names link to their Kart geçmişi
In an event row, a card's name, the cards a pack showed among them, SHALL be a link to that card's Kart geçmişi when the viewer may open that page (spec: card-stats, "Who opens a card's page"). Otherwise the name SHALL read as it does without links.

#### Scenario: A used card
- **WHEN** Ayla used "Aboleth's Eyes", and Bora selects "Aboleth's Eyes" in that event
- **THEN** the Kart geçmişi of "Aboleth's Eyes" opens

#### Scenario: The cards a pack showed
- **WHEN** a pack showed "Aboleth's Eyes", "Bard's Encore" and "Visions of Death"
- **THEN** each of the three names in the event's "Sunulan:" line is a link to that card's Kart geçmişi

#### Scenario: A Custom Card
- **WHEN** Ayla finished a Custom Card draft
- **THEN** the card's name in the event is a link to that card's Kart geçmişi

#### Scenario: A hidden card no one holds, for a player
- **WHEN** Ayla discarded a card whose "Listede görünür" is off, no one holds it now, and Bora opens the log
- **THEN** the card's name is shown in bold and is not a link

#### Scenario: The same card for the DM
- **WHEN** the DM opens the log in the same situation
- **THEN** the card's name is a link to its Kart geçmişi

### Requirement: Names without a page are not links
An event row SHALL NOT turn into a link a name that has no page of its own: a True Word, "Import", "Grup kesesi", and "DM" in a sentence such as "DM iptal etti". These SHALL read as they do without links.

#### Scenario: A True Word use
- **WHEN** Ayla used "Abyss"
- **THEN** "Abyss" is shown in bold and is not a link, and "Ayla" at the top is a link to her hand

#### Scenario: A party purse change
- **WHEN** the DM added 5,000 GP to the party purse
- **THEN** "Grup kesesi" is not a link

#### Scenario: A cancelled pack
- **WHEN** the DM cancelled a pack that Bora opened
- **THEN** "DM" in "DM iptal etti" is not a link

### Requirement: Links look like the Kütüphane's card links
The log's links SHALL keep the text's colour and weight at rest, turn gold and underlined on hover, and show a visible focus outline when they have the keyboard focus. At 360 CSS pixels wide, a row with links SHALL wrap as before and the page SHALL NOT scroll horizontally.

#### Scenario: Hover
- **WHEN** the pointer rests on a player's name in an event
- **THEN** the name turns gold and underlined

#### Scenario: Keyboard
- **WHEN** a user moves the focus with Tab through an event
- **THEN** each link in it gets the focus in reading order and shows a focus outline
