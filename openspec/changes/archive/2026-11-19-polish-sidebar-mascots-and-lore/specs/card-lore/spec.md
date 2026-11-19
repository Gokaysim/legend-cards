# Spec Delta

## Purpose

Holds the story of the character on a card, written by the DM and shown to players on the card's Kart geçmişi page, kept apart from the card's definition so that it is downloaded only where it is read.

## ADDED Requirements

### Requirement: Lore is stored apart from the card
A card SHALL have at most one lore text: plain text of 1 to 10,000 characters, stored under the card's ID apart from its definition, with the user who last saved it and when. Reading the cards SHALL NOT read any lore. A True Word SHALL NOT have lore.

#### Scenario: Opening the Kütüphane
- **WHEN** a user opens the Kütüphane while 300 cards have lore
- **THEN** no lore text is read

#### Scenario: A True Word
- **WHEN** the DM tries to store lore under the ID of the True Word "Abyss"
- **THEN** the server denies it

#### Scenario: Too long
- **WHEN** the DM tries to save a lore text of 10,001 characters
- **THEN** the server denies it

### Requirement: Who reads lore
A signed-in member SHALL read the lore of an active or retired card. Only the DM SHALL read the lore of a draft. The server SHALL deny every other read.

#### Scenario: A player reads an active card's lore
- **WHEN** Ayla reads the lore of the active card "Aboleth's Eyes"
- **THEN** she gets its text

#### Scenario: A player reads a draft's lore
- **WHEN** Ayla tries to read the lore of the draft "Bard's Encore"
- **THEN** the server denies it

#### Scenario: The DM reads a draft's lore
- **WHEN** the DM reads the lore of the draft "Bard's Encore"
- **THEN** the DM gets its text

### Requirement: Only the DM writes lore
Only the DM SHALL create, change or delete lore, and only for a stored card that is not a True Word. A save SHALL record the DM as its author and the server's time. The server SHALL deny every other write.

#### Scenario: A player writes lore
- **WHEN** Ayla tries to change the lore of "Aboleth's Eyes"
- **THEN** the server denies it

#### Scenario: Lore for a missing card
- **WHEN** the DM tries to store lore under an ID that names no card
- **THEN** the server denies it

#### Scenario: A wrong author
- **WHEN** the DM tries to save lore with another user as its author
- **THEN** the server denies it

### Requirement: Lore on the Kart geçmişi page
The Kart geçmişi page SHALL show a "Hikâye" section under the card's labels and status, with the card's lore as written, keeping its line breaks. When the card has no lore, a player SHALL see no section. The lore SHALL be read only while the page is open, and a change SHALL show without a reload.

#### Scenario: A card with lore
- **WHEN** Ayla opens the Kart geçmişi of "Aboleth's Eyes", whose lore has two paragraphs
- **THEN** she sees "Hikâye" with both paragraphs, under the card's labels and status

#### Scenario: A card without lore
- **WHEN** Ayla opens the Kart geçmişi of a card without lore
- **THEN** the page shows no "Hikâye" section

#### Scenario: A live change
- **WHEN** the DM saves new lore for "Aboleth's Eyes" while Ayla has its page open
- **THEN** Ayla's page shows the new lore without a reload

### Requirement: The DM edits lore in place
On the Kart geçmişi page, the DM SHALL see the "Hikâye" section on every card. It SHALL offer "Hikâye ekle" when the card has no lore and "Düzenle" when it has. Either SHALL open a text box with the current lore, "Kaydet" and "Vazgeç". Saving an empty or blank text SHALL delete the lore. A failed save SHALL keep the text box open and say in Turkish that the lore could not be saved.

#### Scenario: Adding lore
- **WHEN** the DM selects "Hikâye ekle" on "Aboleth's Eyes", writes a text, and selects "Kaydet"
- **THEN** the section shows the text, and "Düzenle" in place of "Hikâye ekle"

#### Scenario: Cancelling
- **WHEN** the DM changes the lore in the text box and selects "Vazgeç"
- **THEN** the section shows the stored lore unchanged

#### Scenario: Clearing lore
- **WHEN** the DM empties the text box and selects "Kaydet"
- **THEN** the lore is deleted, and players see no "Hikâye" section

#### Scenario: A failed save
- **WHEN** the DM's save of the lore fails
- **THEN** the text box stays open with the DM's text, and a Turkish message says the lore could not be saved

### Requirement: Lore is not in the log
Saving or deleting lore SHALL NOT create an İşlem Logu event or a definition change record, and SHALL NOT change the card's definition. It SHALL stay possible whatever the card's status, also while a pack is open.

#### Scenario: Saving lore
- **WHEN** the DM saves lore for "Aboleth's Eyes"
- **THEN** no change record is created, and the card's definition is unchanged

#### Scenario: While a pack is open
- **WHEN** the DM saves lore for "Aboleth's Eyes" while Ayla has a pack open
- **THEN** the lore is saved
