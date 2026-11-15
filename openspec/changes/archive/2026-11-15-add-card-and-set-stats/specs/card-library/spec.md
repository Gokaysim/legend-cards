# Spec Delta

## ADDED Requirements

### Requirement: History control on library faces
Each card face in the card views of the Kart kütüphanesi and the Cursed Deck SHALL have a "geçmiş" control with a clock icon in the face's top row, named "<card name>: geçmiş" for screen readers: left of the DM's edit control, or left of the magnifier where there is none. It SHALL show and hide as the magnifier does, and selecting it SHALL open the card's Kart geçmişi (spec: card-stats).

#### Scenario: A player's face
- **WHEN** Ayla rests the pointer on "Aboleth's Eyes" in the Kart kütüphanesi
- **THEN** its face shows the clock control left of the magnifier, named "Aboleth's Eyes: geçmiş"

#### Scenario: The DM's face
- **WHEN** the DM rests the pointer on "Aboleth's Eyes" in the Kart kütüphanesi
- **THEN** the clock control is left of the edit control, which is left of the magnifier

#### Scenario: Opening the history
- **WHEN** a user selects the clock control of "Abandon All Hope" in the Cursed Deck
- **THEN** the Kart geçmişi of "Abandon All Hope" opens

#### Scenario: A phone
- **WHEN** a user opens the Kart kütüphanesi on a phone, which has no hover
- **THEN** every face shows its clock control

#### Scenario: Zooming still works
- **WHEN** a user double-clicks the face of "Aboleth's Eyes" outside its controls
- **THEN** the zoom view opens, and the Kart geçmişi does not

#### Scenario: Other faces
- **WHEN** a user looks at the faces in a hand, a draw, a pack or the card details
- **THEN** none of them has the clock control

### Requirement: History links in the list views
In the list views of the Kart kütüphanesi and the Cursed Deck, each card's name in the Kart column SHALL be a link to the card's Kart geçmişi (spec: card-stats).

#### Scenario: Following a name
- **WHEN** a user selects "Aboleth's Eyes" in the Kart kütüphanesi's list view
- **THEN** the Kart geçmişi of "Aboleth's Eyes" opens
