# Tasks

## 1. Shared card page rule

- [x] 1.1 Move `isOpenTo` from `src/features/stats/CardHistoryPage.tsx` to `src/features/stats/cardAccess.ts` as `canOpenCardPage(card, isDm, isHeld)`, unchanged, and use it from the page (design D5). Add `cardAccess.test.tsx` with the DM, a listed active card, a hidden card held and not held, a draft, a retired card held, and a Custom Card. Verify the new test and the existing `CardHistoryPage` tests pass (`npx vitest run --project unit src/features/stats`).
- [x] 1.2 Add `useCardPageAccess()` to `cardAccess.ts`: reads `useIsDm()`, `useOpenHoldings()` and `useHandCardsById()` once (memoised) and returns `(cardId) => boolean`, `false` while loading or for an ID not in the map (True Words). Verify with a hook test covering loading, a True Word ID, and a player's hidden held card.

## 2. Sentence parts with players and card IDs

- [x] 2.1 Add a way in `src/lib/turkish.ts` to get a name's suffix apart from the name for `genitive`, `dative`, `ablative` and `accusative` (design D2). Verify with cases in `turkish.test.ts` (for example "Ayla" → "'nın", "Cem" → "'e", "Gökay" → "'dan"), including a name with surrounding spaces.
- [x] 2.2 Extend `SentencePart` in `src/features/activity-log/eventText.ts` with `{ player, name, suffix }` and `cardId` on card parts, and make `sentenceText` join them so the text is unchanged (design D1). Verify every existing `eventText.test.ts` case passes unchanged.
- [x] 2.3 Turn every player mention listed in design D3 into a player part, and give every card part its record's ID (holding, transfer side, draw, pack chosen and Cursed card, learned word, Custom Card draft, use, taught or taken word). Verify with new `eventText.test.ts` cases that assert the parts of a discard from another hand (`{ player: 'ayla', suffix: "'nın" }`), a transfer (ablative and dative), an LP change, a pack "için", a skipped draft's closer, a role grant, and that "Grup kesesi" and "DM iptal etti" stay text.

## 3. Links in the row

- [x] 3.1 Pass a profile check next to `nameOf` from `ActivityLogPage` to `LogEventRow`, and render the actor's name and each player part as a `Link` to `handPath(uid)` when the profile exists, with the suffix outside the link; "Import" and unknown users stay text (design D4, D6). Verify with `ActivityLogPage.test.tsx` cases: selecting the actor opens their hand; "Ayla" in a DM's discard links to `/hands/ayla` with "'nın elinden" outside; both sides of a transfer link; the DM's own name links and keeps the DM mark; a uid without a profile reads "İsimsiz oyuncu" with no link.
- [x] 3.2 Render each card part, and each card in a pack's "Sunulan:" line, as a `Link` to `cardHistoryPath` when `useCardPageAccess()` allows it, inside the bold `lang="en"` span; otherwise as today. Verify with `ActivityLogPage.test.tsx` cases: a used card opens its Kart geçmişi; a pack's three offered cards link; a Custom Card links; a True Word use has no card link; a hidden card that no one holds has no link for a player and has one for the DM.
- [x] 3.3 Check the row by hand in the running app at 360 px wide and on a wide window: links wrap with the text, hover turns them gold and underlined, Tab moves through them with the focus outline, and the page does not scroll sideways. Stop every process on the project's ports afterwards.

## 4. Integration check

- [x] 4.1 Run `npm run check` and `npm run test:emulator`; both pass. Stop every process on the project's ports afterwards.

## Workflow follow-up

- Archive with `/opsx:archive`, then commit (feat + docs archive).
