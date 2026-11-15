# Tasks

## 1. The mode on `table/main` and its change records

- [x] 1.1 Create `src/features/table/playerDraw.ts` with the three modes (`off`, `filtered`, `pick`), their Turkish labels ("Kapalı", "Filtreli çekiş", "Kart seçme") and one-line Turkish descriptions, and helpers:
  - the allowed tools of a mode (filters, keyword and peek)
  - whether a `DrawFilters` value is allowed under a mode

  Verify with a new `playerDraw.test.ts` that covers every mode against no filters, set or rarity only, and a keyword.
- [x] 1.2 Extend `tableSchema` in `src/features/table/schema.ts` with `playerDraw` (defaulting to `'off'`) and `playerDrawChangeId` (defaulting to `null`). Add a zod schema and converter for `tableChanges/{changeId}` records (`by`, `at`, `setting: 'playerDraw'`, `before`, `after`). Add `usePlayerDrawMode()` to `tableContext.ts`, which returns `'off'` while the table is loading, missing or unreadable (design D1, D2). Verify with `schema.test.ts`:
  - a document with only `openPackId` reads as mode `'off'`
  - a record with an unknown mode is rejected

  Verify with `tableContext.test.tsx`: the hook gives `'off'` for a missing document and the stored mode otherwise.
- [x] 1.3 In `firestore.rules`:
  - Split the `table/main` rule (design D1):
    - The pack take and free use `onlyChanges(['openPackId'])`, and the first-pack create stays as it is.
    - Add a DM-only mode change, by update or by create, that changes only `playerDraw` and `playerDrawChangeId` together with a new `tableChanges` record. It does not require `tableFree()`.
  - Add `match /tableChanges/{changeId}` (design D2): read by everyone signed in, create by the DM only when `explainsTable`, never update or delete.
  - Add `tableChangePath()` next to the other path helpers.
  - Update the comments above both matches.

  Verify with a new `describe('table settings (table/main.playerDraw, tableChanges)')` block in `tests/firestore.rules.emulator.test.ts`:
  - allowed:
    - the DM sets each mode with its record, on an existing table and on a missing one
    - the DM changes the mode while a pack is open
    - every signed-in user reads the table and the records
  - denied:
    - a player's change
    - an unknown mode
    - the mode without a record
    - a record without the mode change
    - a record whose `before` or `after` disagrees
    - a record with `before == after`
    - a record by another `by`
    - a change that also touches `openPackId`
    - an update or delete of a record
    - signed-out reads
- [x] 1.4 In `src/features/packs/api.ts`, write `table/main` with `set(..., { merge: true })` at the take, the choice and the cancel, so the mode survives (design D1). Add rules tests to the packs block:
  - a pack take, choice and cancel while the mode is `'pick'` succeed and keep the mode
  - a pack step that changes `playerDraw` is denied
  - an overwrite that drops the mode fields is denied

  Verify that the existing pack tests and `src/features/packs/api.emulator.test.ts` still pass. Add a case there that opens and chooses a pack while the mode is `'filtered'` and checks the mode afterwards.
- [x] 1.5 Add `setPlayerDrawMode(db, mode, by)` to `src/features/table/api.ts`. It writes the table update and a new `tableChanges` record in one batch, reads the current mode in a transaction, does nothing when it is unchanged, and maps errors to Turkish messages in `errors.ts`, offline included. Verify with `src/features/table/api.emulator.test.ts`:
  - the DM's change writes both documents
  - a second change records the right `before`
  - a player's call fails with `permission-denied`

## 2. A player's filtered draw on the server

- [x] 2.1 In the `draws` create rule, replace `data.filters == null` in `paidByPlayer()` with `playerFiltersAllowed(data.filters)`, which reads `playerDraw` from `get(tablePath())` with `'off'` when the field or the document is missing (design D3). Update the rule's comments. Verify with emulator rules tests in the draws block:
  - allowed:
    - a paid draw with a set and rarity under `'filtered'`
    - one with a keyword under `'pick'`
    - a filtered draw with its set back in the session
  - denied:
    - filters under `'off'` and with no table document
    - a keyword under `'filtered'`
    - filters on a free player draw
    - filters on a Cursed draw in any mode
    - a draw into another hand with filters under `'pick'`

  Add a case to "the heaviest requests" with a player's filtered paid draw of a card with one copy, so it shows the access budget still holds.
- [x] 2.2 In `src/features/draws/api.ts` and `errors.ts`, add the `mode-changed` failure (design D5): after a `permission-denied` on a paid draw with filters, read `table/main` from the server, and throw `DrawError('mode-changed')` when the stored mode no longer allows the filters. The message is "DM oyuncu kart çekişini değiştirdi; filtreler kaldırıldı.". Verify with:
  - `errors.test.ts`: the message
  - `src/features/draws/api.emulator.test.ts`:
    - a player's draw with a set under `'filtered'` records the filters, pays 1 LP and sets the session's `backSet`
    - the same draw after the DM sets `'off'` fails with `mode-changed`, and the LP is unchanged
- [x] 2.3 Update the comments in `src/features/draws/schema.ts`, since filters are no longer "the DM's", and its `superRefine`, which today rejects any paid draw with filters. A paid draw may now carry filters, and a Cursed draw still may not. Verify with `schema.test.ts`: a paid draw with filters parses, and a Cursed draw with filters is rejected.

## 3. The draw dialog follows the mode

- [x] 3.1 In `src/features/draws/DrawDialog.tsx`, derive `filtersOn`, `keywordOn` and `peekOn` from `isDm` and `usePlayerDrawMode()` (design D4):
  - pass the keyword to `FilterBar` only with `keywordOn`
  - record `activeFilters(filters)` whenever `filtersOn`
  - use the set back for any drawer's set filter
  - show a `TableChip` with the mode's label in a player's random dialog while the mode is not `'off'`

  Update the component's doc comment. Verify with `DrawDialog.test.tsx`:
  - a player under `'off'` sees no filters and no peek
  - under `'filtered'`, the four pills and no keyword or peek
  - under `'pick'`, the keyword and "Destede ne var?"
  - a player's draw with a set records the set and pays 1 LP
  - the chip shows "Filtreli çekiş"
  - a player's Cursed dialog has no tools in `'pick'`
  - the DM's dialog is unchanged under `'off'`
- [x] 3.2 Add the live follow-up: when the mode lowers, clear the filters the new mode does not allow and close the peek. Show the `mode-changed` failure. Verify with `DrawDialog.test.tsx`:
  - from `'filtered'` to `'off'`, the filters go away and the deck shows the whole pool
  - from `'pick'` to `'filtered'`, the keyword is cleared, the peek closes, and the rarity stays
  - a denied draw shows the Turkish message
- [x] 3.3 Check the player's dialog with filters at 360 CSS pixels in the dev app (`npm run dev`, an emulator player account, mode `'pick'`). The pills wrap, an open pill fits, and the page has no horizontal scrollbar. Note the result in the change.

## 4. The Ayarlar screen and the banner

- [x] 4.1 In `src/app/screens.ts`, change the `settings` label to "Ayarlar", keeping the `id`, path, icon and mascot. Update `screens.test.ts`, `routes.test.tsx` and `AppShell.test.tsx` where they name "Veri / Yedek". Move the placeholder reduced-motion test case to Custom Card Draft. Verify the label and order tests pass.
- [x] 4.2 Rewrite `src/features/settings/SettingsPage.tsx` (design D6):
  - a title row
  - a "Masa ayarları" pane with "Oyuncu kart çekişi" as a radio group of the three modes with their lines from `playerDraw.ts`
    - for the DM, the radios write through `setPlayerDrawMode`, with a busy state, the offline message and errors
    - for a player, the radios are disabled with the stored mode checked
  - a "Veri / Yedek" pane with a muted "Yakında" note

  Verify with a new `SettingsPage.test.tsx`:
  - a new table shows "Kapalı"
  - the DM's choice calls the API
  - a player sees the stored mode, disabled
  - offline, the DM's choice shows the message and does not call the API
- [x] 4.3 Add `PlayerDrawBanner` in `src/app/layout/` and render it in `AppShell` after `OfflineBanner`:
  - accent styling and `role="status"`
  - the mode's label and line
  - "Kapat" for the DM only, which sets `'off'`
  - nothing under `'off'`

  Verify with a new `PlayerDrawBanner.test.tsx`:
  - nothing under `'off'`
  - a player sees the text without "Kapat"
  - the DM's "Kapat" calls the API with `'off'`
  - the offline message
- [x] 4.4 Check the Ayarlar screen and the banner at 360 CSS pixels in the dev app, as the DM and as a player. Everything wraps, "Kapat" stays in view, and the page has no horizontal scrollbar. Note the result in the change.

## 5. Mode changes in the İşlem Logu

- [x] 5.1 Add the `tableChanges` query to `logQueries` in `src/features/activity-log/api.ts`, `null` with a user filter. Add a `tableChange` event kind to `events.ts`, and its text in `eventText.ts`: "oyuncu kart çekişini “<label>” yaptı.". Render it in `LogEventRow.tsx` (design D6). Verify with:
  - `events.test.ts`: the record becomes one event, ordered with the others
  - `eventText.test.ts`: the text for each mode
  - `ActivityLogPage.test.tsx`: the event shows without a filter and is hidden with a player chosen
  - `src/features/activity-log/api.emulator.test.ts`: a player can read the query
- [x] 5.2 Check in `eventText.test.ts` that a player's paid draw with a keyword and a set shows "−1 LP" and the filters, with the set's official name. No code change is expected: `filtersText` already prints every recorded filter.

## 6. Docs

- [x] 6.1 Update `docs/domain.md`:
  - the `table/main` row: `playerDraw`, `playerDrawChangeId`, and who changes them
  - the `draws` row: a player's paid draw records filters as the mode allows
  - a new `tableChanges/{changeId}` row
  - the screen list: "Ayarlar" instead of "Veri / Yedek"
  - the glossary: "Oyuncu kart çekişi" and its three modes
  - a new entry under "Deliberate decisions": the DM can lend the players the DM's draw tools for a while, with no limit on draws, logged

  Verify by reading the changed passages against the table-settings and card-draws delta specs.

## 7. Integration

- [ ] 7.1 Run `npm run check` and `npm run test:emulator` (after `. ~/.nvm/nvm.sh && nvm use`). Both pass.
- [x] 7.2 In the dev app with two browser profiles (the DM and Oyuncu 1), walk the boss example end to end and confirm each step live on the other screen:
  - the DM sets "Filtreli çekiş" on Ayarlar, and the banner appears for the player
  - the player draws a Kesqer card for 1 LP, and the DM watches the Kesqer back
  - the DM switches to "Kart seçme", and the player draws a named card
  - the DM selects "Kapat" on the banner, and the player's filters vanish
  - the İşlem Logu shows the three mode changes and both filtered draws
- [x] 7.3 Stop every process on the project's ports as `CLAUDE.md` describes: SIGINT to the dev server and the emulators, wait for the export, then confirm with `lsof -nP -iTCP -sTCP:LISTEN`.

## Notes from verification (2026-11-16)

- 3.3, 4.4: checked on a throwaway copy of the dev data (emulators with `--import` and no export), Oyuncu 1 on `http://[::1]:5173` and the DM on `http://localhost:5173`, in a 360 px iframe. Ayarlar, the banner with "Kapat", the watching banner and the player's dialog with the Set and Rarity filters on and the Rarity menu open all fit: `scrollWidth` 356 = `clientWidth` 356, the menu spans 33–323 px inside the 322 px dialog.
- 7.2: walked end to end. "Filtreli çekiş" showed the banner live for the player. A Kesqer draw cost 1 LP (5 → 4), the deck showed 121 and the Kesqer back, and the DM's watching view showed the back and no filter. Switching to "Kart seçme" added the keyword and "Destede ne var?" to the open dialog, with the set kept. The keyword "Ahriman's Diary" narrowed the deck to 1, and that card was drawn for 1 LP. "Kapat" on the DM's banner cleared the open dialog's filters at once (deck 586) and removed the banner and the chip. The İşlem Logu showed the three mode changes and both draws with their filters.
- 7.1: `npm run check` passes (2,456 unit tests). `npm run test:emulator` passes except `tests/import-cards.emulator.test.ts` › "leaves a stored card as it is when the file changes its text", whose `beforeEach` times out at 30 s. It fails the same way on unchanged HEAD (checked in a temporary worktree), so it was there before this change and is not caused by it.

## Workflow follow-up

- Archive the change with `/opsx:archive` after review, and tick the two draw items in `TODOS.md`.
