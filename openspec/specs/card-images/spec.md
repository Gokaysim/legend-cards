# card-images Specification

## Purpose

Builds the owner's card, cardback, pack, True Word and Cardmaker pictures into the app from their archives, and shows them on card faces, face-down cards, pack tiles, True Word tiles and screen titles, with the CSS look as the fallback.

## Requirements

### Requirement: Building the pictures
A picture build script SHALL read the `.7z` archives and loose PNG files in a folder given on the command line, without changing them, and write the converted pictures with a manifest to the application's public picture folder, which is not committed. It SHALL replace the pictures of an earlier build. It SHALL NOT read or write Firestore. Without 7-Zip it SHALL stop with a Turkish message saying how to install it.

#### Scenario: Building from the downloads
- **WHEN** an admin runs the build script with the folder that holds the five archives
- **THEN** the public picture folder holds the matched pictures and a manifest, and the archives are unchanged

#### Scenario: No 7-Zip
- **WHEN** the build script runs on a machine without 7-Zip
- **THEN** it stops with a Turkish message naming `brew install sevenzip`, and writes nothing

### Requirement: Matching card and word pictures
Each file SHALL be matched by its name without the extension, compared as card names are. `tw<name>` SHALL be that True Word, and `cursed_<name>` that Cursed card. A name that is no other kind of picture SHALL be the Legend card, normal or Blessed, of that name, or else the Cursed card of that name.

#### Scenario: A card picture
- **WHEN** the archives hold `abolethseyes.png`
- **THEN** it becomes the picture of "Aboleth's Eyes"

#### Scenario: A True Word
- **WHEN** the archives hold `twabyss.png`
- **THEN** it becomes the picture of the True Word "Abyss"

### Requirement: Matching cardback, pack and Cardmaker pictures
By the legacy names, a file SHALL be one of these:
- a Cardmaker picture, for a known `cardmaker_*` stem
- a pack picture, for `pack_<mechanic stem>`, `pack_gold` or `pack_cursedgold`
- a set's pack picture, for `<set>_std`, `_prm`, `_crs` or `_gold`
- a cardback, for `<set>_cb`, `blessed_cb` or `cursed_cb`

A set SHALL be recognized by its code, its official name or an alias.

#### Scenario: A cardback
- **WHEN** the archives hold `kesqer_cb.png`
- **THEN** it becomes the cardback of Kesqerian Nights

#### Scenario: A mechanic pack picture
- **WHEN** the archives hold `pack_blood.png`
- **THEN** it becomes the picture of the Blood & Battle Mechanic Pack

### Requirement: Picture aliases
A table kept in the repository SHALL map a file name to the card, Cursed card, True Word or asset it shows, for files whose names differ from the data. An alias SHALL win over the name rules. An alias naming nothing that exists SHALL stop the build with its row number.

#### Scenario: A misspelled file
- **WHEN** the table maps `orkolsacquisiton.png` to "Orkol's Acquisition"
- **THEN** that file becomes the picture of "Orkol's Acquisition"

#### Scenario: A renamed Blessed card
- **WHEN** the table maps `charmingrogue.png` to "Roguish Charm"
- **THEN** that file becomes the picture of the Blessed card "Roguish Charm"

#### Scenario: A broken alias
- **WHEN** a row of the table names a card that the card files do not have
- **THEN** the script reports that row and stops, and writes nothing

### Requirement: Duplicates and unknown files
When two files become the picture of the same card, word or asset, the file whose name matches without an alias SHALL win, and otherwise the first by name. The other SHALL be reported as a duplicate and not used. A file that matches nothing SHALL be reported as unknown and skipped. Neither SHALL stop the build.

#### Scenario: A duplicate
- **WHEN** the archives hold both `alazizsurpriseattack.png` and `alazizsurpiseattack.png`
- **THEN** the first is used for "Al-Aziz' Surprise Attack", and the report lists the second as a duplicate

#### Scenario: An unknown file
- **WHEN** the archives hold `zamansgolfc.png`, which matches nothing
- **THEN** the report lists it as unknown, and the build goes on

### Requirement: Build report and dry run
After a build, the script SHALL report in Turkish how many cards, Cursed cards, Blessed cards, True Words, cardbacks, pack pictures and mascots got a picture. It SHALL name each of them that has no picture, and list the duplicates and the unknown files. With a dry-run option it SHALL print the same report without writing anything.

#### Scenario: Previewing a build
- **WHEN** an admin runs the build script with the dry-run option
- **THEN** the report shows what would be built, including that "Scorched Earth" has no picture, and the public picture folder is unchanged

### Requirement: Converted pictures
Card, cardback, pack and True Word pictures SHALL be stored as WebP at their own size. Cardmaker pictures SHALL be shrunk to at most 480 pixels high, keeping their transparency. Each file name SHALL carry a hash of its content, so a changed picture gets a new address.

#### Scenario: Rebuilding with a changed picture
- **WHEN** the owner replaces one card's picture in an archive and the script runs again
- **THEN** that card's picture has a new address in the manifest, and the other addresses are unchanged

### Requirement: Pictures with a fallback
The application SHALL learn from the manifest which pictures exist, and SHALL ask the server only for those. A card, back, pack, word or mascot without a picture, or every one of them when no pictures are built, SHALL keep the look it has without pictures. A picture that fails to load SHALL fall back the same way.

#### Scenario: No pictures built
- **WHEN** the application runs where the build script never ran
- **THEN** every card, back, pack and word has its CSS look, no mascot is shown, and nothing fails

#### Scenario: A card without a picture
- **WHEN** the library shows "Scorched Earth", which has no picture, among cards that have one
- **THEN** "Scorched Earth" has its CSS face, and the others show their pictures

### Requirement: Card faces with pictures
A card face with a picture SHALL show the picture, with the card's name as its alternative text, without a frame of its own: the picture's printed frame shows the card's kind. It SHALL write nothing about the card under it. The face SHALL keep its marks. The cost, name and text SHALL stay readable to screen readers. This SHALL hold in the library, the Cursed Deck, the hand, the card details, and the revealed cards of draws and packs.

#### Scenario: A card in the library
- **WHEN** a user looks at "Aboleth's Eyes" in the library's card view
- **THEN** its face shows its picture, with its printed purple frame, without a frame around it and with no text under it

#### Scenario: A card with a picture next to one without
- **WHEN** the Cursed Deck shows "Scorched Earth", which has no picture, next to "Visions of Death", which has one
- **THEN** "Scorched Earth" has its CSS face in a red frame, and "Visions of Death" shows only its picture

### Requirement: Set, rarity and mechanic pack on the set symbol
On a card face with a picture, the set, rarity and mechanic pack SHALL show in a note only while the pointer rests on the picture's set symbol in its bottom-right corner, or after the symbol is tapped until it loses the focus. A Cursed card SHALL have no note. The note SHALL stay inside the picture, and stay readable to screen readers while hidden.

#### Scenario: The set symbol
- **WHEN** a user rests the pointer on the set symbol of "Aboleth's Eyes", or taps it
- **THEN** a note shows "Kesqerian Nights · Common" and its mechanic pack, and it goes away when the pointer leaves or the symbol loses the focus

#### Scenario: A marked card in a hand
- **WHEN** Ayla's hand shows her active card with a note, and a user rests the pointer on it
- **THEN** its face shows the picture with the "● Aktif" mark, and the "✎" note icon in the picture's bottom-left corner

### Requirement: Hand cost on a picture
When a card's cost in a hand differs from its own cost, its face with a picture SHALL show the hand cost as a badge on the picture's cost corner. The badge SHALL be marked lower or higher when both costs are numbers.

#### Scenario: A cheaper card
- **WHEN** the DM sets the cost of Ayla's 3-cost card with a picture to "1"
- **THEN** the face shows a badge "1" on the picture, marked as lower

### Requirement: Cardbacks that give nothing away
Every face-down card of one spread SHALL show the same back:
- a Cursed draw, and a Cursed, Cursed Golden or Pandemonium Cursed Pack: the Cursed cardback
- a set's Standard, Premium or Pandemonium Pack: that set's cardback
- a random draw, a Mechanic Pack and a Golden Pack: the neutral back drawn without a picture

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

### Requirement: Pack pictures in the shop
Each Pack Shop tile SHALL show the pack's picture across its width: a Mechanic Pack its mechanic's picture, the Golden and Cursed Golden Packs theirs, and a set's pack its own picture or else its set's cardback. The price SHALL be above the picture, except on a Mechanic Pack, whose price is in its section's heading. Only Mechanic, Golden, Cursed Golden, Pandemonium and Pandemonium Cursed Packs, and packs without a picture, SHALL show their name under it.

#### Scenario: A Mechanic Pack
- **WHEN** a user opens the Pack Shop
- **THEN** the Blood & Battle Mechanic Pack tile shows the Blood & Battle pack picture across its width and its name under it, with no price on the tile

#### Scenario: A set pack without its own picture
- **WHEN** a user opens the Kesqerian Nights group
- **THEN** its Standard, Premium and Cursed Pack tiles show their prices above the Kesqerian Nights cardback, and no name under it

#### Scenario: The Pandemonium packs
- **WHEN** a user opens the Pandemonium group
- **THEN** the Pandemonium Pack and the Pandemonium Cursed Pack each show "3 LP / 7.500 GP" above the Pandemonium cardback and their names under it

#### Scenario: A pack without a picture
- **WHEN** the Kesqerian Nights group is shown where no pictures are built
- **THEN** each pack tile shows its price, its glyph and its name

#### Scenario: A pack's name for screen readers
- **WHEN** a screen reader reaches the Kesqerian Nights Premium Pack tile
- **THEN** it reads the tile as "Kesqerian Nights Premium Pack aç"

### Requirement: True Word pictures
A True Word tile with a picture SHALL show the picture, with the word's name as its alternative text, in place of its text paragraph. It keeps its name, its "<cost> LP" badge, its marks and its controls. The text SHALL stay readable to screen readers. This SHALL hold on the True Words screen, the hand's True Words tab, the draft panel, and the word's details.

#### Scenario: A word in a draft
- **WHEN** Ayla's open draft shows "Abyss"
- **THEN** its tile shows the Abyss picture, its name and "5 LP", and the "Öğren" button

### Requirement: The Cardmaker on screens
Each screen title SHALL show its Cardmaker picture, when there is one, as decoration without alternative text:

| Screen | Cardmaker |
| --- | --- |
| Pack Shop | `cardmaker_shop` |
| Kart kütüphanesi | `cardmaker_lib` |
| Cursed Deck | `cardmaker_cursed` |
| True Words | `cardmaker_true` |
| İşlem Logu | `cardmaker_think` |
| Elixir Shop | `cardmaker_zaddir` |
| Kurallar | `cardmaker_wave` |
| Veri / Yedek | `cardmaker_peek` |

A screen whose Cardmaker has no picture SHALL show none.

#### Scenario: The library
- **WHEN** a user opens the Kart kütüphanesi
- **THEN** the library's Cardmaker is shown next to its title

#### Scenario: A missing Cardmaker
- **WHEN** a user opens the Custom Card Draft, whose Cardmaker has no picture
- **THEN** the title is shown without a picture

### Requirement: The Cardmaker of the pack groups
Each set group of the Pack Shop SHALL show its set's Cardmaker in place of the shop's, or the shop's while the set's has no picture. The Pandemonium group SHALL show `cardmaker_pandemonium`, and the Golden Packs group `cardmaker_gold`, larger.

#### Scenario: A set group
- **WHEN** a user opens the Ballad of Ulagal group on a phone
- **THEN** the Ulagal Cardmaker is shown with the group's title

#### Scenario: The Golden Packs on a desktop
- **WHEN** a user opens the Golden Packs group on a desktop window with a mouse
- **THEN** `cardmaker_gold` stands in the bottom-right corner, larger than the shop's Cardmaker there

### Requirement: The shocked Cardmaker for a Blessed card
When a Blessed card is turned over in a draw or in an open pack, the shocked Cardmaker pair SHALL appear on both sides for about a second, on every device that sees it turn. A card that was already face up when the screen opened SHALL NOT start it. With reduced motion, the pair SHALL appear and disappear without movement.

#### Scenario: A Blessed card in a pack
- **WHEN** Ayla turns over a Blessed card in her open pack while Bora watches
- **THEN** both see the shocked Cardmaker pair for about a second

#### Scenario: Reopening a pack view
- **WHEN** Bora opens the pack view after the Blessed card was already turned
- **THEN** the shocked pair does not appear

### Requirement: Pictures at phone width
At 360 CSS pixels wide, the pictures SHALL fit their faces, tiles and titles, and no screen SHALL scroll horizontally.

#### Scenario: The library on a phone
- **WHEN** the library's card view with pictures is shown 360 CSS pixels wide
- **THEN** every picture fits its face, and the page has no horizontal scrollbar

### Requirement: Pictures of the pack groups
In the Pack Shop's main view, each set's group tile SHALL show the picture of its first pack, or else its set's cardback. The Golden Packs tile SHALL show the Golden Pack's picture. The group's name SHALL be under the picture. A group without a picture SHALL keep its glyph and its name.

#### Scenario: The Set Packs
- **WHEN** a user opens the Pack Shop
- **THEN** the "Kesqerian Nights Packs" tile shows the Kesqerian Nights cardback with "Kesqerian Nights Packs" under it

#### Scenario: The Golden Packs
- **WHEN** a user opens the Pack Shop
- **THEN** the "Golden Packs" tile shows the Golden Pack picture with "Golden Packs" under it

#### Scenario: No pictures built
- **WHEN** the Pack Shop is shown where no pictures are built
- **THEN** each set's group shows "♜" with its name, and the Golden Packs "✦" with its name

### Requirement: The Cardmaker in the shops' corner
On the Shops, Pack Shop and Elixir Shop screens, on a device with hover whose window is at least 1024 CSS pixels wide, the screen's Cardmaker SHALL stand fixed in the window's bottom-right corner instead of next to the title. She SHALL stay there while the page scrolls. She SHALL never catch the pointer. She SHALL fade out while the pointer is over her, or the keyboard focus is on something under her. Elsewhere she SHALL stay next to the title.

#### Scenario: The Pack Shop on a desktop
- **WHEN** a user opens the Pack Shop on a 1280 CSS pixel wide window with a mouse and scrolls to the Mechanic Packs
- **THEN** `cardmaker_shop` stands in the bottom-right corner, and no Cardmaker is next to the title

#### Scenario: A pack under her
- **WHEN** the user moves the pointer over a Mechanic Pack that lies under the Cardmaker
- **THEN** the Cardmaker fades out, and selecting the pack opens its confirmation

#### Scenario: The keyboard under her
- **WHEN** a user tabs to the Risk & Reward Mechanic Pack while it lies under the Cardmaker
- **THEN** the Cardmaker fades out until the focus moves away from under her

#### Scenario: A phone
- **WHEN** a user opens the Pack Shop on a phone
- **THEN** `cardmaker_shop` is next to the title

#### Scenario: Another screen
- **WHEN** a user opens the Kart kütüphanesi on a 1280 CSS pixel wide window with a mouse
- **THEN** the library's Cardmaker is next to its title

### Requirement: The Shops screen's Cardmaker
The Shops screen's Cardmaker SHALL be `cardmaker_keep`, or the Pack Shop's `cardmaker_shop` while `cardmaker_keep` has no picture.

#### Scenario: The Shops screen
- **WHEN** a user opens the Shops screen
- **THEN** `cardmaker_keep` is shown

#### Scenario: The Shops screen without its own picture
- **WHEN** a user opens the Shops screen while `cardmaker_keep` has no picture
- **THEN** the Pack Shop's Cardmaker is shown
