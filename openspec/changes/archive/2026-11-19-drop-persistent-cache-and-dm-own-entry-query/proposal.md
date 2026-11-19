# Proposal

## Why

Every so often the DM, and only the DM, is thrown out of the app to the "ekli değil" screen. Reloading does not help. Only clearing all of the site's data does. The likely cause is the Firestore SDK's limbo handling. The DM's own access-list entry is in two listeners: the own-entry check, and the `allowedEmails` collection query of the "Masaya erişim" section. A player's entry is only in the first. When the collection query reconnects, the SDK can put the entry in "limbo" and open a separate listen to resolve it. If the server rejects that listen, the SDK writes a synthetic "deleted" entry into the local cache (`syncEngineRejectListen`, in the SDK's own words "kind of a hack"). The open own-entry listener then reports "no entry" as a server answer, and the persistent IndexedDB cache with its resume token keeps that state across reloads.

The diagnostic line added by `diagnose-no-access` cannot show this. Its "direct server read" uses `getDocFromServer`, which joins the listener that is already open on the same document and reads the same corrupted view.

## What Changes

- Firestore keeps its cache in memory, not in IndexedDB. A corrupted cache can then never outlive a reload. Offline behavior narrows: loaded data stays readable and writes stay queued **only while the app stays open**. Opening the app without a connection shows the loading state, and writes queued offline are lost if the tab is closed or reloaded before the connection returns. Open tabs no longer share one cache. **BREAKING** for offline use, which the owner accepts: the app is used at the table, online, and draws, packs, LP and other important writes already require a connection.
- The DM's access-list query leaves out the DM's own entry, so that entry is never in a collection query and never goes into limbo. The "Masaya erişim" section still shows the DM's own row, taken from the own-entry check.
- The diagnostic line's server read goes through Firestore Lite, which has no cache and no listeners. That makes it truly independent of the subscription. The line's text stays the same.
- The offline banner also tells the user to keep the app open until the connection returns.
- Not in scope: retrying or working around limbo rejections in other queries. With the memory cache, they can cost at most a reload.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `realtime-sync`: "Offline tolerance" covers only an app that stays open, and the local cache is no longer kept across reloads or shared by tabs. A new scenario requires a reload to always start from the server's data.
- `user-auth`: "Diagnosing the 'ekli değil' decision" requires the server read to bypass the device's cache and open subscriptions.
- `app-shell`: the "Offline status banner" text adds that the app must stay open for the changes to sync.

The feature specs that promise "saved when the connection returns" (`dice-rolls`, `player-notes`, `characters`, `character-effects`) keep their text. They inherit the narrower rule from `realtime-sync`, which owns offline behavior for every feature. `table-access` does not change: the DM's own row is still shown and is still marked as the DM and as themselves.

## Impact

- `src/lib/firebase/firestore.ts`: `memoryLocalCache()` replaces `persistentLocalCache` and the multi-tab manager.
- `src/lib/firebase/firestoreLite.ts` (new): a lazily loaded Firestore Lite instance on the same app, connected to the emulator in development.
- `src/features/access/api.ts`: `readEntryFromServer` uses Lite. A new query for the list without one address.
- `src/features/access/AccessProvider.tsx`: subscribes to the list without the DM's own entry and adds that entry back from the auth state.
- `src/features/auth/authContext.ts`, `AuthProvider.tsx`: the `signedIn` state carries the account's own entry.
- `src/app/layout/OfflineBanner.tsx`: the new Turkish text.
- `docs/conventions.md`: Firestore Lite joins the list of who imports Firestore.
- Tests: unit tests for the provider, the banner and the Lite read, and an emulator test that the rules allow the DM's filtered list query. No rules or data changes.
- Existing IndexedDB caches on devices stay on disk unused. The SDK does not read them without the persistent cache. They can be cleared once with `clearIndexedDbPersistence` (see design).
