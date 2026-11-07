# Spec Delta

## Purpose

Provides command-line scripts that maintain Legend Card Manager data with admin rights, outside the application's access rules. The same scripts work against the local emulators and against a real project, safely, so data work is never done twice.

## ADDED Requirements

### Requirement: Emulators by default
An admin script run without naming a project SHALL act only on the local emulators of the demo project. If the emulators are not reachable, it SHALL stop with a clear message and change nothing.

#### Scenario: Running against the emulators
- **WHEN** a developer runs an admin script without a project option while the emulators are running
- **THEN** the script changes data only in the local emulators

#### Scenario: Emulators not running
- **WHEN** a developer runs an admin script without a project option while the emulators are stopped
- **THEN** the script stops with a message saying the emulators are not reachable, and no data changes anywhere

### Requirement: Real project only on explicit request
An admin script SHALL act on a real project only when that project's ID is passed explicitly. Before changing anything, it SHALL name the target project and wait for confirmation, unless the run passes an explicit flag that skips the question. Without confirmation it SHALL change nothing.

#### Scenario: Confirmed run on a real project
- **WHEN** an admin runs a script with a real project ID and confirms the named project
- **THEN** the script changes data in that project

#### Scenario: Declined confirmation
- **WHEN** an admin runs a script with a real project ID and does not confirm
- **THEN** the script stops and no data changes

### Requirement: Setting a user's role
A role script SHALL set the role of the user with a given email address to "dm" or "player". It SHALL report the user's name, the old role, and the new role. Setting the role a user already has SHALL change nothing and say so.

#### Scenario: Making someone the DM
- **WHEN** an admin runs the role script with a player's email address and the role "dm"
- **THEN** that user's profile has the role "dm", and the script reports their name, "player", and "dm"

#### Scenario: Removing the DM role
- **WHEN** an admin runs the role script with the DM's email address and the role "player"
- **THEN** that user's profile has the role "player"

#### Scenario: Role already set
- **WHEN** an admin sets a user's role to the role they already have
- **THEN** nothing changes and the script says the role was already set

### Requirement: Role script refuses unknown users
The role script SHALL stop without changing anything when no account uses the given email address, when the account has no profile yet, or when the role is neither "dm" nor "player".

#### Scenario: Unknown email address
- **WHEN** an admin runs the role script with an email address that has no account
- **THEN** the script stops with a message that no such user exists, and nothing changes

#### Scenario: Account without a profile
- **WHEN** an admin runs the role script for an account that has never opened the application
- **THEN** the script stops with a message that the user must sign in to the application once first, and nothing changes

#### Scenario: Invalid role
- **WHEN** an admin runs the role script with a role other than "dm" or "player"
- **THEN** the script stops with a message listing the valid roles, and nothing changes
