# Tasks

## 1. The rules first (design D3)

- [x] 1.1 In `firestore.rules`, rewrite `validRoll` (design D3): `dice.size()` from 1 to 60, `dice.hasOnly(allDice())` with the literal list of the 70 valid `{t, v}` maps in place of `dieFaces()`/`dieAt`, no d100 pairing check, and `motion.size() <= 6600`. Update the comments. Verify with `npm run test:emulator` that the existing dice and initiative rules tests still pass
- [x] 1.2 Add rules tests to `tests/firestore.rules.emulator.test.ts` for the spec's "Roll records are checked" scenarios: 13 and 60 d6 with motion accepted, 30 d100 pairs accepted, a hidden DM pair of 60 dice accepted, 61 dice denied, a d6 showing 7, a die with an extra field, and a string face at position 59 denied, and a lone tens die accepted. Add a `formula.test.ts` case where a lone tens die reads as its own die in the results and the total. Verify with `npm run test:emulator` and `npm run check`

## 2. Bounds and the formula parser

- [x] 2.1 In `src/features/dice/formula.ts`, set `MAX_DICE = 60`. In `schema.ts`, set `MOTION_MAX = 6600`. Verify with `schema.test.ts` that a record with 60 dice and 6400-character motion parses, and one with 61 does not
- [x] 2.2 Add `parseFormula(text)` to `formula.ts` (design D1): dice terms with an optional count, either case, and `d%`; same-die terms added up; the number terms checked by the `parseModifier` rules; `tooMany` above 60 physical dice; and `invalid` otherwise. Verify with `formula.test.ts`: `"40d6+5"`, `"2d6+3d6"` → 5d6, `"D20+4"`, `"d%"`, `"5+1d20+3"` → modifier 8 with sum `"5+3"`, `" -2 - 3 + 1d6 "`, `""` and `"5"` (valid, no dice), `"61d6"` and `"31d100"` → `tooMany`, and `"1d20+4+"`, `"1d20+4*2"`, `"2d7"`, `"-1d4"`, `"0d6"`, `"2d20kh1"`, `"1d20+90+20"` → `invalid`
- [x] 2.3 Check that `formulaText(counts, modifier, sum)` is the canonical form that `parseFormula` reads back. Verify with a `formula.test.ts` round trip over the cases above: `parseFormula(formulaText(...))` gives the same counts, modifier and sum

## 3. The roll form (design D1, D2)

- [x] 3.1 Rewrite `src/features/dice/RollForm.tsx` around one `text` state. The formula field gets the label "Formül" and a placeholder; "Sabit sayı" is removed. Die buttons write the canonical formula. A valid text becomes canonical on blur. The field is invalid with the hint "örneğin 1d20+4+4-5", or "En fazla 60 zar" for `tooMany`. Controls show the last valid formula and are disabled while the text is invalid. Avantaj and Dezavantaj follow `isSingleD20`. "At" sends the parsed counts, modifier and sum. Update `DicePage.test.tsx` for the spec's "Building a roll", "A fixed number written as a sum", "An invalid formula" and "A typed formula" scenarios, and verify with `npm run check`
- [x] 3.2 Give each dice chip a count field ("d6 sayısı", numeric) and a "×" that removes the type ("d6 çıkar"). Capped to what fits, empty or 0 removes the type on blur. Verify with `DicePage.test.tsx`: typing 40 on the d6 chip gives "40d6", 70 next to "1d20" gives "1d20 + 59d6", and "×" on "1d20 + 40d6 + 5" gives "1d20 + 5"
- [x] 3.3 Update the limit tests to the spec's "At most sixty dice": 12 d6 keeps every control enabled, 60 d6 disables every control and says "En fazla 60 zar", and 59 dice disable only d100. Verify with `npm run check`

## 4. "Zarları 3D göster" (design D5)

- [x] 4.1 Add `SHOW_3D_KEY = 'lcm.dice.3d'` with `show3d`/`setShow3d` (on unless `'0'`) to `deviceSettings.ts`, and the checkbox "Zarları 3D göster" as the third entry under "Bu cihazda" in `DiceSettingsDialog.tsx`. Verify with `deviceSettings.test.ts` (default on, kept after a re-read, synced across hook instances) and a dialog test
- [x] 4.2 Have `DiceView` draw the stage only when the setting is on, and pass the setting from `DicePage`. Verify with `DiceView.test.tsx` that with it off the flat dice show and the stage chunk is not requested, and with `DicePageSettling.test.tsx` that a fresh roll's entry shows its result at once with the setting off. Also check that the roller's throw still goes through `throwWithPhysics`, so the written record holds motion

## 5. Many dice on screen (design D6)

- [x] 5.1 Make `FlatStage`/`FlatDice` use a smaller die size above 12 dice, so 60 results fit the strip's box. Verify with a `FlatDice.test.tsx` case for 60 dice and in the browser (task 6.2)
- [x] 5.2 Add a `simulate.test.ts` case: 60 d6 from `makeThrows` with a seeded source come to rest within `MAX_ROLL_SECONDS` and inside the tray walls. Verify with `npx vitest run --project unit src/features/dice/stage/simulate.test.ts`

## 6. Docs and the whole check

- [x] 6.1 Update `docs/domain.md`: "Zar atışı" (up to 60 dice, the typed formula with the fixed number in it, the chips' counts) and "Zar stili" (the third setting "Zarları 3D göster"). Verify by reading both entries against the spec delta
- [x] 6.2 Browser check on the emulators with a throwaway copy (`--import` without `--export-on-exit`, a signed-in throwaway origin): type `40d6+5` and roll; roll 60 d6 with a chip count; check the channel, the strip, the notification card from another screen, and a 360 px iframe for page overflow; turn "Zarları 3D göster" off and roll again; time the roller's 60-d6 simulation in the page with `performance.now()` and note it, so the owner can compare it on a phone. Clear the origin's IndexedDB cache afterwards
- [x] 6.3 Run `npm run check` and `npm run test:emulator`. Both must pass. Then stop every process on the project's ports as CLAUDE.md says, and confirm with `lsof`

## Workflow follow-up

- After the release, tell the owner that every open tab should reload once, since an older client's channel cannot read rolls of more than 12 dice (design, "Risks").
- Archive with `/opsx:archive`, then commit (feat + docs archive).
