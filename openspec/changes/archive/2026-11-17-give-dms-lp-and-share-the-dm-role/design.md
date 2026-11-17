# Design

## Context

- The role lives in `users/{uid}.role` (`player` or `dm`). The rules read it through `isDm()`, and only `scripts/set-role.ts` (Admin SDK) changes it. Nothing in the rules or the app limits the number of DMs, but the specs and some UI code are written for one.
- LP is tied to the role in three places in `firestore.rules`: `lpSetByEntry()` on `users/{uid}` (`resource.data.role == 'player'`), `setsLp()` in the ledger rules (`get(profile).data.role == 'player'`), and the profile create rule (role `player` only, which stays). The app mirrors this with `role === 'player'` checks in `balances/api.ts` (`not-a-player`), `hands/api.ts`, `HandSummary`, `HoldingDetails`, `PackConfirmDialog`, `DraftConfirmDialog`, `TrueWordDetails` and `PlayerList`.
- The DM's own hand already exists. Its uses, packs and drafts pass through the same rules as a player's, but with no LP the payment is always 0 or GP.
- DM-only listeners (`AccessProvider`, the drafts part of `CardsProvider`, hidden roll contents in `DiceProvider`, and others gated on `useIsDm`) subscribe and unsubscribe as the role in the live profile changes.
- The table settings already keep change records (`tableChanges`, one per mode change, tied to the table write). Role changes follow the same pattern.
- The `users` update rule is near the 1000-expression limit per request (see the `lpSetByEntry` comment).

## Goals / Non-Goals

**Goals:**
- LP independent of the role, with no data migration.
- Role changes from the app that the server fully guards and records.
- No user stays stuck with DM-only listeners or controls after losing the role.

**Non-Goals:**
- A "co-DM" or partial-power role: every DM has every power.
- Recording or logging admin script role changes.
- A server guarantee that a DM always exists (see Risks).
- Showing past events with the role the actor had then. The log marks actors by their current role.

## Decisions

### D1. LP: drop the role gates instead of adding DM branches
Remove `role == 'player'` from `lpSetByEntry()` and `setsLp()`, and the matching app checks. Every existing branch then works for a DM's hand: the DM's manual change (`isDm()` already allows any account), the DM's pack, draft and use payments, which already let the DM pick any amount up to the owner's LP. A missing `lp` already counts as 0, so existing DM profiles need no backfill.
- *Alternative:* separate DM branches. Rejected: more expressions on a rule near the limit, and a second set of tests for the same behavior.
- A DM-made random draw stays free (card-draws, "The DM draws for free"), into any hand, the DM's own included. A DM's own hand gets "± LP" (the DM dialog), not "− LP".

### D2. Role change records in a new `roleChanges/{changeId}` collection
Fields: `by`, `at`, `target` (uid), `before`, `after`, and `otherDm` (uid) only when `target == by`. A profile role change writes `role` and `roleChangeId` together, in one batch with the record, as `table/main` does with `playerDrawChangeId`.
- *Alternative:* reuse `tableChanges` with `setting: 'role'`. Rejected: its rule is built around `table/main` and the mode values, and the role record needs a target and `otherDm`. A separate path keeps both rules short and testable.
- Rules for `roleChanges` create: `isMember() && isDm()`, exact keys, `by == request.auth.uid`, `at == request.time`, the target profile exists, `before` equals its current role, `after` is the other role, and `getAfter(userPath(target))` has `role == after` and `roleChangeId == changeId`. When `target == by`: `after == 'player'`, and `otherDm` is a different uid whose profile has `role == 'dm'`. Otherwise `otherDm` is absent. Read: `isMember()`. Update and delete: never.
- Rules for the `users` update: a new branch `onlyChanges(['role', 'roleChangeId']) && setsRole()`, where `setsRole()` checks `isDm()`, `role in ['player', 'dm']`, that the role changes, and that `createdNow(roleChangePath(id))` names this uid, the before and the after. Put the cheap `onlyChanges` test first so the other branches skip it.

### D3. Stepping down names another DM
Firestore rules cannot count DMs. The self step-down record names `otherDm`, and the rule checks that this user is a DM now. The app fills it with any other DM from the live profiles and hides "DM'likten çık" when there is none.
- *Alternative:* forbid self step-down (another DM must take the role). Rejected: the owner asked for stepping down, and the check is cheap.

### D4. Controls live on the "Masaya erişim" rows
Each linked row gets one role control: "DM yap" for a player, "DM'liği al" for another DM, "DM'likten çık" on the user's own row while another DM exists. A confirm dialog follows the "Çıkar" dialog's pattern. Unlinked rows have no profile and so no role control. Every DM row is marked "DM", and the own row keeps "sen".
- *Alternative:* a separate "DM'ler" section. Rejected: the rows already show every person with their picture and live state, and a second list would repeat them.

### D5. Protect every DM's address
The `allowedEmails` delete rule becomes: `isDm() && email != myEmail()` and the entry is unlinked, or the linked profile's role is not `dm`. In the app, DM rows have no "Çıkar". This keeps one DM from locking out another without first taking their role, which is logged.

### D6. Log and names
- The log gets a new source, `roleChanges`, mapped to one event kind with three sentences (grant, take, step down). The player filter matches the record's `target`.
- Turkish needs an accusative suffix ("Ayla'yı", "Gökay'ı") next to the existing `genitive`, `dative` and `ablative` in `src/lib/turkish.ts`. Add `accusative()` with tests in the same style.
- `useStatsNames` names every DM "DM". With several DMs that hides who did what, so it names everyone by their profile name. The "DM gizli zar attı" line stays: its roll row already shows the roller.

### D7. Losing the role while the app is open
When a DM loses the role, the server revokes DM-only reads at once, and a DM-only listener can get `permission-denied` before the new profile snapshot reaches React. Providers gated on the role must treat that error as "not for this user anymore" and show nothing, not an error state. Verify this for each DM-gated provider (access list, cards with drafts, hidden roll contents, combat, player notes, activity log) and fix the ones that show an error.

## Risks / Trade-offs

- [Two DMs remove each other at the same moment, or step down naming each other, and no DM is left] → Rules read the state before the write, so both can pass. Rare at a table of a few people. Recovery is the admin role script (`npm run set-role`), which stays documented.
- [A demoted DM can no longer read the content of their own past hidden rolls] → Accepted. Hidden roll contents belong to the DMs. Note it in `docs/domain.md`.
- [`users` update rule exceeds 1000 expressions] → The new branch is short and placed so other branches stop early; the rules tests already exercise the heaviest branch (use payments) and will fail if the limit is crossed.
- [Old log rows mark actors by today's role] → Accepted (Non-Goal). The role change events themselves show when the role moved.
- [A promoted person is not on the access list] → The UI offers "DM yap" only on rows of the list. The server does not check the list for the target, because it holds emails, not uids. Such a DM cannot use the app anyway.

## Migration Plan

No data migration: missing `lp` counts as 0 and missing `roleChangeId` is allowed. Deploy rules and app together through the normal CI push to `master`. Rollback is reverting the commit: roles changed meanwhile stay valid data, and the `roleChanges` records stay stored but unreadable under the old, deny-by-default rules.
