# Tasks

## 1. Build ID (design D3)

- [x] 1.1 Define `__BUILD_ID__` in `vite.config.ts` (`GITHUB_SHA` cut to 7 characters, else `dev`) and declare it in `src/vite-env.d.ts`. Make sure the unit test project sees it too. Verify with `npm run check`, and with `npm run build` followed by `GITHUB_SHA=abcdef123 npm run build`, where the built bundle contains `abcdef1`

## 2. The diagnosis (design D1, D2, D5)

- [x] 2.1 Add `src/features/access/accessDiagnosis.ts` with the `AccessDiagnosis` type, `readEntryFromServer(email)` (a `getDocFromServer` that returns `exists`, `missing` or `error:<code>` and never throws), and the Turkish labels from design D4 (`diagnosisLine(diagnosis)`). Verify with a unit test of `diagnosisLine` for each reason and each server result, and of `readEntryFromServer` with a mocked `getDocFromServer` (exists, missing, permission-denied)
- [x] 2.2 In `useOwnAccessCheck`, log each subscription answer with `console.info('[access] answer', ...)`. Verify with `useOwnAccessCheck.test.ts`
- [x] 2.3 In `authContext.ts`, add the optional `diagnosis` to `noAccess`. In `AuthProvider`, build it for the three reasons, run the server read once per email for `serverMissing` (`pending` first, then the result, reset on a new email, `skipped` otherwise), and log decisions with `console.info('[access] decision', ...)` keyed on the decision. Verify with `AuthProvider.test.tsx` for each reason, a single read for repeated renders, the result showing up, and no read for `unverified`

## 3. The line on the screen (design D4)

- [x] 3.1 Render the diagnostic line on `NoAccessPage` when a diagnosis is present. Verify with `SignInFlow.test.tsx` for the spec's scenarios ("The server says the entry is missing", "An account without a verified address", "The direct read disagrees"), and that the line is absent without a diagnosis. Check the screen at 360 px in the browser against the dev server (a long address wraps, no horizontal scroll)

## 4. Integration check

- [x] 4.1 With `npm run dev`, sign in with a throwaway address that is not on the list (`signInWithCredential` on `[::1]:5173`). Confirm the line shows "abonelik: kayıt yok", the address in quotes, "sunucu: yok" and "build dev", and that the console has the `[access]` answers and decision. Clean up the throwaway Auth account and the origin's cache afterwards
- [x] 4.2 Run `npm run check` and `npm run test:emulator`. Both pass. Stop every process on the project's ports in the order CLAUDE.md gives, and confirm with `lsof -nP -iTCP -sTCP:LISTEN`

## Workflow follow-up

- Archive with `/opsx:archive` and commit (feat + docs archive). Push only when the owner asks. Then ask the DM for a screenshot of the "ekli değil" screen.
