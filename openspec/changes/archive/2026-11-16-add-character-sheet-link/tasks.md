# Tasks

The in-progress `add-initiative-tracker` has uncommitted edits in `schema.ts`, `firestore.rules` and `tests/firestore.rules.emulator.test.ts`. Build on them as they stand. Leave `initiativeModifier` and that change's other hunks alone.

## 1. Data and rules

- [x] 1.1 In `src/features/characters/schema.ts`, add `CHARACTER_LIMITS.sheetUrl = 2048` and an optional `sheetUrl` to `characterSchema`: a string of at most that size that matches `/^https?:\/\/[^\n]+$/` (design D1, D2). The comment points to `validCharacter` in `firestore.rules`. Verify in `schema.test.ts` that the schema reads:
  - a character with an `https://` link, and one with an `http://` link
  - a character without the field
  - and that it rejects `javascript:alert(1)`, `HTTPS://x`, a link with a line break, and a link of 2049 characters
- [x] 1.2 In `firestore.rules`, the `characters` match (design D2):
  - `validCharacter` accepts an optional `sheetUrl`: a string of at most 2048 characters that matches `'https?://.+'`
  - the update rule's `onlyChanges` list gains `'sheetUrl'`
  - the comments above the match and above `validCharacter` name the link and point back to `schema.ts`
- [x] 1.3 In `tests/firestore.rules.emulator.test.ts`, in `characters (characters/{characterId})`, add these cases, and verify with `npm run test:emulator`:
  - allowed:
    - Ayla adds a character with a link
    - Ayla adds, changes and removes (`deleteField()`) the link of her own "Thorin", archived as well
    - the DM does the same on Ayla's "Thorin" and on the DM's own character
    - a character without the field is still updated (renamed, archived)
  - denied:
    - Bora adds, changes or removes the link of Ayla's "Thorin"
    - Ayla stores `javascript:alert(1)`, `ftp://x`, `https:/x`, a link of 2049 characters, `null`, or a number as the link, on create and on update

## 2. Reading a typed link

- [x] 2.1 Add `src/features/characters/sheetUrl.ts` with `readSheetUrl(text)`, returning `none`, `link` (with the normalized `href`), `wrong-start` or `invalid`, and `sheetSiteName(url)` (design D3). Verify in a new `sheetUrl.test.ts` that:
  - an empty or blank text is `none`
  - `docs.google.com/document/d/abc` becomes `https://docs.google.com/document/d/abc`
  - `  HTTPS://Docs.Google.com/x  ` becomes `https://docs.google.com/x`
  - `http://example.com` keeps `http`, and `localhost:5173/x` and `example.com:8080` get `https://`
  - `javascript:alert(1)`, `mailto:a@b.c`, `ftp://x` and `data:text/html,x` are `wrong-start`
  - `https://` is `invalid`, and so is a link whose `href` would pass 2048 characters
  - a link with a space keeps it as `%20`
  - `sheetSiteName` gives `docs.google.com` for `https://docs.google.com/x` and `myth-weavers.com` for `https://www.myth-weavers.com/sheet.html#id=1`
  - every `link` result passes `characterSchema`'s `sheetUrl` check

## 3. Writing the link

- [x] 3.1 In `src/features/characters/api.ts` (design D4):
  - `AddCharacterInput` and `SaveCharacterInput` get `sheetUrl?: string | null`
  - `addCharacter` writes `sheetUrl` only for a link
  - `saveCharacter` keeps the link for `undefined`, writes a link that differs from `character.sheetUrl`, and writes `deleteField()` for `null` when the character had one, all in the same update as the name and the photo

  Verify in `api.emulator.test.ts` with `npm run test:emulator`:
  - `addCharacter` with a link stores it, and without one stores no field
  - `saveCharacter` adds, changes and removes the link, and leaves no `sheetUrl` key after the removal
  - a save that only renames keeps the link
  - a save with the same link writes nothing
  - Bora's save of Ayla's link is denied

## 4. The form

- [x] 4.1 In `src/features/characters/CharacterFormDialog.tsx`, add the field after the photo (design D4):
  - the label "Karakter kağıdı linki", filled with the stored link
  - `type="url"`, `inputMode="url"`, `autoComplete="url"`, `spellCheck={false}`, `maxLength={2048}`, and the placeholder `https://…`
  - the help line "İsteğe bağlı. Örneğin Google Docs ya da Myth-Weavers linki."
  - `noValidate` on the form

  On save, read the link with `readSheetUrl` together with the name check:
  - `wrong-start` shows "Link http:// ya da https:// ile başlamalı."
  - `invalid` shows "Bu geçerli bir link değil."
  - either message sits under the field with `aria-invalid` and `aria-describedby`, and clears when the text changes, and nothing is saved
  - otherwise, pass `sheetUrl` (the link, or `null`) to `addCharacter` or `saveCharacter`
- [x] 4.2 In `CharactersTab.test.tsx`, under "the character form", add these cases, and verify with the unit tests:
  - adding "Thorin" with `docs.google.com/document/d/abc` calls `addCharacter` with `sheetUrl: 'https://docs.google.com/document/d/abc'`
  - "✎ Düzenle" shows the stored link in the field
  - emptying it calls `saveCharacter` with `sheetUrl: null`
  - `javascript:alert(1)` shows the start message, keeps the text, and calls nothing
  - `https://` shows "Bu geçerli bir link değil."
  - a link-only change offline closes the form at once, as a name change does

## 5. The view

- [x] 5.1 In `src/features/characters/CharacterDetails.tsx`, show the link under "Sahibi: …" when `character.sheetUrl` is set (design D5):
  - an `<a target="_blank" rel="noopener noreferrer">` that reads "📄 Karakter kağıdı", with a screen-reader-only "(yeni sekmede açılır)"
  - then `sheetSiteName(…)` in muted text that wraps on a narrow screen
  - shown to every user, not only those who may edit
- [x] 5.2 In `CharactersTab.test.tsx`, under "the selected character's view", add these cases, and verify with the unit tests:
  - Bora sees "📄 Karakter kağıdı" on Ayla's "Thorin" with its link, with `target="_blank"` and `rel` containing `noopener` and `noreferrer`, and the text "docs.google.com"
  - Ayla's "Kuzgun" without a link shows no such link
  - a link added on another device shows without a reload

## 6. Docs

- [x] 6.1 Update `docs/domain.md`, and verify by reading the changed passages against the delta spec:
  - the `characters/{characterId}` row of the data table: the optional `sheetUrl` (an `http(s)` address of at most 2048 characters, `add-character-sheet-link`), and that the owner and the DM set and remove it
  - the **Character** glossary entry: a character can carry a link to its sheet, which every signed-in user sees and opens in a new tab
  - a short note that the hosting service's sharing settings decide who can open a sheet, so the DM keeps NPC sheets private there

## 7. Integration

- [x] 7.1 Run `npm run check` and `npm run test:emulator` (after `. ~/.nvm/nvm.sh && nvm use`). Verify both pass.
- [x] 7.2 In the running app against the emulators, in Chrome:
  - as Oyuncu 1, add a link without `https://` to a character through "✎ Düzenle"
  - check that the view shows "📄 Karakter kağıdı" with the site's name, and that it opens in a new tab
  - as Oyuncu 2, check that the link shows on Oyuncu 1's character without a reload, and that there is no "✎ Düzenle"
  - as the DM, remove the link, and check that it is gone on both players' windows
  - try `javascript:alert(1)` and check the Turkish message
  - check the view and the form at 360 CSS pixels with a long link, with no horizontal scrollbar
- [x] 7.3 Stop the dev server and the emulators as `CLAUDE.md` describes, with SIGINT to the process group and waiting for the export. Verify with `lsof -nP -iTCP -sTCP:LISTEN` that no project port is still held.

## Workflow follow-up

- Archive the change with `/opsx:archive` after the owner reviews the result, and sync the delta specs into `openspec/specs/`. It can be archived before or after `add-initiative-tracker`.
