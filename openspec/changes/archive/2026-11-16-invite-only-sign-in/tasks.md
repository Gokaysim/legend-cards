# Tasks

## 1. Membership in the rules (Firestore and Storage)

- [x] 1.1 Add a shared helper in `src/test/` (design D9):
  - a member context: `authenticatedContext(uid, { email: '<uid>@example.com', email_verified: true })`
  - an outsider context: an address with no entry, and a variant with `email_verified: false`
  - a seed function that writes linked `allowedEmails` entries for a list of uids with rules disabled

  Verify that `npm run typecheck` passes.
- [x] 1.2 Switch every emulator test to member contexts, and seed entries for every uid each file signs in as:
  - `tests/firestore.rules.emulator.test.ts`: in its top-level `beforeEach`, after `clearFirestore`
  - `tests/sets.rules.emulator.test.ts`
  - `tests/storage.rules.emulator.test.ts`
  - every `src/features/*/api.emulator.test.ts`
  - `src/lib/firestore/realtime.emulator.test.tsx`

  Verify that `npm run test:emulator` still passes against the unchanged rules.
- [x] 1.3 In `firestore.rules`, rename `isSignedIn()` to `isMember()` in all of its uses and give it the D2 body: a verified `email` claim, and an `allowedEmails/$(myEmail())` entry that exists. Also:
  - add `myEmail()` and `allowedEmailPath()`
  - make `isDm()` build on `isMember()`
  - update the header comment

  Verify that `npm run test:emulator` passes, including the largest batches: the draw, the pack choice with its Cursed card and two holders, the kept use, and learning from a draft. If one goes over the 20-call limit, trim a redundant read in that path's own rule (design Risks), never the membership check.
- [x] 1.4 Add `match /allowedEmails/{email}` with the D3 rules (get, list, create, link update, delete except the DM's own), and the address-shape check with a "keep in step" comment. Verify with a new `describe('access list (allowedEmails)')` block:
  - allowed:
    - the DM lists, adds and removes entries
    - any verified account gets its own entry, including a missing one
    - a member links their own unlinked entry to their own uid
  - denied:
    - a player lists, gets another person's entry, adds or removes an entry
    - an outsider adds their own address
    - a duplicate add
    - an add with capital letters, without "@", or longer than 254 characters
    - extra keys, or an `addedAt` other than the request time
    - a link to another uid, a second link, the DM linking or changing a link
    - the DM removing their own entry
    - signed-out requests
- [x] 1.5 Add a `describe('membership')` block. Verify that each case is denied for an outsider, for an account with `email_verified: false`, and for a member whose entry was then deleted:
  - reading profiles, cards and ledger records
  - creating their own player profile
  - a paid draw

  Verify too that a token whose email differs from the entry only in letter case is let in.
- [x] 1.6 In `storage.rules`, add `isMember()` through `firestore.exists()` on `allowedEmails`, and use it in `isDm()` and `mayEditCharacter()` (design D7). Verify in `tests/storage.rules.emulator.test.ts`:
  - an outsider's character photo write is denied
  - an outsider's DM-style picture write is denied
  - public picture reads still succeed
  - the existing tests still pass

  If they show a cross-service access limit, apply the D7 fallback described under Risks, and record it in design.md.
- [x] 1.7 Update the docs:
  - `docs/conventions.md`, "Adding a new data path": every `allow` combines `isMember()`, and say what that function checks
  - `docs/domain.md`: only listed accounts sign in; the DM manages the list; add the `allowedEmails/{email}` row to the data model table

  Verify that `npm run format:check` passes.

## 2. The access feature's data layer

- [x] 2.1 Create `src/features/access/email.ts` with `normalizeEmail` (trim, lowercase) and `isValidEmail` (the D3 shape, with a "keep in step" comment pointing to `firestore.rules` and `scripts/lib/allowEmail.ts`). Verify with `email.test.ts`: spaces, capitals, no "@", two "@", no dot in the domain, "/", 254 and 255 characters.
- [x] 2.2 Create `src/features/access/schema.ts` (an `addedAt` timestamp and an optional `uid`, with the address as `id`) and its converter. Verify with `schema.test.ts`: a linked entry, an unlinked entry, and a malformed one that is rejected.
- [x] 2.3 Create `src/features/access/api.ts` with:
  - `entriesRef` and `ownEntryRef`
  - `addEmail`: `setDoc` with `serverTimestamp()`
  - `removeEmail`
  - `linkOwnEntry`: a transaction that sets `uid` only when it is missing

  Verify with `api.emulator.test.ts`:
  - the DM adds and removes
  - a duplicate add rejects
  - `linkOwnEntry` links once, and a second run writes nothing
  - a player cannot add

## 3. The auth gate and the "ekli değil" screen

- [x] 3.1 Extend `AuthState` in `src/features/auth/authContext.ts` with `checking` and `noAccess` (which carries the address). In `AuthProvider`, subscribe to the signed-in user's own entry and map it as in design D4:
  - a missing entry from the cache stays `checking`
  - an entry from the cache or the server gives `signedIn`
  - a missing entry from the server, or no email, gives `noAccess`

  Verify with `AuthProvider.test.tsx`: each mapping, a live add switches to `signedIn`, and a live removal switches to `noAccess`.
- [x] 3.2 Update `src/test/TestAuthProvider.tsx` and `src/test/renderApp.tsx` for the new states. Verify that `npm run test` passes without changes to other features' tests. Run ad-hoc vitest only with `--project unit`.
- [x] 3.3 Create `src/features/access/NoAccessPage.tsx`:
  - the application name
  - the address
  - a Turkish line: "<adres> bu masaya ekli değil. DM'den bu adresi eklemesini iste."
  - "Başka hesapla giriş yap", which calls `signInWithGoogle`
  - "Çıkış yap"

  Render it from `RequireAuth` and `SignInPage` for `noAccess`, and the spinner for `checking`. Verify with `SignInFlow.test.tsx` (spec: user-auth):
  - an unlisted sign-in shows the screen and no profile is written
  - a live add enters at the URL first asked for
  - a live removal shows the screen with no error message
  - "Başka hesapla giriş yap" with a listed account enters
  - "Çıkış yap" shows the sign-in screen
  - the loading state shows while checking
- [x] 3.4 In `AuthProvider`, run `linkOwnEntry` while the state is `signedIn` and the own entry, as the server has it, has no `uid`, logging failures (design D5). Verify with `AuthProvider.test.tsx`: an unlinked entry is linked once, a linked entry and a `noAccess` state write nothing, and an entry added again unlinked while signed in is linked again.

## 4. The DM's "Masaya erişim" section

- [x] 4.1 Create `src/features/access/AccessSection.tsx` (design D6):
  - a subscription to `entriesRef` only while it is mounted for the DM
  - rows joined to `usersContext` profiles by `uid`
  - linked rows sorted by name with the existing Turkish-aware sort, then unlinked rows by address
  - linked rows with avatar, name and address; unlinked rows with the address and "Henüz giriş yapmadı"
  - the DM's own row marked as DM and as themselves, with no "Çıkar"

  Verify with `AccessSection.test.tsx`: the order, both row kinds, the own row, and a live link that switches a row to the name.
- [x] 4.2 Add the address field and "Ekle". The input is trimmed and lowercased, and "Ekle" stays disabled until the list has loaded. Show "Geçerli bir e-posta adresi gir." and "Bu e-posta zaten listede.". Verify with tests:
  - "Cem@Gmail.com" is added as "cem@gmail.com" and the field is cleared
  - "cem.gmail.com" and "AYLA@gmail.com" (already listed) show their messages and write nothing
- [x] 4.3 Add "Çıkar" with the existing `Dialog`. The question asks whether to remove the address from the table and says that the cards and LP are not deleted. Verify with tests: confirming calls `removeEmail`, and declining writes nothing.
- [x] 4.4 Render the section in `SettingsPage.tsx` between "Masa ayarları" and "Veri / Yedek" for the DM only, and update the page's doc comment. Verify with `SettingsPage.test.tsx`: the DM sees the three sections in order, and a player sees two and no email address.

## 5. The `allow-email` script

- [x] 5.1 Create `scripts/lib/allowEmail.ts` (normalize, validate with a "keep in step" comment, and a transaction that creates the entry only when it is missing, returning `added | unchanged | invalid`). Also:
  - create `scripts/allow-email.ts` with `parseArgs` and `TARGET_OPTIONS`
  - add the Turkish texts to `scripts/lib/messages.ts`
  - add an `allow-email` npm script

  Verify with `tests/allow-email.emulator.test.ts`:
  - an address is added in lowercase
  - a rerun reports unchanged and keeps `uid` and `addedAt`
  - a malformed address changes nothing
  - a missing `--email` prints the usage
- [x] 5.2 Change the `set-role` "no profile" message to say that the address must be on the access list and the person must sign in once. Verify that `tests/set-role.emulator.test.ts` passes with the updated expectation.
- [x] 5.3 Document the scripts:
  - `README.md`: `npm run allow-email`, and the first-DM order (`allow-email`, sign in once, `set-role --role dm`)
  - `docs/conventions.md`: add `allow-email` and `allowEmail.ts` to the Scripts section

  Verify that the README command runs as written against the emulators.

## 6. Dev data and end-to-end check

- [x] 6.1 Back up `.firebase-emulator-data/` to the session scratchpad. With the emulators running, run `npm run allow-email -- --email` for `dm@example.com`, `oyuncu1@example.com` and `oyuncu2@example.com`. Verify that the Emulator UI shows the three entries.
- [x] 6.2 Check in the browser on the dev server:
  - the DM enters, and the "Masaya erişim" section lists the three accounts, which become linked after each one enters
  - a new emulator account `cem@example.com` sees the "ekli değil" screen, and enters without a reload when the DM adds it
  - removing `oyuncu2@example.com` moves that open session to the screen with no error messages
  - the section and the screen fit 360 CSS pixels wide with no horizontal scrollbar

  Afterwards, remove the throwaway `cem@example.com` entry and profile from the dev data.
- [x] 6.3 Run `npm run check` and `npm run test:emulator`, and verify that both pass.
- [x] 6.4 Stop every process on the project's ports, the dev server and the emulators with SIGINT so they export. Then verify with `lsof -nP -iTCP -sTCP:LISTEN` that no listener holds 5173, 4173, 8080, 9099, 4000, 4400, 4500, 9150, 9199 or 5002.

## Workflow follow-up

- Archive the change with `/opsx:archive` once the owner has reviewed it, and sync its specs.
