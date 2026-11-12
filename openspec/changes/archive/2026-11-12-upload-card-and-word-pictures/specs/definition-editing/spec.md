# Spec Delta

## ADDED Requirements

### Requirement: The picture in the forms
The card and True Word forms SHALL show a "Resim" section with the definition's picture, or a note that it has none. It SHALL offer "Resim seç" to choose a new picture, and "Resmi kaldır" while there is a picture. A chosen picture SHALL be shown in the form before it is saved. A picture change SHALL take effect only when the form is saved, and closing the form without saving SHALL change nothing.

#### Scenario: Adding a card with a picture
- **WHEN** the DM adds the card "Bard's Encore", chooses a picture with "Resim seç", and chooses "Kaydet"
- **THEN** the form showed the picture before saving, and "Bard's Encore" is stored as a draft with that picture

#### Scenario: Replacing a picture
- **WHEN** the DM opens "Aboleth's Eyes", chooses a new picture, and chooses "Kaydet"
- **THEN** "Aboleth's Eyes" shows the new picture on every device

#### Scenario: Removing a picture
- **WHEN** the DM opens "Aboleth's Eyes", chooses "Resmi kaldır", and chooses "Kaydet"
- **THEN** "Aboleth's Eyes" has no picture, and its face has its CSS look on every device

#### Scenario: Closing without saving
- **WHEN** the DM chooses a new picture for "Aboleth's Eyes" and closes the form without saving
- **THEN** "Aboleth's Eyes" keeps its picture

#### Scenario: A word's picture
- **WHEN** the DM opens the True Word "Abyss", chooses a new picture, and chooses "Kaydet"
- **THEN** "Abyss" shows the new picture on the True Words screen and in the hands of the players who know it

### Requirement: Downloading a picture
While a definition has a stored picture, its form SHALL offer "İndir", which SHALL download the stored picture as a WebP file named after the definition's identity. A picture chosen but not yet saved SHALL NOT be offered for download.

#### Scenario: Downloading a card's picture
- **WHEN** the DM opens "Aboleth's Eyes" and chooses "İndir"
- **THEN** the browser saves `legend-abolethseyes.webp`, the picture the card shows

#### Scenario: A card without a picture
- **WHEN** the DM opens "Scorched Earth", which has no picture
- **THEN** no "İndir" control is offered

### Requirement: Preparing a picture
The form SHALL accept a PNG, JPEG or WebP file of at most 20 MB, and SHALL prepare it on the DM's device as a stored picture (spec: card-images, "Converted pictures"). Preparing SHALL work in Chrome. When the file is not such a picture, is too large, or the browser cannot prepare it, the form SHALL say why in Turkish and keep the picture it had.

#### Scenario: A PDF
- **WHEN** the DM chooses a PDF file with "Resim seç"
- **THEN** the form says in Turkish that only PNG, JPEG or WebP pictures can be used, and the picture does not change

#### Scenario: A browser that cannot prepare it
- **WHEN** the DM chooses a picture in a browser that cannot make a WebP file
- **THEN** the form says in Turkish that this browser cannot prepare the picture and names Chrome, and the picture does not change

### Requirement: Picture changes are definition steps
A picture change SHALL be saved in the same step and change record as the other fields of that save. It SHALL be possible whatever the definition's status, also while a pack is open. A definition SHALL be complete without a picture. Retiring and bringing back SHALL NOT change the picture.

#### Scenario: A picture during an open pack
- **WHEN** Ayla has an open pack, and the DM saves a new picture for the active card "Aboleth's Eyes"
- **THEN** the picture is saved

#### Scenario: Publishing without a picture
- **WHEN** the DM publishes the complete draft "Bard's Encore", which has no picture
- **THEN** it is active, with its CSS face

#### Scenario: Recording a picture change
- **WHEN** the DM saves a new picture and a new cost for "Aboleth's Eyes"
- **THEN** one change record names both the picture change and the new cost

### Requirement: Replaced picture files are deleted
After a save that replaces or removes a picture, the file that is no longer used SHALL be deleted. When that deletion fails, the save SHALL still count, and no error SHALL be shown. When a save fails, the file uploaded for it SHALL be deleted again, and the definition SHALL keep the picture it had.

#### Scenario: Replacing deletes the old file
- **WHEN** the DM saves a new picture for "Aboleth's Eyes"
- **THEN** the file of its old picture is deleted

#### Scenario: A refused save
- **WHEN** the DM saves a new picture for "Aboleth's Eyes" after it changed on another device
- **THEN** the save is refused, "Aboleth's Eyes" keeps its picture, and the uploaded file is deleted

## MODIFIED Requirements

### Requirement: Deleting a draft
The DM SHALL delete a draft with "Sil", after a confirmation. The definition SHALL be gone, and its change records SHALL stay. Its picture file, if it has one, SHALL be deleted too. An active or retired definition SHALL NOT be deleted.

#### Scenario: Deleting a draft
- **WHEN** the DM deletes the draft "Bard's Encore"
- **THEN** "Bard's Encore" is no longer stored, and the DM's log still lists its records

#### Scenario: Deleting a draft with a picture
- **WHEN** the DM deletes the draft "Bard's Encore", which has a picture
- **THEN** its picture file is deleted too

#### Scenario: Deleting an active card
- **WHEN** the DM tries to delete the active card "Aboleth's Eyes"
- **THEN** no "Sil" control is offered, and the server denies such a delete
