# Tasks

## 1. Parsing parts in the formula

- [x] 1.1 In `src/features/dice/formula.ts`, rename today's single-formula parser to `parsePart` and make `parseFormula` read parts (design D4):
  - split on `;` and drop an empty last part
  - an empty part elsewhere is `invalid`
  - more than 4 parts is the new reason `tooManyParts`
  - with 2 or more parts, a part without a die is `invalid`
  - more than 60 physical dice across the parts is `tooMany`

  The `ok` branch becomes `{ ok: true, parts: FormulaPart[] }`. Add `MAX_PARTS = 4`, `PARTS_TEXT_MAX = 120` and `onePart(counts, modifier, sum?)`.

  Verify with new `formula.test.ts` cases for the spec scenarios:
  - "An attack and its damage"
  - "Four parts"
  - "Sixty dice across parts"
  - "A part without a die"
  - "A trailing separator"
  - "Too many dice across parts"
  - "Too many parts"
  - "An empty part in the middle"
  - "Each part's own range"
  - "The same die in two parts"

  Existing one-part tests pass after being adapted to `parts[0]`.
- [x] 1.2 Add `formulaPartsText(parts)` for the canonical text, the parts' `formulaInputText` joined by `"; "`. Make `canAdd` and `maxCount` count the dice of the parts before the last (design D4).

  Verify with `formula.test.ts`:
  - "d20+5;d4+9+d20" reads "1d20 + 5; 1d20 + 1d4 + 9"
  - "2d6; 3d6" stays two parts
  - with "30d6; 29d6" a d100 does not fit and a d6 does
  - a chip's count on the last part is capped by the other parts' dice
- [x] 1.3 Add `checkedParts(dice, text)` (design D3). It returns part spans `{ start, count, modifier, modifierSum }`, or `null` when:
  - there are fewer than 2 or more than 4 parts
  - a count is 0
  - the counts do not add up to the dice
  - a sum does not parse with `parseModifier`
  - a boundary splits a d100 tens die from its d10

  Add `partsText(parts)` to write the record's string. Verify with `formula.test.ts`:
  - "1:5;2:9" against 3 dice gives two spans
  - "1:5+10-4;2" keeps the written sum
  - "1:5" (one part), "0;2", a count total of 4 against 3 dice, and a split d100 pair each give `null`
  - `partsText` round-trips through `checkedParts`

## 2. Records, rules and writing a roll

- [x] 2.1 In `firestore.rules`, add `'parts'` to `rollOptionalKeys()` and the `parts` clause to `validRoll` (design D2). Update the comment above `validRoll`.

  Verify with new `src/features/dice/api.emulator.test.ts` rules cases for the spec scenarios:
  - "A roll in parts"
  - "A hidden roll in parts" (public stub and DM record in one batch)
  - "Parts with advantage"
  - "Parts with a fixed number" (modifier 5, and `modifierSum` present)
  - "Malformed parts" ("1:5", "1;1;1;1;1", "0;2", "1:5*2;1")
  - a 121-character `parts` string is denied

  Run `npm run test:emulator`.
- [x] 2.2 In `src/features/dice/schema.ts`, read `parts` leniently (`z.string().nullish().catch(null)`) and give `RollContent` a `parts: RollPart[]` from `contentOf` (design D3). A record without `parts`, or with parts that `checkedParts` refuses, reads as one part.

  Verify with `schema.test.ts`:
  - "A roll from before parts": an old record reads as one part with its modifier and sum
  - a valid multi-part record reads two spans
  - "Parts that do not match the dice" reads one part with the fixed number 0
- [x] 2.3 In `src/features/dice/api.ts`, replace `RollInput`'s `counts`, `modifier` and `modifierSum` with `parts: RollPartInput[]` (design D6):
  - throw every part's dice in one thrower call
  - write today's fields for one part, and `mode: 'normal'`, `modifier: 0` and `parts` for two or more
  - return the local roll with the same spans

  Move the callers in `src/features/combat/api.ts` and `src/test/diceFixtures.ts` to `onePart(...)`.

  Verify:
  - an `api.emulator.test.ts` case writes "1d20 + 5; 1d20 + 1d4 + 9" as a public roll and as the DM's hidden roll, and reads both back with two parts
  - the existing initiative emulator tests still pass
  - `npm run check` and `npm run test:emulator`
- [x] 2.4 Update the `diceRolls` row in `docs/domain.md` to name `parts`, and the dice line in `docs/conventions.md` to name `parts`/`checkedParts`. Verify with `npm run check` (format).

## 3. Showing parts

- [x] 3.1 Change `src/features/dice/rollView.ts` to return `{ parts: PartView[], mark }` (design D7), where `mark` is the first marked part's. Make `FlatDice` and `NaturalMarkLabel` take a `PartView`.

  Verify with unit tests in a new `rollView.test.ts`:
  - "Totals of parts" (17 and 13)
  - "A natural in one part" (only the first part marked)
  - result keys stay unique across parts
  - a one-part roll's view matches today's formula, modifier, total and mark
- [x] 3.2 Render parts in `RollEntry.tsx`: one box per part, each with its own border by its mark. The settling blur and "sonuç bekleniyor" cover all boxes. A one-part roll is unchanged.

  Verify with `DicePage.test.tsx` / `DicePageSettling.test.tsx` cases:
  - "A roll in parts" (channel)
  - "A hidden roll in parts" (the DM sees both parts marked hidden, a player sees "DM gizli zar attı")
  - a settling multi-part roll hides every part's result
  - the existing one-part tests still pass
- [x] 3.3 Render parts in `DiceNotice.tsx`: one line per part, with a smaller total when there are 2 or more parts.

  Verify with `DiceNotice.test.tsx`:
  - "A roll in parts on another screen" shows "1d20 + 5" with 20 and "2d6 + 3" with 10
  - the one-part cases are unchanged
- [x] 3.4 Render parts in the flat strip (`FlatStage` in `DiceView.tsx`): one group per part, each with its mark.

  Verify with `DiceView.test.tsx`: "Parts without 3D" shows the d20's result in a group apart from the two d6.
- [x] 3.5 Make `naturalMarkOf` in `sound/natural.ts` return the first marked part's mark.

  Verify with `natural.test.ts` and `NaturalSoundWatcher.test.tsx`: "Two naturals in parts" plays only the Nat 1 sound, once.

## 4. The roll form

- [x] 4.1 In `RollForm.tsx`, move the form onto `parts` (design D5):
  - the quick dice and the chips rewrite the last part and rejoin every part
  - the chips list the last part's dice, labelled "Son parça" with 2 or more parts
  - "Avantaj" and "Dezavantaj" only for one part that is a single d20
  - blur writes `formulaPartsText`
  - `FORMULA_TEXT_MAX` is 486
  - submit sends `parts`

  Verify with `DicePage.test.tsx` cases:
  - "A die control with parts"
  - "The chips with parts"
  - "Parts in canonical form"
  - "A trailing separator"
  - "A d20 in each part"
  - "Advantage chosen before adding a part" (the roll request has mode normal)
  - "An attack and its damage" (one roll request with two parts)
- [x] 4.2 Show the hints: "En fazla 4 parça" for `tooManyParts`, and the general hint's sentence about ";".

  Verify with `DicePage.test.tsx`:
  - "Too many parts"
  - "Too many dice across parts" (hint "En fazla 60 zar")
  - "An empty part in the middle" marks the field invalid with the general hint

## 5. Integration check

- [x] 5.1 Run `npm run check` and `npm run test:emulator`. Both pass.
- [x] 5.2 On the emulator app in two browser sessions (a player and the DM):
  - roll "d20+5;d4+9+d20" and "30d6; 30d6"
  - check that both sessions play one throw with the same faces
  - check that the channel and the notification card (other session on another screen) show the parts and their totals
  - check that a hidden DM roll in parts shows "DM gizli zar attı" to the player
  - check the card and the form at 360 px wide without horizontal scroll

  Then stop every process on the project's ports as CLAUDE.md says.

## Workflow follow-up

- Archive the change with `/opsx:archive` after the owner reviews it, then commit (feat + docs archive).
