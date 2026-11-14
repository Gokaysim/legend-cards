# Tasks

## 1. The price rule and the data shapes

- [x] 1.1 Add `priceOfUse(cost)` next to `numericCost` in `src/features/cards/display.ts`, returning `fixed` with an amount, `die` or `chosen` (design D3). Verify with `display.test.ts` (or a new `priceOfUse.test.ts`) cases from one shared table: `null`, `""`, `"0"`, `"2"`, `" 3 "`, `"6"`, `"d6"`, `"D6"`, `"X"`, `"X+1"`, `"-1"` and `"1,5"`
- [x] 1.2 Add `useCost` (a whole number ≥ 0) and `useEntryId` (an ID) to `holdingSchema` in `src/features/hands/schema.ts`, both nullable and defaulting to `null`. Add the refinement that only a holding closed as used carries them, and that a `useEntryId` comes only with a `useCost` above 0 (design D1). Verify with `schema.test.ts`: an old used holding without the fields, a paid use, a free use, and the invalid combinations
- [x] 1.3 Add `use` and `wordUse` to `LEDGER_SOURCES` in `src/features/balances/schema.ts`, with the check that both are in LP and have no reason. Verify with `schema.test.ts`
- [x] 1.4 Declare the word use schema and converter (`wordUseSchema`, `WORD_USES_COLLECTION = 'wordUses'`, `wordUsesRef`) in `src/features/true-words/` (design D2). Verify with `schema.test.ts`: a paid use, a free use, and a use whose `entryId` disagrees with its cost
- [x] 1.5 Verify `npm run typecheck` and the unit tests pass after updating the fixtures that build holdings and ledger entries

## 2. Firestore rules and indexes

- [x] 2.1 Add `priceAllows(cost, amount)` to `firestore.rules`, mirroring `priceOfUse` (design D3), and replace `closesAs('used')` with `closesAsUsed()` (design D5). Verify with emulator rules tests in `tests/firestore.rules.emulator.test.ts`:
  - a holder's use is allowed at the fixed price, at the override, for a die of 1 and 6, for an X of 0 and 3, for "X+1", for a Blessed card without a payment, and for a 1-cost Cursed card
  - a holder's use is denied at the wrong fixed price, for a die of 0 or 7, without the payment fields, with a payment but no entry, and for another player's card
  - the DM's use is allowed at any amount and at 0, and in the DM's own hand at 0
  - a discard and a transfer still work unchanged
- [x] 2.2 Add `forUse()` and `forWordUse()` to the ledger rules under `tableFree()`, and `lpSetByEntry('use')` and `lpSetByEntry('wordUse')` to the profile rule (design D4). Verify with emulator rules tests:
  - the use and its entry and LP pass as one batch
  - each half alone is denied
  - an entry whose `delta` disagrees with `useCost` is denied, and so is a balance below 0
  - a player paying for another player's use is denied
  - a paid use while a pack is open is denied
- [x] 2.3 Add `match /wordUses/{useId}` (design D2). Verify with emulator rules tests:
  - allowed: the player's own use at the price, an X use, a free 0-cost use, the DM's use at any amount and at 0, and a use of a retired word
  - denied: an unknown or taken-back word, a wrong price, a paid use without its entry and LP, another player's word, a wrong `wordName`, an update, a delete, and a signed-out read
- [x] 2.4 Add the `wordUses` composite index (`uid` ascending, `at` descending) to `firestore.indexes.json`. Verify `npm run test:emulator` passes

## 3. Card use with payment

- [x] 3.1 Extend `closeHolding` in `src/features/hands/api.ts` for `used` with `amount` (design D6):
  - re-read the card for every kind, and the holder's profile when `amount > 0`
  - check the price for a player's own use, the LP, and the DM's own hand
  - write `useCost` and `useEntryId`, the ledger entry and the new LP
  - retry when the LP moved

  Add the `HoldingError` kinds `insufficient` and `price-changed` with their Turkish messages in `errors.ts`. Verify with `errors.test.ts`, and with `src/features/hands/api.emulator.test.ts` cases: a paid use, a free use, an X use, a DM free use, the DM's own hand, not enough LP, a changed price, and an LP moved on another device
- [x] 3.2 Build `UsePayment` in `src/features/balances/` (design D7):
  - the price, and "<lp> LP → <after> LP"
  - "Zar sonucu (1–6)" or "Kaç LP ödenecek?" for an amount the user enters
  - the DM's "Tutar (<name>'nın LP'sinden)" with "0 = ücretsiz", starting at the price or empty
  - the not-enough-LP note
  - the confirm label "Kullanımı onayla (2 LP)"

  Verify with `UsePayment.test.tsx` for a fixed price, a die, X, the DM, the DM's own hand, a Blessed card, and too little LP
- [x] 3.3 Use `UsePayment` in the use step of `src/features/hands/HoldingDetails.tsx` and pass the confirmed amount to `closeHolding`. Verify with `HoldingDialog.test.tsx` and `HandDetailsPanel.test.tsx`:
  - the player's step shows "2 LP" and "5 LP → 3 LP" and sends 2
  - confirming is disabled with too little LP
  - the DM's step sends the edited amount
  - a live cost change updates the step

## 4. True Word use

- [x] 4.1 Add `recordWordUse` to `src/features/true-words/api.ts` and `TrueWordActions` (design D6). It reads the record, the word and the profile, writes the use, its entry and the LP, and retries when the LP moved. Add the `TrueWordError` kinds it needs (`price-changed`, `not-known`) with Turkish messages. Verify with `errors.test.ts`, and with `src/features/true-words/api.emulator.test.ts` cases: a paid use, an X use, a free use, a DM use at 0, too little LP, a taken-back word, and a retired word
- [x] 4.2 Add "Kullan" across the details in `src/features/true-words/TrueWordDetails.tsx` for the word's player and the DM. Add its use step with `UsePayment` and no character field. After a use, show "<word> kullanıldı (−5 LP)." in the details. Disable it while a pack is open, and show the offline message when offline. Verify with component tests for:
  - the player's step and the after-use message
  - another player sees no "Kullan"
  - the DM's free use
  - the table-busy note
  - the offline message

## 5. Activity log

- [x] 5.1 Append the payment to the used card's sentence in `src/features/activity-log/eventText.ts`: "(−2 LP)" when `useCost > 0`, and nothing otherwise. Verify with `eventText.test.ts` for a paid use with and without a character, a free use, and an old holding without the field
- [x] 5.2 Add `wordUses` as a log source in `src/features/activity-log/api.ts`, filtered by `uid` under the player filter. Add the `wordUsed` event kind in `events.ts` and its sentence in `eventText.ts`, for the player's own use, the DM's use with the player's genitive name, and a free use (design D8). Verify with:
  - `events.test.ts`, for merging, order and paging
  - `eventText.test.ts`
  - `ActivityLogPage.test.tsx`, for the filter showing Ayla's use and not Bora's
  - `src/features/activity-log/api.emulator.test.ts`, which shows a use payment never appears as a separate LP change

## 6. Documentation

- [x] 6.1 Update `docs/domain.md`. Verify by reading the changed sections against specs `card-holdings`, `true-words`, `balances` and `activity-log`:
  - the data model: the `userCards` fields `useCost` and `useEntryId`, the `ledger` sources `use` and `wordUse`, and a new `wordUses/{useId}` row with its access
  - the glossary entries for LP and Cost
  - the "LP is only changed by hand" decision, rewritten to say that card and True Word uses pay since `pay-lp-on-use`
  - the True Words note that "the app shows the cost but never charges it"
  - the log's permanence paragraph, which gains True Word uses

## 7. Integration check

- [x] 7.1 Run `npm run check` and `npm run test:emulator`, and verify both pass
- [x] 7.2 Run the app on the emulators. As Oyuncu 1, use a fixed-cost card, a "d6" card, an "X" card and a True Word. Confirm that the LP tile and the İşlem Logu update on a second signed-in window. As the DM, use a player's card for free, and check that a player with too little LP cannot confirm. Check the use step at 360 CSS pixels for a horizontal scrollbar
- [x] 7.3 Stop every process on the project's ports as `CLAUDE.md` describes, and verify with `lsof -nP -iTCP -sTCP:LISTEN` that none remain

## Workflow follow-up

- Archive the change with `/opsx:archive` after the owner reviews it, and sync the specs.
