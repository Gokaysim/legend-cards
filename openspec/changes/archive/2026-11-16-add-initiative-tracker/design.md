# Design

## Context

See proposal.md for why. What is there today:

- **Rolls.** `rollDice` in `src/features/dice/api.ts` throws on the roller's device, then writes `diceRolls/{id}` with `setDoc`, or for a hidden roll the public stub and `dmRolls/{id}` in one batch. It returns at once with the roll for local playback and a `written` promise. A roll record is immutable, and its rule requires `by == request.auth.uid`.
- **The Zarlar page.** `DicePage.tsx` is a two-column grid: the strip, the channel and the form on the left, and an `aside` with "Zar stilin" and "Bu cihazda" on the right (`lg:grid-cols-[minmax(0,1fr)_17rem]`). `DiceNotice` is mounted in `AppShell`, and `UnseenRollsBadge` in the sidebar.
- **Characters.** `characters/{id}` holds exactly `uid, name, picture, archived, createdAt, createdBy`. `validCharacter` in `firestore.rules` checks `hasOnly` and `hasAll`, and the update rule allows `onlyChanges(['name', 'picture', 'archived'])` for the owner or the DM.
- **Single-document state and change records.** `table/main` with `tableChanges/{id}` is the established pattern: the target document points at the record created in the same request, and the record's rule checks it with `getAfter`.
- **Tabs in the URL.** The Kütüphane keeps its tab in `?tab=` with `TabList` and `TabPanel` from `components/ui/`.
- **No drag and drop yet.** No list in the app is reordered by dragging.

## Goals / Non-Goals

**Goals:**
- Every device shows the same order, the same active combatant and the same round, live.
- The server enforces who may change what (spec: initiative-tracker, "Who changes a combat"), and that a player's total is the roll they wrote.
- An initiative roll is an ordinary roll of the dice channel, so it plays in 3D and stays in the channel.

**Non-Goals:**
- Hit points, conditions, durations or any other combat state. This is an initiative and turn tracker only.
- 3.5's own tie rule (the higher modifier wins, then a reroll). The owner chose random ties and a manual fix by the DM.
- Checking on the server that the DM's NPC rolls match their hidden roll. The DM is trusted, as in every other DM step.
- A history of past combats. Only the start and the end reach the log.

## Decisions

### D1. Four new paths

- **`combat/main`**, the one combat:
  - `phase: 'idle' | 'gathering' | 'running'`. A missing document reads as idle.
  - `combatId: string | null`, a new random ID per combat. Combatant records carry it, so a stale request from an earlier combat fails.
  - `order: string[]`, the combatant IDs in initiative order. Empty while gathering; fixed at "Başlat".
  - `turn: number`, the active place in `order`, and `round: number`, from 1.
  - `askedAt` and `turnAt`, server times of the ask and of the last turn change, for the notices (D9).
  - `changeId: string | null`, the newest `combatChanges` record (D7).
- **`combatants/{combatantId}`**, one per combatant of the open combat:
  - `combatId`, `kind: 'character' | 'npc'`, `characterId` (or `null`), `uid` (the character's owner; the DM for an NPC), `name` (an NPC's typed name; `null` for a character, whose name is read live from `characters`), `seq` (the join order), `manual` (added during the fight).
  - `roll: { rollId, die, modifier } | null` for a character: the public roll.
  - `rolled: boolean` for every kind, so a player sees an NPC as rolled or waiting without its numbers.
- **`dmCombatants/{combatantId}`**, DM only: an NPC's `{ combatId, rollId, die, modifier }`.
- **`combatChanges/{changeId}`**, the log's records (D7).

Why one document per combatant instead of a map in `combat/main`: a player may change only their own combatant. Per document, the rule is `resource.data.uid == request.auth.uid` plus a check on `roll`. With a map, the rule would have to find the one changed key of a nested map, which Firestore rules can only do awkwardly (`diff().affectedKeys()` on a nested map, with no `toList()`).

Why a separate DM-only document for NPC numbers: Firestore cannot hide a field of a readable document. The public combatant holds only `rolled`.

The `combatants` and `dmCombatants` collections hold only the open combat's records, because ending a combat deletes them (D7). The provider therefore subscribes to the whole collections, without a query or an index.

*Alternative:* a subcollection `combat/main/combatants`. It reads the same, but every other top-level collection in this project is flat. Rejected for consistency.

### D2. The order is computed on the DM's device, once

`src/features/combat/order.ts` holds a pure `initiativeOrder(entries, shuffle)`:
1. The natural 20s, shuffled.
2. The rest by total, from high to low; each group of equal totals shuffled.
3. The natural 1s, shuffled.
4. While gathering, those who have not rolled last, by `seq`.

At "Başlat", the DM's device runs it with `shuffle` from `lib/random.ts` and writes the result as `order`. Every device then shows `order` as stored, so ties look the same everywhere and after a reload (spec: "Random ties are fixed once").

While gathering, the DM's device runs it without shuffling (ties by `seq`) for the provisional view. A player's device shows the combatants by `seq`, because it does not know the NPC totals.

*Alternative:* store a random tiebreak number on each combatant when it rolls, and sort on every device. A player's device still could not sort the NPCs, and a DM drag would have to rewrite those numbers. Rejected.

### D3. A player's roll goes with its roll record, in one batch

`rollDice` gets an optional last parameter, `alsoWrite: (batch, rollId, values) => void`. With it, the public roll is written through a batch too, and the caller adds its own writes. Without it, nothing changes.

`rollInitiative` in `src/features/combat/api.ts` uses it to write, together:
- the roll record: `1d20 + modifier`, mode `normal`, note `İnisiyatif · <character>`
- the combatant's `roll` and `rolled: true`
- the character's `initiativeModifier`

The combatant's update rule for this step:
- the combat is `gathering`, and the combatant's `combatId` is the combat's
- the signed-in user is the combatant's owner, or the DM
- only `roll` and `rolled` change, and `roll` was `null`
- the roll record is created in this request (`createdNow`) by this user, not hidden, mode `normal`, with one die, a d20, whose result is `roll.die`, and with `roll.modifier` as its fixed number
- `roll.modifier` is a whole number from −10 to +30

Both the player's and the DM's rolls follow this one rule, so the channel names whoever rolled.

Because combat steps need a connection (spec: "Combat steps need a connection"), "At" is disabled offline, and the batch is never queued. When the batch is denied, for example because the DM started the fight a moment earlier, the roll leaves the roller's channel as every refused roll does, and the tab says that the roll was not recorded.

### D4. An NPC group is one hidden roll

The DM's device rolls each NPC group with `rollDice({ hidden: true, counts: { d20: n }, modifier })`, with `n` from 1 to 12. The note names the group, for example `İnisiyatif · Goblin 1–4`. Die `i` belongs to copy `i`. `alsoWrite` adds each copy's `dmCombatants` record and sets `rolled: true` on each public combatant.

The groups of the setup are rolled one after another, right after the batch that opens the combat. A group added while gathering is rolled when it is added.

Trade-off: in the DM's channel, the hidden roll's total is the sum of the group's d20s plus one modifier, which means nothing for initiative. The note and the İnisiyatif tab show the real values. The owner chose the existing hidden roll for NPCs, and the 12-dice limit of a roll matches the count limit of "NPC ekle".

*Alternative:* one hidden roll per NPC. Eight goblins would throw eight times in a row on the DM's tray, and leave eight lines in the channel. Rejected.

### D5. Turns are an index

`turn` is the active place in `order`. "Sıradaki" sets `turn + 1`, or `0` with `round + 1` after the last place. "Geri" does the reverse, and stops at round 1's first place. Each step sets `turnAt` to the server time.

The rule for a player's "Turumu bitirdim":
- the combat is `running`
- only `turn`, `round` and `turnAt` change
- `get(combatants/order[turn])` is a character combatant whose `uid` is the signed-in user
- the step is exactly one place forward, wrapping into the next round

The DM may set any `turn` within `order` and any `round` of 1 or more.

Every change of `combat/main` runs in a transaction, so a DM step and a player's "Turumu bitirdim" at the same moment cannot overwrite each other. The rule compares with the stored document, so the late one is denied before the transaction could retry. A turn step therefore carries the turn the user saw: when it is denied and the turn has moved on since, the step is dropped silently, and a double press steps only once.

**Reordering.** The DM's device writes the new `order` and moves `turn` to the active combatant's new place, in one write.

**Removing.** In one transaction: delete the combatant (and its `dmCombatants` record), remove it from `order`, and fix `turn`: unchanged when a later place is removed, minus one when an earlier place is removed, and for the active place itself the same index (now the next combatant), or `0` with `round + 1` when it was last. Before the fight, removing just deletes the records.

**Adding during the fight.** New combatants with `manual: true`, `roll: null` and `rolled: false`, appended to `order`, in one transaction.

### D6. Opening and starting

- **"Modifier iste"** writes one batch: `combat/main` from idle (or missing) to `gathering` with a new `combatId` and `askedAt`, and one combatant per checked character and NPC copy. The rule allows it only from idle, which makes "One combat at a time" a server rule. A second device's attempt fails.
- **"Başlat"** writes `phase: 'running'`, `order` (D2), `turn: 0`, `round: 1`, `turnAt`, and the start record (D7). Combatants who did not roll keep `rolled: false` and show "atmadı".
- **Limits.** At most 50 combatants: the setup and the add forms count before writing, and the rule checks `order.size() <= 50` on start and on add. The 50 also keeps the end batch (D7) far below Firestore's 500 writes.

### D7. Ending, and the log's records

"Bitir" (or "Vazgeç" while gathering) writes one batch:
- delete every `combatants` and `dmCombatants` record
- set `combat/main` to idle, with `combatId: null`, an empty `order`, and `turn: 0`, `round: 0`
- when the fight had started, the end record

`combatChanges/{changeId}` holds `{ by, at, step: 'start' | 'end', count }`: the number of combatants at the start, or the round at the end. Its create rule mirrors `tableChanges`:
- `isDm()`, `by == request.auth.uid`, `at == request.time`
- `getAfter(combat/main).changeId == changeId`
- for `start`: the combat goes from gathering to running in this request, and `count == getAfter(combat/main).order.size()`
- for `end`: the combat goes from running to idle in this request, and `count == get(combat/main).round`

Records are never updated or deleted.

The İşlem Logu gets a ninth source, `combatChanges` newest first, left out with a user filter, as the table changes are.

### D8. The Zarlar page's layout

The page becomes `lg:grid-cols-[22rem_minmax(0,1fr)]`:
- **Left:** `TabList` with "Kanal" and "İnisiyatif", kept in `?tab=` (`kanal` by default, `inisiyatif`), and one `TabPanel` below it. The İnisiyatif tab's label has a dot while the combat is not idle.
- **Right:** the strip, now taller to fill the width, with "🎲 Zar stili" in its top-right corner; the roll form below.
- **DOM order** is strip, form, tabs, so a phone stacks them that way. On a wide window, the tabs column takes the first grid column with `lg:order-first`.

The dice settings move into a `Dialog` (`DiceSettingsDialog`), holding the current "Zar stilin" grid and "Bu cihazda". Choosing a style saves it and closes the dialog.

**The automatic switch** to İnisiyatif happens once per `combatId`: when the combat is gathering, the user owns a combatant without a roll, and the Zarlar screen is open. The page remembers the `combatId` it switched for, so a user who goes back to Kanal stays there.

### D9. The notices

`CombatNotice` is mounted in `AppShell` beside `DiceNotice`, at the opposite edge: the bottom of a phone and the top right of a wide window, so it never covers a roll's card. It has two messages:
- **"İnisiyatif isteniyor"**, on every screen except Zarlar, while the combat is gathering and the user owns a combatant without a roll. It stays until they roll, the DM starts or ends the combat, or they close it. Selecting it opens `/dice?tab=inisiyatif`.
- **"Sıra sende: <character>"**, on every screen, when the active combatant becomes one of the user's characters in a snapshot after the first, with `turnAt` at most 10 seconds old. This uses the same freshness idea as rolls (`FRESH_WINDOW_MS`), so a reload or a returning connection shows nothing. It closes after 6 seconds, or with "Kapat".

### D10. Dragging with dnd-kit

`@dnd-kit/core`, `@dnd-kit/sortable` and `@dnd-kit/utilities` give sortable lists with pointer, touch and keyboard sensors, and screen reader announcements. They are MIT, and work with GPL-3.0. The DM sees a drag handle on each row once the fight runs. The keyboard sensor covers "by keyboard" in the spec. The announcements are given Turkish text.

*Alternative:* native HTML5 drag and drop. It does not work with touch, and the DM may run the table from a tablet. Rejected.

### D11. The combat feature

A new `src/features/combat/`:
- `schema.ts`: the four records and their converters, and `COMBAT_LIMITS` (combatants 50, NPC count 12, modifier −10 to +30, name 40)
- `order.ts`: `initiativeOrder`, `naturalMark` for a combatant, and the turn steps (`nextTurn`, `previousTurn`, `turnAfterRemoval`, `turnAfterReorder`) as pure functions
- `api.ts`: `openCombat`, `rollInitiative`, `rollNpcGroup`, `clearRoll`, `startFight`, `stepTurn`, `endMyTurn`, `reorder`, `addCombatants`, `removeCombatant`, `endCombat`
- `errors.ts`, `CombatProvider` (`useCombat`, `useDmCombatants` only inside `<DmOnly>`, `useCombatActions`)
- the views: `InitiativeTab`, `CombatSetupDialog`, `NpcForm`, `CombatantRow`, `CombatNotice`

The dice page imports `InitiativeTab` and `combat` imports `rollDice` from the dice api, as other features import each other's public parts. `src/test/` gets `TestCombatProvider`, `combatFixtures.ts` and a `combat` option for `renderApp`.

### D12. The character's modifier

`characters/{id}` gets an optional `initiativeModifier`. In the rules, `validCharacter` lists it in `hasOnly` but not in `hasAll`, and checks `!('initiativeModifier' in data) || (data.initiativeModifier is int && -10 <= it <= 30)`. The update rule's `onlyChanges` gets it too. In `schema.ts`, the field is `z.number().int().min(-10).max(30).optional()`. Existing characters need no migration. The character pages do not show the field.

## Risks / Trade-offs

- [A player's request touches several documents: the combat, the combatant, the roll record and the character.] → Well within the rules' limit of document accesses. The emulator tests cover the full request.
- [NPC places leak a little: a goblin at the top of the order probably rolled high.] → Accepted. The owner asked to hide only the numbers.
- [The DM's channel shows a meaningless sum for a group's hidden roll (D4).] → The note names the group, and the İnisiyatif tab shows each NPC's value.
- [Two DM devices, or the DM and a player, change the combat at once.] → Every change of `combat/main` runs in a transaction, and the rules compare with the stored state.
- [A player's roll is refused after it played, when the DM started the fight a moment earlier.] → The roll leaves the channel, and the tab says why. The DM places that character by hand.
- [Character names are read live, so renaming a character mid-fight renames its row.] → Intended: the row always shows the character as it is now.

## Migration Plan

- No data migration. The new collections start empty, and `initiativeModifier` is optional.
- Deploy the rules and the app together. Older clients never touch the new paths.
- Rollback: the previous rules deny the new paths, and the previous app ignores them; leftover `combatChanges` records are harmless.
