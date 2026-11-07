# Proposal

## Why

Legend Card Manager is currently a single offline HTML file (v2.1.15) that keeps all state in one browser's IndexedDB. Only one computer can use it, and nobody at the table can see changes live. The group wants an online app that several devices can use at the same time. This change lays the technical foundation for that app: a React + TypeScript web app on Firebase (Auth, Firestore, Hosting) with real-time sync. It also records what the project is about and how its code is written, so later feature work starts from shared definitions.

The legacy HTML was built through many chat iterations by someone who does not write code. It is treated as a **design and behavior reference** (screens, vocabulary, colors, game rules), not as code to port.

## What Changes

- New repository foundation:
  - Node 24 (`.nvmrc`), npm, Vite, React, strict TypeScript, ESLint, Prettier, and Vitest
  - a git repository with a `.gitignore`
  - the legacy HTML moved to `reference/legacy/`, where it is kept as a design reference only
- Tailwind CSS with a dark theme whose design tokens come from the legacy palette (background, panes, gold accent, cursed red, blessed cream, True Words purple).
- Firebase wiring:
  - modular Firebase SDK initialization, with configuration checked when the app starts
  - a Firestore persistent offline cache that is shared across tabs
  - an emulator-first development setup on the `demo-legend-cards` project (Auth, Firestore, and the Emulator UI), so nothing touches a real Firebase project during development
  - Firebase Hosting configuration for a single-page app (SPA)
- Google sign-in:
  - every screen requires a signed-in user
  - the app shows a loading state without flashing the sign-in screen first
  - users can sign out
  - roles (DM vs. player) are explicitly deferred to the data-model change
- Real-time data layer primitives:
  - typed document and collection subscription hooks with loading, ready, and error states, plus cache and pending-write metadata
  - runtime validation of Firestore documents
  - an offline banner in the shell
- Firestore security rules that deny every read and write by default, with emulator-backed rules tests. Each future collection must add its own rules and tests.
- App shell and routing with the seven screens from the legacy design: Oyuncu elleri, Pack Shop, True Words, Kart kütüphanesi, Cursed Deck, İşlem Logu, and Veri / Yedek. Each screen is a placeholder for now. The shell has a desktop sidebar and a mobile drawer, the UI text is in Turkish, and the shell shows the app version.
- Project documentation:
  - a README with setup, scripts, emulators, and how to connect a real Firebase project later
  - `docs/domain.md`, a domain glossary plus a catalogue of the game rules observed in the legacy app
  - `docs/conventions.md` for code conventions
  - `CLAUDE.md` for AI agents
  - the project `context` in `openspec/config.yaml`

Out of scope:
- the domain data model (cards, players, packs, Legend Points, True Words)
- any game feature or legacy behavior
- roles and permissions beyond signed-in vs. signed-out
- migrating data from legacy IndexedDB backups
- creating the real Firebase project, and deploying
- CI

## Capabilities

### New Capabilities
- `app-shell`: the signed-in application frame:
  - navigation between the main screens, with responsive layout, Turkish UI text, and the themed look
  - placeholder screens, a not-found page, the offline banner, and the version display
- `user-auth`: Google sign-in and sign-out, auth state while loading, a persisted session, and protection of every app route for signed-in users only.
- `realtime-sync`: Firestore connection and offline cache, plus typed real-time document and collection subscriptions that validate data and report loading, error, cache, and pending-write states.
- `data-access-control`: Firestore security rules. Access is denied by default, signed-out users are denied everywhere, and each path is opened explicitly and covered by tests.
- `developer-workflow`: how the project is run and changed:
  - the Node 24 toolchain, emulator-first local development, and quality-check scripts
  - the environment configuration
  - the domain reference, code conventions, and agent guidance documents

### Modified Capabilities
<!-- None: the project has no existing specs. -->

## Impact

- **Code:**
  - a new `src/` tree: app, features, lib/firebase, lib/firestore, components/ui, and styles
  - root configuration for package.json, TypeScript, Vite, ESLint, Prettier, Vitest, and Firebase (`firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`)
- **Files moved:** `Legend_Card_Manager_v2.1.15.html` moves from the project root to `reference/legacy/`. Its content does not change.
- **Dependencies:**
  - runtime: react, react-dom, react-router, firebase, zod, clsx, tailwind-merge
  - dev: vite, typescript, tailwindcss with its Vite plugin, eslint with typescript-eslint and React plugins, prettier with the Tailwind plugin, vitest, Testing Library, jsdom, @firebase/rules-unit-testing, firebase-tools, concurrently
- **Systems:**
  - local Firebase emulators, which need a Java runtime
  - a real Firebase project is needed later, for deployment only
- **Docs and config:** README.md, docs/domain.md, docs/conventions.md, CLAUDE.md, openspec/config.yaml (`context`).
