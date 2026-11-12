# Design

## Context

See proposal.md for the motivation. The owner settled these in the explore session:
- **Option C.** Cloud Storage is the only source of card and word pictures.
- **Scope.** True Words are included.
- **Visibility.** Draft pictures need not be hidden.
- **Text drift.** A picture that no longer matches its text is the DM's concern.
- **Download.** "İndir" gives the stored WebP. No original file is kept.
- **No transaction across services.** Steps run in order: upload, then the definition step, then deleting the replaced file.
- **Browsers.** Processing must work in Chrome. Safari need not.

The current state that shapes the approach:

- **Pictures are static files.**
  - `npm run build-art` matches the archive files against the repository CSV files (`scripts/lib/artFiles.ts`, `planArt`).
  - It converts them with `sharp` (WebP, quality 82, `contentHash` of 10 hex digits) and writes `public/art/` with a `manifest.json` keyed by document ID (`artWrite.ts`).
  - The app loads the manifest once (`ArtProvider`). Faces, tiles and zoom views ask `useArt().cardUrl(id)` or `wordUrl(id)`, and fall back to CSS through `usePicture`. The callers are `CardFace`, `CardZoomDialog`, `TrueWordTile`, `TrueWordDetails`, `TrueWordZoomDialog` and `ActiveWordsPeek`.
- **Definitions** (`add-card-and-word-editing`):
  - `cards/{id}` and `trueWords/{id}` have fixed key sets in `firestore.rules`: `definitionKeys()` and `wordKeys()`, with `hasOnly` and `hasAll`.
  - Every DM step is one client transaction, `runStep` in `src/features/definitions/api.ts`. It writes the definition and a `definitionChanges` record whose `before` and `after` snapshots the record rule compares with `cardSnapshot()` and `wordSnapshot()` of the stored document.
  - The form refuses a save when the stored snapshot differs from the one it loaded (D9 there).
  - The imports write `step: 'imported'` summary records with the Admin SDK.
- **The Firebase SDK is only imported** by `src/lib/firebase/`, `src/lib/firestore/` and feature `api.ts` modules (`docs/conventions.md`).
- **Settings and scripts.**
  - The app's settings are parsed in `src/lib/firebase/config.ts` from `VITE_*` variables.
  - Scripts pick their target through `scripts/lib/target.ts`, which knows only the Auth and Firestore emulators.

## Goals / Non-Goals

**Goals:**
- One place answers "what is this card's picture": its definition.
- The server enforces who may store and delete files, and what a stored file may be. The Firestore rules enforce what a definition's `picture` may point at.
- Picture changes travel with the definition step and its record, so the log, the conflict check and the real-time updates work for them unchanged.
- No per-picture network call besides loading the image itself.

**Non-Goals:**
- Checking on the server that a definition's `picture` file exists. Firestore rules cannot read Cloud Storage. A missing file falls back to CSS.
- Cleaning up files that an interrupted save leaves behind.
- Moving cardbacks, pack pictures or the Cardmaker to Cloud Storage.

## Decisions

### D1. Cloud Storage holds every card and word picture

The pictures move out of `public/art/` into the project's default Cloud Storage bucket. `build-art` keeps the cardbacks, packs and Cardmaker.

*Alternatives:*
- Keep the build and let uploads override it (option B). Rejected by the owner: two sources make "remove" and "back to the built picture" two different things.
- Uploads only for new cards (option A). Rejected: it cannot replace or remove a picture.
- Base64 in Firestore. Rejected: it has no HTTP caching, and every listener would carry the pictures.

### D2. File layout and metadata

```
cards/{cardId}/{hash}.webp     e.g. cards/legend-abolethseyes/93e6f39a91.webp
words/{wordId}/{hash}.webp     e.g. words/tw-abyss/1f0c2d9e4b.webp
```

`hash` is the first 10 hex digits of the SHA-256 of the WebP bytes, as `build-art`'s `contentHash`, so a changed picture gets a new address. The identity in the path never changes, because a rename keeps the ID.

Every file is stored with:
- `contentType: image/webp`
- `cacheControl: public, max-age=31536000, immutable`
- `contentDisposition: attachment; filename="<id>.webp"` (D8)

### D3. The definition's `picture` field has three states

| Stored `picture` | Meaning | Shown |
| --- | --- | --- |
| field absent | never had a picture | CSS look |
| a path (D2) | its picture | the picture |
| `null` | the DM removed its picture | CSS look |

The absent state exists only so the picture import can tell "never had one" from "removed" (admin-scripts, "The picture import only adds"). This mirrors the imports' empty cell versus "—".

To keep that difference:
- **The app writes `picture` only when it changes.** `runStep` leaves `picture` out of an update whose before and after pictures are equal, and out of a create without a picture. So a text fix on a card that never had a picture keeps the field absent.
- **App schemas.** Both treat absent and `null` alike: `picture: z.string().nullable().default(null)` on `Card` and `TrueWord`.
- **Snapshots.** The change-record snapshots get `picture`, with `null` for absent. `cardSnapshotSchema` and `wordSnapshotSchema` default it to `null`, so older records still parse.
- **Rules.**
  - `validCard` and `validWord` accept a missing `picture`, a `null` one, or a string that matches `cards/<cardId>/[0-9a-f]{10}[.]webp` (`words/<wordId>/…` for a word).
  - `picture` joins the `hasOnly` lists but not `hasAll`, and joins the keys `changedByDm` and `wordChangedByDm` may change.
  - Retiring and bringing back still allow only `status` and `changeId`, so a picture never changes with them.
  - `cardSnapshot()` and `wordSnapshot()` add `'picture': data.get('picture', null)`, so the record rule compares pictures as it compares every other field.
- **Status.** A picture is never part of completeness, and a picture change is not a status change, so it needs no free table (definition-editing, "Picture changes are definition steps").

*Alternative:* a separate `pictureRemoved` flag. Rejected: it adds a field to every rule and snapshot for one script's benefit.

### D4. Picture addresses are built, not fetched

`storage.rules` lets anyone read `cards/**` and `words/**` (D5). That allows a plain Firebase download URL without a token:

```
https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded path>?alt=media
http://127.0.0.1:9199/v0/b/<bucket>/o/<encoded path>?alt=media      (emulators)
```

- `src/lib/firebase/storage.ts` builds the address from the bucket setting and the emulator flag, without a network call.
- `useArt()` gets `pictureUrl(path: string | null): string | null` in place of `cardUrl` and `wordUrl`. `ArtProvider` gives the real builder, and the test providers give a fake. The six callers switch from `cardUrl(card.id)` to `pictureUrl(card.picture)`, and `usePicture` keeps the CSS fallback.
- The manifest drops `cards` and `words`. `MANIFEST_VERSION` stays 1, and the app's schema ignores the two keys in an older manifest. So an old `public/art/` keeps its assets until the next build.
- A new required setting, `VITE_FIREBASE_STORAGE_BUCKET`, goes into `config.ts`, `.env.example` and `.env.development` (`demo-legend-cards.firebasestorage.app`). A missing bucket shows the existing config error screen.

*Alternative:* `getDownloadURL()` per picture, or tokened URLs stored in Firestore. Rejected:
- `getDownloadURL()` is about 800 calls on the library.
- Tokens bypass the rules anyway, differ per environment, and the import would have to mint them.

### D5. `storage.rules`

```
match /b/{bucket}/o {
  match /cards/{cardId}/{file} {
    allow read: if true;
    allow create, update: if isDm() && validPicture(file) && cardId.matches('(legend|cursed)-.+');
    allow delete: if isDm();
  }
  match /words/{wordId}/{file} {
    allow read: if true;
    allow create, update: if isDm() && validPicture(file) && wordId.matches('tw-.+');
    allow delete: if isDm();
  }
}
```

- `isDm()` reads the profile through cross-service rules: `firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'dm'`, after `request.auth != null`.
- `validPicture(file)` checks three things:
  - the name matches `[0-9a-f]{10}[.]webp`
  - `request.resource.contentType == 'image/webp'`
  - `request.resource.size <= 1 * 1024 * 1024`
- Every other path is denied by default.
- The rules do not require the definition to exist, because a new definition's picture is uploaded before the definition is created (D6).

`data-access-control` records the public read as its one exception.

### D6. Saving without a cross-service transaction

All storage calls live in `src/features/definitions/api.ts`. The form passes a `PictureChoice`:
- `keep`
- `{ new: Blob }`
- `remove`

```
save(choice = new):
  path = <folder>/<id>/<sha256(blob)[0..10]>.webp
  upload(path, blob, metadata)                      -- fails: nothing changed
  runStep(after.picture = path)                     -- fails: delete(path) unless stored picture == path
  if old picture != null and old != path: delete(old), errors ignored

save(choice = remove):
  runStep(after.picture = null)
  delete(old), errors ignored

deleteDraft:
  runStep(delete)
  if picture != null: delete(picture), errors ignored
```

- **Conflicts.** The conflict check (D9 of `add-card-and-word-editing`) now covers `picture`. A picture saved on another device refuses this save, and the new upload is deleted again.
- **Re-uploading the same picture.** It gives the same path. Then the stored file is never deleted, because it is both the old and the new picture.
- **Offline.** The steps already require a connection, and the controls are disabled offline. The storage instance gets a short `maxUploadRetryTime` and `maxOperationRetryTime` (30 s), so a dropped connection fails the save instead of hanging the form.
- **A new definition's ID.** It is chosen before the upload (`newDefinitionId`), so its path is known. If the step then fails with `NameTakenError`, the upload is deleted.

### D7. Preparing a picture in Chrome

`src/features/definitions/picture.ts` does the work:

1. **Check the input.** The type must be `image/png`, `image/jpeg` or `image/webp`, and the size at most 20 MB. Otherwise it fails with `PictureTypeError` or `PictureTooLargeError`.
2. **Decode and fit.** `createImageBitmap(file)` reads the natural size. The size is fitted within 563 × 788 with the proportions kept, never enlarged (a pure `fitWithin`, unit-tested). A second `createImageBitmap(file, { resizeWidth, resizeHeight, resizeQuality: 'high' })` scales it.
3. **Encode.** The bitmap is drawn on an `OffscreenCanvas` and encoded with `convertToBlob({ type: 'image/webp', quality: 0.82 })`, the build's quality 82.
4. **Check the output.**
   - If the result is not `image/webp`, the browser cannot encode WebP (Safari falls back to PNG). That is `PictureUnsupportedError`, and its Turkish message names Chrome.
   - A result over 1 MB is `PictureTooLargeError`.

The form keeps the prepared `Blob` and shows it through an object URL, which it revokes when the choice changes or the form closes. jsdom has no canvas, so the encoder is injected. Unit tests cover the checks, `fitWithin` and the form, and the real encoding is checked in Chrome.

*Alternative:* upload the original and convert in a Cloud Function. Rejected: it needs a server function, which the project has avoided so far, and the owner only needs Chrome.

### D8. "İndir" through `Content-Disposition`

Chrome ignores the `download` attribute on a cross-origin link, and the pictures are served from the Storage origin. So the file carries `Content-Disposition: attachment; filename="<id>.webp"` (D2), and "İndir" is a plain link to the picture's address.
- `<img>` ignores the header, so display is unaffected.
- The bucket needs no CORS setup.
- The name is the ID, which survives renames.

*Alternative:* `fetch` the file into a Blob and save it under the definition's name. Rejected for now: it needs a CORS configuration on the real bucket (`gcloud storage buckets update --cors-file`), one more manual production step. It is the fallback if a check shows that the emulator or the real endpoint ignores the header (Risks).

### D9. The `import-pictures` script

`npm run import-pictures -- --source <folder> [--dry-run] [--project <id> [--yes]] [--bucket <name>]`

- **Shared code.**
  - Archive extraction (7-Zip, temporary folders, cleanup on exit) moves from `build-art.ts` into `scripts/lib/archives.ts`, used by both scripts.
  - `target.ts` gains the Storage emulator (`FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199`) and a bucket: `--bucket`, or else `<projectId>.firebasestorage.app`. It passes `storageBucket` to the Admin app.
- **Matching against stored definitions.**
  - The script reads every card and word, whatever its status.
  - `ArtData` entries gain the stored `id`. `indexTargets` maps both the identity a name gives (`legend-<key>`, `cursed-<key>`, `tw-<key>`) and the current `nameKey` to the stored ID, as the definition imports match rows.
  - Alias rows of kind legend, cursed and word are checked against these definitions, and a row that names nothing stops the run. Asset rows and asset files are skipped and counted.
- **Planning.** Each matched definition is one of:
  - `add` when `picture` is absent
  - `has` when it is a string
  - `removed` when it is `null`
- **Writing, one definition at a time.** Each step is:
  1. Convert with `sharp`, as the build does.
  2. Upload with the D2 metadata.
  3. Run a transaction that sets `picture` only while the field is still absent. Otherwise it deletes the upload and counts the definition as `has` or `removed`.

  A run that stops halfway leaves finished definitions done, and the next run skips them.
- **Records.**
  - At the end, up to two `definitionChanges` records: `step: 'imported'`, `what: 'pictures'`, `by: null`. One is public for active and retired items, one is DM-only for drafts, with the same `items` shape as the definition imports.
  - The import record schema gets `what: 'definitions' | 'pictures'`, defaulting to `'definitions'` for older records.
  - The definitions' `changeId` is left alone. A run can stop before its records exist, and `changeId` only has to name the newest record of a DM step for the rules (`recordedBy`, `deleteRecordId`), which any string satisfies.
- **Report and dry run.** The report follows admin-scripts, "Picture import report and dry run". A dry run plans and reports without converting, uploading or writing.

### D10. `build-art` narrows to assets

- `build-art` no longer reads the CSV files. The card and word index goes, and set recognition already uses the catalog.
- Files that are not assets are counted as "left to `import-pictures`" instead of reported as unknown, because only the import knows the definitions. Alias rows of card or word kinds are skipped there.
- `artWrite.ts` writes only `cardbacks`, `packs` and `mascots`.
- `artInventory.test.ts` splits:
  - the assets are planned against the catalog
  - the cards and words are planned against definitions built from the repository CSV files, as a stand-in for the stored ones

  So a data or alias change that loses a picture still fails a test.

### D11. The log

`eventText.ts` adds a picture line to edit diffs:

| before | after | line |
| --- | --- | --- |
| `null` | a path | "Resim: eklendi" |
| a path | another path | "Resim: değişti" |
| a path | `null` | "Resim: kaldırıldı" |

- A publish or an add straight to active with a picture says "resimli".
- An import record with `what: 'pictures'` reads as "Import: N karta resim eklendi", or "N True Word'e", followed by the names.
- Players get the public record only, through the existing query.
- No new query or index is needed.

### D12. Development and tests

- **`firebase.json`** gets `storage: { rules: 'storage.rules' }` and `emulators.storage` on `127.0.0.1:9199`.
- **`package.json`:**
  - `emulators` and `test:emulator` use `--only auth,firestore,storage`
  - a new `import-pictures` script
- **App code.** `src/lib/firebase/storage.ts` creates the Storage instance, with `connectStorageEmulator` when `useEmulators` is set. Only it and `definitions/api.ts` import `firebase/storage`, and `docs/conventions.md` says so.
- **Tests:**
  - `tests/storage.rules.emulator.test.ts`, with `initializeTestEnvironment({ storage })` and the DM's profile seeded in Firestore, covers:
    - public reads
    - DM create, update and delete
    - the denials: players, signed-out users, wrong type, size or name, wrong ID prefix, and other paths
  - Firestore rules tests for the three `picture` states, the path pattern, a picture in a retire step (denied), and the records' `picture`.
  - The definitions API emulator tests add, replace and remove a picture, run a refused save that deletes its upload, and delete a draft with its file.
  - `tests/import-pictures.emulator.test.ts` covers:
    - it only adds
    - a removed picture stays removed
    - a renamed card is matched by ID
    - the records
    - a dry run writes nothing
- **`CLAUDE.md`** lists port 9199 among the ports to stop.

## Risks / Trade-offs

- **[Risk] Cloud Storage needs the Blaze plan on a real project.** → The owner accepted it. The pictures are about 50 MB, well inside the no-cost usage. Setting a budget alert is part of the README's production steps.
- **[Risk] Cross-service rules.** Each upload or delete reads one Firestore document, and deploying needs the IAM grant the CLI offers. Rules tests may behave differently in the emulator. → The first task proves the DM check with a rules test before anything else is built on it.
- **[Risk] `Content-Disposition` is not honored by the emulator or the real endpoint.** → Checked in the browser task. The fallback is D8's alternative, fetch plus a bucket CORS file, documented in the README.
- **[Risk] Unused files.** An interrupted save, or a delete that failed, leaves a file nothing points at. → They are small and harmless. A later cleanup could list files no definition names. Change records keep old paths, but the log never shows paths.
- **[Risk] The three-state `picture` is easy to break.** A full-document write would turn "absent" into `null`. → `runStep` writes `picture` only when it changes. Tests show that a text edit keeps the field absent and that the import skips `null`.
- **[Trade-off] Public addresses.** An address is guessable from a card's name plus a 40-bit hash. → The owner accepted public pictures, as the static ones are today.
- **[Trade-off] The download name is the ID, and opening a picture's address in a tab downloads it.** → Nothing in the app opens a picture in a tab.
- **[Trade-off] Safari cannot prepare pictures.** → By decision. The message names Chrome.
- **[Risk] A larger dev export.** About 50 MB more in `.firebase-emulator-data/` slows the export on stop. → Stop the emulators with SIGINT as `CLAUDE.md` says, and wait for the export to finish before anything else is stopped.

## Migration Plan

1. **Ship together, in one commit:** `storage.rules`, `firestore.rules`, `firebase.json`, the settings, the app, both scripts and the docs.
2. **Dev emulators.** The owner restarts `npm run dev`, which now starts the Storage emulator. With the owner's permission:
   - run `npm run build-art -- --source ~/Downloads`, which drops the old card and word files from `public/art/`
   - run `npm run import-pictures -- --source ~/Downloads` against the running emulators
   - stop the emulators so the export keeps the files
3. **Real project.** It does not exist yet. When it is created:
   1. Choose the Blaze plan and set a budget alert.
   2. Create the default bucket.
   3. Set `VITE_FIREBASE_STORAGE_BUCKET` in `.env.production.local`.
   4. Run `firebase deploy --only firestore:rules,storage`, granting the cross-service permission when asked.
   5. Run the definition imports, then `npm run import-pictures -- --source … --project <id>`.
4. **Rollback.** Revert the commit and rebuild with the old `build-art` to bring back the static card pictures.
   - The old schemas strip the unknown `picture` field, and the old rules allow DM steps on documents that have it, since those steps leave the key unchanged.
   - The files in Cloud Storage stay unused.
