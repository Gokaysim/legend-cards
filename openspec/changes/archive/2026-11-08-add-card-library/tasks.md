# Tasks

Before running any command, run `. ~/.nvm/nvm.sh && nvm use` from the repository root. Never point a script at a real project during this change: every script run and test uses the emulators. Work directly on `master`, without a feature branch.

## 1. Initial data and dependencies

- [x] 1.1 Copy the owner's CSVs from `~/Downloads` into `data/` unchanged, as `legend-cards.csv` (from `cards.csv`), `cursed-cards.csv` (from `cursed.csv`), and `true-words.csv` (from `true words.csv`). Verify: `shasum` of each copy equals its source. (Done while planning, at the owner's request.)
- [x] 1.2 Add `data/README.md`. It covers:
  - what each file holds, its columns, and which change uses it: the card import now, True Words later
  - that "Drawn?" and "Shuffle" are ignored
  - that the picture archives stay outside the repository, for card-images
  - that the files must stay as the owner sent them

  Verify: `npx prettier --check data/README.md` passes.
- [x] 1.3 Add `csv-parse` as a dev dependency. Verify: `npm ls csv-parse` lists it, and `node -e "import('csv-parse/sync').then(m => console.log(typeof m.parse))"` prints `function`.

## 2. Script catalog and row parsing

- [x] 2.1 Add `scripts/lib/cardCatalog.ts` with three parts:
  - `normalize()`, the legacy `norm` (D3)
  - the official sets in shop order, with codes, official names, and aliases, taken from `docs/domain.md` Sets
  - the 8 mechanic packs
  - helpers `isKnownSetCode` and `isKnownMechanicPack`

  Add `scripts/lib/cardCatalog.test.ts` with these cases:
  - "Brünn's Batallion" gives `brunnsbatallion`, "Al-Hızran's Hazard" gives `alhizranshazard`, and "Åge's Acumen" gives `agesacumen`
  - "The End Is Nigh", `endisnigh`, and "Ragnarök" are all known
  - "Kesqeria" is not known

  Verify: `npm run test` passes.
- [x] 2.2 Add `scripts/lib/cardRows.ts`: `parseCardFile(text, deck)` returns validated rows, errors, and warnings, and touches no Firebase. It handles:
  - **CSV reading:** `csv-parse` with `bom: true`
  - **headers:** normalized as in D4, with the required columns for each deck
  - **trimming** of every value
  - **Legend rows:** Blessed rows (rarity "—" or empty), normal rows (Common or Rare), rows with an empty Set skipped with a warning, and "—" or an empty cost meaning no cost
  - **Cursed rows:** the Set column is ignored
  - **limits:** name 1–200 with a non-empty key, cost up to 10, mechanic pack up to 100, text up to 2000
  - **duplicate keys**, reported with both row numbers
  - **warnings** for unknown set codes and unknown mechanic packs
  - **row numbers** as in a spreadsheet, with the header as row 1

  Add `scripts/lib/cardRows.test.ts`:
  - inline CSV cases for every rule and for every `admin-scripts` scenario on validation, columns, and rows
  - `data/legend-cards.csv`: 590 rows (571 normal, 19 Blessed), no errors, and a single warning, for "The Cartographer"
  - `data/cursed-cards.csv`: 154 Cursed rows
  - `data/true-words.csv` passed as the Legend file: a missing-columns error

  Verify: `npm run test` passes.

## 3. Import planning, writing, and the command

- [x] 3.1 Add `planImport(existing, decks)` to `scripts/lib/importCards.ts`. It is pure and gives each card one outcome: `added`, `updated`, `unchanged`, `retired`, or `restored`.
  - The ID is `legend-<key>` or `cursed-<key>` (D2).
  - Only definition fields and `retired` are compared. Other stored fields are ignored and never part of a write.
  - A deck that is not imported is left out of the plan.

  Unit-test every outcome, plus these cases:
  - a stored `holder` field causes no update
  - a one-deck plan never touches the other deck
  - a name that differs only in punctuation updates the same ID

  Verify: `npm run test` passes.
- [x] 3.2 Add `readCards(db)` and `applyPlan(db, plan)` to `scripts/lib/importCards.ts`. `applyPlan` writes in `WriteBatch` chunks of up to 500, each write a `set(…, { merge: true })` of the definition fields and `retired`. Verify: covered by 3.4.
- [x] 3.3 Add the command `scripts/import-cards.ts` and its Turkish texts in `scripts/lib/messages.ts`. It takes `--legend`, `--cursed`, `--dry-run`, and `TARGET_OPTIONS`.
  - **Default files:** resolved from the script's location.
  - **Validation first:** files are validated before `connect()`. Errors are printed with file and row, and the exit code is 1.
  - **Report:** counts for each deck and the warnings. A dry run is labeled clearly as one, and writes nothing.
  - **Exit code** 0 on success, even with warnings.

  Add `"import-cards": "node scripts/import-cards.ts"` to `package.json`. Verify:
  1. With the emulators running, `npm run import-cards` prints 590 Legend and 154 Cursed cards added, and the Cartographer warning.
  2. A second run reports everything unchanged.
- [x] 3.4 Add `tests/import-cards.emulator.test.ts`, run against the emulators through `openAdmin`. It covers:
  - the first import of the repository files (590 + 154, Blessed and Cursed shapes as in the spec)
  - a second identical import that writes nothing
  - a changed text that updates one card under the same ID
  - a removed row that is retired and still stored, and a re-added row that is restored
  - a Cursed-only import that leaves the Legend cards unchanged
  - a dry run that writes nothing
  - an existing `holder` field that survives a re-import

  Verify: `npm run test:emulator` passes.
- [x] 3.5 Document the import in `docs/conventions.md` and `README.md`:
  - `docs/conventions.md`, Scripts: `import-cards` next to `set-role`, the data folder, the dry run, and the "catalog duplicated with a drift test" rule
  - `README.md`: how to load the cards into the emulators, and how to run it against a real project later (dry run first)

  Verify: `npm run format:check` passes, and the README command works as written against the running emulators.

## 4. Card data path in the app

- [x] 4.1 Add `src/features/cards/schema.ts`: the zod discriminated union on `kind` from D1, a converter with `idField: 'id'`, and the `Card` types. Add `schema.test.ts`. It accepts one valid card of each kind, and rejects:
  - a Blessed card with a rarity
  - a Cursed card with a set code or a mechanic pack
  - an unknown kind
  - a rarity other than common or rare

  Verify: `npm run test` passes.
- [x] 4.2 Add the `cards/{cardId}` block from D5 to `firestore.rules`, above the catch-all, with a comment. Add a `cards` describe block to `tests/firestore.rules.emulator.test.ts`. Seed the cards with rules disabled, then check:
  - a player and the DM can each read a card and query the collection
  - a signed-out user cannot read
  - create, update, and delete are each denied for a player and for the DM

  Verify: `npm run test:emulator` passes.
- [x] 4.3 Add three modules to `src/features/cards/`:
  - `api.ts`, with `cardsRef(db)` and `activeCardsQuery(db)`
  - `cardsContext.ts`, with `useCards()` and `useDeckCards(deck)`
  - `CardsProvider.tsx`, which subscribes only while signed in

  Mount `CardsProvider` in `src/app/App.tsx` under `UsersProvider`. Add `src/test/TestCardsProvider.tsx`, and a `cards` option to `renderApp`, which defaults to a ready, empty list.

  Add tests:
  - a unit test for `useDeckCards` splitting by kind
  - an emulator test next to the code (like `src/features/users/api.emulator.test.ts`), which shows that `activeCardsQuery` returns only cards that are not retired, under the real rules

  Verify: `npm run typecheck`, `npm run test`, and `npm run test:emulator` pass.
- [x] 4.4 Update the docs:
  - `docs/domain.md`, Data model: add the `cards/{cardId}` row, and note the refinements of the target model (`setCode`, lowercase rarity, markers as kinds)
  - `docs/conventions.md`: add `features/cards/` and `CardsProvider` to the project layout, and `useCards()` and `useDeckCards()` to Data access

  Verify: `npm run format:check` passes.

## 5. Shared card helpers

- [x] 5.1 Add `src/features/cards/sets.ts`: the official sets in shop order, `setDisplayName(code)` (unknown codes as written), and `setOrder(code)` (unknown codes after the known ones). It has no `@/` imports and uses no DOM types, so the script tests (Node type config) can import it. Add `sets.test.ts` with these cases:
  - "Kesqer" shows as "Kesqerian Nights"
  - "The End Is Nigh" shows as "The End is Nigh"
  - an unknown code is kept as written
  - the order follows the domain table

  Verify: `npm run test` passes.
- [x] 5.2 Add `src/features/cards/text.ts`, with no imports at all. It holds:
  - `normalize()` (D3)
  - `visibleText()`, which removes `[…]` and tidies spaces as in the legacy app
  - `searchTerms()` and `matchesAllTerms()`

  The card-typed parts go in `src/features/cards/display.ts`, because `text.ts` must not import `schema.ts` (which uses the `@/` alias):
  - `cardHaystack(card)`, as in D6, with "Blessed" or "Cursed" only for those kinds
  - `cardMatchesQuery(haystack, query)`
  - the labels `setLabel`, `rarityLabel`, and `kindLabel`

  Add `text.test.ts` covering the `card-library` search and bracket scenarios. Verify: `npm run test` passes.
- [x] 5.3 Add `src/features/cards/sort.ts` with the comparisons from D8:
  - the Turkish numeric collator
  - numeric costs compared as numbers
  - cards without a cost always last
  - ties broken by name

  Add `sort.test.ts`, which covers the sorting scenarios in both directions. Verify: `npm run test` passes.
- [x] 5.4 Add `scripts/lib/cardCatalog.drift.test.ts`. It imports `src/features/cards/sets.ts` and `text.ts` by relative path, and checks that they agree with `scripts/lib/cardCatalog.ts` on:
  - every set code, official name, and alias
  - the shop order
  - `normalize()` for every name in both card files

  Verify: `npm run test` passes.

## 6. Theme

- [x] 6.1 Add the purple frame token `--color-common` to `src/styles/theme.css`. Give it a comment with its reason (D7), and keep it clearly different from `true-word-line`. Extend `src/styles/theme.test.ts`: `common`, `gold`, `blessed`, and `cursed` must each have at least 3:1 contrast against `pane` and `pane-raised`. Verify: `npm run test` passes.

## 7. Screens

- [x] 7.1 Add `src/features/cards/CardFace.tsx` (D7). The face shows:
  - the cost, or "—"
  - the name
  - the visible text
  - the set's official name, or "Blessed"
  - the rarity label
  - the mechanic pack

  Cursed faces leave out set, rarity, and mechanic pack. The frame class follows the kind and the rarity.

  Add `CardFace.test.tsx` covering:
  - the frame for each kind
  - bracket text hidden
  - a missing cost
  - a Blessed card
  - a Cursed card

  Verify: `npm run test` passes.
- [x] 7.2 Add `src/features/cards/CardTable.tsx` (D8):
  - columns for each deck
  - headings as buttons with `aria-sort`
  - clicking a heading again reverses the order
  - the table sits in an `overflow-x-auto` container

  Add `CardTable.test.tsx`, which covers the columns for each deck, sorting by Cost in both directions, and the default name order. Verify: `npm run test` passes.
- [x] 7.3 Add `src/features/cards/CardBrowser.tsx`. It takes `deck` and a `Subscription<Card[]>`, and has:
  - the loading, error, empty, and no-match states (D9)
  - the count line
  - search through `useDeferredValue`
  - the set and mechanic pack filters, for Legend only, with the options and order from the spec
  - a view switch between "▦ Kartlar" and "☷ Liste"

  Add `CardBrowser.test.tsx`, which covers every `card-library` scenario on the screens: search, filters, views, states, and counts. Use fixture cards. Verify: `npm run test` passes.
- [x] 7.4 Replace the placeholders:
  - `LibraryPage`: `PageHeader` "Kart kütüphanesi", then `CardBrowser` for the Legend deck
  - `CursedDeckPage`: `PageHeader` "Cursed Deck", then `CardBrowser` for the Cursed deck

  Update the tests:
  - `src/app/routes.test.tsx`: placeholders are expected only for the unbuilt screens, and the two card screens list their fixture deck
  - `src/components/ui/Placeholder.test.tsx`: use "Custom Card Draft" as the example title, as in the app-shell delta

  Verify: `npm run check` passes.

## 8. Integration check

- [x] 8.1 Run `npm run check` and `npm run test:emulator`. Both must pass.
- [x] 8.2 Check the app in a browser:
  1. Start `npm run dev` and run `npm run import-cards`.
  2. Sign in with an emulator account and open the Kart kütüphanesi. Check that it shows 590 cards, the search "discard, draw", the set filter "Blessed" with 19 cards, the list sorted by Cost, and no horizontal page scroll at 360 px.
  3. Open the Cursed Deck and check that it shows 154 cards.
  4. Change one card's text in a copy of the CSV, and import it with `--legend <copy>`. Check that the open screen updates without a reload.
- [x] 8.3 Run `openspec validate add-card-library --strict`. It must pass.

## Workflow follow-up

- Archive the change with `/opsx:archive` after review.
- Commit only when the owner asks, on `master`.
