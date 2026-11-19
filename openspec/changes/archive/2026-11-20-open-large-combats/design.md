# Design

## Context

See proposal.md, "Why", for the failure.

What was measured on the emulator, with the current rules, as the DM opening a combat through `openCombat`:

| Characters | NPCs | Result |
| ---------- | ---- | ------ |
| 8          | 0    | opens  |
| 9          | 0    | denied |
| 9          | 1    | denied |
| 8          | 30   | opens  |
| 0          | 50   | opens  |

A 12-NPC group roll (`npcGroupWrites`) also passes. So the cost scales with characters only, about two document reads each, on top of a fixed few (`allowedEmails`, the DM's profile, `combat/main`). This matches Firestore's limit of 20 document reads by the rules per transaction or batch. The combatant rule's `joinsCombat()` calls `exists(characterPath(...))` and `get(characterPath(...))`, and in practice both count.

Callers today:

- `CombatProvider.open` calls `openCombat`, then rolls each NPC group (`npcGroupWrites` without `create`, the NPCs already exist).
- `CombatProvider.add` calls `addCombatants`. While gathering, that writes the characters and returns prepared NPC groups, which the group roll then creates (`npcGroupWrites` with `create`). While the fight runs, it writes characters and NPCs together and appends all of them to `combat.order`.
- `InitiativeTab`'s `useStep` shows `combatFailureMessage(failure)` for any failure.

## Goals / Non-Goals

**Goals:**

- Any combat up to 50 combatants opens and grows, whatever its mix.
- The join order (`seq`) and, during the fight, the order of added combatants stay exactly what the DM chose, even though they are written in several steps.
- A failure after the combat is open never hides which characters are missing.

**Non-Goals:**

- Changing `firestore.rules`. The rule's checks stay as they are.
- Making the whole setup atomic again. A partial setup is accepted and reported (see D3).
- Changing the 50-combatant limit or the 12-NPC group limit.

## Decisions

### D1. Write the characters in groups of at most 6

`COMBAT_LIMITS` gets `charactersPerWrite: 6`. Both `openCombat` and `addCombatants` split the characters into groups of that size, and each group is one transaction.

Six leaves room under the measured maximum of 8: a future rule that reads one more document per combatant or per request still fits. Each transaction re-reads `combat/main` and checks that it is still the same combat in the expected phase (as `addCombatants` does today), and throws `CombatChangedError` if not.

Alternatives considered:

- **Drop the `exists()` before the `get()` in `joinsCombat()`.** This would roughly double the ceiling to about 17 characters, still below 50. It also touches a rule that guards who may roll for a combatant. On its own it does not fix the problem.
- **Drop the character check from the rule.** Only the DM creates combatants, but the check keeps a combatant's `uid` honest, and that `uid` decides who may roll. Not worth weakening for a write-size problem.
- **A Cloud Function that writes everything with admin rights.** The project has no functions, and adding a server for this is out of proportion.

### D2. What goes into which write

`seq` values are assigned for the whole list before anything is written, in the same order as today (characters first, then NPC groups in order). They do not depend on which write carries a combatant. Players see the join order by `seq`, so it comes out the same however the writes land.

- **`openCombat`:** the first transaction sets `combat/main` to gathering and creates the first group of characters and **all NPCs**. NPCs cost almost nothing in rule reads, and having them in the first write means the NPC group roll can always run once the combat is open. Each later transaction adds the next group of characters, while the combat is still gathering with the same `combatId`.
- **`addCombatants` while gathering:** each transaction carries one group of characters. NPC groups are returned prepared, as today, and the group roll creates them (a 12-NPC creating roll passes, as measured).
- **`addCombatants` while the fight runs:** the drafts keep today's order (characters, then NPCs). They are split into consecutive slices with at most 6 characters each, and NPCs ride in whichever slice they fall into. Each transaction creates its slice and appends exactly that slice's ids to `combat.order`. So after every step the order is the old order plus a prefix of the new combatants, in the DM's order. The 50 check uses the current order length plus everything still to come, before the first write.

### D3. A partial result is returned, not thrown, by the api

`openCombat` and `addCombatants` stop at the first failing transaction after the first one and return `leftOut: JoiningCharacter[]` (the characters in that group and every later group) next to the current result. A failure in the first transaction still throws as today, so nothing changes for "nothing was written".

`CombatProvider.open` and `add` still roll the NPC groups first (the combat is open and the NPCs exist), then throw `CombatPartlyAddedError(leftOut)` if `leftOut` is not empty. The NPC roll must not be skipped just because a character group failed, or the goblins would sit unrolled.

### D4. The message

`errors.ts` gets `CombatPartlyAddedError` carrying the left-out characters. The tab knows the characters, so `combatFailureMessage` takes the names as an optional lookup. The message is:

> Savaş açıldı ama şu karakterler eklenemedi: Thorn, Elara. «+ Ekle» ile ekleyebilirsin.

From "+ Ekle" it reads "Şu karakterler eklenemedi: Thorn, Elara. «+ Ekle» ile tekrar ekleyebilirsin." The left-out characters are not in the combat, so the "+ Ekle" dialog already offers them.

The existing `permission-denied` text stays for a single failing step. With this change, the size limit no longer causes it.

## Risks / Trade-offs

- [Players see the combatants arrive in two to nine quick steps instead of at once.] → `seq` is fixed up front, so the list only grows. On a player's screen, the "İnisiyatif isteniyor" notice and the switch to the tab fire on their first combatant, as before.
- [A setup cut short leaves a combat with some characters missing.] → The DM gets the exact names and the existing dialog to add them. A gathering combat costs nothing to cancel with "Vazgeç" if the DM prefers to start over.
- [The DM's other device ends the combat between two writes.] → The next write sees another phase or `combatId` and stops. The left-out characters are reported, and the combat is already gone on every screen.
- [Firestore counts rule reads differently on the live service than on the emulator.] → The group size has a margin of 2 under the measured ceiling. The 50-combatant emulator test fails if a future rule change eats that margin.

## Migration Plan

None. No data or rules change. A DM with an old tab open keeps the old one-transaction behavior until the page reloads. The deploy reloads nothing by itself, but the fix is purely client side.
