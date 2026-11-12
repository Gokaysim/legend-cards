# Tasks

## 1. Data model and snapshots

- [x] 1.1 Add the optional `dmOnly` boolean (default `false`) to every card kind in `src/features/cards/schema.ts`, with a test that a stored card without the field parses as not DM-only (`schema.test.ts`)
- [x] 1.2 Add `dmOnly` (default `false`) to `cardSnapshotSchema` in `src/features/definitions/schema.ts`, and change `isPublicStep` to take the two snapshots and treat a DM-only card as not visible (design D4). Verify with `schema.test.ts` cases: DM-only edit private, flag on and flag off public, DM-only draft work private, old record without the field
- [x] 1.3 Write `dmOnly` in every card step and snapshot in `src/features/definitions/api.ts` (add, save, status, delete), and update `src/test/cardFixtures.ts` and `definitionFixtures.ts`. Verify `npm run typecheck` and the definitions unit tests pass

## 2. Firestore rules

- [x] 2.1 In `firestore.rules`:
  - accept an optional boolean `dmOnly` in `validCard` and the card key lists
  - add `'dmOnly': data.get('dmOnly', false)` to `cardSnapshot`
  - require `tableFree()` for a flag change in `changedByDm` (design D5)

  Verify with emulator rules tests: the DM sets and clears the flag, a player cannot, a flag change is denied while a pack is open, and a non-boolean value is denied
- [x] 2.2 Replace `playerVisible(statusOf(...))` in `validChangeRecord` with a `visibleSnapshot` helper (design D4). Verify with emulator tests that:
  - a DM-only card's edit record with `public: true` is denied
  - a player cannot read a DM-only edit record
  - a flag-off record is public and readable by a player
- [x] 2.3 Deny DM-only cards in `drawnInto` and `chosenFromPack` (design D2). Verify with emulator tests that a player's random draw, a Cursed draw, a pack choice and a mandatory Cursed card of a DM-only card are denied, and that the DM's give of one is allowed
- [x] 2.4 Run the definitions API emulator tests (`src/features/definitions/api.emulator.test.ts`) with a DM-only card added, edited, flag toggled and deleted as a draft, and verify `npm run test:emulator` passes

## 3. Pool, statuses and lists

- [x] 3.1 Exclude DM-only cards in `isDrawable` and `cursedPool` (`src/features/cards/pool.ts`). Verify with `pool.test.ts` that the pool, the Cursed pool, the filter options and the distribution leave them out, and with a `catalog` test that no pack candidate is DM-only
- [x] 3.2 Make `inPool` false for DM-only cards in `src/features/hands/cardStatus.ts`. Have `statusLabel` give "DM'e özel" or "DM'e özel · Elde: …" and `isMarkedHeld` mark held DM-only cards (`src/features/cards/status.ts`). Verify with unit tests for each label
- [x] 3.3 Leave DM-only cards out of `useCards()` on a player's device and keep them in `useCardsById()` (design D3). Verify with `cardsContext.test.tsx` for a player and for the DM, and with a `LibraryPage.test.tsx` case that a player's library and count leave a held DM-only card out
- [x] 3.4 Show the "🔒 DM" mark on `CardFace` and in `CardTable` on the DM's device, whatever the filter. Verify with `CardFace.test.tsx` and `CardTable.test.tsx`

## 4. DM controls

- [x] 4.1 Add the "DM'e özel" choice to the card screens' status filter (design D6):
  - `StatusFilterValue` gains `'dmOnly'`
  - the option lists are per screen, and True Words keeps four choices
  - a card filter function handles `'dmOnly'`

  Verify with `CardBrowser.test.tsx` that "DM'e özel" lists DM-only cards of every status, and with a True Words test that the choice is absent there
- [x] 4.2 Add the "Sadece DM verebilir" checkbox to `CardFormDialog.tsx` for new and stored cards in every status, with the open-pack waiting message when the flag changes while a pack is open. Verify with `CardFormDialog.test.tsx`: add a DM-only draft, toggle on an active card, and a waiting message during an open pack

## 5. Log and scripts

- [x] 5.1 Add the `dmOnly` field line ("DM'e özel: hayır → evet") to the card fields in `src/features/activity-log/eventText.ts`. Verify with `eventText.test.ts`, and with an `events`/`ActivityLogPage` test that a DM-only edit is marked "🔒 Yalnızca DM"
- [x] 5.2 Read `dmOnly` with each stored card in `scripts/lib/importPictures.ts` and keep DM-only cards out of the public record. Verify with a unit test and with `tests/import-pictures.emulator.test.ts`, which has a DM-only active card in the DM-only record
- [x] 5.3 Confirm that `scripts/lib/importCards.ts` never writes or clears `dmOnly` on a stored card, with a case in `tests/import-cards.emulator.test.ts` where a DM-only card is left untouched by a re-import

## 6. Docs and final checks

- [x] 6.1 Document the DM-only flag in `docs/domain.md`: the `cards` data model row, the glossary entry "DM'e özel", the deliberate decision that hiding is interface-only, and the log rule. Verify the doc reads consistently with the specs
- [x] 6.2 Run `npm run check` and `npm run test:emulator` and verify both pass
- [x] 6.3 In Chrome against the emulators, as the DM:
  - mark a card DM-only, and see it marked in the library, under "DM'e özel" and in the log
  - give it to Oyuncu 1

  As Oyuncu 1, see that the card is missing from the library but shows in the hand and in the give event. Verify at 360 px

## Workflow follow-up

- Archive the change with `/opsx:archive` once the owner has reviewed it.
