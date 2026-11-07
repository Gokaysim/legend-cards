# Proposal

## Why

Every planned feature depends on knowing who a user is and whether they are the DM:
- The card library can be edited only by the DM.
- Players open their own packs and use their own cards.
- Everyone sees everyone else's hands.

Today the app knows only that someone has signed in with Google. All users are equal (the user-auth requirement "No role distinctions yet"), and no data path is open.

This change adds the smallest piece the rest needs:
- a profile for every user who signs in, and every such user is a player
- a DM role that only an admin script can grant

It also starts the shared admin-script setup, so later data scripts (the card import is next) work the same way against the emulators and against a real project.

## What Changes

- **Player profiles.**
  - The first sign-in creates a profile for the user: display name, profile picture, role `player`, and creation time.
  - Later sign-ins keep the name and picture in step with the Google account.
  - Profiles do not store the email address.
- **Profiles are readable by every signed-in user.** This follows the owner's decision that everyone can see everyone, including other players' cards later on.
- **The DM role is changed only by a script.**
  - `scripts/set-role.ts` finds a user by email and sets the role to `dm` or `player`.
  - No user, including the DM, can change any role from the app. The server enforces this.
  - "Admin" in the owner's words and "DM" are the same role. Admins can be removed with the same script.
- **Shared admin-script setup** in `scripts/`, for this script and for later ones such as the card import:
  - The scripts run on Node 24 with `firebase-admin`.
  - They target the local emulators by default.
  - A real project is targeted only when `--project <id>` is named explicitly and the run is confirmed.
- **The role is visible in the app.**
  - The shell marks the DM with a "DM" badge.
  - A new "Oyuncular" list in the sidebar shows every signed-up user, with the DM marked.
  - A role change made by the script shows up without a reload.
  - The app gets one shared way to show or hide DM-only controls.
- **Access rules and emulator tests** for the profile path:
  - users create and update only their own profile
  - only as a player
  - only the name and picture fields
  - nobody deletes a profile
- **Docs:**
  - `docs/domain.md`: Actors and roles.
  - `docs/conventions.md`: the Authentication rules and a new Scripts section.
  - `README.md`: how to make someone the DM.
  - The design records the **target data model** that the following changes build on: card library, card holdings, pack opening with LP and the party's shared GP, and card images.
- **BREAKING (spec):** the user-auth requirement "No role distinctions yet" is removed.

Out of scope, each a later change:
- the card library and its import script
- card holdings and history
- LP, GP, and pack opening
- card images
- any DM-only screen or control (this change only provides the mechanism to show or hide them)
- player-to-player features

## Capabilities

### New Capabilities

- `user-profiles`: profiles and roles. Covers:
  - the player profile created at sign-in, kept in step with the Google account, and readable by everyone
  - the DM and player roles, and who may change them
  - how the role shows in the shell, plus the "Oyuncular" list
- `admin-scripts`: the command-line scripts that maintain data with admin rights. Covers:
  - the emulator-by-default and explicit-project safety
  - the role script

### Modified Capabilities

- `user-auth`: the requirement "No role distinctions yet" is removed. Roles now exist, defined in `user-profiles`.

## Impact

- **Code:**
  - a new `src/features/users/`: schema, converter, `api.ts`, a `UsersProvider` that makes sure the profile exists and shares the profiles, the role gate, and the Oyuncular list
  - `src/app/App.tsx`, which mounts `UsersProvider` under `AuthProvider`
  - `src/app/layout/`: the badge and the sidebar list
  - `src/lib/firestore/converter.ts`: converters can return the document ID
  - `src/test/`: a test provider for profiles
  - a new `scripts/` folder
- **Rules and tests:**
  - `firestore.rules` gets a `users/{uid}` block. The `isDm()` helper arrives with the first path that uses it, the card library.
  - `tests/` gets the rules tests, plus emulator tests for the role script
- **Dependencies:** `firebase-admin` as a dev dependency, used only by scripts and never bundled into the app.
- **Config:** `tsconfig.node.json` and ESLint include `scripts/`, and `package.json` gets a script entry.
- **Firebase usage:** one profile read per signed-in device, plus one subscription to the user list.
