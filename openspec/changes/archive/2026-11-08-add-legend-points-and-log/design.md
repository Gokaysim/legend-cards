# Design

## Context

See proposal.md for why. The current state that shapes the approach:

- **Profiles.** `users/{uid}` is live app-wide through `UsersProvider` (`useProfiles`, `useCurrentProfile`).
  - Its rules let a user update only their own `displayName` and `photoURL`. Every other write is denied, even the DM's.
  - The profile is created in `users/api.ts` with explicit fields, and converters pass writes through unchanged. So a new schema field with a zod default is never written at creation.
- **The holdings pattern** (`add-card-holdings`):
  - A movement writes two documents in one client transaction.
  - Each document's rule checks the other side with `get`/`getAfter`, and the card's `holder.userCardId` lets the card's rule find its holding without a query.
  - When two devices race, the loser's commit is denied by the rules (`permission-denied`) instead of being retried by the SDK, because the rules evaluate it against the winner's state.
- **Holdings carry their own history.** Each holding has `givenAt`/`givenBy`/`givenVia` and, once closed, `returnedAt`/`returnedBy`/`returnReason`/`usedOn`/`transferredTo`. A transfer closes the old holding and opens a new one with `transferredFrom` and the same server time.
- **Providers.** App-wide data and actions come from providers (`CardsProvider`, `HoldingsProvider`), each with a test provider in `src/test/`, so unit tests never load Firebase.
- **Placeholders.** İşlem Logu is a placeholder page (`features/activity-log/ActivityLogPage.tsx`).
- **Indexes.** `firestore.indexes.json` is empty. The emulator does not check composite indexes; production does.

## Goals / Non-Goals

**Goals:**
- Balances and their ledger can never disagree, whatever a client writes.
- Two simultaneous changes both land, with a correct ledger.
- The log is computed from the records that already exist, so it needs no writes of its own.
- `ledger` is ready for pack-opening: new sources, and a link to the draw, without changing existing entries.

**Non-Goals:**
- Paying for packs and draws, and the `pack`/`draw` sources.
- Undoing a change. A mistake is corrected with the opposite change and a reason, as with cards.
- A history per card, or a link from the hand to its filtered log.
- Deploying the rules and indexes to a real project. That happens at go-live.

## Decisions

### D1. Where balances and entries live

```
users/{uid}                  (existing)
  lp            int >= 0     missing = 0, so existing profiles need no migration
  lpEntryId     string|null  the ledger entry that set the current lp; missing = null

party/main                   the party purse; a missing document = 0 GP
  gp            int >= 0
  gpEntryId     string       the ledger entry that set the current gp

ledger/{entryId}             auto ID; created once, never changed
  currency      'lp' | 'gp'
  account       uid (lp) | 'party' (gp)
  delta         int, != 0, |delta| <= 1,000,000
  balanceAfter  int >= 0     the balance before is balanceAfter - delta
  source        'manual'     pack-opening adds 'pack' and 'draw', with a drawId
  reason        string, 1-200 characters, trimmed
  by            uid of the DM
  at            server time
```

**Refinements of the target model** (recorded in `docs/domain.md`, as earlier changes did):
- The target model's `reason: manual | pack | draw` becomes `source`.
- `reason` is the DM's text. The interface calls it "Neden", so the field name matches the word users see.
- `lpEntryId` and `gpEntryId` are new. They let a balance's rule find the entry that explains it without a query, as `holder.userCardId` does for cards.
- The account of the party purse is the fixed string `party`.

**Alternative considered:** a separate `balances/{uid}` document instead of `users.lp`. It would leave the profile rule untouched. Rejected because:
- the target model puts `lp` on the profile
- profiles are already live app-wide, so every LP display is live for free
- the profile rule change stays narrow (D2)

**Alternative considered:** storing the balance before the change too. Rejected: it follows from `balanceAfter - delta`, and the rules check that.

### D2. Rules: balance and entry check each other

The same pattern as card holdings (`docs/conventions.md`, "Writes that span documents"). Each side checks the final state of the other with `getAfter()`, and the state before with `get()`/`exists()`.

```
users/{uid}   update: own name and picture (unchanged)
                   OR isDm() && lpSetByEntry(uid)

  lpSetByEntry(uid):
    onlyChanges(['lp', 'lpEntryId'])
    && resource.data.role == 'player'
    && new lp is int && new lp >= 0
    && entry = ledger/(new lpEntryId): !exists before && existsAfter
    && entry.currency == 'lp' && entry.account == uid
    && entry.balanceAfter == new lp
    && entry.delta == new lp - resource.data.get('lp', 0)

party/main    read: signed in
              create, update: isDm() && keys exactly [gp, gpEntryId] && gpSetByEntry()
                (same checks as lpSetByEntry, with account 'party' and a before value of 0 when the document is missing)
              delete: false

ledger/{id}   read: signed in
              create: isDm() && validEntry() && (lp case || gp case)
                validEntry:
                  exactly the eight keys of D1
                  currency, delta, balanceAfter and source as in D1
                  reason a string of 1-200 characters
                  by == auth.uid
                  at == request.time
                lp case: the profile at `account` is a player's
                  getAfter(profile).lpEntryId == this id
                  getAfter(profile).lp == balanceAfter
                  get(profile).lp (missing = 0) + delta == balanceAfter
                gp case: account == 'party'
                  getAfter(party/main).gpEntryId == this id, and so on
              update, delete: false
```

What this rules out:
- **A balance without its entry.** `existsAfter` fails.
- **An entry without its balance.** The pointer or the amount differs after the write.
- **Two entries for one change.** Only one ID can be the pointer.
- **Reusing an old entry.** `!exists` before the write.
- **A wrong delta, a negative balance, or LP on the DM's profile.**

Every request reads at most four documents: the DM's profile, the other side before, and the other side after. That is well inside the rules' document-read limits. `isDm()` comes after the cheap checks.

The profile `create` rule is unchanged. A new profile has no `lp`, which counts as 0.

### D3. One client transaction per change; a stale denial retries

`changeBalance(db, { account, delta, reason, by })` with `account = { currency: 'lp', uid } | { currency: 'gp' }`:

1. In a transaction, read the balance document: the profile, or `party/main`.
   - A missing value counts as 0.
   - An LP account whose role is not `player` throws `BalanceError('not-a-player')`.
2. Compute `after = before + delta`. When it is below 0, throw `BalanceError('insufficient', before)` without writing.
3. Write the new entry with an auto ID and update the balance with its pointer:
   - For LP: `transaction.update`.
   - For GP: `transaction.set(partyRef, { gp, gpEntryId })`. This one write creates the document or replaces both of its fields.

**Race handling.** As with card gives, the loser of a race is denied by the rules rather than retried. On `permission-denied`, `changeBalance` reads the balance from the server:
- If the balance moved since the attempt read it, the denial came from the race, and the transaction runs again. There are at most three attempts.
- If the balance did not move, the denial is real and is rethrown.

A retry that would now go below 0 ends in `insufficient` with the fresh balance.

**Validation before writing.** `BALANCE_LIMITS` (`amount: 1_000_000`, `reason: 200`), mirrored in the rules:
- the amount must be a whole number from 1 to 1,000,000
- the reason is trimmed and must have 1 to 200 characters

**Errors.** `BalanceError` maps to Turkish messages through the same `firebaseCode` helper that hands use:
- "Ayla'nın 3 LP'si var; 5 LP düşülemez."
- "Grup kesesinde 2.500 GP var; 5.000 GP düşülemez."
- "Bu kişinin LP'si yok."
- The offline and permission messages are shared with card movements.

The dialog does not try a change while offline, just as card movements do not.

**Alternative considered:** `increment()` without a transaction. Rejected, because then the rules could not tie `balanceAfter` to the stored value, and the floor at 0 could not be checked against the value at write time.

### D4. Balances in the app

- **`BalancesProvider`** (in `App.tsx`, under `UsersProvider`):
  - one live subscription to `party/main` while signed in
  - module-level `actions` bound to `db`, as in `HoldingsProvider`
  
  Hooks: `usePartyPurse()` and `useBalanceActions()`. `TestBalancesProvider` and a `balances` option for `renderApp` serve unit tests.
- **LP** is read from the profiles that are already live. The profile schema gets `lp: z.number().int().min(0).default(0)` and `lpEntryId: z.string().nullable().default(null)`.
- **Amounts** are shown with Turkish digit grouping: `formatAmount(n)` uses `Intl.NumberFormat('tr-TR')`, so 12500 shows as "12.500".
- **`BalanceDialog`** (on `Dialog`) serves LP and GP alike:
  - The title is "Legend Point: <name>" or "Grup kesesi". The current balance is shown below it.
  - "Miktar": a number field, at least 1, step 1, with `data-autofocus`.
  - "Neden": a text field, at most 200 characters.
  - "+ Ekle" and "− Düş" stay disabled until both fields are valid, and while a change is in progress.
  - On success the dialog closes; the new balance shows live. A failure stays in the dialog as `role="alert"`.
- **`PartyPurse`** sits in `SidebarContent`, between the menu and `PlayerList`:
  - a heading "Grup kesesi" and the amount "12.500 GP"
  - for the DM only (`DmOnly`), a "± GP" button with the label "Grup kesesini değiştir"
  - while loading "…", on error "Kese yüklenemedi."
- **`PlayerList`** shows "7 LP" at the end of each player's row, with tabular figures. The DM's row shows none.
- **`HandSummary`** takes the profile:
  - For a player, the first stat is "Legend Point". For the DM only, it has a "± LP" button labelled "<genitive> LP'sini değiştir".
  - For a DM profile, the stat is left out.

### D5. İşlem Logu: three queries, merged

Events are derived from records, never written:

| Event         | Source                       | Time                   | Who          |
| ------------- | ---------------------------- | ---------------------- | ------------ |
| given         | holding, `givenVia == 'dm'`  | `givenAt`              | `givenBy`    |
| used          | holding closed `used`        | `returnedAt`           | `returnedBy` |
| discarded     | holding closed `discarded`   | `returnedAt`           | `returnedBy` |
| transferred   | either side of a transfer    | `returnedAt` = `givenAt` | `returnedBy` |
| balance       | ledger entry                 | `at`                   | `by`         |

**Queries.** Each query is ordered by its time, descending, and limited to `n`:
1. `userCards` by `givenAt`
2. `userCards` where `returnedAt != null`, by `returnedAt`
3. `ledger` by `at`

The page merges the three results, sorts them by time (pending server times first, ties by a stable key), and shows the first `n`. This is exact, because the `n` newest events overall are always among the `n` newest of each source. "Daha fazla" raises `n` by 50 and resubscribes. It is shown while any source returned `n` documents.

**Wiring.** The page reads its records through `useLogRecords(filter, n)` and `useHolding(id)` from an `ActivityLogContext`. Two providers implement them:
- `ActivityLogProvider`, mounted in `App.tsx`, implements them with the queries above and `useDocument`.
- `TestActivityLogProvider` returns fixed records, so unit tests never load Firebase. This is the same injection as the holding actions.

The hooks are only called by the page, so the subscriptions exist only while the log is open. Opening it reads at most `3n` documents.

**Player filter.** The filter adds `where('uid', '==', X)` to queries 1 and 2, and `where('account', '==', X)` to query 3. Party entries never match a uid. Three composite indexes go into `firestore.indexes.json`:
- `userCards (uid ASC, givenAt DESC)`
- `userCards (uid ASC, returnedAt DESC)`
- `ledger (account ASC, at DESC)`

The options are "Herkes" and every profile, in the "Oyuncular" order. The choice is local state.

**A transfer is one event.** Both sides of a transfer become one `transferred` event, keyed by the old holding's ID:
- the old holding closed as `transferred` (it knows the giver and `transferredTo`)
- the new holding given via `transfer` (it knows the receiver and `transferredFrom`)

When both sides are loaded, they merge. When only one is, for example under a filter for the receiver, the row reads the other side by ID with `useDocument(holdingRef(...))`. Transfers are rare, and the document is cached after the first read.

**Rows.** Events are grouped under a day heading, such as "8 Kasım 2026" from `Intl.DateTimeFormat('tr-TR')`, in the device's time zone. Each row shows:
- the time ("19:42", or "şimdi" while the server time is pending)
- the actor's name, with `RoleTag` for the DM
- one Turkish sentence:
  - "Aboleth's Eyes kartını Ayla'ya verdi."
  - "Aboleth's Eyes kartını Thorin üzerinde kullandı." When the DM used another player's card: "Ayla'nın Aboleth's Eyes kartını kullandı."
  - "Ayla'nın elinden Aboleth's Eyes kartını attı."
  - "Aboleth's Eyes kartını Ayla'dan Bora'ya verdi."
  - "Ayla: +2 LP (5 → 7) · Boss'u yendi" and "Grup kesesi: +5.000 GP (7.500 → 12.500) · Ejderha hazinesi"

Card names are shown as stored on the holding (`cardName`) and carry `lang="en"`. `src/lib/turkish.ts` gets `dative()` ("Ayla'ya", "Cem'e", "Türkü'ye") and `ablative()` ("Ayla'dan", "Cem'den", "Umut'tan"), next to `genitive()`.

**Alternative considered:** a written `log` collection. Rejected in the exploration with the owner: it doubles every write, and the rules would also have to keep it truthful.

### D6. Where the code lives

```
src/features/balances/
  schema.ts          ledger entry and party purse schemas, BALANCE_LIMITS, converters
  api.ts             refs, changeBalance
  errors.ts          BalanceError, Turkish messages
  balancesContext.ts hooks; BalancesProvider.tsx
  format.ts          formatAmount
  BalanceDialog.tsx, PartyPurse.tsx
src/features/activity-log/
  api.ts             the three queries, with and without a filter (api.ts: the only feature module that imports Firestore)
  activityLogContext.ts, ActivityLogProvider.tsx   useLogRecords, useHolding
  events.ts          LogEvent, deriving and merging (pure, unit tested)
  eventText.ts       the Turkish sentences
  ActivityLogPage.tsx, LogEventRow.tsx
src/features/users/schema.ts   lp, lpEntryId
src/lib/turkish.ts             dative, ablative
src/test/                      TestBalancesProvider, TestActivityLogProvider, ledgerFixtures,
                               renderApp `balances` and `activityLog` options
```

## Risks / Trade-offs

- **[A race is denied rather than retried]** → D3 retries only when the balance moved since it was read. An emulator test races two changes and checks both entries.
- **[The emulator does not check composite indexes]** → The three indexes are written to `firestore.indexes.json` with this change and deployed with the rules at go-live. A missing index shows the log's Turkish error, and the Firebase error names the index.
- **[The profile rule now has a DM branch]** → It is narrow: only `lp` and `lpEntryId`, only on a player's profile, only with a matching new entry. The rules tests keep the DM's name, picture and role writes denied.
- **[A player with LP who is made the DM]** → The stored LP stays and is hidden. If they become a player again, it shows again. Accepted.
- **[No corrections to entries]** → A mistake is fixed with the opposite change and a reason such as "Düzeltme". This is consistent with "no undo" for cards.
- **["Daha fazla" can add fewer than 50 rows]** → A transfer's two sides count as two documents but show as one row. Accepted.
- **[Day headings use the device's time zone]** → The group plays in one time zone.
- **[The log reads up to 3n documents when opened]** → `n` starts at 50, and the subscriptions stop when the page closes.

## Migration Plan

- **No data migration.** A missing `lp` is 0, a missing `lpEntryId` is null, and a missing `party/main` is 0 GP.
- **Emulator data.** The existing test profiles get LP 0 automatically.
- **Go-live:**
  - Deploy the rules and the indexes together (`firebase deploy --only firestore`).
  - The DM enters the starting LP of each player and the starting GP with "+ Ekle" and the reason "Başlangıç".
- **Rollback:** revert the change. `party/main` and `ledger` become unreadable again through the closed catch-all. `lp` stays on the profiles, unused.
