# Design

## Context

See proposal.md for why. The current state that shapes the approach:

- **Card notes already exist.** `setHoldingNote` (`src/features/hands/api.ts`) is a plain `updateDoc`, not a transaction. So it is queued offline, and the last save wins. `HoldingDialog.tsx` edits it through a private hook, `useSavedField`, which:
  - keeps the user's draft while the field has focus
  - saves on blur only if the text changed
  - shows the saved value until the subscription confirms it
  - otherwise follows the stored value live

  This is exactly the editing behavior the player-notes spec asks for.
- **The hand screen has two tabs**, kept in `?tab=` (`HAND_TAB_PARAM`, `TRUE_WORDS_TAB` in `src/app/screens.ts`). `HandContent` in `src/features/hands/HandsPage.tsx` renders the tab list and the panels. The True Words panel comes from its own feature (`HandTrueWords`).
- **Everything is readable by every signed-in user today.** Firestore rules allow or deny whole documents: a rule cannot hide one field of a readable document.
- **The profile rule is already crowded.** `users/{uid}` allows a player to update their name and picture, and LP changes from four sources (`firestore.rules`).
- **Data for one screen** comes through hooks that a provider injects (`ActivityLogProvider`): the real provider subscribes through `useDocument`/`useCollection` while the screen is shown, and a test provider answers in unit tests.
- **`<DmOnly>`** renders its children only for a loaded DM profile, so a player never mounts what it wraps.

## Goals / Non-Goals

**Goals:**
- A player's device never sends a request for `dmNotes`, so a player cannot see the DM note even in the network tab, not only in the interface.
- One editing behavior for every note in the app, card notes included.
- No change to the profile document or its rule.

**Non-Goals:**
- Merging concurrent edits. The last save wins, as for card notes.
- Any new color token. The DM note is told apart by its label and an existing border token.

## Decisions

### D1. Two top-level documents per player

`playerNotes/{uid}` and `dmNotes/{uid}`, each `{ text, updatedBy, updatedAt }`. The document ID is the player's uid, so a note is read and written without a query.

- **Not fields on `users/{uid}`.** The DM note must be unreadable to players, and every profile is readable. The player note would also add a fifth exception to the profile rule.
- **Not one `notes/{uid}` document with both texts.** The rule cannot hide one of its fields.
- **Not a subcollection** (`users/{uid}/notes/dm`). Rules do not cascade to subcollections, so it saves nothing, and every path in the app is top-level today.
- **A missing document is an empty note** with no last editor. Nothing is created until the first save. Deletes are denied, so emptying a note saves `text: ''`.

### D2. One write, checked by one rules function

Saving is a `setDoc` of the whole document: the text cut to 2000 code points (as `setHoldingNote` cuts), `updatedBy` set to the signed-in user, and `updatedAt` set to the server timestamp. It is not a transaction, so it is queued offline like a card note. The table lock is not checked, because notes are not table actions.

The rules:

```
match /playerNotes/{uid} {
  allow read: if isSignedIn();
  allow create, update: if validNoteDoc(uid) && (isSelf(uid) || isDm());
  allow delete: if false;
}
match /dmNotes/{uid} {
  allow read: if isDm();
  allow create, update: if validNoteDoc(uid) && isDm();
  allow delete: if false;
}
```

`validNoteDoc(uid)` is a top-level function, named apart from the `validNote` inside the `userCards` block. It checks:
- the keys are exactly `text`, `updatedBy` and `updatedAt`
- `text` is a string of at most 2000 characters
- `updatedBy == request.auth.uid`
- `updatedAt == request.time`
- `exists(userPath(uid))`

It runs first because it is cheap. `isDm()` comes last, so a player's own note costs one lookup (the profile's existence), and the DM's costs two.

`isDm()` already requires a signed-in user, so `dmNotes` needs no separate `isSignedIn()`. The `HOLDING_LIMITS`-style constant `NOTE_LIMITS.text = 2000` sits next to the schema, with a comment to keep it in step with the rules.

### D3. A provider that injects hooks, and the DM note behind `<DmOnly>`

`PlayerNotesProvider` (in `App.tsx`) subscribes to nothing itself, like `ActivityLogProvider`. It provides:

- **`usePlayerNote(uid)`:** a live `Subscription<Note | null>` of `playerNotes/{uid}`.
- **`useDmNote(uid)`:** the same for `dmNotes/{uid}`. As a second guard, the real hook builds its ref only when `useIsDm()` is true. Otherwise it passes `null` and requests nothing, so a misplaced call cannot reach the server.
- **`useNoteActions()`:** `savePlayerNote(uid, text)` and `saveDmNote(uid, text)`.

Who subscribes:

- **`HandContent`** calls `usePlayerNote(profile.id)` while a hand is shown. The tab marker needs it on every tab, and it is one document.
- **The DM note panel** is a component rendered inside `<DmOnly>`, and only while the Notlar tab is open. It is the only caller of `useDmNote`. A player never mounts it, and the DM subscribes only while the tab is open.

`TestPlayerNotesProvider` answers from fixed maps. `renderApp` gets a `notes` option (player notes, DM notes, fake saves that succeed by default) and returns `setNotes`.

### D4. `useSavedField` becomes shared

`useSavedField` moves from `HoldingDialog.tsx` to `src/lib/useSavedField.ts`, unchanged, with its own unit tests: the draft kept during a live change, the save on blur, no save without a change, and the error path. `HoldingDialog` and the note panels import it.

A failed save shows the Turkish message "Not kaydedilemedi.", as the card note shows its own error, and the field shows the stored text again. Offline saves do not fail, because `setDoc` is queued.

### D5. The Notlar tab

- **The tab.** `screens.ts` gets `NOTES_TAB = 'notes'` next to `TRUE_WORDS_TAB`, and `HandTab` becomes `'cards' | 'true-words' | 'notes'`.
- **The label** is "✎ Notlar", plus " •" while the player note has non-blank text (`text.trim() !== ''`).
  - The dot is `aria-hidden`, with an `sr-only` "(not var)", so screen readers hear the marker too.
  - A loading or failed player-note subscription shows no marker.
- **The panel** (`HandNotes`, in `src/features/player-notes/`) has two sections.
  - **"Oyuncu notu":**
    - For the player and the DM, it is a textarea (`maxLength` 2000, placeholder "Oyuncunun genel notlarını buraya yaz…", from the legacy app).
    - For other players, it is the text with its line breaks kept, or "Not yok.".
  - **"DM notu"**, inside `<DmOnly>`:
    - a textarea with the label "🔒 Yalnızca DM görür" and an existing border token
    - the placeholder "Yalnızca senin göreceğin notlar…"
  - **Under each note:** "Son düzenleyen: <name> · <date>".
    - The name comes from the profiles (`profileName`), or "Bir oyuncu" when the profile is missing.
    - The date is `Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })`, giving "9 Kas 14:32". An absolute time needs no ticking timer and reads like the İşlem Logu.
    - While the server time is pending (`updatedAt: null`), it reads "kaydediliyor…".
- **Loading and errors.** While a note loads, the panel shows a spinner. On an error, it shows "Notlar yüklenemedi." for the player note and "DM notu yüklenemedi." for the DM note, each on its own.

### D6. Docs

- **`docs/domain.md`:**
  - In "Actors", the bullet "Every signed-in user can see everything" gets its first exception: the DM note.
  - The data model gets the rows `playerNotes/{uid}` and `dmNotes/{uid}`.
  - The glossary gets "Oyuncu notu" and "DM notu".
  - "Deliberate decisions" says that the DM note is private, and why the tab marker ignores it.
- **`docs/conventions.md`:**
  - the project layout gets `player-notes/`
  - "Data access" gets the provider and the DM-only subscription
  - the test section gets the `notes` option of `renderApp`
  - `src/lib/` gets `useSavedField.ts`

## Risks / Trade-offs

- **[Risk] Two people save the same player note at once, and one edit is lost.** → Only two people can write a player note, the player and the DM, and the last-editor line shows who saved last. This is the card note's trade-off as well. A history is out of scope.
- **[Risk] The DM opens the Notlar tab while the screen faces the table.** → The section is labelled "Yalnızca DM görür", it shows only on that tab, and the marker never reveals it. Opening it is the DM's choice. A shared link with `?tab=notes` shows a player only the player note.
- **[Risk] The rules and the client count characters differently.** The client cuts by code points, and `maxLength` counts UTF-16 units. If the rules counted bytes, a long Turkish note could pass the client and fail on the server. → A rules test saves a note of 2000 Turkish letters (`'ğ'.repeat(2000)`) as well as 2000 `x`, and denies 2001. If it fails, the limit is set by what the rules count.
- **[Trade-off] A role change exposes DM notes.** Someone made DM with `npm run set-role` reads every DM note, and someone made a player loses them at their next request. That is what the role means.

## Migration Plan

- **No data migration.** Both paths start empty, and a missing document reads as an empty note.
- **No new index.** Notes are read by document ID only.
- **Deploying.** The rules deploy together with the app. Rolling back the app leaves the documents unread and harmless. Rolling back the rules closes the two paths again under the closed catch-all.
