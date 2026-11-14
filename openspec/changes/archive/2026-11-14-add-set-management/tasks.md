# Tasks

## 1. Data model and access rules

- [x] 1.1 Add `src/features/sets/schema.ts`. It holds the set schema and converter (design D1, with optional `cardback`/`mascot` where absent ≠ null) and the `setChanges` record schema (design D3). Verify with `schema.test.ts`: a set without picture fields, one with `null`, one with paths, a bad `packLayout`, too many aliases, and each record step
- [x] 1.2 Add the pure `setIndex(sets)` in `src/features/sets/index.ts` (design D5): `setOf`, `setName`, `setRank` and `orderedSets`, matching codes and aliases with `normalize`, with unknown codes ranked last and ties broken by `setId`. Verify with `index.test.ts`: "The End Is Nigh", "Ragnarök", an unknown code, and tied positions
- [x] 1.3 Add the `sets/{setId}` rules to `firestore.rules`:
  - read for signed-in users
  - create, update and delete for the DM only
  - shape and limits checked
  - `code` immutable
  - `changeId` tied to a record created in the same write
  - `tableFree()` required when `packLayout` changes and on delete

  Verify with emulator rules tests for every allowed and denied case, signed-out reads included
- [x] 1.4 Add the `setChanges/{changeId}` rules (DM creates, with `by` the caller and `setId` matching; every signed-in user reads; no update or delete; the delete record's deterministic ID). Verify with emulator rules tests: a set write without its record is denied, a player cannot create a record, and a record cannot be changed or deleted
- [x] 1.5 Add `match /sets/{setId}/{file}` to `storage.rules`, mirroring card pictures. Verify with storage emulator tests: an anonymous read is allowed, a player write or delete is denied, a DM WebP ≤1 MB is accepted, and a PNG or a 2 MB file is refused

## 2. Sets API and providers

- [x] 2.1 Implement `addSet`, `saveSet`, `moveSet` and `deleteSet` in `src/features/sets/api.ts` (design D4). Each is one transaction with its record and throws `SetChangedError` on a stale base, `NameTakenError` on an existing ID, and the table-waiting error for a layout change or delete during an open pack. Verify with `api.emulator.test.ts` covering each step, a stale form, and an open pack
- [x] 2.2 Add set picture upload and cleanup (`src/features/sets/pictureStore.ts`, reusing `definitions/pictureStore.ts` helpers) and a size target in `definitions/picture.ts`: the card box for a cardback, ≤480 px high with alpha for a Cardmaker (design D6). Verify with `picture.test.ts` (1000 × 1500 → 320 × 480) and emulator tests: a replaced file is deleted, and a failed save deletes its upload
- [x] 2.3 Add `SetsProvider` and `useSets()`/`useSetIndex()`, mounted inside `AuthProvider` above `CardsProvider` in `src/app/App.tsx`, plus `src/test/TestSetsProvider.tsx` and `setFixtures.ts` holding the 12 sets. Verify with a provider test that a live change reaches subscribers
- [x] 2.4 Add `SetArtProvider`, which re-provides `ArtContext` with set cardbacks for `backUrl` and a new `setMascotUrl` (design D7). Verify with `art.test.tsx`: a set back from Storage, `blessed`/`cursed` from the manifest, and `null` for a set without a cardback

## 3. Replace the fixed set list in the app

- [x] 3.1 Switch `cards/display.ts`, `hands/HandSummary.tsx`, `activity-log/eventText.ts` and `cards/CardBrowser.tsx` (filter and sort) to the set index. Verify with their existing tests on the fixture sets, plus a library test that a reorder changes the set filter's order
- [x] 3.2 Rework `packs/catalog.ts` (design D8):
  - `shopCatalog(cards, sets)` orders groups by `setRank`
  - `setPacks` follows `packLayout`
  - the short name of the `pandemonium` type is the set's name
  - `isPandemoniumSet` and `groupMascotStem` are removed; the group Cardmaker uses `setMascotUrl` with the shop fallback

  Verify with `catalog.test.ts` and `PackShopPage.test.tsx`: Pandemonium last by position, Ulagal with a single-pack layout, an unknown code with standard packs
- [x] 3.3 Feed the card form's set choice from the stored sets in order (`CardFormDialog.tsx`). Verify with `CardFormDialog.test.tsx` that a newly added set is offered last and its code is stored
- [x] 3.4 Delete `src/features/cards/sets.ts` and its test, and move any remaining callers. Verify `npm run check` passes and `grep -r OFFICIAL_SETS src` finds nothing
- [x] 3.5 Update `docs/domain.md` Sets: the sets are stored data, the initial list lives in `data/sets.csv`, and the pack layout replaces the Pandemonium special case. Verify the table no longer claims a fixed list and `npm run format:check` passes

## 4. Setler screen and set form

- [x] 4.1 Add the "Setler" screen (`◈`, `/sets`, after Kart kütüphanesi) to `src/app/screens.ts` and the routes. Verify with `routes.test.tsx` and the shell navigation test (ten entries in order)
- [x] 4.2 Build `SetsPage.tsx` from the V1 canvas:
  - a table with number, cardback (neutral back when none), name, code and aliases, layout, and count
  - "+ Set ekle", "↑", "↓" and "✎ Düzenle" for the DM only
  - cards below 640 px

  Verify with `SetsPage.test.tsx`: the DM's and a player's view, the counts (design D9), disabled ↑ on the first row and ↓ on the last, a move, and an offline move message
- [x] 4.3 Build `SetFormDialog.tsx`:
  - code (locked when editing), name, aliases, layout radio
  - Cardback and Cardmaker `PictureField`s with Resim seç, Resmi kaldır and İndir
  - "Sil", disabled with "N kart bu seti kullanıyor." while cards use the set, otherwise with a confirmation
  - Turkish validation messages, plus the changed-elsewhere and table-waiting messages

  Verify with `SetFormDialog.test.tsx` covering each requirement in `specs/card-sets`
- [x] 4.4 Check the screen in the browser against the dev emulators at desktop width and in a 360 px iframe (no horizontal scroll), as the DM and as Oyuncu 1. Verify by screenshots attached to the apply summary

## 5. Activity log

- [x] 5.1 Subscribe to `setChanges` in `ActivityLogProvider`, map each record to one event in `events.ts`, and render it in `eventText.ts` with the Turkish field labels (design D11). Verify with `events.test.ts`, `eventText.test.ts` and an `ActivityLogPage.test.tsx` case that a rename sorts above an earlier LP change

## 6. Scripts and data

- [x] 6.1 Add `data/sets.csv` with the 12 sets in the current order (Code, Name, Aliases, Packs) and `scripts/lib/setRows.ts` that parses and validates it. Verify with `setRows.test.ts`: the repository file parses into 12 sets, and each invalid case in the admin-scripts spec stops with its row number
- [x] 6.2 Extend `scripts/lib/artFiles.ts` (design D10):
  - a `sets` plan mode matching `<set>_cb` and `cardmaker_<set>` against given sets
  - `build-art` counting other `*_cb` and `cardmaker_*` files as left to the set import
  - `setPack` and the set Cardmaker stems removed

  Verify with `artFiles.test.ts`/`artInventory.test.ts` and a `build-art --dry-run` report that counts the set files
- [x] 6.3 Implement `scripts/lib/importSets.ts` and `scripts/import-sets.ts` with an `npm run import-sets` entry:
  - adds only missing sets, after the stored ones
  - stores pictures only where the field is absent
  - writes one `imported` record
  - Turkish report, `--dry-run`, `--source`, `--project` with confirmation

  Verify with `importSets.test.ts` against the emulators: a first run, a second run that changes nothing, a renamed set left alone, and a removed Cardmaker not restored
- [x] 6.4 Make `import-cards` warn about set codes that no stored set has (Admin SDK read, also in a dry run), with the new Turkish message. Remove `OFFICIAL_SETS` from `cardCatalog.ts`, and reduce the drift test to `MECHANIC_PACKS` and `normalize`. Verify with `cardRows.test.ts`/`importCards.test.ts`: an unknown code is warned, and no sets stored means every code is warned
- [x] 6.5 Update `README.md` setup: `import-sets` before `import-cards`, and `--source` for the set pictures. Verify the documented commands run as written against the emulators

## 7. Integration

- [x] 7.1 Seed the dev emulator data: ask the owner for the archive folder, run `npm run import-sets -- --source <folder>` and then `npm run build-art -- --source <folder>`. Verify in the browser that the shop groups, cardbacks, group Cardmakers and the Setler screen show all 12 sets as before
- [x] 7.2 Run `npm run check` and `npm run test:emulator`, and verify both pass
- [x] 7.3 Stop every process on the project's ports as `CLAUDE.md` describes (SIGINT to the dev and emulator process groups, wait for the export), and verify with `lsof -nP -iTCP -sTCP:LISTEN` that none is left

## Workflow follow-up

- Run `import-sets` (with `--source`) against the real project together with the owner, before or with the next deploy.
- Archive the change with `/opsx:archive` after review.
