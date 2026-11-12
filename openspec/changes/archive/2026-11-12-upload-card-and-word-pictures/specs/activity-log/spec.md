# Spec Delta

## ADDED Requirements

### Requirement: Picture changes in the log
An edit event SHALL name a picture change in Turkish as "Resim: eklendi" when a definition without a picture got one, "Resim: değişti" when its picture was replaced, and "Resim: kaldırıldı" when it was removed. It SHALL NOT show the picture's address. A publish or an add straight to active with a picture SHALL say that the definition has a picture.

#### Scenario: A replaced picture
- **WHEN** the DM saves a new picture for "Aboleth's Eyes"
- **THEN** the log shows one event naming the DM, "Aboleth's Eyes", and "Resim: değişti"

#### Scenario: A removed picture with another change
- **WHEN** the DM removes the picture of "Aboleth's Eyes" and changes its cost from "2" to "3" in one save
- **THEN** the event shows "Resim: kaldırıldı" and the cost "2 → 3"

## MODIFIED Requirements

### Requirement: An import is one event
An import's change record SHALL appear as one event naming "Import", whether cards or True Words were added or got pictures, how many, and their names. A player SHALL see only the event of the active additions, or of the active and retired definitions that got pictures.

#### Scenario: The first import
- **WHEN** the repository card files were imported into empty emulators, and Ayla opens the İşlem Logu
- **THEN** she sees one event that the import added 742 cards, and no event of the 3 drafts

#### Scenario: A picture import
- **WHEN** the picture import gave pictures to 700 active cards and to the draft "The Cartographer", and Ayla opens the İşlem Logu
- **THEN** she sees one event that the import gave pictures to 700 cards, and no event of "The Cartographer"
