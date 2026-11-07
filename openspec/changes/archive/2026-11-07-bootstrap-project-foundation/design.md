# Design

## Context

See `proposal.md` (Why) for the motivation. The capability specs in `specs/` hold the behavior contracts. This document covers how they are met.

**Current state of the repository**
- The only application artifact is `Legend_Card_Manager_v2.1.15.html` (about 160 KB, one file).
- There is no git repository, no `package.json`, and no source tree.
- `openspec/` and the agent skill folders already exist.

**What the legacy file is, and what we take from it.** The legacy file renders HTML strings from a global mutable `state`, stores data in IndexedDB, and runs offline only. We take its product knowledge, not its code:
- the screen list and the Turkish labels
- the vocabulary: LP, Pack types, Cursed, Blessed, True Words, Cardmaker
- the palette
- the game rules written down in its "MAINTAINER NOTES / CORE RULES" header and in the functions `packDefs`, `packPrice`, `canOpenPack`, `openPack`, `flipPackOption`, `addToHand`, and `officialSetNames`

**Development machine**
- Node v24.14.1 is available through nvm. The non-interactive default is still v20, so every shell must run `nvm use` first.
- npm 11 is installed. pnpm is installed but broken.
- Java is OpenJDK 17 (Corretto).
- firebase-tools 14.19 is installed globally.

**Decisions the user has made**
- Google sign-in now, roles later.
- Tailwind CSS for styling.
- Docs and code in English, interface text in Turkish.
- Node 24.
- The data model is explicitly deferred.

## Goals / Non-Goals

**Goals:**
- A codebase where the first real feature (for example the card library) only needs schema, rules, and UI work. No plumbing should be left to build.
- One way to do each cross-cutting thing: initialize Firebase, subscribe to data, guard routes, style components, write tests.
- Local development and tests that never touch a real Firebase project and work on a fresh clone with `npm install`.

**Non-Goals:**
- Any Firestore collection, document shape, or write path for domain data. No placeholder "users" or "profiles" collection either.
- A global client state library. Firestore subscriptions plus React context cover the current needs.
- Internationalization infrastructure. Turkish strings are written directly in the components.
- Server-side code (Cloud Functions), Storage, App Check, analytics, or CI.

## Decisions

### D1. Vite + React single-page app, not Next.js or another SSR framework
All data is live, client-side Firestore data behind sign-in. Server rendering would add a server runtime and hydration concerns but no benefit, because there is no public, crawlable content. Vite produces static files that Firebase Hosting serves directly. A SPA rewrite in `firebase.json` sends every path to `index.html`, so deep links work. Cache headers keep that working across deploys: pages get `Cache-Control: no-cache`, and the hashed files under `/assets/` are cached for a year as `immutable`. Otherwise a cached `index.html` could point at JS files that a newer deploy has removed, which leaves a blank page.

### D2. Strict TypeScript with an `@/` alias
- `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`.
- App code and Node-side configuration get separate configs: `tsconfig.app.json` and `tsconfig.node.json`, both referenced from `tsconfig.json`.
- `@/` maps to `src/`.
- No `any`. Data from outside the app (Firestore, env, browser APIs) arrives as `unknown` and is parsed (D7, D9).

Alternative considered: the looser default template settings. Rejected, because `noUncheckedIndexedAccess` catches the class of "array item may be missing" bugs that a card and hand app is full of.

### D3. Feature-first source layout
```
src/
  main.tsx                 entry: config check -> providers -> router
  app/                     composition root
    App.tsx                providers (Auth) + RouterProvider
    screens.ts             the single list of main screens (id, path, label, icon)
    routes.tsx             route table built from screens.ts
    layout/                AppShell, Sidebar, MobileNav, OfflineBanner
  features/
    auth/                  AuthProvider, useAuth, RequireAuth, SignInPage, authErrors
    hands/ shop/ true-words/ library/ cursed-deck/ activity-log/ settings/
                           each: <Name>Page.tsx (placeholder today)
  components/ui/           shared presentational primitives (Button, PageHeader, Placeholder, Spinner)
  lib/
    firebase/              config (env parse), app, auth, firestore (singletons + emulator wiring)
    firestore/             subscription hooks, converter helper, error types
    cn.ts                  class-name merge helper
  styles/
    index.css              Tailwind entry + base layer
    theme.css              design tokens (@theme)
  test/                    test setup and helpers (render with providers, emulator helpers)
```
Rules for this layout:
- A feature never imports from another feature's internals. Shared code moves to `components/` or `lib/`.
- Only `lib/firebase` calls `initializeApp` or `connect*Emulator`.
- Only `lib/firestore` and the feature `api.ts` modules (none exist yet) import `firebase/firestore`.

Alternative considered: a layer-first layout (`components/`, `hooks/`, `pages/`). Rejected, because each future feature (packs, hands, True Words) would be spread across every layer folder.

### D4. Routing: React Router data router with English URL slugs
`createBrowserRouter` builds a route table in `src/app/routes.tsx`. The screen list (id, path, label, icon glyph) lives in `src/app/screens.ts`, which both the route table and the sidebar read, so it exists exactly once. It is a separate module because the shell imports the list while the route table imports the shell. `routes.tsx` maps each screen id to its page in a `Record`, so TypeScript reports any screen that is missing a page.

| Path | Label (from the legacy design) |
|---|---|
| `/hands` | ♠ Oyuncu elleri |
| `/shop` | 🎁 Pack Shop |
| `/true-words` | ✦ True Words |
| `/library` | ▤ Kart kütüphanesi |
| `/cursed-deck` | ☠ Cursed Deck |
| `/log` | ☷ İşlem Logu |
| `/settings` | ⚙ Veri / Yedek |

`/sign-in` is the sign-in screen, `/` redirects to `/hands`, and `*` is the not-found page. URL slugs are English because URLs count as code identifiers. Only the visible labels are Turkish. The protected routes are children of a `RequireAuth` layout route, which renders `AppShell`.

### D5. Styling: Tailwind CSS v4 with semantic tokens taken from the legacy palette
- Tailwind is added through its Vite plugin and configured CSS-first. `src/styles/theme.css` declares the tokens in `@theme`, so they become utilities such as `bg-pane` and `text-ink-muted`. It is imported from `src/styles/index.css`, next to the Tailwind import, because `@theme` only applies inside the same Tailwind build. It also switches off the default palette (`--color-*: initial`), so only semantic colors exist.
- Components use only semantic tokens. Raw hex values and arbitrary color values in class names are not allowed.
- `cn()` combines `clsx` with `tailwind-merge` for conditional classes.
- `prettier-plugin-tailwindcss` sorts the class order.
- Repeated class clusters become components in `components/ui/`, not `@apply` blocks.

| Token | Legacy value | Use |
|---|---|---|
| `canvas` | `#0c111a` | page background |
| `pane` | `#171f2d` | sidebar, panels |
| `pane-raised` | `#202a3b` | raised surfaces, inputs |
| `line` | `#344052` | borders |
| `ink` | `#e9edf5` | body text |
| `ink-muted` | `#aab7ca` | secondary text |
| `gold` | `#eac57e` | accent, current navigation item |
| `green` | `#65c9a3` | success |
| `cursed` | `#ff526d` | cursed content (soft variant `#ffc1c9`) |
| `blessed` | `#fff4c1` | blessed content (pill variant `#e8e3ce`) |
| `true-word` | `#c7b5ff` | True Words (border `#9a87d1`) |

Font: the legacy stack `Inter, "Segoe UI", Arial, sans-serif`. No web font is downloaded yet. On a background of `canvas` or `pane`, `ink` and `ink-muted` both stay above 4.5:1 contrast, which the app-shell spec requires.

Alternative considered: CSS Modules. The user chose Tailwind.

### D6. Firebase initialization in a single module, emulator-first
- `lib/firebase/config.ts` parses `import.meta.env` with zod. If parsing fails, `main.tsx` renders a `ConfigErrorScreen` that lists the bad keys, in Turkish, instead of the app. This is the realtime-sync startup check.
- `lib/firebase/app.ts` calls `initializeApp` once.
- `lib/firebase/auth.ts` exports `auth`.
- `lib/firebase/firestore.ts` exports `db`, created with `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`. This gives the offline cache shared across tabs.
- When `VITE_USE_FIREBASE_EMULATORS === "true"`, the module connects to the emulators right after creating the instances: Auth on `127.0.0.1:9099` and Firestore on `127.0.0.1:8080`. It does this before anything else touches them.
- The development project ID is `demo-legend-cards`. Firebase emulators treat the `demo-` prefix as offline-only, so a misconfiguration cannot reach real resources. `.firebaserc` uses it as the default project.
- The Firebase web config values are public identifiers, not secrets. Security comes from the rules (D10). The README states this so nobody hides the values or relies on them.

### D7. Real-time data layer: typed refs, metadata-aware hooks
- **Converter helper.** `createConverter(schema)` turns a zod schema into a Firestore `FirestoreDataConverter`. Features build typed refs as `doc(db, path).withConverter(converter)`.
- **Hooks.** `useDocument(ref)` and `useCollection(query)` subscribe with `onSnapshot(..., { includeMetadataChanges: true })`. They return a discriminated union:
  ```ts
  type Subscription<T> =
    | { status: 'loading' }
    | { status: 'ready'; data: T; fromCache: boolean; hasPendingWrites: boolean }
    | { status: 'error'; error: SubscriptionError };
  ```
  A missing document gives `data: null` with status `ready`.
- **Errors.** `SubscriptionError` has a `kind`: `'permission-denied'`, `'invalid-data'` (with the document path and the zod issues), or `'unknown'`. Parse failures are caught around `snapshot.data()` or `docs.map(d => d.data())`. If one malformed document appears in a collection, the whole subscription fails. That is strict on purpose, so data bugs surface instead of documents quietly going missing.
- **Ref stability.** Each hook keeps the last ref and resubscribes only when `refEqual` or `queryEqual` says the target changed. Callers therefore do not have to memoize refs perfectly, and render loops cannot keep resubscribing.
- **Cleanup.** Cleanup unsubscribes, and a stale-callback guard drops late results for an old target.
- **Writes.** For now, writes use the SDK directly inside feature `api.ts` modules. No write wrapper is built until a feature needs one.

Alternatives considered:
- `react-firebase-hooks`, a third-party library. Rejected: it adds no validation, it lags behind SDK releases, and the hooks are small.
- TanStack Query around Firestore. Rejected: it is built for request/response caching and fights push-based snapshots.

### D8. Offline banner from the browser network status
Firestore has no public "connected" API. The shell's `useOnlineStatus()` uses `useSyncExternalStore` over `navigator.onLine` and the `online`/`offline` events. Each data view can tell whether its own data is stale from `fromCache` and `hasPendingWrites` on its subscription.

### D9. Auth: Google popup, a context provider, and a route guard
- **State.** `AuthProvider` subscribes to `onAuthStateChanged` and exposes `{ status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; user }`, plus `signInWithGoogle()` and `signOut()`, through `useAuth()`.
- **Loading.** While the status is `loading`, the app renders a full-screen spinner. Neither the sign-in screen nor the shell appears until the status is known.
- **Route guard.** `RequireAuth` redirects signed-out users to `/sign-in` with `replace` and passes `state.from`. After a successful sign-in, `SignInPage` navigates to `from`, or to `/hands`. A signed-in user who visits `/sign-in` is redirected to `/hands`.
- **Sign-in flow.** `signInWithPopup` is used with `GoogleAuthProvider`, and persistence stays on the default (local). Popup was chosen over redirect because the redirect flow breaks under third-party storage partitioning unless the auth domain is served from the app's own origin. Popup also works with the Auth emulator's fake account chooser.
- **Error mapping.** `authErrors.ts` maps error codes to Turkish messages:
  - `auth/popup-closed-by-user` and `auth/cancelled-popup-request`: silent
  - `auth/popup-blocked`: tells the user to allow pop-ups
  - `auth/network-request-failed`: a network message
  - anything else: a generic message
- **Identity display.** The sidebar shows `displayName`, with `photoURL` as an avatar when present, and a "Çıkış yap" button.

### D10. Security rules: closed catch-all, helpers ready
`firestore.rules` uses `rules_version = '2'`, defines `function isSignedIn() { return request.auth != null; }` for future paths, and ends with `match /{document=**} { allow read, write: if false; }`. Future paths must combine `isSignedIn()` with their own checks. Because Firestore rules allow a request if any matching rule allows it, the closed catch-all never overrides a deliberately opened path. New paths are added as explicit `match` blocks next to the catch-all. `firestore.indexes.json` starts empty.

### D11. Testing: Vitest with two projects
- **`unit`:** jsdom, files matching `src/**/*.test.{ts,tsx}`. It uses Testing Library and jest-dom. Auth-dependent components are tested by rendering inside a test `AuthContext` provider with a fixed state, so there is no Firebase in unit tests. It covers the route guard, the sign-in error mapping, shell navigation, the offline banner, and the config parsing.
- **`emulator`:** files matching `**/*.emulator.test.ts`. It runs under `firebase emulators:exec --only auth,firestore --project demo-legend-cards` and has two parts:
  - **Rules tests** use `@firebase/rules-unit-testing` with the real `firestore.rules` on project `demo-legend-cards`. They check that signed-out and signed-in requests are denied on arbitrary paths.
  - **Realtime hook tests** use a separate project ID, `demo-realtime-test`. The emulator keeps rules and data separately per project, so that project loads permissive test-only rules through `initializeTestEnvironment`. Two independent modular client apps connect to the emulator: one writes, and `renderHook` observes the hook on the other. These tests cover live updates, a missing document becoming ready with null data, invalid-data errors, unsubscribing on unmount, and resubscribing when the target changes. They use a memory cache, because neither jsdom nor Node has IndexedDB.
- **Offline behavior in emulator tests:** the realtime-sync offline scenarios are automated with the SDK's `disableNetwork` and `enableNetwork`. After `disableNetwork`, a subscription stays `ready` and reports `fromCache: true`. A write made while the network is disabled reaches the second client after `enableNetwork`.
- **Multi-tab persistence:** this needs a real browser with IndexedDB, so it is checked manually. Two tabs open without a persistence error in the console.

### D12. Scripts and the development loop
| Script | Does |
|---|---|
| `dev` | `concurrently -k -n emu,web` running `emulators` and `dev:web` |
| `dev:web` | `vite` |
| `emulators` | ensures `.firebase-emulator-data/` exists, then `firebase emulators:start --project demo-legend-cards --import .firebase-emulator-data --export-on-exit` |
| `build` | `tsc -b && vite build` |
| `preview` | `vite preview` |
| `typecheck` | `tsc -b --pretty` (no emit config) |
| `lint` / `format` / `format:check` | ESLint flat config (typescript-eslint type-checked recommended, react-hooks, react-refresh) / Prettier write / Prettier check |
| `test` | `vitest run --project unit` |
| `test:emulator` | `firebase emulators:exec --only auth,firestore --project demo-legend-cards "vitest run --project emulator"` |
| `check` | `typecheck && lint && format:check && test` |

- `firebase-tools` is a dev dependency, so the scripts never depend on the global CLI version.
- `package.json` sets `"engines": { "node": ">=24" }`, `.npmrc` sets `engine-strict=true`, and `.nvmrc` contains `24`.
- ESLint and Prettier ignore `dist/`, `reference/`, `openspec/`, `.agents/`, and `.claude/`.

### D13. Environment files
| File | Committed | Contents |
|---|---|---|
| `.env.example` | yes | every key with a comment |
| `.env.development` | yes | demo values: `VITE_FIREBASE_PROJECT_ID=demo-legend-cards`, a dummy API key and app ID, `VITE_USE_FIREBASE_EMULATORS=true` |
| `.env.production.local` | no (gitignored) | real project values, added later |

The keys are:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_USE_FIREBASE_EMULATORS`

Storage and messaging keys are left out until those services are used.

### D14. Version display
`vite.config.ts` injects the `package.json` version as `__APP_VERSION__`, declared in `src/vite-env.d.ts`. The sidebar shows "Legend Cards · v0.1.0". The version starts at `0.1.0` and follows semver: each archived OpenSpec change that ships behavior bumps it. That keeps the user's habit of numbered versions without putting the version in file names.

### D15. Documentation set
- **`README.md`:**
  - what the app is
  - prerequisites: Node 24 through nvm, and Java for the emulators
  - `npm install`, the script table, the Emulator UI URL
  - how to connect a real Firebase project later: create the project, enable the Google provider, add a web app, fill `.env.production.local`, run `firebase use --add` and `firebase deploy`
- **`docs/domain.md`:**
  - **Product:** a tracker for the DM's side card system in a D&D 5e group, not a game engine. Legend Points work like inspiration.
  - **Actors:** the DM and the players.
  - **Glossary:**
    - LP, GP
    - Card: name, set, cost (number, X, or d6, with overrides), rarity, text, mechanic pack
    - Set (code vs. display name)
    - Mechanic Pack, Rarity, Cursed card, Blessed card
    - Pool, Hand, Library, Cursed Deck
    - Active effect
    - Pack types: Standard, Premium, Cursed, Mechanic, Pandemonium, Golden, Cursed Golden
    - Pack opening (flip every card before choosing)
    - True Word (draft 3, learn 1, activate)
    - Cardmaker (mascot), cardback
    - Session log and undo
  - **"Rules observed in legacy v2.1.15":** a table of every pack's price label, opening threshold, and contents, plus the pool, repeatability, and LP rules. The table is transcribed from the functions named in Context.
  - **Deliberate decisions not to "fix":** manual LP, labels-only prices, the hardcoded official set names, the 2% blessed chance, rare-only Pandemonium, repeatable cursed and blessed cards, session-only undo and log.
  - **Set codes and their official display names.**
  - Each rule is marked as reference only, until a feature change brings it into the specs.
- **`docs/conventions.md`:**
  - the layout from D3
  - naming:
    - components and their files in PascalCase (`AppShell.tsx`)
    - hooks as `useX.ts`
    - other modules in camelCase
    - feature folders in kebab-case
    - named exports only, except where a tool requires a default export (config files)
    - `type` over `interface`
    - domain identifiers taken from the glossary (`legendPoints`, `mechanicPack`, `setCode`, `trueWord`, `cursed`, `blessed`)
  - Turkish UI strings and English code, comments, docs, and commits (Conventional Commits)
  - the styling rules from D5
  - the data-access rules from D3 and D7
  - the testing rules from D11
  - a checklist for adding a new collection: schema, converter, rules plus rules tests, then UI
- **`CLAUDE.md`:**
  - a short orientation that points to the documents above
  - the requirement to run `nvm use` before running anything
  - `npm run check` and `npm run test:emulator` as the verification commands
  - a pointer to the OpenSpec workflow, and the rule that the legacy file is reference only
- **`openspec/config.yaml`:** `context` with the stack, the language rules, Node 24, emulator-first development, and the fact that the legacy file is a reference.

## Risks / Trade-offs

- **[The installed firebase-tools may require a newer Java than the installed JDK 17]** → The first verification step runs `npm run emulators`. If it reports a Java version error, stop and ask the user to install a JDK 21 LTS (for example Corretto 21). That is a system change, so the user must approve it.
- **[Non-interactive shells start on Node 20]** → Every command in `tasks.md` and `CLAUDE.md` runs after `. ~/.nvm/nvm.sh && nvm use`. With `engine-strict`, an install on the wrong Node fails loudly instead of quietly.
- **[Library majors may be newer than this plan]** → Install the current stable versions and follow each tool's current setup docs (for example the Tailwind v4 Vite plugin and ESLint flat config). Keep the decisions here, and adapt the syntax.
- **[Google popup sign-in fails in some mobile and in-app browsers]** → `auth/popup-blocked` gets a clear Turkish message. A redirect fallback, with the auth domain served from Hosting, is a later change if a player's device needs it.
- **[The Firestore web SDK under jsdom in emulator tests may be flaky]** → Run the emulator project in `node` and test the hooks through Testing Library's `renderHook` with jsdom only where needed. If the SDK still fails under jsdom, test the hook's subscription core as a plain function in `node`, and keep a thin React wrapper.
- **[`--import` on an empty export directory, and export-on-exit under `concurrently`, may behave unexpectedly]** → The `emulators` script creates the directory first. Verification checks that data survives a Ctrl+C restart. If `concurrently` stops the emulators before they export, the README documents running `npm run emulators` and `npm run dev:web` in two terminals instead.
- **[The persistent cache keeps Firestore data in IndexedDB after sign-out on shared devices]** → No data exists yet. The data-model change has to decide whether to clear persistence on sign-out.
- **[The deny-all rules make the realtime layer unusable for real data until paths are opened]** → Intended: the data-model change opens paths together with tests.
- **[Tailwind class lists grow long in JSX]** → Extract `components/ui` primitives, use `cn()`, and let Prettier sort the classes.

## Migration Plan

- **Greenfield.** The only migration is moving the legacy HTML to `reference/legacy/` without changing its content. The original user data stays in the user's browser, and in their ZIP/JSON backups, untouched.
- **Rollback.** Delete the new files and move the HTML back. No external system is changed.
- **Deployment.** Not part of this change. The README documents the steps for when a real project exists.

## Open Questions

- The real Firebase project ID and Firestore location (an EU region is likely, because the group is in Turkey). This is decided when the project is created, and it only affects `.firebaserc` and `.env.production.local`.
- Whether to download the Inter web font, or keep the legacy system font stack. This is only a styling detail.
