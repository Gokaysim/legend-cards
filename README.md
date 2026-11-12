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

| Script                      | What it does                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`               | Start the Firebase emulators and the Vite dev server together                                                                              |
| `npm run dev:web`           | Start only the Vite dev server                                                                                                             |
| `npm run emulators`         | Start only the Auth, Firestore and Storage emulators, keeping their data between runs                                                      |
| `npm run build`             | Type-check and build the production files into `dist/`                                                                                     |
| `npm run preview`           | Serve the built `dist/` locally                                                                                                            |
| `npm run typecheck`         | Run the TypeScript compiler without emitting files                                                                                         |
| `npm run lint`              | Run ESLint                                                                                                                                 |
| `npm run format`            | Format all files with Prettier                                                                                                             |
| `npm run format:check`      | Check formatting without changing files                                                                                                    |
| `npm run test`              | Run the unit tests (no Firebase)                                                                                                           |
| `npm run test:watch`        | Run the unit tests in watch mode                                                                                                           |
| `npm run test:emulator`     | Start the Firebase emulators, run the emulator-backed tests, then stop them                                                                |
| `npm run check`             | Type check, lint, format check and unit tests: run this before every commit                                                                |
| `npm run set-role`          | Set a user's role (`dm` or `player`); see [Making someone the DM](#making-someone-the-dm)                                                  |
| `npm run import-cards`      | Load the card definitions from `data/` into Firestore; see [Loading the cards](#loading-the-cards)                                         |
| `npm run import-true-words` | Load the True Words from `data/true-words.csv` into Firestore; see [Loading the cards](#loading-the-cards)                                 |
| `npm run build-art`         | Build the cardbacks, packs and Cardmaker from the owner's archives into `public/art/`; see [Building the pictures](#building-the-pictures) |
| `npm run import-pictures`   | Store the card and True Word pictures from the owner's archives in Cloud Storage; see [Building the pictures](#building-the-pictures)      |

## Local Firebase emulators

Development never touches a real Firebase project. Everything runs against local emulators on the demo project `demo-legend-cards`. Firebase treats project IDs that start with `demo-` as offline-only.

| Emulator    | Address                    |
| ----------- | -------------------------- |
| Emulator UI | http://127.0.0.1:4000      |
| Auth        | 127.0.0.1:9099             |
| Firestore   | 127.0.0.1:8080             |
| Storage     | 127.0.0.1:9199             |
| Hosting     | 127.0.0.1:5002 (on demand) |

- The Emulator UI shows the test users, the Firestore data and the stored pictures, and lets you edit them by hand.
- Emulator data, the stored pictures included, is saved to `.firebase-emulator-data/` when you stop `npm run dev` or `npm run emulators` with Ctrl+C, and loaded again on the next start. Delete that folder to start empty.
- The emulators need a Java 21 or newer runtime (for example Amazon Corretto 21: `brew install --cask corretto@21`).
- To serve the production build the way Firebase Hosting would: `npm run build`, then `npx firebase emulators:start --only hosting --project demo-legend-cards`, and open http://127.0.0.1:5002.

## Environment files

The app reads its Firebase settings from environment variables. At startup it checks them, and if one is missing or malformed it shows an error screen naming the setting.

| File                    | Committed    | Contents                                                           |
| ----------------------- | ------------ | ------------------------------------------------------------------ |
| `.env.example`          | yes          | Every setting the app reads, with a description                    |
| `.env.development`      | yes          | Demo values for the emulators (`VITE_USE_FIREBASE_EMULATORS=true`) |
| `.env.production.local` | no (ignored) | The real project's values, once a real project exists              |

The settings are `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, and `VITE_USE_FIREBASE_EMULATORS`.

**These values are not secrets.** A Firebase web config is a set of public identifiers that ends up in the browser bundle anyway. Data is protected by the Firestore security rules (`firestore.rules`), not by hiding the config. Do not rely on keeping these values private.

## Loading the cards

The owner's card data lives in `data/` as CSV files (see [data/README.md](data/README.md)). A fresh emulator has no cards, so load them once:

```sh
npm run dev            # in one terminal: the emulators and the app
npm run import-cards   # in another: loads 591 Legend cards (3 of them drafts) and 154 Cursed cards
npm run import-true-words   # then: loads the 53 True Words
```

The emulators keep the cards and the words between runs. An import only adds what is not stored yet: it never changes, retires or deletes a stored card or word, because from then on the DM changes them in the app. A card or word with an empty value is added as a draft, which only the DM sees (see [data/README.md](data/README.md)). Each import that adds something is listed in the İşlem Logu. Running an import again writes nothing new.

Cards and words stored before definitions had a status get one on the next import: run both imports once after updating an older checkout.

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

The pictures come from the owner's five `.7z` archives (about 560 MB of PNG). They stay outside the repository. Two scripts read them from a folder and convert them to WebP:

- **Cardbacks, pack pictures and the Cardmaker** are static files. `build-art` writes them with a manifest to `public/art/`, which is not committed.
- **Card and True Word pictures** live in Cloud Storage, and each card or word holds where its picture is. `import-pictures` stores them once, matched against the stored cards and words. After that the DM uploads, replaces, downloads and removes pictures in the card and True Word forms.

```sh
npm run build-art -- --source ~/Downloads --dry-run         # report only: what matches, what is missing
npm run build-art -- --source ~/Downloads                   # write public/art/

npm run import-pictures -- --source ~/Downloads --dry-run   # with the emulators running, after the imports
npm run import-pictures -- --source ~/Downloads             # store the card and word pictures
```

- Neither script changes the archives. They extract them into a temporary folder that they always remove, and take loose `.png` files in the folder as they are.
- They match each file by its name, and by the alias table `data/image-aliases.csv` for names that differ from the data (see [data/README.md](data/README.md#pictures)). The picture import matches against the stored cards and words, so a card the DM renamed or added is found too.
- Each prints a Turkish report:
  - The build counts the cardbacks, packs and Cardmaker and names the missing ones.
  - The picture import counts, per kind, the pictures it adds, the cards and words that already have one, and those whose picture the DM removed. It also names every card and word left without a picture, and lists the duplicate and unknown files.
  - A row of the alias table that names nothing stops the run before anything is written.
- Run the build again after the archives or the alias table change. It replaces the earlier pictures. A changed picture gets a new address, so browsers never show an old one.
- The picture import only adds. It never replaces a picture, and never brings back one the DM removed, so running it again adds only new cards' pictures. A run that stops halfway is completed by running it again. Each run that adds pictures is listed in the İşlem Logu.

Without the pictures the app still works and draws every card, back, pack and True Word with CSS. `npm run dev` serves the built pictures as soon as they exist; reload the page. The stored pictures stay in the Storage emulator between runs, with the rest of the emulator data.

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
4. Cloud Storage needs the **Blaze** (pay as you go) plan. Since February 2026, a project on the free Spark plan cannot use it. Under **Usage and billing**, switch to Blaze and set a budget alert. The pictures are about 50 MB, well inside Blaze's no-cost usage.
5. Under **Storage**, create the default bucket, in the same region as Firestore. Its name, usually `<project-id>.firebasestorage.app`, goes into the settings.
6. Create `.env.production.local` with the web app's values, `VITE_FIREBASE_STORAGE_BUCKET=<the bucket>` and `VITE_USE_FIREBASE_EMULATORS=false`.
7. Link the project and deploy:

   ```sh
   npx firebase login
   npx firebase use --add          # choose the new project, give it an alias such as "prod"
   npm run build-art -- --source <folder with the archives>
   npm run build
   npx firebase deploy --only hosting,firestore,storage
   ```

   `storage.rules` read the DM's role from Firestore. On the first deploy, the Firebase CLI asks to give Cloud Storage access to Firestore: accept it, or the DM cannot upload pictures.

8. Load the data, then the pictures: run `import-cards` and `import-true-words` (see [Loading the cards](#loading-the-cards)), then `npm run import-pictures -- --source <folder> --project <project-id>`. Add `--bucket <name>` when the bucket is not `<project-id>.firebasestorage.app`.

`firebase deploy` publishes the app and the security rules to the real project. Only run it on purpose.

Deploy only from a machine that has built the pictures: `npm run build` copies `public/art/` into `dist/`, and a deploy without it publishes the app without its cardbacks, packs and Cardmaker. Anyone who knows a picture's address can open it without signing in, on Hosting and in Cloud Storage; the owner accepted this.

**If "İndir" opens the picture instead of saving it**, the bucket does not send the `Content-Disposition` header the pictures are stored with. The fallback is to let the app fetch the file: allow the app's address in a CORS file (`[{"origin": ["https://<project-id>.web.app"], "method": ["GET"], "maxAgeSeconds": 3600}]`), apply it with `gcloud storage buckets update gs://<bucket> --cors-file=cors.json`, and change "İndir" to fetch the file and save it under the card's name (design D8 of `upload-card-and-word-pictures`).
