## MODIFIED Requirements

### Requirement: Building the pictures
A picture build script SHALL read the `.7z` archives and loose PNG files of a given folder, without changing them, and write the converted Blessed and Cursed cardbacks, packs and Cardmaker with a manifest to the app's public picture folder, which is not committed. It SHALL replace an earlier build. It SHALL leave card and True Word pictures to the picture import, and the sets' cardbacks and Cardmakers to the set import (spec: admin-scripts), and SHALL NOT touch Firestore or the file storage. Without 7-Zip it SHALL stop with a Turkish message saying how to install it.

#### Scenario: Building from the downloads
- **WHEN** an admin runs the build script with the folder that holds the five archives
- **THEN** the public picture folder holds the Blessed and Cursed cardbacks, the pack pictures, the screens' Cardmaker pictures and a manifest, and no card, word or set picture, and the archives are unchanged

#### Scenario: No 7-Zip
- **WHEN** the build script runs on a machine without 7-Zip
- **THEN** it stops with a Turkish message naming `brew install sevenzip`, and writes nothing

### Requirement: Matching cardback, pack and Cardmaker pictures
By the legacy names, a file SHALL be one of these:
- a Cardmaker picture, for a known `cardmaker_*` stem that is not a set's
- a pack picture, for `pack_<mechanic stem>`, `pack_gold` or `pack_cursedgold`
- a cardback, for `blessed_cb` or `cursed_cb`
- a set's cardback, for `<set>_cb`, or a set's Cardmaker, for `cardmaker_<set>`, which the set import matches against the stored sets by code, official name or alias

The build SHALL count the set files as left to the set import. `<set>_std`, `_prm`, `_crs` and `_gold` SHALL NOT be pictures.

#### Scenario: A cardback
- **WHEN** the archives hold `kesqer_cb.png`, and the set import runs with them
- **THEN** it becomes the cardback of Kesqerian Nights

#### Scenario: A mechanic pack picture
- **WHEN** the archives hold `pack_blood.png`
- **THEN** it becomes the picture of the Blood & Battle Mechanic Pack

#### Scenario: A set file in the build
- **WHEN** the archives hold `cardmaker_ulagal.png`, and the build script runs
- **THEN** the build writes no picture for it, and its report counts it as left to the set import

### Requirement: Build report and dry run
After a build, the script SHALL report in Turkish how many cardbacks, pack pictures and mascots got a picture, name each of them that has no picture, list the duplicates among them, and say how many files it left to the picture import and how many to the set import. With a dry-run option it SHALL print the same report without writing anything.

#### Scenario: Previewing a build
- **WHEN** an admin runs the build script with the dry-run option
- **THEN** the report shows the cardbacks, pack pictures and mascots that would be built, how many card and word files are left to the picture import, and how many set files to the set import, and the public picture folder is unchanged

### Requirement: Pictures with a fallback
The application SHALL learn from the manifest which Blessed and Cursed cardbacks, pack pictures and screen Cardmaker pictures exist, from each stored set whether it has a cardback and a Cardmaker, and from each card and word definition whether it has a picture, and SHALL ask the server only for those. A card, back, pack, word or mascot without a picture, or every one of them when no pictures are built or imported, SHALL keep the look it has without pictures. A picture that fails to load SHALL fall back the same way.

#### Scenario: No pictures built
- **WHEN** the application runs where neither the build script, the set import with pictures, nor the picture import ever ran
- **THEN** every card, back, pack and word has its CSS look, no mascot is shown, and nothing fails

#### Scenario: A card without a picture
- **WHEN** the library shows "Scorched Earth", which has no picture, among cards that have one
- **THEN** "Scorched Earth" has its CSS face, and the others show their pictures

#### Scenario: A missing file
- **WHEN** a card's definition names a picture file that cannot be loaded
- **THEN** the card has its CSS face, and nothing fails

#### Scenario: A set without a cardback
- **WHEN** a Standard Pack of a set without a cardback opens
- **THEN** its face-down cards show the neutral back, and nothing fails

### Requirement: Pack pictures in the shop
Each Pack Shop tile SHALL show the pack's picture across its width: a Mechanic Pack its mechanic's picture, the Golden and Cursed Golden Packs theirs, and a set's pack its set's cardback. A Mechanic Pack SHALL show its name under the picture and no price, because its price is in its section's heading. A pack inside a group SHALL show its short name under the picture and its price under the name. A tile without a picture SHALL show its glyph in the picture's place.

#### Scenario: A Mechanic Pack
- **WHEN** a user opens the Pack Shop
- **THEN** the Blood & Battle Mechanic Pack tile shows the Blood & Battle pack picture across its width and its name under it, with no price on the tile

#### Scenario: A set pack without its own picture
- **WHEN** a user opens the Kesqerian Nights group
- **THEN** its tiles show, in this order, the Kesqerian Nights cardback with "Standart" and "2 LP / 5.000 GP" under it, with "Premium" and "3 LP / 7.500 GP" under it, and with "Cursed" and "1 LP / 2.500 GP" under it

#### Scenario: The Pandemonium packs
- **WHEN** a user opens the Pandemonium group
- **THEN** its two tiles show the Pandemonium cardback, one with "Pandemonium" and the other with "Cursed" under it, each with "3 LP / 7.500 GP" under the name

#### Scenario: A pack without a picture
- **WHEN** the Kesqerian Nights group is shown while the set has no cardback
- **THEN** each pack tile shows its glyph, its short name and its price

#### Scenario: A pack's name for screen readers
- **WHEN** a screen reader reaches the Kesqerian Nights Premium Pack tile
- **THEN** it reads the tile as "Kesqerian Nights Premium Pack aç"

### Requirement: Short pack names in a group
Inside a group, the pack tiles SHALL be named "Standart", "Premium" and "Cursed" in the group of a "Standart / Premium / Cursed" set, the set's official name and "Cursed" in the group of a "Tek paket + Cursed" set, and "Golden" and "Cursed Golden" in the Golden Packs group. Everywhere else, the pack keeps its full name, for example "Kesqerian Nights Standard Pack" in its confirmation and in the log.

#### Scenario: The Golden Packs
- **WHEN** a user opens the Golden Packs group
- **THEN** the tiles read "Golden" with "4 LP / 10.000 GP" under it and "Cursed Golden" with "3 LP / 7.500 GP" under it

#### Scenario: The confirmation
- **WHEN** Ayla selects the "Standart" tile of the Kesqerian Nights group
- **THEN** the confirmation names the pack "Kesqerian Nights Standard Pack"

#### Scenario: Another set with one pack
- **WHEN** the set "Ulagal" has the "Tek paket + Cursed" layout, and a user opens its group
- **THEN** the tiles read "Ballad of Ulagal" and "Cursed"

### Requirement: The Cardmaker of the pack groups
Each set group of the Pack Shop SHALL show its stored set's Cardmaker in place of the shop's, or the shop's while the set has none. The Golden Packs group SHALL show `cardmaker_gold`, larger. Like every Cardmaker, a group's Cardmaker SHALL NOT show on a window narrower than 640 CSS pixels.

#### Scenario: A set group
- **WHEN** a user opens the Ballad of Ulagal group on a tablet 800 CSS pixels wide
- **THEN** the Ulagal Cardmaker is shown with the group's title

#### Scenario: The Pandemonium group
- **WHEN** a user opens the Pandemonium group on a tablet 800 CSS pixels wide, after the set import stored `cardmaker_pandemonium` for Pandemonium
- **THEN** the Pandemonium Cardmaker is shown with the group's title

#### Scenario: The Golden Packs on a desktop
- **WHEN** a user opens the Golden Packs group on a desktop window with a mouse
- **THEN** `cardmaker_gold` stands in the bottom-right corner, larger than the shop's Cardmaker there

#### Scenario: A set group on a phone
- **WHEN** a user opens the Ballad of Ulagal group 360 CSS pixels wide
- **THEN** no Cardmaker is shown, and the group's title and packs use the whole width

### Requirement: Pictures of the pack groups
In the Pack Shop's main view, each set's group tile SHALL show its set's cardback. The Golden Packs tile SHALL show the Golden Pack's picture. The group's name SHALL be under the picture. A group without a picture SHALL keep its glyph and its name.

#### Scenario: The Set Packs
- **WHEN** a user opens the Pack Shop
- **THEN** the "Kesqerian Nights Packs" tile shows the Kesqerian Nights cardback with "Kesqerian Nights Packs" under it

#### Scenario: The Golden Packs
- **WHEN** a user opens the Pack Shop
- **THEN** the "Golden Packs" tile shows the Golden Pack picture with "Golden Packs" under it

#### Scenario: No pictures built
- **WHEN** the Pack Shop is shown where no pictures are built and no set has a cardback
- **THEN** each set's group shows "♜" with its name, and the Golden Packs "✦" with its name

### Requirement: Anyone may open a stored picture
A stored card, word or set picture SHALL be readable by anyone who knows its address, without signing in, whatever the status of its definition. Only the DM SHALL store or delete a picture file. The server SHALL deny every other write.

#### Scenario: Opening a picture's address
- **WHEN** someone who is not signed in opens the address of the picture of "Aboleth's Eyes"
- **THEN** the picture is shown

#### Scenario: Opening a set picture's address
- **WHEN** someone who is not signed in opens the address of the Kesqerian Nights cardback
- **THEN** the picture is shown

#### Scenario: A player uploads a picture
- **WHEN** Ayla tries to store a file as a card picture or as a set's cardback
- **THEN** the server denies it

#### Scenario: A player deletes a picture
- **WHEN** Ayla tries to delete the picture file of "Aboleth's Eyes"
- **THEN** the server denies it, and the picture stays

### Requirement: Stored picture files
A stored picture SHALL be a WebP file of at most 1 MB, kept under its card's, word's or set's identity. Its file name SHALL carry a hash of its content, so a changed picture gets a new address. The server SHALL refuse any other file, and any file outside the card, word and set pictures.

#### Scenario: A file that is not WebP
- **WHEN** the DM's device tries to store a PNG file as a card picture
- **THEN** the server refuses it

#### Scenario: A file that is too large
- **WHEN** the DM's device tries to store a 2 MB WebP file as a card picture
- **THEN** the server refuses it

#### Scenario: A file elsewhere
- **WHEN** the DM's device tries to store a file outside the card, word and set pictures
- **THEN** the server refuses it

#### Scenario: A set picture
- **WHEN** the DM's device stores a 300 KB WebP file as the cardback of "Kesqer"
- **THEN** the server accepts it
