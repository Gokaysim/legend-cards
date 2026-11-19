# Proposal

## Why

The DM got "Bu adım şu anda yapılamaz: savaş bu arada değişmiş olabilir" from "Modifier iste", and no combat opened. On the emulator, a combat opens with up to 8 player characters and fails from the 9th, however few NPCs it has (8 characters and 30 NPCs open; 9 characters and 1 NPC do not). "Modifier iste" writes the combat and every combatant in one transaction, and the combatant rule reads each character's record twice (`exists` and `get`). Firestore allows at most 20 document reads by the rules in one request, so the 9th character breaks it. The setup offers 50 combatants (spec: initiative-tracker, "Typed NPCs"), so a table with more than 8 characters cannot start a fight at all. "Savaşa ekle" (`addCombatants`) has the same ceiling. The tests only ever opened a combat with two characters, so nothing caught it.

## What Changes

- "Modifier iste" opens the combat with all NPCs and a first group of characters, then adds the remaining characters in further small writes. Each write stays well under the rules' read limit. The rules do not change.
- "Savaşa ekle" adds characters in the same small groups, both while the rolls come in and during the fight.
- When a later group fails, the combat stays open with the characters already in it. The DM sees which characters were left out and adds them with "Savaşa ekle".
- Emulator tests open a combat with 50 combatants, among them more characters than one write can carry, and add a large group of characters later, in both phases.
- `docs/conventions.md` notes the 20-read limit next to the expression limit, with this case as the example.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `initiative-tracker`: a combat opens and grows with any number of characters up to the 50-combatant limit, and a partly failed setup says which characters are missing.

## Impact

- `src/features/combat/api.ts`: `openCombat` and `addCombatants` split the characters into groups. A new constant sets the group size.
- `src/features/combat/CombatProvider.tsx` and `InitiativeTab.tsx`: report the characters left out when a later group fails.
- `src/features/combat/errors.ts`: a message for a partly added group.
- `src/features/combat/api.emulator.test.ts`: tests for large combats.
- `docs/conventions.md`: the read limit.
- No change to `firestore.rules`, the data model, or what players see.
