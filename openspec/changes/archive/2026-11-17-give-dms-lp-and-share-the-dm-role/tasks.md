# Tasks

## 1. LP for every user (rules)

- [x] 1.1 In `firestore.rules`, drop `resource.data.role == 'player'` from `lpSetByEntry()` and `get(profile).data.role == 'player'` from the ledger's `setsLp()` (design D1). Update the comments above `users/{uid}`, `lpSetByEntry`, `setsLp` and the ledger match that say "a player's LP". Verify in `tests/firestore.rules.emulator.test.ts`:
  - the DM changes their own LP by hand, up and down, with a `manual` entry
  - a DM changes another DM's LP
  - a player's write to a DM's LP by hand is denied
  - a DM's use of a card in their own hand pays from their LP, for any amount from 0 to that LP
  - a DM's pack into their own hand is paid from their LP
  - a DM's draft for themselves is paid from their LP
  - a DM's draw into their own hand stays free
  - the old "DM's LP is denied" test is turned around
  - `npm run test:emulator` passes

## 2. LP for every user (app)

- [x] 2.1 In `src/features/balances/api.ts`, remove the `not-a-player` refusal and its error text if unused elsewhere. In `hands/api.ts`, `HandSummary`, `HoldingDetails`, `PackConfirmDialog`, `DraftConfirmDialog` and `TrueWordDetails`, replace the `role === 'player'` checks with "has a profile", so a DM's hand shows LP and its payments use the owner's LP (specs: balances, card-holdings, pack-shop, true-words). Verify with tests:
  - in `balances/api.emulator.test.ts`, the DM adds LP to their own LP
  - a `HandSummary` test (new or existing) shows "Legend Point" with "± LP" on the DM's own hand, and no LP control for a player on the DM's hand
  - in `UsePayment.test.tsx` or `HoldingDetails`' test, the DM's own card asks for an amount up to the DM's LP
  - a `PackConfirmDialog` test offers LP for the DM's own hand
- [x] 2.2 In `src/features/users/PlayerList.tsx`, show LP on every entry, DMs included, and keep the DM mark on every DM. Verify in `PlayerList.test.tsx`: two DMs are both marked, and a DM with 2 LP shows "2 LP".
- [x] 2.3 Update `docs/domain.md`: the `users` row (LP for every user, role changed by a DM with a record or by the admin script), the `userCards`, `ledger`, `draws` and `uses` rows where they say "player's LP" or "nothing in the DM's own hand", and the LP and DM glossary lines. Verify by reading the changed rows against the balances and dm-roles specs.

## 3. Role changes (rules)

- [x] 3.1 In `firestore.rules`, add `roleChangePath()`, the `roleChanges/{changeId}` match, and a `users` update branch `onlyChanges(['role', 'roleChangeId']) && setsRole()` (design D2, D3). Put the role branch's `onlyChanges` test first in its branch. Update the `users` comment that says roles change only through the admin script. Verify in a new `describe` block in `tests/firestore.rules.emulator.test.ts`:
  - a DM grants the role with its record, and takes it from another DM with its record
  - a DM steps down naming another current DM
  - a player's role write is denied, with or without a record
  - a write without its record, or a record without its write, is denied
  - a write that also changes `lp` or `displayName` is denied
  - the role "admin" is denied
  - stepping down while naming a player, naming yourself, or without `otherDm` is denied
  - a record's `before` that does not match, or `by` that is not the requester, is denied
  - reads from a member succeed, and reads from signed-out and unlisted accounts are denied
  - every update or delete of a record is denied
  - a role change while a pack is open succeeds
  - `npm run test:emulator` passes, the heaviest `users` branch included (1000-expression limit)
- [x] 3.2 Change the `allowedEmails` delete rule so no DM's address can be removed (design D5). Verify in the rules tests: deleting another DM's linked entry is denied, deleting it after taking their role is allowed, and deleting a player's or an unlinked entry still works.

## 4. Role changes (app)

- [x] 4.1 In `src/features/users/schema.ts`, accept `roleChangeId` on a profile. Add the role change record schema and `changeRole(db, { target, after, otherDm? })` in `src/features/users/api.ts`. It writes the profile and the record in one batch and fails offline with the existing connection error. Verify with `schema.test.ts` and `users/api.emulator.test.ts`: grant, take and step down succeed against the emulator, and an offline call changes nothing.
- [x] 4.2 In `src/features/access/accessRows.ts`, add each row's role control (`grant`, `take`, `stepDown` or none) from the live profiles and the signed-in uid (design D4). Verify in `accessRows.test.ts`:
  - a linked player gets `grant`
  - another DM gets `take`
  - one's own row gets `stepDown` only when another DM exists
  - an unlinked row gets none
  - DM rows are not removable
- [x] 4.3 In `src/features/access/AccessSection.tsx`, render the "DM" mark on every DM row, "sen" on one's own, the role buttons ("DM yap", "DM'liği al", "DM'likten çık") with the Turkish confirm dialogs from the dm-roles spec, and the offline message. Hide "Çıkar" on DM rows. Verify in `AccessSection.test.tsx` that each button opens its dialog, confirming calls `changeRole` with the right target, declining changes nothing, and offline shows the connection message. Check the section at 360 px in the browser.
- [x] 4.4 Make DM-gated providers handle losing the role (design D7). For `AccessProvider`, `CardsProvider`, `DiceProvider`, `CombatProvider`, `PlayerNotesProvider` and `ActivityLogProvider`, a `permission-denied` from a DM-only listener while the profile is switching shows no error, and the player view follows. Verify with a provider test that flips the profile role while the DM-only listener errors, and in the browser by taking a DM's role while they have the Ayarlar screen open on another account.
- [x] 4.5 In `src/features/stats/statsNames.ts`, name every user by their profile name, DMs included (design D6). Verify by updating the `statsNames`/`CardHistoryPage` tests that expect "DM".

## 5. Role changes in the İşlem Logu

- [x] 5.1 Add `accusative()` to `src/lib/turkish.ts` beside `genitive`, `dative` and `ablative`. Verify in `turkish.test.ts`: "Ayla" → "Ayla'yı", "Gökay" → "Gökay'ı", "Bora" → "Bora'yı", "Cem" → "Cem'i", "Ömür" → "Ömür'ü", and the same vowel-harmony cases as the other suffixes.
- [x] 5.2 In `src/features/activity-log`, read `roleChanges` as a new source and map each record to one role event. In `eventText.ts`, the event reads "<name>'ı DM yaptı.", "<name>'ın DM'liğini aldı." or "DM'likten çıktı." The player filter matches the record's target. Verify in `events.test.ts`, `eventText.test.ts` and `ActivityLogPage.test.tsx`: the three sentences, ordering among other events, and the filter for Ayla listing her role change but not Bora's.

## 6. Integration

- [x] 6.1 Run `npm run check` and `npm run test:emulator`. Both pass.
- [x] 6.2 In the browser against the emulators, with the DM and Oyuncu 1 accounts: the DM gives themselves 3 LP and sees it on their hand and in "Oyuncular"; the DM makes Oyuncu 1 a DM, and Oyuncu 1's shell switches live; Oyuncu 1 takes the role back or the DM steps down; each step shows in the İşlem Logu; a DM row shows no "Çıkar". Stop the dev server and the emulators afterwards as `CLAUDE.md` describes.

## Workflow follow-up

- At archive, update the Purpose of `openspec/specs/user-profiles/spec.md`, which says only an admin script can make someone the DM.
- Tick "DM in kendine legen point verebilmesi lazim" and "Ayarlardan DMligi baskasina atama/alma olsun" in `TODOS.md` once the change is done.
