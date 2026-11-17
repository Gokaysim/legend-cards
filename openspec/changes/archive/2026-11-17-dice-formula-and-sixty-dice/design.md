# Design

## Context

- `formula.ts` holds `MAX_DICE = 12`, the counts helpers (`physicalCount`, `canAdd`, `isSingleD20`), `parseModifier` for the fixed number written as a sum, and `formulaText`. The last one writes the canonical formula ("1d20 + 2d6 + 5 + 10 − 4") that the form, the channel and the strip show.
- `RollForm.tsx` keeps `counts` and `modifierText` in separate state. The formula is a read-only `<output>`, and each dice chip button removes one die.
- `firestore.rules` `validRoll` checks `dice.size() <= 12`, then calls `dieAt(dice, i)` for i = 0..11, because rules have no loops. Each call checks the die's keys, `v is int`, a `<type>:<face>` regex, and the d100 pairing. `motion.size() <= 1400`. The rules are already near the 1000-expression budget in some batches (dev-env memory).
- `schema.ts` caps `dice` at `MAX_DICE` in zod and `MOTION_MAX = 1400` (12 dice × 20 float32 in base64).
- `DiceView.tsx` draws the lazy 3D `DiceStage` when the roll has motion and `canDraw3d()`. Otherwise it draws `FlatStage`, which reports "at rest" at once, so the result blur lifts at once.
- `deviceSettings.ts` stores "Atışları göster" (`lcm.dice.show`) and "Zar sesi" (`lcm.dice.sound`) in `localStorage`, with an in-memory fallback, and syncs them across tabs.
- The explore spike, with the limit raised by hand, rolled 40 and 60 d6 in the app. The Rapier simulation took 65 ms for 40 d6 and 98 ms for 60 d6 on desktop. The animation lasted about 1.7 to 1.9 s, and no die left the tray. About 16 of the 40 and 34 of the 60 dice came to rest on other dice, but the faces stayed mostly readable. The channel entry wrapped the results 5 per row.

## Goals / Non-Goals

**Goals:**
- The formula text is the form's one source of truth, and the controls are shortcuts that rewrite it.
- The rules' cost per roll does not grow with the number of dice.
- Turning the 3D dice off on a device skips loading three.js and the stage, and changes nothing for other devices.

**Non-Goals:**
- No keep, drop or explode notation (`kh`, `kl`, `!`), no multiplication, no parentheses, no negative dice.
- No change to the record format, apart from the larger bounds.
- No change to the initiative tracker's form or its 1d20 rolls.
- No grouping or collapsing of the channel's dice. They wrap as today.

## Decisions

### D1. The form keeps only the formula text and derives everything from it

`RollForm` replaces `counts` and `modifierText` with one `text` state. A new `parseFormula(text)` in `formula.ts` returns one of three results:
- `{ ok: true, counts, modifier, modifierSum }`
- `{ ok: false, reason: 'invalid' }`
- `{ ok: false, reason: 'tooMany' }`

The parser works in four steps:
1. Map `−` and `–` to `-`, remove spaces around signs, and trim.
2. Require the whole text to match `^[+-]?term([+-]term)*$`. A term is either a dice term or a number.
3. A dice term is `(\d{1,3})?d(4|6|8|10|12|20|100|%)`, matched case-insensitively. A missing count is 1, `%` reads as 100, and a count of 0 or a minus sign before a die makes the text invalid.
4. The number terms go, in order, through the existing rules of `parseModifier`: each from 0 to 99, at most 8 of them, and a total from −99 to 99. A single number gives no `modifierSum`. Same-die terms add up. More than `MAX_DICE` physical dice gives `tooMany`.

An empty text gives empty counts and modifier 0. It is valid but has no dice, so "At" is disabled.

The controls work on the parsed formula and write back `formulaText(counts, modifier, modifierSum)`:
- A die button adds one die.
- A chip's count field sets that type's count, capped to what fits.
- A chip's "×" sets the count to 0.

While the text is invalid, the die buttons and chips show the last valid formula and are disabled, so no control can overwrite text the user is still typing. On blur, a valid text is replaced by its canonical form. While the user types, the text is never rewritten (spec: "A typed formula").

- *Alternative: keep `counts` as the source and sync the text to it.* Two sources would need a two-way sync. The text would also be rewritten while the user types, which moves the cursor.
- *Alternative: keep "Sabit sayı" next to the formula.* The owner chose one field (explore session).

### D2. The chip's count field

Each chip becomes `[count] dX ×`. The count is an `<input inputMode="numeric">` with an accessible name such as "d6 sayısı". The field and the formula update as the user types, and an empty field leaves the formula as it was. On blur, an empty field or 0 removes the type. A number above what fits is capped to the free room plus the type's current count (spec: "A count that does not fit"). "×" gets the accessible name "d6 çıkar" and now removes the whole type, not one die.

### D3. Rules: one `hasOnly` for every die, and no d100 pairing check

`validRoll` checks the following:
- `dice.size()` from 1 to 60.
- `dice.hasOnly(allDice())`. `allDice()` returns the literal list of the 70 possible dice: `{'t': 'd4', 'v': 1}` … `{'t': 'd100', 'v': 90}`. Map equality checks each die's type, face and exact keys at once, for any list length. It replaces `dieFaces()` and `dieAt`.
- `motion.size()` at most 6600. 60 × 80 bytes is 4800 bytes, 6400 base64 characters, plus some room.

The server no longer checks that a d100 tens die is followed by its d10. The owner chose this during apply (option 1). Rules have no loops, so any per-index check costs about 15 to 25 expressions per die. An emulator probe measured how many dice each approach fits in the 1000-expression budget:
- the old full `dieAt`: 13 dice
- a per-die regex alone: 30 dice
- the leanest inline pairing check alone: 48 d6, or 36 dice in d100 pairs
- `hasOnly` alone: all 60 dice, including the DM's hidden pair, in the real rules

Pairing stays correct because the writer always throws a d100 as its tens die and then its d10 (`physicalDice`). The readers are already lenient: `resultGroups` shows a lone tens die as a die of its own and adds its face. Only a hand-crafted write can break the pairing, and it can only change how that one roll shows, never the channel. Trusting players fits the owner's stance on self-service actions.

- *Alternative: unroll `dieAt` to 60.* It fits only 13 dice.
- *Alternative: store results as a string and check them with one regex.* It changes the record format, the readers, and the initiative rules that read `dice[0]`.
- *Alternative: a 24-die cap with every check kept.* It rules out 40d6, the reason for this change.

### D4. Client bounds follow the rules

`MAX_DICE = 60` drives the form, the parser and the zod `dice.max`. `MOTION_MAX = 6600` matches the rules. `throwDice`, `makeThrows` and `simulateThrow` take any number of dice already. The tray and the throw area stay as they are, because the spike showed 60 dice stay inside.

### D5. "Zarları 3D göster" is a device setting that gates the stage

`deviceSettings.ts` gets `SHOW_3D_KEY = 'lcm.dice.3d'`. The setting reads as on unless `'0'` is stored, and the hook gains `show3d` and `setShow3d`. `DiceSettingsDialog` lists it third under "Bu cihazda".

`DiceView` draws the stage only when `motion && canDraw3d() && show3d`. Otherwise it draws `FlatStage`, and the stage chunk is never imported. Because `FlatStage` reports "at rest" at once, the blur lifts at once (spec: "When a hidden result shows"), with no extra code in `DicePage`.

The roller's throw does not read the setting. `throwWithPhysics` still loads Rapier and simulates, without rendering, so the record carries motion and other devices play it (owner's choice A).

- *Alternative: skip physics on the roller when 3D is off (`flatThrow`).* That is cheaper on a weak phone, but that player's rolls would show flat on every device. The owner rejected it.

### D6. Many dice in the flat views

`FlatStage` uses size `lg` up to 12 dice and the channel's `sm` size above that. On a phone, 60 results are still taller than the strip, so the strip scrolls. It uses `align-content: safe center` and a top padding, so the first row stays reachable below the "Son atış" and "Zar stili" labels. The browser check found the first row clipped with plain centring. `RollEntry` and `DiceNotice` already wrap their dice. They are checked with 60 dice at 360 px and at a wide window, and adjusted only if they widen or overflow the page.

## Risks / Trade-offs

- [Older clients still open after the deploy validate `dice.max(12)`. A 60-die record then fails their channel's converter, and the channel shows an error until the page reloads.] → CI deploys the client and the rules together, and the owner is told that the table should reload once after the release. Rolls of 12 dice or fewer stay readable both ways.
- [60 dice in 3D on a weak phone may stutter, and the roller's own simulation may take about half a second.] → "Zarları 3D göster" lets that device draw flat dice. The roller's simulation runs once per roll. A task measures a 60-die throw in Chrome with CPU throttling, and the owner tries it on a phone.
- [Stacked dice may hide a face in the strip.] → The recorded values drive the channel and the total. The strip is decoration.
- [The server no longer rejects a d100 tens die without its d10.] → Only a hand-crafted write can produce one. It shows as a lone die in that one roll, and every other roll and the channel are unaffected (D3).
- [Rewriting to the canonical form on blur may surprise someone who typed "d20+5".] → It keeps the same meaning and shows what the channel will show. The spec scenarios cover it.

## Migration Plan

No data migration, because existing records already fit the new bounds. Deploy goes through CI on push to `master`, with the rules and Hosting together. To roll back, revert the commit. Records with more than 12 dice would then fail the old schema's converter, so before a rollback the DM resets the dice channel, or the zod bound stays at 60 in the revert.
