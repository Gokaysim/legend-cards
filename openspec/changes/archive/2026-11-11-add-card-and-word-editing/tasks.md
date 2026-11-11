# Tasks

Before running any command, run `. ~/.nvm/nvm.sh && nvm use` from the repository root. Work directly on `master`, without a feature branch. Never point a script at a real project.

`npm run test:emulator` cannot run while the owner's `npm run dev` is up: the two use the same ports, and the tests clear Firestore. Ask before stopping the owner's dev session, and ask before changing the owner's dev emulator data.

## 1. Statuses in the data model

- [x] 1.1 In `src/features/cards/schema.ts`, replace `retired` with `status: 'draft' | 'active' | 'retired'` and add `changeId` (D1, D2).
  - A normal draft may have `setCode`, `rarity` and `mechanicPack` as `null`. A draft of any kind may have an empty `text`.
  - Add `isComplete(card)` with the kind rules of the definition-editing spec, "Complete definitions".
  - Extend `schema.test.ts`:
    - an incomplete active card is invalid, and an incomplete draft is valid
    - a Blessed card with a set is invalid
    - a card without a cost is complete

  Verify: `npm run check` passes.
- [x] 1.2 In `src/features/true-words/schema.ts`, do the same for words: `status` and `changeId`, a `cost` that may be `null` only in a draft, and `isWordComplete(word)`. Extend `schema.test.ts`. Verify: `npm run check` passes.
- [x] 1.3 Create `src/features/definitions/schema.ts` with the change-record schema and converter (D4, D7):
  - the step record: `target`, `targetId`, `name`, `step`, `before`, `after`, `public`, `by`, `at`
  - the import record: `step: 'imported'`, `items`, `by: null`
  - `stepFor(before, after)` and `isPublicStep(before, after)` following the table in D5

  In `schema.test.ts`, test every allowed row of D5 and the denied pairs (`active` → `draft`, `retired` → `draft`, deleting an active definition). Verify: `npm run check` passes.
- [x] 1.4 Replace every `retired` check in the app code with the status. The places are:
  - `cards/pool.ts`, `cards/cardsContext.ts`
  - `packs/catalog.ts`, `packs/api.ts`, `packs/errors.ts`
  - `draws/api.ts`
  - `true-words/trueWordsContext.ts`, `api.ts`, `errors.ts`, `DraftStart.tsx`, `HandTrueWords.tsx`, `OpenDraftPanel.tsx`, `TrueWordDetails.tsx`
  - `hands/handEntries.ts`

  In their tests:
  - pools, pack thresholds and the Cursed Deck count only active cards
  - drafts and retired definitions are never offered, drawn or taught
  - a retired card still shows in a hand

  Verify: `npm run check` passes.

## 2. Access rules

- [x] 2.1 In `firestore.rules`, change the `cards` and `trueWords` blocks (D3–D6, D8). Add a comment to each new function.
  - **Reads:** `status in ['active', 'retired'] || isDm()`.
  - **Helpers:** `completeCard`, `completeWord`, and a field-by-field comparison of a definition with a snapshot.
  - **The DM's create, update and delete,** each with the change record this request creates, checking:
    - the steps of D5
    - completeness
    - kind changes only between normal and Blessed drafts
    - the ID's deck prefix
    - `tableFree()` for status steps
  - **The holder branch** stays, and is never combined with a definition change.
  - **The four `retired == false` checks** in `userCards` and `userTrueWords` become `status == 'active'`.
- [x] 2.2 Add the `definitionChanges` block (D4):
  - read: `public == true || isDm()`
  - create: only the DM, with `by`, `at`, `before`/`after` equal to `get`/`getAfter` of the target, the step and `public` agreeing with D5
  - no update and no delete
- [x] 2.3 In `tests/firestore.rules.emulator.test.ts`, cover the following and the signed-out cases. Verify: `npm run test:emulator` passes.
  - **Reads:**
    - a player's `where('status', 'in', ['active', 'retired'])` query is allowed (D3 risk; if it is refused, switch to the two-listener fallback and record that in design.md)
    - a player's read of a draft is denied
    - the DM reads everything
  - **The DM's steps**, each with its record:
    - adding a draft
    - adding straight to active, which needs a complete definition and a free table
    - editing an active, a retired and a draft definition
    - publishing, with fields changed in the same step
    - retiring and bringing back
    - deleting a draft
  - **Denials:**
    - an incomplete publish, and emptying a required field of an active card
    - a status step while a pack is open (a text fix then is allowed)
    - `active` → `draft`
    - deleting an active definition
    - a kind change of an active card, a Legend card made Cursed, and a wrong ID prefix
    - a change without its record, a record without its change, and a record whose `before` is stale
    - a wrong `public` flag
    - a holder change together with a text change
    - every write by a player
    - updating or deleting a record
  - **Record reads:** a player reads a public record, and is denied a draft-work record, also after the publish.
  - **Giving, drawing and choosing from a pack:** denied for a draft and for a retired card.
  - **Learning and teaching:** denied for a draft word and for a retired word.
  - **The heaviest step,** a publish with the table check, stays within the lookup budget.
- [x] 2.4 In `docs/domain.md`, update the data model:
  - the `cards` and `trueWords` rows: who reads them by status, and who writes them
  - a new `definitionChanges` row

  Verify: the table matches `firestore.rules`, and `npm run format:check` passes.

## 3. Imports

- [x] 3.1 In `scripts/lib/cardRows.ts`, give each parsed card its `missing` fields, by the columns its kind uses (D7).
  - A Cost of "—" means no cost and is not missing. In the other columns, "—" counts as empty.
  - An empty Set gives a normal card without a set.
  - An empty rarity no longer stops the import.
  - The `skipped-without-set` warning is removed.

  Update `cardRows.test.ts` for each admin-scripts scenario in "Card files are validated before writing", "Legend card rows" and "Cursed card rows". Verify: `npm run check` passes.
- [x] 3.2 In `scripts/lib/trueWordRows.ts`, an empty or "—" cost and an empty text become `missing`, not an error or a warning. Update `trueWordRows.test.ts`. Verify: `npm run check` passes.
- [x] 3.3 In `scripts/lib/importCards.ts`, make the plan only add (D7):
  - **Matching:** a row matches a stored card of its deck by ID or by `nameKey`.
  - **Status:** an added card is active when nothing is missing, and a draft otherwise.
  - **Upgrade:** stored cards without a status get one from `retired`, and `retired` is deleted.
  - **Records:** one public record of the active additions and one DM-only record of the drafts, each listing its items. Each added card gets `changeId`. No record is written when nothing was added, or in a dry run.
  - **Outcomes:** `added-active`, `added-draft`, `existing` and `upgraded`.

  Update `importCards.test.ts`. Verify: `npm run check` passes.
- [x] 3.4 Make the same changes in `scripts/lib/importTrueWords.ts`, and update `importTrueWords.test.ts`. Verify: `npm run check` passes.
- [x] 3.5 Update the Turkish reports in `scripts/lib/messages.ts`, and their use in `scripts/import-cards.ts` and `scripts/import-true-words.ts`. They show counts per deck, and name each draft with its empty fields. In `tests/import-cards.emulator.test.ts` and `tests/import-true-words.emulator.test.ts`, check:
  - the repository files give 591 Legend cards, of them 3 drafts, plus 154 Cursed cards and 53 words
  - the first run's records hold 742 active cards and 3 drafts
  - a second run writes no definition and no record
  - a changed text in the file is not applied
  - a row removed from the file leaves its card as it was
  - a renamed card is not added again
  - documents stored before statuses are upgraded
  - a dry run writes nothing

  Verify: `npm run test:emulator` passes.
- [x] 3.6 Update the docs:
  - `data/README.md`: the files are seed data, the imports only add, and "—" differs from an empty cell
  - `README.md`: what an import does now
  - `docs/conventions.md`, Scripts section: the imports only add, upgrade old documents, and write their records

  Verify: `npm run format:check` passes, and the documented commands match the scripts' options.

## 4. Reading by role

- [x] 4.1 Change `src/features/cards/CardsProvider.tsx` and `cardsContext.ts` (D3):
  - the provider waits for the profile; the DM subscribes to every card, and a player uses the status `in` query
  - `useCards()` and `useDeckCards()` give the active cards
  - `useCardsById()` gives every card the device has
  - a new DM-only `useDeckDefinitions(deck)`

  Update `cardsContext.test.tsx` and the test provider in `src/test/`. Extend `src/features/cards/api.emulator.test.ts` to show that a player's subscription receives no draft and the DM's does. Verify: `npm run check` and `npm run test:emulator` pass.
- [x] 4.2 Make the same change in `TrueWordsProvider.tsx` and `trueWordsContext.ts`, with their tests and an emulator test. Verify: `npm run check` and `npm run test:emulator` pass.

## 5. The definition steps

- [x] 5.1 Create `src/features/definitions/api.ts` with the card transactions `addCard`, `saveCard`, `setCardStatus` and `deleteCard` (D4–D6, D8, D9).
  - **New IDs** come from the deck and `nameKey`, with a `-2`, `-3` suffix when taken.
  - **The name** is checked against every card of the deck.
  - **Errors** are `errors.ts`: `NameTakenError`, `DefinitionChangedError` and `IncompleteDefinitionError`. Table denials go through `explainDenial`, and there is an offline check.

  Cover every step and each error in `api.emulator.test.ts`, including two devices saving the same card. Verify: `npm run test:emulator` passes.
- [x] 5.2 Add the word transactions `addWord`, `saveWord`, `setWordStatus` and `deleteWord`, with the same errors and emulator tests. Verify: `npm run test:emulator` passes.
- [x] 5.3 Create `DefinitionsProvider`, which offers these actions, and a test provider in `src/test/`. Mount the provider with the other app providers. Verify: `npm run check` passes.

## 6. Forms and screens

- [x] 6.1 Create `src/features/definitions/StatusFilter.tsx` ("Yayında", "Taslak", "Kaldırıldı", "Hepsi"; it starts at "Yayında").
  - `CardBrowser` gets an optional `onEdit`.
  - The card view shows "✎ Düzenle" beside the magnifier, and the list view a row button.
  - Outside "Yayında", each face and row shows its status.

  In `CardBrowser.test.tsx`, check:
  - the filter combines with the search, the filters and the count
  - a retired held card reads "Kaldırıldı · Elde: Ayla"
  - a player sees no filter and no edit control

  Verify: `npm run check` passes.
- [x] 6.2 Create `CardFormDialog.tsx` (definition-editing, "Adding a card", "Card form fields", "Editing a definition"):
  - **Choices:** the fields per kind; the official sets in the shop order, "Common"/"Rare" and the eight mechanic packs, each with an empty choice; values outside those lists are kept as written.
  - **Cost and text:** a cost of at most 10 characters, where empty or "—" means no cost; a text of at most 2000 characters that shows its bracket text.
  - **Name:** required and unique, with Turkish messages.
  - **Kind:** chosen only for a draft, between normal and Blessed.
  - **Buttons:**
    - "Kaydet" and "Kaydet ve yayınla" for a new card
    - "Yayınla", "Kaldır" (with a confirmation), "Geri al" and "Sil" (with a confirmation) when editing
  - **Disabled controls say why:** the empty fields, the table waiting for a pack, or no connection.
  - **A changed card** shows the conflict message and reloads.

  Cover each spec scenario in `CardFormDialog.test.tsx`. Verify: `npm run check` passes.
- [x] 6.3 On `LibraryPage.tsx` and `CursedDeckPage.tsx`, give the DM "+ Kart ekle" (normal or Blessed in the library, Cursed on the Cursed Deck), the status filter and the edit dialog. Add page tests for the DM's and a player's controls. Verify: `npm run check` passes.
- [x] 6.4 Create `WordFormDialog.tsx`, and give the DM "+ True Word ekle", the status filter and "✎ Düzenle" on `TrueWordsPage.tsx`. Extend `TrueWordsPage.test.tsx` with the true-words scenarios "The DM's drafts" and "A player's controls". Verify: `npm run check` passes.
- [x] 6.5 Update the docs:
  - **`docs/domain.md`:**
    - the glossary: the definition statuses with their Turkish labels, and how they differ from a True Word Draft and an active card
    - the deliberate decisions: drafts are private (option A), the imports only add, a card's cost is never required, and status steps wait for a pack
    - the "Data and history" notes
  - **`docs/conventions.md`:** the feature layout, with the new `definitions` folder

  Verify: `npm run format:check` passes.

## 7. The log

- [x] 7.1 In `src/features/activity-log/api.ts`, add the `changes` query (D10):
  - for players, `public == true`, newest first
  - for the DM, no filter
  - left out with a user filter

  Add the composite index on `public` and `at` to `firestore.indexes.json`. Extend `api.emulator.test.ts` to show that a player gets only public records. Verify: `npm run test:emulator` passes.
- [x] 7.2 In `events.ts`, `eventText.ts` and `LogEventRow.tsx`, add the `definition` and `import` events, with:
  - each changed field as "eski → yeni"
  - texts compared by their visible part, and "metnin gizli kısmı değişti" for a bracket-only change
  - "🔒 Yalnızca DM" on draft work
  - "Import" as the actor of an import

  Cover the activity-log scenarios in `events.test.ts`, `eventText.test.ts` and `ActivityLogPage.test.tsx`:
  - a player does not see draft work
  - the filter hides definition events
  - the first import is one event of 742 cards

  Verify: `npm run check` passes.
- [x] 7.3 In `docs/domain.md`, add definition changes and imports to the "İşlem Logu is permanent" decision. Verify: `npm run format:check` passes.

## 8. Integration

- [x] 8.1 Run `npm run check` and `npm run test:emulator`. Verify: both pass.
- [x] 8.2 With the owner's permission, upgrade the dev emulators: run `npm run import-cards` and `npm run import-true-words` against the running dev emulators (design, Migration Plan). Verify:
  - the reports count the upgraded cards and words
  - "The Cartographer" is added as a draft
  - the app still shows the hands as before
- [x] 8.3 In Chrome against the dev emulators, as the DM:
  - add a draft card, edit it, and publish it
  - retire a card held by "Oyuncu 1" and bring it back

  As "Oyuncu 1":
  - the draft never shows
  - the publish shows in the İşlem Logu, and the draft work does not
  - the retired card stays in the hand

  At 360 CSS pixels (the iframe check), the forms and the status filter cause no horizontal scrolling. Verify: each step behaves as the specs say.
- [x] 8.4 Stop every process on the project's ports, as `CLAUDE.md` says: the emulators first with SIGINT, waiting for their export, then the rest. Verify: `lsof -nP -iTCP -sTCP:LISTEN` shows none of 5173, 4173, 8080, 9099, 4000, 4400, 4500, 9150 or 5002.

## Workflow follow-up

- Commit only when the owner asks.
- Archive the change with `/opsx:archive` after the owner's review, and sync its specs.
