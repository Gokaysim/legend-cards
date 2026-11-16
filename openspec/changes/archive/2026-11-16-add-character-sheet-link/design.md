# Design

## Context

- A character is a document at `characters/{characterId}` (`src/features/characters/schema.ts`). Its rule is `validCharacter` in `firestore.rules`. Both already carry an optional `initiativeModifier` from the in-progress `add-initiative-tracker`. That work is in the working tree but not committed.
- `addCharacter` and `saveCharacter` in `src/features/characters/api.ts` are plain writes.
  - A save without a new photo is queued offline, and the form closes at once.
  - `saveCharacter` writes only the fields that changed. It writes nothing when nothing changed.
- Today the app has no link that a user types. This is the first one, and it ends up in an `href`. That makes the link's start (its scheme) a security question, not only a matter of a clean format.

## Goals / Non-Goals

**Goals:**

- One way to store "no link". Existing characters stay valid without a migration.
- The server and the app agree on what a valid link is. A `javascript:` or `data:` link never reaches an `href`.
- A forgiving form. A link pasted without `https://` works.

**Non-Goals:**

- Checking that the link leads anywhere, or that the site is a character sheet service.
- Limiting the link to some sites. The table uses several, and the owner trusts the players.

## Decisions

### D1. An optional `sheetUrl` field; absent means no link

The character gets an optional `sheetUrl: string`. Removing a link deletes the field (`deleteField()`), so a character never stores `null`.

- **Why:** Existing characters have no such field. A required, nullable field (like `picture`) would make each of them invalid in the converter. Under `hasAll`, it would also deny every later update, an archive included. The optional field follows `initiativeModifier`, so absent is the only empty state.
- **Rejected:**
  - `sheetUrl: string | null`. That gives two empty states, so the rule and the schema would need to accept both.
  - A separate `characterSheets/{characterId}` collection. The owner chose to show the link to everyone, so separate read access is not needed.

### D2. A valid link: `http://` or `https://`, at most 2048 characters

- **Rules.** `validCharacter` accepts the key, and checks it when present:

  ```
  !('sheetUrl' in data) || (data.sheetUrl is string && data.sheetUrl.size() <= 2048 && data.sheetUrl.matches('https?://.+'))
  ```

  The update rule adds `'sheetUrl'` to `onlyChanges`. `affectedKeys()` counts a deleted key, so removing the link passes too. The owner-or-DM check on create and update already covers who may write it.
- **Schema.** `characterSchema` gets `sheetUrl: z.string().max(CHARACTER_LIMITS.sheetUrl).regex(/^https?:\/\/[^\n]+$/).optional()`, with `CHARACTER_LIMITS.sheetUrl = 2048`.
  - RE2's `.` and the JS `[^\n]` both reject only a line break, so the two checks agree.
  - Rules and schema keep each other's "keep in step" comments, as the other fields do.
- **Why 2048:** It matches `PHOTO_URL_MAX`, the app's other address limit. Long Google Docs addresses fit.
- **Why scheme only:** The scheme is the risk. Any `http(s)` address is safe in an `href` with `rel="noopener noreferrer"`. Anything stricter would turn away real sheet sites for no gain.

### D3. Reading a typed link: `src/features/characters/sheetUrl.ts`

A pure function, `readSheetUrl(text)`, returns one of these four:

- `{ kind: 'none' }` for an empty or blank field
- `{ kind: 'link', url }` with the normalized address
- `{ kind: 'wrong-start' }`
- `{ kind: 'invalid' }`

It works like this:

1. Trim the text. Empty → `none`.
2. If it starts with `http://` or `https://` (any letter case), keep it as it is.
   - If it starts with another scheme, return `wrong-start`. A scheme is letters, then `:`, and then something that is not a digit. The digit check keeps `localhost:5173/x` and `example.com:8080` as addresses.
   - Otherwise, put `https://` in front.
3. Parse it with `new URL(…)`. A throw, or an empty host → `invalid`. A protocol other than `http:` or `https:` → `wrong-start`.
4. Store `url.href`. It lowercases the scheme and the host and percent-encodes spaces, so it always passes D2's check. An `href` longer than 2048 → `invalid`.

A second function, `sheetSiteName(url)`, returns the host without a leading `www.`. A host in another alphabet stays in its ASCII (punycode) form, which is the safer form to show.

- **Why a pure module:** The form and the tests use it without Firebase. Every edge case is tested in one place.
- **Rejected:** Leaving the check to `<input type="url">`. The browser would refuse a link without `https://` in its own words and language, which goes against the forgiving form.

### D4. The form field

- **Where.** `CharacterFormDialog` gets a "Karakter kağıdı linki" field after the photo, filled with `character?.sheetUrl ?? ''`.
- **The input.** It is an `<input type="url">`, with `inputMode` and a phone keyboard to match, `autoComplete="url"`, `spellCheck={false}`, `maxLength={2048}` and the placeholder `https://…`.
  - The form gets `noValidate`, so the browser's own check stays out of the way.
  - A help line reads "İsteğe bağlı. Örneğin Google Docs ya da Myth-Weavers linki."
- **On save.** The text is read before anything else is checked, together with the name.
  - `wrong-start` shows "Link http:// ya da https:// ile başlamalı."
  - `invalid` shows "Bu geçerli bir link değil."
  - The message sits under the field, with `aria-invalid` and `aria-describedby`, and goes away when the text changes, as the name's does. Nothing is saved, and the fields stay.
- **The API.** `AddCharacterInput` and `SaveCharacterInput` get `sheetUrl?: string | null`. The value is already normalized by the form.
  - `addCharacter` writes the key only for a link.
  - `saveCharacter` treats `undefined` as "keep", which keeps today's callers and tests working. It writes the link when it differs from `character.sheetUrl`, and `deleteField()` for `null` when there was one.
  - The change goes into the same update as the name and the photo, so one save is one write. With no new photo, the save is queued offline like today.

### D5. The link in the view

- **What shows.** `CharacterDetails` shows the link in the name and owner block, under "Sahibi: …":
  - an `<a href={character.sheetUrl} target="_blank" rel="noopener noreferrer">` that reads "📄 Karakter kağıdı", with a screen-reader-only "(yeni sekmede açılır)"
  - then `sheetSiteName(…)` in muted text
- **The look.** The link uses the accent ink with an underline on hover and focus. Long hosts wrap with `break-all`, so a 360 px phone gets no horizontal scrollbar.
- **Where it shows.** It shows for everyone who sees the view: no `canEdit` check. A character without `sheetUrl` renders nothing there.
- **Where it does not show.** The archived list and the character tabs stay as they are.

## Risks / Trade-offs

- [A link to a malicious site] → It is the same risk as a link in chat. The owner trusts the players, the site's name shows next to the link, and `noopener noreferrer` keeps the new tab away from the app's window.
- [A sheet shared publicly by link is visible to every player, NPC sheets included] → This is the owner's choice. The hosting service's sharing settings decide who can open it. A short note in `docs/domain.md` tells the DM to keep NPC sheets private there.
- [Overlap with `add-initiative-tracker` in `schema.ts`, `firestore.rules` and the rules tests] → Both changes edit the same uncommitted lines. The implementation builds on the working tree as it stands and keeps `initiativeModifier` untouched. The spec delta adds requirements and modifies only form and view requirements that `add-initiative-tracker` does not touch, so the two changes can be archived in either order.
- [Converter strictness] → A stored link that fails the schema would make the converter throw for that character. The rules deny such a write, and the schema mirrors the rules exactly (D2), so only an admin write could cause it.

## Migration Plan

None. The field is optional, and existing characters have no link. The rules and the app ship together with the usual deploy.

Rolling back:

- **The app.** Stored links stay in place. The old schema is a plain `z.object`, which strips unknown keys, so an older app reads a linked character and only ignores the link.
- **The rules.** The old `validCharacter` has `hasOnly` without `sheetUrl`, so it would deny every update of a character that has a link, its archive included. Such characters would need their link removed by an admin script first.
