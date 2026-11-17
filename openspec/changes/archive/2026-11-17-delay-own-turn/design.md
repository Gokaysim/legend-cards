# Design

## Context

The combat lives in `combat/main` (design D1 and D5 of the archived `add-initiative-tracker`): `order` holds the combatant IDs, `turn` is the active place in it, `round` counts from 1, and `turnAt` is the server time of the last turn change. A player can change it in one way only: "Turumu bitirdim", which the rule `endsOwnTurn()` allows as exactly one step on (wrapping into the next round) while `order[turn]` is a character combatant of theirs, with only `turn`, `round` and `turnAt` changed. Every other change of the order is the DM's (`changesFight()`).

Turn steps run in a transaction and carry the turn the user saw (`TurnState`: `turn`, `round`). When the stored turn differs, the step is dropped; when the rule denies it because the turn moved meanwhile, `droppedWhenMoved` swallows the denial.

"Sıra sende" (`CombatNotice`) keys on `combatId:round:turn:activeId` and on a fresh `turnAt`, so any write that changes the active combatant and sets `turnAt` notifies its owner.

## Goals / Non-Goals

**Goals:**
- One player write that delays their own active combatant by one place, checked fully by the server.
- No double step when a delay races a second press, "Turumu bitirdim" or the DM's "Sıradaki".

**Non-Goals:**
- A "Beklet" for the DM. The DM already drags combatants and presses "Sıradaki"; the DM's controls stay as they are.
- A held action that interrupts later, or delaying by more than one place. A player who wants to wait longer delays again on their next turn, or asks the DM to drag.
- A log entry. Turn steps are not logged today, and the order is visible to everyone.
- A new field or data path.

## Decisions

### D1. A delay swaps the active combatant with the next one

With `t = turn` and `n = order.length`:
- `t < n − 1`: `order[t]` and `order[t + 1]` change places. `turn` stays `t`, which now holds the next combatant, and `round` stays.
- `t = n − 1` (last): the delaying combatant moves from the end to place 1, after `order[0]`. `turn` becomes `0` and `round` goes up by one, exactly as "Turumu bitirdim" would wrap.
- `n < 2`: no delay.

`turnAt` is set to the server time, as with every turn change, so "Sıra sende" fires for the next combatant's owner.

A pure `delayTurn(order, state)` in `order.ts` returns `{ order, turn, round }`, beside `nextTurn` and `turnAfterRemoval`.

*Alternative:* a "delayed" flag that keeps the combatant out of the order until its owner jumps back in (D&D 3.5's full delay). Rejected: the owner asked for the fixed "one below the next" rule, and a free re-entry would need a second player write into the order and a new field.

### D2. A separate rule branch, `delaysOwnTurn()`

`combat/main`'s update gets a third player branch beside `endsOwnTurn()`:

- `before.phase == 'running'`, `onlyChanges(['order', 'turn', 'round', 'turnAt'])`, `next.turnAt == request.time`
- `before.order.size() >= 2` and `before.turn < before.order.size()`
- `get(combatantPath(before.order[before.turn]))` is a character combatant whose `uid` is the signed-in user (the same two reads as `endsOwnTurn()`; Firestore caches the repeated `get`)
- either the swap: `before.turn < size − 1`, `next.turn == before.turn`, `next.round == before.round`, and `next.order == before.order[0:t].concat([before.order[t + 1], before.order[t]]).concat(before.order[t + 2:size])`
- or the wrap: `before.turn == size − 1`, `next.turn == 0`, `next.round == before.round + 1`, and `next.order == [before.order[0], before.order[t]].concat(before.order[1:t])`

Comparing the whole list rules out any other reorder, so the player cannot move anyone else. The branch adds a few dozen expressions, far below the 1000-expression limit.

*Alternative:* widen `endsOwnTurn()`. Rejected: one function per player step keeps each rule readable and its tests aimed.

### D3. A turn step also carries the active combatant it saw

A delay in the middle of the order leaves `turn` and `round` unchanged, so `TurnState` alone cannot tell that the turn moved on. Two races follow: a second "Turumu beklet" press when the player owns the next combatant too would delay again, and the DM's "Sıradaki" pressed at the same moment would skip the combatant that just became active.

`TurnState` gains `activeId` (the combatant at `order[turn]` as the user saw it). `sameTurn` compares it too, so `stepTurn`, `endMyTurn` and the new `delayMyTurn` all drop a step whose active combatant changed, including after a removal of the active combatant, which has the same blind spot today. The pure turn helpers (`nextTurn`, `previousTurn`, `canStepBack`) keep taking `{ turn, round }`; only the API's `seen` and `sameTurn` grow.

*Alternative:* compare `turnAt`. Rejected: it is `null` in the pending local write and a server timestamp after, which makes equality on the client awkward; the active ID is already at hand on every device.

### D4. `delayMyTurn` mirrors `endMyTurn`

`delayMyTurn(db, uid, seen)` runs in `droppedWhenMoved`: a transaction that reads `combat/main`, returns when the phase is not `running`, the turn is not the one seen, `order.length < 2`, or the active combatant is not the user's character, and otherwise writes `delayTurn`'s result with `turnAt: serverTimestamp()`. The context gets `delayMyTurn: (seen) => Promise<void>`.

### D5. The button

For the active character's owner, the turn row shows "Turumu beklet" (a plain button) before "Turumu bitirdim" (the primary one), like "‹ Geri" before "Sıradaki ›" for the DM. It is disabled offline (the existing connection note explains it), while a step runs, and when the order has fewer than two combatants. No optimistic update: like "Turumu bitirdim", the listener shows the new order.

## Risks / Trade-offs

- [Firestore rules list slicing with computed bounds (`before.order[t + 2:size]`) behaves differently than expected at the ends] → Rules tests cover a delay from the first place, from the second-to-last place, and from the last place.
- [Adding `activeId` to `TurnState` touches the DM's existing steps] → The existing emulator tests for `stepTurn` and `endMyTurn` races keep running, and a new test covers a delay racing the DM's "Sıradaki".
- [A player delays by mistake] → The DM drags the combatant back, as for any other order fix.

## Migration Plan

No data migration: the change adds a rule branch and a client action over the existing fields. Deploy rules and hosting together through the usual CI push; an old client without the button keeps working.
