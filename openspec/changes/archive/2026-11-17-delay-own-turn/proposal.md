# Proposal

## Why

In D&D 3.5 a character can delay: it lets the next combatant act first and takes its place right after them. Today a player can only end their turn with "Turumu bitirdim"; to delay, they have to ask the DM to drag their character down and press "Sıradaki". The owner wants players to do it themselves, from the same place they end their turn (TODOS.md, Batch 4).

## What Changes

- The active character's owner gets "Turumu beklet" beside "Turumu bitirdim".
- "Turumu beklet" makes the next combatant active and moves the player's combatant to the place right after it, for good: the order stays changed for the rest of the fight, as with a D&D 3.5 delay.
- When the delaying combatant is last, the first combatant of the next round becomes active, the round goes up by one, and the delaying combatant moves to second place.
- With only one combatant, "Turumu beklet" is disabled.
- The server allows a player this one swap while their character is active, and nothing else of the order. A double press, or a press after the turn moved on, changes nothing, as with "Turumu bitirdim".
- The next combatant's owner gets "Sıra sende" as with any turn change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `initiative-tracker`: a new "Delaying a turn" requirement; "Who changes a combat" lets a player delay their own active character.

## Impact

- `src/features/combat/order.ts`: a pure `delayTurn` step, with unit tests.
- `src/features/combat/api.ts`: `delayMyTurn`, a transaction like `endMyTurn`, dropped silently when the turn moved on.
- `src/features/combat/combatContext.ts`, `CombatProvider.tsx`, `src/test/TestCombatProvider.tsx`: the new action.
- `src/features/combat/InitiativeTab.tsx`: the "Turumu beklet" button, with component tests.
- `firestore.rules`: a `delaysOwnTurn()` branch on `combat/main`, with rules tests in `tests/firestore.rules.emulator.test.ts` and API tests in `src/features/combat/api.emulator.test.ts`.
- `docs/domain.md`: the Tur glossary entry and the `combat/main` access line.
- No new data path or field; nothing is logged, like other turn steps.
