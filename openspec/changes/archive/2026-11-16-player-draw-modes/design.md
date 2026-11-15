# Design

## Context

See proposal.md for why. What is there today:

- **The draw dialog.** `src/features/draws/DrawDialog.tsx` already has all the tools a player will get: the filter pills (`FilterBar`, `drawFacets`, `facetChoices`), the keyword, "Destede ne var?" and the set cardback. Two flags turn them on, and both are DM-only today: `hasFilters = mode === 'random' && isDm` and `paid = mode === 'random' && !isDm`.
- **Recording filters.** A draw stores its filters as `filters: DrawFilters | null` in `draws/{id}`. The rules check the shape in `validFilters`, and `paidByPlayer()` requires `data.filters == null`. The session's `joinsSession()` already ties `backSet` to `filters.setCode` for any drawer. The İşlem Logu already prints a draw's filters (`filtersText` in `activity-log/eventText.ts`) for any draw record.
- **`table/main`.** This document is the table's pack lock (`openPackId`). Every draw's rule already reads it through `tableFree()`, and `TableProvider` subscribes every signed-in device to it.
- **The settings screen.** `/settings` is a placeholder with the label "Veri / Yedek".
- **Change records.** `setChanges` shows the established pattern: the target document holds the ID of its newest record, and the record's rule checks that the target points at it.

## Goals / Non-Goals

**Goals:**
- One table-wide mode, stored on the server, that the draw rules can read without an extra document access.
- Reuse the DM's dialog code paths for the player, rather than building a second filter UI.
- Every mode change is recorded and shown in the log.

**Non-Goals:**
- Checking on the server that a drawn card matches its recorded filters, or that it was random. That is not checked for the DM's draws either, and the owner trusts the players: the server enforces only the limits the owner names, and the log shows the rest. The same decision is behind `player-discard-and-spend`.
- A general settings framework. Only this one setting is built. The record shape leaves room for more.

## Decisions

### D1. The mode lives on `table/main`

`table/main` gets two fields:
- `playerDraw: 'off' | 'filtered' | 'pick'`. A missing field reads as `'off'`, and so does a missing document.
- `playerDrawChangeId: string | null`, the newest `tableChanges` record.

Why here:
- The draw rule already does `get(tablePath())`. Rules cache document reads within a request, so reading the mode costs no access call. A draw request is already close to the limit: it touches the holding, the card, the session, the ledger, the user and the table.
- Every device already listens to this document. The banner, the dialog and the Ayarlar screen read the mode from the existing `TableProvider` without a new listener.

*Alternative:* a separate `settings/table` document. Its rule would be cleaner, but each draw would pay for an extra `get()`, and every device would need a second listener. Rejected.

The table rule is split in two:
- **Pack steps** (take and free) may change only `openPackId`. They use `onlyChanges(['openPackId'])` instead of `keys().hasOnly(['openPackId'])`, so the mode fields survive.
  - The first-pack create stays as it is: the document gets only `openPackId`, and the mode reads as off.
  - The pack API in `src/features/packs/api.ts` must change too. Today it writes `transaction.set(tableRef, { openPackId })` at three places: the take, the choice and the cancel. That overwrite would wipe the mode, and the new rule denies it. These writes become `set(..., { merge: true })`.
- **A mode change** by the DM:
  - It may change only `playerDraw` and `playerDrawChangeId`.
  - The new mode must be one of the three.
  - The new change ID must be a `tableChanges` record created in the same request, whose `before` and `after` match the old and new mode.
  - It may also *create* the document when no pack has ever been opened. It then writes `openPackId: null` with the mode fields.
  - It does not require `tableFree()`. A mode change moves no card and no balance, and the owner wants "Kapat" to work at any time.

### D2. `tableChanges/{changeId}` records

Each record holds `{ by, at, setting: 'playerDraw', before, after }`:
- `setting` names the setting, so later settings fit the same collection without a migration.
- The create rule mirrors `setChanges`: `isDm()`, `by == request.auth.uid`, `at == request.time`, both modes valid, `before != after`, and `getAfter(table).playerDrawChangeId == changeId`, with `before` equal to the table's mode before the request.
- Reads are open to everyone signed in. Records are never updated or deleted.
- The client writes the table update and the record in one batch, with a new random ID.

*Alternative:* log the change in the ledger or the draws. Neither fits, because a mode change is not a balance change or a draw. Rejected.

### D3. The draw rule reads the mode

`paidByPlayer()` replaces `data.filters == null` with `playerFiltersAllowed(data.filters)`:
- `filters == null`: always allowed.
- Otherwise the mode is read from `get(tablePath())`. Under `'filtered'`, the draw is allowed when `filters.keyword == null`. Under `'pick'`, any valid filters are allowed. Under `'off'`, filters are denied.

The rule reads the mode *before* the request. A draw sent just as the DM closes the mode is denied when the change landed first. That is the intended race result (see D5).

`validDraw`, `joinsSession` and the session rule stay as they are. They already accept a set back for any random draw that records a set filter.

### D4. The dialog derives its tools from the mode

`DrawDialog` gets the mode from a new hook, `usePlayerDrawMode()`, next to `useIsTableBusy` in `tableContext.ts`. The two DM flags become per-tool flags:

```
filtersOn  = mode === 'random' && (isDm || playerMode !== 'off')
keywordOn  = mode === 'random' && (isDm || playerMode === 'pick')
peekOn     = keywordOn
paid       = mode === 'random' && !isDm        (unchanged)
```

- `FilterBar` takes the keyword field only when `keywordOn`. The rest of the filter, deck, back and peek code is shared as it is.
- When the mode lowers, an effect clears the fields the new mode disallows: everything for `'off'`, and the keyword for `'filtered'`. It also closes the peek. The candidates and the deck count then follow on their own.
- `runDraw` records `activeFilters(filters)` whenever `filtersOn`. Today it does so only when `hasFilters`.
- A `TableChip` names the mode in a player's dialog while it is not `'off'`.

*Alternative:* a separate player filter component with fewer options. It would duplicate the facet logic and the 360 px layout work. Rejected.

### D5. A draw denied by a mode change

`toDrawFailure` gains a `mode-changed` kind:
- After a `permission-denied` on a paid draw that carried filters, the API reads `table/main` from the server, as `explainDenial` already does for the pack lock.
- If the stored mode no longer allows the sent filters, it throws a `DrawError('mode-changed')`.
- The dialog shows "DM oyuncu kart çekişini değiştirdi; filtreler kaldırıldı." By then the live listener has usually cleared the filters already. Nothing was charged, because the ledger entry and the LP were in the denied batch.

### D6. Ayarlar screen, banner and log

**Ayarlar screen:**
- The label in `screens.ts` changes from "Veri / Yedek" to "Ayarlar". The `id`, the path, the icon and the mascot stay the same.
- `SettingsPage` gets a title row and two panes:
  - "Masa ayarları" holds a radio group with the three modes, each with a short Turkish line. The DM gets enabled radios that write at once, with a busy state and an offline message. A player gets the group disabled with the chosen mode marked.
  - "Veri / Yedek" holds a small muted "Yakında" note, not the full placeholder panel.
- The page does not use `Placeholder` any more. The placeholder reduced-motion test moves to Custom Card Draft.

**Banner:**
- `PlayerDrawBanner` in `src/app/layout/`, rendered in `AppShell` right after `OfflineBanner`.
- It is styled as an accent (gold) status line, not a danger line. It shows `role="status"`, the mode's name and its Turkish line.
- For the DM it has a "Kapat" button that writes `'off'` through the same API as the screen.

**Log:**
- A new `tableChanges` query in `logQueries`, newest first and limited to `n`. It is `null` with a user filter, as `setChanges` is.
- A new event kind, with text from `eventText.ts`: "oyuncu kart çekişini “<mode label>” yaptı.".
- Draw events need no change: `filtersText` already prints every recorded filter.

The Turkish mode labels and lines live in one place, `src/features/table/playerDraw.ts`. The screen, the banner, the chip and the log all read them from there.

## Risks / Trade-offs

- **[Risk] Changing the `table/main` rule could break the pack lock.** → Keep the existing pack rules tests green, and add tests for:
  - a pack take and a pack free while the mode is `'pick'`, which must keep the mode
  - a pack step that also changes the mode, which must be denied
  - a mode change that also changes `openPackId`, which must be denied
- **[Risk] The draw rule's access-call budget.** → The mode comes from the same `get(tablePath())` that `tableFree()` already makes, so there is no new access. An emulator test of a player's filtered paid draw covers the full batch: draw, holding, card holder, session, ledger and user.
- **[Trade-off] Under "Kart seçme", a keyword can match several cards.** The draw then picks at random among them, exactly as the DM's does. The player can narrow the keyword until the deck shows 1. Selecting a face in "Destede ne var?" to draw it stays out of scope.
- **[Trade-off] A player can forge a draw of a specific card in any mode.** This is already possible today, because the server does not check that a draw was random. The mode only governs what is *recorded*, and the log shows it. This is accepted under the trust-players decision.

## Migration Plan

- No data migration. A missing `playerDraw` reads as `'off'`, so the current behavior holds until the DM changes it.
- Deploy the rules and the app together, as usual, and reload open tabs. An older tab overwrites `table/main` when it opens or ends a pack. While a mode is set, the new rule denies that overwrite, so the older tab cannot open or end a pack until it reloads. The overwrite never succeeds, so it can never wipe the mode. The older tab never sends player filters.
- The emulator data in `.firebase-emulator-data/` needs no reset.
- Rollback:
  - Before reverting, set the mode to "Kapalı" and remove the two mode fields from `table/main` with the Admin SDK or the emulator UI. The old rule's `keys().hasOnly(['openPackId'])` denies every pack step while they exist.
  - Leftover `tableChanges` records are harmless. The old catch-all rule simply closes them.
