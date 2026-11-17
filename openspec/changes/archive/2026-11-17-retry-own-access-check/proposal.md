# Proposal

## Why

Members on the access list sometimes see the "ekli değil" screen right after they sign in or reload, and it stays until they reload the page. On 2026-11-17 this happened on the live project to a DM account whose entry exists, is linked to the account, and has a verified address. The owner has also hit it locally many times. Two things in the client cause it. First, the first read of the account's own entry is sometimes sent before Firestore uses the new account's token, so the server denies it. Second, `accessStatusOf` treats any failed subscription as "not on the list", and `useOwnAccessEntry` never subscribes again. A member who is wrongly told to ask the DM for access loses trust in the app, and the DM gets messages about a problem that does not exist.

## What Changes

- A failed read of the account's own access-list entry no longer means "not on the list". The app refreshes the account's token, subscribes again, and retries a few times with growing waits.
- While it retries, the user keeps the state they had before the error. Before the first answer that is the loading state. A member already in the app stays in it.
- If every retry fails, a new "Erişim kontrol edilemedi" screen appears in place of "ekli değil". It names the address and offers "Tekrar dene" and "Çıkış yap".
- The "ekli değil" screen appears only when the server says the entry does not exist, or when the account has no verified address. In the second case the app does not read at all, because the rules would deny the read every time.
- Not in scope: a general retry for the other real-time subscriptions, for example the DM's `dmRolls` denial seen once after a scripted sign-in. The data providers subscribe only after this check succeeds, so the token is already in use by then.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-auth`: "Auth state loading" also covers the retries after a failed check. Three new requirements: "When an account counts as not on the list" limits the "ekli değil" screen to an answer from the server or an account without a verified address, and "Retrying a failed access check" and "Access check failure screen" describe the retries and the "Erişim kontrol edilemedi" screen.

## Impact

- `src/features/access/accessStatus.ts`: the status mapping no longer turns an error into `noAccess`.
- `src/features/access/useOwnAccessEntry.ts`: retries, with a token refresh before each new subscription.
- `src/features/auth/AuthProvider.tsx` and `authContext.ts`: a new `checkFailed` state and a `retryAccessCheck` action. An account without a verified address goes to `noAccess` without a read.
- `src/features/auth/RequireAuth.tsx` and `SignInPage.tsx`: render the new screen for `checkFailed`.
- New screen `src/features/access/AccessCheckFailedPage.tsx`, with Turkish text.
- Unit tests for the mapping, the retry hook and the provider. No rules change, so the Firestore rules and the emulator rules tests stay as they are.
