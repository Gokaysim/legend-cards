# Spec Delta

## ADDED Requirements

### Requirement: Adding an email address to the access list
An access script SHALL put a given email address on the access list (spec: table-access, "The access list"), in lowercase and without surrounding spaces, with the time it was added. It SHALL NOT need an account to exist for the address. It SHALL report the stored address. An address already on the list SHALL change nothing, and the script SHALL say so.

#### Scenario: Adding the first DM's address
- **WHEN** an admin runs the access script with "DM@Gmail.com" on a project whose list is empty
- **THEN** the list holds "dm@gmail.com", and the script reports "dm@gmail.com"

#### Scenario: Address already on the list
- **WHEN** an admin runs the access script with an address that is already on the list
- **THEN** nothing changes, the entry keeps its link and its adding time, and the script says the address was already on the list

#### Scenario: First DM of a new project
- **WHEN** an admin adds an address with the access script, that person signs in once, and the admin then runs the role script with that address and the role "dm"
- **THEN** that person is the DM and can add every other address from the application

### Requirement: Access script refuses malformed addresses
The access script SHALL stop without changing anything when the email address is missing or malformed. It SHALL accept the same address shapes that the access list accepts.

#### Scenario: Malformed address
- **WHEN** an admin runs the access script with "cem.gmail.com"
- **THEN** the script stops with a message that the address is not valid, and nothing changes

#### Scenario: Missing address
- **WHEN** an admin runs the access script without an address
- **THEN** the script stops with its usage message, and nothing changes

## MODIFIED Requirements

### Requirement: Role script refuses unknown users
The role script SHALL stop without changing anything when no account uses the given email address, when the account has no profile yet, or when the role is neither "dm" nor "player".

#### Scenario: Unknown email address
- **WHEN** an admin runs the role script with an email address that has no account
- **THEN** the script stops with a message that no such user exists, and nothing changes

#### Scenario: Account without a profile
- **WHEN** an admin runs the role script for an account that has never opened the application
- **THEN** the script stops with a message that the address must be on the access list and the user must sign in to the application once first, and nothing changes

#### Scenario: Invalid role
- **WHEN** an admin runs the role script with a role other than "dm" or "player"
- **THEN** the script stops with a message listing the valid roles, and nothing changes
