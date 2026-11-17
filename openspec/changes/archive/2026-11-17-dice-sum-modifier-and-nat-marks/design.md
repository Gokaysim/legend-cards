# Design

## Context

- A roll's content (`src/features/dice/schema.ts`, `contentFields`) holds `modifier`, an int from −99 to 99. `firestore.rules` checks it in `validRoll`, and `rollKeys()` lists the exact keys of a public roll and of a hidden roll's `dmRolls` record (`hasOnly` + `hasAll`).
- The fixed number is shown in three places: `formulaText` (`formula.ts`, used by `rollView.ts` for the form, the channel and the strip), the chip after the dice in `RollEntry.tsx`, and the result line in `DiceNotice.tsx`. The total comes from `rollTotal(dice, mode, modifier)`.
- The initiative tracker rolls through `rollDice` with its own modifier, and `combat/main` rules compare `record.modifier == roll.modifier`. Those rolls never carry a written sum.
- The working tree holds uncommitted work on the first item: `parseModifier` and `MODIFIER_TEXT_MAX` in `formula.ts`, a text input with `aria-invalid` and a hint in `RollForm.tsx`, and tests in `formula.test.ts` and `DicePage.test.tsx`. It clamps the sum to ±99 and sends only the total.
- The rules are close to their 1000-expression budget because of the twelve `dieAt` checks. See the dev-env memory.

## Goals / Non-Goals

**Goals:**
- Keep `modifier` as the single source of the total, so `rollTotal`, the initiative rules and old records stay unchanged.
- Add the written sum as an optional field that only affects how the roll is shown.

**Non-Goals:**
- No `*`, `/`, parentheses or dice inside the fixed number (`1d4` stays a die selected with the buttons).
- No change to the initiative tracker's "nat 20" and "nat 1" labels (spec: initiative-tracker), or to its modifier input.
- No change to the notification card's layout. Batch 3 reworks it.

## Decisions

### D1. Store the written sum as a canonical string, `modifierSum`, next to `modifier`

The record gets `modifierSum: string`, such as `"5+10-4"` or `"-2-3"`, present only when the user typed two or more numbers. The string is canonical: no spaces, ASCII `-`, no leading `+`, and numbers without leading zeros. `modifier` stays the sum.

- *Alternative: a list of ints.* The rules have no loops, so checking each element costs several expressions per index. A string costs one `matches` and one `size`, which matters with the 1000-expression budget.
- *Alternative: replace `modifier` with the string.* That would break old records, the initiative rules (`record.modifier == roll.modifier`) and `rollTotal`.

### D2. The rules check only the shape, not that the numbers add up

`rollKeys()` stays the required set. `publicRoll()` and the `dmRolls` create allow `rollKeys()` plus `'modifierSum'` in `hasOnly`, and `validRoll` adds:
`(!('modifierSum' in data) || (data.modifierSum is string && data.modifierSum.size() <= 24 && data.modifierSum.matches('-?[0-9]{1,2}([+-][0-9]{1,2}){1,7}')))`

The sum is not checked against `modifier`. Rules cannot add the numbers without a parser, and the roller already picks `modifier` freely (see the "Trust players" memory). Instead, the client checks when it reads: `schema.ts` parses `modifierSum` with the same parser, and drops it when it does not parse or does not add up to `modifier`. Like `motion`, a bad value only costs its roll the written form. The spec scenario "Numbers that do not add up" covers this.

### D3. One parser and one formatter in `formula.ts`

- `parseModifier(text)` returns `{ total, sum }` or `null`, where `sum` is the canonical string or `null` for a single number. It replaces the clamping version in the working tree: a number above 99 or a sum outside ±99 now returns `null`. Clamping would show "90 + 20" next to a total that used 99. It accepts `−` and `–` as minus and ignores spaces around signs. Text that is empty or only spaces is `{ total: 0, sum: null }`.
- `formulaText(counts, modifier, sum?)` shows the dice, then either ` + 5 + 10 − 4` from `sum` or the single number as today. `rollView` passes the content's sum. `RollEntry` and `DiceNotice` reuse one small `modifierLabel(modifier, sum)` helper for their chip and line, so the three places stay in step.

### D4. The form's text field

The field stays `type="text"` with `inputMode="text"`. Phones need a keyboard with + and −, and `numeric` hides them. `maxLength` is 24 (`MODIFIER_TEXT_MAX`, the same bound as the rules). The text is kept as typed: there is no reformatting on blur. The field uses `aria-invalid`, `aria-describedby` points to the hint, and the hint reads: "Sabit sayı yalnızca 0–99 arası sayılardan, + ve − işaretlerinden oluşabilir: örneğin 4+4-5. Toplam −99 ile +99 arasında olmalı." `RollInput` gets an optional `modifierSum`, and `rollDice` writes it only when it is non-null.

### D5. "Nat 20" and "Nat 1"

Only `NATURAL_MARK_TEXT` in `rollView.ts` and the doc comments change. `NaturalMarkLabel` keeps its `uppercase` styling, so it renders "NAT 20" while its text and accessible name are "Nat 20", which the tests query.

## Risks / Trade-offs

- [An older cached client reads a record with `modifierSum`] → Zod's object schema strips unknown keys, so the old client shows the total as today. No break.
- [An older client writes after the new rules are deployed] → The field is optional, so its writes still pass.
- [New client writes before the rules deploy] → CI deploys the rules and hosting in the same run. In development, the emulator loads the rules from the working tree.
- [Rules expression budget] → The new check adds about 5 expressions per record, and the hidden pair checks twice. The emulator test for a hidden 12-dice roll with a sum confirms it stays under the limit.
- [A doctored client writes a sum that does not match `modifier`] → Devices show the number that the total really uses (D2), so the display never contradicts the total.

## Migration Plan

No data migration. Existing records have no `modifierSum` and show as before. Rollback is a revert: old clients ignore the field, and old rules would only deny new writes that carry it.
