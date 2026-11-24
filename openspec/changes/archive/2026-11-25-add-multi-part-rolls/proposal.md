# Proposal

## Why

At the table a player often rolls two things at once, such as an attack and its damage: "1d20 + 5" and "1d20 + 1d4 + 9". Today the formula field takes one formula. It adds terms of the same die together, so typing both into one field gives a single total of 3 dice, which is useless. The player has to roll twice, and the second throw cuts the first one short in the strip.

The owner wants several formulas in one roll, separated by ";", each with its own total.

## What Changes

- **A roll in parts.** The formula field takes up to 4 formulas separated by ";", such as "d20+5; d4+9+d20". Each formula is a part of one roll.
  - The roll throws all parts' dice together, once, in one strip playback, one channel entry and one notification card.
  - Each part keeps its own dice, fixed number and total. The channel and the card show one line per part.
  - The 60-dice limit counts every part's dice together.
- **Canonical form per part.** Each part is written as today, with the same dice added together in their usual order. Parts are joined by "; ". For example "d20+5;d4+9+d20" reads "1d20 + 5; 1d20 + 1d4 + 9".
- **Every part needs a die.** "d20; 5" is invalid. More than 4 parts is invalid, and the hint says "En fazla 4 parça". An empty last part ("d20+5;") is ignored and dropped when the user leaves the field.
- **Nat 20 and Nat 1 per part.** A part whose only die is a d20 gets the natural mark. The other parts do not.
  - A roll with several marks plays one natural sound: that of its first marked part.
- **No advantage with parts.** "Avantaj" and "Dezavantaj" are disabled when the formula has two or more parts.
- **The controls act on the last part.** The quick dice add to the last part. The chips show and edit the last part's dice. With two or more parts, the chips are labelled "Son parça".
- **The 3D strip does not mark parts.** It throws every die together. The flat strip, used without 3D, groups the results by part.
- **One note per roll.**
- **The record gains an optional `parts` field.** It holds each part's dice count and fixed number as written. A multi-part record has the mode `normal`, the fixed number 0 and no `modifierSum`.
  - A one-part roll is written exactly as today, without `parts`.
  - Records from before this change have no `parts` and show as one part.
  - The server checks the field's shape.
- **Unchanged.** The DM's hidden roll, "Tekrar izle", results hidden until the dice rest, freshness, the channel reset, and the initiative tracker work as before. An initiative roll stays a single d20.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dice-rolls`: these requirements change:
  - a new requirement covers a roll in parts
  - the typed formula reads ";"
  - the invalid formula covers parts
  - the controls act on the last part
  - advantage is disabled with parts
  - each part has its own total and natural mark
  - the channel, the flat strip and the notification card show parts
  - the roll record holds `parts`, and the server checks it
  - a roll with several marks plays its first mark's sound

## Impact

- **Code**
  - `src/features/dice/formula.ts`: parsing parts, canonical text, and per-part totals and marks.
  - `rollView.ts`: a view per part.
  - `RollForm.tsx`: the last part's controls and the hint.
  - `RollEntry.tsx`, `DiceNotice.tsx`, `FlatDice.tsx` and `DiceView.tsx` (the flat strip): showing parts.
  - `sound/natural.ts`: the first marked part.
  - `schema.ts`: reading and checking `parts`.
  - `api.ts` (`rollDice`, `RollInput`): writing parts.
  - `DiceProvider`: passing parts through.
- **Rules.** `firestore.rules` gains `parts` as an optional roll key with a shape check, and ties it to mode `normal`, fixed number 0 and no `modifierSum`.
  - Emulator rules tests cover accepted and refused records.
  - The check is one `matches`, so the rules stay far inside the 1000-expression limit.
- **Docs.** The `diceRolls` row in `docs/domain.md` and the dice line in `docs/conventions.md`.
- **Data.** No migration. Old records read as one part.
- **Not affected.** The initiative tracker's record check (`shownBy`) needs exactly one die, so a multi-part record can never stand for an initiative roll.
