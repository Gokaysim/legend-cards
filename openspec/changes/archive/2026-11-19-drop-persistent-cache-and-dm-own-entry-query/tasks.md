# Tasks

## 1. Memory cache (design D1, D2)

- [x] 1.1 In `src/lib/firebase/firestore.ts`, create the instance with `memoryLocalCache()` instead of `persistentLocalCache` and the multi-tab manager, and update its comment. Verify `npm run check` passes and the app loads against the emulators.
- [x] 1.2 Right after creating the instance, call `clearIndexedDbPersistence(instance)` once: catch both a thrown and a rejected error, log it with `console.info`, and skip the call on the hot-reload reuse path. Verify in Chrome against the emulators: after a load, DevTools > Application > IndexedDB no longer lists the `firestore/...` database. Verify the app still works with a second tab open.
- [x] 1.3 Check the offline comments that assume a persistent cache (`accessStatus.ts`, `useOwnAccessCheck.ts`, `docs/conventions.md`, README) and reword them for the memory cache. Verify with `grep -rn "IndexedDB\|offline cache\|opens the app offline" src docs README.md` that no stale claim is left.

## 2. The DM's list without the own entry (design D3)

- [x] 2.1 In `src/features/access/api.ts`, add `accessEntriesExceptRef(db, email)`: the list query with `where(documentId(), '!=', email)`. Add a case to `src/features/access/api.emulator.test.ts` showing that the DM's filtered query is allowed and returns every entry except the DM's own. If `!=` on `documentId()` fails, switch to the two range queries from D3 and test those instead.
- [x] 2.2 Add `ownEntry: AccessEntry` to the `signedIn` state in `authContext.ts`, filled by `AuthProvider` from the own-entry check. Update the test fakes (`src/test/`) that build a `signedIn` state. Verify with an `AuthProvider` unit test that a member's state carries the entry and follows a change to it, such as the `uid` link.
- [x] 2.3 In `AccessProvider.tsx`, subscribe to the filtered query on the DM's device, and return `entries` as `ready` with the own entry plus the query's entries once the query is ready (loading and error pass through as before). Verify with `AccessProvider.test.tsx` that the own entry appears exactly once, and that the section's own row, the duplicate check and the sort order in `AccessSection.test.tsx` still pass.

## 3. Independent diagnostic read (design D4)

- [x] 3.1 Add `src/lib/firebase/firestoreLite.ts` with an async `existsOnServer(collection, id)` (design D4, changed during apply). It loads `firebase/firestore/lite` dynamically, uses the same app, and connects to the Firestore emulator once in emulator mode. Verify with `npm run build` that Lite lands in its own chunk, not in the main bundle.
- [x] 3.2 Move `readEntryFromServer` in `src/features/access/api.ts` onto `existsOnServer` and drop its `db` parameter. Update `AuthProvider` and `readEntryFromServer.test.ts` (mock `@/lib/firebase/firestoreLite`), keeping "exists", "missing" and "error:<code>". Verify the unit test passes.
- [x] 3.3 Add a case to `src/features/access/api.emulator.test.ts`: as a signed-in member with an open listener on their own entry, `readEntryFromServer` reports "exists" for an entry that exists and "missing" for one that does not. Verify `npm run test:emulator` passes.
- [x] 3.4 Add `firebase/firestore/lite` to "Who imports Firestore" in `docs/conventions.md`, and check that the lint rule, if one enforces it, allows `src/lib/firebase/firestoreLite.ts`. Verify `npm run lint` passes.

## 4. Offline banner (design D5)

- [x] 4.1 Change the text in `src/app/layout/OfflineBanner.tsx` to "Çevrimdışısın — değişiklikler bağlantı gelince eşitlenecek. O zamana kadar uygulamayı kapatma." and update `AppShell.test.tsx`. Verify the shell test passes and that the banner fits at 360 px width in Chrome.

## 5. Integration

- [x] 5.1 Run `npm run check` and `npm run test:emulator`. Both must pass.
- [x] 5.2 In Chrome against the emulators, sign in as the DM and open Ayarlar: the "Masaya erişim" section lists every address, the DM's own row included, marked as the DM and as themselves. Turn the network off and on in DevTools, then confirm the DM stays in the app and the own row stays. Reload while offline and confirm the loading state appears. Then go back online and confirm the app loads.
- [x] 5.3 Note in `docs/domain.md` or the README's operations notes, wherever offline behavior is described, that offline use now lasts only while the app stays open. Verify with a grep that no doc still promises an offline start.

## Workflow follow-up

- After the deploy, ask the DM to report the next "ekli değil" with a screenshot of the diagnostic line, and check that a reload clears it.
- A few days after the deploy, check Firestore read usage in the Firebase console.
- Archive with `/opsx:archive`, then commit.
