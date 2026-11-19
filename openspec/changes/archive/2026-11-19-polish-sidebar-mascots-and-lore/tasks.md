# Tasks

## 1. Corner Cardmaker (design D6)

- [x] 1.1 In `CornerCardmaker.tsx`, scale `SIZES.shop` to `h-[min(264px,37vh)] w-[min(258px,23.4vw)]` and `SIZES.gold` to `h-[min(372px,48vh)] w-[min(375px,37.2vw)]`. Update the speech bubble's `right` offset and width formula to the new `shop` width. Verify with `CornerCardmaker.test.tsx` (the classes per size) and in the browser at 1280 px on the Pack Shop and the Golden Packs group: she is smaller, and the bubble sits at her left without overlapping her
- [x] 1.2 Add the gone latch keyed by stem. The pointer over her box sets it, and the focus under her still fades her only while it is there. Detach the listeners while she is gone, and render no bubble then. Verify with `CornerCardmaker.test.tsx`:
  - the pointer over her makes her `data-dismissed`, and she stays so after the pointer leaves and after a scroll
  - the focus under her fades her and brings her back
  - a new `stem` brings her back, and so does a remount
  - no `[data-speech-bubble]` renders while she is gone, though a line is spoken
  - Update `cardmakerSpeech.test.tsx` if it relies on the old return
- [x] 1.3 Update `docs/domain.md`'s "The Cardmaker in the corner" note (smaller; gone after the first pointer until the screen shows another Cardmaker or is left). Verify the note matches the card-images delta

## 2. İşlem Logu without definition changes (design D5)

- [x] 2.1 Remove the `changes` query from `logQueries()` and its subscription in `ActivityLogProvider`. Remove `changes` from `LogRecords` and the `definition` and `import` kinds from `LogEvent` and the event builder in `events.ts`. Verify with `events.test.ts`: the records give no definition or import events, and the query count is eight
- [x] 2.2 Remove the text builders used only by those kinds from `eventText.ts`, and the "yalnızca DM" marker from `LogEventRow.tsx`. Remove their cases from `eventText.test.ts` and `ActivityLogPage.test.tsx`. Add a page test that a DM's log with a stored edit record shows no event for it, while a use and a discard still show. Verify with `npm run check` (no unused exports or lint errors)
- [x] 2.3 Remove `publicChangesQuery` from `src/features/definitions/api.ts`, and the `definitionChanges` `public` + `at` index from `firestore.indexes.json`. Update `src/features/activity-log/api.emulator.test.ts` so it no longer expects change records in the log. Verify with `npm run test:emulator` (the `definitionChanges` rules tests pass unchanged)
- [x] 2.4 Update `docs/domain.md`:
  - the `definitionChanges` data-model row: kept, not shown in the log
  - the "Definition change" glossary entry
  - the pictures note: no İşlem Logu event
  - a new deliberate-decisions entry recording the owner's 2026-11-19 choice, with their words, so nobody "fixes" it back

  Verify no `docs/` text still says the İşlem Logu lists definition changes (`grep -n "Logu" docs/domain.md`)

## 3. Card lore data path (design D1, D2)

- [x] 3.1 Add `src/features/lore/schema.ts` with `LORE_LIMIT = 10000`, the zod schema `{ text: 1..LORE_LIMIT, updatedAt, updatedBy }` and its converter, and `src/features/lore/api.ts` with `loreRef(db, cardId)`, `saveLore(db, { cardId, text, by })` (server timestamp) and `deleteLore(db, cardId)`. Verify with `schema.test.ts` (limits, required keys)
- [x] 3.2 Add the `match /cardLore/{cardId}` block from design D2 to `firestore.rules`, above the catch-all. Verify with a new `tests/lore.rules.emulator.test.ts` covering:
  - allowed: a member reads an active and a retired card's lore, the DM reads a draft's lore and an orphan's, the DM creates, updates and deletes
  - denied: signed out, an outsider, a player reading a draft's lore, a player writing or deleting, the DM writing under a True Word or a missing card, extra keys, an empty or 10,001-character text, a wrong `updatedBy`, a client `updatedAt`

  Run `npm run test:emulator`
- [x] 3.3 Add the `cardLore/{cardId}` row to `docs/domain.md`'s data model (fields, who reads, who writes), and a "Hikâye (lore)" glossary entry. Verify the row's rules description matches `firestore.rules`

## 4. Card lore on the Kart geçmişi page (design D3, D4)

- [x] 4.1 Add `CardLoreSection.tsx`: a live subscription to the one document, the "Hikâye" heading and `whitespace-pre-wrap` text, and nothing for a player without lore. For the DM: "Hikâye ekle" / "Düzenle", a text box with `maxLength={LORE_LIMIT}`, "Kaydet" (trim; blank deletes) and "Vazgeç", and a Turkish error on failure that keeps the box open. Verify with `CardLoreSection.test.tsx` for each card-lore scenario: with lore, without lore (player and DM), live change, add, cancel, clear, failed save
- [x] 4.2 Place the section in `CardHistoryPage.tsx` under the labels and above the tiles. Verify with `CardHistoryPage.test.tsx` (the section's position), and in the browser at 1280 px and 360 px:
  - a long lore with paragraphs wraps
  - the page does not scroll horizontally
  - the DM edits in place
- [x] 4.3 In `deleteCard`, after the step succeeds, call `forget(deleteLore(...))`. Verify with `src/features/definitions/api.emulator.test.ts`: deleting a draft with lore removes the lore, and its change records stay

## 5. Collapsible "Oyuncular" (design D7)

- [x] 5.1 Move the generic store out of `dice/deviceSettings.ts` into `src/lib/deviceSetting.ts`: read and write with the memory fallback, the cross-tab subscription, and `useDeviceSetting(key, fallback)`. Keep the dice keys and call sites working. Verify with the moved `deviceSetting.test.ts` and the unchanged dice tests
- [x] 5.2 In `PlayerList.tsx`, make the heading a button with `aria-expanded`, `aria-controls`, a chevron and the count once loaded. Remember the choice under `lcm.players.open` (open by default), and render the list and its states only while it is open. Verify with a `PlayerList.test.tsx`:
  - it starts open
  - selecting closes and reopens it
  - the choice survives a remount
  - the count updates live while closed
  - `aria-expanded` follows the state

  Check the sidebar at 1280 px and the mobile menu at 360 px in the browser (same state in both)

## 6. Integration check

- [x] 6.1 With `npm run dev`:
  - as the DM, edit a card, add lore to it, and check that the İşlem Logu shows neither
  - as a player, read the lore on the card's page, and see that a draft's page still says "Kart bulunamadı."
  - check that a use and a discard still show in the log
  - check the corner Cardmaker on the Pack Shop and the Kütüphane (gone after the pointer, back on a tab switch and on return)
  - close "Oyuncular" and reload
- [x] 6.2 Run `npm run check` and `npm run test:emulator`, and confirm both pass. Stop every process on the project's ports in the order CLAUDE.md gives, and confirm with `lsof -nP -iTCP -sTCP:LISTEN`

## Workflow follow-up

- Archive with `/opsx:archive` and commit (feat + docs archive). Push only when the owner asks.
- After the live deploy, the owner may delete the unused `definitionChanges` (`public`, `at`) index in the Firebase console (design, Risks).
