# Proposal

## Why

Every remaining feature works with cards: hands, packs, draws, the Cursed Deck, and the log. The app has no card data yet. The owner's cards exist only as CSV files (591 Legend cards and 154 Cursed cards), and the "Kart kütüphanesi" and "Cursed Deck" screens are placeholders.

This change brings the cards into Firestore and lets everyone browse them. It follows the target data model agreed in `add-user-roles` and reuses that change's admin-script setup, as planned there ("the card import is next").

## What Changes

- **Initial data in the repository.** The owner's CSV files are kept in `data/` under clear names:
  - `legend-cards.csv` (normal and Blessed cards)
  - `cursed-cards.csv`
  - `true-words.csv` (kept for the later True Words change and not imported here)

  The picture archives (about 500 MB of `.7z` files) stay outside the repository for the card-images change.
- **Card library data** at `cards/{cardId}`. Each document stores:
  - the kind: `normal`, `blessed` or `cursed`
  - the name, a matching key, the set code, the cost, the rarity, the mechanic pack, and the text
  - a `retired` flag. Cards are retired, never deleted, so later history keeps its links.
- **A card import script**, `npm run import-cards`, built on the existing admin-script setup:
  - It reads the two card CSVs. By default it uses the files in `data/`.
  - It validates every row before writing anything.
  - It adds new cards, updates changed ones, and leaves unchanged cards untouched.
  - It retires cards that are no longer in their file, and brings back retired cards that reappear.
  - It reports counts and warnings in Turkish. `--dry-run` shows the result without writing.
  - It targets the emulators by default, and a real project only with `--project` and confirmation.
- **Kart kütüphanesi screen** replaces its placeholder. It lists the normal and Blessed cards live, and offers:
  - search with comma or semicolon separated terms that must all match, as in the legacy app
  - set and mechanic pack filters
  - a card view and a sortable list view

  Text in `[square brackets]` can be searched but is not shown. Sets show their official names.
- **Cursed Deck screen** replaces its placeholder with the same browser for Cursed cards: search, card view, and list view.
- **Access rules.** Every signed-in user reads the cards. No client may write them, not even the DM. The import script writes with the Admin SDK.
- **Docs:** the data model table in `docs/domain.md`, the Scripts section in `docs/conventions.md`, and `README.md` (how to load the cards).

Decided defaults, recorded in the design:
- The card data is maintained through the import script only. The owner runs it when the DM sends updated CSVs.
- Rows without a set are skipped with a warning, as the legacy app hid them. Today that is one row, "The Cartographer".

Out of scope, each a later change:
- **card-holdings:** who holds which card. This also brings pool status, "Havuzda / Elde", the "Yalnızca havuzdakiler" filter, the pool statistics, and dragging cards onto players.
- **card-images:** pictures, the cardbacks, and the hover preview.
- **In-app card editing:** "+ Kart ekle", "Düzenle", and CSV import from Veri / Yedek.
- **True Words, Elixirs, and Custom Card effects** data.

## Capabilities

### New Capabilities

- `card-library`: the card definitions and how they are seen. Covers:
  - the card kinds and fields
  - who may read and write cards
  - the Kart kütüphanesi and Cursed Deck screens: search, filters, the card and list views, and hidden bracket text

### Modified Capabilities

- `admin-scripts`: adds the card import script, with its validation, its update and retire rules, its report, and dry runs.
- `developer-workflow`: the repository keeps the owner's initial card data, and one command loads it into the local emulators.
- `app-shell`: the "Placeholder screens" scenario uses the Cursed Deck as its example of an unbuilt screen. It moves to a screen that stays unbuilt.

## Impact

- **Code:**
  - a new `src/features/cards/`, shared by both screens:
    - schema, converter, and `api.ts`
    - a `CardsProvider` that shares the active cards app-wide, like `UsersProvider`
    - the set names and their order
    - the search and sort helpers
    - the card browser UI
  - `src/app/App.tsx` mounts `CardsProvider`, and `src/test/` gets a test provider for cards
  - `src/features/library/LibraryPage.tsx` and `src/features/cursed-deck/CursedDeckPage.tsx` get real content
  - `scripts/import-cards.ts`, and `scripts/lib/importCards.ts` for the logic, with Turkish texts added to `scripts/lib/messages.ts`
  - one new theme token for the purple frame of Common cards
- **Rules and tests:**
  - `firestore.rules` gets a `cards/{cardId}` block
  - rules tests and import emulator tests in `tests/`
  - unit tests for parsing, validation, search, and the screens
  - `src/app/routes.test.tsx` no longer expects these two screens to be placeholders
- **Dependencies:** `csv-parse` as a dev dependency, used only by the script.
- **Config:** a `package.json` script entry for `import-cards`.
- **Firebase usage:** every signed-in device subscribes once to the active cards, about 745 document reads per fresh start. Later visits are served from the persistent cache. An unchanged re-import writes nothing.
