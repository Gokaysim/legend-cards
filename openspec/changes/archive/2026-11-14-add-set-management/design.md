# Design

## Context

The fixed set list lives in `src/features/cards/sets.ts` (`OFFICIAL_SETS`, `officialSet`, `setDisplayName`, `setOrder`). It is copied in `scripts/lib/cardCatalog.ts`, and `cardCatalog.drift.test.ts` keeps the two in step. Its readers:
- `art/artContext.ts`: cardback keys
- `cards/CardBrowser.tsx`: filter and sort order
- `cards/display.ts`, `activity-log/eventText.ts`, `hands/HandSummary.tsx`: set names
- `packs/catalog.ts`: groups, order, `isPandemoniumSet`, `groupMascotStem`, pack titles
- `definitions/CardFormDialog.tsx`: the set choice

Constraints:
- Cards store `setCode` as written ("The End Is Nigh"). The rules check only its length. Packs and draws store a `setCode` and a `packType` (`pandemonium`, `pandemoniumCursed` included) without checking them against a set.
- `ArtProvider` sits outside `AuthProvider` (`src/app/App.tsx`) and serves the built manifest. Set cardbacks and set Cardmakers come from `build-art` today. The manifest's `packs` section holds no set pack picture.
- Definition steps run in one transaction with a change record (`definitions/api.ts` `runStep`). The rules require the record in the same write (`changeId` plus `createdNow`), and a delete uses a deterministic record ID (`deleteRecordId`).
- `tableFree()` in `firestore.rules` is the open-pack guard.

Decisions made with the owner in explore: the scope, code-as-identity, the fields, pictures in Storage, the V1 table screen (design canvas https://claude.ai/artifact/AMbRyQkHSRYJGUQ6PWfgri), and the set import.

## Goals / Non-Goals

**Goals:**
- One source for sets at run time: the `sets` collection. No hard-coded set name, order or Pandemonium rule left in the app or the scripts.
- No migration of cards, packs, draws or log records: they keep their `setCode` and `packType`.
- Every set write is rule-checked and recorded like a definition step.

**Non-Goals:**
- Mechanic packs as data (a later change).
- Set statistics (a later change built on this screen).
- A server check that a card's `setCode` names a stored set, or that a deleted set is unused (see Risks).
- Per-set pack pictures (`<set>_std` and friends): none exist, and a set pack shows its set's cardback.

## Decisions

### D1. `sets/{setId}` with `setId = normalize(code)`
The document ID is the code normalized as card names are (`cards/text.ts` `normalize`: lower case, no accents, no spaces), for example `theendisnigh` or `kesqer`.
- Two sets with the same code are then impossible: creating an existing ID fails in the transaction, and the form says "Bu set zaten var".
- Rules cannot normalize accents. So the create rule checks only the shape, and the update rule forbids changing `code`. The client computes the ID.
- Alternative: a random ID with a unique `code` field. Rejected: uniqueness would rest on the client alone, and a lookup by code would need a query.

Fields:
- `code`: string 1–100, never changes
- `name`: string 1–100
- `aliases`: list of 0–10 strings, each 1–100
- `position`: int
- `packLayout`: `'standard' | 'pandemonium'`, named after the pack types it gives
- `cardback`, `mascot`: picture path or null. The field is absent when the set never had a picture (D6).
- `changeId`

Uniqueness of names and of spellings across codes and aliases is checked by the form, against the subscribed sets.

### D2. Order by an integer `position`; ↑/↓ swap two sets
- A new set gets `max(position) + 1`. A delete leaves a gap, which is harmless.
- "↑" and "↓" swap the positions of two neighbours in one transaction with one `moved` record. Both documents get that record's `changeId`.
- Readers sort by `position`, then by `setId` for a stable order if two positions ever tie.
- Alternatives:
  - Fractional positions: not needed for one-step moves.
  - One `order` array on a single document: one more document to keep in step with the sets, and its rules would be harder.

### D3. `setChanges/{changeId}` records, readable by every signed-in user
A record holds:
- `by`, `at`
- `step`: `added | edited | moved | deleted | imported`
- `setId`, `code`, `name`
- `fields`: names among `name`, `aliases`, `packLayout`, `cardback`, `mascot`
- `direction` for a move: `up | down`
- for an import, `added` and `pictured` lists of set names

Rules:
- A set create or update must set `changeId` to a record created in the same write (`createdNow`), whose `by` is the caller and whose `setId` matches.
- A delete must create the record `deleteRecordId(setId, beforeChangeId)`, the same pattern as definitions.
- A record has no update and no delete.
- Only the DM writes. The import writes with the Admin SDK.

Alternative: reusing `definitionChanges`. Rejected: its snapshot validation (`agreesWithTarget`) and its public/private split are about definitions, and sets are always public.

### D4. Writes in `src/features/sets/api.ts`, one transaction per step
`addSet`, `saveSet`, `moveSet` and `deleteSet` each:
- read the stored set or sets
- compare them with the snapshot the form or row started from, and throw `SetChangedError` on a difference ("not overwritten unseen")
- write the set or sets and the record together

Each step needs a connection, as `definitions` does. When `packLayout` changes and on a delete, the step calls `ensureTableFree`, and the rule requires `tableFree()`. Picture upload and old-file cleanup follow `definitions/pictureStore.ts`: upload before the transaction, delete the replaced file after it, and delete the uploaded file again if the transaction fails.

### D5. `SetsProvider` and a pure set index replace `cards/sets.ts`
`src/features/sets/` holds:
- `schema.ts`: zod schema and converter
- `SetsProvider.tsx` and `setsContext.ts`
- `index.ts`: a pure `setIndex(sets)` that returns `setOf(code)`, `setName(code)`, `setRank(code)` and `orderedSets`. It matches code and aliases by `normalize`. Unknown codes rank after every stored set.
- `api.ts`, `SetsPage.tsx`, `SetFormDialog.tsx`

`SetsProvider` sits inside `AuthProvider`, above `CardsProvider`, and subscribes to `sets` ordered by `position`.
- The former callers get the index from `useSetIndex()`, or as a parameter in pure code: `packs/catalog.ts` `shopCatalog(cards, sets)`, `eventText`, `display.ts`.
- While the sets load, the index is empty: names show as written and the shop has no groups, for the moment it takes. Alternative: blocking the app on sets. Rejected: the cards load at the same time anyway.

### D6. Set pictures in Storage at `sets/{setId}/{hash}.webp`
- The storage rule mirrors the card pictures: read for anyone, create and update for the DM with `validPicture(file)`, delete for the DM.
- The form reuses `PictureField` twice ("Cardback", "Cardmaker").
- `preparePicture` gains a size target: the card box 563 × 788 for a cardback, and a 480 px height limit for a Cardmaker. `OffscreenCanvas` WebP keeps the alpha channel.
- An absent field means the set never had a picture. `null` means the DM removed it, or added the set without one. The set import gives pictures only where the field is absent, the same marker as card pictures (design D3 of upload-card-and-word-pictures).

### D7. A `SetArtProvider` merges set pictures into `ArtContext`
`ArtProvider` cannot read Firestore before sign-in. So a small provider inside `SetsProvider` re-provides `ArtContext`:
- `backUrl(key)`: a key that resolves to a stored set gives that set's stored cardback (or `null`). `blessed` and `cursed` still come from the manifest.
- New `setMascotUrl(code)`: the set's Cardmaker or `null`. The group falls back to `cardmaker_shop` as today.

Callers of `useArt()` (spread backs, pack tiles, group tiles, the open-pack burst) keep their code. `groupMascotStem` goes away. Alternative: passing set pictures down through props. Rejected: it touches every picture site.

### D8. Pack layout replaces `isPandemoniumSet`
- `setPacks(set)` gives `['pandemonium', 'pandemoniumCursed']` for `packLayout === 'pandemonium'`, and Standard, Premium and Cursed otherwise. That includes codes with no stored set.
- Groups follow `setRank`. The "Pandemonium last" sort is removed.
- Pack titles already read "<name> Pack" and "<name> Cursed Pack" for those types.
- The short tile name of the `pandemonium` type becomes the set's name, not the literal "Pandemonium".
- Pack contents and thresholds for these types already use "Rares of the pack's set plus Blessed" (`catalog.ts`), so they need no change.
- Rules: no change. They never tied pack types to a set name.

### D9. The Setler screen
- `SCREENS` gains `{ id: 'sets', path: '/sets', label: 'Setler', icon: '◈', mascot: null }` after `library`.
- Layout V1 from the canvas: a table in a horizontally scrollable box on wide screens, and cards below 640 px.
- Card counts use `useDeckDefinitions('legend')` on the DM's device (every status) and `useCards()` on a player's device (active, not DM-only, after D3 of add-dm-only-cards).
- The delete guard uses the DM's count.

### D10. Scripts
- `data/sets.csv` holds Code, Name, Aliases, Packs, with the 12 current sets in the current order.
- `scripts/import-sets.ts` with `lib/setRows.ts` (parse and validate) and `lib/importSets.ts` (plan and write). It reuses `target.ts` (emulators by default, confirm a real project), `archives.ts` (7z), `artWrite.ts` conversion (sharp, quality 82; Cardmaker ≤480 px high) and `messages.ts`.
- Matching: `artFiles.ts` gains a plan mode `sets` that takes the stored sets and recognizes `<set>_cb` and `cardmaker_<set>` by code, name or alias, plus `image-aliases.csv` asset rows.
- Writes: the set documents (absent picture fields on add), the pictures through the Admin SDK bucket, and one `imported` record per run.
- `build-art`:
  - `CARDMAKER_STEMS` keeps only the screens' stems.
  - Any other `cardmaker_*` and any `*_cb` other than `blessed_cb` and `cursed_cb` count as "left to the set import".
  - The `setPack` kind and `SET_PACK_SUFFIXES` are removed.
  - So `build-art` needs no set list.
- `import-cards` reads the stored sets with the Admin SDK (also in a dry run) and passes their spellings to `cardRows.ts`. The fixed `OFFICIAL_SETS` leaves `cardCatalog.ts`, and the drift test keeps checking only `MECHANIC_PACKS` and `normalize`.

### D11. Activity log
`ActivityLogProvider` subscribes to `setChanges` ordered by `at`. `events.ts` maps each record to one event, and `eventText.ts` renders it in Turkish with the field labels "Ad", "Alias'lar", "Paketler", "Cardback" and "Cardmaker". Every user sees every set event.

## Risks / Trade-offs

- [The app runs before `import-sets`: no stored sets, so Pandemonium shows Standard/Premium/Cursed and names show as codes] → README setup order (`import-sets` before `import-cards`); `import-cards` warns about every unknown set code; the apply tasks seed the dev emulator data.
- [The "no card uses it" delete guard is client-side; a racing card edit could leave cards with a deleted set's code] → Such cards keep their code and show it as written, as for any unknown code; the DM can re-add the set with the same code.
- [Alias and name uniqueness are client-side] → One DM edits sets; a race needs two DM devices saving at once. The ID guarantees code uniqueness on the server.
- [Two concurrent moves can leave equal positions] → Ties sort by `setId`, and the next move writes distinct positions.
- [Extra reads in rules: `tableFree()` on layout changes and deletes, `getAfter` on the record] → Only on DM set writes, which are rare.
- [`build-art` output from before this change still holds set backs and Cardmakers in `public/art`] → They are ignored, because set lookups no longer read the manifest. The next `build-art` run drops them.

## Migration Plan

1. Land the code, rules and tests.
2. Dev emulators: run `npm run import-sets -- --source <archive folder>` once (the folder is asked for during apply), then `npm run build-art -- --source <archive folder>` to drop set pictures from `public/art`.
3. A real project: run the same `import-sets` with `--project` before or with the deploy. The owner will do this together with us later.
4. Rollback: revert the code. The `sets` and `setChanges` collections and the `sets/` files are then unused and harmless.
