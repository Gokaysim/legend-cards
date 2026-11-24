# Tasks

## 1. Draft rules and cost (pure logic)

- [x] 1.1 Add `src/features/custom-draft/draftRules.ts` (design D5) with:
  - the 18 `EFFECT_TYPES` and `CUSTOM_COSTS`
  - `stepCost`, `requiredPicks`, `applyPick` (the `required`, `bonusLeft` and `offerCost` transitions of design D3)
  - `nextOptions(variants, draft, random)`, `resolveEffects(draft, variants, random)` and `cardCost(base, effects)` returning `{ total, parts }`
  - `composeText(effects)`

  Verify with `draftRules.test.ts` covering every scenario of "The cost of a step", "Number of picks", "Too few options", "Resolving the effects" and "The cost of a Custom Card" in `specs/custom-cards/spec.md`, including 7 picks for Effects with a 3-cost Special, a 1-cost Special inside a 3-cost draft, and the floor at 0.

## 2. Effect variants and their import

- [x] 2.1 Add `src/features/custom-draft/effectsSchema.ts` (the zod schema of `customEffects/main`, texts up to 1,000 characters, and its converter), with `effectsSchema.test.ts`. Verify that an unknown type or cost is rejected.
- [x] 2.2 Add the `match /customEffects/{docId}` block to `firestore.rules`: members read, nobody writes. Add `tests/customEffects.rules.emulator.test.ts` (signed out, outsider, player write, DM write denied; member read allowed). Verify with `npm run test:emulator`.
- [x] 2.3 Add `scripts/lib/customEffectRows.ts` (CSV parsing with case-insensitive columns and names, the skipped rows and cells, the missing-columns error) and `scripts/import-custom-effects.ts` with `--file`, `--dry-run`, `--project` and `--yes` through `scripts/lib/target.ts`, plus the `import-custom-effects` npm script. Add `tests/fixtures/data/custom-effects.csv` with invented texts for all 18 types and one empty cell. Verify with a unit test of the row parser and `tests/import-custom-effects.emulator.test.ts`: a first import, a re-import that merges, a dry run that writes nothing, and the missing-column stop.
- [x] 2.4 Document the import in `README.md` (scripts table, "Loading the cards", and the "Going live" runbook step), `data/README.md` (the `custom-effects.csv` file and its columns) and `docs/conventions.md` (the admin scripts list). Verify each documented command matches the script's flags.

## 3. Custom Card pictures

- [x] 3.1 Teach `scripts/lib/artFiles.ts` the `^[135]custom$` covers and the `^[135]<type>$` effect pictures, and let `build-art` write them with `customCovers` and `customEffects` in the manifest and in the Turkish report (missing ones named). Make `importPictures` count those names as left to the build. Verify with the `artFiles` and `build-art` tests, extended with a cover, an effect picture, a missing `1held`, and an import-pictures case where `3caster` is not an unknown card.
- [x] 3.2 Extend the manifest schema and `ArtProvider` with `customCover(cost)` and `customEffect(cost, type)`, with tests for a present and a missing picture. Run `npm run build-art -- --source ~/Downloads` and check that the manifest lists 3 covers and 54 effect pictures. Leave `public/art/` changes for the commit.
- [x] 3.3 Update `docs/conventions.md` ("The picture build", static art list) and `data/README.md` (pictures) for the new names. Verify the text matches `artFiles.ts`.

## 4. The `custom` kind

- [x] 4.1 Add `custom` to `DEFINITION_KINDS`, `FIXED_FLAGS`, the draw-flag labels and `startingFlags` in `src/features/definitions/flags.ts`, and the `customCardSchema` member to `definitionSchema` in `src/features/cards/schema.ts` (design D1), with the `CustomCard` and `HandCard` types. Fix every compile error the new kind raises in `src/` and `scripts/` (`cardCatalog`, `cardRows`, `importPictures`, `artFiles`, the definitions form and API) so the lists and imports ignore the kind. Verify with `npm run check` and new `schema.test.ts` cases: Held drives `hasHeldEffect` and `isKeptOnUse`, a draw flag on is rejected, and `text` must be empty.
- [x] 4.2 Split `CardsProvider` into cards, words and Custom Cards, and add `useCustomCards()` and `useHandCardsById()`. Move `handEntries`, `cardStatus`, `HandsPage`, `LogEventRow` and `CardHistoryPage` to the hand lookup. Verify with `cardsContext.test.tsx` that `useCards()` never returns a Custom Card and that `useHandCardsById()` does. Verify with a library and a "+ Kart ver" test that a held Custom Card is not listed or counted.
- [x] 4.3 Add `customDraft` to `LEDGER_SOURCES` (LP only) and `custom` to the holding's `cardKind`, with schema tests.

## 5. Rules for drafts, cards and holdings

- [x] 5.1 In `firestore.rules`, add `match /playerCustomDrafts/{uid}` (the lock), the `customDraft` branches of `match /draws/{drawId}` (start, pick, finish, cancel, as in designs D3 and D4), and the `customDraft` source in the ledger's draft functions (`forDraft`, `paysForDraft`, `refundsDraft`, shared with the True Word draft, the source check first) and in the LP branch of `users/{uid}`. Add `tests/customDrafts.rules.emulator.test.ts` for:
  - the player's exact price
  - the DM's amount from 0 to LP
  - a second open draft denied, and a True Word draft alongside allowed
  - a pick not offered, a picked type offered again, and a wrong `offerCost`, `required` or `bonusLeft`
  - another player's pick
  - the player cancel denied
  - the DM cancel with its refund
  - an ended draft changed or deleted
  - a start while a pack is open
- [x] 5.2 In `match /cards/{cardId}`, allow creating a `custom-` card only with the finishing pick of an open draft of its holder (design D4). Add the DM's effect-edit branch in `changedByDm` (design D8). Deny retire, bring back and delete for `custom`. In `match /userCards/{holdingId}`, add the `givenVia == 'draft' && cardKind == 'custom'` branch. Extend the emulator tests:
  - a card written without a finished draft
  - a card before the last pick
  - mismatched types
  - a player's effect edit
  - the DM's edit with its change record
  - a use, a kept use with Held, a discard and a DM transfer of a Custom Card
- [x] 5.3 Add an emulator test for the largest request: the DM finishes a 3-cost draft with Effects and Special in 7 picks. Re-run the existing pack-choice and use-with-effect tests to confirm they stay inside the rule limits. Verify with `npm run test:emulator`.

## 6. Draft API

- [x] 6.1 Add `src/features/custom-draft/schema.ts` (the draft record with zipped picks, the lock) and `api.ts`:
  - `startCustomDraft`: amount `'price'` or a number, `ensureTableFree`, the lock, the ledger and the balance
  - `pickEffect`: a plain pick, or the finishing transaction with the card, the holding and the lock
  - `cancelCustomDraft`: DM, refund

  Add `errors.ts` with Turkish messages (insufficient LP, draft open, closed, table busy, effects not loaded, incomplete texts, offline). Verify with `api.emulator.test.ts`: a paid start, a free DM start, a full 1-cost draft that lands the card at the end of the hand, a cancel with a refund, and a busy table.

## 7. The Custom Card Draft screen

- [x] 7.1 Replace the placeholder in `src/features/custom-draft/CustomDraftPage.tsx` with:
  - the three cost choices (cover or "✧ n", price, disabled notes)
  - "Kimin için" for the DM with `?for=`
  - the DM amount dialog
  - `OpenCustomDraft`: the "n / m" header with the bonus note, the picked strip, the options with picture, type, cost and text, the DM's "İptal" with confirmation, and the incomplete-effects note

  After the last pick, navigate to the player's hand with the new card selected. Verify with `CustomDraftPage.test.tsx` and `OpenCustomDraft.test.tsx` covering every screen scenario in `specs/custom-cards/spec.md`, offline included.
- [x] 7.2 Update the `app-shell` placeholder test so the Elixir Shop is the unbuilt example and Custom Card Draft shows no "Yakında". Check the screen at 360 px wide in the browser iframe (no horizontal scroll) and with reduced motion.

## 8. The Custom Card in the hand

- [x] 8.1 Add the `custom` branch to `CardFace` (cover with the hand cost badge, text fallback), the hover preview that cycles effect pictures (side by side with reduced motion), and the zoom view with the cover and the effect pictures. Verify with `CardFace.test.tsx` and `CardZoomDialog.test.tsx` cases for a cover, a missing cover and reduced motion.
- [x] 8.2 In the hand details (`HoldingDetails` / `HandDetailsPanel`), show the effect list and the `cardCost` line, and the discard button "✕ Custom kartı yok et" with its destroy confirmation. Add the DM-only "Efektleri düzenle" dialog (design D8). Verify with tests for the cost line, the discard label, a player seeing no edit control, and an edit that adds Held and turns on "Kullanınca elde kalır".

## 9. Log and history

- [x] 9.1 Add the `customDraft` event row to the activity log (start, payment or "ücretsiz", effect types, finished card or cancel with refund, live while open), hiding its ledger entries and its holding. Include it in the per-user filter. Verify with log tests for each scenario of "A Custom Card draft is one event" and the filter scenario.
- [x] 9.2 Make the "Kart geçmişi" page of a Custom Card show its draft and holdings. Verify with a `CardHistoryPage` test.

## 10. Domain docs and integration

- [x] 10.1 Update the Custom Card Draft section of `docs/domain.md`:
  - the LP price
  - the computed cost table
  - 5-cost Effects adding 3
  - the saved open draft and the DM-only cancel
  - Held cards kept on use
  - the DM's effect edits
  - Cursed draws by hand

  Mark these as owner decisions of 2026-11-20 that differ from the legacy app, and remove the "unbuilt" Custom Card Draft mentions. Verify that no owner CSV text is quoted.
- [x] 10.2 Run `npm run import-custom-effects -- --file ~/Downloads/custom.csv` against the emulators, then play a 3-cost draft as Oyuncu 1 in the browser: pay, pick, finish, use, and have the DM cancel another draft. Check the hand, the log and the LP live on a second session.
- [x] 10.3 Verify that `npm run check` and `npm run test:emulator` both pass. Then stop every process on the project's ports as `CLAUDE.md` describes, and confirm with `lsof -nP -iTCP -sTCP:LISTEN`.

## Workflow follow-up

- Archive the change with `/opsx:archive` once it is reviewed, then commit (feat + docs archive) as the project does.
