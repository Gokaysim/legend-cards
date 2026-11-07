# Spec Delta

## Purpose

Defines how people and AI agents run, check, and change the Legend Card Manager codebase: the toolchain, local development against emulators, quality checks, environment settings, and the reference documents that describe the domain and the code conventions.

## ADDED Requirements

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
The repository SHALL contain a domain reference document that explains what Legend Card Manager is: a tracking tool for a DM's side card system in a D&D 5e group, not a game engine. It SHALL define the domain terms and list the game rules observed in the legacy application, marking which rules are deliberate design decisions.

#### Scenario: Looking up a term
- **WHEN** a contributor looks for the meaning of a domain term such as Legend Points, Set, Mechanic Pack, Rarity, Cursed card, Blessed card, Pool, Hand, Pack type, True Word, or Cardmaker
- **THEN** the domain reference defines it

#### Scenario: Checking a legacy rule
- **WHEN** a contributor wants to know when a Golden Pack can be opened in the legacy application
- **THEN** the domain reference states the rule as observed in legacy v2.1.15, and notes that it is a deliberate design decision

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
The legacy single-file application SHALL be kept unchanged in a dedicated reference folder. It SHALL be documented as a design and behavior reference, and it SHALL NOT be part of the application build.

#### Scenario: Building the application
- **WHEN** the production build runs
- **THEN** the output contains no copy of the legacy reference file
