# Proposal

## Why

The DM cannot add or fix a card or a True Word without a developer. Only the import scripts write definitions, and the application denies every definition write, the DM's included. Every definition is also visible to every player as soon as it is stored. The DM has no private place to prepare new cards or words before the table sees them.

The owner wants the DM to manage the definitions in the app. Each card and each True Word gets a status: draft, active or retired. The DM sees and edits everything. Players see only what is active, plus the retired cards and words that are still in their hands.

## What Changes

- **Statuses.** Every card and True Word has a status: `draft`, `active` or `retired`. It replaces the `retired` flag. The interface calls them "Taslak", "Yayında" and "Kaldırıldı", because "Aktif" already means an active card or word in a hand.
- **Who sees what.** The DM reads every definition. A player reads only active and retired ones, and the server never sends a draft to a player's device. A retired card or word shows only where a hand holds it or a player knows it, as today.
- **Where definitions count.** Only active definitions are in the pool, draws, packs, pack thresholds, "+ Kart ver", True Word drafts and teaching. Drafts join retired definitions in being left out.
- **The DM adds and edits.** The DM gets:
  - "+ Kart ekle" on the Kart kütüphanesi and the Cursed Deck, and "+ True Word ekle" on the True Words screen
  - "✎ Düzenle" on each card and word
  - a status filter on those three screens, which only the DM sees

  The DM can save a draft with empty fields, and can publish it, retire an active definition, bring a retired one back, and delete a draft. A definition can be published only when every field its kind requires is filled in. Its kind can change only while it is a draft. While a pack is open, the table waits for it, so status changes wait too, but fixing a text does not.
- **BREAKING: the imports only add.** `import-cards` and `import-true-words` add the definitions that are not stored yet. They no longer update or retire anything, because the DM's screen is now where definitions change.
  - An added definition is active, unless a field its kind requires is empty: then it is a draft.
  - "—" in a cell means "deliberately none", and an empty cell means "not filled in yet".
  - With the repository's files, the card import adds three drafts:
    - "Hrolf's Hornswaggle" and "The Grand Finale", whose costs are empty
    - "The Cartographer", which is skipped today because it has no set
  - Invalid values still stop an import.
- **Upgrading stored data.** The first import after this change gives every stored definition a status from its old `retired` flag.
- **Definition changes in the İşlem Logu.** Every add, edit, publish, retire, bring back and delete is recorded permanently, with the values before and after. Each import is recorded as one summary.
  - A change that players can see is listed for everyone: a publish, a change to an active or retired definition, a retire, a bring-back, or an import's active additions.
  - Work on drafts is listed for the DM only, and stays that way after the draft is published.

## Capabilities

### New Capabilities
- `definition-editing`: how the DM manages card and True Word definitions in the app. It covers:
  - the add and edit forms
  - the status steps (publish, retire, bring back, delete a draft) and the fields each kind needs before it can be published
  - who may do each step, and how open packs affect them
  - the permanent change records, and which of them players can read

### Modified Capabilities
- `card-library`:
  - Cards have a status. Drafts can be incomplete.
  - Players can no longer read drafts.
  - "Card definitions are read-only for the application" gives way to the DM's edits.
  - The library and the Cursed Deck list active cards, and give the DM a status filter.
- `true-words`:
  - Words have a status, and players can no longer read drafts.
  - Only the import wrote words; now the DM writes them too.
  - The True Words screen gives the DM a status filter and the add and edit controls.
- `admin-scripts`:
  - Both imports only add.
  - Empty required values make a draft instead of an error or a skipped row, and "—" means deliberately none.
  - The rules that update and retire on re-import are removed.
  - The reports count active and draft additions.
  - The imports upgrade stored definitions to a status, and record each run in the definition changes.
- `activity-log`:
  - The list includes definition changes, and players see only the ones they are allowed to read.
  - Definition changes show only when no user is chosen in the filter.
- `card-holdings`: "Retired cards stay in hands" covers a card the DM retires, no longer only one an import retires.

## Impact

- **Rules (`firestore.rules`):**
  - `cards` and `trueWords` get status-based reads, and the DM's definition writes, each checked against its change record.
  - A new `definitionChanges` path.
  - The four `retired == false` checks (a DM's give, a draw, a pack choice, a learned word's record) become `status == 'active'`.
  - Every new rule needs emulator rules tests.
- **Indexes:** the log's new query needs composite indexes in `firestore.indexes.json`.
- **App code:**
  - `src/features/cards/` and `src/features/true-words/` (schema, API, providers: the DM's devices read everything, a player's device reads by status)
  - a new definitions feature for the forms, status steps and change records
  - the Kart kütüphanesi, Cursed Deck and True Words screens
  - `src/features/activity-log/` (a new query, events and Turkish text)
- **Scripts:** `scripts/lib/cardRows.ts`, `importCards.ts`, `trueWordRows.ts`, `importTrueWords.ts`, `messages.ts`, and their tests and emulator tests.
- **Docs:** the data model, glossary and deliberate decisions in `docs/domain.md`, the scripts section of `docs/conventions.md`, `README.md` and `data/README.md`.
- **Dev data:** the owner's emulator data needs one import run after the change, to give the stored cards and words a status.
- **Out of scope:**
  - pictures for cards and words added in the app: `build-art` still finds pictures through the repository's CSV files, and uploading in the app would need Cloud Storage
  - publishing many drafts at once
  - writing the stored definitions back to the CSV files
  - deleting an active or retired definition
  - the server enforcing unique names when a definition is renamed (the form checks it)
