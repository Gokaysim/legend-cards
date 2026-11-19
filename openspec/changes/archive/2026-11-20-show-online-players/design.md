# Design

## Context

- The "Oyuncular" list (`src/features/users/PlayerList.tsx`) renders `useProfiles()`. `UsersProvider` sorts the profiles by name with `sortProfiles`, and about 20 other places read the same list.
- The project runs Firestore (eur3), Storage and Hosting on the Blaze plan. It has no Realtime Database and no Cloud Functions. Firestore has no "client disconnected" signal (see `src/lib/useOnlineStatus.ts`).
- The `users/{uid}` rule is close to the 1000-expression limit, and every profile change reaches every `useProfiles()` reader.
- Precedent for time-based state: draw sessions are read as ended by comparing a server time with the device clock on a ticking `now` (`sessionState`, `useNow`). Staleness is never written.
- Device settings live in `src/lib/deviceSetting.ts` (`useDeviceFlag`). The list's open state uses `lcm.players.open`.
- Sign-out is triggered from `src/app/layout/UserBadge.tsx`. The no-access pages also sign out, but their users never write presence.

## Goals / Non-Goals

**Goals:**
- Presence that needs no new Firebase service and costs nothing at this table's size.
- One subscription to all presence records per device, shared by the sidebar and the mobile menu.
- No changes to the profile documents or their rules.

**Non-Goals:**
- Telling an active user from an idle one (no mouse or keyboard tracking). A tab on screen counts as looked at.
- Presence on a locked phone. Mobile browsers pause the page, so such a user turns offline after about 5 minutes.
- A "last seen at" display, or presence anywhere other than the "Oyuncular" list.

## Decisions

### D1. A Firestore heartbeat in its own collection

Each user has one document, `presence/{uid}`, holding `{ lastSeen: <server time> }`. The device writes it with `setDoc` and `serverTimestamp()`. Leaving deletes it.

- **Over the Realtime Database with `onDisconnect`:** RTDB detects a disconnect faster, but it adds a service, a rules file, an emulator port, a CI deploy permission and a bigger SDK. Its rules also cannot read `allowedEmails`, so either any Google account could read who is online, or the access list would need a second copy.
- **Over a field on `users/{uid}`:** a field there would make every heartbeat re-render every `useProfiles()` reader. It would also add a branch to a rule that is near its expression limit.

**Cost.** For 6 users and a 4-hour session with a 2-minute heartbeat:

| | Per session |
|---|---|
| Writes | about 720 |
| Rule reads (`isMember()`) | about 720 |
| Listener reads | about 4,300 |

The free daily quota is 20,000 writes and 50,000 reads.

### D2. When the device reports

`PresenceProvider` runs while `useAuth().status === 'signedIn'`.

- **Constants.** `HEARTBEAT_MS` is 2 minutes, `LOOK_WINDOW_MS` is 60 minutes and `ONLINE_WINDOW_MS` is 5 minutes. They live in `src/features/presence/timing.ts`.
- **Last look.** The device keeps `lastLookedAt` in memory. It is set to now at start, while `document.visibilityState === 'visible'`, and on every `visibilitychange`.
- **The timer.** Every `HEARTBEAT_MS`, the device beats when the tab is visible, or when `now - lastLookedAt < LOOK_WINDOW_MS`. It never beats while `navigator.onLine` is false, so the offline write queue does not fill up.
- **When it beats at once:**
  - at start;
  - when the tab becomes visible;
  - when the browser goes back online;
  - when its own record is missing from the snapshot while it should be reporting (see D3).

  At most one beat goes out per 10 seconds, so quick tab switches stay cheap.
- **Background timers.** Chrome throttles them to about once a minute, which is enough for a 2-minute interval.
- **Failed writes.** For example after the user is removed from the access list. They are logged once and otherwise ignored.

The decision logic (`shouldBeat(state, now)`) is a pure function with unit tests. The provider only wires it to timers and events.

### D3. Leaving

- **Closing or reloading.** On `pagehide`, the device sets a `leaving` flag and calls `deleteDoc` on its own record without waiting. The browser may drop that write. Then the 5-minute rule applies.
- **Back from the back-forward cache.** On `pageshow` with `persisted`, the flag clears and the device beats.
- **Sign-out.** `UserBadge` calls `usePresenceActions().leave()` and then `signOut()`. `leave` sets the flag and waits for the delete for at most 2 seconds, so an offline device can still sign out.
- **While leaving, nothing beats.** This includes the "own record missing" rule, so the record is not recreated.

The "own record missing" rule handles two tabs of the same user. Closing one tab deletes the shared record. The other tab sees it disappear and beats again within 10 seconds, instead of leaving the user offline until its next beat.

### D4. Who counts as online

`onlineUids(records, now, selfUid)` is a pure function. It returns a set of uids:

- A record counts as online when `now - lastSeen <= ONLINE_WINDOW_MS`.
- A pending `lastSeen` (`null` in a local snapshot) counts as now.
- The signed-in user is always in the set.

The provider recomputes it on every snapshot and on a 30-second `useNow` tick.

**Clock skew.** Comparing a server time with the device clock is the draw-session precedent. In addition, the device measures its own offset: the difference between its own confirmed `lastSeen` and the local time it sent that beat. The device adds this offset to `now`. A device clock that is minutes off would otherwise mark everyone wrong, because the online window is only 5 minutes.

`usePresence()` returns `Subscription<ReadonlySet<string>>`. While the collection is loading it is `loading`, and the list treats only the signed-in user as online. On an error the result is the same, and the list shows no online count.

### D5. Rules

```
match /presence/{uid} {
  allow read: if isMember();
  allow create, update: if isMember() && isSelf(uid)
    && request.resource.data.keys().hasOnly(['lastSeen'])
    && request.resource.data.lastSeen == request.time;
  allow delete: if isMember() && isSelf(uid);
}
```

The tests go in a new `tests/presence.rules.emulator.test.ts`, following `lore.rules.emulator.test.ts`.

**Allowed:**
- a member reads anyone's record;
- a member writes their own record with the server time;
- a member deletes their own record.

**Denied:**
- a signed-out request, and an outsider's read or write;
- writing or deleting someone else's record;
- a time from the client;
- an extra field.

### D6. The list

**Order.** `orderByPresence(profiles, online)` in `src/features/users/` is a stable partition of the already name-sorted profiles: online users first, then the rest. `PlayerList` applies it only when presence is `ready`. `UsersProvider` and `sortProfiles` stay as they are, so no other list changes.

**The online mark.**
- A small `bg-green` dot with a `pane` ring sits on the avatar's lower right. It is inside the link and `aria-hidden`.
- The text "çevrimiçi" is a screen-reader-only span after the link, next to the LP. This keeps the link's name as the user alone.
- A screen-reader-only text needs no leading space when it is a separate element.

**The heading.**
- The header becomes a row: the existing collapse button inside the `h2`, and next to it, outside the `h2`, the icon button.
- The count reads `(6 · 3 çevrimiçi)` when presence is ready and `(6)` otherwise.
- The region keeps its `aria-label` "Oyuncular".

**The hide toggle.**
- It is a `button` with `aria-pressed`, and its `aria-label` and `title` are "Çevrimdışıları gizle".
- It shows `EyeIcon` when offline users are shown and `EyeOffIcon` when they are hidden. Both are new in `src/components/ui/icons.tsx`, in the existing hand-drawn SVG style.
- It renders only while the list is open.
- The state is `useDeviceFlag('lcm.players.hideOffline', false)`.

**Filtering.**
- Filtering applies only when presence is ready.
- It keeps the user whose hand is shown. `PlayerList` reads that uid from the route with `useMatch` on the hand path.

### D7. The combat setup's first choice

Today `InitiativeTab` passes `initiallyChecked` as every unarchived character whose owner is not a DM. `JoinCombatDialog` copies it into `useState` once, when the dialog opens. That already gives the spec's "chosen when the setup opens": a player who comes online during the setup changes no checkbox, so the DM's own clicks are never overridden.

**The new first choice.** A pure helper, `initialCombatChoice(characters, profiles, presence)` in `src/features/combat/`, keeps the existing filter and adds one condition: the owner is in `usePresence()`'s set.
- When presence is not `ready`, the helper skips the online condition, so a loading or failed presence behaves as before.
- The DM is always "online" in that set, but the DM's characters stay excluded by role, as now.

**The offline mark.** `JoinGroup` gets an `offline: boolean`. When it is true, the dialog shows a muted "çevrimdışı" after the owner's name. The mark is live, because `groups` is recomputed on every render, unlike the checked set.
- "Savaşa ekle" passes `offline: false` for every group. That dialog checks nothing at first, so the mark would add nothing there.

### D8. Tests without Firebase

- `TestPresenceProvider` in `src/test/` takes `online` (a `Subscription<ReadonlySet<string>>`, `loading` by default) and a fake `leave`.
- `renderApp` gets a `presence` option and a `setPresence` setter.
- Because the default is `loading`, existing tests keep the name order. Only the signed-in user gains an online mark, which is announced to screen readers outside the link.

## Risks / Trade-offs

- **[The leave write is dropped on tab close, mostly on mobile]** → The 5-minute rule covers it. The spec promises an immediate offline only when the browser lets the write through.
- **[Two tabs of one user: closing one deletes the shared record]** → The "own record missing" beat in D3 restores it within about 10 seconds.
- **[A tab on screen with nobody at the computer stays online]** → Accepted. Idle detection is a non-goal.
- **[Browsers that freeze background tabs (Memory Saver, battery saver) stop the heartbeat before the hour]** → The user turns offline early. The tab beats again when it comes back on screen.
- **[A device clock that is far off]** → Corrected by the measured offset (D4). Until the first confirmed beat, the local clock is used.
- **[The list reorders under the pointer when someone comes or goes]** → Accepted by the owner as the price of "online first".
- **[A member removed from the access list keeps a record until it ages out]** → Harmless. The record holds only a time, and the user turns offline within 5 minutes.

## Migration Plan

- Rules, indexes and hosting deploy together through the CI workflow on a push to `master`. No composite index is needed: the collection is read whole.
- Devices still running the old bundle do not report presence and count as offline until they reload. Hosting serves `index.html` with `no-cache`, so a reload picks up the new bundle.
- Rollback: revert the commit. Leftover `presence` documents are unreadable once the path closes, and can be deleted from the console.
