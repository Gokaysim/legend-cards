# card-images Specification

## Purpose

Builds the owner's card, cardback, pack, True Word and Cardmaker pictures into the app from their archives, and shows them on card faces, face-down cards, pack tiles, True Word tiles and screen titles, with the CSS look as the fallback.

## Requirements

### Requirement: Building the pictures
A picture build script SHALL read the `.7z` archives and loose PNG files of a given folder, without changing them, and write the converted Blessed and Cursed cardbacks, packs and Cardmaker with a manifest to the app's public picture folder, which is not committed. It SHALL replace an earlier build. It SHALL leave card and True Word pictures to the picture import, and the sets' cardbacks and Cardmakers to the set import (spec: admin-scripts), and SHALL NOT touch Firestore or the file storage. Without 7-Zip it SHALL stop with a Turkish message saying how to install it.

#### Scenario: Building from the downloads
- **WHEN** an admin runs the build script with the folder that holds the five archives
- **THEN** the public picture folder holds the Blessed and Cursed cardbacks, the pack pictures, the screens' Cardmaker pictures and a manifest, and no card, word or set picture, and the archives are unchanged

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
After a build, the script SHALL report in Turkish how many cardbacks, pack pictures and mascots got a picture, name each of them that has no picture, list the duplicates among them, and say how many files it left to the picture import and how many to the set import. With a dry-run option it SHALL print the same report without writing anything.

#### Scenario: Previewing a build
- **WHEN** an admin runs the build script with the dry-run option
- **THEN** the report shows the cardbacks, pack pictures and mascots that would be built, how many card and word files are left to the picture import, and how many set files to the set import, and the public picture folder is unchanged

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

### Requirement: Card faces with pictures
A card face with a picture SHALL show the picture, with the card's name as its alternative text, without a frame of its own: the picture's printed frame shows the card's kind. It SHALL write nothing about the card under it. The face SHALL keep its marks. The cost, name and text SHALL stay readable to screen readers. This SHALL hold in every tab of the Kütüphane, True Word faces included, the hand, the card details, and the revealed cards of draws and packs.

#### Scenario: A card in the library
- **WHEN** a user looks at "Aboleth's Eyes" in the Kartlar tab's card view
- **THEN** its face shows its picture, with its printed purple frame, without a frame around it and with no text under it

#### Scenario: A card with a picture next to one without
- **WHEN** the Cursed tab shows "Scorched Earth", which has no picture, next to "Visions of Death", which has one
- **THEN** "Scorched Earth" has its CSS face in a red frame, and "Visions of Death" shows only its picture

#### Scenario: A True Word face with a picture
- **WHEN** a user looks at "Aid", which has a picture and which Ayla knows, in Ayla's True Words tab
- **THEN** its face shows only the picture of "Aid", with "Aid" as its alternative text, and keeps its "Biliyor" mark

### Requirement: Set, rarity and mechanic pack on the set symbol
On a card face with a picture, the set, rarity and mechanic pack SHALL show in a note only while the pointer rests on the picture's set symbol in its bottom-right corner, or after the symbol is tapped until it loses the focus. A Cursed card SHALL have no note. The note SHALL stay inside the picture, and stay readable to screen readers while hidden.

#### Scenario: The set symbol
- **WHEN** a user rests the pointer on the set symbol of "Aboleth's Eyes", or taps it
- **THEN** a note shows "Kesqerian Nights · Common" and its mechanic pack, and it goes away when the pointer leaves or the symbol loses the focus

#### Scenario: A marked card in a hand
- **WHEN** Ayla's hand shows her active card with a note, and a user rests the pointer on it
- **THEN** its face shows the picture with the "● Aktif" mark, and the "✎" note icon in the picture's bottom-left corner

### Requirement: Hand cost on a picture
When a card's cost in a hand differs from its own cost, its face with a picture SHALL show the hand cost as a badge on the picture's cost corner. Two numbers SHALL differ by value, and other costs as text without surrounding spaces or letter case. The badge SHALL be marked lower or higher when both costs are numbers, and otherwise SHALL show unmarked in the neutral look of the badge on a face without a picture. Either way, its title and screen reader text SHALL name the card's own cost.

#### Scenario: A cheaper card
- **WHEN** the DM sets the cost of Ayla's 3-cost card with a picture to "1"
- **THEN** the face shows a badge "1" on the picture, marked as lower

#### Scenario: An X card with a number
- **WHEN** the DM sets the cost of Ayla's "Leon's Lanza", which costs "X" and has a picture, to "3"
- **THEN** the face shows a badge "3" on the picture, neither green nor red, and a screen reader hears its cost as 3 with "temel cost: X"

#### Scenario: A d6 card with a number
- **WHEN** the DM sets the cost of Ayla's "Hran's Diligent Defence", which costs "d6" and has a picture, to "4"
- **THEN** the face shows an unmarked badge "4" on the picture

#### Scenario: A number card given an X
- **WHEN** the DM sets the cost of Ayla's 3-cost card with a picture to "X"
- **THEN** the face shows an unmarked badge "X" on the picture

#### Scenario: The same cost written another way
- **WHEN** the DM sets the cost of Ayla's 3-cost card with a picture to "3,0", or the cost of her "d6" card to "D6"
- **THEN** the face shows no badge on the picture

### Requirement: Cardbacks that give nothing away
Every face-down card of one spread SHALL show the same back:
- a Cursed draw, and a Cursed, Cursed Golden or Pandemonium Cursed Pack: the Cursed cardback
- a set's Standard, Premium or Pandemonium Pack: that set's cardback
- a Mechanic Pack: that Mechanic Pack's own picture, or the neutral back while it has none
- a random draw and a Golden Pack: the neutral back drawn without a picture

The back SHALL never depend on the card under it.

#### Scenario: A random draw
- **WHEN** Ayla draws a random card that turns out to be Blessed
- **THEN** its back is the neutral back, the same as for any other random draw

#### Scenario: A set pack
- **WHEN** a Kesqerian Nights Standard Pack opens
- **THEN** all its face-down cards show the Kesqerian Nights cardback

#### Scenario: A Cursed Pack
- **WHEN** a Kesqerian Nights Cursed Pack opens
- **THEN** all its face-down cards, the Cursed card included, show the Cursed cardback

#### Scenario: A Mechanic Pack
- **WHEN** a Blood & Battle Mechanic Pack opens, and one of its cards is Blessed
- **THEN** all its face-down cards, the Blessed card included, show the Blood & Battle pack picture

#### Scenario: A Mechanic Pack without a picture
- **WHEN** a Mechanic Pack opens whose pack picture is not built
- **THEN** all its face-down cards show the neutral back

#### Scenario: A Golden Pack
- **WHEN** a Golden Pack opens
- **THEN** all its face-down cards show the neutral back

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

### Requirement: True Word pictures
A True Word tile with a picture SHALL show the picture, with the word's name as its alternative text, in place of its text paragraph. It keeps its name, its "<cost> LP" badge, its marks and its controls. The text SHALL stay readable to screen readers. This SHALL hold on the hand's True Words tab, the draft panel, and the word's details. The Kütüphane's True Words tab SHALL show its words as faces instead (spec: card-library, "Card view").

#### Scenario: A word in a draft
- **WHEN** Ayla's open draft shows "Abyss"
- **THEN** its tile shows the Abyss picture, its name and "5 LP", and the "Öğren" button

#### Scenario: The same word in the Kütüphane
- **WHEN** a user opens the Kütüphane's True Words tab
- **THEN** "Abyss" shows as a face, not as a tile

### Requirement: The Cardmaker on screens
Each screen title SHALL show its Cardmaker picture, when there is one, as decoration without alternative text, unless the screen places her in the corner (see "The Cardmaker in the corner"). The Kütüphane SHALL show the Cardmaker of its open tab:

| Screen | Cardmaker |
| --- | --- |
| Pack Shop | `cardmaker_shop` |
| Kütüphane, Kartlar tab | `cardmaker_lib` |
| Kütüphane, Cursed tab | `cardmaker_cursed` |
| Kütüphane, True Words tab | `cardmaker_true` |
| İşlem Logu | `cardmaker_think` |
| Elixir Shop | `cardmaker_zaddir` |
| Kurallar | `cardmaker_wave` |
| Custom Card Draft | `cardmaker_custom` |
| Veri / Yedek | `cardmaker_peek` |

A screen whose Cardmaker has no picture SHALL show none. On a window narrower than 640 CSS pixels, no screen SHALL show a Cardmaker.

#### Scenario: The library
- **WHEN** a user opens the Kütüphane on a tablet 800 CSS pixels wide
- **THEN** the Kartlar tab's Cardmaker, `cardmaker_lib`, is shown next to its title

#### Scenario: Another tab
- **WHEN** a user opens the Kütüphane's Cursed tab on a tablet 800 CSS pixels wide
- **THEN** `cardmaker_cursed` is shown next to the title

#### Scenario: The library on a phone
- **WHEN** a user opens the Kütüphane 360 CSS pixels wide
- **THEN** no Cardmaker is shown, next to the title or anywhere else

#### Scenario: A missing Cardmaker
- **WHEN** a user opens the Custom Card Draft on a tablet where `cardmaker_custom` has no picture
- **THEN** the title is shown without a picture

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

### Requirement: The shocked Cardmaker for a Blessed card
When a Blessed card is turned over in a draw or in an open pack, the shocked Cardmaker pair SHALL appear on both sides for about a second, on every device that sees it turn, except on a window narrower than 640 CSS pixels. A card that was already face up when the screen opened SHALL NOT start it. With reduced motion, the pair SHALL appear and disappear without movement.

#### Scenario: A Blessed card in a pack
- **WHEN** Ayla turns over a Blessed card in her open pack on a desktop while Bora watches on a tablet
- **THEN** both see the shocked Cardmaker pair for about a second

#### Scenario: Reopening a pack view
- **WHEN** Bora opens the pack view after the Blessed card was already turned
- **THEN** the shocked pair does not appear

#### Scenario: A phone
- **WHEN** Ayla turns over a Blessed card on a phone 360 CSS pixels wide
- **THEN** the shocked pair does not appear, and the card glows pearl white as before

### Requirement: Pictures at phone width
At 360 CSS pixels wide, the pictures SHALL fit their faces, tiles and titles, and no screen SHALL scroll horizontally.

#### Scenario: The library on a phone
- **WHEN** the library's card view with pictures is shown 360 CSS pixels wide
- **THEN** every picture fits its face, and the page has no horizontal scrollbar

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

### Requirement: The Cardmaker in the corner
On the shop screens (Shops, Pack Shop, Elixir Shop), every tab of the Kütüphane, Kurallar, and the unbuilt screens, on a device with hover whose window is at least 1024 CSS pixels wide, the screen's Cardmaker SHALL stand fixed in the window's bottom-right corner instead of next to the title. She SHALL stay there while the page scrolls and SHALL never catch the pointer. She SHALL fade out while the pointer is over her, or the keyboard focus is on something under her.

#### Scenario: The Pack Shop on a desktop
- **WHEN** a user opens the Pack Shop on a 1280 CSS pixel wide window with a mouse and scrolls to the Mechanic Packs
- **THEN** `cardmaker_shop` stands in the bottom-right corner, and no Cardmaker is next to the title

#### Scenario: A pack under her
- **WHEN** the user moves the pointer over a Mechanic Pack that lies under the Cardmaker
- **THEN** the Cardmaker fades out, and selecting the pack opens its confirmation

#### Scenario: The keyboard under her
- **WHEN** a user tabs to the Risk & Reward Mechanic Pack while it lies under the Cardmaker
- **THEN** the Cardmaker fades out until the focus moves away from under her

#### Scenario: The library on a desktop
- **WHEN** a user opens the Kütüphane's Kartlar tab on a 1280 CSS pixel wide window with a mouse
- **THEN** `cardmaker_lib` stands in the bottom-right corner, no Cardmaker is next to the title, and a card under her makes her fade out when the pointer reaches it

#### Scenario: Switching tabs on a desktop
- **WHEN** that user switches to the True Words tab
- **THEN** `cardmaker_true` stands in the bottom-right corner in place of `cardmaker_lib`

#### Scenario: An unbuilt screen on a desktop
- **WHEN** a user opens Veri / Yedek on a 1280 CSS pixel wide window with a mouse
- **THEN** `cardmaker_peek` stands in the bottom-right corner

#### Scenario: A tablet
- **WHEN** a user opens the Pack Shop on a tablet 800 CSS pixels wide
- **THEN** `cardmaker_shop` is next to the title

#### Scenario: A phone
- **WHEN** a user opens the Pack Shop on a phone 360 CSS pixels wide
- **THEN** no Cardmaker is shown, in the corner or next to the title

#### Scenario: Another screen
- **WHEN** a user opens İşlem Logu on a 1280 CSS pixel wide window with a mouse
- **THEN** `cardmaker_think` is next to its title

### Requirement: The Shops screen's Cardmaker
The Shops screen's Cardmaker SHALL be `cardmaker_keep`, or the Pack Shop's `cardmaker_shop` while `cardmaker_keep` has no picture.

#### Scenario: The Shops screen
- **WHEN** a user opens the Shops screen
- **THEN** `cardmaker_keep` is shown

#### Scenario: The Shops screen without its own picture
- **WHEN** a user opens the Shops screen while `cardmaker_keep` has no picture
- **THEN** the Pack Shop's Cardmaker is shown

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
A stored picture SHALL be a WebP file of at most 1 MB, kept under its card's, word's or set's identity. Its file name SHALL carry a hash of its content, so a changed picture gets a new address. The server SHALL refuse any other file, and any file outside the card, word and set pictures and the character photos (spec: characters, "Character photo files").

#### Scenario: A file that is not WebP
- **WHEN** the DM's device tries to store a PNG file as a card picture
- **THEN** the server refuses it

#### Scenario: A file that is too large
- **WHEN** the DM's device tries to store a 2 MB WebP file as a card picture
- **THEN** the server refuses it

#### Scenario: A file elsewhere
- **WHEN** the DM's device tries to store a file outside the card, word and set pictures and the character photos
- **THEN** the server refuses it

#### Scenario: A set picture
- **WHEN** the DM's device stores a 300 KB WebP file as the cardback of "Kesqer"
- **THEN** the server accepts it
