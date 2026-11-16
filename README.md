# Legend Cards

Legend Card Manager is a real-time web app for tracking the side card system that our DM runs in a D&D 3.5 group. Players earn **Legend Points (LP)** and spend them on cards from packs, and the app keeps track of who holds what. It is a tracker, not a game engine. The DM and players make decisions at the table, and the app records them.

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

| Script                      | What it does                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`               | Start the Firebase emulators and the Vite dev server together                                                                                                                  |
| `npm run dev:web`           | Start only the Vite dev server                                                                                                                                                 |
| `npm run emulators`         | Start only the Auth, Firestore and Storage emulators, keeping their data between runs                                                                                          |
| `npm run build`             | Type-check and build the production files into `dist/`                                                                                                                         |
| `npm run preview`           | Serve the built `dist/` locally                                                                                                                                                |
| `npm run typecheck`         | Run the TypeScript compiler without emitting files                                                                                                                             |
| `npm run lint`              | Run ESLint                                                                                                                                                                     |
| `npm run format`            | Format all files with Prettier                                                                                                                                                 |
| `npm run format:check`      | Check formatting without changing files                                                                                                                                        |
| `npm run test`              | Run the unit tests (no Firebase)                                                                                                                                               |
| `npm run test:watch`        | Run the unit tests in watch mode                                                                                                                                               |
| `npm run test:emulator`     | Start the Firebase emulators, run the emulator-backed tests, then stop them                                                                                                    |
| `npm run check`             | Type check, lint, format check and unit tests: run this before every commit                                                                                                    |
| `npm run allow-email`       | Put a Google email address on the access list, so it may sign in; see [Who may sign in](#who-may-sign-in)                                                                      |
| `npm run set-role`          | Set a user's role (`dm` or `player`); see [Making someone the DM](#making-someone-the-dm)                                                                                      |
| `npm run import-sets`       | Load the sets from `data/sets.csv` into Firestore, and with `--source` their cardbacks and Cardmakers into Cloud Storage; see [Loading the cards](#loading-the-cards)          |
| `npm run import-cards`      | Load the card definitions from `data/` into Firestore; see [Loading the cards](#loading-the-cards)                                                                             |
| `npm run import-true-words` | Load the True Words from `data/true-words.csv` into Firestore; see [Loading the cards](#loading-the-cards)                                                                     |
| `npm run build-art`         | Build the Blessed and Cursed cardbacks, the packs and the screens' Cardmaker from the owner's archives into `public/art/`; see [Building the pictures](#building-the-pictures) |
| `npm run import-pictures`   | Store the card and True Word pictures from the owner's archives in Cloud Storage; see [Building the pictures](#building-the-pictures)                                          |

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

The owner's card data lives in `data/` as CSV files (see [data/README.md](data/README.md)). The files are not in the repository: they come from the owner, who keeps them on their own machine, and a clone without them gets a Turkish message from each import. A fresh emulator has no sets and no cards, so load them once, the sets first:

```sh
npm run dev            # in one terminal: the emulators and the app
npm run import-sets -- --source ~/Downloads   # in another: adds the 12 sets, with their cardbacks and Cardmakers
npm run import-cards   # then: loads 591 Legend cards (3 of them drafts) and 154 Cursed cards
npm run import-true-words   # then: loads the 53 True Words
```

The emulators keep the sets, the cards and the words between runs. An import only adds what is not stored yet: it never changes, reorders, retires or deletes a stored set, card or word, because from then on the DM changes them in the app (Setler, and the Kütüphane's Kartlar, Cursed and True Words tabs). A card or word with an empty value is added as a draft, which only the DM sees (see [data/README.md](data/README.md)). Each import that adds something is listed in the İşlem Logu. Running an import again writes nothing new.

The card import warns about every set code that no stored set has as its code or alias, so run `import-sets` first. Such a card is still imported, and shows its set code as written until the DM adds the set on the Setler screen.

Cards and words stored before definitions had a status get one on the next import: run both imports once after updating an older checkout.

- `--dry-run` shows what the import would do, without writing.
- `npm run import-sets` without `--source` adds the sets without pictures. `--source <folder>` reads the owner's archives (see [Building the pictures](#building-the-pictures)) and gives each set its cardback and Cardmaker, only where the set never had one. Running it again with `--source` later adds the pictures of the sets that have none.
- `npm run import-sets -- --file <csv>` imports the sets from another file.
- `--legend <csv>` or `--cursed <csv>` imports only that deck.
- `npm run import-true-words -- --file <csv>` imports the True Words from another file.

Against a real project (see [Going live](#going-live)), look first, then import:

```sh
npm run import-sets -- --source <folder> --dry-run --project <project-id>
npm run import-sets -- --source <folder> --project <project-id>
npm run import-cards -- --dry-run --project <project-id>
npm run import-cards -- --project <project-id>
npm run import-true-words -- --dry-run --project <project-id>
npm run import-true-words -- --project <project-id>
```

## Building the pictures

The pictures come from the owner's five `.7z` archives (about 560 MB of PNG). They stay outside the repository. Three scripts read them from a folder and convert them to WebP:

- **The Blessed and Cursed cardbacks, the pack pictures and the screens' Cardmaker** are static files. `build-art` writes them with a manifest to `public/art/`, which is committed, so a clone or the CI builds the app with them and without the archives.
- **The sets' cardbacks and Cardmakers** live in Cloud Storage, and each set holds where its pictures are. `import-sets --source` stores them once, matched against the stored sets by code, official name or alias (see [Loading the cards](#loading-the-cards)). After that the DM changes them in the set form on the Setler screen.
- **Card and True Word pictures** live in Cloud Storage, and each card or word holds where its picture is. `import-pictures` stores them once, matched against the stored cards and words. After that the DM uploads, replaces, downloads and removes pictures in the card and True Word forms.

```sh
npm run build-art -- --source ~/Downloads --dry-run         # report only: what matches, what is missing
npm run build-art -- --source ~/Downloads                   # write public/art/

npm run import-sets -- --source ~/Downloads --dry-run       # with the emulators running
npm run import-sets -- --source ~/Downloads                 # add the sets, and store their cardbacks and Cardmakers

npm run import-pictures -- --source ~/Downloads --dry-run   # with the emulators running, after the imports
npm run import-pictures -- --source ~/Downloads             # store the card and word pictures
```

- No script changes the archives. They extract them into a temporary folder that they always remove, and take loose `.png` files in the folder as they are.
- They match each file by its name, and by the alias table `data/image-aliases.csv` for names that differ from the data (see [data/README.md](data/README.md#pictures)). The set import matches against the stored sets, and the picture import against the stored cards and words, so a set or card the DM renamed or added is found too.
- Each prints a Turkish report:
  - The build counts the cardbacks, packs and Cardmaker and names the missing ones. It also says how many files it left to the picture import and how many to the set import.
  - The set import counts the cardbacks and Cardmakers it stores, names the sets still without one, and lists the files that match no set.
  - The picture import counts, per kind, the pictures it adds, the cards and words that already have one, and those whose picture the DM removed. It also names every card and word left without a picture, and lists the duplicate and unknown files.
  - A row of the alias table that names nothing stops the run before anything is written.
- Run the build again after the archives or the alias table change. It replaces the earlier pictures. A changed picture gets a new address, so browsers never show an old one. Commit the changed `public/art/` like any other change.
- The set import and the picture import only add. They never replace a picture, and never bring back one the DM removed, so running them again adds only the pictures of new sets and cards. A run that stops halfway is completed by running it again. Each run that adds pictures is listed in the İşlem Logu.
- Builds from before the sets were stored data put the sets' cardbacks and Cardmakers into `public/art/`. The app no longer reads them there, and the next build drops them.

Without the pictures the app still works and draws every card, back, pack and True Word with CSS. `npm run dev` serves the built pictures as soon as they exist; reload the page. The stored pictures stay in the Storage emulator between runs, with the rest of the emulator data.

## Who may sign in

Only the Google accounts whose email address is on the DM's access list may use the app. Anyone else who signs in with Google sees a screen that names their address and asks them to have the DM add it; they read nothing, get no profile and appear nowhere. The DM adds and removes addresses under **Ayarlar → Masaya erişim**. Removing an address only closes access: the player's profile, cards and LP stay, and adding the address again brings them back.

Nobody can add the first address from the app, so the first DM's address is added with the access script:

```sh
npm run allow-email -- --email someone@example.com                           # the local emulators
npm run allow-email -- --email someone@example.com --project <project-id>    # a real project, after confirmation
```

The script stores the address in lowercase, needs no account for it yet, and changes nothing for an address already on the list.

Firebase still keeps an empty Auth record for every Google account that completes the sign-in window, on the list or not. It is visible only in the Firebase console and gives no access.

## Making someone the DM

Everyone on the access list is a player. Only the role script can make someone the DM (or take the role away); nobody can do it from the app. For the first DM of a project the order is: `allow-email`, then the person signs in once, then `set-role`.

1. The person's address is on the access list ([Who may sign in](#who-may-sign-in)), and they sign in to the app once, so their profile exists.
2. Run the script with their Google email address.

   Against the local emulators (with `npm run dev` or `npm run emulators` running):

   ```sh
   npm run set-role -- --email someone@example.com --role dm
   ```

   Against a real project (see [Going live](#going-live)), add `--project` with the project ID. The script names the project and asks you to type its ID before changing anything:

   ```sh
   gcloud auth application-default login   # once, so the script can act as you
   npm run set-role -- --email someone@example.com --role dm --project <project-id>
   ```

Use `--role player` to take the DM role away. The change shows up in the open app at once, without a reload.

## CI and deployment

GitHub Actions runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml) on every push to `master`, on every pull request, and on demand (**Actions → CI → Run workflow**). It has three jobs:

| Job              | What it does                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `check`          | `npm ci`, `npm run check`, and `npm run build` without live settings                                             |
| `emulator-tests` | `npm run test:emulator` on Java 21, with the emulators' downloads cached                                         |
| `deploy`         | only on `master`, after both jobs pass: builds with the live settings and deploys Firestore, Storage and Hosting |

- **A push to `master` goes live.** When `check` and `emulator-tests` pass, `deploy` publishes in this order: the Firestore rules and indexes, then the Storage rules, then the site. A failing check deploys nothing, and a failing step stops the ones after it. Deploys never change data, stored pictures or accounts.
- **One deploy at a time.** A newer run waits for the running deploy, so the newest commit ends up live.
- **No key.** `deploy` signs in to Google Cloud through Workload Identity Federation, which only this repository's `master` branch can use. No service account key exists.
- **Settings are variables.** The project ID and the web app's settings are repository variables (see [Going live](#going-live)), not secrets: they end up in the browser bundle anyway. `.firebaserc` names only the demo project, so a Firebase command without `--project` never reaches the live project.
- **The owner's data is not needed.** The runner has none of the files in `data/`; the tests that need them are skipped there.
- **New indexes build slowly.** After a deploy that adds a Firestore index, a screen that needs it can fail for a few minutes until the index is built.
- `deploy` stays off until the `FIREBASE_PROJECT_ID` variable is set.

To roll back, push a revert commit, or use the release history under **Hosting** and the rules history under **Firestore → Rules** in the Firebase console.

## Going live

The one-time steps to put the app online. Every command names the project with `--project` or `<project-id>`; nothing here uses the demo project.

1. **The project.** Create a project in the [Firebase console](https://console.firebase.google.com/).
   - Cloud Storage needs the **Blaze** (pay as you go) plan: since February 2026 a project on the free Spark plan cannot use it. Under **Usage and billing**, switch to Blaze.
   - Set a budget alert under **Google Cloud console → Billing → Budgets & alerts**, for example 5 USD a month with alerts at 50% and 100%. The pictures are about 50 MB, well inside Blaze's no-cost usage.
2. **Sign-in, data and pictures.**
   - Under **Authentication → Sign-in method**, enable the **Google** provider.
   - Create the **Firestore** database in a European location close to the group.
   - Under **Storage**, create the default bucket in the same region. Its name is usually `<project-id>.firebasestorage.app`.
   - Turn on Point-in-time Recovery, which keeps the last 7 days readable:

     ```sh
     gcloud auth login
     gcloud firestore databases update --database='(default)' --enable-pitr --project=<project-id>
     ```

3. **The web app.** Under **Project settings → Your apps**, add a **Web app** and copy its config. Put it into `.env.production.local` (see [Environment files](#environment-files)), with `VITE_FIREBASE_STORAGE_BUCKET=<the bucket>` and `VITE_USE_FIREBASE_EMULATORS=false`.
4. **The repository.** Create a public GitHub repository and push `master` to it. Under **Settings → General**, make `master` the default branch.
   - Under **Settings → Environments**, create `production` and limit its deployment branches to `master`.
   - Note the repository's numeric ID, from `https://api.github.com/repos/<owner>/<repository>` (`"id"`).
5. **The deploy identity (Workload Identity Federation).** Run these once:

   ```sh
   PROJECT_ID=<project-id>
   PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
   REPO_ID=<the repository's numeric ID>
   SA="github-deploy@$PROJECT_ID.iam.gserviceaccount.com"

   gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project="$PROJECT_ID"
   gcloud iam workload-identity-pools create github --project="$PROJECT_ID" --location=global \
     --display-name="GitHub Actions"
   gcloud iam workload-identity-pools providers create-oidc legend-cards --project="$PROJECT_ID" \
     --location=global --workload-identity-pool=github --display-name="legend-cards master" \
     --issuer-uri="https://token.actions.githubusercontent.com" \
     --attribute-mapping="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.ref=assertion.ref" \
     --attribute-condition="assertion.repository_id == '$REPO_ID' && assertion.ref == 'refs/heads/master'"

   gcloud iam service-accounts create github-deploy --project="$PROJECT_ID" --display-name="GitHub deploy"
   for role in roles/firebasehosting.admin roles/firebaserules.admin roles/datastore.indexAdmin \
     roles/serviceusage.serviceUsageConsumer; do
     gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$SA" --role="$role" \
       --condition=None
   done
   gcloud iam service-accounts add-iam-policy-binding "$SA" --project="$PROJECT_ID" \
     --role=roles/iam.workloadIdentityUser \
     --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository_id/$REPO_ID"
   ```

   The condition pins the repository by its ID, so a renamed or re-created repository with the same name gets nothing. The account can publish rules, indexes and the site, and nothing else; it has no key.

6. **The first deploy, from your machine.** `storage.rules` read the DM's role from Firestore. On the first deploy, the Firebase CLI asks to give Cloud Storage access to Firestore: accept it, or the DM cannot upload pictures. CI cannot answer that question, so the first deploy runs here:

   ```sh
   npx firebase login
   npm run build          # reads .env.production.local
   npx firebase deploy --only firestore,storage,hosting --project <project-id>
   ```

   The app is now at `https://<project-id>.web.app`, which Google sign-in already allows.

7. **The data and the pictures.** On the machine with the owner's files in `data/` and the archives:

   ```sh
   gcloud auth application-default login   # once, so the scripts can act as you
   npm run import-sets -- --source <folder> --dry-run --project <project-id>
   npm run import-sets -- --source <folder> --project <project-id>
   npm run import-cards -- --project <project-id>
   npm run import-true-words -- --project <project-id>
   npm run import-pictures -- --source <folder> --project <project-id>
   ```

   Use `--dry-run` first on each (see [Loading the cards](#loading-the-cards)). Add `--bucket <name>` to `import-sets` and `import-pictures` when the bucket is not `<project-id>.firebasestorage.app`.

8. **The first DM.** `npm run allow-email -- --email <address> --project <project-id>`, then the person signs in once, then `npm run set-role -- --email <address> --role dm --project <project-id>` (see [Who may sign in](#who-may-sign-in)). The DM adds everyone else from **Ayarlar → Masaya erişim**.
9. **Turn on the automatic deploy.** Under **Settings → Secrets and variables → Actions → Variables**, add these repository variables, `FIREBASE_PROJECT_ID` last, because it turns `deploy` on:

   | Variable                         | Value                                                                                            |
   | -------------------------------- | ------------------------------------------------------------------------------------------------ |
   | `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/<project-number>/locations/global/workloadIdentityPools/github/providers/legend-cards` |
   | `GCP_DEPLOY_SERVICE_ACCOUNT`     | `github-deploy@<project-id>.iam.gserviceaccount.com`                                             |
   | `VITE_FIREBASE_API_KEY`          | from the web app's config                                                                        |
   | `VITE_FIREBASE_AUTH_DOMAIN`      | from the web app's config                                                                        |
   | `VITE_FIREBASE_APP_ID`           | from the web app's config                                                                        |
   | `VITE_FIREBASE_STORAGE_BUCKET`   | the bucket                                                                                       |
   | `FIREBASE_PROJECT_ID`            | `<project-id>`                                                                                   |

   Then start **Actions → CI → Run workflow** on `master` and check that `deploy` passes. If the Firebase CLI stops on a missing permission, grant `github-deploy` the narrowest role it names, and add that role to step 5 here.

### Recovering earlier data

Point-in-time Recovery keeps the database readable as it was at any minute of the last 7 days. When the DM finds a mistake, for example a player's LP changed wrongly on Monday evening:

1. Copy the database as it was before the mistake into a new database (check the flags with `gcloud firestore databases clone --help`):

   ```sh
   gcloud firestore databases clone --project=<project-id> \
     --source-database='projects/<project-id>/databases/(default)' \
     --snapshot-time='<YYYY-MM-DDTHH:MM:00Z, before the mistake>' --destination-database=recovery
   ```

2. Open the `recovery` database in the Firebase console, and read the document as it was.
3. Fix the live data by hand: the DM in the app, or you in the console.
4. Delete the copy: `gcloud firestore databases delete --database=recovery --project=<project-id>`.

### Live project notes

Anyone who knows a picture's address can open it without signing in, on Hosting and in Cloud Storage; the owner accepted this.

**If "İndir" opens the picture instead of saving it**, the bucket does not send the `Content-Disposition` header the pictures are stored with. The fallback is to let the app fetch the file: allow the app's address in a CORS file (`[{"origin": ["https://<project-id>.web.app"], "method": ["GET"], "maxAgeSeconds": 3600}]`), apply it with `gcloud storage buckets update gs://<bucket> --cors-file=cors.json`, and change "İndir" to fetch the file and save it under the card's name (design D8 of `upload-card-and-word-pictures`).

## License

Legend Card Manager is free software, licensed under the [GNU General Public License version 3](LICENSE) only (`GPL-3.0-only`). You may share and change it under that license's terms.

The 3D dice are adapted from [Owlbear Rodeo's dice roller](https://github.com/owlbear-rodeo/dice), which is licensed under GPL-3.0. Using it is why this project is GPL-3.0 too. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) lists the adapted files and where they come from. Every runtime dependency must have a license that GPL-3.0 allows, such as MIT or Apache-2.0.
