# Proposal

## Why

On the live project the DM account `morgandilek@gmail.com` still sees "ekli değil" after `retry-own-access-check` went live. It happens on every reload and after clearing the site data, and the console shows no warning. In a private window the DM gets in, so something in the browser profile takes part, for example another open tab of the app, which shares the Firestore cache, or an extension. That is not verified. A read-only Admin SDK check shows the entry exists, is linked to that account, and the address is verified. Only three Auth accounts exist, and all three are on the list. So the client decides "not on the list" through a path that logs nothing. That leaves two possible paths. Either the browser sees the account as having no verified address, or the listener reports from the server that the entry is missing. We cannot tell which one from here, and the DM will not open DevTools. The app has to report on screen what it decided and why.

## What Changes

- The "ekli değil" screen gets a small diagnostic line. It shows the reason for the decision, the exact entry ID the app looked up, a one-time direct server read of that entry ("var", "yok" or the error code), and the build ID. The DM sends a screenshot, and that is enough to locate the cause.
- The app logs every answer of the own-entry subscription and every access decision with `console.info`, with the same details.
- The build ID is the short commit hash in CI builds and `dev` locally. It is injected at build time next to the existing version.
- Not in scope: fixing the cause itself. That gets its own change once the diagnostic shows what is wrong.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-auth`: a new requirement, "Diagnosing the 'ekli değil' decision", for the diagnostic line on the "ekli değil" screen and the console log of access decisions.

## Impact

- `vite.config.ts`, `src/vite-env.d.ts`: a `__BUILD_ID__` constant.
- `src/features/auth/authContext.ts`, `AuthProvider.tsx`: the `noAccess` state carries a diagnosis. There is a one-time server read after a "missing" answer, and the decisions are logged.
- `src/features/access/useOwnAccessCheck.ts`: logs each answer.
- `src/features/access/accessDiagnosis.ts` (new): the diagnosis type, the cross-check read, and the Turkish labels.
- `src/features/access/NoAccessPage.tsx`: renders the line.
- Unit tests for each of these. No rules or data changes. The server read is the `get` the rules already allow on one's own entry.
