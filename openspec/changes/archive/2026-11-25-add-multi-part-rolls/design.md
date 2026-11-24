# Design

## Context

See proposal.md for the why and `specs/dice-rolls/spec.md` for the behavior. This design builds on the following parts of the current code:

- **One formula, one record.** `parseFormula` (`formula.ts`) reads one formula into `DiceCounts` plus a fixed number and its written sum. `rollDice` (`api.ts`) throws `physicalDice(counts, mode)` and writes `{style, mode, modifier, modifierSum?, note, dice, motion, sim}`.
  - The record holds no formula. `rollView` rebuilds the formula from the dice with `countsOf`. Totals and natural marks are derived on every read (`rollTotal`, `naturalMark`), never stored.
- **Consumers of a roll's view.** `rollView` is read by four places:
  - `RollEntry` (the channel)
  - `DiceNotice` (the card)
  - `FlatStage` in `DiceView.tsx` (the strip without 3D)
  - `NaturalMarkLabel` / `FlatDice`

  The natural sound reads `naturalMark` through `naturalMarkOf` (`sound/natural.ts`), and `DicePage` calls it for "Tekrar izle".
- **The 3D stage** plays `content.dice` with `content.motion`, index by index. It knows nothing about the formula.
- **The rules** (`validRoll` in `firestore.rules`) check the dice with a single `hasOnly`, so 60 dice fit inside the 1000-expression limit. The written sum is checked by one `matches` and its size. The client, not the rules, checks that the written sum adds up (`checkedModifierSum`). A record whose sum does not add up shows the fixed number alone.
- **Other writers.** The initiative tracker calls `rollWith` with `counts` of one d20 for a character, or N d20 for an NPC group (`combat/api.ts`). Its rule `shownBy` reads the roll record and needs `dice.size() == 1`. `src/test/diceFixtures.ts` fakes `roll()` from `request.counts`.

## Goals / Non-Goals

**Goals:**

- A roll of one part stays the same record and looks the same everywhere.
- Parts are a thin layer over the existing per-formula code: each part reuses today's parsing, canonical text, totals and marks.
- The rules' cost stays flat. Parts add a constant number of expressions, not one per part.
- The 3D stage and the motion format do not change.

**Non-Goals:**

- Advantage or disadvantage inside a part.
- Marking parts in the 3D strip, for example by tinting dice.
- A grand total across parts.
- Per-part notes.
- Changing the initiative tracker's rolls.

## Decisions

### D1. One record, parts as a compact string

A roll of two or more parts adds one field, `parts`, a string such as `"1:5;2:9"` or `"1:5+10-4;3"`.

- Each part is written as `<count>[:<sum>]`.
- `count` is the part's number of physical dice, from 1 to 60. A d100 counts 2, as everywhere.
- `sum` is the part's fixed number as written, in the `modifierSum` grammar, with a single number allowed. It is left out when the part's fixed number is 0.
- Parts are joined by `;`, in formula order.
- `dice` holds the parts' dice one part after another, each part in `FORMULA_ORDER`. Each part's dice therefore follow its count.

A multi-part record has the mode `normal`, the fixed number `0`, and no `modifierSum`. A roll of one part writes no `parts`, so its record is exactly today's.

*Why a string:* the rules check it with one `matches` and one `size()`, as they already do for `modifierSum`. The per-part meaning is checked on the client (D3).

*Alternatives:*
- **A list of maps** (`[{n, m, s}]`). Rules cannot loop, so each of the 4 indexes needs its own guarded checks. That means about 25 more expressions and verbose rules, to check numbers the client checks anyway.
- **One record per part**, written in one batch. This needs no schema change, but the explore session ruled it out: the strip plays only the newest record, so the second part's throw cuts the first one short. The card and the hidden-result timing also split.
- **Keeping the top-level `modifier` as the sum of the parts.** The sum of 4 parts can leave −99..99. It also means nothing for a roll with several totals.

### D2. Rules

`rollOptionalKeys()` gains `'parts'`. `validRoll` gains one clause:

```
&& (!('parts' in data)
  || (data.parts is string
    && data.parts.size() <= 120
    && data.parts.matches('PART(;PART){1,3}')
    && data.mode == 'normal'
    && data.modifier == 0
    && !('modifierSum' in data)))
```

`PART` is `([1-9]|[1-5][0-9]|60)(:-?[0-9]{1,2}([+-][0-9]{1,2}){0,7})?`. The longest string is 4 × (2 + 1 + 24) + 3 = 111 characters. The 120 bound is kept in step with a `PARTS_TEXT_MAX` constant in `formula.ts`.

The clause covers `diceRolls` and `dmRolls` alike, because both call `validRoll`.

`shownBy` (initiative) needs a single die, so a multi-part record, which always holds at least 2 dice, can never be shown as an initiative roll. No change is needed there.

The rules do not check:
- that the counts add up to `dice.size()`
- that a part's sum lies in −99..99

These follow the `modifierSum` precedent (design D2 of dice-sum-modifier-and-nat-marks). A forged record costs only its own display.

### D3. Reading a record: part spans with a lenient fallback

`schema.ts`'s `contentOf` turns the record into a `RollContent` with a new `parts: RollPart[]`. Each part is `{ start, count, modifier, modifierSum }`, which indexes into the flat `dice`.

`dice` and `motion` stay flat, so the 3D stage is unchanged.

- **Without `parts`,** one part covers every die, with the record's `modifier` and checked `modifierSum`.
- **With `parts`,** a new `checkedParts(dice, text)` in `formula.ts` parses the string and checks the parts. It returns `null`, and the roll reads as one part with the fixed number 0 (the record's own), when:
  - there are fewer than 2 or more than 4 parts
  - a count is 0
  - the counts do not add up to `dice.length`
  - a sum does not parse with `parseModifier` (which also bounds it to −99..99)
  - a part boundary splits a d100 tens die from its d10

`mode` stays at the roll level. A roll with parts is always `normal`, so the existing `keptIndexes` / `rollTotal` / `naturalMark` run unchanged on each part's slice of `dice`, using the roll's mode.

`modifierSum` keeps its existing meaning for one-part rolls. For parts, each part's `modifierSum` is its canonical written sum, or `null` for a single number.

### D4. Parsing the form's text

`parseFormula` splits the text on `;`.

1. An empty last part (after trimming) is dropped, so "d20+5;" is valid.
2. Any other empty part is `invalid`.
3. Each part is read by today's single-formula parser, renamed `parsePart`. Any part that is invalid makes the formula `invalid`.
4. More than 4 parts is a new reason, `tooManyParts`.
5. With 2 or more parts, a part without a die is `invalid`.
6. More than 60 physical dice across the parts is `tooMany`.

The reasons are checked in that order, so a syntax error is reported before a count limit.

`ParsedFormula`'s `ok` branch becomes `{ ok: true, parts: FormulaPart[] }`, where `FormulaPart = { counts, modifier, modifierSum }`. Today's whole-formula fields describe one part.

The canonical text is `parts.map(formulaInputText).join('; ')`.

- **The form's text limit** (`FORMULA_TEXT_MAX`) rises from 120 to 4 × 120 + 6 = 486. Each part may be as long as a whole formula is today.
- **The 60-dice helpers** (`canAdd`, `maxCount`) count the other parts' dice too. They take the total of the parts before the last as an offset.

*Alternative:* one combined regex for the whole text. It would be harder to read, and it would duplicate the per-part rules.

### D5. The form's controls act on the last part

`RollForm` keeps the text as the one source.

- **The quick dice and the chips** rewrite the last part through `formulaInputText` and rejoin all parts. This keeps every other part's text in canonical form.
- **The chips** list the last part's dice. With 2 or more parts, a small "Son parça" label precedes them.
- **"Avantaj" and "Dezavantaj"** are offered when there is exactly one part and it is a single d20 (`isSingleD20`). When the user adds a part after choosing "Avantaj", the choice is ignored at submit (`mode: 'normal'`), as today for any formula that is not a single d20.
- **The hint** gains the `tooManyParts` message "En fazla 4 parça". The general invalid hint adds one sentence about ";", such as "Birden fazla atış için ; ile ayır: örneğin 1d20+5; 2d6+3."

### D6. Writing a roll: `RollInput.parts`

`RollInput` replaces `counts`, `modifier` and `modifierSum` with `parts: RollPartInput[]` (1 to 4 parts), where `RollPartInput = { counts, modifier, modifierSum? }`.

- `rollDice` throws `parts.flatMap(physicalDice)` in one call to the thrower. The mode applies only to a one-part single d20. It then writes:
  - **one part:** today's fields
  - **two or more parts:** `mode: 'normal'`, `modifier: 0` and `parts`, each part's sum clamped and checked as `modifierSum` is today
- The local `RollResult.roll` carries the same `parts` spans that `contentOf` would compute. The roller's own playback and channel entry therefore match what other devices show.
- **Callers:** the initiative tracker's two calls in `combat/api.ts` pass a single part. A small `onePart(counts, modifier)` helper in `formula.ts` keeps them short. `src/test/diceFixtures.ts` builds its fake roll from `parts`.

*Alternative:* keep `counts`/`modifier` and add an optional `moreParts`. That gives two shapes for the same idea, and two sources of truth for the first part.

### D7. Views: one view per part

`rollView` returns `{ parts: PartView[], mark }`.

- `PartView` is today's `RollView` for one part: `formula`, `modifier`, `results`, `total` and `mark`.
- Each `ResultView.key` keeps the global die indexes, so keys stay unique across parts.
- `mark` on the whole view is the first part's mark that is not `null`. Only the natural sound uses it.

The consumers render the parts as follows:

- **`RollEntry`:** one bordered box per part, stacked. The box shows the part's formula, dice, modifier, natural mark and total. Its border is gold or red by the part's mark.
  - The settling blur and the "sonuç bekleniyor" screen-reader text cover all boxes together, as one result.
  - A one-part roll renders exactly one box, as today.
- **`DiceNotice`:** one line per part, with the formula, the kept results, the fixed number, the mark and the total. A multi-part card uses a smaller total (`text-xl`) so that 4 lines fit. A one-part card is unchanged.
- **`FlatStage`:** one `FlatDice` group per part, separated by a thin divider, each followed by its `NaturalMarkLabel`. The large or small size still depends on the total number of results.
- **`FlatDice` and `NaturalMarkLabel`** take a `PartView` instead of a `RollView`.
- **`naturalMarkOf`** (`sound/natural.ts`) returns the first marked part's mark, from `rollView(content).mark` or an equivalent helper in `formula.ts`, so the sound code does not import views.

### D8. Unchanged paths

The following keep working on a multi-part roll because they treat it as one roll:

- freshness, the strip's playback and the settling timeout
- "Tekrar izle"
- the hidden roll's batch
- the channel reset
- the unseen-roll badge

## Risks / Trade-offs

- **[A cached old tab reads a multi-part record]** The previous client ignores `parts` and shows the dice as one formula with the fixed number 0, so the totals are wrong on that tab. → Each deploy reloads the app on next open. The table uses fresh tabs per session, and the record stays correct for every updated client.
- **[A forged `parts` string]** A crafted record could pair counts that do not match its dice. → `checkedParts` falls back to one part (D3). The rules bound the size and the shape. Showing one's own roll wrongly gains nothing.
- **[The card's height with 4 parts]** On a 360 px phone, 4 long lines could cover much of the top of the screen. → The total is smaller in multi-part cards, and the card already auto-closes after 6 s. Check it at 360 px during implementation.
- **[The 3D strip gives no hint of parts]** Players see three dice land without knowing which belong together. → The owner accepted this. The channel entry, beside the strip, shows the parts as the dice rest.
- **[The chips edit only the last part]** Changing an earlier part's dice needs typing. → The owner accepted this, and it is labelled "Son parça".

## Migration Plan

- **No data migration.** Records without `parts` read as one part (D3).
- **Deploy order** is the usual single CI deploy: the rules and hosting ship together. A client that writes `parts` before the new rules are live would be refused, but CI deploys the rules first in the same run.
- **Rollback:** revert the commit. Records written with `parts` would then show as one part with the fixed number 0 on the old client, and the old rules would refuse new multi-part writes.
