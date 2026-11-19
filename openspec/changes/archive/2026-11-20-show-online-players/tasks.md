# Tasks

## 1. The presence data path

- [x] 1.1 Add `src/features/presence/schema.ts` with the zod schema `{ lastSeen: Timestamp | null }` and its module-level converter, plus `schema.test.ts`. Verify with `npm run test` that a pending `null` and a timestamp pass, that a missing or non-timestamp `lastSeen` fails, and that an extra field is dropped on read like every other schema (the rules refuse it on write).
- [x] 1.2 Add the `match /presence/{uid}` block to `firestore.rules` above the catch-all, as in design D5, with a comment pointing to spec player-presence, "Presence access".
- [x] 1.3 Add `tests/presence.rules.emulator.test.ts` covering every allowed and denied case in design D5 (signed out, outsider, other user's record, client time, extra field). Verify with `npm run test:emulator`.

## 2. Presence timing (pure logic)

- [x] 2.1 Add `src/features/presence/timing.ts` with `HEARTBEAT_MS`, `LOOK_WINDOW_MS`, `ONLINE_WINDOW_MS`, the 10-second beat throttle and `shouldBeat(state, now)` (visible, look window, `navigator.onLine`, leaving flag, throttle). Cover each branch in `timing.test.ts`, including the 60-minute boundary and the leaving flag.
- [x] 2.2 Add `onlineUids(records, now, selfUid)` and the clock-offset helper (design D4) with unit tests. Cover the 5-minute boundary, a pending `lastSeen` counted as now, the user's own uid always online, a missing record counted as offline, and a skewed device clock corrected by the offset.

## 3. Reporting and reading presence

- [x] 3.1 Add `src/features/presence/api.ts` (`presenceRef`, `presenceCollectionRef`, `beat` with `serverTimestamp()`, `removePresence`) and `api.emulator.test.ts`. Verify that a beat creates the record with the server time and that removing it deletes the record.
- [x] 3.2 Add `presenceContext.ts` (`usePresence()` returning `Subscription<ReadonlySet<string>>`, and `usePresenceActions()` with `leave()`) and `PresenceProvider.tsx`, as in designs D2 to D4. The provider handles the visibility, online, `pagehide` and `pageshow` events, the heartbeat timer, the "own record missing" beat, the 30-second tick, and `leave` with a 2-second limit. Test it with fake timers and a mocked api: it beats at start, stops 60 minutes after the tab was hidden, beats again on `visibilitychange`, never beats while leaving, and `leave` resolves within 2 seconds when the delete hangs.
- [x] 3.3 Mount `PresenceProvider` under `UsersProvider` in `src/app/App.tsx` and update its composition comment. Verify that `npm run check` passes.
- [x] 3.4 Add `src/test/TestPresenceProvider.tsx` (`online` defaults to `loading`, plus a fake `leave`), and add the `presence` option and `setPresence` to `renderApp`. Verify that the existing unit tests still pass with `npm run test`.
- [x] 3.5 In `src/app/layout/UserBadge.tsx`, call `leave()` before `signOut()`. Extend its test so the sign-out still happens when `leave` rejects or hangs.
- [x] 3.6 Update `docs/conventions.md`: add the `presence/` folder to the project layout, a "Presence" bullet under "Shared data comes from a provider" (one subscription, the heartbeat, `usePresence`, `usePresenceActions`), the `presence` option in the `renderApp` list, and `lcm.players.hideOffline` wherever the device-setting keys are named. Verify the text matches the code.

## 4. The "Oyuncular" list

- [x] 4.1 Add `orderByPresence(profiles, online)` in `src/features/users/` as a stable partition, with unit tests. Verify with the spec's order "Can, Gökay, Ayla, Bora, Deniz" and that the name order is kept inside each group.
- [x] 4.2 Add `EyeIcon` and `EyeOffIcon` to `src/components/ui/icons.tsx` in the existing SVG style.
- [x] 4.3 Update `PlayerList.tsx` as in design D6:
  - the online dot on the avatar and the screen-reader-only "çevrimiçi" outside the link;
  - the online-first order only when presence is ready;
  - the heading count "(6 · 3 çevrimiçi)";
  - the hide toggle (`aria-pressed`, "Çevrimdışıları gizle", shown only while the list is open, `lcm.players.hideOffline`);
  - keeping the shown hand's user when filtering;
  - showing everyone while presence is loading.
- [x] 4.4 Extend `PlayerList.test.tsx` with one test per scenario in the user-profiles delta: "Online users first", "Before presence has loaded", the online mark (and that the link name is unchanged), the online count (open and closed), hide and show, someone coming online while offline users are hidden, the shown hand staying, the sidebar and the mobile menu sharing the setting, no icon while the list is closed, and the existing collapse tests still passing. Verify with `npm run test`.
- [x] 4.5 Add a test showing that another `useProfiles()` list keeps the name order while presence says otherwise (scenario "Other lists keep the name order").
- [x] 4.6 Update the "Oyuncular" list description in `docs/domain.md`: the online mark, online users first, the online count, the hide icon, and the one-hour background rule.

## 5. The combat setup

- [x] 5.1 Add `initialCombatChoice(characters, profiles, presence)` in `src/features/combat/` with unit tests. Verify that online players' unarchived characters are checked, that offline players' and the DM's are not, and that every player's characters are checked while presence is `loading` or `error`.
- [x] 5.2 Add `offline` to `JoinGroup`. Show the muted "çevrimdışı" after the owner's name in `JoinCombatDialog`. Wire `InitiativeTab` to `usePresence()`: "Savaş başlat" uses `initialCombatChoice` and the live offline flags, and "Savaşa ekle" passes `offline: false`.
- [x] 5.3 Extend `InitiativeTab.test.tsx` with the initiative-tracker delta's scenarios through `renderApp`'s `presence` option: "The default choice", "An offline player", "Bringing an offline player's character in", "Presence not loaded", and "A player comes online during the setup" (use `setPresence`; the checkbox stays unchecked and the mark goes). Verify with `npm run test`.
- [x] 5.4 Add one sentence to the **Savaş** entry in `docs/domain.md`: "Savaş başlat" checks only the online players' characters at first, and the DM can check the rest.

## 6. Integration

- [x] 6.1 Run `npm run check` and `npm run test:emulator`. Both pass.
- [x] 6.2 On the emulators, sign in as the DM and as Oyuncu 1 in two browser windows, with Oyuncu 2 signed out.
  - Each sees the other online and first in the list, with the heading count right.
  - Closing Oyuncu 1's tab makes Oyuncu 1 offline in the DM's list.
  - Hiding offline users keeps the shown hand.
  - The header row fits at a 360 px width.
  - The DM's "Savaş başlat" checks only Oyuncu 1's characters, and marks Oyuncu 2 as offline.
- [x] 6.3 Stop the dev server and the emulators with SIGINT to the process group, wait for the data export, and confirm with `lsof -nP -iTCP -sTCP:LISTEN` that no project port is still held.

## Workflow follow-up

- Archive the change with `/opsx:archive` once the owner has checked it, then commit (feat + docs archive). Push only on request, because a push deploys to the live project.
