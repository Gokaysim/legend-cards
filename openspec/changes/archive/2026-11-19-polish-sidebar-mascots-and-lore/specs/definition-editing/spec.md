# Spec Delta

## MODIFIED Requirements

### Requirement: Deleting a draft
The DM SHALL delete a draft with "Sil", after a confirmation. The definition SHALL be gone, and its change records SHALL stay. Its picture file, if it has one, SHALL be deleted too, and so SHALL its lore (spec: card-lore). An active or retired definition SHALL NOT be deleted.

#### Scenario: Deleting a draft
- **WHEN** the DM deletes the draft "Bard's Encore"
- **THEN** "Bard's Encore" is no longer stored, and its change records are still stored

#### Scenario: Deleting a draft with a picture
- **WHEN** the DM deletes the draft "Bard's Encore", which has a picture
- **THEN** its picture file is deleted too

#### Scenario: Deleting an active card
- **WHEN** the DM tries to delete the active card "Aboleth's Eyes"
- **THEN** no "Sil" control is offered, and the server denies such a delete

#### Scenario: Deleting a draft with lore
- **WHEN** the DM deletes the draft "Bard's Encore", which has lore
- **THEN** its lore is no longer stored
