# Tasks

## 1. Restart a document subscription on demand (design D1)

- [x] 1.1 Give `useDocument` in `src/lib/firestore/useDocument.ts` an optional `key` argument. The subscription restarts when the ref or the key changes, and without a key it behaves as before. Verify with a `subscription.test.ts` case or a new `useDocument` test: the same ref with a new key unsubscribes once and subscribes again, and the same ref with the same key does not. Run `npm run check`

## 2. The retrying own-entry check (design D1, D2)

- [x] 2.1 Replace `useOwnAccessEntry` with `useOwnAccessCheck(email)` in `src/features/access/`. It returns `{ entry, failed, retry }`. On `error` it logs a warning. It then waits 500 ms, 1 s, 2 s and 4 s before the second to fifth tries, calls `getIdToken(true)` on the current user before each one (logging a failed refresh and retrying anyway), and starts a new subscription through the `key`. `failed` becomes true and an error is logged when the fifth try fails. A server answer sets the count back to zero. `entry` is the last state that was not an error. `retry()` sets `failed` and the count back and starts a new subscription after a refresh. Waits are cancelled when the email changes or on unmount. Verify with a new `useOwnAccessCheck.test.ts` using fake timers and mocked `useDocument` and `auth`: an error and then a server entry gives `member` with no `failed`, five errors give `failed` after about 7.5 s, a refresh happens before each new subscription, a member's last `ready` state is kept during retries, `retry()` starts again, and an email change cancels a pending wait
- [x] 2.2 In `accessStatus.ts`, map `error` to `checking` and update the comment from design D4 of invite-only-sign-in. Verify with `accessStatus.test.ts`, where the "or the read fails" case now expects `checking`

## 3. The `checkFailed` state and screen (design D3, D4)

- [x] 3.1 In `authContext.ts`, add `{ status: 'checkFailed'; user }` to `AuthState` and `retryAccessCheck()` to `AuthActions`. In `AuthProvider.tsx`, keep `emailVerified` in the session and pass `null` to the hook without a verified address. Map the hook's `failed` to `checkFailed`, and wire `retryAccessCheck` to the hook's `retry`. Update `AuthProvider.test.tsx`, mocking `useOwnAccessCheck`: `failed` gives `checkFailed`; `retryAccessCheck` calls `retry`; an unverified account is `noAccess` with no entry followed; the link still runs only on `signedIn`. Verify with `npm run check`
- [x] 3.2 Add `src/features/access/AccessCheckFailedPage.tsx` with the text and buttons from design D4, and render it for `checkFailed` in `RequireAuth.tsx` and `SignInPage.tsx`. Add tests to `SignInFlow.test.tsx` for the spec's "Every try fails", "Trying again" and "Signing out from the failure screen" scenarios, and check that a failed check never shows "ekli değil". Verify with `npm run check`
- [x] 3.3 Check the screen in the browser against the dev server at 360 px and at desktop width, in light and dark themes, by forcing `checkFailed` (for example with a test-only override or a stub entry). Make sure the page has no horizontal scroll, and the long address wraps

## 4. Integration check against the emulators

- [x] 4.1 With `npm run dev`, sign in as `dm@example.com` with `signInWithCredential` on `localhost:5173` and do several full page loads. That is where the false "ekli değil" showed up before. Confirm the DM enters each time without a manual reload, and that a retry warning in the console shows up when the first read is denied. Also check that `oyuncu1@example.com` removed from the list sees "ekli değil" at once, and sees the app again without a reload when added back
- [x] 4.2 Run `npm run check` and `npm run test:emulator`. Both pass. Stop every process on the project's ports in the order CLAUDE.md gives, and confirm with `lsof -nP -iTCP -sTCP:LISTEN`

## Workflow follow-up

- Archive the change with `/opsx:archive` and commit (feat + docs archive). Push only when the owner asks. The push deploys the fix to the live project.
