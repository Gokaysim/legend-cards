# Design

## Context

See proposal.md for the motivation. The current state that shapes the approach:

- **Sign-in.** Sign-in is Google-only through Firebase Auth (`src/features/auth/AuthProvider.tsx`). `AuthState` is `loading | signedOut | signedIn`.
- **Providers.** About 17 data providers under `App.tsx` subscribe to Firestore only while the state is `signedIn`. `UsersProvider` runs `ensureProfile` once per uid per app start.
- **Firestore rules.** `firestore.rules` gates every opened path with `isSignedIn()` (`request.auth != null`, 61 uses). `isDm()` already reads the caller's profile.
- **Access-call limit.** Rules may make at most 10 document accesses per single-document request and 20 per batch or transaction. Repeated reads of the same document in one request count once. The draw request is already close to the limit (design of `player-draw-modes`).
- **Storage rules.** `storage.rules` gates writes with `isDm()` and `mayEditCharacter()`, which read Firestore across services and each start with `request.auth != null`.
- **Profiles.** Profiles store no email (spec: user-profiles), and every member reads every profile, so email addresses must live somewhere else.
- **Dev accounts.** The Auth emulator's three dev accounts are Google accounts with `emailVerified: true`. No real project is configured (`.firebaserc` names only `demo-legend-cards`).

## Goals / Non-Goals

**Goals:**

- One place in the rules decides membership, and every opened path and every Storage write goes through it.
- No provider or feature screen changes. The gate sits in the auth state.
- Adding or removing an address takes effect live, both ways, without a reload.

**Non-Goals:**

- Preventing the empty Auth record that Firebase creates for any account that completes the Google popup (see D1).
- Hiding removed players from lists, or any "left the group" marker.
- Changing roles from the app. `set-role` stays the only way.
- Re-checking already-open listeners on the server after a removal (see Risks).

## Decisions

### D1. The gate lives in the security rules, not in a Cloud Function

Membership is checked by the Firestore and Storage rules on every request. A stranger can finish the Google popup, but reads and writes nothing.

*Alternatives:*

- **A `beforeUserCreated` blocking function.** It would also stop the empty Auth record. It needs a functions codebase, the Identity Platform upgrade, the functions emulator, and a deploy pipeline for functions, and the project has none of these today. The owner chose to defer it. It can be added later on top of this design, because the rules gate stays needed either way: a blocking function does not cut off an account that already exists.
- **Custom claims (`member: true`).** Claims would cost no document access. But setting them needs the Admin SDK, so the DM could not add people from the app without a function. Rejected.

### D2. One list, `allowedEmails/{email}`, checked on every request

- **Document shape.**
  - The document ID is the address, trimmed and lowercased.
  - A document holds `addedAt`, the server time.
  - After the person's first entry, it also holds `uid` (D5).
- **Rules functions.**
  - `myEmail()` returns `request.auth.token.email.lower()`.
  - `isMember()` requires a signed-in request whose token has `email_verified == true` and a string `email`, and whose `allowedEmails/$(myEmail())` exists.
- **Renaming `isSignedIn()`.** `isSignedIn()` is renamed to `isMember()` in all 61 uses, instead of keeping the old name with a new body. The name must say what the function checks, and `docs/conventions.md` asks every rule to use it. The rename is mechanical.
- **`isDm()`.** It becomes `isMember() && <role check>`.

*Why every request:* removing an address takes effect on the next request, with one source of truth. This costs one `exists()` per request, cached within the request, so +1 access call per request and per operation.

*Alternative:* membership on the profile. The list would gate only profile creation, and `isMember()` would read the profile, which `isDm()` already reads, so the check would be almost free. Removing an address would then not cut access. That would need a second "removed" flag on the profile, which would give two truths that can disagree. Rejected in explore.

### D3. Rules of the list itself

- **get:** the DM, or a signed-in request with a verified email whose `emailId == myEmail()`. The second case does not require membership: the "ekli değil" screen reads a missing entry.
- **list:** the DM only.
- **create:** the DM only.
  - The ID must be a valid lowercase address (below).
  - The keys must be exactly `addedAt`, equal to `request.time`.
  - A create on an existing ID is an update to the rules, so a duplicate add is denied.
- **update:** only the link, and nothing else is ever updated, the DM included.
  - The caller must be a member with `emailId == myEmail()`.
  - The entry must have no `uid` yet.
  - The only changed key must be `uid`, set to `request.auth.uid`.
- **delete:** the DM, and only when `emailId != myEmail()`.
- **Address shape:** at most 254 characters, no capital letters, spaces or `/`, exactly one `@`, and a dot in the part after it. The same check exists in three places, each with a "keep in step" comment:
  - the rules
  - `src/features/access/email.ts`
  - `scripts/lib/allowEmail.ts`

  Scripts cannot import app code.

### D4. The client gate is two new auth states

- **Mapping.** `AuthState` becomes `loading | signedOut | checking | noAccess | signedIn`. While Firebase Auth reports a user, `AuthProvider` subscribes to that user's own list entry (`useDocument` on a ref from `src/features/access/api.ts`) and maps the result:
  - no answer yet, or a missing entry that comes only from the cache: `checking`
  - an entry exists, from the server or the cache: `signedIn`
  - the server says the entry is missing, or the account has no email: `noAccess`, carrying the address
- **Cache handling.** A missing entry from the cache waits for the server, so a fresh offline device does not show "ekli değil" by mistake. A cached entry lets a member open the app offline, as today.
- **Live changes.** The subscription stays open while signed in. A removal flips `signedIn` to `noAccess`, and an add flips it back. The data providers subscribe only on `signedIn`, so they drop their listeners at once and show no permission errors. They need no change.
- **Routing.** `RequireAuth` and `SignInPage` render the spinner for `checking` and `NoAccessPage` for `noAccess`. The URL does not change, so entering later lands on the screen the user asked for.
- **Switching accounts.** "Başka hesapla giriş yap" calls the existing `signInWithGoogle()`, which forces the account chooser. If it succeeds, the user changes and the check runs again. If it is cancelled, the screen stays.

### D5. The uid link is written by `AuthProvider`, whenever the own entry is unlinked

`AuthProvider` already follows the user's own entry (D4). While the state is `signedIn` and the entry, as the server has it, has no `uid`, it runs `linkOwnEntry(db, user)` in a transaction:

1. Read the user's own entry.
2. If the entry has no `uid`, set it to the user's uid.

Any failure is logged; the next unlinked state, or the next start, tries again. The DM section joins entries to profiles through `uid`.

*Changed during apply:* the first plan ran the link next to `ensureProfile` in `UsersProvider`, once per uid per app start. A player whom the DM removes and adds again while the app is open enters again without a reload, and the spec asks that entry to be linked too (spec: table-access, "Linking an entry to its account"). Only the component that follows the entry sees that moment.

*Alternative:* the DM's client looks up uids. The client SDK cannot map an email to a uid, and the Admin SDK is not available in the app. Rejected.

### D6. The DM's "Masaya erişim" section

`src/features/access/AccessSection.tsx` is rendered by `SettingsPage` between the two existing sections, only when `useIsDm()` is true.

- **The list.** `AccessProvider`, mounted under `UsersProvider` in `App.tsx`, subscribes to `allowedEmails` with `useCollection` only while `useIsDm()` is true, so players never send the query. It gives the entries and the writes through `useAccessList()`, and `TestAccessProvider` fakes them in tests. The section joins rows to `usersContext` profiles by `uid` (`accessRows()`). Rows with a profile are sorted by name with Turkish collation, and the others by address.
  - *Changed during apply:* the first plan subscribed from the section itself, only while it was mounted. A hook that imports the app's Firestore made every screen test that imports the Ayarlar screen start Firebase. The project keeps Firebase in providers, and screens and tests read contexts. So the DM's device now follows the small list while the app is open.
- **Adding.** The DM types an address. The section trims it, lowercases it and checks its shape, then checks for a duplicate against the loaded list. "Ekle" stays disabled until the list has loaded, then `setDoc(..., { addedAt: serverTimestamp() })` runs. The field clears at once, and the row shows from the local cache. If the server denies the write, for example because of a duplicate (D3), the local write rolls back and the section says so.
- **Removing.** "Çıkar" opens the existing `Dialog` with the Turkish question, then `deleteDoc` runs. A denial is reported the same way as for adding. The DM's own row, the one matching their lowercased address, has no "Çıkar".
- **Logging.** Nothing is logged (spec: table-access).

### D7. Storage rules use the same membership

`storage.rules` gets its own `isMember()`, built from `firestore.exists()` on `allowedEmails` with the same token checks. `isDm()` and `mayEditCharacter()` call it in place of `request.auth != null`. Picture reads stay public.

### D8. The `allow-email` script

- **Files.** `scripts/allow-email.ts` holds the command. `scripts/lib/allowEmail.ts` holds the logic, which returns `added | unchanged | invalid`, and the command turns the result into a message and an exit code. The Turkish text lives in `scripts/lib/messages.ts`.
- **Writing.** The logic runs a transaction that creates the entry only if it is missing. It never touches an existing entry's `uid` or `addedAt`.
- **Options.** It uses `TARGET_OPTIONS`, so it runs on the emulators by default and on a real project only with confirmation.
- **`set-role`.** Its "no profile" message also says that the address must be on the list first.

### D9. One test helper for members

- **Helper.** A shared helper in `src/test/` builds a member context: `authenticatedContext(uid, { email: '<uid>@example.com', email_verified: true })`. It also seeds entries for a set of uids with rules disabled.
- **Who uses it.** `tests/*.rules.emulator.test.ts` and the `src/features/*/api.emulator.test.ts` files switch to it. The rules test file's top-level `beforeEach`, which clears Firestore, seeds the entries for every uid the file signs in as.
- **Outsiders.** Tests that need an outsider use a context for `cem@example.com` with no entry, or one with `email_verified: false`.

## Risks / Trade-offs

- **[+1 access call per request]** Batches near the 20-call limit could fail, the draw and the pack choice with its Cursed card above all. → The existing emulator tests of the largest batches run after the rename, and they fail if the limit is passed. If one does, that path's own rule drops a redundant read. The `exists()` itself stays.
- **[1000 expressions per request]** This limit bit during apply, not the access-call limit. `isMember()` runs dozens of times in the largest batches, and 41 use and kept-use tests went over. Three changes fixed it:
  - `isMember()` keeps the shortest body: the verified claim, then `exists()` on an inline path. It has no null checks, because an error denies like false and no rule negates it.
  - `isSelf()` compares the uid before it checks membership.
  - `lpSetByEntry()` checks the ledger entry's source first, so the update rule's branches that do not apply stop early.

  As a margin check, the 742 rules tests still passed when every `isMember()` call was made about 10 expressions heavier.
- **[Storage's cross-service calls]** The character photo rule already reads two Firestore documents, and membership adds a third. If the Storage emulator tests show that this goes over a limit, the fallbacks are:
  - picture writes keep `isDm()` without a separate member check, since the DM cannot remove their own entry
  - a removed player's photo write could then store an orphan file, but could not attach it, because Firestore denies the character update

  Checked during apply: the Storage emulator tests pass with the third read, so the fallback was not needed.
- **[Listeners already open]** The design does not rely on Firestore re-checking the rules of a listener that is already open when an address is removed. The app drops its own listeners (D4), and every new request and write is denied. A modified client could keep reading through an open listener until it reconnects, which is acceptable for a table of friends.
- **[Empty Auth records]** A stranger who completes the popup leaves an Auth record with no data. → It is visible only in the Firebase console. Adding D1's blocking function later removes it.
- **[Address changes]** A player who changes their Google account's primary address gets a new address in the token and loses access. → The DM adds the new address. The uid, and with it all the player's data, stays the same.
- **[Dev data]** Without list entries, the three dev accounts lose access after the rules change. → Migration step below.

## Migration Plan

1. Back up `.firebase-emulator-data/` to the session scratchpad.
2. With the emulators running, run `npm run allow-email -- --email <address>` for `dm@example.com`, `oyuncu1@example.com` and `oyuncu2@example.com`. Each of them links their entry on their next entry into the app.
3. Stop the emulators with SIGINT, so they export the data.
4. For a future real project, the README describes this order: `allow-email` for the first DM, then that person signs in once, then `set-role --role dm`. After that, the DM adds everyone else from the app.

Rollback: revert the rules and the client. The list documents are inert without the rules that read them.
