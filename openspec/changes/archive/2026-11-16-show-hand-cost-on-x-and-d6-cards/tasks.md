# Tasks

Apply this change after `player-discard-and-spend` is done. That change edits the same test files (`HoldingDialog.test.tsx`, `tests/firestore.rules.emulator.test.ts`) and `docs/domain.md`, and its uncommitted work is in the tree.

## 1. The hand cost badge

- [x] 1.1 In `src/features/cards/display.ts`, give `costChange` the fourth result `'other'` (design D1). It returns `null` for the same cost, `'lower'` or `'higher'` for two numbers that differ, and `'other'` for any other difference. Two numbers compare by value. Other costs compare as trimmed, lowercased text, and a missing cost counts as empty. Update its doc comment. Verify with `display.test.ts`:
  - `'other'`: "X" → "3", "d6" → "4", "3" → "X", no cost → "2"
  - `null`: "3" → "3,0", "d6" → "D6", "X" → "x", no cost → no cost
  - `'lower'`: "3" → "1"
  - `'higher'`: "1" → "2,5"
- [x] 1.2 In `src/features/cards/CostBadge.tsx`, accept `'other'` as an unmarked difference (design D2). Keep the neutral classes and set no `data-cost-change`. Title it "Cost: 3 (temel cost: X)", and add " (temel cost: X)" to the screen reader text without a lower or higher word. Update the component's doc comment. Verify with `CardFace.test.tsx` on a face without a picture: an "X" card with the hand cost "3" reads "Cost: 3 (temel cost: X)" and has the `border-line` class and no `data-cost-change`. The existing "does not mark …" cases still pass.
- [x] 1.3 Check that `CardFace` and `CardZoomDialog` show the badge over the picture for `'other'`. Their `change ? … : …` tests already treat it as truthy, so expect only type and comment changes. Verify:
  - in `CardFace.test.tsx`, a picture face of an "X" card with "3" shows a visible badge (not inside `.sr-only`, with the class `absolute`) that reads "Cost: 3 (temel cost: X)" without `data-cost-change`
  - in `CardFace.test.tsx`, a "d6" card with "4" and a 3-cost card with "X" show unmarked badges, and a 3-cost card with "3,0" keeps the badge hidden
  - in `CardZoomDialog.test.tsx`, the zoom of an "X" card with "3" shows the unmarked badge, and the library zoom of the same card shows none
- [x] 1.4 In `src/features/hands/holdingInfo.ts`, have `costInfo` name "temel" when `costChange(card.cost, handCost) !== null` (design D3), and update its doc comment. Verify with `holdingInfo.test.ts`:
  - an "X" card with "3" reads "Cost 3 (temel: X)"
  - a 3-cost card with "3,0" reads "Cost 3"
  - "Cost 1 (temel: 3)" and "Cost 2 (temel: —)" still pass
- [x] 1.5 Update `docs/domain.md`:
  - the "Card faces" bullet under "Where they show": a hand cost that differs from the card's own cost is a badge on the picture's cost corner, green or red only between two numbers, and neutral otherwise, as for an `X` or `d6` card with a number
  - the **Cost** glossary row, if it still reads as if every badge is marked lower or higher

  Verify by reading the changed passages against the card-images delta spec.

## 2. Payment held in place

- [x] 2.1 In `tests/firestore.rules.emulator.test.ts`, next to "pays the cost override instead of the card's own cost" in "the price a holder pays", add the cases from design D4. Leave the in-flight hunks of other changes alone. Verify with `npm run test:emulator`:
  - `seedPriced('X', '3')`: an amount of 2 is denied, and 3 is allowed
  - `seedPriced('d6', '4')`: an amount of 3 is denied, and 4 is allowed
- [x] 2.2 In `src/features/hands/HoldingDialog.test.tsx`, under "HoldingDialog actions", add Ayla's use of an "X" card whose holding has `costOverride: '3'`. The use step shows no amount field and the confirm control reads "Kullanımı onayla (3 LP)". Confirming calls the use with 3. Add the same for a "d6" card with "4" and no die field. If either test fails, fix the payment path in this task (design D4). Verify with the unit tests.

## 3. Integration

- [x] 3.1 Run `npm run check` and `npm run test:emulator` (after `. ~/.nvm/nvm.sh && nvm use`). Verify both pass.
- [x] 3.2 In the running app against the emulators, in Chrome:
  - as the DM, write "3" into "Bu eldeki cost" on an "X" card that has a picture in Oyuncu 1's hand
  - check that the face in the hand, the card details and the zoom show a neutral "3" badge on the cost corner, and that the label reads "Cost 3 (temel: X)"
  - as Oyuncu 1, use the card. Check that no amount is asked, that the button reads "Kullanımı onayla (3 LP)", and that the DM's window shows the LP 3 lower and a log row with −3 LP
  - repeat the badge check for a "d6" card with "4"
  - check the badge on a light and a dark picture, at 360 CSS pixels and at a desktop width
- [x] 3.3 Stop the dev server and the emulators as `CLAUDE.md` describes, with SIGINT to the process group and waiting for the export. Verify with `lsof -nP -iTCP -sTCP:LISTEN` that no project port is still held.

## Workflow follow-up

- Archive the change with `/opsx:archive` after the owner reviews the result, and sync the delta specs into `openspec/specs/`.
