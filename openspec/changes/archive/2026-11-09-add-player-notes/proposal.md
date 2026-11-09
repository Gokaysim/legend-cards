# Proposal

## Why

The legacy app keeps general notes for each player ("Oyuncu Notları", one text box under the hand). The new app has card notes but no player notes: `add-card-holdings` and `add-legend-points-and-log` both left them for later. The Custom Card Draft and the Elixir Shop wait for data from the DM, so this small table feature can come first.

The legacy app had one DM-only user, so its single note box never had to decide who reads what. Online, the owner wants two notes: one the table shares, and one only the DM sees.

## What Changes

- **Two notes per player.**
  - **Oyuncu notu** (the player note):
    - The player writes their own, and the DM writes anyone's.
    - Every signed-in user reads it.
  - **DM notu** (the DM note):
    - Only the DM reads and writes it.
    - It is the first data in the app that players cannot see. **This deliberately departs** from "every signed-in user can see everything" in `docs/domain.md`, and the domain reference records the exception.
- **A "✎ Notlar" tab on the hand screen**, next to "♠ Kartlar" and "✦ True Words", kept in the URL (`?tab=notes`) like the True Words tab:
  - It shows the player note. The player sees their own note as an editable field, and the DM sees every player's that way. Other players see it as read-only text.
  - For the DM only, it also shows the DM note, marked as visible to the DM alone.
  - A player never sees the DM note's section, and the player's device never asks for it.
  - The DM note stays off the hand until the DM opens the tab, because the DM's screen may face the table. For the same reason, the tab's marker ("✎ Notlar •") shows only when the *player* note has text. It never hints that a DM note exists.
- **Editing like a card note:**
  - The note is saved when the field loses focus, and every device sees it live.
  - A change arriving from another device never overwrites what the user is typing.
  - Each note holds up to 2000 characters.
  - Below each note: who edited it last and when ("Son düzenleyen: Ayla · 9 Kas 14:32").
  - An emptied note shows "Not yok.".
- **Like card notes, player notes are not table actions.** They are not listed in the İşlem Logu. They stay editable while a pack is open. An edit made offline is saved when the connection returns.
- **Records.**
  - `playerNotes/{uid}`: the player note.
  - `dmNotes/{uid}`: the DM note.
  - Each document has the text and who changed it last and when.
  - Neither is ever deleted.
  - The profile at `users/{uid}` does not change.

Out of scope:
- **Note history.** Only the latest text and its last editor are kept. Earlier versions are not stored.
- **Notes on True Words.** Card notes stay as they are, and learned True Words get no notes.
- **Formatting.** A note is plain text with line breaks.
- **Telling a player that a note changed.** The tab marker shows that a note exists, not that it is new.

## Capabilities

### New Capabilities
- `player-notes`: the player note and the DM note. Covers:
  - who reads and writes each note, and the server rules that enforce it
  - the "✎ Notlar" tab on the hand screen and its marker
  - editing: saving, the length limit and the last editor
  - that notes are not logged and stay available while a pack is open

### Modified Capabilities
- `true-words`: the "True Words tab on the hand screen" requirement says the hand screen has *two* tabs. With "✎ Notlar" there are three, so the requirement names the True Words tab without counting the tabs.

`pack-shop` ("Notes … SHALL stay available" while a pack is open) and `activity-log` ("notes … SHALL NOT be listed") already speak of notes in general. They cover player notes as written, so they do not change.

## Impact

- **New code:** `src/features/player-notes/`:
  - the note schema
  - the api (saving either note)
  - a provider whose hooks subscribe to one player's notes while they are shown
  - the "✎ Notlar" tab panel
- **Changed code:**
  - `src/features/hands/HandsPage.tsx`: the third tab and its marker.
  - `src/app/screens.ts`: the tab's URL value.
  - `src/features/hands/HoldingDialog.tsx`: `useSavedField` moves to `src/lib/useSavedField.ts`, so the card note and the player notes share it.
  - `src/app/App.tsx`: the provider.
- **Rules:** in `firestore.rules`:
  - a block for `playerNotes`: every signed-in user reads; the player and the DM write
  - a block for `dmNotes`: only the DM reads and writes
  - for both: the fields, the 2000-character limit, the last editor and time, and no deletes

  `tests/firestore.rules.emulator.test.ts` gets matching tests, including a player denied reading any DM note.
- **Tests:**
  - unit tests for the tab, the panels and `useSavedField`
  - a test provider with a `renderApp` option
  - emulator tests for the api
- **Docs:**
  - `docs/domain.md`: the data model rows, the glossary entry, and the first exception to "everyone sees everything"
  - `docs/conventions.md`: the feature folder, the provider and the shared hook
- **Dependencies:** none new.
