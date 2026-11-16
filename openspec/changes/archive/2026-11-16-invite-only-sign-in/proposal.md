# Proposal

## Why

Today any Google account can sign in. At its first sign-in the app gives it a player profile, it appears in everyone's "Oyuncular" list, and it can read the whole table. The owner wants a closed table: only the email addresses the DM adds may use the app, and there is no sign-up.

## What Changes

- **An access list kept by the DM.** The list holds the Google email addresses that may use the app. The DM adds and removes addresses in a new "Masaya erişim" section on the Ayarlar screen. Players never see this section, and no player sees another player's email address. Profiles still store no email.
- **The server enforces the list on every request.** A request counts as signed in only when its account has a verified email address and that address is on the list. This holds for every Firestore path and every Storage write. Everyone else is treated like a signed-out user, with one exception: an account may read its own list entry. Matching ignores letter case.
- **No sign-up.** An account that is not on the list gets no profile, appears nowhere, and reads nothing.
  - Firebase still keeps an empty Auth record for any Google account that completes the popup. Preventing that record needs a Cloud Function (a blocking function with the Identity Platform upgrade), and the owner chose not to add one for now (see design).
- **The "ekli değil" screen.** An account that is not on the list sees a screen that names its email address and asks the person to have the DM add it. It offers "Başka hesapla giriş yap" and "Çıkış yap".
  - The screen follows the list live. When the DM adds the address, the person enters the app without a reload, and their profile is created then.
  - A player removed while the app is open moves to the same screen at once.
- **Removing an address only closes access.**
  - The player's profile, cards, LP, characters, log entries and statistics stay as they are, and the player stays in the "Oyuncular" list and in the DM's player pickers.
  - Adding the same address again restores everything, because the Google account keeps its uid.
  - The DM cannot remove their own address.
- **Who is who.** When a listed person enters for the first time, their app writes their uid into their own list entry. It can do this only once. With this link, the DM's list shows the person's name and picture next to the address, or "Henüz giriş yapmadı".
- **A new admin script, `npm run allow-email`.** It puts an address on the list, on the emulators by default or on a real project with confirmation. The first DM of a project needs it, because nobody can add the first address from the app. `set-role` does not change. The setup order is `allow-email`, then the first sign-in, then `set-role`.
- **Adding and removing addresses are not logged in the İşlem Logu.** Every user reads the log, and the addresses stay private.
- **BREAKING for existing accounts:** an account whose email address is not on the list loses access. The dev emulator data gets entries for its three accounts. No real project exists yet, so no real users need to move.

## Capabilities

### New Capabilities

- `table-access`: the access list. It covers who may read and write the list, the DM's "Masaya erişim" section, the uid link written at the first entry, and removing an address.

### Modified Capabilities

- `data-access-control`: only accounts on the list have access. An account that is not on the list is treated like a signed-out request, except for reading its own list entry.
- `user-auth`:
  - after Google sign-in, the app checks the list before it shows any screen
  - a new requirement adds the "ekli değil" screen, with its live switch both ways
- `user-profiles`:
  - a profile is created only for an account on the list
  - profiles are readable only by accounts on the list
  - the "Oyuncular" list grows when a listed person enters for the first time
- `table-settings`: the Ayarlar screen gains the DM-only "Masaya erişim" section between "Masa ayarları" and "Veri / Yedek".
- `admin-scripts`: a new script puts an email address on the access list.

## Impact

- **Firestore:**
  - `firestore.rules`: a new `allowedEmails/{email}` collection. Its document ID is the lowercase address, and a document holds `addedAt` and, after the first entry, `uid`. The DM reads, adds and deletes entries, except their own. An account reads only its own entry, and writes its own `uid` once.
  - `isSignedIn()` becomes `isMember()` in all 61 uses. It requires a verified email address that is on the list, which costs one cached document access per request.
  - The rules tests sign in with an email address and seed list entries. New tests cover the list and the denials.
- **Storage:** in `storage.rules`, `isDm()` and `mayEditCharacter()` also require list membership. The storage rules tests are updated to match.
- **App code:**
  - a new `src/features/access/` folder: schema, api, the DM's section, and the "ekli değil" screen
  - `src/features/auth/` gets two new auth states, `checking` and `noAccess`, with their routing
  - `src/features/users/` writes the uid link next to `ensureProfile`
  - `src/features/settings/SettingsPage.tsx` shows the new section
  - The ~17 data providers do not change, because they already subscribe only while the state is `signedIn`.
- **Scripts:** `scripts/allow-email.ts` and `scripts/lib/allowEmail.ts`, with Turkish messages in `scripts/lib/messages.ts`, an npm script, and emulator tests.
- **Docs:** `docs/domain.md` (who may sign in, and the new collection), `docs/conventions.md` (`isMember()` replaces `isSignedIn()` in the checklist), and the README (the first-DM setup order).
- **Dev data:** `.firebase-emulator-data/` is backed up, then gets entries for `dm@example.com`, `oyuncu1@example.com` and `oyuncu2@example.com`.
