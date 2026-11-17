# Proposal

## Why

The table sometimes rolls big damage dice, such as 40d6 for Disintegrate or 20d6 for Delayed Blast Fireball. Today a roll holds at most 12 physical dice, so these rolls cannot be made at all. Even within the limit, each die takes one click, and 10d6 means ten clicks. An explore session measured the physics and tried 40 and 60 d6 in the app with the limit raised. Both rolled and came to rest in about 2 seconds, and stayed inside the tray. The owner chose 60 as the new limit. Weak devices may struggle to draw that many dice, so the owner also wants a device setting that turns the 3D dice off.

## What Changes

- A roll holds at most **60 physical dice** instead of 12. A d100 still counts as two. The form, the server rules and the roll schema all use the new limit. The form says "En fazla 60 zar" when a roll is full.
- The formula becomes a **text field the user can type in**, such as `40d6+5` or `1d20+5+10-4`. The die buttons and the dice chips edit the same formula. A typed formula is parsed as the user types, and the dice and the fixed number come from it.
- **BREAKING (interface):** the separate "Sabit sayı" field is removed. The fixed number, written as one number or as a sum, is now part of the formula. The rules for the fixed number stay the same: each number from 0 to 99, at most 8 of them, and a sum from −99 to +99. An invalid formula is kept as typed, marked, explained by a hint with an example, and keeps "At" disabled. Records do not change.
- Each dice chip shows its count in a field the user can type in, so "40" can be typed instead of clicked. The chip's "×" takes away that die type entirely.
- Avantaj and Dezavantaj stay as buttons. Notation such as `2d20kh1` is not accepted.
- A third device setting, **"Zarları 3D göster"**, goes under "Bu cihazda". It is on by default and kept in the device's local storage. When it is off, this device shows every roll's dice flat, as numbers, and does not load the 3D part. Results are not blurred while waiting. The device's own rolls are still thrown with physics in the background, so other devices still play them in 3D.
- The motion field of a record grows to fit 60 dice. The server checks every die with a fixed number of expressions, whatever the dice count, so a 60-die roll stays within the rules' expression limit.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `dice-rolls`: "Building a roll" becomes a typed formula with editable chip counts. "A fixed number written as a sum" and "An invalid fixed number" move into the formula. "At most twelve dice" becomes "At most sixty dice". "Device settings" gains "Zarları 3D göster". "When a hidden result shows" and "Dice without motion" cover the setting. "Roll records are checked" allows 1 to 60 dice.

## Impact

- `src/features/dice/formula.ts`: `MAX_DICE` 60, a formula parser (dice terms and fixed numbers), and the canonical formula text that parser and buttons share.
- `src/features/dice/RollForm.tsx`: the formula field replaces the read-only formula and "Sabit sayı". The chips get a count field. The hint and the "En fazla 60 zar" message change.
- `src/features/dice/schema.ts`: `MOTION_MAX` grows for 60 dice.
- `src/features/dice/deviceSettings.ts`, `DiceSettingsDialog.tsx`, `DiceView.tsx` and `DicePage.tsx`: the new setting, and the flat view when it is off.
- `src/features/dice/FlatDice.tsx`, `RollEntry.tsx`, `DiceNotice.tsx`: checked with 60 dice so they wrap and fit, with layout adjustments where they do not.
- `firestore.rules`: `validRoll` allows 1 to 60 dice, and the per-die check is rewritten so its cost does not grow with the dice count. The motion length limit grows. Emulator rules tests go in `src/features/dice/api.emulator.test.ts`.
- Tests: `formula.test.ts`, `DicePage.test.tsx`, `DiceView.test.tsx`, `deviceSettings.test.ts`, which currently use "Sabit sayı" and "En fazla 12 zar".
- `docs/domain.md`: the "Zar atışı" and "Zar stili" glossary entries.
- No data migration. Existing records stay valid. CI deploys the rules and the client together. An older client that is still open caps its own rolls at 12 dice, and its schema rejects a record with more than 12. Its channel then reports an error until the page reloads (see design, "Risks"), so the table reloads once after the release.
