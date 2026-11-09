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
- **7-Zip** (`brew install sevenzip`), only on the machine that builds the card pictures (see [Building the pictures](#building-the-pictures)).

## Setup

```sh
nvm use
npm install
npm run dev
```

`npm run dev` starts the Firebase emulators and the Vite dev server together. Open the app at http://localhost:5173 and sign in with one of the emulator's test Google accounts. You can create a new one in the sign-in window.

## Scripts

| Script                      | What it does                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`               | Start the Firebase emulators and the Vite dev server together                                                             |
| `npm run dev:web`           | Start only the Vite dev server                                                                                            |
| `npm run emulators`         | Start only the Auth and Firestore emulators, keeping their data between runs                                              |
| `npm run build`             | Type-check and build the production files into `dist/`                                                                    |
| `npm run preview`           | Serve the built `dist/` locally                                                                                           |
| `npm run typecheck`         | Run the TypeScript compiler without emitting files                                                                        |
| `npm run lint`              | Run ESLint                                                                                                                |
| `npm run format`            | Format all files with Prettier                                                                                            |
| `npm run format:check`      | Check formatting without changing files                                                                                   |
| `npm run test`              | Run the unit tests (no Firebase)                                                                                          |
| `npm run test:watch`        | Run the unit tests in watch mode                                                                                          |
| `npm run test:emulator`     | Start the Firebase emulators, run the emulator-backed tests, then stop them                                               |
| `npm run check`             | Type check, lint, format check and unit tests: run this before every commit                                               |
| `npm run set-role`          | Set a user's role (`dm` or `player`); see [Making someone the DM](#making-someone-the-dm)                                 |
| `npm run import-cards`      | Load the card definitions from `data/` into Firestore; see [Loading the cards](#loading-the-cards)                        |
| `npm run import-true-words` | Load the True Words from `data/true-words.csv` into Firestore; see [Loading the cards](#loading-the-cards)                |
| `npm run build-art`         | Build the card pictures from the owner's archives into `public/art/`; see [Building the pictures](#building-the-pictures) |

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

## Loading the cards

The owner's card data lives in `data/` as CSV files (see [data/README.md](data/README.md)). A fresh emulator has no cards, so load them once:

```sh
npm run dev            # in one terminal: the emulators and the app
npm run import-cards   # in another: loads 590 Legend cards and 154 Cursed cards
npm run import-true-words   # then: loads the 53 True Words
```

The emulators keep the cards and the words between runs. Run an import again whenever its CSV changes: it adds, updates, and retires cards or words to match the files, and writes nothing if they are unchanged.

- `--dry-run` shows what the import would do, without writing.
- `--legend <csv>` or `--cursed <csv>` imports only that deck.
- `npm run import-true-words -- --file <csv>` imports the True Words from another file.

Against a real project (see below), look first, then import:

```sh
npm run import-cards -- --dry-run --project <project-id>
npm run import-cards -- --project <project-id>
npm run import-true-words -- --dry-run --project <project-id>
npm run import-true-words -- --project <project-id>
```

## Building the pictures

The card, cardback, pack, True Word and Cardmaker pictures come from the owner's five `.7z` archives (about 560 MB of PNG). They stay outside the repository. The build script reads them from a folder, converts the pictures to WebP, and writes them with a manifest to `public/art/`, which is not committed:

```sh
npm run build-art -- --source ~/Downloads --dry-run   # report only: what matches, what is missing
npm run build-art -- --source ~/Downloads             # write public/art/
```

- The script never changes the archives. It extracts them into a temporary folder that it always removes, and takes loose `.png` files in the folder as they are.
- It matches each file by its name, and by the alias table `data/image-aliases.csv` for names that differ from the data (see [data/README.md](data/README.md#pictures)).
- The report, in Turkish, counts the pictures per kind, names each card, word, cardback, pack and Cardmaker without one, and lists the duplicate and unknown files. A row of the alias table that names nothing stops the build before anything is written.
- Run it again after the archives, the card data or the alias table change. It replaces the earlier pictures. A changed picture gets a new address, so browsers never show an old one.

Without `public/art/`, the app still works and draws every card, back, pack and True Word with CSS. `npm run dev` serves the pictures as soon as they are built; reload the page.

## Making someone the DM

Everyone who signs in is a player. Only the role script can make someone the DM (or take the role away); nobody can do it from the app.

1. The person signs in to the app once, so their profile exists.
2. Run the script with their Google email address.

   Against the local emulators (with `npm run dev` or `npm run emulators` running):

   ```sh
   npm run set-role -- --email someone@example.com --role dm
   ```

   Against a real project (see below), add `--project` with the project ID. The script names the project and asks you to type its ID before changing anything:

   ```sh
   gcloud auth application-default login   # once, so the script can act as you
   npm run set-role -- --email someone@example.com --role dm --project <project-id>
   ```

Use `--role player` to take the DM role away. The change shows up in the open app at once, without a reload.

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
   npm run build-art -- --source <folder with the archives>
   npm run build
   npx firebase deploy --only hosting,firestore
   ```

`firebase deploy` publishes the app and the security rules to the real project. Only run it on purpose.

Deploy only from a machine that has built the pictures: `npm run build` copies `public/art/` into `dist/`, and a deploy without it publishes the app without pictures. Hosting serves the pictures to anyone who knows their address, without signing in; the owner accepted this.
