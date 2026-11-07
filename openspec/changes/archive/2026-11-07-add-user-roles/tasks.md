# Tasks

Before running any command, run `. ~/.nvm/nvm.sh && nvm use` from the repository root. Never point a script at a real project during this change: every script run and test uses the emulators.

## 1. Converters with document IDs

- [x] 1.1 Add the `idField` option to `createConverter` in `src/lib/firestore/converter.ts` (D3):
  - With the option, `fromFirestore` returns `{ ...parsed, [idField]: snapshot.id }` and `toFirestore` drops that field.
  - Without it, behavior is unchanged.
  - Type the result so `id` is a `string`.

  Extend `converter.test.ts` with three cases: the ID is returned, `toFirestore` strips it, and the default is unchanged. Verify: `npm run test` passes.

## 2. Profile data path

- [x] 2.1 Add the zod `userProfileSchema` and its converter (with `idField: 'id'`) in `src/features/users/schema.ts`, with the shape from D2 (no email). Add a unit test that accepts a valid profile and rejects an unknown role. Verify: `npm run test` passes.
- [x] 2.2 Add the `users/{uid}` block from D6 to `firestore.rules`, above the catch-all, with the helpers `isSelf`, `validName` and `validPhoto`. Add a `users` describe block to `tests/firestore.rules.emulator.test.ts` covering every case listed in D6; the DM profile is seeded with rules disabled. Keep the existing deny-by-default tests passing. Verify: `npm run test:emulator` passes.
- [x] 2.3 Implement `ensureProfile(db, user)` in `src/features/users/api.ts` as the transaction from D4 (create as player, update only name and picture when they differ, otherwise no write). Add `src/features/users/api.emulator.test.ts` (next to the code, like `realtime.emulator.test.tsx`, so the `@/` alias resolves), which runs `ensureProfile` against the emulator under the real rules and covers:
  - the first call creates a player profile with a server timestamp
  - a second call with the same data writes nothing
  - a changed name updates the name and keeps `role` and `createdAt`
  - a profile already set to `dm` keeps its role after `ensureProfile`

  Verify: `npm run test:emulator` passes.
- [x] 2.4 Update `docs/domain.md` (D8):
  - In Actors, everyone who signs in is a player, and the DM (admin) is set by script. The "Roles … are not defined yet" sentence goes.
  - Add a short "Data model" section that names `users/{uid}` and points to the target model in this change's design.

  Verify: `npx prettier --check docs/domain.md` passes.

## 3. Users provider

- [x] 3.1 Implement `UsersProvider`, `useCurrentProfile`, `useIsDm`, and `useProfiles` in `src/features/users/` (D4):
  - `ensureProfile` runs once per signed-in uid. A failure is logged and does not throw.
  - Two subscriptions: one to the current profile, one to all profiles.
  - Profiles are sorted with `localeCompare(…, 'tr')`.
  - Signed-out users get empty or `null` results.
  - `useIsDm()` is `false` unless the current profile is ready with `role === 'dm'`.

  Mount it in `src/app/App.tsx` between `AuthProvider` and `RouterProvider`. Verify: `npm run typecheck` passes.
- [x] 3.2 Add `TestUsersProvider` to `src/test/`, with fixed `currentProfile` and `profiles` values. Give `renderApp` a `users` option, defaulting to a ready player profile for `testUser`. Add a unit test showing that `useIsDm()` is `false` for a player, for a missing profile, and while loading, and `true` for a DM. Verify: `npm run test` passes, including all existing tests.

## 4. Role in the interface

- [x] 4.1 Show the role in `UserBadge` (D5): "DM" in gold or "Oyuncu" muted, and nothing while the profile loads. Extend the AppShell tests to cover the DM label, the player label, and the label changing when the provided profile changes from player to DM without remounting. Verify: `npm run test` passes.
- [x] 4.2 Add the presentational `PlayerList` and put it in `SidebarContent`, between the menu and the user badge (D5). It needs:
  - the heading "Oyuncular"
  - one row per profile, with picture or initial, name, and a "DM" tag
  - a loading state, a Turkish error line, and "Henüz oyuncu yok"

  Add unit tests for these four things:
  - ordering, including Turkish letters such as "Çağla" before "Deniz"
  - the DM tag
  - loading, error, and empty states
  - a new profile appearing when the provided list changes

  Verify: `npm run test` passes.
- [x] 4.3 Add `<DmOnly>` in `src/features/users/` (D5), with a unit test: its children show for the DM, and stay hidden for a player and while loading. Update the Authentication section of `docs/conventions.md`: "No roles yet" becomes `useIsDm()` and `<DmOnly>` plus "hiding is convenience; `firestore.rules` is the real check". Verify: `npm run test` and `npm run format:check` pass.

## 5. Admin scripts

- [x] 5.1 Install the current major of `firebase-admin` as a dev dependency. Update the config:
  - `tsconfig.node.json` includes `scripts`
  - ESLint gets a `scripts/**` block with Node globals
  - the unit Vitest project includes `scripts/**/*.test.ts`, with the Node environment declared per file

  Verify that the build output contains no `firebase-admin` code: `npm run build` passes, and `grep -r "firebase-admin" dist` finds nothing.
- [x] 5.2 Implement `scripts/lib/target.ts` (D7):
  - argument parsing with `parseArgs`
  - emulator default with the reachability check and its Turkish message
  - `--project` with the mixed-environment and `demo-` refusals
  - confirmation by typing the project ID, with an injectable input stream, skipped by `--yes`
  - Admin SDK initialization

  Add `scripts/lib/target.test.ts` covering each branch, including declined confirmation (no initialization happens). Verify: `npm run test` passes.
- [x] 5.3 Implement `setRoleByEmail` in `scripts/lib/setRole.ts`, with the results from D7, and Turkish messages in `scripts/lib/messages.ts`. Add `tests/set-role.emulator.test.ts`, which creates Auth users and profiles with the Admin SDK and covers `updated` (player to dm, dm to player), `unchanged`, `no-such-user`, `no-profile`, and `invalid-role`, checking the stored role after each. Verify: `npm run test:emulator` passes.
- [x] 5.4 Add the `scripts/set-role.ts` CLI and the `set-role` npm script. It maps results to Turkish lines and exit codes (0 for `updated` and `unchanged`, 1 otherwise). With the emulators running, run `npm run set-role -- --email <emulator test user> --role dm`, then `--role dm` again, and confirm both outputs. Then stop the emulators, run it again, and confirm the "Emulatorler çalışmıyor" message and exit code 1.
- [x] 5.5 Document the scripts:
  - a "Scripts" section in `docs/conventions.md` (layout, running, targets, tests)
  - a "DM yapmak" section in `README.md` (emulator command, real-project command with `--project`, confirmation, credentials)

  Verify: `npm run format:check` passes.

## 6. Integration checks

- [x] 6.1 Run `npm run check` and `npm run test:emulator`. Verify: both pass.
- [x] 6.2 With `npm run dev`, check the app end to end:
  - Sign in with two emulator test accounts, in two browser windows.
  - Both appear in "Oyuncular" without a reload, and both shells show "Oyuncu".
  - Run `npm run set-role -- --email <first account> --role dm`. The first window switches to "DM" without a reload, and both lists mark that user as DM.
  - In the Emulator UI, the profiles contain no email address.
- [x] 6.3 Run `openspec validate add-user-roles --strict` and confirm the legacy HTML files are unchanged (`git diff --stat -- reference/legacy/*.html` is empty).

## Workflow follow-up

- Archive with `/opsx:archive` after review, so `user-profiles` and `admin-scripts` become main specs and the user-auth requirement is removed.
- The next change is `add-card-library`. It reuses `scripts/lib/target.ts` for the card import and adds `isDm()` to the rules.
