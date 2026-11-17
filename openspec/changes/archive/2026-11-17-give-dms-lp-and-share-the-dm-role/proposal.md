# Proposal

## Why

The DM cannot give themselves Legend Points: the balances rules give LP to players only, and the DM's hand pays for nothing. The DM role can only be set with the admin role script, so handing the table to another person, or adding a second DM, needs a developer. The owner wants both done from the app (TODOS Batch 5).

## What Changes

- **LP for every user.** LP stops depending on the role. A DM has an LP balance like a player: it starts at 0 (a missing balance counts as 0), shows on the DM's hand and in the "Oyuncular" list, and any DM changes it by hand with a reason, their own included. A card or True Word used from a DM's hand, a pack opened into it, and a True Word draft for it are priced and paid from that DM's LP, by the same rules as for a player's hand (the DM chooses any amount from 0 to the owner's LP; the pack can still go to the party's GP). A draw that a DM makes stays free, into any hand.
- **More than one DM.** Any number of users may have the role "dm". Every DM has today's DM powers. Everything that says "the DM" keeps working for each DM.
- **Role changes on the Ayarlar screen.** In the "Masaya erişim" list a DM can make a linked player a DM ("DM yap"), take the role from another DM ("DM'liği al"), and step down themselves ("DM'likten çık") while another DM remains. Each change asks for confirmation, needs a connection, updates every device live, and is stored as a permanent role change record.
- **Role changes in the İşlem Logu.** Each role change made in the app is one log event.
- **A DM's address stays on the list.** No DM's address can be removed from the access list, not only the remover's own; a DM row has no "Çıkar".
- The admin role script stays as the recovery path (for example, if no DM is left). Its changes are not logged.

## Capabilities

### New Capabilities

- `dm-roles`: who is a DM, how DMs grant, take and give up the role from the app, the role change records, and the server rules that guard role changes.

### Modified Capabilities

- `balances`: LP for every user, the DM's own LP changed by hand, and LP shown on a DM's hand.
- `user-profiles`: role changes allowed from the app under the `dm-roles` rules; the "Oyuncular" list shows every user's LP and marks every DM.
- `table-access`: DM rows in "Masaya erişim" carry the role controls; no DM's address is removed.
- `card-holdings`: a card in a DM's hand is paid from that DM's LP, like a player's.
- `pack-shop`: LP can be charged to any user's hand, a DM's included.
- `true-words`: a draft for a DM, and a word used from a DM's hand, are paid from that DM's LP.
- `activity-log`: role changes are events and the log reads the role change records.

## Impact

- `firestore.rules`: drop the `role == 'player'` gates on LP (`users` LP branches, ledger `setsLp`); new `users` branch for role changes; new `roleChanges/{id}` collection; the `allowedEmails` delete rule protects every DM. Mind the 1000-expression limit on the `users` update rule.
- Emulator rules tests for the new path and the changed branches (`tests/`).
- App: `src/features/users` (schema `roleChangeId`, role API, list LP), `src/features/access` (row actions, DM marks), `src/features/balances`, `src/features/hands`, `src/features/packs`, `src/features/true-words` (the `role === 'player'` checks), `src/features/activity-log` (new source and event), `src/features/stats/statsNames.ts` (name DMs by name).
- DM-only listeners (drafts in the card query, hidden roll contents, the access list) must stop cleanly when a user loses the role while the app is open.
- `docs/domain.md`: the `users` row, the new `roleChanges` row, and the LP and DM glossary lines.
