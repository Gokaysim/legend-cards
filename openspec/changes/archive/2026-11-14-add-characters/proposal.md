# Proposal

## Why

When a card is used, the app asks on which character as free text, so the same character gets spelled in different ways and nothing in the app knows who the characters are. The owner wants players to keep their characters in the app, each with a photo, and to pick the character from a list when they use a card. A character as a stored record is also the place where the next step, the active effects of used cards (`TODOS.md`), will be written.

## What Changes

- **Characters.** A new record for a character: an owner (a user), a name and an optional photo. A player adds and edits their own characters, and the DM anyone's, the DM's own included (for example NPCs). A user can have several characters. A character is never deleted. It is archived, and it can be brought back.
- **Character photos.** The owner or the DM uploads a photo. The app crops it to a 3:4 portrait from the center and stores it as a WebP, as card pictures are stored. Like card pictures, anyone who knows its address can open it.
- **A "🧝 Karakterler" tab on the hand screen.** It sits after "✦ True Words" and before the DM's "🔒 DM notu", and the URL keeps it. It shows that user's characters as photo tiles, with "Karakter ekle" for the owner and the DM. In a wide window, the selected character's details show in a "Seçili Karakter" panel beside the tiles, and in a dialog on narrow windows. The details hold the rename, photo and archive controls. Archived characters sit in a collapsed list under the tiles. The player note stays under the tab, as under every tab.
- **Choosing the character of a use.** The use step's free text field becomes a list:
  - "Karakter seçilmedi" (the default)
  - every active character at the table, grouped by owner, with the holder's group first
  - "Başka (yaz)…", which opens the old text field for enemies and NPCs that have no record
- **What a use records.** A holding closed as used records the chosen character's ID next to the name. The name is copied, so a later rename does not change history. The İşlem Logu keeps showing the name, as today. A typed name records no ID.
- **Not table actions.** Adding, editing and archiving characters is not listed in the İşlem Logu, and an open pack does not stop it.

## Capabilities

### New Capabilities

- `characters`: the character records, who may add, edit and archive them, their photos, and the hand screen's Karakterler tab with its details

### Modified Capabilities

- `card-holdings`:
  - the use step picks the character from a list, or takes a typed name
  - a used holding records the chosen character's ID with its name
- `player-notes`: the DM notu tab now comes after the new Karakterler tab, and a player's tabs include Karakterler
- `data-access-control`: character photos join the files anyone may open by their address
- `card-images`: the stored files the server accepts now include the character photos

## Impact

- **Depends on `pay-lp-on-use`.** That change rewrites the same use step and the same rule that closes a holding as used. This change builds on its version of the "Using a card" requirement. Finish and archive `pay-lp-on-use` first.
- **Data:**
  - a new collection `characters/{characterId}`: `uid`, `name`, `picture`, `archived`, `createdAt`, `createdBy`
  - `userCards/{holdingId}` gets `usedOnCharacterId`, written only when the holding closes as used; older holdings lack it, which reads as `null`
- **Firestore rules:** a new `match /characters/{characterId}` block, and the character check in `closesAsUsed()`, with emulator rules tests.
- **Storage rules:** a new `match /characters/{characterId}/{file}` block, with emulator rules tests.
- **App code:**
  - a new feature `src/features/characters/` (schema, api, provider, the tab, the details, the form)
  - `src/features/hands/` (the use step in `HoldingDetails.tsx`, `closeHolding` in `api.ts`, `schema.ts`)
  - `src/features/hands/HandsPage.tsx` (the new tab)
  - `src/features/definitions/` (the `character` picture target, and a crop in `preparePicture`)
  - `src/app/App.tsx` (the provider), and the test providers in `src/test/`
- **Docs:** `docs/domain.md` (glossary, data model, the use step) and `docs/conventions.md` (layout, providers, pictures).
- **Out of scope:**
  - active effects on a character, which is the next change
  - choosing a character when a True Word is used, which `pay-lp-on-use` leaves without one
  - character stats or sheets beyond a name and a photo
  - showing the character's photo in the İşlem Logu
