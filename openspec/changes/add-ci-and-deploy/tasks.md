# Tasks

## 1. Committed static pictures

- [x] 1.1 Remove `public/art/` from `.gitignore` and add it to `.prettierignore` (design D6). Verify:
  - `git status` lists the 27 WebP files and `manifest.json` as new files
  - `npm run format:check` passes
- [x] 1.2 Update the docs (spec: card-images, "Building the pictures"):
  - `docs/conventions.md`: the layout line for `public/art/` and the picture build section say the folder is committed, and that a rebuild is committed like any change
  - `README.md` and `data/README.md`: say the same

  Verify that `grep -rn "not committed" README.md docs data/README.md` no longer refers to `public/art/`.

## 2. The owner's data out of version control

- [x] 2.1 Ignore the owner's data (design D4):
  - add `data/*` and `!data/README.md` to `.gitignore`
  - convert `scripts/lib/artInventory.fixture.ts` into `data/art-inventory.json` with the same archive-to-file-names shape, and delete the TypeScript module
  - run `git rm --cached` on the five CSV files and the fixture module, keeping them on disk

  Verify:
  - `git status` shows the six paths as deleted from the index
  - `git check-ignore data/legend-cards.csv data/art-inventory.json` prints both paths
  - the files still exist on disk
- [x] 2.2 Add the missing-file check to the scripts (spec: admin-scripts, "A missing data file"):
  - a small helper in `scripts/lib/` that the card, True Words and set imports, `build-art` and `import-pictures` call for each default file before they read anything
  - Turkish messages in `scripts/lib/messages.ts` that name the file, say it lives only on the owner's machine, and name `--file`, `--legend` or `--cursed` where they apply
  - a path given by option skips the check

  Verify with unit tests of the helper and the messages:
  - a missing default file stops the script before it reads anything
  - an option path is not checked
- [x] 2.3 Add invented fixture CSV files under `tests/fixtures/data/` (design D5):
  - Legend rows with normal, Blessed, a draft, a "—" cost, accents and apostrophes
  - Cursed rows
  - the 12 sets, the Pandemonium layout included: the list every player sees in the app
  - a few True Words, a held one included
  - two alias rows

  Verify that the files parse without errors in the tests of 2.4.
- [x] 2.4 Move the parser tests to the fixtures (spec: developer-workflow, "Checks without the owner's data"):
  - `cardRows.test.ts`, `setRows.test.ts` and `trueWordRows.test.ts` read the fixtures for their generic cases
  - the real-data counts (591/572/19/3 drafts, 154 Cursed, 53 words, 12 sets in shop order) move into `describe.skipIf` blocks behind a `hasOwnerData` helper in `scripts/lib/`

  Verify:
  - `npm run test` passes with the data files present, and runs the real-data checks
  - `npm run test` passes with the six files moved out of `data/`, and reports those checks as skipped
- [x] 2.5 Move `artInventory.test.ts` to read `data/art-inventory.json` and the real data behind `skipIf` (spec: developer-workflow, "A data change that loses a picture"). Give `cardCatalog.drift.test.ts` a fixture-based normalization check of tricky names that always runs, and keep the every-real-name check behind `skipIf`. Verify the same two ways as 2.4, and that renaming a card in a local copy of `legend-cards.csv` makes the inventory check fail and name it. Restore the file afterwards.
- [x] 2.6 Point the import emulator tests (`tests/import-sets.emulator.test.ts`, `tests/import-true-words.emulator.test.ts`, and `tests/import-cards.emulator.test.ts`, which reads both card files and `sets.csv`) at the fixtures, and update their expected counts and names. Verify that `npm run test:emulator` passes with and without the owner's files in `data/`.
- [x] 2.7 Update the docs:
  - `data/README.md`: every file is kept only on the owner's machine and is never committed. How to regenerate `art-inventory.json` from `7zz l`. What a fresh clone sees.
  - `docs/conventions.md`:
    - the layout line for `data/`
    - the test notes for `setRows`, `artInventory` and the importers: fixtures plus the checks that need the owner's data
    - the missing-file behavior
  - `README.md`: the "Loading the cards" section says the data files come from the owner
  - `docs/domain.md`: the lines that point at `data/*.csv`, only where they say the files are in the repository

  Verify that `grep -rn "kept in the repository\|belong to this repository" README.md docs data/README.md` finds nothing about the data files.

## 3. GitHub Actions workflow

- [x] 3.1 Write `.github/workflows/ci.yml` as in design D1 and D2:
  - **Triggers:** `push` to `master`, `pull_request` and `workflow_dispatch`.
  - **Jobs:**
    - `check`: setup-node from `.nvmrc` with the npm cache, `npm ci`, `npm run check`, `npm run build`
    - `emulator-tests`: setup-node, setup-java 21 (temurin), a cache of `~/.cache/firebase/emulators` keyed on the `firebase-tools` version in `package-lock.json`, `npm ci`, `npm run test:emulator`
    - `deploy`: runs on `master` and not on pull requests, and only when `vars.FIREBASE_PROJECT_ID` is set. It uses `environment: production`, `concurrency: production` with `cancel-in-progress: false`, and the permissions `id-token: write` and `contents: read`. Its steps are WIF auth, `npm ci`, a build with the `VITE_*` variables and `VITE_USE_FIREBASE_EMULATORS=false`, then three sequential `firebase deploy --only firestore|storage|hosting --project "$FIREBASE_PROJECT_ID" --non-interactive` steps.
  - **Versions:** pin every action to its current major version, checked at implementation time.

  Verify that `npx --yes @action-validator/cli .github/workflows/ci.yml` (or `actionlint` if installed) reports no errors.
- [x] 3.2 Rehearse the CI conditions locally: run `npm ci && npm run check && npm run build && npm run test:emulator` in a fresh `git clone` of the repository in the scratchpad, where no data files and no `.env.production.local` exist. Verify that all four pass.
- [x] 3.3 Document CI in `README.md` (a short "CI and deployment" section: what runs on a push, when it deploys, how to start a run by hand) and in `CLAUDE.md` (CI is the gate for `master`, and the real project is reached only through the workflow and the runbook). Verify that the README section names every job in `ci.yml`.

## 4. Go-live runbook

- [x] 4.1 Replace the README's "Connecting a real Firebase project (later)" section with a "Going live" runbook in the order of design's Migration Plan step 6 (spec: deployment, "Go-live runbook" and "Recovering the live data"). It includes:
  - **Project:** Blaze, a budget alert, and PITR with `gcloud firestore databases update --enable-pitr`
  - **Firebase services:** Google sign-in, plus Firestore and the Storage bucket in one European region
  - **The web app:** its config, and `.env.production.local`
  - **Workload Identity:** the pool and the provider with the `repository_id` and `ref` condition, the deploy service account with its roles, and the `workloadIdentityUser` binding
  - **GitHub:** the repository variables and the `production` environment restricted to `master`
  - **The first deploy:** from the owner's machine (`firebase deploy --only firestore,storage,hosting --project <id>`), accepting the Storage-to-Firestore access prompt
  - **Data:** the imports and the picture import with `--project`
  - **The first DM:** `allow-email`, the first sign-in, `set-role`
  - **Recovery:** reading an earlier moment through an export or a clone at a PITR timestamp

  Verify that every command in the runbook names `--project` or a placeholder, never the demo project, and that the steps match the order in the design.

## 5. History rewrite and first push (with the owner)

- [ ] 5.1 Confirm the preconditions:
  - `invite-only-sign-in` is archived, and every other change in flight is committed
  - `git status` is clean
  - groups 1–4 are committed, with the owner's go-ahead to commit
  - `npm run check` and `npm run test:emulator` pass

  Verify with `git status --porcelain` printing nothing.
- [ ] 5.2 Make the safety net: `git clone --mirror` of the repository and a copy of the six data files, both outside the repository (design D7). Verify:
  - `git -C <mirror> log --oneline | wc -l` equals the local count
  - the copied files match the originals by checksum
- [ ] 5.3 Ask the owner for an explicit yes. Then run `git filter-repo --force --invert-paths` with the five `data/*.csv` paths and `scripts/lib/artInventory.fixture.ts`. Restore the data files from the copy if any is missing. Verify:
  - `git log --all --name-only --format= | grep -E 'data/.*\.csv|artInventory.fixture'` prints nothing
  - `git grep` over `git rev-list --all` for a sentence of a known card's text finds nothing
  - `npm run check` passes
  - the data files are on disk and ignored
- [ ] 5.4 With the owner, create the public GitHub repository (the web UI, or `gh` if the owner installs it), add it as `origin`, push `master` and make it the default branch. Verify:
  - the first workflow run is green for `check` and `emulator-tests`
  - `deploy` is skipped, because `FIREBASE_PROJECT_ID` is not set yet

## 6. Live project and first automated deploy (with the owner)

- [ ] 6.1 Walk the runbook with the owner up to the first local deploy, fixing any step that does not work as written. Verify that `https://<project-id>.web.app` loads the sign-in screen.
- [ ] 6.2 Load the data and pictures into the live project with the runbook commands, `--dry-run` first. Then give the first DM access. Verify:
  - the DM signs in on the live site and has the DM role
  - the Kart kütüphanesi shows the owner's cards with pictures
- [ ] 6.3 Set the GitHub variables, then start a manual run on `master`. If the CLI stops on a missing permission, grant the narrowest role it names and record it in the runbook (design D3). Verify:
  - the run deploys firestore, storage and hosting in that order
  - the live site serves the new build
- [ ] 6.4 Check the safety settings. Verify:
  - `gcloud firestore databases describe` shows PITR enabled
  - the budget alert exists in Cloud Billing
  - no service account key exists for the deploy account (`gcloud iam service-accounts keys list` shows only Google-managed keys)

## Workflow follow-up

- Archive the change after the first automated deploy succeeds, and sync `deployment`, `developer-workflow`, `admin-scripts` and `card-images` into the main specs.
- Update the project memory: the live project ID, and the repository URL.
