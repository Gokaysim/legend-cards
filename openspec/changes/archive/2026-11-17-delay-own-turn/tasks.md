# Tasks

## 1. The delay step (design D1)

- [x] 1.1 Add `delayTurn(order, state)` to `src/features/combat/order.ts` (swap with the next place; from the last place, move to place 1 with turn 0 and the next round; unchanged under two combatants), and verify `order.test.ts` covers a delay from the first, a middle, the second-to-last and the last place, and a one-combatant order

## 2. The rule (design D2)

- [x] 2.1 Add `delaysOwnTurn()` to `combat/main` in `firestore.rules` and update the comment above the match, and verify `tests/firestore.rules.emulator.test.ts` lets the active character's owner delay from the first and from the last place, and denies a delay by another player, a two-place move, a delay without the server time, a delay that changes the round in the middle, a swap of two other combatants, and a delay with one combatant

## 3. The API and the seen turn (design D3, D4)

- [x] 3.1 Add `activeId` to the `seen` turn the API takes, compare it in `sameTurn` and in `droppedWhenMoved`, pass it from `InitiativeTab`, and verify the existing `api.emulator.test.ts` turn tests still pass and a new one drops the DM's "Sıradaki" whose seen active combatant was removed
- [x] 3.2 Write `delayMyTurn(db, uid, seen)` in `src/features/combat/api.ts`, add `delayMyTurn` to `combatContext.ts`, `CombatProvider.tsx` and `src/test/TestCombatProvider.tsx`, and verify `api.emulator.test.ts` covers a player's delay, a delay from the last place, a double delay by a player who owns the next combatant too (one step only), and a delay racing the DM's "Sıradaki" (one step only)

## 4. The button (design D5; spec: "Delaying a turn")

- [x] 4.1 Show "Turumu beklet" before "Turumu bitirdim" for the active character's owner in `InitiativeTab.tsx`, disabled offline, while a step runs and with fewer than two combatants, and verify `InitiativeTab.test.tsx` covers the button calling `delayMyTurn` with the seen turn, its absence for the DM and for other players, and its disabled states
- [x] 4.2 Update the Tur entry and the `combat/main` access line in `docs/domain.md`, and verify both name "Turumu beklet" and the one-place delay

## 5. Integration

- [x] 5.1 Run `npm run check` and `npm run test:emulator` and verify both pass
- [x] 5.2 Play a fight in the app against the emulators with the DM and two players: delay from the middle and from the last place, end the delayed turn, see "Sıra sende" on the next player's window, and check a 360 px window, and verify each step matches the spec
- [x] 5.3 Stop every process on the project's ports as `CLAUDE.md` describes, and verify with `lsof -nP -iTCP -sTCP:LISTEN` that none is left

## Workflow follow-up

- Tick the Batch 4 item in `TODOS.md` once the change is applied.
- Archive the change with `/opsx:archive` after review.
