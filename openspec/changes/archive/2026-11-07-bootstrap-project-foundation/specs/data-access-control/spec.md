# Spec Delta

## Purpose

Decides who may read and write each piece of stored data, and enforces those decisions on the server. Access is closed by default and is opened only on purpose, one data path at a time, with tests.

## ADDED Requirements

### Requirement: Deny by default
The server SHALL deny every read and write to any stored data path that no access rule explicitly grants. This SHALL hold for both signed-in and signed-out users.

#### Scenario: Signed-in user reads an unopened path
- **WHEN** a signed-in user tries to read a document at a path that no rule grants
- **THEN** the server denies the read

#### Scenario: Signed-in user writes an unopened path
- **WHEN** a signed-in user tries to create or change a document at a path that no rule grants
- **THEN** the server denies the write and the data does not change

### Requirement: Signed-out users have no access
The server SHALL deny every read and write from a request without a signed-in user, for every data path. This holds for paths opened by later changes too.

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user tries to read any document
- **THEN** the server denies the read

#### Scenario: Signed-out write
- **WHEN** a request without a signed-in user tries to write any document
- **THEN** the server denies the write

### Requirement: Access rules are tested
Every access rule SHALL have automated tests that run against a local server emulator. The tests SHALL show both that intended access is allowed and that every other access is denied. A data path SHALL NOT be opened without such tests.

#### Scenario: Running the rule tests
- **WHEN** a developer runs the access-rule test suite
- **THEN** it runs against the local emulator, checks the deny-by-default and signed-out cases, and fails if any of them allows access
