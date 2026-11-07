# Legend Cards

Legend Card Manager is a real-time web app for tracking the side card system that our DM runs in a D&D 5e group. Players earn **Legend Points (LP)** and spend them on cards from packs, and the app keeps track of who holds what. It is a tracker, not a game engine. The DM and players make decisions at the table, and the app records them.

The app is being rebuilt as an online, multi-device app with React, TypeScript, and Firebase. The original offline single-file version is kept in [`reference/legacy/`](reference/legacy/README.md) as a design and behavior reference.

- What the product is and what its words mean: [docs/domain.md](docs/domain.md)
- How the code is written: [docs/conventions.md](docs/conventions.md)
- Planned and past changes: [`openspec/`](openspec/)

## Prerequisites

- **Node.js 24** through [nvm](https://github.com/nvm-sh/nvm). The repository has an `.nvmrc`, so run this in every new terminal:

  ```sh
  nvm use
  ```

  `npm install` refuses to run on an older Node version (`engine-strict`).

- **Java 21 or newer** (a JDK) for the local Firebase emulators.

## Setup

```sh
nvm use
npm install
npm run dev
```

`npm run dev` starts the Firebase emulators and the Vite dev server together. Open the app at http://localhost:5173 and sign in with one of the emulator's test Google accounts. You can create a new one in the sign-in window.

## Scripts

| Script                  | What it does                                                                 |
| ----------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`           | Start the Firebase emulators and the Vite dev server together                |
| `npm run dev:web`       | Start only the Vite dev server                                               |
| `npm run emulators`     | Start only the Auth and Firestore emulators, keeping their data between runs |
| `npm run build`         | Type-check and build the production files into `dist/`                       |
| `npm run preview`       | Serve the built `dist/` locally                                              |
| `npm run typecheck`     | Run the TypeScript compiler without emitting files                           |
| `npm run lint`          | Run ESLint                                                                   |
| `npm run format`        | Format all files with Prettier                                               |
| `npm run format:check`  | Check formatting without changing files                                      |
| `npm run test`          | Run the unit tests (no Firebase)                                             |
| `npm run test:watch`    | Run the unit tests in watch mode                                             |
| `npm run test:emulator` | Start the Firebase emulators, run the emulator-backed tests, then stop them  |
| `npm run check`         | Type check, lint, format check and unit tests: run this before every commit  |

## Local Firebase emulators

Development never touches a real Firebase project. Everything runs against local emulators on the demo project `demo-legend-cards`. Firebase treats project IDs that start with `demo-` as offline-only.

| Emulator    | Address                    |
| ----------- | -------------------------- |
| Emulator UI | http://127.0.0.1:4000      |
| Auth        | 127.0.0.1:9099             |
| Firestore   | 127.0.0.1:8080             |
| Hosting     | 127.0.0.1:5002 (on demand) |

- The Emulator UI shows the test users and the Firestore data, and lets you edit them by hand.
- Emulator data is saved to `.firebase-emulator-data/` when you stop `npm run dev` or `npm run emulators` with Ctrl+C, and loaded again on the next start. Delete that folder to start empty.
- The emulators need a Java 21 or newer runtime (for example Amazon Corretto 21: `brew install --cask corretto@21`).
- To serve the production build the way Firebase Hosting would: `npm run build`, then `npx firebase emulators:start --only hosting --project demo-legend-cards`, and open http://127.0.0.1:5002.

## Environment files

The app reads its Firebase settings from environment variables. At startup it checks them, and if one is missing or malformed it shows an error screen naming the setting.

| File                    | Committed    | Contents                                                           |
| ----------------------- | ------------ | ------------------------------------------------------------------ |
| `.env.example`          | yes          | Every setting the app reads, with a description                    |
| `.env.development`      | yes          | Demo values for the emulators (`VITE_USE_FIREBASE_EMULATORS=true`) |
| `.env.production.local` | no (ignored) | The real project's values, once a real project exists              |

The settings are `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, and `VITE_USE_FIREBASE_EMULATORS`.

**These values are not secrets.** A Firebase web config is a set of public identifiers that ends up in the browser bundle anyway. Data is protected by the Firestore security rules (`firestore.rules`), not by hiding the config. Do not rely on keeping these values private.

## Connecting a real Firebase project (later)

Not needed for development. When the app is ready to go online:

1. Create a project in the [Firebase console](https://console.firebase.google.com/). Pick a Firestore location in Europe, close to the group.
2. Under **Authentication → Sign-in method**, enable the **Google** provider.
3. Under **Project settings → Your apps**, add a **Web app** and copy its config values.
4. Create `.env.production.local` with those values and `VITE_USE_FIREBASE_EMULATORS=false`.
5. Link the project and deploy:

   ```sh
   npx firebase login
   npx firebase use --add          # choose the new project, give it an alias such as "prod"
   npm run build
   npx firebase deploy --only hosting,firestore
   ```

`firebase deploy` publishes the app and the security rules to the real project. Only run it on purpose.
