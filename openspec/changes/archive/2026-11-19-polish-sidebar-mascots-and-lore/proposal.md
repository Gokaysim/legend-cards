# Proposal

## Why

Four small requests from the owner's TODO list (2026-11-19):

- The corner Cardmaker is large and comes back each time the pointer leaves her, so she keeps covering tiles, cards and log rows.
- The İşlem Logu fills up with the DM's card upkeep (text fixes, pictures, flags, imports), which buries the game's own events. The owner wants them out of the screen, still kept in the database for a later look.
- Cards with a character on them have no place for that character's story. The DM wants to write lore that players can read on the card's page.
- The "Oyuncular" list takes a lot of the sidebar, and there is no way to fold it away.

## What Changes

- **Corner Cardmaker:** About 60 % of her current size: `shop` from 440 × 430 px to 264 × 258 px at most, `gold` from 620 × 625 px to 372 × 375 px at most. Her viewport caps shrink in the same ratio. The first time the mouse pointer reaches her, she fades out and stays gone on that screen until a different Cardmaker stands in the corner or the user leaves the screen. The keyboard focus still only fades her while it is under her. While she is gone, no speech bubble opens. Cardmakers next to a title do not change.
- **İşlem Logu (BREAKING for the log's content):** The İşlem Logu no longer lists definition changes or imports. This covers adding, editing, publishing, retiring, bringing back and deleting a card or True Word, and the card, word and picture imports. The records stay as they are: written with every step, never changed, readable under the same rules. The log stops reading them, and the "yalnızca DM" marker goes with them. Game events and set, draw-mode, dice, fight and role events stay.
- **Card lore:** A new "Hikâye" section on a card's Kart geçmişi page. It holds plain text of up to 10,000 characters, kept in a new `cardLore/{cardId}` collection. It is read only while that page is open, so the card list does not download it. Every member reads the lore of a card that players can see. Only the DM writes it, edits it in place, and clears it, which deletes the document. Lore edits keep who and when on the document, with no log event and no change record. True Words have no lore. Deleting a draft deletes its lore.
- **Collapsible player list:** The "Oyuncular" heading becomes a toggle with the player count, in the sidebar and in the mobile menu. Its open or closed state is remembered on the device. It starts open.

## Capabilities

### New Capabilities

- `card-lore`: The DM-written story of a card: its storage, who reads and writes it, and the "Hikâye" section on the Kart geçmişi page.

### Modified Capabilities

- `activity-log`: Definition changes and imports are no longer listed. The requirements for their events, their text, pictures and flags are removed, and the list, readability and filter requirements are updated.
- `card-images`: The corner Cardmaker is smaller and stays gone after the pointer first reaches her.
- `cardmaker-speech`: No bubble opens once the corner Cardmaker is gone.
- `definition-editing`: Deleting a draft also deletes its lore. Its scenario no longer refers to the DM's log.
- `user-profiles`: The "Oyuncular" list can be collapsed, and the device remembers it.

## Impact

- **Code:**
  - `src/features/art/CornerCardmaker.tsx` (sizes, dismissal, bubble).
  - `src/features/activity-log/` (queries, events, event text, rows, tests).
  - `src/features/definitions/api.ts` (`publicChangesQuery` loses its only caller; draft delete adds the lore delete).
  - `src/features/stats/CardHistoryPage.tsx` and a new lore module.
  - `src/features/users/PlayerList.tsx`.
- **Data and rules:**
  - New `cardLore/{cardId}` path in `firestore.rules` with emulator rules tests.
  - The now-unused `definitionChanges` index on `public` and `at` comes out of `firestore.indexes.json`.
  - `definitionChanges` and its rules are unchanged.
- **Docs:** `docs/domain.md`: data model, glossary and the Cardmaker and pictures notes.
- **No admin script changes:** No script reads or exports collections in bulk.
