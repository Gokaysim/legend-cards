# Tasks

## 1. The shared editing hook

- [x] 1.1 Move `useSavedField` from `src/features/hands/HoldingDialog.tsx` to `src/lib/useSavedField.ts` without changing its behavior, and import it in `HoldingDialog` (design D4).
  - Add `src/lib/useSavedField.test.ts`. It covers:
    - the draft kept while a live change arrives
    - the save on blur
    - no save when the text did not change
    - `normalize`
    - the stored value shown again after a failed save
  - In `docs/conventions.md`, list `useSavedField.ts` under `src/lib/`.
  - Verify: the new tests and the existing `HoldingDialog` tests pass with `npm run check`.

## 2. The data paths and their rules

- [x] 2.1 Create `src/features/player-notes/schema.ts` (design D1, D2):
  - the note schema: `text` up to 2000 characters, `updatedBy`, and `updatedAt` as a server time that may be `null` while pending
  - `NOTE_LIMITS`, with a comment to keep it in step with `firestore.rules`
  - one converter at module level
  - `hasNoteText`, which the tab marker and "Not yok." use

  The refs for `playerNotes/{uid}` and `dmNotes/{uid}` live in `api.ts` (task 2.3), because only `api.ts` may import `doc` from Firestore (`docs/conventions.md`). The schema is not strict, like every other schema in the app: the rules reject extra fields (task 2.2).

  Verify: `schema.test.ts` accepts a valid note and a pending time, and rejects a 2001-character text, a missing field, an empty editor and a time that is not a timestamp.
- [x] 2.2 In `firestore.rules`, above the catch-all, add the top-level `validNoteDoc(uid)` function and the `playerNotes/{uid}` and `dmNotes/{uid}` blocks (design D2).

  In `tests/firestore.rules.emulator.test.ts`, add tests for:
  - **Signed out:** reads and writes on both paths are denied.
  - **Player notes:**
    - any signed-in user reads one
    - Ayla writes her own
    - the DM writes Ayla's
    - Bora writing Ayla's is denied
  - **DM notes:**
    - Ayla reading her own or Bora's is denied
    - Ayla writing any is denied
    - the DM reads and writes one
  - **Limits:** 2000 `x` and 2000 `ğ` are allowed; 2001 characters are denied.
  - **Invalid writes, denied:**
    - a forged `updatedBy`
    - an `updatedAt` that is not the server time
    - an extra or a missing field
    - a note for a uid without a profile
    - a delete on either path
  - **Open pack:** a note write is allowed while `table/main` names an open pack.

  Verify: `npm run test:emulator` passes. If the `ğ` case fails, align the limit with what the rules count, as the design's risk says.
- [x] 2.3 Create `src/features/player-notes/api.ts` with `savePlayerNote(db, { uid, text, by })` and `saveDmNote(db, { uid, text, by })` (design D2), and the refs `playerNoteRef` and `dmNoteRef`:
  - a `setDoc` of the whole document
  - the text cut to 2000 code points
  - `updatedBy` set to `by`, the signed-in user, which the caller passes as `giveCard` does: feature code does not import Firebase Auth
  - `updatedAt` set to the server timestamp

  In `api.emulator.test.ts`, cover:
  - a save is read back with its editor
  - a longer text is cut to 2000 code points
  - a second save by the DM replaces the text and `updatedBy`
  - a player's `saveDmNote` rejects with `permission-denied`

  Verify: `npm run test:emulator` passes.
- [x] 2.4 Update `docs/domain.md` (design D6):
  - **Actors:** the first exception to "Every signed-in user can see everything".
  - **Data model:** the rows `playerNotes/{uid}` and `dmNotes/{uid}`, with who reads and writes them.
  - **Glossary:** "Oyuncu notu" and "DM notu", and the "Hand" entry mentions the Notlar tab.
  - **Deliberate decisions:** the private DM note, and the tab marker that ignores it.

  Verify: what the document says matches the requirements "Player note", "DM note" and "Notlar tab marker" in the change's `player-notes` spec.

## 3. The provider

- [x] 3.1 Create `playerNotesContext.ts` with `usePlayerNote(uid)`, `useDmNote(uid)` and `useNoteActions()`. Create `PlayerNotesProvider.tsx`, which injects Firestore hooks and subscribes to nothing itself, and mount it in `src/app/App.tsx` (design D3).
  - `useDmNote` builds its ref through a pure helper that returns `null` unless the user is the DM, so a player requests nothing.
  - Verify: a unit test shows the helper gives `null` for a player and for a loading profile, and the ref for the DM. `npm run check` passes.
- [x] 3.2 Add `src/test/TestPlayerNotesProvider.tsx`, and a `notes` option to `renderApp` (player notes and DM notes by uid, and fake saves that succeed by default), returning `setNotes`.
  - The test provider records every uid passed to `useDmNote`, so tests can show a player's screen never asks for a DM note.
  - In `docs/conventions.md`, describe in "Data access" the provider and the DM-only subscription, and in the test section the `notes` option.
  - Verify: a test renders a note through `renderApp` and sees `setNotes` update it live.

## 4. The Notlar tab

- [x] 4.1 Add `NOTES_TAB = 'notes'` to `src/app/screens.ts`. In `HandsPage.tsx`, extend `HandTab` and add the third tab, "✎ Notlar". `HandContent` subscribes to the player note with `usePlayerNote(profile.id)` for the marker (design D5).
  - The marker " •" shows while the player note has non-blank text. It is `aria-hidden`, with an `sr-only` "(not var)".
  - Verify in `HandsPage.test.tsx`:
    - the tabs read "♠ Kartlar", "✦ True Words", "✎ Notlar" in that order
    - a hand URL with `?tab=notes` opens the Notlar tab
    - the marker shows with a player note
    - no marker shows for a blank player note, for a DM note alone, or while the note loads
- [x] 4.2 Create `src/features/player-notes/HandNotes.tsx` with the "Oyuncu notu" section (design D5):
  - **Editable** for the hand's player and the DM: a textarea with `maxLength` 2000 and the legacy placeholder, saved on blur through `useSavedField` and `useNoteActions`.
  - **Read-only** for other players: the text with its line breaks, or "Not yok.".
  - **Last editor:** "Son düzenleyen: <name> · 9 Kas 14:32", "kaydediliyor…" while the time is pending, and "Bir oyuncu" for a missing profile.
  - **Errors:** "Not kaydedilemedi." for a failed save, and "Notlar yüklenemedi." for a failed load.

  Verify, in `HandNotes.test.tsx`, the scenarios:
  - "A player's own notes"
  - "Another player's notes"
  - "Live on another device" (with `setNotes`)
  - "Typing while the DM saves"
  - "Showing the last editor"
  - "An empty note"
- [x] 4.3 Add the "DM notu" section, labelled "🔒 Yalnızca DM görür": a component inside `<DmOnly>`, mounted only while the Notlar tab is open. It alone calls `useDmNote` (design D3, D5), and it shows "DM notu yüklenemedi." for a failed load.

  Verify in the tests:
  - **The DM's view:** the DM sees both notes, both editable.
  - **A player opens the Notlar tab:** the player sees no DM section, and the test provider records no `useDmNote` call.
  - **The DM shows a hand to the table:** on the Kartlar and True Words tabs, the DM note's text is not in the document, and `useDmNote` is not called.
- [x] 4.4 Update the "Project layout" in `docs/conventions.md` with `player-notes/` and what it holds. Verify: the listed files match the folder.

## 5. Integration

- [x] 5.1 Run the whole suite. Verify: `npm run check` and `npm run test:emulator` both pass.
- [x] 5.2 In the running app on the emulators, sign in as a player in one session and as the DM in another, and check at 360 px (the iframe check) and on a wide screen. Verify:
  - the player's own note saves on blur and appears live in the DM's session, with the last-editor line
  - the player cannot edit another player's note
  - the DM writes a DM note that the player's session never shows
  - in the Emulator UI's Firestore requests, no request for `dmNotes` comes from the player's uid
  - the marker follows the player note only
  - there is no horizontal scrolling
  - screenshots are saved
- [x] 5.3 Stop every process on the project's ports (CLAUDE.md): send SIGINT to the process group of `npm run dev` or the emulators, and wait for the export. Verify: `lsof -nP -iTCP -sTCP:LISTEN` shows nothing on 5173, 4173, 8080, 9099, 4000, 4400, 4500, 9150 or 5002.

## Workflow follow-up

- After the owner's review, archive the change with `/opsx:archive`, which syncs the specs.
- Commit only when the owner asks.
