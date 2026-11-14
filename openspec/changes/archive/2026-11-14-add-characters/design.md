# Design

## Context

See proposal.md for the motivation. The current state that shapes the approach:

- **The use step.** `HoldingDetails.tsx` shows "Hangi karakter üzerinde? (isteğe bağlı)" as a text input. `closeHolding` (`src/features/hands/api.ts`) writes the trimmed text to `usedOn` (at most 100 characters), in one transaction. With `pay-lp-on-use`, the rule `closesAsUsed()` lets that close change `returnedAt`, `returnedBy`, `returnReason`, `usedOn`, `useCost` and `useEntryId`. Its payment fields are written only on the close, and a missing field reads as `null`. The log shows `" <usedOn> üzerinde"` (`activity-log/eventText.ts`).
- **The hand screen's tabs.** `HandsPage.tsx` has `HandTab = 'cards' | 'true-words' | 'dm-note'`, with each tab's value in `?tab=`. In a wide window, `showsPanel` puts the selected card's or word's details in a sticky panel beside the hand.
- **Pictures.** `preparePicture` (`definitions/picture.ts`) scales a PNG, JPEG or WebP file into a box and encodes it as WebP, checking the size and naming it by its content hash. `picturePath(target, id, hash)` builds `<folder>/<id>/<hash>.webp`. `PictureStore` uploads and deletes. The set steps (`sets/api.ts`) upload first, then write the document, delete the new upload when the write fails, and delete the replaced file when it succeeds. `SetFormDialog` reuses `PictureField`, `pictureDraft` and `FormField` from `definitions/`. `useArt().pictureUrl(path)` builds a public address without a request, because `storage.rules` let anyone read the pictures.
- **Storage rules** check the DM through `firestore.get()` on the profile (a cross-service read).
- **Notes** are the closest data path: plain `setDoc` writes, queued offline, not table actions, not in the log.

## Goals / Non-Goals

**Goals:**

- Characters as a small, self-contained feature that the next change (active effects) can attach to by character ID.
- Reuse the picture pipeline and the set steps' upload order rather than build a second one.
- No migration, and no break for a browser tab still on the previous version.

**Non-Goals:**

- A custom combobox with photos in the use step.
- Moving the shared picture code out of `definitions/`. Sets already import it from there, and moving it is a separate refactor.

## Decisions

### D1. A top-level `characters/{characterId}` collection

Each document has these fields:

- `uid`: the owner
- `name`: 1 to 40 characters, trimmed
- `picture`: a path `characters/<characterId>/<hash>.webp`, or `null`. Unlike definitions, the field is always present, because there is no import that must tell "never had one" from "removed".
- `archived`: a boolean
- `createdAt` and `createdBy`

The ID is a Firestore auto ID, made on the device before the write, so a photo can be uploaded under it first (D4).

- **Why top-level:** the use step lists every character at the table, so the whole collection is one query. The project keeps its collections flat (`playerNotes/{uid}`, `userCards/{id}`).
- **Alternative:** `users/{uid}/characters/{id}`. Rejected: listing everyone needs a collection-group query and its own rules. The `users/{uid}` rules are also already crowded.

### D2. One provider, one subscription

`CharactersProvider` (in `App.tsx`, after `UsersProvider`) subscribes to the whole collection once. The table has a handful of players with a few characters each. It exposes:

- `useCharacters()`: every character, archived ones included
- `useCharacterActions()`: `addCharacter`, `saveCharacter`, `setCharacterArchived`

Pure helpers derive the views:

- `charactersOf(characters, uid, { archived })`: one user's characters in the order added (by `createdAt`, then ID)
- `characterGroups(characters, profiles, holderUid)`: the use step's groups

`TestCharactersProvider` and a `characters` option on `renderApp` follow the other providers.

- **Alternative:** subscribing per hand on the tab. Rejected: the use step needs all characters anyway, and on any tab.

### D3. Plain writes, not transactions

A character add, rename, archive or restore is a `setDoc` or `updateDoc`, like a note. It is queued offline and shown at once (spec: "Characters without a connection"). Nothing about a character depends on other documents' current state, so a transaction would only add the offline failure.

The Firestore rules (`match /characters/{characterId}`) are:

- **read:** `isSignedIn()`
- **create:** `isSelf(data.uid) || isDm()`, and also:
  - exactly the six fields
  - `exists(userPath(data.uid))`
  - a name of 1 to 40 characters
  - a picture that passes `validPicture(data, 'characters', characterId)`
  - `archived == false`
  - `createdAt == request.time`
  - `createdBy == request.auth.uid`
- **update:** `isSelf(resource.data.uid) || isDm()`, with `onlyChanges(['name', 'picture', 'archived'])` and the same checks on name and picture
- **delete:** `false`

There is no `tableFree()`: character changes are not table actions.

### D4. Photos: upload first, then the document, as the set steps do

`addCharacter` and `saveCharacter` take a `PictureChoice` (`keep`, `new`, `remove`) from the form's `pictureDraft`. With a new photo, a step runs in this order:

1. Make the ID (on add).
2. Upload `characters/<id>/<hash>.webp` through the injected `PictureStore`.
3. Write the document and wait for the server to confirm it.
4. When the write fails, delete the upload. When it succeeds, delete the replaced file.

Each delete goes through `forget`, so a failed delete leaves only an unused file. Before the upload, a step with a new photo checks `navigator.onLine`. Offline, it throws a typed error that the form shows as "Fotoğraf yüklemek için bağlantı gerekiyor." and keeps its fields. Without a new photo, the step does not wait for the server (D3).

The Storage rules add `match /characters/{characterId}/{file}`:

- **read:** `true`
- **create and update:** need all of:
  - `characterId.matches('[A-Za-z0-9]{20}')`
  - `validPicture(file)`
  - `mayEditCharacter(characterId)`
- **delete:** `mayEditCharacter(characterId)`

`mayEditCharacter` is true for a signed-in user when one of these holds:

- the character does not exist yet
- its `uid` is the user
- the user is the DM

- **Why "does not exist yet":** an upload comes before the document, as for sets and definitions. The Firestore rule then binds the photo to its owner, because the picture path must name this very character.
- **Alternative:** create the document first, then upload, then set `picture`. Rejected: it means three writes and a character that can exist without the photo the user chose. It also makes the offline queue and a failed upload harder to explain.

### D5. A centered 3:4 crop in `preparePicture`

`PictureBox` gets an optional `aspect` (width ÷ height). `CHARACTER_PICTURE_BOX` is `{ width: 600, height: 800, aspect: 3 / 4 }`. A new pure function `centerCrop(natural, aspect)` returns the largest centered rectangle with that aspect. `fitWithin` then scales the rectangle, never enlarging it. `PictureCodec.encode` gains an optional source rectangle. `browserCodec` passes it to `createImageBitmap(file, sx, sy, sw, sh, { resizeWidth, resizeHeight, resizeQuality: 'high' })`. Cards, words and sets pass no aspect and keep their behavior.

`PictureTarget` gains `'character'` with the folder `characters`, and `characterPicturePathSchema` validates the stored path.

- **Alternative:** a crop editor. Rejected for now: the owner accepted an automatic center crop.

### D6. Photos are public by address, like card pictures

`useArt().pictureUrl(path)` builds a public address without a request, and an `<img>` sends no auth. Making photos readable only to signed-in users would need a `getDownloadURL` request per photo. That URL carries a token that anyone holding it can use anyway. The protection is the same as for card pictures: an address holds a random 20-character ID and a content hash, and only signed-in users can read the documents that hold the addresses.

### D7. A use records `usedOnCharacterId` beside the copied name

The use step's choice reaches `closeHolding` as one of:

- `{ kind: 'none' }`
- `{ kind: 'character', characterId }`
- `{ kind: 'typed', name }`

For a character, the transaction reads `characters/{id}`. A missing or archived character throws `CharacterUnavailableError`, which shows "Bu karakter artık seçilemiyor. Başka bir karakter seç.". The close writes `usedOn` (the character's current name) and `usedOnCharacterId`. A typed name writes `usedOn` only. The log keeps reading `usedOn`, so it needs no change.

`usedOnCharacterId`, like `useCost`, is written only on the close. Every other holding lacks it, and the schema reads a missing one as `null`. A refinement allows it only on a holding closed as used, and only with a `usedOn`.

In `firestore.rules`, `closesAsUsed()` adds `'usedOnCharacterId'` to its `onlyChanges` list and checks `usedCharacterMatches(next)`. A missing or `null` ID passes. Otherwise the character must exist, must not be archived, and its `name` must equal `next.usedOn`.

- **Why optional rather than required:** a browser tab still on the previous version closes holdings without the field and keeps working. `pay-lp-on-use` already has a breaking rules change. This one need not add another.
- **Alternative:** store only the ID and look up the name when showing it. Rejected: closed holdings never change, and the log must keep the name the table saw at the time.

### D8. A native `<select>` with one `<optgroup>` per owner

The use step's list is a `<select>`:

- `Karakter seçilmedi` (value `''`)
- one `<optgroup label="<owner name>">` per user with active characters: the holder first, then the others in the "Oyuncular" order (by name)
- `Başka (yaz)…` (value `typed`), which reveals the old text input under it

A native control is accessible, uses the phone's own picker, and needs no new component.

- **Alternative:** a custom listbox with photos. Deferred: it may come with the active effects change, when the character becomes more visible.

### D9. The tab and its panel

`HandTab` gains `'characters'`, with the URL value `characters`, placed before `dm-note`. The tab renders `CharactersTab` from `src/features/characters/`. It shows:

- the tiles
- "Karakter ekle" for the hand's user and the DM
- the archived list in a `<details>` element

The selected character is component state, not in the URL, as for cards. In a wide window, the existing side panel shows `CharacterDetails`, with `EmptyCardSlot` reading "Bir karakter seç". In a narrow window, the details open in a `Dialog`. `CharacterFormDialog` follows `SetFormDialog`: `FormField`, `PictureField` and `pictureDraft` from `definitions/`, and the cropped preview.

A tile is a button with a 3:4 frame: the photo through `usePicture(pictureUrl(path))`, or the name's first letter (`toLocaleUpperCase('tr')`) on `pane-raised`. A grid of `minmax(7rem, 1fr)` columns fits 360 px.

## Risks / Trade-offs

- [Anyone signed in can upload a photo under a character ID that does not exist yet] → IDs are random, a file is at most 1 MB, and an unused upload is only an orphan file. The rule cannot tie the upload to a document that is created later.
- [Photo addresses are public] → The addresses are unguessable and are given only to signed-in users. The tab's form says "Karakter fotoğrafı" rather than suggesting a personal photo.
- [`closesAsUsed()` gets one more `get()`] → A close already reads the card, the profile, the table and the ledger entry. The transaction's limit of 20 document reads in rules leaves room.
- [Two characters with the same name in the list] → The owner's group label tells them apart. Names are not required to be unique.
- [The change depends on `pay-lp-on-use`] → Its tasks run after that change is archived. If it is dropped, D7 changes only the `onlyChanges` list of `closesAs('used')`.

## Migration Plan

- No data migration: existing holdings lack `usedOnCharacterId`, which reads as `null`, and there are no characters yet.
- Deploy `firestore.rules`, `storage.rules` and Hosting together, when the owner asks for a deploy. No new composite index: the provider reads the whole collection and sorts on the device.
- Rollback: the previous app ignores `characters` and the new holding field. Older rules would deny closes that carry `usedOnCharacterId`, so roll back the app together with the rules.
