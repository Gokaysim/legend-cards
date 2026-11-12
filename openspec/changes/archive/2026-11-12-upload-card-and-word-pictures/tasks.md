# Tasks

Before running any command, run `. ~/.nvm/nvm.sh && nvm use` from the repository root. Work directly on `master`, without a feature branch. Never point a script at a real project.

`npm run test:emulator` cannot run while the owner's `npm run dev` is up: the two use the same ports, and the tests clear Firestore. Ask before stopping the owner's dev session, and ask before changing the owner's dev emulator data.

## 1. Cloud Storage in the emulators

- [x] 1.1 Add Cloud Storage to the emulator setup (D12):
  - `firebase.json`: `storage: { rules: 'storage.rules' }`, and `emulators.storage` on `127.0.0.1:9199`
  - `storage.rules` that deny everything for now
  - `package.json`: `emulators` and `test:emulator` use `--only auth,firestore,storage`

  Verify: `npx firebase emulators:exec --only auth,firestore,storage --project demo-legend-cards "node -e 0"` exits 0, and the log shows the Storage emulator on 9199.
- [x] 1.2 Write `storage.rules` as in D5:
  - public reads of `cards/**` and `words/**`
  - DM-only create, update and delete, with `isDm()` through `firestore.get` on the profile
  - `validPicture(file)` for the name, the WebP type and at most 1 MB
  - the ID prefix of each folder

  Add `tests/storage.rules.emulator.test.ts` with `initializeTestEnvironment({ firestore, storage })` and the DM's and a player's profiles seeded. Prove the cross-service DM check first, before the other cases. The tests cover:
  - signed-out and player reads succeed
  - the DM stores, replaces and deletes
  - denied: a player's and a signed-out write or delete, a PNG, a file over 1 MB, a bad file name, a wrong ID prefix, and any path outside `cards/` and `words/` (also for the DM, also reads)

  Verify: `npm run test:emulator` passes.
- [x] 1.3 Document the Storage emulator and its rules:
  - `CLAUDE.md`: add 9199 to the ports to stop
  - `README.md`: the development section names the Storage emulator
  - `docs/conventions.md`, "Adding a new data path": a new file path needs a rule in `storage.rules` and tests in `tests/storage.rules.emulator.test.ts`

  Verify: `npm run format:check` passes.

## 2. The `picture` field in the data and the rules

- [x] 2.1 Add `picture: z.string().nullable().default(null)` to the card schemas in `src/features/cards/schema.ts` and the word schema in `src/features/true-words/schema.ts` (D3). Add a shared path helper that builds `cards/<id>/<hash>.webp` or `words/<id>/<hash>.webp` and checks a path against it. Tests:
  - a card without the field reads as `picture: null`
  - a valid path parses
  - the helper refuses another ID, another folder, or a hash that is not 10 lowercase hex digits

  Verify: `npm run check` passes.
- [x] 2.2 In `src/features/definitions/schema.ts`:
  - add `picture` to `cardSnapshotSchema` and `wordSnapshotSchema`, defaulting to `null` so older records parse
  - add `what: 'definitions' | 'pictures'`, defaulting to `'definitions'`, to the import record schema

  Extend `schema.test.ts` with an old record without `picture` or `what`. Verify: `npm run check` passes.
- [x] 2.3 In `firestore.rules` (D3):
  - `validCard` and `validWord` accept an absent `picture`, `null`, or a path for the document's own ID
  - `picture` joins the `hasOnly` key lists and the keys `changedByDm` and `wordChangedByDm` may change
  - `cardSnapshot()` and `wordSnapshot()` add `'picture': data.get('picture', null)`

  Extend `tests/firestore.rules.emulator.test.ts`:
  - the DM adds a card without the field, with `null` and with a path
  - denied: a path for another ID, another folder, or a bad hash
  - a picture change on an active card is allowed while a pack is open
  - a retire that also changes the picture is denied
  - a record whose `after.picture` disagrees with the stored card is denied
  - a player's picture change is denied
  - the same cases for a word

  Verify: `npm run test:emulator` passes.

## 3. Picture addresses in the app

- [x] 3.1 Make `VITE_FIREBASE_STORAGE_BUCKET` a required setting in `src/lib/firebase/config.ts`. Add it to `.env.example` with a description and to `.env.development` as `demo-legend-cards.firebasestorage.app` (D4). Extend `config.test.ts` for a missing bucket. Verify: `npm run check` passes, and the config error screen lists the bucket when it is unset.
- [x] 3.2 Create `src/lib/firebase/storage.ts` (D4, D6, D12):
  - the Storage instance, with `connectStorageEmulator` when `useEmulators` is set
  - `maxUploadRetryTime` and `maxOperationRetryTime` of 30 s
  - a pure `pictureAddress(settings, path)` that builds the emulator or the Firebase download URL with the path encoded

  Unit-test both URL forms and the encoding of `/`. Verify: `npm run check` passes.
- [x] 3.3 In `src/features/art/`:
  - replace `cardUrl` and `wordUrl` with `pictureUrl(path: string | null)` in `ArtLookup`
  - `ArtProvider` builds it from `pictureAddress`, and `NO_ART` and the test providers give a fake builder
  - drop `cards` and `words` from `artManifestSchema`, keeping version 1 (an old manifest still parses)
  - switch `CardFace`, `CardZoomDialog`, `TrueWordTile`, `TrueWordDetails`, `TrueWordZoomDialog` and `ActiveWordsPeek` to `pictureUrl(definition.picture)`

  Update their tests:
  - a card with a path shows the picture from the fake builder
  - a card without one keeps the CSS face
  - a failing image falls back
  - an old manifest with `cards` still gives its cardbacks

  Verify: `npm run check` passes.
- [x] 3.4 Rewrite the "Pictures" sections:
  - `docs/conventions.md`: `useArt().pictureUrl`, the cardbacks, packs and Cardmaker in the manifest, and only `src/lib/firebase/storage.ts` and `definitions/api.ts` importing `firebase/storage`
  - `docs/domain.md`: card and word pictures live in Cloud Storage, anyone may open them by address, and the DM manages them in the forms. Replace "Uploading a picture in the app is not built".

  Verify: `npm run format:check` passes.

## 4. Preparing a picture

- [x] 4.1 Create `src/features/definitions/picture.ts` (D7):
  - the input checks (PNG, JPEG or WebP, at most 20 MB)
  - a pure `fitWithin(width, height)` that fits within 563 × 788 without enlarging
  - `preparePicture(file, encoder)`, with the encoder injected: `createImageBitmap` with `resizeQuality: 'high'`, then `OffscreenCanvas.convertToBlob` as WebP at quality 0.82
  - the output checks: a result that is not WebP is `PictureUnsupportedError`, and one over 1 MB is `PictureTooLargeError`
  - `pictureHash(blob)`: the first 10 hex digits of SHA-256

  Add the errors to `errors.ts` with Turkish messages. The unsupported message names Chrome, and the type message names PNG, JPEG and WebP. Unit tests cover:
  - each check
  - `fitWithin`: 1126 × 1576 → 563 × 788, 400 × 560 unchanged, and a wide picture keeps its ratio
  - an encoder that returns PNG gives the unsupported error
  - the hash of a known blob

  Verify: `npm run check` passes.

## 5. Saving pictures with the definition steps

- [x] 5.1 In `src/features/definitions/api.ts` (D6):
  - add `picture: PictureChoice` (`keep`, `{ new: Blob }`, `remove`) to `addCard`, `saveCard`, `addWord` and `saveWord`
  - the snapshots carry `picture`, and `runStep` writes `picture` only when it changes (D3)
  - upload with the D2 metadata before the step
  - when the step fails, delete the upload unless it is the stored picture
  - after a step that replaced or removed a picture, delete the old file, ignoring errors; never delete the path the definition now points at
  - `deleteCard` and `deleteWord` delete a draft's file after the step

  Extend `src/features/definitions/api.emulator.test.ts`, using the Storage emulator:
  - add a card with a picture: the file exists with its metadata, and the record shows the path
  - replace a picture: the old file is gone
  - remove a picture: the field is `null`, and the file is gone
  - a text edit on a card without the field keeps it absent
  - a save refused by `DefinitionChangedError` deletes its upload
  - re-uploading the same picture keeps the file
  - deleting a draft deletes its file
  - the same for a word

  Verify: `npm run test:emulator` passes.
- [x] 5.2 Pass the picture choice through `DefinitionsProvider`, `definitionsContext.ts` and the test provider in `src/test/`. Verify: `npm run check` passes.

## 6. The picture in the forms

- [x] 6.1 Add a picture section to the forms (definition-editing, "The picture in the forms", "Downloading a picture", "Preparing a picture"). Create a `PictureField` used by `CardFormDialog` and `WordFormDialog`. It shows:
  - a preview through `CardPicture` (the stored picture, the chosen one through an object URL that is revoked on change and close, or "Resim yok")
  - "Resim seç": a file input accepting `image/png,image/jpeg,image/webp`, with "Hazırlanıyor…" while preparing
  - "Resmi kaldır" while there is a picture
  - "Vazgeç" to drop an unsaved picture choice
  - "İndir", only for a stored picture: a link to `pictureUrl(path)`
  - the Turkish error of a failed preparation

  "Kaydet" saves a picture change even when no other field changed. Retire and bring back ignore it. Extend `CardFormDialog.test.tsx` and add `WordFormDialog.test.tsx`, with an injected preparer:
  - choosing a file shows the preview, and "Kaydet" passes `{ new }`
  - "Resmi kaldır" passes `remove`
  - closing without saving changes nothing
  - "İndir" appears only for a stored picture, with its address
  - a PDF and an unsupported browser show their messages and keep the picture
  - the controls are disabled offline

  Verify: `npm run check` passes.

## 7. Picture changes in the log

- [x] 7.1 In `src/features/activity-log/eventText.ts` and `events.ts` (D11):
  - the edit diff gets "Resim: eklendi", "Resim: değişti" and "Resim: kaldırıldı", never a path
  - a publish or an add straight to active with a picture says "resimli"
  - an import record with `what: 'pictures'` names the cards or True Words that got pictures, with their count

  Extend `eventText.test.ts` and `events.test.ts`:
  - each picture line
  - a picture change together with a cost change
  - an old record without `picture`, which shows no picture line
  - the public and DM-only picture import records

  Verify: `npm run check` passes.

## 8. The scripts

- [x] 8.1 Move archive extraction (7-Zip check, a temporary folder per archive, cleanup on exit and Ctrl+C) from `scripts/build-art.ts` into `scripts/lib/archives.ts`, and use it from `build-art`. Verify: `npm run check` passes, and `npm run build-art -- --source ~/Downloads --dry-run` prints the same report as before.
- [x] 8.2 In `scripts/lib/target.ts`:
  - add `FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199'` to the emulator defaults
  - add a `--bucket` option, defaulting to `<projectId>.firebasestorage.app`, passed as `storageBucket` to the Admin app

  Extend `target.test.ts` for the default and an explicit bucket, and for the mixed-environment check with the new variable. Verify: `npm run check` passes.
- [x] 8.3 In `scripts/lib/artFiles.ts` (D9, D10):
  - `ArtData` entries carry the stored `id`, and `indexTargets` maps both the identity a name gives and the current `nameKey` to that ID
  - `planArt` takes which groups to plan: assets for the build, cards and words for the import
  - the other groups are counted as skipped instead of reported unknown
  - alias rows of the skipped groups are not checked

  Split `artInventory.test.ts`: the assets against the catalog, and the cards and words against definitions built from the repository CSV files. Extend `artFiles.test.ts`:
  - a renamed definition is found by its ID
  - a card added in the app is found by its `nameKey`
  - an alias that names nothing stored is an error for the import
  - asset files are skipped by the import, and card files by the build

  Verify: `npm run check` passes.
- [x] 8.4 Narrow `build-art` to assets (card-images, "Building the pictures", "Build report and dry run"):
  - it no longer reads `data/*.csv`
  - `artWrite.ts` writes only cardbacks, packs and mascots, and the manifest has no `cards` or `words`
  - the Turkish report says how many files are left to `import-pictures`

  Update `artWrite.test.ts` and `messages.ts`. Verify: `npm run check` passes, and the build's dry run against `~/Downloads` lists no card or word pictures.
- [x] 8.5 Create the picture import (admin-scripts, the four new requirements; D9):
  - **Logic** in `scripts/lib/importPictures.ts`:
    - read every card and word
    - plan `add`, `has` and `removed` from the three `picture` states
    - convert with `sharp` and upload with the D2 metadata
    - set `picture` in a transaction only while the field is still absent, else delete the upload
    - write the public and DM-only `imported` records with `what: 'pictures'`
  - **Command** `scripts/import-pictures.ts` with `--source`, `--dry-run`, `--project`, `--yes` and `--bucket`
  - the Turkish report in `messages.ts`
  - `npm run import-pictures` in `package.json`

  Add `tests/import-pictures.emulator.test.ts`, with small PNG fixtures written to a temporary folder. It covers:
  - only adds
  - a DM picture is kept, and a removed picture stays removed
  - a renamed card is matched by ID
  - a second run adds nothing
  - a run stopped halfway (an injected failure) is completed by the next run
  - the records split public and DM-only
  - a dry run uploads and writes nothing

  Verify: `npm run test:emulator` passes.
- [x] 8.6 Document the scripts:
  - `docs/conventions.md`, "Scripts": `import-pictures` and the narrowed picture build
  - `data/README.md`, "Pictures": which script uses which archive files and the alias table
  - `README.md`:
    - the commands
    - the dev data steps
    - the production steps of the Migration Plan: Blaze with a budget alert, the default bucket, the bucket setting, deploying `storage.rules` with the cross-service grant, then the imports
    - the CORS fallback of D8

  Verify: `npm run format:check` passes.

## 9. Integration checks

- [x] 9.1 Ask the owner before stopping their dev session, then run `npm run check` and `npm run test:emulator`. Verify: both pass.
- [x] 9.2 With the owner's permission:
  - run `npm run build-art -- --source ~/Downloads`
  - start the emulators and run `npm run import-pictures -- --source ~/Downloads` against them
  - stop them with SIGINT so the export keeps the files

  Verify: the report counts about 743 cards and 53 words with pictures, `public/art/cards/` and `public/art/words/` are gone, and `.firebase-emulator-data/` holds a `storage_export`.
- [x] 9.3 Check in Chrome, with the DM in one window and a player in another:
  - upload a PNG for a card and a JPEG for a True Word, and see the preview and the saved picture appear on the player's device without a reload
  - replace a picture and remove one
  - change a picture while a pack is open
  - see the three log lines
  - "İndir" saves `<id>.webp`; if the emulator ignores `Content-Disposition`, switch to D8's fallback and note it in the README
  - the form at 360 CSS pixels has no horizontal scroll

  Verify: each item behaves as the specs say. Record anything that differs.
- [x] 9.4 Stop every process on the project's ports, now including 9199, as `CLAUDE.md` says: SIGINT to the emulators first, then wait for the export. Verify: `lsof -nP -iTCP -sTCP:LISTEN` shows none of the project's ports.

## Workflow follow-up

- Commit only when the owner asks.
- Archive the change with `/opsx:archive` after the owner's review.
