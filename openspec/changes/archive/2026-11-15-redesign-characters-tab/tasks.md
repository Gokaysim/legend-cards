# Tasks

## 1. The selected character's view

- [x] 1.1 Rework `CharacterDetails` (design D2): drop the `layout` prop; portrait in a first column (`sm` 16rem, `lg` 20rem, centered at `max-w-56` above `sm`), the name as a heading, "Sahibi", "✎ Düzenle" / "Arşivle" and the `effects` node in the second, left-aligned. Delete `CharacterDialog`. Verify: `npm run typecheck` reports errors only at the call sites fixed in groups 2 and 3.

## 2. The character tabs

- [x] 2.1 Replace `CharacterTile` and the tile grid in `CharactersTab` with the tab row (design D1): `role="tablist"` `aria-label="Karakterler"`, each character a `role="tab"` with `aria-selected`, `aria-controls`, a `w-8` `CharacterPortrait size="small"`, the truncated name and "✦ n" (with the `sr-only` ", n aktif efekt"), the gold border when selected, `flex-wrap`; then the "+ Karakter ekle" button for `canEdit`. Under the row, a `role="tabpanel"` labelled by the selected tab that holds a `view` node passed in. Keep the heading, the count, the empty state (design D5) and the archived `<details>` under the view. Verify: the component renders in the tests of 3.3.

## 3. The hook and the hand page

- [x] 3.1 Rework `useHandCharacters` (design D3, D4): signature `(profile, held)`, return `{ content, overlays }`; selection `string | null` with the shown character `active.find(...) ?? active[0] ?? null`; pass `<CharacterDetails …/>` of it as the tab's view; no `CharacterDialog`; `pendingAdd` set from a new `onSaved` prop of `CharacterFormDialog` (adds only, called just before `onClose` on a successful or queued save), resolved to the first new active ID on a later render, cleared on a late failure. Verify: `npm run typecheck` passes.
- [x] 3.2 In `HandsPage.HandContent`, call `useHandCharacters(profile, held)`, set `showsPanel = isWide && (tab === 'cards' || tab === 'true-words')`, and remove the "Seçili Karakter" `HandDetailsPanel`. Update the `HandContent` doc comment. Verify: `npm run typecheck` passes and `src/features/hands/HandsPage.test.tsx` passes.
- [x] 3.3 Rewrite the tile and details tests in `src/features/characters/CharactersTab.test.tsx` for the spec scenarios: tabs in the order added with "+ Karakter ekle" only for the owner and the DM; the first character selected and shown on open; selecting another tab switches the view and the mark; no "Seçili Karakter" panel and no dialog at 1280 and on a narrow window (`useWideWindow` both ways); the view shows the first character after the selected one is archived on another device (`setList`); a character just added (no photo, queued) becomes selected; the initial letter on a tab without a photo; no editing controls for another player. Keep the form, archived-list and offline tests, adapted. Verify: `npx vitest run src/features/characters` passes.
- [x] 3.4 Update `src/features/characters/CharacterEffects.test.tsx` for the count on a character's tab and for the effects in the view instead of the panel. Verify: `npx vitest run src/features/characters` passes.
- [x] 3.5 Update the comments and doc references that name the tiles, the panel or the dialog (`useWideWindow.ts`'s description in `docs/conventions.md` if it lists the characters, the "Character" glossary entry in `docs/domain.md` if it describes the layout). Verify: `grep -rn "Seçili Karakter\|CharacterDialog\|CharacterTile" src docs` finds nothing stale.

## 4. Integration checks

- [x] 4.1 Run `npm run check` and `npm run test:emulator`. Verify: both pass.
- [x] 4.2 In the browser against the dev emulators, open a hand's Karakterler tab as a player and as the DM: the first character shows full width with the photo at the left, switching tabs works, "✎ Düzenle", "Arşivle", "+ Efekt ekle" and "Geri al" still work, and adding a character selects it. Ask the owner before any step that changes their dev data. Verify: each step behaves as the specs say.
- [x] 4.3 Check the tab 360 CSS pixels wide in a fixed iframe: the tab row wraps, the photo shows above the name, no dialog opens, and `scrollWidth` equals `clientWidth`. Verify: no horizontal scroll.
- [x] 4.4 If TODOS.md lists "karakterler sayfasinda karakter daha cok yer alsin …", tick it. Verify: the box is ticked or the item is absent.

## Workflow follow-up

- Archive the change with `/opsx:archive` after the owner's review.
- Stop every process on the project's ports, as CLAUDE.md asks.
