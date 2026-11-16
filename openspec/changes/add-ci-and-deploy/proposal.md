# Proposal

## Why

The app is ready to be used at the table, but it runs only on the local emulators: no real Firebase project, no GitHub repository, and no automated checks. The owner wants it live, with every push to `master` checked and deployed automatically. The owner also wants the repository public, but the owner's card data (every card's text, cost and set, the True Words, and the drafts that only the DM sees in the app) must not be published there.

## What Changes

- **Continuous integration.** A GitHub Actions workflow runs on every push to `master`. It runs the quality checks, the production build and the emulator tests on Node 24 and Java 21.
- **Automatic deployment.** When every check passes on `master`, the same workflow deploys to the one live Firebase project, in a fixed order:
  1. Firestore indexes and rules
  2. Storage rules
  3. Hosting

  The owner can also start a run by hand. A failed check deploys nothing.
- **Keyless deploy credentials.** The workflow signs in to Google Cloud through Workload Identity Federation, limited to this repository's `master` branch. No service account key exists. The web app's Firebase settings and the project ID are GitHub variables, not secrets, because they are public identifiers.
- **Static pictures are committed.** `public/art/` leaves `.gitignore` and is committed: the Blessed and Cursed cardbacks, the Golden and Cursed Golden packs, the eight Mechanic Pack pictures and the screens' Cardmaker. So the workflow can build the app without the owner's archives. Everything the DM changes in the app (card, True Word and set pictures) stays in Cloud Storage, as today.
- **BREAKING for the repository: the owner's data leaves it, history included.**
  - The five CSV files in `data/` and the archive inventory `scripts/lib/artInventory.fixture.ts` stop being tracked, are ignored, and are removed from the whole git history with `git filter-repo` before the first push.
  - The files stay on the owner's machine in the same places, so the import scripts keep working without options.
  - On a machine without them, such as the CI runner or a fresh clone, an import that needs a missing file stops with a Turkish message.
- **Tests stop depending on the owner's data.**
  - The checks that read the real CSV files move to small invented fixture files.
  - The checks that need the real data, such as the card counts, the picture inventory and the normalization of every real name, run only when the data is present, so they still run on the owner's machine.
- **A go-live runbook** replaces the README's "Connecting a real Firebase project (later)" section. It covers creating the project on the Blaze plan with a budget alert, Point-in-time Recovery for Firestore, the Workload Identity Federation setup, the GitHub repository and its variables, the first deploy from the owner's machine, loading the data and pictures, and giving access to the first DM.
- **Order with `invite-only-sign-in`.** The live project opens to the group only after that change is archived. Until then any Google account could sign in and read the table. The runbook's first-DM steps use its `allow-email` script.

## Capabilities

### New Capabilities

- `deployment`: how the app gets from `master` to the live project. Covers the checks that gate a deploy, the deploy order, the credentials, the manual run, the go-live runbook and the live project's recovery settings.

### Modified Capabilities

- `developer-workflow`: "Initial card data in the repository" becomes data kept outside version control. The owner's CSV files and archive inventory stay on the owner's machine and out of git history. Checks that need them run only where they are present.
- `admin-scripts`: the card, True Words and set imports read their default files from the local data folder, not from files kept in the repository, and stop with a Turkish message when a file is missing.
- `card-images`:
  - The picture build writes to a public picture folder that is committed.
  - The picture alias table is kept in the local data folder, not in the repository.

## Impact

- **New files:**
  - `.github/workflows/ci.yml`: the check, emulator test and deploy jobs
  - `tests/fixtures/data/`: small invented CSV files for the parser and import tests
- **Git:**
  - `.gitignore`: drops `public/art/` and adds `data/*.csv` and the local archive inventory
  - The history is rewritten once with `git filter-repo`, which changes every commit hash. That is harmless because no remote exists yet. A full mirror backup comes first.
- **Tests:**
  - `scripts/lib/cardRows.test.ts`, `setRows.test.ts`, `trueWordRows.test.ts`, `cardCatalog.drift.test.ts` and `artInventory.test.ts`
  - `tests/import-sets.emulator.test.ts` and `tests/import-true-words.emulator.test.ts`
- **Scripts:** the import scripts' messages (`scripts/lib/messages.ts`) gain a missing-file message. `artInventory` reads the inventory from the local data folder.
- **Docs:**
  - `README.md`: the runbook, and the CI and data notes
  - `data/README.md`: the files are local, and none of them is committed
  - `docs/conventions.md`: the layout, and the test notes for the local-data checks
  - `CLAUDE.md`: CI is the gate, and the real project only through the workflow and the runbook
- **Firebase:** `.firebaserc` keeps only the demo project. The live project ID lives in a GitHub variable and in the owner's `.env.production.local`.
- **External:** a Google Cloud project on Blaze, a GitHub repository (public) with Actions, and a Workload Identity pool and service account. These are one-time manual steps from the runbook.
