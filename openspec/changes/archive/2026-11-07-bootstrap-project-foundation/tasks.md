# Tasks

Before running any command, run `. ~/.nvm/nvm.sh && nvm use` from the repository root. Non-interactive shells start on Node 20 (design: Risks). Install the current stable major of each library and follow that tool's current setup docs. The decisions in `design.md` stay fixed. Only the syntax may need adapting.

## 1. Repository and toolchain

- [x] 1.1 Set up the repository basics, then check them:
  - Add `.nvmrc` containing `24`.
  - Add `.npmrc` containing `engine-strict=true`.
  - Add a `.gitignore` covering `node_modules/`, `dist/`, `coverage/`, `.env*.local`, `.firebase/`, `.firebase-emulator-data/`, and `*-debug.log`.
  - Run `git init`. Do not commit.
  - Verify: `nvm use` prints v24, and `git status` lists the new files.
- [x] 1.2 Move `Legend_Card_Manager_v2.1.15.html` to `reference/legacy/` without changing it, and add `reference/legacy/README.md`. That README says the file is a design and behavior reference, not application code. Verify: `shasum -a 256` matches before and after the move.
- [x] 1.3 Create `package.json` (name `legend-cards`, version `0.1.0`, `private`, `"type": "module"`, `"engines": { "node": ">=24" }`), then install the runtime and dev dependencies listed in `proposal.md` (Impact). Verify both:
  - `npm install` succeeds on Node 24 and writes `package-lock.json`.
  - `nvm exec 20 npm install --dry-run` fails with an engine error.
- [x] 1.4 Add the TypeScript configs from D2 (`tsconfig.json` references, `tsconfig.app.json`, `tsconfig.node.json`, the `@/` alias), plus three files:
  - `vite.config.ts`: React plugin, Tailwind plugin, alias, and `__APP_VERSION__` from `package.json` (D14)
  - `index.html`: `lang="tr"`, title "Legend Cards"
  - a minimal `src/main.tsx`

  Verify: `npm run typecheck` and `npm run build` pass, and `dist/` contains no `Legend_Card_Manager` file.
- [x] 1.5 Add the ESLint flat config and the Prettier config, with the Tailwind plugin and the D12 ignore list. Add the `lint`, `format`, and `format:check` scripts. Verify:
  - Both `npm run lint` and `npm run format:check` pass.
  - A temporary explicit `any` in `src/main.tsx` makes `npm run lint` fail. Revert it afterwards.
- [x] 1.6 Configure Vitest with the `unit` and `emulator` projects (D11), a jest-dom setup file in `src/test/`, the `test`, `test:emulator`, and `check` scripts, and one smoke unit test. Verify:
  - `npm run check` passes.
  - A temporary type error makes `npm run check` exit with a failure. Revert it afterwards.
- [x] 1.7 Write the first version of `docs/conventions.md`:
  - the D3 layout and naming rules
  - named exports
  - `type` over `interface`
  - the language rules: English code, docs, and commits; Turkish UI text
  - the domain identifier naming
  - the test file naming

  Verify: every folder named in the doc exists, or is marked "created when first needed".
- [x] 1.8 Write the first version of `README.md`: what the app is, the prerequisites (nvm and Node 24, Java for the emulators), `npm install`, and the script table from D12. Verify: each script listed in the README exists in `package.json`.
- [x] 1.9 Write `CLAUDE.md` (D15) and set `context` in `openspec/config.yaml`. The context covers the stack, the language rules, Node 24 through nvm, emulator-first development, and the legacy file as reference only. Verify that `openspec context --json` still resolves the root.

## 2. Domain reference

- [x] 2.1 Write the `docs/domain.md` product section:
  - what Legend Card Manager is: a tracker for the DM's side card system in a D&D 5e group, not a game engine
  - Legend Points work like inspiration
  - actors: the DM and the players
  - the full glossary from D15

  Verify: every term listed in the developer-workflow "Looking up a term" scenario is defined.
- [x] 2.2 Add the "Rules observed in legacy v2.1.15" section. It holds a pack table (type, price label, opening threshold, contents, what is awarded) transcribed from these functions in `reference/legacy/Legend_Card_Manager_v2.1.15.html`:
  - `packDefs`, `packPrice`, `canOpenPack`, `openPack`, `flipPackOption`, `selectCursedPackNormal`, `addToHand`
  - the "CORE RULES" header

  It also covers the pool, the repeatability, and the LP rules. Each rule is marked as reference only. Verify:
  - The Golden Pack row says that 49 non-blessed Rare cards are needed, that a 2% chance gives 1 Blessed card plus 4 Rare cards, and that the price label is 4 LP / 10000 GP.
  - Every pack type in `packDefs` has a row.
- [x] 2.3 Add two more sections and link `docs/domain.md` from the README and `CLAUDE.md`:
  - "Deliberate decisions (do not fix)"
  - "Sets": each set code with its official display name from `officialSetNames`. Kesqer is "Kesqerian Nights", never "Kesqeria".

  Verify: all 12 sets of `officialSetNames` are listed.

## 3. Theme and UI primitives

- [x] 3.1 Create `src/styles/theme.css`, with the D5 tokens in `@theme` and the font stack, and `src/styles/index.css`, with the Tailwind import and base styles (`canvas` background, `ink` text). Import both from `main.tsx`. Verify: `npm run build` passes, and the built CSS contains the `bg-canvas` and `text-ink-muted` utilities.
- [x] 3.2 Add a unit test that reads the token values from `theme.css` and checks that `ink` and `ink-muted` each have a WCAG contrast of at least 4.5:1 against `canvas`, `pane`, and `pane-raised`. Verify: `npm run test` passes.
- [x] 3.3 Add `src/lib/cn.ts` (clsx + tailwind-merge) with a unit test showing that a later class wins a Tailwind conflict, for example `p-2` followed by `p-4`. Verify: `npm run test` passes.
- [x] 3.4 Add the `components/ui` primitives: `Button`, `PageHeader`, `Spinner`, and `Placeholder`. `Placeholder` shows a title and the note "Bu ekran henüz hazır değil.". Add unit tests for `Placeholder` and the `Button` variants. Verify: `npm run test` passes.
- [x] 3.5 Add the styling section to `docs/conventions.md`: semantic tokens only, no raw hex or arbitrary color values, `cn()`, extracting primitives instead of using `@apply`, and Prettier class sorting. Verify: `grep -rE "#[0-9a-fA-F]{3,8}" src --include=*.tsx` finds nothing.

## 4. Firebase environment and configuration

- [x] 4.1 Add `firebase.json`:
  - Firestore rules and indexes paths
  - Hosting from `dist` with an SPA rewrite to `/index.html`
  - emulators: Auth 9099, Firestore 8080, Hosting 5002, UI 4000, and `singleProjectMode`

  Also add `.firebaserc` (default `demo-legend-cards`), an empty `firestore.indexes.json`, and a placeholder deny-all `firestore.rules`. Verify: `npm run emulators` starts, and the Emulator UI at http://127.0.0.1:4000 shows Auth and Firestore. **If it reports a Java version error, stop and ask the user to install a JDK 21 LTS** (design: Risks).
- [x] 4.2 Finish the `emulators` script (create `.firebase-emulator-data/` if it is missing, `--import`, `--export-on-exit`) and the `dev` script (`concurrently -k`). Verify:
  - A document created in the Emulator UI is still there after stopping `npm run dev` with Ctrl+C and starting it again.
  - If it is not, document the two-terminal fallback (`npm run emulators` + `npm run dev:web`) in the README.
- [x] 4.3 Add `.env.example`, with every D13 key and a comment for each, and `.env.development`, with the demo values and emulators on. Add `src/lib/firebase/config.ts`, which parses `import.meta.env` with zod, with unit tests:
  - Valid values parse.
  - A missing `VITE_FIREBASE_PROJECT_ID` gives an error that names that key.
  - `VITE_USE_FIREBASE_EMULATORS` becomes a boolean.

  Verify: `npm run test` passes.
- [x] 4.4 Add `src/lib/firebase/app.ts`, `auth.ts`, and `firestore.ts` (D6: a persistent multi-tab cache, and emulator connection when the flag is on). Add `ConfigErrorScreen`, which `main.tsx` renders when config parsing fails. Verify:
  - A unit test shows `ConfigErrorScreen` listing a missing key with Turkish text.
  - Manually, a temporary `.env.development.local` that sets `VITE_FIREBASE_PROJECT_ID=` shows the error screen in `npm run dev:web`. Delete the file afterwards.
- [x] 4.5 Add the README sections:
  - the emulators and the Emulator UI URL
  - the environment files table
  - the web config values are public identifiers, and security comes from the rules
  - connecting a real Firebase project later: create the project, enable the Google provider, add a web app, fill `.env.production.local`, run `firebase use --add` and `firebase deploy`

  Verify: every key named in the README is in `.env.example`.

## 5. Data access rules

- [x] 5.1 Write the final `firestore.rules` (D10: `rules_version = '2'`, an `isSignedIn()` helper, a closed catch-all), plus rules tests in `firestore.rules.emulator.test.ts` using `@firebase/rules-unit-testing` on `demo-legend-cards`. The tests check that signed-out reads and writes and signed-in reads and writes on arbitrary paths are all denied. Verify:
  - `npm run test:emulator` passes.
  - Temporarily changing the catch-all to `if true` makes the tests fail. Revert it afterwards.
- [x] 5.2 Add the "Adding a new data path" checklist to `docs/conventions.md`: schema, converter, explicit `match` block combined with `isSignedIn()`, allow and deny rules tests, and only then UI. Verify: the checklist names the rules test file pattern used in 5.1.

## 6. Realtime data layer

- [x] 6.1 Add two modules to `src/lib/firestore/`, with unit tests for each mapping:
  - `errors.ts`: the `SubscriptionError` kinds, mapped from Firestore error codes and from zod issues, with the document path
  - `converter.ts`: `createConverter(schema)`

  Verify: `npm run test` passes.
- [x] 6.2 Add `useDocument(ref)` (D7):
  - subscribes with metadata changes included
  - a missing document gives `ready` with `null` data
  - reports `fromCache` and `hasPendingWrites`
  - catches `invalid-data` errors
  - resubscribes only when `refEqual` reports a different target
  - unsubscribes on cleanup, with a stale-callback guard

  Verify with 6.4.
- [x] 6.3 Add `useCollection(query)` with the same behavior, using `queryEqual`. One malformed document makes the whole subscription fail. Verify with 6.4.
- [x] 6.4 Add the emulator tests in `src/lib/firestore/*.emulator.test.ts` on project `demo-realtime-test`, with test-only permissive rules loaded through `initializeTestEnvironment` and two independent modular clients using a memory cache. They cover:
  - a live document update from the other client
  - a collection add from the other client
  - a missing document becoming `ready`/`null`
  - `hasPendingWrites` set after a local write
  - an invalid document reported as an error naming its path
  - `permission-denied` on a path the test rules deny
  - no updates after unmount
  - switching the target
  - offline behavior through `disableNetwork`/`enableNetwork`: reads from the cache, and a queued write reaching the other client

  Verify: `npm run test:emulator` passes.
- [x] 6.5 Add `useOnlineStatus()` (`useSyncExternalStore` over `online`/`offline`) with unit tests that dispatch both events. Verify: `npm run test` passes.
- [x] 6.6 Add the data-access section to `docs/conventions.md`:
  - only `lib/firestore` and feature `api.ts` files import `firebase/firestore`
  - typed refs come from `createConverter`
  - feature code branches on the subscription `status`
  - feature code shows stale-data hints from `fromCache` and `hasPendingWrites`

  Verify: `grep -rl "firebase/firestore" src` lists only files under `src/lib/`.

## 7. Authentication

- [x] 7.1 Add `AuthContext`, `AuthProvider` (`onAuthStateChanged` giving the three states), and `useAuth()`, with `signInWithGoogle()` (popup) and `signOut()`. Unit tests mock `firebase/auth` and show three things:
  - `loading` comes first, then `signedOut` or `signedIn`.
  - `signOut` calls the SDK.
  - `useAuth` throws when used outside the provider.

  Verify: `npm run test` passes.
- [x] 7.2 Add `authErrors.ts`, which maps error codes to Turkish messages (D9), with unit tests:
  - `popup-closed-by-user` and `cancelled-popup-request` give no message.
  - `popup-blocked` asks the user to allow pop-ups.
  - `network-request-failed` gives a network message.
  - Any unknown code gives a generic message.

  Verify: `npm run test` passes.
- [x] 7.3 Add `RequireAuth`, the full-screen loading state, and `SignInPage` (app name, one "Google ile giriş yap" button, the error area). Unit tests use a test auth provider and show:
  - While loading, only the spinner shows, with no sign-in screen and no shell.
  - A signed-out user on `/library` is redirected to `/sign-in`.
  - After sign-in, the user returns to `/library`.
  - A signed-in user on `/sign-in` is redirected to `/hands`.
  - A cancelled popup shows no error.

  Verify: `npm run test` passes.
- [x] 7.4 Manual check against the Auth emulator in `npm run dev`. Verify each step is observed in the browser:
  - Sign in with a fake Google account.
  - Reload, and the session stays.
  - "Çıkış yap" shows the sign-in screen.
  - The browser back button then shows the sign-in screen, not the protected page.
- [x] 7.5 Add the auth notes to `docs/conventions.md`: use `useAuth()` and never `firebase/auth` directly in features; all routes go under `RequireAuth`; roles are deferred. Verify: `grep -rl "firebase/auth" src` lists only `src/lib/firebase/` and `src/features/auth/`.

## 8. App shell and screens

- [x] 8.1 Add `src/app/routes.tsx` with the D4 route table and nav metadata, one placeholder `<Name>Page.tsx` for each of the seven feature folders, a `NotFoundPage` with a link to `/hands`, and the `/` → `/hands` redirect. Unit tests check that:
  - Each nav item navigates to its screen and sets `aria-current`.
  - The nav labels appear in the specified order.
  - An unknown path shows the not-found page and its link.
  - `/` lands on "Oyuncu elleri".

  Verify: `npm run test` passes.
- [x] 8.2 Add `AppShell` with:
  - `Sidebar`: "Legend Cards", the version from `__APP_VERSION__`, the nav, the user name with the avatar when there is a photo, and "Çıkış yap"
  - `MobileNav`: a menu button and a drawer that closes on navigation, below the `lg` breakpoint
  - `OfflineBanner`: "Çevrimdışısın — değişiklikler bağlantı gelince eşitlenecek."

  Unit tests cover the version text, the identity display with and without a photo, the drawer closing after a choice, and the banner appearing and disappearing on the `offline` and `online` events. Verify: `npm run test` passes.
- [x] 8.3 Manual responsive check in the browser with `npm run dev`. Verify:
  - At 1280 px the sidebar is visible.
  - At 360 px the menu button replaces it.
  - `document.documentElement.scrollWidth <= clientWidth` holds at both widths.
- [x] 8.4 Add the "Adding a new screen" section to `docs/conventions.md`: add a feature folder and a page, register it in `routes.tsx`, and use Turkish labels with English slugs. Verify: following it matches how the seven placeholder screens were added.

## 9. Integration verification

- [x] 9.1 Delete `node_modules`, then run `npm ci && npm run check && npm run test:emulator && npm run build` on Node 24. Verify: every command exits with 0.
- [x] 9.2 Serve the build with the Hosting emulator (`firebase emulators:start --only hosting --project demo-legend-cards`) and open http://127.0.0.1:5002/library directly. Verify: the app loads, it shows the sign-in screen, and after sign-in it shows the library placeholder. If the Auth emulator is needed for this step, start it as well.
- [x] 9.3 End-to-end pass in `npm run dev`. Verify each step is observed:
  - Sign in.
  - Visit all seven screens through the nav.
  - Reload a deep link.
  - Open an unknown URL, then follow the not-found link back.
  - Switch on "Offline" in DevTools, check that the banner appears, then switch it off and check that the banner disappears.
  - Open a second tab with no Firestore persistence errors in the console.
  - Sign out.
- [x] 9.4 Check that every link in `README.md`, `CLAUDE.md`, and `docs/*.md` resolves, then run `openspec validate bootstrap-project-foundation --strict`. Verify: no broken links, and validation passes.

## Workflow follow-up

- Do not commit until the user asks for a commit.
- Archive the change with `/opsx:archive` after the user has reviewed the running app.
- The next change is the domain data model (cards, players, packs, LP, True Words), together with roles and their access rules.
