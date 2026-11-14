# Tasks

Groups 3 and 6 build on `pay-lp-on-use`'s `closesAsUsed()` and its use step; that change is archived.

## 1. Data shapes and the picture crop

- [x] 1.1 Create `src/features/characters/schema.ts` with `characterSchema` (`uid`, `name` 1 to 40, `picture` as `characterPicturePathSchema` or `null`, `archived`, `createdAt`, `createdBy`), `CHARACTER_LIMITS`, `CHARACTERS_COLLECTION = 'characters'` and its converter (design D1). Verify with `schema.test.ts`: a valid character, a name of 0 and 41 characters, and another character's photo path
- [x] 1.2 Add the `character` picture target (folder `characters`) and `characterPicturePathSchema` to `src/features/definitions/picturePath.ts` (design D5). Verify with `picturePath.test.ts`
- [x] 1.3 Add `centerCrop(natural, aspect)`, the optional `aspect` on `PictureBox`, the optional source rectangle on `PictureCodec.encode`, and `CHARACTER_PICTURE_BOX` to `src/features/definitions/picture.ts` (design D5). Verify with `picture.test.ts`:
  - 1600 × 900 crops to 675 × 900 and scales to 600 × 800
  - 300 × 300 crops to 225 × 300 and is not enlarged
  - a portrait taller than 3:4 crops its height
  - card, word and set boxes keep their current results
- [x] 1.4 Add `usedOnCharacterId` to `holdingSchema` in `src/features/hands/schema.ts`, nullable and defaulting to `null`, with the refinement that only a holding closed as used carries it, and only with a `usedOn` (design D7). Verify with `schema.test.ts`: an old used holding without the field, a use on a character, a typed use, and the invalid combinations; update `src/test/holdingFixtures.ts`

## 2. Firestore and Storage rules for characters

- [x] 2.1 Add `characterPath()` and `match /characters/{characterId}` to `firestore.rules` (design D3). Verify with emulator rules tests in `tests/firestore.rules.emulator.test.ts`:
  - allowed: a player adds their own character, with and without a photo path; the DM adds one for a player and for the DM; the owner and the DM rename, change and remove the photo, archive and bring back; every signed-in user reads
  - denied: a player adds for another user; an owner without a profile; a name of 0 or 41 characters; an extra or missing field; another character's photo path; `archived: true` on create; a forged `createdBy` or `createdAt`; another player's edit; a change of `uid`, `createdBy` or `createdAt`; any delete; a signed-out read and write
  - allowed while a pack is open
- [x] 2.2 Add `match /characters/{characterId}/{file}` with `mayEditCharacter()` to `storage.rules` (design D4). Verify with tests in `tests/storage.rules.emulator.test.ts`:
  - allowed: the owner's and the DM's upload and delete; an upload for an ID with no character yet; a signed-out read
  - denied: another player's upload and delete; a PNG; a file over 1 MB; a badly named file; an ID that is not 20 letters and digits; a signed-out upload
- [x] 2.3 Verify `npm run test:emulator` passes

## 3. Card use on a character in the rules

- [x] 3.1 Add `'usedOnCharacterId'` to `closesAsUsed()`'s `onlyChanges` list, and add `usedCharacterMatches(next)` (design D7). Verify with emulator rules tests:
  - allowed: a use without the field (the previous app); a use with `null`; a use on an active character whose name equals `usedOn`; a use on another player's character
  - denied: an unknown character; an archived character; a `usedOn` that differs from the character's name; the field on a discard
- [x] 3.2 Verify `npm run test:emulator` passes, the `pay-lp-on-use` use tests included

## 4. Character steps and the provider

- [x] 4.1 Write `src/features/characters/api.ts`: `addCharacter`, `saveCharacter` and `setCharacterArchived` (design D3, D4). They take a `PictureChoice` and an injected `PictureStore`, upload first, delete the upload on a failed write and the replaced file on success, and throw `PhotoNeedsConnectionError` offline before an upload. Add `errors.ts` with the Turkish messages. Verify with `api.emulator.test.ts` against the emulators:
  - add with and without a photo
  - replace and remove the photo; the old file is deleted
  - a denied write deletes its upload
  - archive and bring back
  - an offline photo step throws before uploading
- [x] 4.2 Write `CharactersProvider`, `useCharacters()`, `useCharacterActions()` and the pure helpers `charactersOf()` and `characterGroups()` (design D2). Mount the provider in `src/app/App.tsx` after `UsersProvider`. Verify with `charactersContext.test.ts`:
  - order by `createdAt`
  - archived filtering
  - the groups: the holder first, then the "Oyuncular" order, with empty groups left out
- [x] 4.3 Add `TestCharactersProvider` and the `characters` option (characters and fake steps) to `renderApp` in `src/test/`, and a `src/test/characterFixtures.ts`. Verify that the existing unit tests still pass with `npm run test`
- [x] 4.4 Document the feature in `docs/conventions.md`: the project layout, the providers list, the `renderApp` options, the pictures section, and the Storage paths. Document it in `docs/domain.md`: the Character glossary entry, `characters/{characterId}` in the data model, and `usedOnCharacterId` on `userCards`. Verify that `npm run format:check` passes

## 5. The Karakterler tab

- [x] 5.1 Add `'characters'` to `HandTab` in `src/features/hands/HandsPage.tsx`, with the URL value `characters`, between "✦ True Words" and "🔒 DM notu" (design D9). Verify with `HandsPage.test.tsx`:
  - the tab order for a player and for the DM
  - reloading `?tab=characters`
  - the heading "Ayla — Karakterler"
  - the player note under the tab
- [x] 5.2 Write `CharacterTile` and `CharactersTab`: the tiles in the order added, the initial fallback, the empty text, "Karakter ekle" for the hand's user and the DM only, and the collapsed "Arşivlenen karakterler (<n>)" list with "Geri al" for the owner and the DM. Verify with component tests:
  - Ayla's and Bora's views of Ayla's tab
  - a live addition through `setCharacters`
  - a photo that fails to load shows the initial
  - the archived list hidden when empty
- [x] 5.3 Write `CharacterDetails`: photo, name and owner; "✎ Düzenle" and "Arşivle" for the owner and the DM. Show it in the side panel in a wide window, with `EmptyCardSlot` and "Bir karakter seç", and in a `Dialog` otherwise; mark the selected tile. Verify with component tests for the wide and narrow layouts, the empty slot, the marked tile, and a player without controls
- [x] 5.4 Write `CharacterFormDialog` with `FormField`, `PictureField` and `pictureDraft`, used for both adding and editing. Show the name check, the picture errors and the offline photo message in Turkish, and keep the fields on failure. Verify with component tests:
  - an empty name
  - add with a photo
  - edit that removes the photo
  - a failed save keeps the fields
  - the offline photo message
- [x] 5.5 Check the tab in the dev app against the emulators at 360 px and 1280 px, as Ayla and as the DM: add with a photo, edit, archive, bring back, and no horizontal scrollbar. Stop the dev server and the emulators afterwards, as `CLAUDE.md` describes

## 6. Choosing the character when using a card

- [x] 6.1 Change `closeHolding` in `src/features/hands/api.ts` to take the character choice (`none`, `character`, `typed`). For a character, read it in the transaction, throw `CharacterUnavailableError` when it is missing or archived, and write its current name with `usedOnCharacterId` (design D7). Map the error in `src/features/hands/errors.ts`. Verify with `api.emulator.test.ts`:
  - a use on a character
  - a typed use
  - a use with none
  - an archived character is refused, and the card stays in the hand
- [x] 6.2 Replace the text input in the use step of `HoldingDetails.tsx` with the `<select>`: "Karakter seçilmedi", one `<optgroup>` per owner from `characterGroups()`, and "Başka (yaz)…", which reveals the text field (design D8). Verify with `HoldingDialog.test.tsx` and `HandDetailsPanel.test.tsx`:
  - the group order for Bora's card
  - archived characters left out
  - a character added live shows in the list
  - "Başka (yaz)…" shows the field and sends the typed name
  - an empty typed name sends none
  - the unavailable-character message
- [x] 6.3 Verify in the İşlem Logu that a use on a character, a typed use and an old holding all show their names, with `eventText.test.ts` cases for a holding that has `usedOnCharacterId`

## 7. Integration

- [x] 7.1 Run `npm run check` and `npm run test:emulator`. Both must pass
- [x] 7.2 In the dev app as Ayla, Bora and the DM:
  - Ayla adds "Thorin" with a photo
  - Bora sees it live
  - Ayla uses a card on "Thorin"
  - the DM uses a card on a typed "Goblin şefi"
  - Ayla renames "Thorin", and the earlier log event keeps the old name

  Then stop every process on the project's ports and confirm with `lsof -nP -iTCP -sTCP:LISTEN`

## Workflow follow-up

- Archive `pay-lp-on-use` before applying this change.
- Archive this change with `/opsx:archive` once both checks pass.
- The next change, active effects on a character (`TODOS.md`), builds on `characters/{characterId}`.
