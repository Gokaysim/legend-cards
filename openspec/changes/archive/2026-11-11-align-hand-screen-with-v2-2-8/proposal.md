# Proposal

## Why

On 2026-11-11 the owner asked for the "Oyuncu elleri" screen to look like v2.2.8's, without copying it exactly. The way LP is added was named as one thing that can stay as it is today. The hand screen grew one feature at a time (holdings, LP, True Words, notes, zoom, glows), so its layout no longer matches the reference:

- **Selected card details.** v2.2.8 shows the selected card in a "Seçili Kart" panel at the right of the hand, and the card stays marked while you read. The app opens a modal dialog instead.
- **The summary.** v2.2.8 has six compact stat tiles next to vertical tabs. The active effects and the sets are lists that open from their tiles (ⓘ), and the Cursed and True Words tiles have their own colors. The app shows six plain tiles, two lists that are always open, and the tabs in a row below.
- **Active True Words.** v2.2.8 shows the pictures of the active words peeking out above the hand. The app has nothing there.
- **Notes.** v2.2.8 shows the player's notes under the hand at all times. The app keeps them on a Notlar tab, together with the DM note.

## What Changes

These decisions were made with the owner on 2026-11-11, who will adjust them after testing:

- **Details beside the hand.** On a window at least 1024 CSS pixels wide, selecting a card shows its details in a "Seçili Kart" panel at the right of the hand. The panel stays in view while the page scrolls. The selected card glows soft gold, unless it is active. Without a selection, the panel says "Detayları görmek için elden bir kart seç."
  - The True Words tab uses the same panel as "Seçili True Word".
  - Narrower windows and phones keep today's dialog.
  - The details' contents, controls and rules do not change. They also show the card's set, rarity, mechanic pack and text in words, as v2.2.8 does.
- **Dashboard.**
  - The stat tiles sit three to a row (two on phones), with the tabs stacked at their right. On phones the tabs are a row under the tiles.
  - "Aktif efekt ⓘ" and "Farklı set ⓘ" open their lists when the pointer rests on them, when they have the focus, or after a tap. The two always-open list panels go away.
  - The Cursed tile is red, the True Words tile is purple, and the other numbers are gold.
- **Titles.** The screen is titled "Oyuncu elleri". The tab's own panel names whose hand it is: "Ayla — Kart Eli", "Ayla — True Words" or "Ayla — DM notu".
- **Active True Words above the hand.** On the Kartlar tab, the pictures of the player's active words peek out from behind the top of the hand's panel and glow purple. Selecting one shows it large.
- **True Words tab as tiles.** The tab shows each known word as its picture with its "● Aktif" mark, as v2.2.8 does. The name, cost and text move to the details. A word without a picture still shows its name and text.
- **Notes (BREAKING for the tab URL).**
  - The player note moves under the tab's content, on every tab, as "Oyuncu notu". Its editing rules do not change.
  - The Notlar tab becomes a "🔒 DM notu" tab that only the DM has. It holds the DM note.
  - The "✎ Notlar •" marker goes away.
  - An old `?tab=notes` link opens the Kartlar tab.
- **Unchanged:**
  - **LP.** The "Legend Point" stat keeps the DM's "± LP" button and its dialog with a reason.
  - "🎲 Kart Çek", "☠ Cursed Kart Çek", "🎁 Pack Shop" and "+ Kart ver" stay in the screen's header.

Out of scope:
- v2.2.8's LP amount field with "+ Ekle" and "− Düş" in the side panel.
- Dragging a card onto a player in the sidebar, "Oyuncuyu sil", and "↶ Geri Al". The app gives cards with "Başkasına ver", keeps a permanent log, and creates players from Google sign-in.
- v2.2.8's hover preview of a card. The app zooms from the magnifier.
- Any Firestore data, rule or access change.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `card-holdings`:
  - "Hand screen per player": the title is "Oyuncu elleri", and the hand's panel names the player.
  - "Hand summary": the two lists open from their stat tiles.
  - A new requirement, "Card details beside the hand": the side panel on wide windows, and the dialog below 1024 px.
- `true-words`:
  - "True Words tab on the hand screen": picture tiles, with the details in the panel or the dialog.
  - A new requirement, "Active True Words above the hand".
- `player-notes`:
  - The Notlar tab and its marker are removed.
  - New requirements: "Player note under the hand" and "DM notu tab".
  - "Players never load a DM note", "The DM note stays on its tab", "Saving a note" and "Last editor and empty notes" now name the new places.
- `visual-effects`:
  - "True Word glows": the peeking words glow too.
  - New requirements: "The selected card glows" and "The hand's stat colors".

## Impact

- **New code:**
  - `src/lib/useMediaQuery.ts`, a live media query, and `src/lib/useWideWindow.ts`, which is true at 1024 px and wider
  - `src/features/hands/HandDetailsPanel.tsx`, the "Seçili Kart" / "Seçili True Word" panel
  - `src/features/hands/HoldingDetails.tsx`, the details' body shared by the panel and the dialog
  - `src/features/hands/StatTile.tsx`, for the tiles and their lists
  - `src/features/true-words/TrueWordDetails.tsx`, `ActiveWordsPeek.tsx` and `TrueWordZoomDialog.tsx`
- **Changed code:**
  - `src/features/hands/HandsPage.tsx`, `HandSummary.tsx`, `HandView.tsx`, `HandTable.tsx` and `HoldingDialog.tsx`
  - `src/features/true-words/HandTrueWords.tsx`, `TrueWordDialog.tsx` and `TrueWordTile.tsx`
  - `src/features/player-notes/HandNotes.tsx`
  - `src/features/cards/CardFace.tsx` and `display.ts`, for the selected glow
  - `src/app/screens.ts`, for the tab values
  - `src/lib/useWideHover.ts`, which moves onto `useMediaQuery` with the same behavior
  - `src/styles/theme.css` and `theme.test.ts`, for the stat tile surfaces and the word glow
- **Tests:** the hand, summary, details, True Words tab and notes tests change where text moves, and new tests cover the panel, the tiles' lists and the peek. There is a manual check in Chrome at 1280, 1024 and 360 px.
- **Docs:**
  - `docs/domain.md`: the hand screen, the player note, the DM note, and the privacy note
  - `docs/conventions.md`: the `lib/` hooks, and the hands and player-notes folders
- **Data and rules:** none. There are no new Firestore paths, so no new rules tests. `npm run test:emulator` must still pass.
- **Dependencies:** none new.
