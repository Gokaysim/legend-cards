# Design

## Context

See proposal.md for the incident. The client reaches `noAccess` in `AuthProvider` in three ways, and none of them logs anything:

1. `user.email` is missing, so `email` is `null`.
2. `user.emailVerified` is false, so `email` is `null` (design D3 of retry-own-access-check).
3. `accessStatusOf(entry)` returns `noAccess`: the subscription answered `ready`, `data: null`, `fromCache: false`.

Errors are already logged by `useOwnAccessCheck` and do not lead to `noAccess`.

## Goals / Non-Goals

**Goals:**
- One screenshot of the "ekli değil" screen tells which path was taken and what the server says when asked directly.
- The console gives the same facts with timing, for when someone can open DevTools.

**Non-Goals:**
- Fixing the cause. That waits for the diagnosis.
- Sending diagnostics anywhere. Nothing leaves the device. The line shows only the account's own address, which the screen already shows.

## Decisions

### D1. The `noAccess` state carries a diagnosis

`AuthState`'s `noAccess` gets an optional `diagnosis`. It is optional so existing tests and fakes keep working:

```ts
type AccessDiagnosis = {
  reason: 'noEmail' | 'unverified' | 'serverMissing'
  entryId: string | null                  // the exact ID looked up, or null
  serverRead: 'pending' | 'exists' | 'missing' | `error:${string}` | 'skipped'
  buildId: string
}
```

`AuthProvider` builds it when it maps to `noAccess`: `noEmail` and `unverified` for paths 1 and 2, and `serverMissing` for path 3.

### D2. One direct server read after a "missing" answer

When the reason is `serverMissing`, `AuthProvider` runs `getDocFromServer(accessEntryRef(db, email))` once for that email. The read goes through `src/features/access/accessDiagnosis.ts`, so the screen does not touch Firestore. The result goes into `serverRead`. While the read runs, the line shows "kontrol ediliyor". A new email resets it. For `noEmail` and `unverified` the read is `skipped`, because the rules would deny it.

*Changed during apply:* `readEntryFromServer` lives in `src/features/access/api.ts`, not in `accessDiagnosis.ts`. The conventions let only `api.ts` modules import `firebase/firestore`. `accessDiagnosis.ts` keeps the type and the labels.

*Alternative:* read again through the REST API with the user's token. That is more independent of the SDK, but it needs the token in app code. Rejected for now. `getDocFromServer` skips the listener and the cache, and that is the contrast we need.

### D3. Build ID

`vite.config.ts` defines `__BUILD_ID__`: `process.env.GITHUB_SHA` cut to 7 characters, or `dev`. CI's deploy job builds with `GITHUB_SHA` set by Actions. `src/vite-env.d.ts` declares it.

### D4. The line on the screen

Below the buttons on `NoAccessPage`, in `text-xs text-ink-muted font-mono break-words`. The format is "Teşhis: <sebep> · kayıt: "<entryId>" · sunucu: <sonuç> · build <id>". The Turkish labels are:

- reasons: `noEmail` → "e-posta yok", `unverified` → "e-posta doğrulanmamış", `serverMissing` → "abonelik: kayıt yok"
- server results: "kontrol ediliyor", "var", "yok", "hata (<kod>)", "yapılmadı"

The entry ID is in quotes, so a stray space or character shows up. Without a diagnosis (tests, fakes) the line is not rendered.

### D5. Console logging

`useOwnAccessCheck` logs each subscription answer with `console.info('[access] answer', { entryId, status, fromCache, hasPendingWrites, exists })`. `AuthProvider` logs each change of the access decision with `console.info('[access] decision', { status, diagnosis })`, through an effect keyed on the decision, not on every render.

## Risks / Trade-offs

- [The line looks technical to players] → It is small and muted, and only on the "ekli değil" screen, where a real problem needs it. Once the cause is fixed it can stay, or be removed in a later change.
- [An extra read on every "ekli değil" screen] → One `get` per email per page load, only on that screen.
- [The diagnosis is inconclusive] → It still splits the three paths and shows whether the server has the entry for this token. That is enough to pick the next step.

## Migration Plan

No data or rules change. It deploys with the next push to `master`. After the DM's screenshot, the fix is a separate change.
