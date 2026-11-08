# Proposal

## Why

Players earn Legend Points (LP) at the table and spend them on packs, but the app does not track LP yet. The İşlem Logu screen is still a placeholder, even though the app already keeps every card movement permanently.

Packs and draws, the next changes, take their price from LP or from the party's GP. So balances and their history come first.

This change builds the LP, party GP and ledger parts of the target data model agreed in `add-user-roles`.

## What Changes

- **Legend Points.**
  - Every player has an LP balance: a whole number, never below 0, starting at 0.
  - The DM has no LP.
  - LP is shown next to each player's name in the "Oyuncular" list, and as the first stat above the player's hand.
- **The party purse.**
  - The group shares one GP balance: a whole number, never below 0, starting at 0.
  - It is shown in the navigation area, above the "Oyuncular" list, on every screen.
- **Who may change balances.**
  - Only the DM changes LP and GP, by adding or subtracting a positive whole amount.
  - Every change needs a reason, written by the DM.
  - Subtracting more than the balance is refused.
  - Players cannot change any balance, not even their own.
  - The DM's controls are a small dialog with the amount, the reason, "+ Ekle" and "− Düş":
    - for LP, opened from the player's hand
    - for GP, opened from the purse in the navigation area
- **A permanent ledger.**
  - Every change is recorded with:
    - the currency and the account (a player or the party)
    - the change and the balance after it
    - the reason, who made the change, and when
  - Entries are never changed or deleted.
  - The access rules keep each balance and its ledger entry in agreement, so neither can be written without the other.
  - Changes from two devices at once both count.
- **İşlem Logu replaces its placeholder.**
  - It is one list, newest first, live, read from the permanent records rather than written separately. It shows:
    - cards given, used (with the character), discarded and transferred, from the card holdings
    - LP and GP changes, from the ledger
  - A transfer appears once.
  - Switching a card active, notes and cost overrides are not listed, because they are current state, not recorded events.
  - The list is grouped by day and shows the 50 most recent events, with "Daha fazla" for older ones. It can be filtered to one player.
- **BREAKING (spec):** the DM may now write one part of another user's profile: a player's LP, together with its ledger entry. Every other profile write by the DM stays denied.
- **Deliberate change from the legacy app:** the legacy app let LP go below 0 and kept its log for one session only. Here balances never go below 0, every LP and GP change needs a reason, and the log is permanent.

Decided in the exploration with the owner:
- The log is derived from the records, not written separately.
- GP is part of this change.
- The purse sits above the "Oyuncular" list.
- A reason is required for LP and for GP changes.
- No balance goes below 0.
- The DM's row shows no LP.

Out of scope, each a later change:
- **pack-opening:** paying for packs and random draws with LP or GP. Those ledger entries will have their own source and a link to the draw.
- **Log entries for True Words, Custom Cards and Elixir Withdrawal**, which arrive with those features.
- **Player notes.**

## Capabilities

### New Capabilities

- `balances`: the players' LP and the party's GP. Covers:
  - who may change them, the required reason, and the floor at 0
  - the permanent ledger of every change
  - where balances are shown and changed
- `activity-log`: the İşlem Logu screen. Covers:
  - which events it lists and how each reads
  - day grouping, paging and the player filter

### Modified Capabilities

- `user-profiles`: the DM may now change a player's LP in their profile, and the "Oyuncular" list shows each player's LP.

## Impact

- **Firestore:**
  - New fields `lp` and `lpEntryId` on `users/{uid}`.
  - New documents `party/main` and `ledger/{entryId}`.
  - New rules and rules tests, including the profile update rule.
  - Composite indexes for the filtered log queries in `firestore.indexes.json`.
- **Code:**
  - New `src/features/balances/`.
  - `src/features/activity-log/` replaces its placeholder.
  - Changed: `users/schema.ts` (the new fields default to `0` and `null`, so no migration), `PlayerList`, `SidebarContent`, `HandSummary` and `App.tsx` (two new providers: balances and the log's records).
- **Tests:** the routes and shell tests that treat İşlem Logu as a placeholder.
- **Docs:** `docs/domain.md` gets the data model rows, the refinements of the target model, and the deliberate changes from legacy. `docs/conventions.md` gets the balances provider and the log queries.
