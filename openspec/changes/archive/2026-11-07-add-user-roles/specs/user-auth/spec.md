# Spec Delta

## REMOVED Requirements

### Requirement: No role distinctions yet
**Reason**: Roles now exist. Every signed-in user is a player, and an admin script can make a user the DM. DM-only controls are hidden from players.
**Migration**: The roles are defined in the `user-profiles` capability: "Player profile at first sign-in", "Users change only their own name and picture", "Role shown in the shell", and "DM-only controls". The `admin-scripts` capability defines who can change a role. Existing accounts get a player profile the next time they open the application.
