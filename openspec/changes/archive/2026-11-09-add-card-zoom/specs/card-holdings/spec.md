# Spec Delta

## MODIFIED Requirements

### Requirement: Card notes
The holder of a card and the DM SHALL be able to write a note on that held card, up to 1000 characters. Other players SHALL NOT be able to change it. The face of a held card with a note SHALL show a note icon "✎" in its bottom-left corner while the pointer rests on the face or the focus is inside it, and at all times on a device without hover. Screen readers SHALL read "Not var" on that face at all times.

#### Scenario: A player writes a note
- **WHEN** Ayla writes "Boss savaşında kullan" on her card and leaves the field
- **THEN** the note is saved and shown on every device

#### Scenario: Another player's note
- **WHEN** Bora tries to change the note on Ayla's card
- **THEN** the server denies it

#### Scenario: The note icon on hover
- **WHEN** a user rests the pointer on a card with a note in Ayla's hand
- **THEN** the "✎" icon shows in the face's bottom-left corner, and it goes away when the pointer leaves the face

#### Scenario: No mark under the face
- **WHEN** a user looks at a card with a note in Ayla's hand without resting the pointer on it
- **THEN** the face shows no note icon and no "Not var" mark, and a screen reader still reads "Not var" on it

#### Scenario: The note icon on a phone
- **WHEN** a user opens Ayla's hand on a phone, which has no hover
- **THEN** every card with a note shows the "✎" icon at all times

#### Scenario: A card without a note
- **WHEN** a user rests the pointer on a card without a note in Ayla's hand
- **THEN** no note icon shows
