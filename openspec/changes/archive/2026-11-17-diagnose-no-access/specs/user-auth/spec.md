# Spec Delta

## ADDED Requirements

### Requirement: Diagnosing the "ekli değil" decision
The "ekli değil" screen SHALL show a small diagnostic line under its actions. The line SHALL give the reason the app treats the account as not on the list, the exact entry ID it looked up, the result of one direct server read of that entry, and the build ID. The application SHALL log every answer about the account's own entry, and every access decision, to the browser console.

#### Scenario: The server says the entry is missing
- **WHEN** Cem signs in with "cem@gmail.com", and the server answers that there is no entry
- **THEN** the "ekli değil" screen's diagnostic line names the server's answer as the reason, shows "cem@gmail.com" as the ID it looked up, shows the result of the direct server read, and shows the build ID

#### Scenario: An account without a verified address
- **WHEN** a user signs in with a Google account whose address is not verified
- **THEN** the diagnostic line names the unverified address as the reason, and no direct server read is made

#### Scenario: The direct read disagrees
- **WHEN** the subscription says there is no entry, but the direct server read finds the entry
- **THEN** the diagnostic line shows both results, so the difference is visible in a screenshot

#### Scenario: Decisions in the console
- **WHEN** a user signs in, and the application checks the list and decides
- **THEN** the console shows each answer about the entry (where it came from and whether the entry exists) and the decision, without any error message
