# Proposal

## Why

On the hand's Karakterler tab the characters take the wide column as a grid of small tiles, while the selected character's photo, name and active effects are squeezed into the 19.5rem "Seçili Karakter" panel at the right, or a dialog on a phone. The character is what the table looks at, so the owner asked for it to get the room and for the list to shrink, either as a narrow list or as tabs with photos. The owner chose the tabs with photos (option B).

## What Changes

- The character tiles become **character tabs**: a row of small tabs, each with a thumbnail of the photo (or the initial), the name and the "✦ <count>" of effects, followed by a "+ Karakter ekle" button for the hand's user and the DM. The row wraps on a phone.
- The selected character's details fill the whole tab under the row: a large photo at the left and the name, the owner, "✎ Düzenle" / "Arşivle" and "Aktif efektler" at its right. On a narrow window the photo shows above the details.
- The first active character is selected when the tab opens, and again when the selected one is archived. A character just added is selected.
- **BREAKING (UI)**: the "Seçili Karakter" side panel and the character dialog on narrow windows are removed. The details show in the tab on every width.
- The "Arşivlenen karakterler" list and the player note stay under the tab.
- Nothing changes in the data, the access rules, the forms or the effects themselves.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `characters`: "Karakterler tab", "Character tiles" (becomes character tabs), "Adding a character from the tab", "Character details beside the tiles" (becomes the selected character's view), "Editing in the details" and "Archived characters on the tab" change to the tabs layout.
- `character-effects`: "The effect count on a tile" moves to the character's tab.

## Impact

- `src/features/characters/CharactersTab.tsx`: the tiles become the tab row and the selected character's view.
- `src/features/characters/CharacterDetails.tsx`: a wide layout with the photo beside the details; `CharacterDialog` goes away.
- `src/features/characters/useHandCharacters.tsx`: no `isWide`, no dialog, no `selected` for a side panel; the default selection and selecting a new character.
- `src/features/hands/HandsPage.tsx`: no side panel on the Karakterler tab, so the tab takes the full width.
- Tests: `CharactersTab.test.tsx`, `CharacterEffects.test.tsx`, and the hand page tests that touch the panel.
- No Firestore, Storage or rules changes; no new dependencies.
