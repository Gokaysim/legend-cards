# Initial data

The owner's card data, as the DM keeps it in their spreadsheets. The files are copied unchanged from the owner's exports. **Do not edit them by hand:** replace a file with a new export from the owner instead, then run the import again.

**The files live only on the owner's machine.** Git ignores every file in this folder except this README, and no commit in the repository's history holds one, so the public repository never shows a card's text, a True Word or the archive listing (spec: developer-workflow, "The owner's data stays out of the repository"). A fresh clone has only this README:

- A script that needs one of the files stops with a Turkish message that names it. Copy the files into this folder from the owner, or give another file with the script's option (`--legend`, `--cursed`, `--file`).
- The tests read small invented files in the same formats from [`tests/fixtures/data/`](../tests/fixtures/data/README.md). The tests of the owner's real files run only when the files are here, and are reported as skipped otherwise.

These files are the **seed data**. An import only adds the cards and words that are not stored yet: it never changes, retires or deletes a stored one. From the first import on, the stored definitions are the truth, and the DM changes them in the app (Kart kütüphanesi, Cursed Deck, True Words). So a fix made in a file after its first import does not reach the app; make it in the app instead. A file is still useful to add a whole new set at once.

| File                 | Holds                                          | Columns                                      | Used by                                                               |
| -------------------- | ---------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------- |
| `legend-cards.csv`   | the Legend cards: normal and Blessed           | Name, Set, Cost, Rarity, Text, Mechanic Pack | `npm run import-cards`                                                |
| `cursed-cards.csv`   | the Cursed cards                               | Name, Set, Cost, Text                        | `npm run import-cards`                                                |
| `true-words.csv`     | the True Words                                 | Name, Cost, Text                             | `npm run import-true-words`                                           |
| `sets.csv`           | the sets, in shop order                        | Code, Name, Aliases, Packs                   | `npm run import-sets`                                                 |
| `image-aliases.csv`  | picture files whose names differ from the data | File, Kind, Name                             | `npm run build-art`, `npm run import-sets`, `npm run import-pictures` |
| `art-inventory.json` | the picture file names in the archives         | `{ "<archive>": ["<file>.png", …] }`         | `scripts/lib/artInventory.test.ts`                                    |

Unlike the CSV exports, `sets.csv` and `image-aliases.csv` are written by hand: edit them on the owner's machine. See [How the import reads the set file](#how-the-import-reads-the-set-file) and [Pictures](#pictures).

## How the import reads the card files

- A row whose Set is `Blessed` is a Blessed card. Its Cost is `—`, and its Rarity is `—`, `Blessed` (as the final export writes it) or empty: the card has no rarity. Any other Rarity on a Blessed row stops the import.
- **An empty cell and `—` differ.** `—` means "deliberately none", and an empty cell means "not filled in yet". In the Cost column, `—` is a card without a cost. In the other columns, `—` counts as empty.
- **A card is added as a draft** when a column its kind uses is empty: Set, Cost, Rarity, Mechanic Pack and Text for a normal card; Cost, Mechanic Pack and Text for a Blessed card; Cost and Text for a Cursed card. Only the DM sees a draft, and publishes it in the app once it is complete. Every other card is added as active. In the final export of 2026-11-16, 11 Legend cards come in as drafts, most of them with an empty Rarity and Mechanic Pack.
- An invalid value, such as the Rarity "Epic", stops the import. An empty value never does.
- The Set column of `cursed-cards.csv` is ignored: every row is a Cursed card.
- Older exports also had the columns `Drawn?` and `Shuffle`, the owner's own bookkeeping. The import ignores them.
- Text in `[square brackets]` is hidden metadata. The app does not show it, but search finds it.

## How the import reads the True Words file

- Each row is one True Word. Name is required. A word with an empty Cost or Text, or a `—` in either, is added as a draft.
- Cost is kept as written (`0` to `5`, or `X`): the LP a player pays at the table each time they use the word. The app shows it but never charges it.

## How the import reads the set file

`sets.csv` holds the 12 sets as the legacy app had them, in the Pack Shop's order. Like the other files it is seed data: the set import adds the sets that are not stored yet, after the stored ones, and from then on the DM adds, edits, reorders and deletes sets on the Setler screen. A fix made in the file after the first import does not reach the app.

| Column  | Holds                                                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Code    | the set code as the card files write it in their Set column, for example `Kesqer`. It never changes once the set is stored.          |
| Name    | the official name the app shows, for example `Kesqerian Nights`                                                                      |
| Aliases | other spellings that also mean the set, separated by commas inside one quoted cell, for example `"ragnarok, ragnarök"`; may be empty |
| Packs   | `standard` (Standard, Premium and Cursed Packs) or `pandemonium` (one pack plus a Cursed Pack, as Pandemonium has)                   |

- Codes, names and aliases are matched as card names are: case, accents, spaces and punctuation are ignored, so `The End Is Nigh` in the card files is the set `The End is Nigh`.
- A row is left alone when a stored set has its code as its code or alias, so a set the DM renamed is not added again.
- The whole file is checked first. A missing column, an empty code or name, a value over 100 characters, more than 10 aliases, a Packs value other than `standard` or `pandemonium`, the code `Blessed`, or two rows sharing a name, or a spelling among their codes and aliases, stop the import with the row numbers, and nothing changes.
- Never invent a set's official name: take it from the owner.

See [docs/domain.md](../docs/domain.md) for what these words mean, and the "Scripts" section of [docs/conventions.md](../docs/conventions.md) for the import itself.

## Pictures

The pictures are not here. They are the owner's `.7z` archives, about 610 MB of PNG, kept outside the repository. The scripts read every archive in the folder they are given, whatever its name. The folder used for the live import of 2026-11-16 held:

| Archive           | Holds                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------- |
| `cards.7z`        | the normal cards                                                                       |
| `blessed.7z`      | the Blessed cards                                                                      |
| `cursed cards.7z` | the Cursed cards                                                                       |
| `true words.7z`   | the True Words (from the earlier archives: the final export has no True Word pictures) |
| `assets.7z`       | the cardbacks, the pack pictures, the Cardmakers, and a few extras                     |
| `custom cards.7z` | the Custom Card pictures, which wait for the Custom Card Draft                         |

Three scripts read the same folder (see the [README](../README.md#building-the-pictures)):

- `npm run build-art -- --source <folder>` builds the Blessed and Cursed cardbacks, the pack pictures and the screens' Cardmaker into `public/art/`, which is committed.
- `npm run import-sets -- --source <folder>` stores the sets' cardbacks and Cardmakers in Cloud Storage, for the stored sets that never had one.
- `npm run import-pictures -- --source <folder>` stores the card and True Word pictures in Cloud Storage, for the stored cards and words that never had a picture.

After that, the DM changes pictures in the app, and the imports never replace or bring back a picture.

### The archive inventory

`art-inventory.json` lists the picture file names in the archives, without their folders, so `scripts/lib/artInventory.test.ts` can plan them against the data without the archives: a data or alias change that loses a picture fails there. Regenerate it whenever the archives change, from the folder that holds them:

```sh
cd <folder with the archives>
node -e "
const { execFileSync } = require('node:child_process')
const archives = require('node:fs').readdirSync('.').filter((name) => name.endsWith('.7z')).sort()
const inventory = {}
for (const archive of archives)
  inventory[archive] = execFileSync('7zz', ['l', '-ba', '-slt', archive], { encoding: 'utf8' })
    .split('\\n').filter((line) => line.startsWith('Path = ')).map((line) => line.slice(7))
    .filter((name) => name.toLowerCase().endsWith('.png')).map((name) => name.split('/').pop())
require('node:fs').writeFileSync(process.argv[1], JSON.stringify(inventory, null, 2) + '\\n')
" <repository>/data/art-inventory.json
```

Loose `.png` files next to the archives are not in the inventory.

### File names

The scripts match a file by its name without the extension, compared as card names are (case, accents, spaces and punctuation ignored). These are the legacy app's names. The first rule that matches wins:

1. a row of `image-aliases.csv` for the file
2. a screen's Cardmaker: `card_info` or one of the legacy screen names `cardmaker_peek`, `cardmaker_base`, `cardmaker_shop`, `cardmaker_think`, `cardmaker_lib`, `cardmaker_cursed`, `cardmaker_true`, `cardmaker_shockl`, `cardmaker_shockr`, `cardmaker_wave`, `cardmaker_custom`, `cardmaker_gold`, `cardmaker_keep` and `cardmaker_zaddir`
3. a pack picture: `pack_arcanus`, `pack_blood`, `pack_gamblers`, `pack_risk`, `pack_dungeoneers`, `pack_permamancy`, `pack_legends`, `pack_horn` (the Mechanic Packs), `pack_gold` and `pack_cursedgold`
4. the Blessed or the Cursed cardback: `blessed_cb` or `cursed_cb`
5. a set's picture: any other `<set>_cb` is a set's cardback, and any other `cardmaker_<set>` a set's Cardmaker, for example `kesqer_cb` or `cardmaker_kesqer`. The set is named by its code, its official name or an alias, among the stored sets.
6. a True Word: `tw<name>`, for example `twabyss`
7. a Cursed card: `cursed_<name>`
8. a Legend card, normal or Blessed, with that name, for example `abolethseyes`
9. a Cursed card with that name

Rules 2 to 4 are the build's, rule 5 the set import's, and rules 6 to 9 the picture import's. Each script leaves the other files to the others: the build needs no set list, and counts the files of rule 5 as left to the set import. A name finds the card or word whose ID it gives (`abolethseyes` finds `legend-abolethseyes`, even after the DM renamed it), or else the one with that name now, such as a card the DM added in the app. A set's own pack pictures (`<set>_std`, `_prm`, `_crs`, `_gold`) are not pictures any more: a set's packs show its cardback.

A file of rule 5 that names no stored set is listed by the set import as matching no set, and a file that matches nothing else is listed as unknown by the picture import; both are skipped. When two files match the same thing, the one matched by its name wins over an alias, and otherwise the first by file name; the other is listed as a duplicate.

### The alias table

`image-aliases.csv` maps a file to what it shows when its name differs from the data, for example a spelling slip or a Blessed card's older name:

| Column | Holds                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| File   | the file name with its extension, for example `orkolsacquisiton.png`                                                                 |
| Kind   | `legend` (a normal or Blessed card), `cursed`, `word` (a True Word), or `asset`                                                      |
| Name   | the card or word name as the data files write it, or for an asset the stem it stands for, for example `pack_gamblers` or `kesqer_cb` |

A row whose Kind matches nothing stops every script with its row number, before anything is written. An `asset` row whose Name matches no asset stops the build, one whose Name is a set's stem (`<set>_cb`, `cardmaker_<set>`) that names no stored set stops the set import, and a `legend`, `cursed` or `word` row whose Name matches no stored card or word stops the picture import. Where the archive has two files for one card, the table or the card's own name picks one, and the picture import lists the other as unknown. Swap the File in the table to use the other.

With the final export, every card and True Word has a picture, and so has every screen's Cardmaker. The newest set has a cardback but no Cardmaker; the DM adds one on the Setler screen. `zallut_shop.png` is for the Elixir Shop and waits for that feature.
