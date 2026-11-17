# Design

## Context

See proposal.md for the motivation. The current state that shapes the approach:

- **Repository.** It lives on one local `master` branch with 65 commits and no remote. The owner works directly on `master`, and opens no branches or pull requests.
- **Firebase.**
  - `.firebaserc` names only `demo-legend-cards`.
  - `firebase.json` already configures Hosting (`dist/`, SPA rewrite, cache headers), the Firestore rules and indexes, and the Storage rules.
  - The live project's settings are meant for `.env.production.local`, which git ignores (spec: developer-workflow, "Environment settings").
- **Scripts.** The imports, the picture build and the picture import resolve their default files relative to the script, for example `new URL('../data/legend-cards.csv', import.meta.url)`, and read the alias table from `data/image-aliases.csv`.
- **Tests that read the owner's data.**
  - Five unit test files read the real CSV files: `cardRows`, `setRows`, `trueWordRows`, `artInventory` and `cardCatalog.drift`.
  - Two emulator tests read them too: `import-sets` and `import-true-words`.
  - `artInventory.test.ts` plans the 866 real archive file names in `artInventory.fixture.ts` against the real data.
- **History.** The only paths in history that hold the owner's data are the five `data/*.csv` files and `scripts/lib/artInventory.fixture.ts`. No commit has a key or a service account file.
- **Pictures and formatting.** `public/art/` (2.7 MB, 27 WebP files and a manifest) is ignored today. Prettier 3 skips git-ignored files, so committing the folder brings `public/art/manifest.json` under `format:check`.
- **Dependency.** `invite-only-sign-in` is being implemented in parallel. It changes the rules and adds the `allow-email` script. The live project must not open to the group before that change is archived.

## Goals / Non-Goals

**Goals:**

- One workflow file that checks every push and deploys `master`, with no long-lived credential anywhere.
- A history that can be published: no commit carries the owner's card data or the archive listing.
- The owner's machine keeps every check it has today, real data included.
- A runbook the owner can follow once, end to end.

**Non-Goals:**

- A staging project, preview channels or pull request previews.
- A custom domain. The site lives on `<project-id>.web.app`, which Firebase Auth already authorizes.
- App Check, Cloud Functions, and Dependabot or other automated dependency pull requests.
- Moving the Mechanic Pack pictures into Storage. They stay static: the eight Mechanic Packs are a fixed list in `src/features/cards/mechanicPacks.ts`.
- Rewording the scenarios in other specs that say "the repository's data", such as activity-log, card-sets and pack-shop. They describe the owner's data, which still exists, and their behavior does not change.
- Automating the data import into the live project. It needs the owner's archives and stays a manual runbook step.

## Decisions

### D1. One workflow file with three jobs

`.github/workflows/ci.yml` triggers on `push` to `master`, on `pull_request`, and on `workflow_dispatch`. It has three jobs:

```
            push / pull_request / workflow_dispatch
                         |
          +--------------+---------------+
          v                              v
   [check]                        [emulator-tests]
   setup-node (.nvmrc)            setup-node + setup-java 21 (temurin)
   npm ci                         cache ~/.cache/firebase/emulators
   npm run check                  npm ci
   npm run build                  npm run test:emulator
          |                              |
          +--------------+---------------+
                         v
   [deploy]  needs both; if github.ref == refs/heads/master
             && event != pull_request
             environment: production, concurrency: production (no cancel)
             permissions: id-token write, contents read
             auth (WIF) -> npm ci -> npm run build (VITE_* from vars)
             -> firebase deploy --only firestore
             -> firebase deploy --only storage
             -> firebase deploy --only hosting
```

- The two check jobs run in parallel, because the emulator job is the slow one.
- The check job's build uses no live settings. It only proves that the code compiles and bundles.
- The deploy job builds again with the live settings. The alternatives were building once and passing an artifact between jobs, or giving the check job the live variables. Rebuilding costs about a minute, keeps live settings out of the pull request runs, and keeps the jobs independent.
- **Alternatives considered:**
  - Separate `ci.yml` and `deploy.yml` linked by `workflow_run`. This adds indirection, and the gate is less clear.
  - `FirebaseExtended/action-hosting-deploy`. It deploys only Hosting, so the rules and indexes would still need the CLI.

### D2. Deploy order as three sequential CLI calls

Three `firebase deploy --only <target> --project "$FIREBASE_PROJECT_ID" --non-interactive` steps run in the order firestore, storage, hosting. A failing step stops the job, so the later steps never run.

- A single `--only firestore,storage,hosting` call does not promise any order between targets.
- `--project` is always explicit, and `.firebaserc` keeps only the demo alias. A command run without a project can never reach the live project, and the project ID stays a variable.
- Index builds can take minutes after the deploy returns. A new query that needs a new index can fail briefly until the build finishes. At this scale we accept that. The runbook notes it, and there is no wait step.

### D3. Workload Identity Federation for the deploy identity

`google-github-actions/auth` exchanges the run's OIDC token for short-lived credentials of a deploy service account. It writes an Application Default Credentials file, which the Firebase CLI picks up.

- **The provider's attribute condition** pins the identity to `assertion.repository_id == '<id>'` and `assertion.ref == 'refs/heads/master'`. It uses the repository ID, not its name, so a renamed or re-created repository with the same name gets nothing.
- **The service account's roles:** Firebase Hosting Admin, Firebase Rules Admin, Cloud Datastore Index Admin, Firebase Viewer, and Service Usage Consumer. Firebase Viewer (read-only) was added after the first CI deploy failed: the CLI reads the default bucket before it publishes the Storage rules, which needs `firebasestorage.defaultBucket.get` and also `firebase.projects.get` (with only Cloud Storage for Firebase Viewer, the lookup answers 404). If a later deploy fails on a missing permission, we add only the narrowest read-only role the CLI names and list it in the runbook.
- **GitHub settings:**
  - The workflow reads the provider name and the service account email from repository variables (`GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_DEPLOY_SERVICE_ACCOUNT`).
  - It reads `FIREBASE_PROJECT_ID` and the four other `VITE_FIREBASE_*` values from repository variables too (`VITE_FIREBASE_PROJECT_ID` is `FIREBASE_PROJECT_ID`). They cannot live in the environment, because the deploy job's `if` checks `vars.FIREBASE_PROJECT_ID`, and a job-level `if` sees only repository variables.
  - The deploy job runs in a `production` environment that only `master` may deploy to. This records each deploy in GitHub and adds a second branch check next to the WIF condition.
  - `VITE_USE_FIREBASE_EMULATORS` is set to `false` in the workflow itself.
- **Alternative:** a JSON key in a secret, which `firebase init hosting:github` creates. That key is long-lived, can leak, and the generated workflow covers Hosting only. We rejected it, as the owner agreed in explore.

### D4. The owner's data: an ignored folder with the same layout

- `.gitignore` gets `data/*` and `!data/README.md`. The files stay at the same paths on the owner's machine, so the scripts' defaults do not change. A future data file is ignored without another rule.
- `scripts/lib/artInventory.fixture.ts` becomes `data/art-inventory.json`, with the same `{ archive: [file names] }` shape. `data/README.md` says how to regenerate it from `7zz l`. The TypeScript module is deleted.
- **Missing files** (spec: admin-scripts, "A missing data file"):
  - A small shared helper checks that a default file exists before the script reads anything. If it does not, the script prints a Turkish message from `scripts/lib/messages.ts` and exits with code 1.
  - A path given by option (`--file`, `--legend`, `--cursed`) skips this check and keeps the existing read error.
- **Alternative:** moving the data outside the repository folder, for example to `~/Downloads` with a `--data` option. That changes every command and every document, for no gain over an ignored folder.

### D5. Tests: invented fixtures plus checks that need the owner's data

- **Invented fixtures.** `tests/fixtures/data/` holds small invented CSV files: a few Legend, Blessed and Cursed rows with the edge cases the tests need (accents, apostrophes, "—" costs, a draft row), a few True Words and two alias rows. Their texts are invented, and their names are the few the specs already use. The set file is the list of the 12 sets, because every player sees those names in the app and `src/test/setFixtures.ts` already holds them, so the set import tests keep their full coverage. The parser tests and the two emulator import tests read these, and their expected counts change to match.
- **Checks that need the owner's data.** The checks that only make sense against real data move into `describe.skipIf(!hasOwnerData(...))` blocks. These are:
  - "591 cards, 3 drafts", "154 Cursed", "53 words", "12 sets"
  - the whole `artInventory` plan
  - the drift test's normalization of every real name

  A helper in `scripts/lib/` tells whether the named data files exist. Vitest reports these checks as skipped, not passed, so a skip is visible in the output.
- **The drift test** also gets a fixture-based check of a few tricky names, so CI still compares the two `normalize` copies.
- **Alternative:** dropping the real-data checks. They caught real problems (a renamed card losing its picture), and they cost nothing on the owner's machine.

### D6. Committed static pictures

- `public/art/` leaves `.gitignore` and joins `.prettierignore`, because it is generated output written by `JSON.stringify(…, null, 2)`.
- Rebuilding with `build-art` replaces the hashed files. The owner commits the result like any other change.
- Card, word and set pictures stay in Storage, as today (spec: card-images, "Card and word pictures are stored with their definitions").

### D7. Rewriting history once, before the first push

The history is rewritten with `git filter-repo --invert-paths` for the six paths, after the commit that stops tracking them. That commit then becomes empty and is pruned.

**Preconditions:**

- every change in flight is committed, `invite-only-sign-in` included
- the working tree is clean
- the owner has said yes at that step

**Safety net:**

- a `git clone --mirror` backup outside the repository
- a copy of the six files outside the repository

`filter-repo` checks the rewritten HEAD out again, which would delete files that are still tracked. Stopping tracking first and keeping the copies avoids losing them.

**Verification:**

- `git log --all --name-only` shows none of the six paths
- `git grep` over all revisions finds no card text, for example a sentence from a known card
- `npm run check` passes

**Alternative:** BFG. It is not installed, and filter-repo is the tool git recommends.

### D8. Live data recovery

Point-in-time Recovery is turned on with `gcloud firestore databases update --enable-pitr` and keeps 7 days. To look at an earlier moment, the runbook uses a Firestore export or a database clone at a timestamp inside that window, then a manual fix in the console. There is no automated restore: the DM fixes single mistakes by hand.

A Cloud Billing budget alert is set to a small monthly amount. The owner picks it, and the runbook suggests 5 USD.

## Risks / Trade-offs

- **[Risk]** The Firebase CLI might not use the WIF credentials for every target, or might ask for a permission the deploy role lacks.
  - The first CI deploy is watched. The narrowest missing role is added and recorded in the runbook.
  - Fallback: run a deploy from the owner's machine while the role is fixed.
- **[Risk]** A rules deploy that passes the emulator tests but is still wrong could lock out users or open data.
  - The rules tests gate every deploy.
  - Rollback is a revert commit pushed to `master`, or the previous ruleset restored in the Firebase console's rules history.
- **[Risk]** The history rewrite runs while another session has uncommitted work.
  - The rewrite task requires a clean tree, comes after `invite-only-sign-in` is archived, and asks the owner first.
  - The mirror backup restores everything.
- **[Risk]** Fixture-based tests drift from the real file format.
  - The skipped real-data checks run on every `npm run check` on the owner's machine, which is where data changes happen.
- **[Trade-off]** A few real card and set names stay in test fixtures, in OpenSpec specs, and in `artInventory.test.ts`'s history. The owner accepted this small leak in explore.
- **[Trade-off]** Every push to `master` deploys at once, and there is no staging. A green run is the only gate. This fits a one-table hobby app.
- **[Trade-off]** Index builds can lag a deploy by minutes (D2).

## Migration Plan

1. Land the code and test changes (D4–D6) while the data files are still tracked. Verify with `npm run check` and `npm run test:emulator`, then once more with the data files moved away, as CI will see them.
2. Wait until `invite-only-sign-in` is archived and the working tree is clean.
3. Rewrite the history as in D7, with the owner's go-ahead.
4. Create the public GitHub repository, set `master` as its default branch, and push.
5. Watch the first CI run go green without a deploy. The `production` variables are not set yet, so the deploy job is turned off until they exist: it is gated on `vars.FIREBASE_PROJECT_ID != ''`.
6. Follow the runbook:
   1. Create the project, with Blaze, a budget alert and PITR.
   2. Turn on Google sign-in, create the Firestore database and the Storage bucket in one European region, and register the web app.
   3. Set up WIF.
   4. Do the first deploy from the owner's machine with `.env.production.local`.
   5. Run `import-sets --source`, `import-cards`, `import-true-words` and `import-pictures` with `--project`.
   6. Run `allow-email`, have the first DM sign in, then run `set-role`.
   7. Set the GitHub variables, `FIREBASE_PROJECT_ID` last, because it turns the deploy job on. So the first automated deploy comes only after the live project has its data and its DM.
7. Start a manual run, and watch the first automated deploy.

**Rollback:**

- **The site:** Firebase Hosting's release history ("Rollback"), or a revert commit.
- **The rules:** a revert commit, or the console's rules history.
- **The history rewrite:** before the first push, restore from the mirror backup. After the push, the published history is final, so the rewrite is verified before pushing.

## Open Questions

- The budget amount. The owner decides it during the runbook. It does not affect the code.
- The GitHub repository's name and owner account. The workflow does not depend on them, because WIF pins the repository ID that the runbook reads after the repository is created.
