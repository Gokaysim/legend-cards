# Spec Delta

## ADDED Requirements

### Requirement: Card and word pictures are stored with their definitions
Each card and each True Word SHALL have at most one picture, stored as a file in the application's file storage, and its definition SHALL say where the picture is. The DM's picture changes and the picture import SHALL be the only ways a definition gets, changes or loses a picture. A picture change SHALL show on every device without a reload. A renamed card or word SHALL keep its picture.

#### Scenario: A replaced picture
- **WHEN** Ayla holds "Aboleth's Eyes", and the DM saves a new picture for it
- **THEN** Ayla's hand shows the new picture on every device without a reload

#### Scenario: A renamed word
- **WHEN** the DM renames the True Word "Abyss", which has a picture
- **THEN** the word keeps its picture

#### Scenario: A card added in the app
- **WHEN** the DM adds the card "Bard's Encore" with a picture
- **THEN** its face shows that picture wherever the card is shown

### Requirement: Anyone may open a stored picture
A stored card or word picture SHALL be readable by anyone who knows its address, without signing in, whatever the status of its definition. Only the DM SHALL store or delete a picture file. The server SHALL deny every other write.

#### Scenario: Opening a picture's address
- **WHEN** someone who is not signed in opens the address of the picture of "Aboleth's Eyes"
- **THEN** the picture is shown

#### Scenario: A player uploads a picture
- **WHEN** Ayla tries to store a file as a card picture
- **THEN** the server denies it

#### Scenario: A player deletes a picture
- **WHEN** Ayla tries to delete the picture file of "Aboleth's Eyes"
- **THEN** the server denies it, and the picture stays

### Requirement: Stored picture files
A stored picture SHALL be a WebP file of at most 1 MB, kept under its card's or word's identity. Its file name SHALL carry a hash of its content, so a changed picture gets a new address. The server SHALL refuse any other file, and any file outside the card and word pictures.

#### Scenario: A file that is not WebP
- **WHEN** the DM's device tries to store a PNG file as a card picture
- **THEN** the server refuses it

#### Scenario: A file that is too large
- **WHEN** the DM's device tries to store a 2 MB WebP file as a card picture
- **THEN** the server refuses it

#### Scenario: A file elsewhere
- **WHEN** the DM's device tries to store a file outside the card and word pictures
- **THEN** the server refuses it

## MODIFIED Requirements

### Requirement: Building the pictures
A picture build script SHALL read the `.7z` archives and loose PNG files of a given folder, without changing them, and write the converted cardbacks, packs and Cardmaker with a manifest to the app's public picture folder, which is not committed. It SHALL replace an earlier build. It SHALL leave card and True Word pictures to the picture import (spec: admin-scripts), and SHALL NOT touch Firestore or the file storage. Without 7-Zip it SHALL stop with a Turkish message saying how to install it.

#### Scenario: Building from the downloads
- **WHEN** an admin runs the build script with the folder that holds the five archives
- **THEN** the public picture folder holds the matched cardbacks, pack pictures, Cardmaker pictures and a manifest, and no card or word picture, and the archives are unchanged

#### Scenario: No 7-Zip
- **WHEN** the build script runs on a machine without 7-Zip
- **THEN** it stops with a Turkish message naming `brew install sevenzip`, and writes nothing

### Requirement: Matching card and word pictures
Each file SHALL be matched by its name without the extension, compared as card names are. `tw<name>` SHALL be that True Word, and `cursed_<name>` that Cursed card. A name that is no other kind of picture SHALL be the Legend card, normal or Blessed, of that name, or else the Cursed card of that name. The picture import SHALL match against the stored definitions, whatever their status: a name SHALL find the definition whose identity that name gives, or else the one whose name equals it.

#### Scenario: A card picture
- **WHEN** the archives hold `abolethseyes.png`
- **THEN** it becomes the picture of "Aboleth's Eyes"

#### Scenario: A True Word
- **WHEN** the archives hold `twabyss.png`
- **THEN** it becomes the picture of the True Word "Abyss"

#### Scenario: A renamed card
- **WHEN** the DM renamed "Aboleth's Eyes" to "Eyes of the Aboleth" before it got a picture, and the archives hold `abolethseyes.png`
- **THEN** that file becomes the picture of "Eyes of the Aboleth"

#### Scenario: A card added in the app
- **WHEN** the DM added the draft "Bard's Encore" in the app, and the archives hold `bardsencore.png`
- **THEN** that file becomes the picture of "Bard's Encore"

### Requirement: Picture aliases
A table kept in the repository SHALL map a file name to the card, Cursed card, True Word or asset it shows, for files whose names differ from the data. An alias SHALL win over the name rules. An alias naming an asset that does not exist SHALL stop the build with its row number. An alias naming a card, Cursed card or True Word that is not stored SHALL stop the picture import with its row number.

#### Scenario: A misspelled file
- **WHEN** the table maps `orkolsacquisiton.png` to "Orkol's Acquisition"
- **THEN** that file becomes the picture of "Orkol's Acquisition"

#### Scenario: A renamed Blessed card
- **WHEN** the table maps `charmingrogue.png` to "Roguish Charm"
- **THEN** that file becomes the picture of the Blessed card "Roguish Charm"

#### Scenario: A broken alias
- **WHEN** a row of the table names a card that is not stored
- **THEN** the picture import reports that row and stops, and writes nothing

### Requirement: Duplicates and unknown files
When two files become the picture of the same card, word or asset, the file whose name matches without an alias SHALL win, and otherwise the first by name. The other SHALL be reported as a duplicate and not used. A file that matches no asset and no stored definition SHALL be reported by the picture import as unknown and skipped. Neither SHALL stop the build or the picture import.

#### Scenario: A duplicate
- **WHEN** the archives hold both `alazizsurpriseattack.png` and `alazizsurpiseattack.png`
- **THEN** the first is used for "Al-Aziz' Surprise Attack", and the picture import's report lists the second as a duplicate

#### Scenario: An unknown file
- **WHEN** the archives hold `zamansgolfc.png`, which matches nothing
- **THEN** the picture import's report lists it as unknown, and the import goes on

### Requirement: Build report and dry run
After a build, the script SHALL report in Turkish how many cardbacks, pack pictures and mascots got a picture, name each of them that has no picture, list the duplicates among them, and say how many files it left to the picture import. With a dry-run option it SHALL print the same report without writing anything.

#### Scenario: Previewing a build
- **WHEN** an admin runs the build script with the dry-run option
- **THEN** the report shows the cardbacks, pack pictures and mascots that would be built, and how many card and word files are left to the picture import, and the public picture folder is unchanged

### Requirement: Converted pictures
Cardback, pack and imported card and True Word pictures SHALL be stored as WebP at their own size. Cardmaker pictures SHALL be shrunk to at most 480 pixels high, keeping their transparency. A picture the DM uploads SHALL be stored as WebP, shrunk to fit within 563 × 788 pixels with its proportions kept, and never enlarged. Each file name SHALL carry a hash of its content, so a changed picture gets a new address.

#### Scenario: Rebuilding with a changed picture
- **WHEN** the owner replaces the Kesqerian Nights cardback in an archive and the build script runs again
- **THEN** that cardback has a new address in the manifest, and the other addresses are unchanged

#### Scenario: A large upload
- **WHEN** the DM uploads a 1126 × 1576 pixel PNG for a card
- **THEN** the stored picture is a 563 × 788 pixel WebP

#### Scenario: A small upload
- **WHEN** the DM uploads a 400 × 560 pixel JPEG for a card
- **THEN** the stored picture is a 400 × 560 pixel WebP

### Requirement: Pictures with a fallback
The application SHALL learn from the manifest which cardbacks, pack pictures and Cardmaker pictures exist, and from each card and word definition whether it has a picture, and SHALL ask the server only for those. A card, back, pack, word or mascot without a picture, or every one of them when no pictures are built or imported, SHALL keep the look it has without pictures. A picture that fails to load SHALL fall back the same way.

#### Scenario: No pictures built
- **WHEN** the application runs where neither the build script nor the picture import ever ran
- **THEN** every card, back, pack and word has its CSS look, no mascot is shown, and nothing fails

#### Scenario: A card without a picture
- **WHEN** the library shows "Scorched Earth", which has no picture, among cards that have one
- **THEN** "Scorched Earth" has its CSS face, and the others show their pictures

#### Scenario: A missing file
- **WHEN** a card's definition names a picture file that cannot be loaded
- **THEN** the card has its CSS face, and nothing fails
