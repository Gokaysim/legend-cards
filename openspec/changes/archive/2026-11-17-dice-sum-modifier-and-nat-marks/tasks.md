# Tasks

The working tree already holds uncommitted work on the sum (`formula.ts`, `RollForm.tsx`, `formula.test.ts`, `DicePage.test.tsx`). Build on it and adjust it as the tasks below say. Do not discard it.

## 1. Parsing and formatting the sum

- [x] 1.1 In `src/features/dice/formula.ts`, change `parseModifier` to return `{ total, sum } | null` (design D3): each number from 0 to 99, the total from −99 to +99 and refused rather than clamped outside that range, `−`/`–` read as minus, spaces ignored, and `sum` the canonical string (no spaces, ASCII `-`, no leading `+`, no leading zeros) or `null` for a single number. Verify with `formula.test.ts` cases: `"5+10-4"` → `{11, "5+10-4"}`, `" -2 - 3 "` → `{-5, "-2-3"}`, `"+07"` → `{7, null}`, `""` → `{0, null}`, and `null` for `"90+20"`, `"150"`, `"4+"`, `"4*2"`, `"1d4"`, `"4 4"`
- [x] 1.2 Extend `formulaText(counts, modifier, sum?)` and add a shared `modifierLabel(modifier, sum)` for the chip and the notice line (design D3). A sum is shown only when it parses and adds up to `modifier`. Verify with `formula.test.ts`: `"1d20 + 5 + 10 − 4"`, `"1d20 − 2 − 3"`, a single number as today, and a mismatched sum falling back to `"1d20 + 11"`

## 2. The roll form

- [x] 2.1 Update `src/features/dice/RollForm.tsx` to the new `parseModifier`: keep the typed text, `aria-invalid`, the hint with the D4 wording (it includes "örneğin 4+4-5"), "At" disabled while the text is invalid, `maxLength` 24, and the formula preview showing the sum. Send `modifier` and `modifierSum` to `actions.roll`. Verify with `DicePage.test.tsx`: typing `5+10-4` shows "1d20 + 5 + 10 − 4" and rolls with `modifier: 11, modifierSum: "5+10-4"`; `4+` then `1` toggles the hint and "At"; and `90+20` is refused

## 3. The record and the rules

- [x] 3.1 Add the optional `modifierSum` to `RollInput` and `RollRequest` (`diceContext.ts`), and have `rollDice` in `api.ts` write it into the public content and the DM record only when it is non-null. Check that the initiative tracker's call sites still compile without it (`npm run check`)
- [x] 3.2 In `schema.ts`, read `modifierSum` leniently: keep it in `RollContent` only when it parses and adds up to `modifier`, and set it to `null` otherwise (design D2). Verify with `schema.test.ts`: a matching sum is kept, a mismatched or malformed one becomes `null`, and a record without it reads as `null`
- [x] 3.3 In `firestore.rules`, let `diceRolls` public records and `dmRolls` records hold the optional `modifierSum`, and check its shape in `validRoll` (design D2). Update the rules' comments
- [x] 3.4 Add emulator tests to `src/features/dice/api.emulator.test.ts`: a public roll with `"5+10-4"` is accepted, `"5+*4"`, `"100+1"`, a non-string and a 9-number sum are denied, a hidden 12-dice DM roll with a sum is accepted (this checks the expression budget), and a roll without the field is still accepted. Verify with `npm run test:emulator`

## 4. Showing the sum

- [x] 4.1 Pass the content's sum through `rollView.ts` to `formulaText`, and use `modifierLabel` in `RollEntry.tsx` (the chip after the dice) and `DiceNotice.tsx` (the result line). Verify with `DicePage.test.tsx` or `DiceView.test.tsx`: a channel entry for a record with `modifierSum: "5+10-4"` shows "1d20 + 5 + 10 − 4" and its total, and a record without it shows as before

## 5. "Nat 20" and "Nat 1"

- [x] 5.1 Change `NATURAL_MARK_TEXT` in `rollView.ts` to "Nat 20" and "Nat 1", and update the doc comments in `formula.ts` and `FlatDice.tsx`. Update `FlatDice.test.tsx` and `DicePage.test.tsx` to query "Nat 20" and "Nat 1", and verify with `npm run check`. Leave the initiative tracker's "nat 20" and "nat 1" unchanged

## 6. Docs and the whole check

- [x] 6.1 Update the "Zar atışı" entry in `docs/domain.md`: the fixed number may be written as a sum and is shown as written, and the marks are **Nat 20** and **Nat 1**. Verify by searching for leftover "Doğal" in `docs/` and `src/` (only archived changes may still hold it)
- [x] 6.2 Run `npm run check` and `npm run test:emulator`, and confirm both pass
- [x] 6.3 Check the Zarlar screen in the dev app at 360 px wide: the wider field and the hint do not cause sideways scrolling, a roll of `1d20 + 5 + 10 − 4` shows as written in the channel and the strip, and a natural 20 reads "NAT 20". Then stop the dev server and the emulators as CLAUDE.md says

## Workflow follow-up

- Tick "Batch 2" in `TODOS.md` once the owner accepts the change.
- Archive the change with `/opsx:archive` after review.
