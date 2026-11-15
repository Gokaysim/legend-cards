# Design

## Context

See proposal.md for why. The owner chose option B (character tabs with photos, the selected character full width) from two ASCII mockups; the behavior is in the delta specs `characters` and `character-effects`.

The current state that shapes the approach:

- **`HandsPage.HandContent`** lays the tab panel and a 19.5rem `HandDetailsPanel` side by side when `showsPanel = isWide && tab !== 'dm-note'`, and renders the "Seçili Karakter" panel from `handCharacters.selected`.
- **`useHandCharacters(profile, isWide, held)`** returns `{ content, selected, overlays }`. It keeps `selection: { id, isWide }` and drops it when the window crosses 1024 px, so a dialog never opens by itself. On a narrow window it renders `CharacterDialog` in `overlays`.
- **`CharactersTab`** renders a `<ul aria-label="Karakterler">` grid of `CharacterTile` buttons (`aria-pressed`, the "✦ n" badge over the portrait) and a dashed "Karakter ekle" tile, then the `<details>` archived list.
- **`CharacterDetails`** stacks the portrait (`max-w-66` in the panel, `max-w-56` in the dialog), the name and owner, the edit buttons and the `effects` node.
- **`CharacterPortrait`** already has `size="small"` (a small initial) used by the archived rows at `w-10`.
- **`CharacterFormDialog`** closes at once for a save without a new photo (the write is queued), and waits for the server for a save with one. It does not report the new character's ID.
- The hand's own tabs are `Button`s with `role="tab"` and `aria-selected`, with no arrow-key handling.

## Goals / Non-Goals

**Goals:**

- The selected character gets the width of the hand's column on every window; the list of characters becomes one compact, wrapping row.
- One layout for every width: no panel, no dialog, no selection reset at 1024 px.

**Non-Goals:**

- No change to the forms, the effects list, the effect form, the data or the rules.
- No arrow-key roving focus for the character tabs (the hand's own tabs have none either).
- The selected character is not kept in the URL; a reload selects the first character.

## Decisions

### D1. The character row is a nested tablist

The row is `role="tablist"` with `aria-label="Karakterler"`, each character a `Button`-like `role="tab"` with `aria-selected` and `aria-controls` pointing at the view, which is `role="tabpanel"` labelled by the selected tab. "+ Karakter ekle" is a plain button after the tablist, not a tab. This matches the hand's own tabs and tells screen readers the view follows the selection.

Alternative: keep `aria-pressed` toggle buttons in a list. Rejected: a selection that always exists and switches a region is what tabs are.

Each tab: a `CharacterPortrait size="small"` at `w-8` (3:4), the name truncated with a max width so one long name cannot fill a 360 px row, and "✦ n" after the name when there are effects (the `sr-only` ", n aktif efekt" stays). Marked with the gold border, as the tile was. The row is `flex flex-wrap gap-2`.

### D2. The view is `CharacterDetails` with a wide layout

`CharacterDetails` loses its `layout: 'panel' | 'dialog'` prop and gets one responsive layout: `grid sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]`, the portrait in the first column (centered and capped at `max-w-56` above `sm`), and the name (now a heading), owner, buttons and effects in the second, left-aligned. `CharacterDialog` is deleted.

Alternative: keep the stacked layout and only widen it. Rejected: a 3:4 portrait at full width would push the effects below the fold.

### D3. `useHandCharacters` drops `isWide` and `selected`

The hook becomes `useHandCharacters(profile, held)` and returns `{ content, overlays }`. The selection is a plain `string | null`. The shown character is `active.find(id === selection) ?? active[0] ?? null`, so the first character is selected on open, after the selected one is archived (here or on another device), and when the hand changes to another user. `HandsPage` sets `showsPanel = isWide && (tab === 'cards' || tab === 'true-words')` and removes the "Seçili Karakter" `HandDetailsPanel`, so the Karakterler tab takes the full grid width.

### D4. Selecting a new character without an API change

When the add form saves, the hook remembers the IDs of the active characters at that moment (`pendingAdd: Set<string>`). On a later render, the first active character whose ID is not in the set becomes the selection and the set is cleared. A queued (offline) add shows in the local cache at once, so it is selected at once; a save with a photo appears after the upload. The form gets an `onSaved` callback for adds only, called where it calls `onClose` after a successful (or queued) save; a failed save with a photo keeps the form open, so nothing is pending. A late failure clears the pending set.

Alternative: let the caller choose the document ID and pass it to `addCharacter`. Rejected: it changes the API and its emulator tests for a UI nicety.

### D5. The empty state

With no active characters, the row is replaced by "Henüz karakter yok." (and "+ Karakter ekle" for the owner and the DM), and no view or tabpanel shows, as today's empty grid.

## Risks / Trade-offs

- [Many characters make a tall row on a phone] → Each tab is compact (32 px thumbnail, truncated name); the table has a handful of characters per player.
- [Another device adds a character while the add form is open] → D4 could select that one instead; harmless, and the user's own one is one tap away.
- [Tests that rely on the panel and the dialog break] → They are rewritten in tasks 4.x against the new spec scenarios.

## Migration Plan

UI only; deploy with the next release. Rollback is a revert of the change's commit.
