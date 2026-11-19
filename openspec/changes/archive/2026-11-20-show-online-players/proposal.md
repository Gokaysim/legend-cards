# Proposal

## Why

At the table nobody can tell from the app who else has it open, so the DM cannot see at a glance which players are following along. The owner asked for an online mark in the "Oyuncular" list, with online users first and a way to hide the rest.

## What Changes

- Each signed-in device tells the server, every 2 minutes, that its user is there: while the tab is on screen, and in the background for one hour after the user last looked at the tab. Leaving the app ends it at once when the browser lets the last write through.
- A user counts as online while such a sign is at most 5 minutes old. The user's own entry is always online on their own device.
- The "Oyuncular" list marks online users, shows them first (each group still sorted by name), and shows the number of online users next to the heading, for example "Oyuncular (6 · 3 çevrimiçi)".
- A small icon next to the heading hides offline users. The device remembers the choice, like the list's open state. The user whose hand is shown stays in the list even when offline.
- A new Firestore path holds one small presence record per user. Every member reads it. Each user writes only their own record. It is closed like every other path and has emulator rules tests.
- Only the "Oyuncular" list changes order. Every other place that lists users keeps the name order.
- "Savaş başlat" checks at first only the characters of players who are online. The DM can still check the others. The setup marks each owner who is offline. While presence has not loaded, every player's characters are checked as before.

Cost: with about 6 users and a 4-hour session, this is about 720 writes and 4,300 reads per session. That is a small share of Firestore's free daily quota (20,000 writes, 50,000 reads), so the expected bill is zero. No new Firebase service is added.

## Capabilities

### New Capabilities

- `player-presence`: when a signed-in user counts as online, how their device reports it, how long it lasts, and who may read and write the presence records.

### Modified Capabilities

- `user-profiles`: in "Player list", online users come first. New requirements cover the online mark, the online count next to the heading, and the icon that hides offline users.
- `initiative-tracker`: in "Setting up a combat", only online players' characters are checked at first.

## Impact

- New code in `src/features/presence/`: schema, api, a provider that writes this device's presence and subscribes once to every user's record, and a test provider with a `presence` option in `renderApp`.
- `src/features/users/PlayerList.tsx`: online mark, the new order, the online count, and the hide-offline toggle. `src/components/ui/icons.tsx` gets an eye and a crossed-out eye icon. `src/app/App.tsx` mounts the provider.
- `src/features/combat/InitiativeTab.tsx` and `JoinCombatDialog.tsx`: the first checked characters of "Savaş başlat", and the offline mark on an owner.
- `firestore.rules`: a new `presence/{uid}` match block and rules tests in `tests/`.
- Docs: `docs/conventions.md` (layout, data access, renderApp options) and `docs/domain.md` (the list).
- No new dependency, emulator, port or Firebase service. No migration: a user without a record counts as offline.
