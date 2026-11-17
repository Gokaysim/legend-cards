# Design

## Context

`AuthProvider` follows the signed-in account's own entry with `useOwnAccessEntry(email)`, which is `useDocument` on `allowedEmails/<email>`. `accessStatusOf` maps the subscription to `checking`, `member` or `noAccess`. Today an `error` maps to `noAccess` (design D4 of invite-only-sign-in). `useSnapshotSubscription` subscribes again only when the target changes, and the ref stays the same, so a single denial lasts until a reload.

Observed so far: in the emulator, after `signInWithCredential` and on most full reloads, the first read of the entry was denied with "Null value error" at the `allowedEmails` get rule. That error means the request had no usable token. After `getIdToken(true)` the same read passed. On the live project a DM whose entry exists, is linked and is verified saw the same screen. Which Firestore SDK timing sends the first listen without the token was not verified. Candidates are the credential change that the SDK applies in its own async queue, and the multi-tab manager, where the primary tab's stream carries the listens.

The rules let any account with a verified address read its own entry, whether or not the entry exists. So for a verified account a denial is never a real answer.

## Goals / Non-Goals

**Goals:**
- A failed read of the own entry never shows "ekli değil".
- The fix works whatever the exact SDK trigger is.
- A member already in the app is not thrown out by a short failure.

**Non-Goals:**
- Finding or patching the SDK timing itself.
- Retrying the other subscriptions. The data providers start only after this check succeeds, when the token is already in use.
- Changing the rules.

## Decisions

### D1. Retry in the own-entry hook, with a token refresh before each new subscription

`useOwnAccessEntry(email)` becomes `useOwnAccessCheck(email)`, which returns `{ entry, failed, retry }`:

- It keeps an attempt number. When the subscription reports `error`, it logs a warning with the error's kind and message. Then it waits, calls `auth.currentUser?.getIdToken(true)`, and raises the attempt number, which starts a new subscription. A failed refresh is logged, and the retry still runs.
- Waits: 500 ms, 1 s, 2 s and 4 s. That is five tries in about eight seconds. When the fifth try fails, `failed` becomes true, and the hook logs an error.
- An answer from the server (`ready` with `fromCache: false`) sets the count back to zero. So a later failure gets its own full set of retries.
- `entry` is the last state that was not an error: `loading` before any answer, or the last `ready` state. The provider never sees `error`. While the hook retries, a member stays `member`, a user on the "ekli değil" screen stays there, and a new sign-in stays `checking`. This gives the spec's "keep the state you had" behavior without a separate "previous status" variable.
- `retry()` sets the count and `failed` back and starts a new subscription right away, after a token refresh.
- The waits are cancelled when the email changes or the provider unmounts.

To start a new subscription to the same ref, `useDocument` gets an optional second argument, `key`. The subscription restarts when the ref or the key changes. Without a key it behaves as it does today.

*Alternative:* wait for `getIdToken()` before the first subscription. This does not guarantee that Firestore's credentials provider has applied the user yet, and the trigger is not verified. Rejected as the only fix. The refresh before each retry covers it.

*Alternative:* a general retry on `permission-denied` in `useSnapshotSubscription`. That would also hide real denials in the data providers, where an error message is right. It is out of scope (see Non-Goals).

### D2. The mapping no longer turns an error into `noAccess`

`accessStatusOf` maps `error` to `checking`. The hook does not pass errors on (D1), so this is only a safe default. `noAccess` comes only from the server saying the entry is missing, or from an account without a usable address (D3). `failed` from the hook maps to the new state `checkFailed` (D4) and takes priority over the entry's status.

### D3. An account without a verified address goes to `noAccess` without a read

`AuthProvider` keeps Firebase's `user.emailVerified` in its session. Without a verified address, it passes `null` to the hook, the same as for an account without an address. It then reports `noAccess` right away. The rules would deny that read every time, so retrying it would only delay the "ekli değil" screen. Google accounts normally have a verified address, so this branch is rare. `AuthUser` keeps its current shape.

### D4. A new `checkFailed` state and screen

- `AuthState` gets `{ status: 'checkFailed'; user }`. `AuthActions` gets `retryAccessCheck()`, which calls the hook's `retry`. The data providers subscribe only on `signedIn`, so they stop reading in this state and need no change.
- `src/features/access/AccessCheckFailedPage.tsx` follows `NoAccessPage`'s layout. It has the "✦ Legend Cards" title and the address in bold, with the line "**<adres>** için masaya erişim şu an kontrol edilemedi. Bağlantını kontrol edip tekrar dene.". The address-less form is "Masaya erişim şu an kontrol edilemedi.". The buttons are "Tekrar dene" (primary) and "Çıkış yap" (ghost).
- `RequireAuth` and `SignInPage` render it for `checkFailed`, at the URL that was asked for, the same way they render `NoAccessPage`.

## Risks / Trade-offs

- [A denial that really is permanent, for example from a future rules mistake] → It now shows "Erişim kontrol edilemedi" after about eight seconds instead of "ekli değil" at once. That message is more honest, and the console logs name the error.
- [The trigger still fires on every load] → Users see the loading state about half a second longer. That is acceptable. The warning in the console shows how often it happens.
- [A member stays in the app while the check retries after their address was removed] → A removal arrives as a `ready` answer without an entry, not as an error, so it still flips to `noAccess` at once. Only a failing check keeps the last state, for up to about eight seconds.
- [Token refresh calls] → At most five per failed check, only after failures.

## Migration Plan

No data or rules changes. The change deploys through the usual CI run after a push to `master`. To roll back, revert the commit.
