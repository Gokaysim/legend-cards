# deployment Specification

## Purpose

Defines how Legend Card Manager gets from the `master` branch to the one live Firebase project: the automated checks that gate a deploy, what a deploy publishes and in which order, how the deploy authenticates, and how the live project is set up and protected.

## Requirements

### Requirement: Checks on every push
Every push to the `master` branch of the GitHub repository SHALL start an automated run. The run SHALL execute the quality check command, the production build and the emulator test command on the Node.js version the repository declares and a Java 21 runtime. The run SHALL fail when any of them fails, and SHALL need none of the owner's local files.

#### Scenario: A clean push
- **WHEN** the owner pushes a commit to `master` that passes the type check, lint, format check, unit tests, build and emulator tests
- **THEN** the run reports success for every check

#### Scenario: A failing test
- **WHEN** the owner pushes a commit to `master` with a failing unit test
- **THEN** the run fails and names the failing check

#### Scenario: No owner data on the runner
- **WHEN** a run starts on a runner that has no CSV files in the data folder and no picture archives
- **THEN** every check runs, and none fails for a missing file

### Requirement: Deploy only after every check passes
When every check of a run on `master` passes, the run SHALL deploy to the live project. When any check fails, the run SHALL deploy nothing and leave the live project as it was. Runs that do not belong to `master` SHALL never deploy.

#### Scenario: Checks pass
- **WHEN** a run on `master` passes every check
- **THEN** the run deploys that commit to the live project

#### Scenario: Emulator tests fail
- **WHEN** a run on `master` passes the quality checks and the build, but an access-rule test fails
- **THEN** nothing is deployed, and the live project keeps the rules and the site it had

### Requirement: What a deploy publishes, in order
A deploy SHALL publish the Firestore indexes and rules first, then the Storage rules, then the built site. A step SHALL start only after the one before it succeeded. A deploy SHALL NOT change data, stored files or user accounts in the live project.

#### Scenario: A change that adds a data path
- **WHEN** a commit adds a Firestore collection, its rules and a screen that reads it, and the deploy runs
- **THEN** the new rules are live before the new site is served

#### Scenario: The rules step fails
- **WHEN** publishing the Firestore rules fails during a deploy
- **THEN** the Storage rules and the site are not published, and the run fails

#### Scenario: Data stays
- **WHEN** a deploy finishes
- **THEN** every Firestore document, stored picture and user account of the live project is as it was before the deploy

### Requirement: One deploy at a time
Deploys SHALL run one at a time. A deploy that is waiting SHALL start after the running one ends, and the newest commit SHALL be what the live project shows in the end.

#### Scenario: Two quick pushes
- **WHEN** the owner pushes two commits to `master` a minute apart, and both pass their checks
- **THEN** the two deploys do not overlap, and the live site serves the second commit at the end

### Requirement: Manual run
The owner SHALL be able to start a run on `master` by hand from GitHub, without pushing a commit. A manual run SHALL run the same checks and deploy only when they pass.

#### Scenario: Redeploying by hand
- **WHEN** the owner starts a manual run on `master`
- **THEN** the checks run, and when they pass the current `master` is deployed

### Requirement: Keyless deploy credentials
A deploy SHALL authenticate to Google Cloud with short-lived credentials issued only to runs of this repository's `master` branch. No long-lived service account key SHALL exist for the deploy, in the repository or in its settings. The deploy identity SHALL be able to publish rules, indexes and the site, and nothing more.

#### Scenario: A run from another branch
- **WHEN** a workflow run from any branch other than `master`, or from another repository, asks for deploy credentials
- **THEN** Google Cloud refuses them

#### Scenario: Looking for a key
- **WHEN** someone searches the repository, its history and its settings for a service account key
- **THEN** there is none

### Requirement: Public settings as variables
The live project's ID and the web app's Firebase settings SHALL be stored as repository variables and given to the build. They SHALL NOT be committed. The committed project settings SHALL name only the demo project, so a Firebase command run without a project never reaches the live project.

#### Scenario: Building for the live project
- **WHEN** a deploy builds the site
- **THEN** the built app connects to the live project, not to the emulators

#### Scenario: A command without a project
- **WHEN** a developer runs a Firebase command in a clone without naming a project
- **THEN** it targets the demo project

### Requirement: Go-live runbook
The README SHALL give the one-time steps to put the app live, in order:
- create the live project with Google sign-in, Firestore and Storage on the Blaze plan with a budget alert, and turn on recovery
- set up the deploy identity
- create the repository and set its variables
- do the first deploy from the owner's machine
- load the owner's data and pictures
- give access to the first DM

#### Scenario: Following the runbook
- **WHEN** the owner follows the runbook on a new Google Cloud project
- **THEN** the app is live, every later push to `master` deploys by itself, and the first DM can sign in and has the DM role

#### Scenario: The first deploy
- **WHEN** the owner reaches the deploy step of the runbook
- **THEN** the runbook says to do the first deploy from their own machine, where the Firebase CLI can ask to let Storage read the DM's role from Firestore

### Requirement: Recovering the live data
The live Firestore database SHALL keep Point-in-time Recovery turned on, so its data can be read as it was at any moment of the past seven days. The project SHALL have a budget alert. The runbook SHALL say how to recover data from an earlier moment.

#### Scenario: A mistake found the next day
- **WHEN** the DM finds out on Tuesday that a player's LP was wrongly changed on Monday evening
- **THEN** the owner can read that player's balance as it was before the change, by following the runbook

#### Scenario: Unexpected cost
- **WHEN** the project's monthly cost passes the budget the owner set
- **THEN** the owner gets an email from the budget alert
