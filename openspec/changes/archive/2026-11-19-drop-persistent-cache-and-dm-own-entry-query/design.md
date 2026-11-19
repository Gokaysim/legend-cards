# Design

## Context

See proposal.md (Why) for the incident and the suspected mechanism. The relevant current state:

- `src/lib/firebase/firestore.ts` creates the only Firestore instance with `persistentLocalCache({ tabManager: persistentMultipleTabManager() })`.
- Every subscription sits in a provider at the top of `App.tsx`, so listeners live for the whole session and are not restarted when screens change.
- `AccessProvider` subscribes the DM's device to the whole `allowedEmails` collection. `AuthProvider` separately follows the account's own entry through `useOwnAccessCheck`, and only the `signedIn` state lets data providers subscribe.
- `readEntryFromServer` (`src/features/access/api.ts`) uses `getDocFromServer`. In the full SDK this goes through `readDocumentViaSnapshotListener`, which joins the open listener on the same document.
- In SDK 4.19.1, `syncEngineRejectListen` turns a rejected limbo-resolution listen into a synthetic `NoDocument` at version zero, applied as a remote event.

The mechanism has not been reproduced. The design does not depend on it being the only cause. C makes any cache corruption last at most until the next reload, and B removes the one path known to involve the DM's own entry.

## Goals / Non-Goals

**Goals:**
- A wrong "not on the list" never survives a reload.
- The DM's own entry is never part of a query, so query limbo cannot touch it.
- The diagnostic read reflects the server alone.

**Non-Goals:**
- Patching or working around the SDK's limbo handling.
- An automatic reload or self-repair when the subscription and the server disagree. With C, a manual reload is enough. Self-repair can follow if the diagnostic line still shows a disagreement.
- Reproducing the limbo rejection in the emulator. It would be good evidence, but it is not needed for this fix.

## Decisions

### D1. Memory cache with the default (eager) garbage collector

`initializeFirestore(firebaseApp, { localCache: memoryLocalCache() })`. Eager GC drops a document once no listener holds it. Because every listener is mounted for the whole session, nothing is dropped and read again during normal use. The cost is one full read of every subscribed query at each page load, instead of a resumed read.

*Alternatives:*
- `memoryLruGarbageCollector`: keeps unheld documents in memory. It would only help if listeners came and went, and here they do not.
- Keep the persistent cache and add self-repair (`terminate` + `clearIndexedDbPersistence` + reload when the subscription and a Lite read disagree): keeps offline start, but leaves a corruption class in place and adds a reload loop to guard. The owner chose C in explore.
- `persistentSingleTabManager`: does not address the corruption, only the tab sharing.

### D2. Clear the old IndexedDB cache once

Devices hold an old persistent cache that is no longer used. It does no harm, but it takes disk space, and it would come back to life if persistence were turned on again. Right after `initializeFirestore` creates the memory-cache instance, and before anything uses it, `createFirestore` calls `clearIndexedDbPersistence(instance)` once. The SDK allows the call only before the instance starts, which is why it sits right after creation. Any failure is logged with `console.info` and ignored, for example an old tab that still holds the database open.

*Changed during apply if the SDK rejects it:* if `clearIndexedDbPersistence` refuses to run on a memory-cache instance, drop this step and leave the old database alone. It is unused and harmless.

### D3. The DM's list query leaves out the own entry

`AccessProvider` subscribes to `query(accessEntriesRef(db), where(documentId(), '!=', myEmail))` instead of the whole collection. `myEmail` is the signed-in account's normalized verified address from `useAuth()`. The list rule is `allow list: if isDm()`, with no condition on the documents, so the filtered query is allowed as is. A `!=` filter on the document ID needs no composite index.

The provider adds the own entry back: the `signedIn` auth state gains `ownEntry: AccessEntry`, the last answer of the own-entry check (always present in that state, because `member` needs an entry). `entries` is then `ready` with `[ownEntry, ...others]` once the query is ready, so `AccessSection`, `accessRows` and the duplicate check keep working unchanged. The own entry's `uid` link still comes from the same check, so the row shows the DM's profile as before.

*Alternatives:*
- Two range queries (`< myEmail` and `> myEmail`) merged on the client: also works, but needs two listeners and merging code. Kept as the fallback if `!=` on `documentId()` turns out to be unsupported in the emulator or the SDK.
- Filter the own entry out on the client: does not help. The entry would still be in the query's target and could still go into limbo.

### D4. Firestore Lite for the diagnostic read

`src/lib/firebase/firestoreLite.ts` exports an async `getLiteDb()`. It dynamically imports `firebase/firestore/lite`, calls `getFirestore(firebaseApp)` and, in emulator mode, `connectFirestoreEmulator` once. Lite is a separate component on the same app and uses the same Auth session for its token. It has no cache and no listeners, and makes one REST call per read. `readEntryFromServer` takes no `db` any more. It uses `getLiteDb()` and Lite's `getDoc` on the same converter-free path, and keeps its "never throws" contract. Loading Lite only when the "ekli değil" screen needs it keeps it out of the main bundle.

*Changed during apply:* a static `import … from 'firebase/firestore/lite'` in `api.ts` put Lite in the main bundle. So `firestoreLite.ts` exports `existsOnServer(collection, id)` instead of `getLiteDb()`, and it is the only module that loads `firebase/firestore/lite`, through a dynamic `import()`. `readEntryFromServer` calls `existsOnServer`. The build shows Lite as its own chunk, loaded with `import()`.

`docs/conventions.md` adds `firebase/firestore/lite` next to `firebase/firestore`: only `src/lib/firebase/firestoreLite.ts` imports it, and feature `api.ts` modules call its helper.

### D5. Offline banner text

"Çevrimdışısın — değişiklikler bağlantı gelince eşitlenecek. O zamana kadar uygulamayı kapatma." The second sentence is the new part.

## Risks / Trade-offs

- [More reads at each page load] → Most queries are limited (`limit(n)` on the log, dice, draws and combat). The unlimited ones (cards, sets, users, holdings) are small for one table. Check usage in the Firebase console a few days after the release.
- [A queued offline write is lost if the tab closes] → The banner says to keep the app open. The important writes already need a connection.
- [The hypothesis is wrong and the DM is thrown out again] → After C, a reload fixes it. The diagnostic line, now independent, then shows whether the server holds the entry. That decides the next step.
- [`!=` on `documentId()` is not supported] → The emulator test catches it. Then use the two range queries from D3.
- [A limbo rejection still drops another person's row from the DM's list until reload] → Display only. It does not affect anyone's access.

## Migration Plan

No data or rules change. It deploys with the next push to `master`. On the first load after the deploy, each device starts with an empty memory cache and reads from the server. D2 removes the old IndexedDB database. Rollback is a revert. The old persistent cache would then start empty, because D2 cleared it.
