# developer-workflow Specification

## Purpose

Defines how people and AI agents run, check, and change the Legend Card Manager codebase: the toolchain, local development against emulators, quality checks, environment settings, and the reference documents that describe the domain and the code conventions.

## Requirements

### Requirement: Pinned runtime
The repository SHALL declare Node.js 24 as its required runtime, in a form that version managers read automatically. The package manifest SHALL reject installs on an older major version.

#### Scenario: Selecting the runtime
- **WHEN** a developer runs their Node version manager's "use" command in the repository root without naming a version
- **THEN** Node.js 24 is selected

### Requirement: One-command local development
A single documented command SHALL start the application in development mode together with local emulators for authentication, data and file storage. It SHALL use a demonstration project ID, so that no real cloud project is contacted. Emulator data, the stored files included, SHALL survive between runs of that command.

#### Scenario: Starting development
- **WHEN** a developer runs the development command on a fresh clone after installing dependencies
- **THEN** the application opens locally, connected to the local emulators, and signing in uses the emulator's test Google accounts

#### Scenario: Data survives a restart
- **WHEN** a developer stops the development command normally and starts it again
- **THEN** the emulator data written in the earlier run is still there

#### Scenario: Pictures survive a restart
- **WHEN** the DM uploaded a card picture, and a developer stops the development command normally and starts it again
- **THEN** the card still shows that picture

### Requirement: Quality check command
A single command SHALL run type checking, linting, formatting verification, and the unit tests. It SHALL fail if any of them reports a problem. A separate command SHALL run the tests that need the local emulators, including the access-rule tests for the data and the file storage.

#### Scenario: Type error
- **WHEN** the source contains a type error and the developer runs the quality check command
- **THEN** the command exits with a failure and reports the type error

#### Scenario: Emulator tests
- **WHEN** a developer runs the emulator test command
- **THEN** the emulators, the file storage emulator included, are started for the run and stopped after it, and the command fails if any emulator-backed test fails

### Requirement: Production build
A build command SHALL produce static files that can be served from the configured hosting. Any application URL SHALL load the application, so screen URLs work on a fresh page load.

#### Scenario: Deep link on hosting
- **WHEN** the built files are served by the configured hosting and a user opens a screen URL directly
- **THEN** the application loads and shows that screen

### Requirement: Environment settings
The repository SHALL include an example environment file that lists every setting the application reads, each with a description. Settings for a real cloud project SHALL be kept in local files that version control ignores.

#### Scenario: Setting up a real project later
- **WHEN** a developer wants to connect a real cloud project
- **THEN** the example environment file and the README tell them which settings to provide and where to put them, without editing source code

### Requirement: Domain reference document
The repository SHALL contain a domain reference document that explains what Legend Card Manager is: a tracking tool for a DM's side card system in a D&D 5e group, not a game engine. It SHALL define the domain terms and list the game rules observed in the current legacy reference version, marking which rules are deliberate design decisions. It SHALL also record the legacy rules page's table rules, and list each disagreement with observed behavior as an open question until the owner settles it.

#### Scenario: Looking up a term
- **WHEN** a contributor looks for the meaning of a domain term such as Legend Points, Set, Mechanic Pack, Rarity, Cursed card, Blessed card, Pool, Hand, Pack type, True Word, Cardmaker, Shops, Elixir, or Custom Card
- **THEN** the domain reference defines it

#### Scenario: Checking a legacy rule
- **WHEN** a contributor wants to know when a Golden Pack can be opened in the legacy application
- **THEN** the domain reference states the rule as observed in legacy v2.2.8, and notes that it is a deliberate design decision

#### Scenario: Checking a changed price
- **WHEN** a contributor looks up the price label of a Mechanic Pack
- **THEN** the domain reference gives "4 LP / 10000 GP" as observed in legacy v2.2.8

#### Scenario: A table rule that the application does not follow
- **WHEN** a contributor reads how many Blessed cards each mechanic has
- **THEN** the domain reference shows the rules page's statement and the legacy application's behavior, records the owner's decision that the card data decides, and notes that the app's Kurallar screen follows that decision

#### Scenario: A disagreement still open
- **WHEN** the legacy rules page and the observed behavior disagree on a point the owner has not decided
- **THEN** the domain reference lists that point as an open question for the DM, with both sides

### Requirement: Code conventions document
The repository SHALL contain a code conventions document that covers:
- project structure and file naming
- language rules: code and docs in English, interface text in Turkish
- typing, styling, data access, and testing rules
- how to add a new data path together with its access rules

#### Scenario: Adding a new screen
- **WHEN** a contributor wants to add a new screen
- **THEN** the conventions document tells them where its files go, how to name them, and how to style them

### Requirement: Agent guidance
The repository SHALL contain an agent guidance file at its root. That file SHALL point AI coding agents to the domain reference, the code conventions, the run and check commands, and the change workflow the project uses.

#### Scenario: An agent starts work
- **WHEN** an AI coding agent opens the repository
- **THEN** the root guidance file tells it where the domain reference and conventions are, and which commands verify a change

### Requirement: Legacy design reference
The legacy single-file application SHALL be kept unchanged in a dedicated reference folder. Version v2.2.8 SHALL be the current design and behavior reference, and the earlier v2.1.15 file SHALL be kept unchanged as history. The folder's documentation SHALL name the current version and record a checksum for each file. The legacy files SHALL NOT be part of the application build.

#### Scenario: Building the application
- **WHEN** the production build runs
- **THEN** the output contains no copy of either legacy reference file

#### Scenario: Finding the current reference
- **WHEN** a contributor opens the legacy reference folder's documentation
- **THEN** it names v2.2.8 as the current reference, describes v2.1.15 as the earlier version, and gives a checksum for each file

### Requirement: The owner's data stays out of the repository
The owner's initial data SHALL be kept as CSV files in one local data folder: one file each for the Legend cards, the Cursed cards, the True Words and the sets, plus the picture alias table. The listing of the picture archives SHALL be kept there too. Version control SHALL ignore these files, and no commit in the repository's history SHALL contain them. The files SHALL keep the owner's content unchanged. A single documented command SHALL load the card files into the running local emulators. The folder's documentation SHALL stay in the repository and describe every file and its columns.

#### Scenario: Loading the cards for development
- **WHEN** a developer who has the owner's files in the data folder starts the local development command and runs the documented card import command
- **THEN** the Kart kütüphanesi and the Cursed Deck show the owner's cards

#### Scenario: Finding the data
- **WHEN** the owner looks for their card data on their own machine
- **THEN** they find the Legend card, Cursed card, True Words and set files in the data folder, under names that say what each holds

#### Scenario: Reading the public repository
- **WHEN** someone browses the public repository or any commit of its history
- **THEN** they find the data folder's documentation, and no card text, no True Word text and no listing of the picture archives

#### Scenario: Adding a file by mistake
- **WHEN** a developer runs `git status` after copying the owner's CSV files into the data folder
- **THEN** the files are not offered for commit

### Requirement: Open-source license
The repository SHALL be licensed under the GNU General Public License version 3: it SHALL carry the license's full text in a `LICENSE` file at its root, and the package manifest SHALL name the license. Every dependency the application ships SHALL have a license that GPL-3.0 allows.

#### Scenario: Finding the license
- **WHEN** a contributor opens the repository's root
- **THEN** they find the GPL-3.0 text in `LICENSE`, and the package manifest names GPL-3.0

#### Scenario: Adding a dependency
- **WHEN** a contributor adds a runtime dependency under a license GPL-3.0 does not allow
- **THEN** the change is not accepted

### Requirement: Adapted third-party code
Files adapted from another project SHALL keep that project's copyright notice, name the project and the upstream revision they come from, and say that they were changed. A notice file at the repository's root SHALL list each adapted project with its license and the folder that holds its files.

#### Scenario: An adapted dice file
- **WHEN** a contributor opens a dice mesh or collider file adapted from Owlbear Rodeo's dice roller
- **THEN** its header names Owlbear Rodeo's dice roller, its upstream revision and its license, and says that it was changed

#### Scenario: Listing what is adapted
- **WHEN** a contributor reads the notice file
- **THEN** it lists Owlbear Rodeo's dice roller, licensed GPL-3.0, and the folder that holds its adapted files

### Requirement: Checks without the owner's data
The quality check and emulator test commands SHALL pass on a clone that has none of the owner's local data files. Tests of the CSV readers and the imports SHALL use small invented files kept with the tests. Checks that need the owner's real data SHALL run when that data is present, and SHALL be skipped, not failed, when it is absent.

#### Scenario: A fresh clone
- **WHEN** a developer clones the repository, installs the dependencies and runs the quality check command without adding any data file
- **THEN** it passes

#### Scenario: On the owner's machine
- **WHEN** the owner runs the quality check command with their data files in the data folder
- **THEN** the checks of the real data run too: the card and word counts, the picture inventory and the name normalization of every real card

#### Scenario: A data change that loses a picture
- **WHEN** the owner renames a card in their CSV file so that no archive file matches it any longer, and runs the quality check command
- **THEN** the picture inventory check fails and names the card
