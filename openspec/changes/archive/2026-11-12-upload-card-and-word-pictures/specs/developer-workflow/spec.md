# Spec Delta

## MODIFIED Requirements

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
