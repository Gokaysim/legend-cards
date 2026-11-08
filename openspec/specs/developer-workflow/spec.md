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
A single documented command SHALL start the application in development mode together with local emulators for authentication and data. It SHALL use a demonstration project ID, so that no real cloud project is contacted. Emulator data SHALL survive between runs of that command.

#### Scenario: Starting development
- **WHEN** a developer runs the development command on a fresh clone after installing dependencies
- **THEN** the application opens locally, connected to the local emulators, and signing in uses the emulator's test Google accounts

#### Scenario: Data survives a restart
- **WHEN** a developer stops the development command normally and starts it again
- **THEN** the emulator data written in the earlier run is still there

### Requirement: Quality check command
A single command SHALL run type checking, linting, formatting verification, and the unit tests. It SHALL fail if any of them reports a problem. A separate command SHALL run the tests that need the local emulators, including the access-rule tests.

#### Scenario: Type error
- **WHEN** the source contains a type error and the developer runs the quality check command
- **THEN** the command exits with a failure and reports the type error

#### Scenario: Emulator tests
- **WHEN** a developer runs the emulator test command
- **THEN** the emulators are started for the run and stopped after it, and the command fails if any emulator-backed test fails

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
The repository SHALL contain a domain reference document that explains what Legend Card Manager is: a tracking tool for a DM's side card system in a D&D 5e group, not a game engine. It SHALL define the domain terms and list the game rules observed in the current legacy reference version, marking which rules are deliberate design decisions. It SHALL also record the table rules stated on the legacy rules page, and list where they disagree with the observed behavior as open questions.

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
- **WHEN** a contributor reads where Blessed cards can come from
- **THEN** the domain reference shows both the legacy application's behavior and the rules page's statement, and lists the disagreement as an open question for the DM

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

### Requirement: Initial card data in the repository
The repository SHALL keep the owner's initial data as CSV files in one data folder, with one file each for the Legend cards, the Cursed cards, and the True Words. The files SHALL keep the owner's content unchanged. A single documented command SHALL load the card files into the running local emulators.

#### Scenario: Loading the cards for development
- **WHEN** a developer starts the local development command on a fresh clone and runs the documented card import command
- **THEN** the Kart kütüphanesi and the Cursed Deck show the owner's cards

#### Scenario: Finding the data
- **WHEN** a developer looks for the owner's card data
- **THEN** they find the Legend card, Cursed card, and True Words files in the data folder, under names that say what each holds
