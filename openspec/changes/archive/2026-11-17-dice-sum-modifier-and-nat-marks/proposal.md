# Proposal

## Why

At the table, a roll's fixed number is often several bonuses added together: an ability modifier, a weapon bonus and a penalty. Today the "Sabit sayı" field takes one number, so the player adds them up in their head, and nobody else can see what went into the roll. The owner also wants the natural marks to read the way the table says them, "Nat 20" and "Nat 1", not "Doğal 20" and "Doğal 1". This is Batch 2 of TODOS.md.

## What Changes

- "Sabit sayı" takes either a single whole number or whole numbers joined by + and −, such as `5+10-4`. Each number is from 0 to 99, and the sum must be from −99 to +99. Spaces are ignored, and an empty field is 0.
- An invalid entry (`4+`, `4*2`, `1d4`, a sum above +99) is not changed or clamped. The field is marked, a Turkish hint shows an example, and "At" stays disabled until the entry is fixed.
- The roll keeps the numbers as written. The form's formula, the channel, the strip and the notification card show them, for example "1d20 + 5 + 10 − 4", and the total uses their sum. A single number shows as before.
- The roll record gets one optional field that holds the written sum. It is present only when the fixed number has two or more numbers. Records without it, the existing ones and the initiative tracker's rolls, keep working unchanged. The server checks the field's shape, and the DM's record of a hidden roll can hold it too.
- The natural marks on dice rolls read "Nat 20" (gold) and "Nat 1" (red) instead of "Doğal 20" and "Doğal 1" in the channel, the strip and the notification card.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `dice-rolls`: "Building a roll" lets the fixed number be a sum and refuses invalid entries. A new requirement covers how a sum is shown and totalled. "Natural 20 and natural 1" changes the mark text. "Roll records" and "Roll records are checked" cover the new optional field.

## Impact

- `src/features/dice/`: `formula.ts` (parsing and formatting the sum), `RollForm.tsx` (the text field, the hint, "At" disabled), `api.ts` and `schema.ts` (writing and reading the new field), `rollView.ts`, `RollEntry.tsx` and `DiceNotice.tsx` (showing the sum), `rollView.ts` and `FlatDice.tsx` (the mark text), and their tests.
- The working tree already holds uncommitted work on the first item: `parseModifier`, the text field and tests in `formula.ts`, `RollForm.tsx`, `formula.test.ts` and `DicePage.test.tsx`. That work clamps out-of-range sums and keeps only the total, so the implementation picks it up and adjusts it.
- `firestore.rules`: `diceRolls` and `dmRolls` accept the optional field. New emulator rules tests go in `src/features/dice/api.emulator.test.ts`.
- `docs/domain.md`: the "Zar atışı" glossary entry (the fixed number as a sum, "Nat 20" and "Nat 1").
- No data migration. CI deploys the rules and the client together. Because the field is optional, rolls stay readable both ways while some devices still run the older client.
