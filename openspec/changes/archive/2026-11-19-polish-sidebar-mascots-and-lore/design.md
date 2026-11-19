# Design

## Context

See proposal.md for why. The four parts touch separate code. Only the log and lore parts share a constraint: the definition change records.

- **Corner Cardmaker.** `src/features/art/CornerCardmaker.tsx` holds her sizes (`SIZES.shop`, `SIZES.gold`) and a hit test. The hit test sets `isDismissed` while the pointer is over her box or the focused element is under it. It also renders the speech bubble, whose `right` offset and width are derived from the `shop` width. `PageHeader`, `ShopsPage` and `PackShopPage` mount her; switching Kütüphane tabs re-renders the same instance with a new `stem`.
- **Log.** `logQueries()` in `src/features/activity-log/api.ts` reads `definitionChanges`: the DM reads the whole collection, a player reads `publicChangesQuery`. `events.ts` turns the records into `definition` and `import` events, and `eventText.ts` and `LogEventRow.tsx` render them, with the "yalnızca DM" marker. Nothing else in the app reads the records. The `public` + `at` composite index in `firestore.indexes.json` exists only for the player's query.
- **Card definitions.** Every key of a card document is listed in the rules' `definitionKeys()`, and each DM step is checked against its change record. The cards collection is subscribed whole on every device.
- **Card page.** The Kart geçmişi page (`src/features/stats/CardHistoryPage.tsx`) shows the face, then the heading, status pill and labels, then the tiles and the Geçmiş list. True Words never reach it ("Kart bulunamadı.").
- **Device settings.** `src/features/dice/deviceSettings.ts` already has a `localStorage` store. It has a memory fallback, listens for changes from other tabs, and exposes a `useSyncExternalStore` hook, but it is private to the dice feature.

## Goals / Non-Goals

**Goals:**
- The lore costs nothing until a card page is open.
- The rules for lore stay small and do not touch the card or change-record rules.
- The log stops reading the change records altogether, not just hiding their rows.

**Non-Goals:**
- A history of lore edits, or rich text and markdown in lore.
- Showing lore anywhere but the Kart geçmişi page (not on the face, the zoom dialog or the hand).
- A database viewer for the change records. "Look in the database" means the Firebase console.
- Changing the definition change records, their rules, or their tests.
- Changing the Cardmakers next to a title, or the shocked Cardmaker pair.

## Decisions

### D1. Lore lives in `cardLore/{cardId}`, not on the card

The document is `{ text, updatedAt, updatedBy }`, with the card's ID as its own.

- **Alternative: a `lore` field on the card.** Rejected:
  - every device would download all lore with the cards list;
  - the field would join `definitionKeys()`, so every save would need a change record;
  - the card rules are near the 1000-expression limit on large batches.
- **Alternative: a subcollection `cards/{id}/lore/main`.** Rejected: it buys nothing over a top-level collection keyed by the same ID, and the project uses only top-level collections.

### D2. Lore rules

```
match /cardLore/{cardId} {
  allow read:   if isMember() && (playerVisible(get(cardPath(cardId)).data.status) || isDm());
  allow create, update: if isMember() && validLore(cardId) && isDm();
  allow delete: if isMember() && isDm();
}
```

- **`validLore`.** It checks, cheapest first:
  - the keys are exactly `text`, `updatedAt` and `updatedBy`;
  - `text` is a string of 1 to 10,000 characters;
  - `updatedAt == request.time` and `updatedBy == request.auth.uid`;
  - the card exists and its `kind != 'trueWord'`.
- **Read.** For a lore document under a deleted or unknown card, `get()` fails. The rules' `||` tolerates the error on its left, so the DM still reads it and a player is denied, which is what the spec asks.
- **Delete.** It needs no card check. Then the draft-delete cleanup (D4) still works after the card document is gone.
- **Why mirror the card's read rule.** The read rule follows the card document's own rule (`playerVisible(status) || isDm()`). It does not follow the card page's rule ("a hidden card while someone holds it"), because the page already decides whether to show the card. The lore rule only has to never hand out a draft's lore.

### D3. Reading and editing lore

- **Module.** A small `src/features/lore/` module holds `schema.ts` (zod plus converter), `api.ts` (`loreRef`, `saveLore`, `deleteLore`) and `CardLoreSection.tsx`.
- **Reading.** The section subscribes to the one document with the project's `Subscription` pattern while the page is mounted. That gives the live update the spec asks for at one read per change.
- **Editing.** The DM opens a text box with the stored text; there is no `useSavedField` autosave, because the spec asks for explicit "Kaydet" and "Vazgeç".
- **Saving.** Kaydet trims the text. A blank result calls `deleteLore`, otherwise `saveLore` with `serverTimestamp()` and the DM's uid. A failure keeps the box open with a Turkish error.
- **Placement.** The section goes under the labels list and above the tiles. It shows `whitespace-pre-wrap` text. The heading is "Hikâye". For a player without lore, the section renders nothing; for the DM, it renders the heading and "Hikâye ekle".
- **Limit.** The 10,000 limit is a shared constant (`LORE_LIMIT`) used by the schema and the text box's `maxLength`, and repeated in the rules.

### D4. Draft delete removes lore best-effort, after the step

- **How.** `deleteCard` calls `forget(deleteLore(...))` after `runDeleteStep` succeeds, the same way the picture file is removed after the step. `deleteWord` does not, because words have no lore.
- **Alternative: delete the lore inside the step's write.** Rejected: it would change the shared `runStep` and the definition rules for a document those rules do not know about.
- **If it fails.** An orphan lore document is unreadable to players (D2) and shown nowhere.

### D5. The log drops the change records at the source

- **Queries.** `logQueries()` loses its `changes` query.
- **Events.** `LogRecords` and `LogEvent` lose the `definition` and `import` kinds.
- **Text and rows.** The text builders used only by those kinds come out of `eventText.ts`: field diffs, visible-text diff, picture and flag lines, import summaries. `LogEventRow`'s "yalnızca DM" marker comes out with them, since only those kinds set it. Helpers that set events still use stay.
- **Query and index.** `publicChangesQuery` has no other caller, so it is removed together with its `public` + `at` index in `firestore.indexes.json`.
- **Unchanged.** `definitionChangesRef` stays, because the definition API writes through it. The `definitionChanges` rules and their emulator tests stay unchanged: the records are still written, checked and readable.
- **Alternative: filter the events out in the UI.** Rejected: the device would still read up to `n` records per page for nothing, and dead text code would stay.

### D6. Corner Cardmaker: smaller and gone after the first pointer

- **Sizes.** Every cap is scaled by 0.6:
  - `shop`: `h-[min(264px,37vh)] w-[min(258px,23.4vw)]`
  - `gold`: `h-[min(372px,48vh)] w-[min(375px,37.2vw)]`
  - The speech bubble's `right` offset and width use the new `shop` width.
- **Gone state.** It is a latch keyed by the stem, `const [goneStem, setGoneStem] = useState<string | null>(null)`, with `isGone = goneStem === stem`.
  - In the hit test, the pointer over her box sets `goneStem` to the current stem.
  - The focus check keeps driving the temporary fade as today.
  - A new stem in the same instance (a Kütüphane tab switch) brings her back. A remount (leaving the screen, opening or closing a pack group) does too.
  - While she is gone, her box stays at `opacity-0` with the existing fade-out transition, and the listeners are detached.
- **Speech bubble.** It is not rendered while she is gone. The speech provider may still time a hover, but nothing shows, which meets "no bubble opens".
- **Alternative: remember "gone" for the session.** Rejected: the owner agreed she comes back on the next visit to the screen.

### D7. Collapsible "Oyuncular" with a shared device setting

- **Shared store.** The generic store moves from `dice/deviceSettings.ts` into `src/lib/deviceSetting.ts`. It keeps the read and write with the memory fallback, the cross-tab subscription, and a `useDeviceSetting(key, fallback)` hook. The dice settings keep their keys and call it.
- **Player list.** `PlayerList` reads `lcm.players.open`, open by default.
  - The `<h2>` holds a `<button aria-expanded aria-controls>` with a chevron, "Oyuncular" and the count once the profiles have loaded.
  - The `<ul>`, and the loading, error and empty texts, render only while it is open.
  - The sidebar and the mobile menu share the key, so they agree.
- **Alternative: separate keys for sidebar and mobile.** Rejected: the spec asks for one choice per device.
- **Alternative: storing it on the profile.** Rejected by the owner (device-only).

## Risks / Trade-offs

- **Lost visibility of card upkeep in the app** → The records remain in `definitionChanges` (Firebase console). `docs/domain.md` records the decision as deliberate so it is not "fixed" back.
- **The removed index lingers in the live project** → `firebase deploy --only firestore` in CI does not delete indexes absent from the file without `--force`. It stays harmless, and the owner can delete it in the console.
- **The latched Cardmaker hides speech for the rest of the visit** → This is accepted with the owner's choice; she returns on the next visit.
- **Orphan lore after a failed cleanup** → It is invisible to players and costs a few KB. It is acceptable for a rare failure.
- **Moving the dice storage could change dice behavior** → The keys stay the same and the existing dice tests cover it. The move is mechanical.

## Migration Plan

- **Data.** No data migration: lore starts empty, and the change records are untouched.
- **Deploy.** It goes out in the usual CI deploy on push to `master`: rules and indexes, then hosting. Old clients still query `definitionChanges`, which stays readable, so the rules can deploy before the hosting without breaking them.
- **Rollback.** Revert the commit. Lore documents written in the meantime stay and are ignored by the old app (the catch-all rule denies them).
