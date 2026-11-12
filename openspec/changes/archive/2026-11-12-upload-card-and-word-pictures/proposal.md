# Proposal

## Why

The DM can add and edit cards and True Words in the app, but not their pictures. Today `npm run build-art` builds the pictures from the owner's archives into static files, matched through the repository CSV files. A card added in the app stays without a picture until a developer rebuilds, and the DM cannot replace a picture or remove one. The legacy app had a "Görsel" field in its card form. The owner wants the DM to upload, replace, download and remove a card's or a word's picture from the same forms.

## What Changes

- **Pictures live in Cloud Storage.** Every card and True Word picture is a file in Cloud Storage for Firebase, and the definition stores where its picture is. Cloud Storage is the only source of card and word pictures. The cardbacks, pack pictures and Cardmaker stay static files built by `build-art`.
- **The DM manages pictures in the forms.** The card and True Word forms get a "Resim" section:
  - a preview
  - "Resim seç" to upload a new picture or replace the current one
  - "Resmi kaldır" to remove it
  - "İndir" to download the stored picture

  A picture change is saved with "Kaydet" (or "Kaydet ve yayınla" / "Yayınla"), in the same step and change record as the other fields. It is allowed in every status, also while a pack is open, as a text fix is. A picture is never required to publish.
- **Pictures are processed in the browser.** Chrome turns the chosen PNG, JPEG or WebP into a WebP of at most 563×788 pixels, at the quality `build-art` uses. Safari need not support this: a browser that cannot make a WebP gets a Turkish message, and nothing changes.
- **No transaction across services.** A save uploads the new file, then writes the definition and its record, then tries to delete the replaced file. A failure leaves at most an unused file behind. Deleting a draft also deletes its picture file.
- **Who sees what.** Anyone who knows a picture's address can open it without signing in, as with today's static pictures. Draft pictures need not be hidden, because the owner accepted this. Only the DM uploads and deletes.
- **New admin script `import-pictures`.** It reads the owner's archives as `build-art` does, matches the files with the same name rules and alias table against the **stored** definitions, and uploads the pictures to Cloud Storage. It only adds:
  - it never replaces a picture a definition has
  - it never brings back a picture the DM removed

  It records each run in the definition changes, and supports `--dry-run` and `--project` like the other imports.
- **BREAKING: `build-art` builds only cardbacks, pack pictures and the Cardmaker.** The manifest no longer lists cards or words. Card and word pictures appear only after `import-pictures` has run against the target, the dev emulators included.
- **BREAKING: development needs the Storage emulator.** `npm run dev` and `npm run test:emulator` also start the Cloud Storage emulator, on port 9199. The app reads a new required setting, `VITE_FIREBASE_STORAGE_BUCKET`.
- **The log shows picture changes.** An edit event names a picture change as "Resim: eklendi", "değişti" or "kaldırıldı". A picture import is one event per run, like a definition import.

## Capabilities

### New Capabilities
None. The behavior belongs to existing capabilities.

### Modified Capabilities
- `card-images`:
  - Card and word pictures come from Cloud Storage, through the definition, instead of the build.
  - The build covers only cardbacks, packs and the Cardmaker.
  - The name rules, aliases, duplicates and the report now also serve the picture import.
- `definition-editing`:
  - The forms upload, replace, download and remove a picture, as part of a definition step and its change record.
  - Deleting a draft deletes its picture.
- `admin-scripts`: the new `import-pictures` script. It only adds, never brings back a removed picture, reports in Turkish, has a dry run, writes records, and works against the emulators or a named project.
- `activity-log`:
  - Picture changes in edit events.
  - The picture import's record as an event.
- `data-access-control`:
  - The deny-by-default and signed-out rules extend to file storage.
  - Card and word pictures are the one thing anyone may read without signing in.
- `developer-workflow`: the one-command development and the emulator tests include the file storage emulator.

## Impact

- **Firebase:**
  - a new Cloud Storage bucket with `storage.rules`
  - `firebase.json` gets the storage rules and the Storage emulator (port 9199)
  - `firestore.rules`: the card and word rules accept a `picture` path, and the record snapshots include it
  - **A real project needs the Blaze plan.** Since February 2026, Cloud Storage for Firebase requires it. Its no-cost usage remains, and the pictures are about 50 MB. Deploying `storage.rules`, which read the DM's role from Firestore, also needs the cross-service rules permission that the Firebase CLI offers to grant.
- **App code:**
  - `src/lib/firebase/` (a Storage instance, its emulator, picture URLs, and the bucket setting)
  - `src/features/art/`: `useArt()` gives a picture's URL from a stored path, and the manifest loses `cards` and `words`
  - `src/features/definitions/`: picture processing, the form's picture section, and uploads and deletes around the step transaction
  - the card and word faces, tiles, zoom views and details that show pictures
  - `src/features/activity-log/` (picture lines and the picture import event)
- **Scripts:**
  - a new `scripts/import-pictures.ts` with its logic in `scripts/lib/`
  - `artFiles.ts` matches against stored definitions by ID or name
  - `build-art.ts` and `artWrite.ts` drop cards and words
  - `target.ts` learns the Storage emulator and the bucket
  - `messages.ts`
- **Tests:**
  - a new Storage rules emulator suite
  - Firestore rules tests for `picture`
  - definitions API emulator tests with Storage
  - an `import-pictures` emulator test
  - unit tests for processing, the form, the log text and the art lookup
- **Docs and settings:** `docs/domain.md`, `docs/conventions.md`, `README.md`, `data/README.md`, `CLAUDE.md` (port 9199), `.env.example`, `.env.development`, `package.json` scripts.
- **Dev data:** with the owner's permission, one `import-pictures` run against the dev emulators. It uploads about 50 MB into the Storage emulator, which `.firebase-emulator-data/` then keeps. `build-art` runs once more to drop the old card and word files.
- **Out of scope:**
  - uploading cardbacks, pack pictures or the Cardmaker in the app
  - Safari support for picture processing
  - cropping or editing a picture in the app
  - cleaning up unused files left by an interrupted save
  - keeping the original upload next to its WebP
