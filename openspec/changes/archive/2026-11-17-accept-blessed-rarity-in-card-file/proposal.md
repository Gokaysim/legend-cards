# Proposal

## Why

The owner's final export of the Legend cards writes "Blessed" in the Rarity column of every Blessed row, where the earlier export wrote "—". The card import stops on each of those 19 rows ("Blessed kartın rarity'si "—" ya da boş olmalı"), so the final data cannot be loaded into the live project. "Blessed" in that column says what the Set column already says, and the owner's spreadsheet will keep writing it, so the import should accept it instead of the owner editing every export by hand.

## What Changes

- **A Blessed row may name its rarity "Blessed".** In a row whose Set is "Blessed", the Rarity "Blessed" (any letter case) counts like "—": the card is stored with no rarity. Any other rarity on a Blessed row, such as "Rare", still stops the import with the same message.
- Normal rows do not change: "Blessed" as the rarity of a normal card is still an invalid rarity.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-scripts`: "Legend card rows" also accepts "Blessed" as a Blessed row's rarity, with a scenario for it.

## Impact

- **Script code:** `scripts/lib/cardRows.ts` (the Blessed rarity check) and its unit tests in `scripts/lib/cardRows.test.ts`. The Turkish message names the accepted values.
- **Docs:** `data/README.md`, "How the import reads the card files".
- **App and rules:** none. The stored card is the same as for a "—" row.
