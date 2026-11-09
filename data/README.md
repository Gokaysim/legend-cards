# Initial data

The owner's card data, as the DM keeps it in their spreadsheets. The files are copied unchanged from the owner's exports. **Do not edit them by hand in this repository:** replace a file with a new export from the owner instead, then run the import again.

| File               | Holds                                | Columns                                                       | Used by                     |
| ------------------ | ------------------------------------ | ------------------------------------------------------------- | --------------------------- |
| `legend-cards.csv` | the Legend cards: normal and Blessed | Name, Set, Cost, Rarity, Drawn?, Text, Mechanic Pack, Shuffle | `npm run import-cards`      |
| `cursed-cards.csv` | the Cursed cards                     | Name, Set, Cost, Text                                         | `npm run import-cards`      |
| `true-words.csv`   | the True Words                       | Name, Cost, Text                                              | `npm run import-true-words` |

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

## What is not here

The pictures (card art, cardbacks, Cardmaker, packs) are large `.7z` archives, about 500 MB in all. They stay outside the repository and arrive with the card-images change.
