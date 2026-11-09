# Initial data

The owner's card data, as the DM keeps it in their spreadsheets. The files are copied unchanged from the owner's exports. **Do not edit them by hand in this repository:** replace a file with a new export from the owner instead, then run the import again.

| File                | Holds                                          | Columns                                                       | Used by                     |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------------- | --------------------------- |
| `legend-cards.csv`  | the Legend cards: normal and Blessed           | Name, Set, Cost, Rarity, Drawn?, Text, Mechanic Pack, Shuffle | `npm run import-cards`      |
| `cursed-cards.csv`  | the Cursed cards                               | Name, Set, Cost, Text                                         | `npm run import-cards`      |
| `true-words.csv`    | the True Words                                 | Name, Cost, Text                                              | `npm run import-true-words` |
| `image-aliases.csv` | picture files whose names differ from the data | File, Kind, Name                                              | `npm run build-art`         |

Unlike the CSV exports, `image-aliases.csv` belongs to this repository: edit it by hand. See [Pictures](#pictures).

## How the import reads the card files

- A row whose Set is `Blessed` is a Blessed card. Its Rarity and Cost are `—`.
- A Legend row with an empty Set is skipped with a warning, as the legacy app hid such cards.
- The Set column of `cursed-cards.csv` is ignored: every row is a Cursed card.
- `Drawn?` and `Shuffle` are the owner's own bookkeeping. The import ignores them.
- Text in `[square brackets]` is hidden metadata. The app does not show it, but search finds it.

## How the import reads the True Words file

- Each row is one True Word. Name and Cost are required. An empty Text is imported with a warning.
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

`npm run build-art -- --source <folder>` builds them into `public/art/` (see the [README](../README.md#building-the-pictures)).

### File names

The script matches a file by its name without the extension, compared as card names are (case, accents, spaces and punctuation ignored). These are the legacy app's names. The first rule that matches wins:

1. a row of `image-aliases.csv` for the file
2. a Cardmaker: `card_info` or one of the legacy `cardmaker_*` names, for example `cardmaker_lib`, `cardmaker_kesqer` or `cardmaker_shockl`
3. a pack picture: `pack_arcanus`, `pack_blood`, `pack_gamblers`, `pack_risk`, `pack_dungeoneers`, `pack_permamancy`, `pack_legends`, `pack_horn` (the Mechanic Packs), `pack_gold` and `pack_cursedgold`
4. a set's own pack picture: `<set>_std`, `<set>_prm`, `<set>_crs` or `<set>_cursed`; for Pandemonium, `pandemonium_std` (or `_gold`) and `pandemonium_crs`. A set is named by its code, its official name or an alias. Without one, the shop shows the set's cardback.
5. a cardback: `<set>_cb`, `blessed_cb` or `cursed_cb`
6. a True Word: `tw<name>`, for example `twabyss`
7. a Cursed card: `cursed_<name>`
8. a Legend card, normal or Blessed, with that name, for example `abolethseyes`
9. a Cursed card with that name

A file that matches nothing is listed as unknown and skipped. When two files match the same thing, the one matched by its name wins over an alias, and otherwise the first by file name; the other is listed as a duplicate.

### The alias table

`image-aliases.csv` maps a file to what it shows when its name differs from the data, for example a spelling slip or a Blessed card's older name:

| Column | Holds                                                                                                                 |
| ------ | --------------------------------------------------------------------------------------------------------------------- |
| File   | the file name with its extension, for example `orkolsacquisiton.png`                                                  |
| Kind   | `legend` (a normal or Blessed card), `cursed`, `word` (a True Word), or `asset`                                       |
| Name   | the card or word name as the data files write it, or for an asset the stem it stands for, for example `pack_gamblers` |

A row whose Kind or Name matches nothing stops the build with its row number, before anything is written. Three Blessed pictures carry older names, as the owner confirmed: `charmingrogue` is Roguish Charm, `drivendiehard` is Second Wind, and `durabledwarf` is Forgewizard Constitution. For Kyaro's Yielding Faith and Lord Falaraen's Fordmidability, the archive has two misspelled files; the table picks one, and the build lists the other as unknown. Swap the File in the table to use the other.

The archives have no picture for Scorched Earth, `card_info`, `cardmaker_custom` and `cardmaker_keep`. `zallut_shop.png` is for the Elixir Shop and waits for that feature.
