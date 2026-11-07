# Design

## Context

See `proposal.md` for the motivation, and `specs/` for the behavior contracts (`user-profiles`, `admin-scripts`, and the removal in `user-auth`).

**Current state**
- **Auth.** `AuthProvider` (`src/features/auth/`) exposes the Firebase Auth session as a plain `AuthUser` with `uid`, `displayName`, `email`, and `photoURL`. `RequireAuth` guards every screen, and `App.tsx` composes `AuthProvider` with the router.
- **Firestore.** It is closed by a catch-all rule. `src/lib/firestore/` has `createConverter(schema)`, `useDocument`, and `useCollection`. Converters return the document data only, without the ID.
- **Tests.**
  - Unit tests never touch Firebase. Components get auth from `TestAuthProvider`, and `renderApp` renders the real route table.
  - Emulator tests (`*.emulator.test.ts`) run under `firebase emulators:exec`, which sets `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST`. The rules tests use `@firebase/rules-unit-testing` on port 8080 and clear Firestore before each test.
- **Tooling.**
  - There is no admin SDK and no `scripts/` folder yet.
  - Node 24 runs `.ts` files directly (type stripping). `tsconfig.node.json` already has `allowImportingTsExtensions` and `erasableSyntaxOnly`, and it includes `vite.config.ts` and `tests/`.
  - ESLint gives `.ts` files browser globals.

**Decisions from the exploration with the owner**
- **One group.** There are no multiple groups.
- **Roles.** Everyone who signs in is a player. Only a script can make someone admin, and admin is the same as DM.
- **Reading.** Every signed-in user can read everything, other players' cards included.
- **DM-only work.** Card definitions are written only by the DM, and the DM gets a different screen with the controls needed for that work.
- **Players' own actions.** Players can do some card actions themselves: using a card, opening packs, and drawing.
- **One data script setup.** Data scripts must work for both the emulator and Firebase, so the work is not done twice.

## Goals / Non-Goals

**Goals:**
- **One source of truth for the role.** The `role` field in a Firestore profile is what both the UI and the security rules read.
- **Script setup ready for reuse.** A script setup that the card import script (next change) reuses as is.
- **A target data model.** The model is written down once (below), so later changes add their part without re-deciding the whole.

**Non-Goals:**
- **No role management UI.** Roles are changed by script only, by the owner's decision.
- **No DM-only screens or data paths yet.** The `isDm()` rule helper arrives with the first path that needs it.
- **Firebase custom claims and Cloud Functions are not used.**

## Decisions

### D1. The role lives in the profile document, not in a custom claim

The profile is `users/{uid}`, and its `role` field is `'player' | 'dm'`. The script writes it with the Admin SDK, which bypasses the rules. No client may change it.

Why not a custom claim:
- A claim reaches the client only when the ID token refreshes, which takes up to an hour unless the user signs in again. The spec requires the shell to switch to "DM" without a reload, and a Firestore subscription delivers that at once.
- Other users cannot see a claim, but the "Oyuncular" list must mark the DM. A claim would therefore need a mirror field anyway, and then there would be two sources of truth.
- Cost: once a rule checks `isDm()`, it does `get(users/{uid})`, which is billed as one read per evaluated request. At this group's size, that is negligible.

### D2. Profile shape

```
users/{uid}
  displayName   string (1-100) | null
  photoURL      string (<= 2048) | null
  role          'player' | 'dm'
  createdAt     timestamp            // set once, = request.time
```

- The zod schema is in `src/features/users/schema.ts`.
- **No `email` field.** Profiles are readable by everyone, and the script looks the user up by email through Firebase Auth instead.
- **Later fields come with defaults.** Later changes add fields such as `lp` with zod defaults, so existing profiles need no migration.

### D3. Converters can return the document ID

`createConverter(schema, { idField: 'id' })` returns `{ ...parsed, id: snapshot.id }`, and `toFirestore` drops `id`. Without the option, behavior is unchanged.

The player list needs each `uid`, and every later collection needs document IDs too (cards, userCards, draws). That is why the option goes into the shared library instead of storing a redundant `uid` field.

A unit test is added to `converter.test.ts`.

### D4. `UsersProvider` owns profile sync and sharing

`src/features/users/UsersProvider.tsx` is mounted in `App.tsx`, inside `AuthProvider`:

```
AuthProvider --> UsersProvider --> RouterProvider
                    |
                    +-- signed in?  ensureProfile(db, user) once per uid
                    +-- subscribes: users/{uid}   -> currentProfile
                    +-- subscribes: users (all)   -> profiles
```

**`ensureProfile(db, user)`** lives in `src/features/users/api.ts` and runs once per signed-in `uid` per app start.
- It runs in a transaction:
  - If the profile is missing, it creates the profile with `role: 'player'` and `createdAt: serverTimestamp()`.
  - If the profile exists but the Google name or picture differs, it updates only `displayName` and `photoURL`.
  - Otherwise it does nothing.
- The transaction makes two tabs signing in at once safe: the second run re-reads the profile and takes the update path.
- Offline, the transaction fails. The error is logged, and the next start retries. Meanwhile the user counts as a player, so no DM control can appear by mistake.

**What the provider exposes:**
- `useCurrentProfile(): Subscription<UserProfile | null>`
- `useIsDm(): boolean`, which is `true` only when the current profile is ready and has `role === 'dm'`
- `useProfiles(): Subscription<UserProfile[]>`

**Signed out:** `useDocument` and `useCollection` accept `null`. With `null` they listen to nothing and are `ready` at once: `null` for a document, `[]` for a collection. The provider therefore keeps one stable tree around the router and only switches its targets.

**Sorting:** the profile list is sorted on the client with `localeCompare(…, 'tr')`. Firestore orders by code points, which puts Turkish letters such as "Ç" and "Ş" in the wrong place.

**Unit tests:**
- `TestUsersProvider` (`src/test/`) supplies fixed values, the same way `TestAuthProvider` does.
- `renderApp` gets a `users` option, defaulting to a signed-in player.
- `ensureProfile` takes the Firestore instance as a parameter, so an emulator test can run it under the real rules.

### D5. Role in the UI

- **`UserBadge`** shows a small role label under the name: "DM" in gold, "Oyuncu" muted. While the profile loads, it shows nothing.
- **`PlayerList`** sits in `SidebarContent`, between the menu and the user badge:
  - a heading "Oyuncular"
  - one row per profile, with picture or initial, name, and a "DM" tag
  - a small spinner while loading
  - a Turkish error line
  - "Henüz oyuncu yok" when the list is empty

  It is a presentational component fed by `useProfiles()`, so its tests need no Firebase. The sidebar already scrolls when it is too long.
- **`<DmOnly>{…}</DmOnly>`** renders its children only when `useIsDm()` is true. Nothing in this change uses it yet. A unit test covers player, DM, and loading. Hiding controls is a convenience only; the rules are the real check.

### D6. Firestore rules for `users/{uid}`

```
match /users/{uid} {
  allow read:   if isSignedIn();
  allow create: if isSelf(uid)
                && data().keys().hasOnly(['displayName','photoURL','role','createdAt'])
                && data().keys().hasAll(['displayName','photoURL','role','createdAt'])
                && data().role == 'player'
                && data().createdAt == request.time
                && validName(data().displayName) && validPhoto(data().photoURL);
  allow update: if isSelf(uid)
                && changed().hasOnly(['displayName','photoURL'])
                && validName(data().displayName) && validPhoto(data().photoURL);
  allow delete: if false;
}
```

- `isSelf(uid)` means signed in and `request.auth.uid == uid`.
- `data()` is `request.resource.data`, and `changed()` is `request.resource.data.diff(resource.data).affectedKeys()`.
- Nobody, including the DM, can change another profile or any role from a client. Only the Admin SDK can.

`tests/firestore.rules.emulator.test.ts` gets a `users` block. It covers:
- reads by the user, by others, and signed-out
- creating one's own profile, and creating another user's profile
- creating with role `dm`
- a wrong `createdAt`
- extra fields, and an over-long name
- updating name and picture, and updating the role
- updating another user's profile while signed in as the DM
- deletes

**Seeding the DM in tests:** the DM's profile is seeded with rules disabled, because no client write can create it.

### D7. Admin scripts on Node 24 with `firebase-admin`

**Layout:**

```
scripts/
  set-role.ts              CLI: npm run set-role -- --email x@y.z --role dm [--project id] [--yes]
  lib/
    target.ts              parse --project/--yes, choose emulator or real project, confirm, init Admin SDK
    setRole.ts             setRoleByEmail({ auth, db }, email, role) -> result (no printing, no exit)
    messages.ts            Turkish CLI messages
```

**Runtime.**
- Scripts run with `node scripts/<name>.ts`, using Node 24 type stripping, so neither `tsx` nor a build step is needed.
- Imports use explicit `.ts` extensions and relative paths. There is no `@/` alias, and no app code is imported.
- Arguments are parsed with `node:util` `parseArgs`.

**Targets:**
- **Default: the emulators.**
  - The project is `demo-legend-cards`.
  - If `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST` are unset, they are set to `127.0.0.1:8080` and `127.0.0.1:9099` before the Admin SDK starts.
  - A quick HTTP check of both ports runs first. If either fails, the script prints "Emulatorler çalışmıyor: önce `npm run emulators` veya `npm run dev`." and exits 1.
- **`--project <id>`: a real project.**
  - If an emulator variable is set at the same time, the script refuses, so a run never mixes targets.
  - Credentials come from Application Default Credentials, either `gcloud auth application-default login` or `GOOGLE_APPLICATION_CREDENTIALS`.
  - The script prints the project ID and asks the user to type it to confirm. Anything else aborts without changes. `--yes` skips the question for deliberate, scripted runs.
  - A `demo-` ID passed with `--project` is refused; demo projects are only for the emulators.

**`setRoleByEmail` returns** one of: `updated` (with name, old role, new role), `unchanged`, `no-such-user`, `no-profile`, or `invalid-role`.
- The CLI maps each result to a Turkish line and an exit code: 0 for `updated` and `unchanged`, 1 for the others.
- It looks the user up with `auth.getUserByEmail`.
- A missing profile is an error, not a reason to create one. The app creates profiles, and the script only changes the role (spec: "Role script refuses unknown users").

**Language.** CLI messages are Turkish, because they are interface text for the owner. Code and comments are English.

**Config:**
- `tsconfig.node.json` includes `scripts`.
- ESLint gets a block for `scripts/**` with Node globals.
- `package.json` gets `"set-role": "node scripts/set-role.ts"`.
- `firebase-admin` is a dev dependency, never imported from `src/`.

**Tests:**
- `scripts/lib/target.test.ts` (unit, Node environment) covers argument parsing and target choice: the default, `--project`, `demo-` refused, mixed environment refused, and confirmation accepted or declined through an injected input stream.
- `tests/set-role.emulator.test.ts` creates Auth users and profiles through the Admin SDK against the emulators, then checks every `setRoleByEmail` result.
- The unit Vitest project includes `scripts/**/*.test.ts`.

**Reuse.** The card import script (next change) reuses `lib/target.ts` unchanged. This is where the "do it once for the emulators and for Firebase" goal is met.

### D8. Docs

- **`docs/domain.md`:**
  - Actors: everyone who signs in is a player. The DM (admin) is set by script.
  - The "Roles … are not defined yet" sentence goes.
  - A short "Data model" section points to the target model below. Each later change fills in its part.
- **`docs/conventions.md`:**
  - Authentication: "No roles yet" is replaced by `useIsDm()` and `<DmOnly>`, with "the rules are the real check".
  - A new "Scripts" section covers layout, running, targets, and tests.
- **`README.md`:** a "DM yapmak" section explaining how to run `npm run set-role` for the emulators and for a real project.

## Target data model

This is the agreed model for the following changes. Only `users` is built now. Later changes may refine field details, but not the overall shape without revisiting this section.

```
users/{uid}               this change
  displayName, photoURL, role, createdAt
  lp                      [pack-opening] balance; players may only lower it by paying for a pack or draw

party/main                [pack-opening] the group's single shared purse
  gp                      players may only lower it by paying for a pack with GP; only the DM raises it

cards/{cardId}            [card-library] card definitions; written only by the DM (and the import script)
  kind                    normal | blessed | cursed
  name, nameKey, set, cost, rarity, mechanicPack, text
  imageUrl                null until [card-images]
  holder                  null | { uid, userCardId }   normal cards only; null = in the pool
  retired                 cards are retired, never deleted, so history keeps its links

userCards/{id}            [card-holdings] one card's stay with one player
  cardId, cardName, uid
  givenAt (= creation time), givenBy, givenVia: pack | draw | dm | transfer | initial, drawId
  active, note, costOverride
  returnedAt, returnedBy, returnReason: used | discarded | transferred, usedOn ("on which character")

draws/{id}                [pack-opening] every pack opening or draw: what was offered
  uid, kind: pack | random | cursed, packType, packTitle
  offered[], chosen[], status: open | chosen | abandoned
  paidWith: lp | gp | none, cost, createdAt, chosenAt

ledger/{id}               [pack-opening] LP and GP history
  currency: lp | gp, account: uid | party, delta, balanceAfter
  reason: manual | pack | draw, drawId, by, at
```

**Rules agreed with the owner for those changes:**
- **Card movements are transactions.** Giving a normal card sets `holder` only if it is `null`, so two devices cannot take the same card.
- **Kinds of card.** Cursed and Blessed cards have no `holder`. A DM's extra copy of a held card creates a `userCard` without touching `holder`.
- **Transfers.** A transfer closes the old `userCard` and opens a new one.
- **Who may act:**

  | Action | Players (for themselves) | DM (for anyone) |
  | --- | --- | --- |
  | open packs and draw | yes | yes |
  | use a card, with "on which character" | yes | yes |
  | edit card notes | yes | yes |
  | discard without use, toggle active, transfer, override cost, add `initial` entries, adjust LP and GP | no | yes |
- **Paying for packs and draws:**
  - When a player opens a pack, its LP price, or its GP price from the party purse, is taken at opening time, even if the player never chooses.
  - Random draws cost 1 LP.
  - Re-opening a pack is allowed.
  - A DM's openings cost nothing.

  This deliberately changes the legacy rule "LP is only changed by hand" for player actions.
- **History is permanent.** Card and LP/GP history lasts across sessions. This deliberately changes the legacy "log lasts one session" for this history.

## Risks / Trade-offs

- **[Risk] An unknown profile reads as "player".** A failed or late `ensureProfile` (offline at first sign-in) leaves a user without a profile. Mitigation:
  - The app treats a missing profile as a player, which is the safe default.
  - The profile is created on the next online start.
  - The role script reports "no profile" instead of guessing.
- **[Risk] The script hits the real project by accident.** Mitigation:
  - The emulator is the default.
  - `--project` is required, and the project ID must be typed to confirm.
  - Mixed emulator and real environment is refused, and so are `demo-` IDs with `--project`.
- **[Risk] Node type stripping limits.** Only erasable TypeScript is allowed. Mitigation: `erasableSyntaxOnly` is already on in `tsconfig.node.json`, so `tsc -b` catches enums, parameter properties, and similar.
- **[Trade-off] Profiles are readable by everyone, by the owner's decision.** That is why profiles hold no email address.
- **[Trade-off] Each `isDm()` check costs one read.** Accepted for a real-time role (D1).
- **[Risk] Rules tests seed state with rules disabled.** Without the Admin SDK, a DM profile can only exist that way. Mitigation: the role script's emulator test covers the real write path.

## Migration Plan

- **Existing accounts** (emulator test users) get a player profile on their next start. No data migration is needed.
- **Making the first DM:** sign in once, then run `npm run set-role -- --email <owner's email> --role dm`. On a real project, add `--project <id>`.
- **Rollback:** revert the change. Profiles stay in Firestore, unused, and the closed catch-all rule makes them unreadable again.

## Open Questions

- Whether the "Oyuncular" list should eventually leave out the DM, or show LP next to each name. This is decided in the pack-opening change, when LP exists.
