# Tasks

## 1. A player discards their own card

- [x] 1.1 In `firestore.rules`, widen the `discarded` branch of the `userCards` update rule to `isDm() || (isHolder() && resource.data.cardKind != 'trueWord')` and update the comment above `match /userCards` (design D1). In `tests/firestore.rules.emulator.test.ts`, turn "denies a player discarding their own card" into an allow test that also checks the card's `holder` is cleared, and verify with emulator rules tests:
  - allowed: the holder discards a normal card with one copy, an extra copy, a repeatable Cursed card, and a Blessed card
  - denied: a player discards another player's card; a holder closes their True Word's holding as `discarded`, with or without changing `playerWords`; a holder's discard while a pack is open; a holder's discard with `usedOn` set or `returnedBy` naming someone else
- [x] 1.2 In `src/features/hands/HoldingDetails.tsx`, put "At" beside "Kullan" in one row for the holder and the DM. Move `discardStep` out of "DM araçları" so it replaces that row, and leave the DM tool grid with "Aktif et" (when the card has a held effect) and "Başkasına ver" (design D5). Update the component's doc comment. Verify with `HoldingDialog.test.tsx` and `HandDetailsPanel.test.tsx`:
  - the holder sees "Kullan" and "At" and no "DM araçları"
  - the holder discards after "Evet, at" and can cancel with "Vazgeç"
  - the DM sees "At" outside "DM araçları", which shows only the cost, "Aktif et" and "Başkasına ver"
  - another player sees neither "Kullan" nor "At"
  - "At" is disabled while a pack is open
- [x] 1.3 Check with `src/features/hands/api.emulator.test.ts` that `closeHolding` with `reason: 'discarded'` works for a player's own card and returns a normal card to the pool, and that a player's discard of another player's card fails with the permission message. Add the cases if they are missing
- [x] 1.4 In `src/features/activity-log/eventText.ts`, leave out "<holder>'nın elinden " when the event's actor is the holder (design D6). Verify with `eventText.test.ts`: the DM's discard reads "Ayla'nın elinden Aboleth's Eyes kartını attı.", and Ayla's own discard reads "Aboleth's Eyes kartını attı."
- [x] 1.5 Update `docs/domain.md`:
  - the `userCards` row of the data table: the holder discards their own cards, not True Words
  - the hand-screen note that calls "At" DM-only
  - a new entry under "Deliberate decisions": players are trusted to discard their own cards, Cursed included, and to lower their own LP. The log shows it, and the DM fixes mistakes

  Verify by reading the changed passages against the card-holdings delta spec

## 2. A player lowers their own LP

- [x] 2.1 In `firestore.rules`, turn `manualByDm()` into `manualChange()`, which allows the DM's change or the player's own LP spend with `delta < 0`. Change the profile rule to `lpSetByEntry('manual') && (isDm() || (isSelf(uid) && request.resource.data.lp < resource.data.get('lp', 0)))` (design D2). Update the comments above `match /users`, `match /ledger` and `lpSetByEntry`. Verify with emulator rules tests in the balances block:
  - allowed: Ayla lowers her own LP by 1 and down to exactly 0, with a reason
  - denied:
    - Ayla raises her own LP
    - she lowers Bora's LP
    - she lowers the purse
    - she writes no reason or a blank one
    - she writes an entry with a `drawId`
    - she writes an entry whose `by` is another user
    - she goes below 0
    - she writes the entry alone or the LP alone
    - she spends while a pack is open
  - change the existing "denies a player changing their own LP or the purse" test to cover only raising and the purse
- [x] 2.2 Check with `src/features/balances/api.emulator.test.ts` that `changeBalance` lowers a player's own LP when called as that player with a negative `delta`, refuses a raise and another player's LP with `permission-denied`, and reports `table-busy` while a pack is open. Add the cases
- [x] 2.3 Add the spend variant to `src/features/balances/BalanceDialog.tsx` (design D4):
  - the title "Legend Point harca", and the amount starting at 1
  - the "d20 avantajı" chip, which sets the reason and the amount 1
  - "Sonra: <n> LP" while the amount is valid, and only "− Düş"

  Verify with `BalanceDialog.test.tsx`:
  - the opening state, with "Şu an: 5 LP", amount 1, "Sonra: 4 LP" and "− Düş" disabled until a reason is entered
  - the chip resets the amount from 3 to 1
  - a spend calls `changeBalance` with `delta: -1` and the player's own account, then closes
  - an amount above the LP shows "Ayla'nın 1 LP'si var; 2 LP düşülemez."
  - the offline message
  - no "+ Ekle"
- [x] 2.4 In `src/features/hands/HandSummary.tsx`, show "− LP" on the "Legend Point" tile when the signed-in user is the hand's player. Disable it at 0 LP and while a pack is open, with the existing note, and have it open the spend variant. Verify with `HandsPage.test.tsx` (or the hand summary's tests):
  - Ayla's own hand shows "− LP" and no "± LP"
  - Bora on Ayla's hand sees neither
  - "− LP" is disabled at 0 LP and while a pack is open
  - the DM still sees "± LP"
- [x] 2.5 Check in `eventText.test.ts` (or `events.test.ts`) that a `manual` entry made by Ayla on her own LP shows Ayla as the actor, not marked as DM, with "Ayla: −1 LP (5 → 4)" and the reason "d20 avantajı". No code change is expected (design D6)
- [x] 2.6 Update `docs/domain.md`:
  - the `users` and `ledger` rows of the data table: a player lowers their own `lp` by hand, with a reason and a `manual` entry
  - the observed-rules LP bullet ("LP changes only through the DM's manual plus and minus actions")
  - the "LP is only changed by hand" deliberate decision

  Verify by reading the changed passages against the balances delta spec

## 3. Integration

- [x] 3.1 Run `npm run check` and `npm run test:emulator` (after `. ~/.nvm/nvm.sh && nvm use`). Verify both pass
- [x] 3.2 In the running app against the emulators, as "Oyuncu 1" in Chrome:
  - discard a card from your own hand and confirm the DM's window shows it gone and logged as "… kartını attı."
  - spend 1 LP with "d20 avantajı" and confirm the LP and the log row on the DM's window
  - check that another player's hand shows no "At", "Kullan" or "− LP"
  - check that the card details at 360 CSS pixels show "Kullan" and "At" in one row with no horizontal scroll
- [x] 3.3 Stop the dev server and the emulators as `CLAUDE.md` describes, with SIGINT to the process group and waiting for the export. Verify with `lsof -nP -iTCP -sTCP:LISTEN` that no project port is still held

## Workflow follow-up

- Archive the change with `/opsx:archive` after the owner reviews the result, and sync the delta specs into `openspec/specs/`.
