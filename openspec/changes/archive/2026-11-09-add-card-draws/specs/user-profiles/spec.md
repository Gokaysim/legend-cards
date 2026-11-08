# Spec Delta

## MODIFIED Requirements

### Requirement: Users change only their own name and picture
The server SHALL let a signed-in user create only their own profile, only as a player and with the server time as creation time, and update only its name and picture. It SHALL deny every other profile write from the application, including all deletes, any role change, and any write to another user's profile, even by the DM. The exceptions are a player's LP: the DM changes it under the balances rules, and a player pays 1 LP for their own draw under the card-draws rules.

#### Scenario: Claiming the DM role at creation
- **WHEN** a signed-in user tries to create their own profile with the role "dm"
- **THEN** the server denies the write

#### Scenario: Changing one's own role
- **WHEN** a player tries to change the role in their own profile
- **THEN** the server denies the write and the role does not change

#### Scenario: The DM edits another profile
- **WHEN** the DM tries to change another user's name, picture, or role from the application
- **THEN** the server denies the write

#### Scenario: Extra fields
- **WHEN** a user tries to add a field other than the name and picture to their own profile
- **THEN** the server denies the write

#### Scenario: The DM changes a player's LP
- **WHEN** the DM changes a player's LP together with the ledger entry that records it
- **THEN** the server accepts the write, and no other field of the profile changes

#### Scenario: A player pays for a draw
- **WHEN** a player draws a card and pays 1 LP, together with the draw and its ledger entry
- **THEN** the server accepts the lower LP, and no other field of the profile changes

#### Scenario: A player pays another player's LP
- **WHEN** a player lowers another player's LP for a draw
- **THEN** the server denies the write
