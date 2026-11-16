# Tasks

## 1. Setup and the game system

- [x] 1.1 Add `@dnd-kit/core`, `@dnd-kit/sortable` and `@dnd-kit/utilities` to `package.json` and verify `npm install` and `npm run check` pass on Node 24
- [x] 1.2 Change "D&D 5e" to "D&D 3.5" in `CLAUDE.md`, `docs/domain.md` and the `context` of `openspec/config.yaml`, and verify `grep -rn "5e" CLAUDE.md docs openspec/config.yaml` finds no mention of the group's system

## 2. The character's initiative modifier (design D12)

- [x] 2.1 Add the optional `initiativeModifier` (whole number, −10 to +30) to `src/features/characters/schema.ts` and verify `schema.test.ts` covers a record with it, without it, and with 31
- [x] 2.2 Allow `initiativeModifier` in `validCharacter` and in the update rule's `onlyChanges` in `firestore.rules`, and verify the rules tests cover the owner's and the DM's change, another player's change denied, and 31 and 2.5 denied
- [x] 2.3 Update the characters section of `docs/domain.md` (the stored fields) and verify it names `initiativeModifier`

## 3. The combat records and rules (design D1, D3, D5, D6, D7)

- [x] 3.1 Write `src/features/combat/schema.ts` with `combat/main`, `combatants`, `dmCombatants` and `combatChanges`, their converters and `COMBAT_LIMITS`, and verify `schema.test.ts` accepts valid records and refuses wrong shapes
- [x] 3.2 Add the `combat/main` rules: read for signed-in users; open from idle (or missing) by the DM only; start, reorder, add, remove, step back and end by the DM only; a player's one-step "Turumu bitirdim" only from their own active character; at most 50 in `order`. Verify each allowed and denied case in `tests/firestore.rules.emulator.test.ts`, including opening a second combat
- [x] 3.3 Add the `combatants` rules: read for signed-in users; create and delete by the DM only; the roll update by the owner or the DM only while gathering, only from `roll == null`, matching a roll record created in the same request (one d20, mode normal, same die and modifier, by the signed-in user, not hidden); `rolled` and clearing a roll by the DM only. Verify each case, including a forged total, a second roll, another player's character, a stale `combatId`, and a roll after the start
- [x] 3.4 Add the `dmCombatants` rules (the DM only, for read and write) and verify that a player cannot read or write one
- [x] 3.5 Add the `combatChanges` rules (the DM only, created with the start or the end it records, counts checked, never changed or deleted) and verify each case, including a wrong count and a record without its combat change

## 4. The order and the turns (design D2, D5)

- [x] 4.1 Write `initiativeOrder` and the natural mark in `src/features/combat/order.ts`, and verify `order.test.ts` covers the spec's scenarios: natural 20s first with a low modifier, natural 1s last with a high one, equal totals together, those without a roll last by join order, and an injected shuffle that decides every tie
- [x] 4.2 Write `nextTurn`, `previousTurn`, `turnAfterRemoval` and `turnAfterReorder`, and verify the unit tests cover wrapping into the next round, stepping back across a round, the stop at round 1's first place, removing before, at, and after the active place and at the last place, and the active combatant kept through a reorder

## 5. Writing other records with a roll (design D3)

- [x] 5.1 Give `rollDice` the optional `alsoWrite(batch, rollId, values)` so a public roll and the caller's writes go in one batch, and verify `src/features/dice/api.emulator.test.ts` covers a public and a hidden roll with extra writes, and that a roll without `alsoWrite` is written as before

## 6. The combat api and provider (design D3, D4, D5, D6, D7, D11)

- [x] 6.1 Write `openCombat`, `rollNpcGroup`, `rollInitiative` (saving the character's modifier) and `clearRoll` in `src/features/combat/api.ts`, and verify `api.emulator.test.ts` opens a combat, rolls a player's character and a group of four NPCs, and clears a roll
- [x] 6.2 Write `startFight`, `stepTurn`, `endMyTurn`, `reorder`, `addCombatants` and `removeCombatant`, each changing `combat/main` in a transaction, and verify the emulator tests cover a start with someone who did not roll, the turn steps, a player's turn end racing a DM step, a reorder, and removing the active combatant
- [x] 6.3 Write `endCombat` (one batch: delete the combatants and the DM records, idle, and the end record when the fight had started) and verify the emulator tests show empty collections after it and an end record only for a started fight
- [x] 6.4 Write `CombatProvider` with `useCombat`, `useDmCombatants` (subscribed only inside `<DmOnly>`) and `useCombatActions`, mount it in `src/app/App.tsx`, add `TestCombatProvider`, `src/test/combatFixtures.ts` and the `combat` option of `renderApp`, and verify a provider test shows a player's device never subscribing to `dmCombatants`
- [x] 6.5 Add the combat feature, its provider and the `combat` test option to `docs/conventions.md` and verify the project layout lists `combat/`

## 7. The Zarlar screen's new layout (design D8)

- [x] 7.1 Rebuild `DicePage` with the wide strip and the form on the right and the "Kanal" and "İnisiyatif" tabs on the left, kept in `?tab=`, and verify `DicePage.test.tsx` covers the default Kanal tab, reloading on `?tab=inisiyatif`, and the stacked order at 360 px
- [x] 7.2 Move "Zar stilin" and "Bu cihazda" into `DiceSettingsDialog`, opened by "🎲 Zar stili" on the strip, closing when a style is chosen, with "Kapat" and with Escape, and verify the component tests cover the dice-rolls scenarios of "The dice settings dialog"
- [x] 7.3 Update the Zarlar part of `docs/domain.md` to the new layout and verify it names the two tabs and the settings dialog

## 8. Setting up and rolling (spec: initiative-tracker)

- [x] 8.1 Build the İnisiyatif tab without a combat (the empty state, the DM's "Savaş başlat") and the tab's mark, and verify the component tests cover "The İnisiyatif tab" scenarios
- [x] 8.2 Build `CombatSetupDialog` (characters grouped by owner, the default checks, "Modifier iste" disabled without anyone) and `NpcForm` (name, count 1 to 12, modifier, numbered copies, the 50 limit), and verify the component tests cover "Setting up a combat" and "Typed NPCs"
- [x] 8.3 Build the gathering view: the player's own rows with the remembered modifier and "At", the DM's "At" on every row and "Yeniden attır", the DM's provisional order, the player's join order with rolled and waiting marks, NPC numbers shown only to the DM, and "At" disabled offline and for an invalid modifier. Verify the component tests cover "Asking for initiative", "Rolling initiative", "The initiative modifier", "One roll per combatant", "While the rolls come in", "What players see" and "Combat steps need a connection"
- [x] 8.4 Switch the Zarlar page to the İnisiyatif tab once per combat when the user has a combatant to roll, and verify a test shows the switch, and that a user who goes back to Kanal stays there

## 9. The fight (spec: initiative-tracker)

- [x] 9.1 Build the running view: "Tur n", the active mark, "nat 20", "nat 1", "atmadı" and "elle eklendi", "Sıradaki" and "Geri" for the DM, "Turumu bitirdim" for the active character's owner, and verify the component tests cover "Starting the fight" and "Turns and rounds"
- [x] 9.2 Add dragging with dnd-kit for the DM (pointer, touch and keyboard, with Turkish announcements), and verify the tests cover a keyboard move and the active combatant staying active
- [x] 9.3 Add the DM's adding during the fight (a table character not in the combat, or typed NPCs) and removing, and verify the component tests cover "Adding during the fight" and "Removing a combatant"
- [x] 9.4 Add "Bitir" with its confirmation, and "Vazgeç" while gathering, and verify the component tests cover "Ending a combat"

## 10. The notices (design D9)

- [x] 10.1 Build `CombatNotice` with "İnisiyatif isteniyor" (not on the Zarlar screen, until the user rolls, the combat moves on, or it is closed; opens `/dice?tab=inisiyatif`) and "Sıra sende: <character>" (fresh changes only, closes after 6 seconds), mount it in `AppShell`, and verify the tests cover both messages, no notice for an NPC's turn, and no notice after a reload

## 11. The log (spec: activity-log)

- [x] 11.1 Add `combatChanges` as the log's ninth source, left out with a user filter, and verify `src/features/activity-log/api.emulator.test.ts` reads it without a filter and not with one
- [x] 11.2 Describe the start and the end in `eventText.ts` ("savaşı başlattı: 6 katılımcı.", "savaşı bitirdi: 5 tur.") and verify `eventText.test.ts` covers both
- [x] 11.3 Add the combat words (Savaş, İnisiyatif, Katılımcı, Tur) and the combat's records to `docs/domain.md`, and verify the glossary and the data table list them

## 12. Integration

- [x] 12.1 Run `npm run check` and `npm run test:emulator` and verify both pass
- [x] 12.2 Play a combat in the app against the emulators with the DM and two players: setup with typed NPCs, rolls from each player's window, start, turns across two rounds, a drag, an addition, a removal and the end; check the İşlem Logu and a 360 px window, and verify every step matches the spec
- [x] 12.3 Stop every process on the project's ports as `CLAUDE.md` describes, and verify with `lsof -nP -iTCP -sTCP:LISTEN` that none is left
