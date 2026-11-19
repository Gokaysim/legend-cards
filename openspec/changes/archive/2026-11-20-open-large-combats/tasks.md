# Tasks

## 1. A failing test first

- [x] 1.1 In `src/features/combat/api.emulator.test.ts`, add a seed helper for many characters (one owner is enough), and a test that opens a combat with 12 characters and "Goblin" ×6 through `openCombat`. Verify with `npm run test:emulator` that it fails today with `permission-denied`, which reproduces the bug before any fix.

## 2. Writing combatants in groups (api)

- [x] 2.1 Add `charactersPerWrite: 6` to `COMBAT_LIMITS` in `src/features/combat/schema.ts`, with a comment on the measured ceiling of 8 and the 20-read limit (design D1).
- [x] 2.2 Rework `openCombat` as in design D2 and D3. Assign every `seq` first. The first transaction opens the combat with the first group of characters and all NPCs. Later transactions add one group each while the combat is the same and still gathering. Return `leftOut` from the first later group that fails, and keep throwing when the first transaction fails. Verify with `npm run test:emulator` that the test from 1.1 passes and that the combatants' `seq` values run 0 to 17 in the chosen order.
- [x] 2.3 Rework `addCombatants` the same way. While gathering, write characters in groups. While the fight runs, write consecutive slices with at most 6 characters each, and append each slice's ids to `combat.order`. Check the 50 limit against everything before the first write. Add emulator tests that add 10 characters while gathering, and 10 characters plus "Kurt" ×2 in round 2. Verify that the order ends with the 10 characters and then the wolves, in the chosen order, all `manual`.
- [x] 2.4 Add an emulator test for 50 combatants: 26 characters and two 12-NPC groups through `openCombat`, followed by both group rolls. Verify that all 50 exist and every NPC is rolled.
- [x] 2.5 Add emulator tests for a cut-short setup. A character id with no record in the second group makes that write fail. Verify that `openCombat` returns that group and every later group as `leftOut`, the combat stays gathering with the first group and the NPCs, and a failure in the first group still throws with no combat open. Do the same for `addCombatants`.

## 3. Reporting a cut-short setup (provider and tab)

- [x] 3.1 Add `CombatPartlyAddedError` (the left-out characters) to `src/features/combat/errors.ts`, and let `combatFailureMessage` take a character-name lookup to build the two messages in design D4. Extend the error tests (create `errors.test.ts` if it does not exist). Verify both texts, the comma-joined names, and that every other failure keeps its message.
- [x] 3.2 In `CombatProvider.tsx`, make `open` and `add` roll the NPC groups first and then throw `CombatPartlyAddedError` when `leftOut` is not empty (design D3). Extend `CombatProvider.test.tsx` with the mocked api. Verify that the group roll still runs and the error carries the left-out characters, and that nothing is thrown when `leftOut` is empty.
- [x] 3.3 In `InitiativeTab.tsx` (and `JoinCombatDialog.tsx` if it shows its own failure), pass the character names to `combatFailureMessage`. Add an `InitiativeTab.test.tsx` case where `open` rejects with `CombatPartlyAddedError`. Verify that the message names the characters and points to "+ Ekle", and that "+ Ekle" then offers those characters.

## 4. Docs

- [x] 4.1 In `docs/conventions.md`, next to "The expression limit", add "The read limit": a request's rules may read at most 20 documents, `exists()` and `get()` of the same document both count, and a write that scales with the number of documents it touches must be split. Point to `charactersPerWrite` as the example. Verify that the text matches the code.
- [x] 4.2 If `docs/domain.md` describes how a combat opens, add that a large table's characters arrive in a few quick steps. Verify that the doc matches spec initiative-tracker, "Combats of any size".

## 5. Integration

- [x] 5.1 Run `npm run check` and `npm run test:emulator`. Both pass.
- [x] 5.2 In the dev app on the emulators, as the DM, give the table at least 10 unarchived player characters. Start a combat with all of them and an NPC group, and check that every character and the rolled NPCs appear on the DM's screen and a player's screen. Then remove the throwaway characters, or archive them, and stop every process on the project's ports as CLAUDE.md requires.

## Workflow follow-up

- Archive with `/opsx:archive`, then commit (feat plus docs archive).
- Pushing to `master` deploys to the live project, so push only when the owner asks.
