# Tasks

Before running any command, run `. ~/.nvm/nvm.sh && nvm use` from the repository root. Work directly on `master`, without a feature branch. Never point a script at a real project.

`npm run test:emulator` cannot run while the owner's `npm run dev` is up: the two use the same ports, and the tests clear Firestore. Ask before stopping the owner's dev session.

## 1. The word list and its import

- [x] 1.1 Move the card import's CSV reading (`readRecords`, `normalizeHeader`) from `scripts/lib/cardRows.ts` into `scripts/lib/csv.ts` (D7), and import it back in `cardRows.ts`. Verify: `npm run check` passes with the card import tests unchanged.
- [x] 1.2 Create `scripts/lib/trueWordRows.ts` with `parseTrueWordFile(text)`: columns Name, Cost and Text matched regardless of case, other columns ignored, and values trimmed. Add `trueWordRows.test.ts` covering every scenario of the admin-scripts spec's "True Word file is validated before writing":
  - a missing column
  - an empty name and an empty cost
  - a cost longer than 10 characters
  - duplicate names after normalizing
  - an empty text, imported with a warning
  - "X" and "0" kept as written

  Verify: `npm run check` passes.
- [x] 1.3 Create `scripts/lib/importTrueWords.ts` with `planWordImport`, `readWords`, `applyWordPlan` and `runWordImport` (D7). Words get the ID `tw-<nameKey>` and are written as merges in batches. Add `importTrueWords.test.ts` for added, updated, unchanged, retired and restored, and check that no learned word or draft is touched. Verify: `npm run check` passes.
- [x] 1.4 Create `scripts/import-true-words.ts` (`--file`, `--dry-run`, `--project`, `--yes`, as in the card import) with its Turkish report texts in `scripts/lib/messages.ts`. Add `"import-true-words"` to `package.json`. Add `tests/import-true-words.emulator.test.ts`:
  - the repository file gives 53 words
  - a second run writes nothing
  - a removed row is retired and comes back
  - a dry run writes nothing
  - a file with Name, Cost and Effect (like an Elixir file) is refused with the missing Text column

  Verify: `npm run check` and the new emulator test pass.
- [x] 1.5 Update the docs:
  - `data/README.md`: `true-words.csv` is used by `npm run import-true-words`.
  - `README.md`: the new script, next to `import-cards`.
  - `docs/conventions.md`, Scripts section: the shared `csv.ts` and the True Words import.

  Verify: run `npm run import-true-words -- --dry-run` against the dev emulators as written. It reports 53 words to add.

## 2. Record schemas

- [x] 2.1 Create `src/features/true-words/schema.ts` with the four record schemas and their converters (D1): `TrueWord`, `LearnedWord` (`userTrueWords`), `PlayerWords`, and `WordDraft`, plus `WORD_DRAFT_SIZE = 3` and `draftPrice(knownCount) = 1 + knownCount`. Write each refinement with a valid and an invalid test in `schema.test.ts`:
  - `learnedVia: 'draft'` has a `draftId`, and `'dm'` has none
  - `removedAt` and `removedBy` are both set or both null
  - `offered` has 3 distinct IDs
  - a free draft has `cost` 0 and no `entryId`, and a paid one has `cost` ≥ 1 and an `entryId`
  - an open draft has no `closedAt`, `learned` or `refundEntryId`
  - a `learned` draft has `learned`; the other statuses have none
  - only a cancelled paid draft has a `refundEntryId`
  - a missing `playerWords` reads as knowing nothing, with no open draft

  Verify: `npm run check` passes.
- [x] 2.2 In `src/features/balances/schema.ts`, add `'wordDraft'` to `LEDGER_SOURCES`: LP only, no reason, and a `drawId`. In `balances/api.ts`, make `newLedgerEntry` keep `drawId` for it. Extend `schema.test.ts`:
  - valid: a payment and a refund
  - invalid: a GP entry, an entry with a reason, and an entry without a `drawId`

  Verify: `npm run check` passes.

## 3. Access rules

- [x] 3.1 In `firestore.rules`, add the blocks of D2 with a comment each:
  - `trueWords`: read only
  - `userTrueWords`: learned from a draft, taught, taken back, or switched active
  - `playerWords`: consistency only, through the `known` map diff, `openDraftId` and `recordId`
  - `wordDrafts`: start, learn, skip and cancel
  - the ledger's `forWordDraft()`, with `tableFree()`
  - the users rule's `lpSetByEntry('wordDraft')` for the player themselves or the DM

  Every step except the active switch requires `tableFree()`. Verify: the emulator starts with the rules.
- [x] 3.2 Add a describe block "true words" to `tests/firestore.rules.emulator.test.ts`. It covers every server scenario of the true-words spec, the changed balances scenarios, and the new pack-shop scenarios:
  - **Allowed:**
    - a player's draft at exactly the price
    - the DM's draft: kept price, any amount, or free
    - learn by the owner or the DM
    - skip
    - the DM's cancel, with a refund or without (free)
    - teach
    - take back
    - re-teaching after a take-back
    - the active switch, including during a pack
  - **Denied:**
    - a wrong price
    - a draft for someone else
    - a second open draft
    - an offered word the player knows
    - learning a word not offered, known, or retired
    - another player acting on the draft
    - a player cancelling
    - a player teaching or taking back
    - a player switching active
    - changing an ended draft or a closed record
    - deleting any of the four
    - `playerWords` written alone or disagreeing
    - every draft step, teach and take back while a pack is open
    - writing `trueWords` from the app
  - **Lookup budget:** the DM's paid start, the DM's cancel with refund, and the DM learning for the player, each at its heaviest.

  Verify: `npm run test:emulator` passes.
- [x] 3.3 Update `docs/domain.md`, Data model:
  - rows for `trueWords`, `userTrueWords`, `playerWords` and `wordDrafts`
  - the `wordDraft` source and the meaning of `drawId` in the ledger row
  - the player's own draft payment in the `users` row
  - "True Words refine the target model" notes

  Verify: the table matches D1.

## 4. Transactions and the provider

- [x] 4.1 Create `src/features/true-words/errors.ts`: `WordError`, `toWordFailure` and `wordFailureMessage`, with Turkish messages for every failure (D3). Include `table-busy` through `explainDenial`. Add `errors.test.ts`. Verify: `npm run check` passes.
- [x] 4.2 Create `src/features/true-words/api.ts` with `startDraft` (D3): pick outside, and inside the transaction re-read the table, `playerWords` and the LP, recompute the price, and re-pick on a known word, at most 5 tries. Add `api.emulator.test.ts`:
  - a player pays 1 + known count
  - the DM keeps the price, changes the amount, or starts for free
  - an amount above the player's LP is refused
  - too few words
  - an open draft
  - not enough LP
  - a pack open
  - a picked word taught meanwhile leads to a re-pick

  Verify: `npm run test:emulator` passes.
- [x] 4.3 Add `learnWord` and `skipDraft`. Add emulator tests:
  - learning adds an inactive word and ends the draft
  - the DM learns for the player
  - a word known meanwhile is refused with `word-known`
  - a draft already ended by another device is reported by re-reading it
  - skipping keeps the payment

  Verify: `npm run test:emulator` passes.
- [x] 4.4 Add `cancelDraft`. Add emulator tests: a paid cancel refunds `cost` with a `wordDraft` ledger entry, and a free cancel writes no entry. Verify: `npm run test:emulator` passes.
- [x] 4.5 Add `teachWord`, `takeBackWord` and `setWordActive`. Add emulator tests:
  - teaching is free
  - a known word is refused
  - a take-back closes the record and frees the word
  - re-teaching creates a new record
  - the active switch works while a pack is open

  Verify: `npm run test:emulator` passes.
- [x] 4.6 Create `trueWordsContext.ts` and `TrueWordsProvider.tsx` (D4), and mount the provider in `src/app/App.tsx`. The hooks:
  - `useTrueWords()`: every word by ID, and the active words sorted
  - `useKnownWords(uid)`: in learn order
  - `useOpenDraft(uid)`
  - `useTrueWordActions()`

  Add `TestTrueWordsProvider`, `src/test/trueWordFixtures.ts` and a `trueWords` option for `renderApp`. Add hook tests. Verify: `npm run check` passes.
- [x] 4.7 Update the docs:
  - `docs/domain.md`: the True Words rules (the price, one open draft, skip and cancel, teach and take back, the active switch by the DM, the cost as written), plus a deliberate decisions entry for each of these:
    - the paid draft, which departs from legacy
    - the DM's take-back, which departs from the rules page's "cannot be forgotten"
    - drafts not holding the table, while a pack holds the draft
  - `docs/conventions.md`: the feature folder, the provider and the `renderApp` option.

  Verify: the entries match the proposal's decisions.

## 5. True Words screen

- [x] 5.1 Create `TrueWordTile.tsx` and replace the placeholder with `TrueWordsPage.tsx` (D5):
  - the active words, sorted, each with "`<cost>` LP" and its visible text
  - "Biliyor" on the words the chosen player knows
  - the DM's "Kimin için" select, kept as `?for=`

  Add `TrueWordsPage.test.tsx` for the spec's screen scenarios, including "X LP". Verify: `npm run check` passes.
- [x] 5.2 Add the draft start (D5): the player's confirmation with the price, and the DM's dialog with the amount prefilled, "0 = ücretsiz", and a check against the player's LP. The disabled reasons each have their Turkish note:
  - fewer than 3 learnable words
  - not enough LP
  - an open draft, which links to it instead
  - a pack open
  - offline

  Extend the tests. Verify: `npm run check` passes.
- [x] 5.3 Create `OpenDraftPanel.tsx` and show it on the screen (D5):
  - 3 tiles with "Öğren" for the player and the DM, and "Zaten biliyor" disabled on a word known meanwhile
  - "✕ Pas Geç", with a confirmation naming the payment that will not come back
  - the DM's "İptal et ve iade et", with a confirmation
  - read-only for everyone else
  - learn, skip and cancel disabled while a pack is open

  Add `OpenDraftPanel.test.tsx`. Verify: `npm run check` passes.

## 6. Hand screen

- [x] 6.1 Add the "♠ Kartlar" / "✦ True Words" tabs to `HandsPage` (D5), kept as `?tab=true-words`. The cards tab is the default and is unchanged. Extend `HandsPage.test.tsx`. Verify: `npm run check` passes and the existing hand tests are unchanged.
- [x] 6.2 Create `HandTrueWords.tsx`, `TrueWordDialog.tsx` and `TeachWordDialog.tsx` (D5):
  - **The tab:** the open draft panel, the words in learn order, "Henüz True Word öğrenilmedi.", the "✦ True Word Draft" link to `/true-words?for=<uid>`, and the DM's "+ True Word öğret"
  - **The details:** the DM's active switch and "Geri al", with a confirmation; read-only for others
  - **The teach dialog:** a search over name and text that offers only the active words the player does not know

  Add tests for the spec's tab, teach and take-back scenarios. Verify: `npm run check` passes.
- [x] 6.3 Extend `HandSummary` (card-holdings delta):
  - the "✦ True Words" stat
  - "Aktif efekt" counting the active words
  - the active words listed after the active cards, marked ✦

  Extend its tests with the delta's "True Words in the summary" scenario. Verify: `npm run check` passes.
- [x] 6.4 Check in the running app at 360 px wide and on a wide screen:
  - the True Words screen, the start dialog, the open draft panel, the hand tabs, the True Words tab, the details dialog and the teach dialog
  - no horizontal scrolling, and every control reachable

  Verify: `scrollWidth` equals `clientWidth` on each, and screenshots are saved.

## 7. İşlem Logu

- [x] 7.1 Add the `drafts`, `taught` and `takenBack` queries to `logQueries` (D6), with the user filter, and combine them in `ActivityLogProvider`. Add the four indexes to `firestore.indexes.json`. Extend `api.emulator.test.ts`:
  - a draft's learned word, payment and refund do not appear in the queries
  - a word taught and then taken back appears once in each of `taught` and `takenBack`
  - the filter keeps only the chosen player's records

  Verify: `npm run test:emulator` passes.
- [x] 7.2 Add the `wordDraft`, `wordTaught` and `wordTakenBack` events to `events.ts`, `eventText.ts` and `LogEventRow.tsx` (D6). The draft row names who started it, for whom, the payment or "ücretsiz", the 3 words ("Sunulan:"), and the outcome: learned, "pas geçti", cancelled with refund, or open. Extend `events.test.ts`, `eventText.test.ts` and `ActivityLogPage.test.tsx` with the activity-log delta's scenarios. Verify: `npm run check` passes.
- [x] 7.3 Update the docs:
  - `docs/domain.md`: the İşlem Logu deliberate decision lists True Word drafts, teaching and taking back, and says that the active switch is not an event.
  - `docs/conventions.md`: the log's seven queries.

  Verify: the text matches D6.

## 8. Integration

- [x] 8.1 Run the whole suite. Verify: `npm run check` and `npm run test:emulator` both pass.
- [x] 8.2 Import the words into the dev emulators with `npm run import-true-words`. Then, in the running app, with the DM in one browser and a player in another:
  - The player starts a draft and pays 1 + known count. The DM sees the open draft live on the player's True Words tab.
  - The player learns a word. It appears on both devices, and the summary counts it.
  - The DM starts a free draft for the player, then cancels a paid one. The LP comes back.
  - The player skips a draft. The LP stays spent.
  - The DM teaches a word, switches it active (it shows in "Aktif efekt" with ✦), and takes it back.
  - With a pack open, the draft's learn and skip are disabled with the note, and the active switch still works.
  - The İşlem Logu shows each draft as one event, plus the teach and take-back events.

  Verify: each step behaves as described, and screenshots are saved.

## Workflow follow-up

- After the owner's review, archive the change with `/opsx:archive`, which syncs the specs.
- Commit only when the owner asks.
