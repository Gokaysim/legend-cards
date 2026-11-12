# Initial data

The owner's card data, as the DM keeps it in their spreadsheets. The files are copied unchanged from the owner's exports. **Do not edit them by hand in this repository:** replace a file with a new export from the owner instead, then run the import again.

These files are the **seed data**. An import only adds the cards and words that are not stored yet: it never changes, retires or deletes a stored one. From the first import on, the stored definitions are the truth, and the DM changes them in the app (Kart kütüphanesi, Cursed Deck, True Words). So a fix made in a file after its first import does not reach the app; make it in the app instead. A file is still useful to add a whole new set at once.

| File                | Holds                                          | Columns                                                       | Used by                     |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------------- | --------------------------- |
| `legend-cards.csv`  | the Legend cards: normal and Blessed           | Name, Set, Cost, Rarity, Drawn?, Text, Mechanic Pack, Shuffle | `npm run import-cards`      |
| `cursed-cards.csv`  | the Cursed cards                               | Name, Set, Cost, Text                                         | `npm run import-cards`      |
| `true-words.csv`    | the True Words                                 | Name, Cost, Text                                              | `npm run import-true-words` |
| `image-aliases.csv` | picture files whose names differ from the data | File, Kind, Name                                              | `npm run build-art`         |

Unlike the CSV exports, `image-aliases.csv` belongs to this repository: edit it by hand. See [Pictures](#pictures).

## How the import reads the card files

- A row whose Set is `Blessed` is a Blessed card. Its Rarity and Cost are `—`.
- **An empty cell and `—` differ.** `—` means "deliberately none", and an empty cell means "not filled in yet". In the Cost column, `—` is a card without a cost. In the other columns, `—` counts as empty.
- **A card is added as a draft** when a column its kind uses is empty: Set, Cost, Rarity, Mechanic Pack and Text for a normal card; Cost, Mechanic Pack and Text for a Blessed card; Cost and Text for a Cursed card. Only the DM sees a draft, and publishes it in the app once it is complete. Every other card is added as active. In the repository's files, "Hrolf's Hornswaggle" and "The Grand Finale" (empty Cost) and "The Cartographer" (empty Set, Rarity and Mechanic Pack) come in as drafts.
- An invalid value, such as the Rarity "Epic", stops the import. An empty value never does.
- The Set column of `cursed-cards.csv` is ignored: every row is a Cursed card.
- `Drawn?` and `Shuffle` are the owner's own bookkeeping. The import ignores them.
- Text in `[square brackets]` is hidden metadata. The app does not show it, but search finds it.

## How the import reads the True Words file

- Each row is one True Word. Name is required. A word with an empty Cost or Text, or a `—` in either, is added as a draft.
- Cost is kept as written (`0` to `5`, or `X`): the LP a player pays at the table each time they use the word. The app shows it but never charges it.

See [docs/domain.md](../docs/domain.md) for what these words mean, and the "Scripts" section of [docs/conventions.md](../docs/conventions.md) for the import itself.

## Pictures

The pictures are not here. They are the owner's five `.7z` archives, about 560 MB of PNG, kept outside the repository:

| Archive                 | Holds                                                             |
| ----------------------- | ----------------------------------------------------------------- |
| `legend point cards.7z` | the normal cards                                                  |
| `blessed.7z`            | the Blessed cards                                                 |
| `cursed cards.7z`       | the Cursed cards                                                  |
| `true words.7z`         | the True Words                                                    |
| `otherassets.7z`        | the cardbacks, the pack pictures, the Cardmaker, and a few extras |

Two scripts read the same folder (see the [README](../README.md#building-the-pictures)):

- `npm run build-art -- --source <folder>` builds the cardbacks, the pack pictures and the Cardmaker into `public/art/`.
- `npm run import-pictures -- --source <folder>` stores the card and True Word pictures in Cloud Storage, for the stored cards and words that never had a picture. After that, the DM changes pictures in the app, and the import never replaces or brings back a picture.

### File names

The scripts match a file by its name without the extension, compared as card names are (case, accents, spaces and punctuation ignored). These are the legacy app's names. The first rule that matches wins:

1. a row of `image-aliases.csv` for the file
2. a Cardmaker: `card_info` or one of the legacy `cardmaker_*` names, for example `cardmaker_lib`, `cardmaker_kesqer` or `cardmaker_shockl`
3. a pack picture: `pack_arcanus`, `pack_blood`, `pack_gamblers`, `pack_risk`, `pack_dungeoneers`, `pack_permamancy`, `pack_legends`, `pack_horn` (the Mechanic Packs), `pack_gold` and `pack_cursedgold`
4. a set's own pack picture: `<set>_std`, `<set>_prm`, `<set>_crs` or `<set>_cursed`; for Pandemonium, `pandemonium_std` (or `_gold`) and `pandemonium_crs`. A set is named by its code, its official name or an alias. Without one, the shop shows the set's cardback.
5. a cardback: `<set>_cb`, `blessed_cb` or `cursed_cb`
6. a True Word: `tw<name>`, for example `twabyss`
7. a Cursed card: `cursed_<name>`
8. a Legend card, normal or Blessed, with that name, for example `abolethseyes`
9. a Cursed card with that name

Rules 2 to 5 are the build's. The build leaves every other file to the picture import, which uses rules 6 to 9 against the stored cards and words. A name finds the card or word whose ID it gives (`abolethseyes` finds `legend-abolethseyes`, even after the DM renamed it), or else the one with that name now, such as a card the DM added in the app.

A file that matches nothing is listed as unknown by the picture import, and skipped. When two files match the same thing, the one matched by its name wins over an alias, and otherwise the first by file name; the other is listed as a duplicate.

### The alias table

`image-aliases.csv` maps a file to what it shows when its name differs from the data, for example a spelling slip or a Blessed card's older name:

| Column | Holds                                                                                                                 |
| ------ | --------------------------------------------------------------------------------------------------------------------- |
| File   | the file name with its extension, for example `orkolsacquisiton.png`                                                  |
| Kind   | `legend` (a normal or Blessed card), `cursed`, `word` (a True Word), or `asset`                                       |
| Name   | the card or word name as the data files write it, or for an asset the stem it stands for, for example `pack_gamblers` |

A row whose Kind matches nothing stops both scripts with its row number, before anything is written. An `asset` row whose Name matches nothing stops the build, and a `legend`, `cursed` or `word` row whose Name matches no stored card or word stops the picture import. Three Blessed pictures carry older names, as the owner confirmed: `charmingrogue` is Roguish Charm, `drivendiehard` is Second Wind, and `durabledwarf` is Forgewizard Constitution. For Kyaro's Yielding Faith and Lord Falaraen's Fordmidability, the archive has two misspelled files; the table picks one, and the picture import lists the other as unknown. Swap the File in the table to use the other.

The archives have no picture for Scorched Earth, `card_info`, `cardmaker_custom` and `cardmaker_keep`. The owner added `cardmaker_keep.png` on 2026-11-11 as a loose file in the source folder, next to the archives, so a build from that folder finds it. `zallut_shop.png` is for the Elixir Shop and waits for that feature.
