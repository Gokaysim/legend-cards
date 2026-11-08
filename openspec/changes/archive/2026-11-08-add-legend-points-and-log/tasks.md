# Tasks

Before running any command, run `. ~/.nvm/nvm.sh && nvm use` from the repository root. Work directly on `master`, without a feature branch. Never point a script at a real project.

`npm run test:emulator` cannot run while the owner's `npm run dev` is up: the two use the same ports, and the tests clear Firestore. Ask before stopping the owner's dev session.

## 1. Balances data and access rules

- [x] 1.1 Add `lp` (whole number ≥ 0, default `0`) and `lpEntryId` (string or null, default `null`) to `userProfileSchema` in `src/features/users/schema.ts` (D1). Extend `schema.test.ts`:
  - a stored profile without the fields reads as 0 LP and `null`
  - a negative or fractional `lp` is invalid
  
  Verify: `npm run check` passes.
- [x] 1.2 Create `src/features/balances/schema.ts` (D1):
  - the ledger entry schema with its eight fields
  - the party purse schema (`gp`, `gpEntryId`)
  - `BALANCE_LIMITS` (`amount: 1_000_000`, `reason: 200`)
  - converters, the ledger one with `idField: 'id'`
  
  Add `schema.test.ts`: a valid entry; `delta` 0; a negative `balanceAfter`; an unknown currency or source; a reason that is empty or too long. Verify: `npm run check` passes.
- [x] 1.3 Add the rules of D2 to `firestore.rules`:
  - the DM branch of the `users/{uid}` update rule
  - `party/main`
  - `ledger/{entryId}`
  
  Name the limits after `BALANCE_LIMITS`. In `tests/firestore.rules.emulator.test.ts`, add a describe block "balances" that covers every server scenario of the balances spec and the changed user-profiles scenarios:
  - allowed: an LP batch; the first GP batch, which creates `party/main`; a later GP batch; reading as a player
  - denied:
    - signed-out reads
    - a player changing their own LP
    - LP on a DM's profile
    - a balance without an entry, and an entry without a balance
    - a delta that disagrees with the balance
    - a balance below 0
    - an empty or too long reason
    - `by` that is not the writer, and `at` that is not the server time
    - reusing an existing entry, and two entries for one change
    - updating or deleting an entry
    - the DM changing a profile's name, picture or role
  
  Verify: `npm run test:emulator` passes.
- [x] 1.4 Create `src/features/balances/api.ts` and `errors.ts` (D3):
  - refs, and `changeBalance` with its transaction and the retry after a stale denial
  - `BalanceError` (`insufficient` with the current balance, `not-a-player`)
  - the Turkish messages, reusing `firebaseCode` and the offline and permission messages of `hands/errors.ts`
  
  Add `api.emulator.test.ts`:
  - adding LP writes the entry and the pointer
  - the first GP change creates `party/main`
  - subtracting down to exactly 0 works
  - subtracting too much throws `insufficient` with the balance and writes nothing
  - an LP change on the DM throws `not-a-player`
  - the reason is trimmed
  - two concurrent changes to the same LP both land, with entries showing the balances 6 and 7; run it five times in a row
  
  Verify: `npm run test:emulator` passes.
- [x] 1.5 Add `BalancesProvider` with `balancesContext.ts` (`usePartyPurse`, `useBalanceActions`) and mount it in `App.tsx` under `UsersProvider` (D4). In `src/test/`, add:
  - `TestBalancesProvider`, whose fake actions succeed by default
  - `ledgerFixtures.ts`
  - a `balances` option and `setBalances` in `renderApp`
  
  Verify: `npm run check` passes.
- [x] 1.6 Update the docs:
  - `docs/domain.md`:
    - data model rows for the profile's `lp`/`lpEntryId`, `party/main` and `ledger`
    - the refinements of the target model from D1
    - under the deliberate decisions: balances never go below 0, every change needs a reason, and the legacy "LP is only changed by hand" now means the DM's manual changes
  - `docs/conventions.md`: the balances provider and the `balances/` folder in the layout
  
  Verify: `npm run check` passes, including the format check.

## 2. Showing and changing balances

- [x] 2.1 Add `formatAmount` (`src/features/balances/format.ts`) with a unit test: 12500 shows as "12.500", 7 as "7". Then build `BalanceDialog` (D4) with `BalanceDialog.test.tsx`:
  - "+ Ekle" and "− Düş" stay disabled until the amount is a whole number from 1 to 1,000,000 and the reason is not blank
  - the amount field has the focus
  - add and subtract call the action with the right delta, reason and account, and the dialog closes
  - subtracting too much shows the Turkish message with the current balance
  - offline, nothing is called and the connection message shows
  - another failure shows the Turkish error
  
  Verify: `npm run check` passes.
- [x] 2.2 Add `PartyPurse` to `SidebarContent`, between the menu and the "Oyuncular" list (D4). Test:
  - "Grup kesesi" with "12.500 GP"
  - 0 GP before any change
  - the loading and error texts
  - the "± GP" button only for the DM, opening the dialog for the purse
  - a live update through `setBalances`
  
  Update `AppShell.test.tsx` if it checks the sidebar's order. Verify: `npm run check` passes.
- [x] 2.3 Show each player's LP in `PlayerList` (D4). Extend `PlayerList.test.tsx`:
  - "7 LP" on a player's row
  - none on the DM's row
  - the new LP after `setUsers`, without a reload
  
  Verify: `npm run check` passes.
- [x] 2.4 Add the "Legend Point" stat as the first stat of `HandSummary`, with the DM's "± LP" button (D4). Extend `HandsPage.test.tsx`:
  - a player's hand shows the stat with their LP
  - the DM opens the dialog from it, and "+ Ekle" calls the action for that player
  - a player sees no button
  - the DM's own hand shows no LP stat
  
  Verify: `npm run check` passes.

## 3. İşlem Logu

- [x] 3.1 Add `dative()` and `ablative()` to `src/lib/turkish.ts` (D5), with tests in `turkish.test.ts`: "Ayla'ya", "Cem'e", "Türkü'ye", "Gökay'a", "Ayla'dan", "Cem'den", "Umut'tan", "Gökay'dan". Verify: `npm run check` passes.
- [x] 3.2 Create `src/features/activity-log/events.ts` (D5): derive `LogEvent`s from holdings and ledger entries, and merge them. Test it in `events.test.ts`:
  - given (via the DM only), used with and without a character, discarded
  - a transfer from both sides, and from either side alone: one event, keyed by the old holding
  - LP and GP entries
  - newest first, with pending times first and ties in a stable order
  - only the first `n` kept, and whether more may exist
  
  Verify: `npm run check` passes.
- [x] 3.3 Create `api.ts` (the design's queries; only `api.ts` modules import Firestore) with the three queries, with and without a user filter. Add the three composite indexes to `firestore.indexes.json`. Add `api.emulator.test.ts`:
  - each query returns its records newest first, limited to `n`
  - the filtered queries return only that user's records
  - party entries never match a user
  
  Verify: `npm run test:emulator` passes.
- [x] 3.4 Add `activityLogContext.ts` (`useLogRecords`, `useHolding`) and `ActivityLogProvider` built on the queries and `useDocument`, and mount it in `App.tsx` (D5). Add `TestActivityLogProvider` and an `activityLog` option, with `setActivityLog`, to `renderApp`. Verify: `npm run check` passes.
- [x] 3.5 Write `eventText.ts` with the Turkish sentences of D5. Test every kind in `eventText.test.ts`, including:
  - the DM using another player's card
  - LP and GP with digit grouping, the balance before → after, and the reason
  
  Verify: `npm run check` passes.
- [x] 3.6 Replace the placeholder `ActivityLogPage` (D5) with:
  - the day headings, and rows with the time ("şimdi" while pending), the actor with the DM marked, and the sentence
  - the "Herkes"/player filter
  - "Daha fazla"
  - the loading, error and empty states
  
  Add `ActivityLogPage.test.tsx` for every activity-log scenario: both sources in one list, a live update, no event for an active switch, the rows, one transfer, two days, paging, the filter (including a transfer to the filtered player), and the states. Add `/log` to `BUILT_SCREENS` in `routes.test.tsx`. Verify: `npm run check` passes.
- [x] 3.7 Document the log in `docs/conventions.md` (events derived from records, the composite indexes and that the emulator does not check them) and in `docs/domain.md` (İşlem Logu is permanent and covers card movements and balances). Verify: `npm run check` passes.

## 4. Integration check

- [x] 4.1 Run `npm run check` and `npm run test:emulator`. Both must pass.
- [x] 4.2 Check the app in a browser, with `npm run dev` running. The emulator data already has a DM ("Otter Otter") and a player ("Raccoon Panda").
  1. As the DM, add LP to the player with a reason, and add GP to the purse. Try to subtract more than the balance, and check the message. Check that the list, the hand, and the purse update live in a second tab.
  2. As the DM, give, use and transfer a card. Then open İşlem Logu: the events are there with their reasons, the transfer appears once, and the player filter works.
  3. As the player, check that no balance controls are shown and that the log is readable.
  4. Check the purse, the dialog and the log at 360 px, with no horizontal page scroll.
- [x] 4.3 Run `openspec validate add-legend-points-and-log --strict`. It must pass.

## Workflow follow-up

- Archive the change with `/opsx:archive` after review.
- Commit only when the owner asks, on `master`.
