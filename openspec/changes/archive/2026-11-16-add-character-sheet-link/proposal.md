# Proposal

## Why

The players keep their D&D 3.5 character sheets outside the app, for example in Google Docs or on Myth-Weavers. During a session they look for the link in chat. The owner wants each character in the app to carry a link to its sheet. The Karakterler tab then becomes the one place to open anyone's sheet.

On 2026-11-16 the owner chose who sees the link: every signed-in user, like the rest of a character. The link sits on the character itself. Who may open the sheet behind it is left to the sharing settings of the service that hosts it.

## What Changes

- **A character gets an optional sheet link.** A character has at most one link, a web address that starts with `http://` or `https://`, of at most 2048 characters. A character without one stays valid. Existing characters need no change.
- **The owner and the DM set it.** They add, change and remove the link in the character's form, "+ Karakter ekle" and "✎ Düzenle". The form gets an optional "Karakter kağıdı linki" field.
  - A link typed without its start, such as `docs.google.com/…`, gets `https://` in front.
  - A link the app cannot read as a web address, or one with another start (`javascript:`, `file:`), gets a Turkish message, and nothing is saved.
  - Emptying the field removes the link.
- **The server checks it.** The rules accept the link only from the owner or the DM, and only with an `http://` or `https://` start and at most 2048 characters.
- **Everyone opens it.** The selected character's view shows "📄 Karakter kağıdı" under the name and the owner, with the site's name next to it, such as `docs.google.com`. Choosing it opens the sheet in a new browser tab, and the hand stays open. A character without a link shows nothing there.
- **Like the other character fields.** Changing the link is not listed in the İşlem Logu. An open pack does not stop it, and without a connection it shows at once and is saved when the connection returns.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `characters`:
  - A new requirement, "Character sheet links", covers the link: what it holds, who changes it, what the server denies, and that everyone sees it.
  - "Adding a character from the tab" and "Editing in the details" now name the link field in the form.
  - "The selected character's view" shows "📄 Karakter kağıdı".

## Impact

- **Data.** `characters/{characterId}` gets an optional `sheetUrl`. No migration: a character without the field has no link.
- **Rules and tests.**
  - In `firestore.rules`, `validCharacter` accepts an optional `sheetUrl` with an `http://` or `https://` start and at most 2048 characters. The update rule lets the owner and the DM change it.
  - `tests/firestore.rules.emulator.test.ts` covers the allowed and the denied cases.
- **Code.**
  - `src/features/characters/schema.ts`: the field and its limit.
  - A new `src/features/characters/sheetUrl.ts`: reading a typed link (it adds `https://` and checks the start) and the site's name for the view.
  - `src/features/characters/api.ts`: `addCharacter` and `saveCharacter` write the link, and remove it.
  - `src/features/characters/CharacterFormDialog.tsx`: the field and its message.
  - `src/features/characters/CharacterDetails.tsx`: the "📄 Karakter kağıdı" link.
  - Tests next to each of these.
- **Docs.** In `docs/domain.md`, the `characters` row of the data table and the **Character** glossary entry.
- **Overlap with `add-initiative-tracker`.** That change is still in progress. It edits the same character schema and rule (`initiativeModifier`), and it modifies the requirements "Character records", "Who edits a character" and "Valid character records". This change builds on the code as it stands with `initiativeModifier`. It adds a new requirement instead of modifying those three, so the two changes can be archived in either order.
- **Out of scope.**
  - More than one link per character.
  - A preview of the sheet inside the app.
  - A link that only the owner and the DM see.
  - The link in other places, such as the character tabs or the İnisiyatif tab.
