# Design

## Context

See proposal.md for why, and `specs/custom-cards/spec.md` for the rules. The current shape that the approach has to work with:

- **Definitions.**
  - `cards/{cardId}` holds every definition as a zod discriminated union on `kind`: normal, Blessed, Cursed and True Word (`src/features/cards/schema.ts`). Every definition stores eight behavior flags. `FIXED_FLAGS` in `src/features/definitions/flags.ts` fixes some of them per kind.
  - `CardsProvider` makes the only subscription and splits it into `useCards()` (cards) and `useWords()` (True Words).
  - Lists, pool helpers and packs read `useCards()`.
- **Holdings.** `userCards/{holdingId}` rules (`validNewHolding`, `closesAsUsed`, `releasesCard`, `movesCard`) work on any definition with a `holder`. A holding received from a draft has `givenVia: 'draft'` and a `drawId`. Today only True Words use that.
- **The True Word draft is the pattern to copy:**
  - a `draws/{drawId}` record of `kind: 'wordDraft'`
  - `playerWords/{uid}.openDraftId` as the per-player lock the rules can read without a query
  - the payment ledger entry and the new balance written in the start transaction
  - the DM-only cancel with a refund
  - `ensureTableFree` while a pack is open

  Options are sampled on the client. The rules check that they are valid, not that they are random.
- **Static art.** `npm run build-art` turns the owner's archives into `public/art/` with a manifest (`ArtProvider`). Card, word and set pictures live in Cloud Storage instead.
- **Rule limits.** `firestore.rules` is about 2,900 lines. The largest requests are near the 1000-expression limit and the 20 access calls per request (see `docs/conventions.md`, "The expression limit").
- **Owner data.** `custom.csv` (18 rows, cells up to about 230 characters) and the `custom cards.7z` / `cardmaker/` pictures are the owner's. They stay out of git. The tests use an invented fixture.

## Goals / Non-Goals

**Goals:**
- Reuse the holding, use, discard, transfer, history and log paths unchanged by making a Custom Card an ordinary one-copy definition.
- Keep every existing list, pool and pack function untouched: they never see the new kind.
- One pure module decides step costs, pick counts, resolution and the card cost. The UI, the API and the tests share it, and the rules mirror only what they must.

**Non-Goals:**
- Server checks that the options are random, that the 1-cost Special's upgrade target is random, or that a finished card's resolved costs, texts and computed cost match the draft. The rules check the shape and the link to the draft. The client computes the rest. This is the same trust level as the True Word draft and the owner's "trust players" stance.
- Editing effect texts in the app.
- Storage pictures for Custom Cards. They have no `picture` field of their own.

## Decisions

### D1. A Custom Card is a `cards` definition of kind `custom`
- **Schema.** `definitionSchema` gains a fifth member:
  - `kind: 'custom'`
  - `status: 'active'` (literal)
  - `setCode`, `rarity`, `mechanicPack` and `picture`: `null`
  - `holder`: the one-copy holder
  - `base`: 1, 3 or 5
  - `draftId`: the draft that made it
  - `effects`: 1 to 18 items of `{ type, cost, text }`, distinct types, in pick order
  - `cost`: the computed cost as a string
  - `text`: `''`

  The card shows its text by composing it from `effects` ("`<Type> (<cost>-Cost): <text>`"). That keeps the 2,000-character text limit out of the way of a Held card that grows each session, and avoids storing the texts twice.
- **Name and IDs.**
  - The name is `"<base>-Cost Custom Card"`, and `nameKey` is the normalized name.
  - The DM forms check names only against `useCards()` and `useWords()`, so the shared names never collide.
  - IDs are `custom-<auto>`. `inDeck` in the rules gains the prefix.
- **Flags.** `FIXED_FLAGS.custom` fixes:
  - `isInLibrary`, `isInDraws`, `isInSetPacks`, `isInMechanicPacks` and `isRepeatable`: off
  - `hasUseEffect`: on

  `hasHeldEffect` and `isKeptOnUse` both equal "has a Held effect". The schema and the rules check that, not the form, since a Custom Card has no form.
- **App types.**
  - `Card` stays normal, Blessed and Cursed.
  - The new `CustomCard` type and `HandCard = Card | CustomCard` cover the hand.
  - `CardsProvider` splits a third way: `useCustomCards()`, plus `useHandCardsById()` with cards and Custom Cards together.
  - `useCards()`, `useDeckCards()` and the pool helpers stay as they are, so the library, "+ Kart ver", draws, packs and pool distribution exclude Custom Cards without a change.
  - The places that look a holding's card up by ID move to `useHandCardsById()`: `handEntries`, `cardStatus`, `HandsPage`, `LogEventRow` and `CardHistoryPage`.
- **Alternative considered: Custom Card as a member of `Card`.** Every list and pool function would need a filter, and a missed one would leak Custom Cards into draws. Rejected.
- **Alternative considered: the effects embedded in the holding, with no definition.** The holdings rules, use records, transfers and history all key on `cardId` and read `cards/{cardId}`. Rejected.

### D2. Effect variants in one document
- **The document.** `customEffects/main` holds `{ variants: { <Type>: { '1'?: text, '3'?: text, '5'?: text } }, importedAt }`.
- **Why one document.** A rule that checks the options of a step needs one `get()` for any number of options.
- **Access.** Read: `isMember()`. Write: never (the Admin SDK import only).
- **Limits.** Each text is at most 1,000 characters, checked by the import and the zod schema. 54 variants stay far below the 1 MiB document limit.
- **Alternative considered: one document per type.** It needs up to 3 `get()`s per step, from an already tight budget. Rejected.

### D3. The draft record and the lock
- **The draft.** `draws/{drawId}` with `kind: 'customDraft'`:
  - `uid`, `by`, `at`
  - `base`
  - `paidWith`, `cost` and `entryId`, as for word drafts
  - `pickTypes` and `pickCosts`: two parallel lists, so the rules can test `type in pickTypes`
  - `offered`: 0 to 3 types
  - `offerCost`: the cost of the current step
  - `required`: picks needed
  - `bonusLeft`: extra 1-cost picks still due
  - `status`: `open`, `finished` or `cancelled`
  - `closedAt`, `closedBy`
  - `cardId`, `holdingId`
  - `refundEntryId`

  The app schema zips the pick lists into `{ type, cost }[]`.
- **Rule cost.** The rules pass each computed value to a helper function as an argument, because a `let` is evaluated again wherever it is used, and the pick rule would otherwise pass the 1000-expression limit.
- **Incremental counters.** `required`, `bonusLeft` and `offerCost` are stored so each pick's rule checks one transition, without loops:
  - `pickTypes' == pickTypes + [t]`, with `t in offered` and `!(t in pickTypes)`
  - `pickCosts' == pickCosts + [offerCost]`
  - `bonusLeft' = bonusLeft − (bonus step ? 1 : 0) + (t == 'Special' && offerCost == 3 ? 2 : 0)`
  - `required' = required + (t == 'Effects' ? (offerCost == 5 ? 3 : 2) : 0) + (t == 'Special' && offerCost == 3 ? 2 : 0)`
  - `offerCost' = (bonusLeft' > 0 && size' >= 3) ? 1 : base`
  - the new `offered` holds distinct types not in `pickTypes'`, each with a variant at `offerCost'` (one `get(customEffects/main)`)
- **The lock.** `playerCustomDrafts/{uid}` holds `{ openDraftId }`, the same pattern as `playerWords`. A start sets it, and finishing or cancelling clears it. It is a separate document from `playerWords`, so the two drafts never block each other (spec: "One open Custom Card draft per user").
- **Alternative considered: one string list like `"Caster:3"`.** Testing "type not picked" would need three `in` checks per option. Rejected.

### D4. Finishing in one transaction
The pick whose `size' == required'` (with `bonusLeft' == 0`) writes four things together:
- the draft update, with `status: 'finished'`, `cardId`, `holdingId`, `closedAt` and `closedBy`
- the new `cards/custom-…`
- the new `userCards` holding, with `givenVia: 'draft'`, `drawId` and `cardKind: 'custom'`
- the lock cleared

The rules on each side check the others with `getAfter()`/`existsAfter()`:
- **The card.** It is created only when the draft is `finished` after the request and names this card. Its `uid` holder, `base` and `draftId` match the draft. Its `effects` types are the draft's `pickTypes` (same size, `hasAll`). Its flags are fixed.
- **The holding.** `validNewHolding` gains a `givenVia == 'draft' && cardKind == 'custom'` branch. Since the card is created in the same request, that branch reads it with `getAfter`.
- **The draft.** A finishing update must have the card and the holding after the request.

A pick that does not complete the card must leave `status` open and write no card.

The client computes the resolution (D5) inside the transaction. The 1-cost Special's random target uses `cryptoRandom`, as the samples do.

### D5. One pure module for the draft rules and the cost
`src/features/custom-draft/draftRules.ts` has no React or Firebase imports. It holds:
- `stepCost`, `requiredPicks`, `nextOptions(variants, draft, random)` and `applyPick`, which give the same counters the rules check
- `resolveEffects(draft, variants, random)`
- `cardCost(base, effects)`, which returns `{ total, parts }` for the details line "3 + 2 (Effects) − 2 (Cursed) = 3"

The cost tables are constants. Effects adds 1, 2 or 2 at 1, 3 or 5-cost. Cursed takes away 1, 2 or 3. They come from the owner's effect texts as agreed on 2026-11-20. A comment says that a changed text needs a code change here. `docs/domain.md` records the same table.

The DM's effect edits (D8) reuse `cardCost` and the text composition.

### D6. Pictures through `build-art`
- **Classification.** `scripts/lib/artFiles.ts` classifies two new names:
  - `^[135]custom$` as a cover
  - `^[135](<18 types>)$` as an effect picture

  `importPictures` treats the same names as "left to the build". That way `1caster` is never reported as an unknown card picture.
- **Manifest.** The manifest gains `customCovers: { '1' | '3' | '5': path }` and `customEffects: { '<cost>:<type>': path }`. `ArtProvider` exposes `customCover(cost)` and `customEffect(cost, type)`.
- **Why not Storage.** The pictures are fixed per (cost, type), like pack pictures, not per definition.
- **Alternative considered: Cloud Storage with a new import.** It adds a second path and storage rules for pictures that never change per card. Rejected.

### D7. The import script
`npm run import-custom-effects -- [--file <csv>] [--dry-run] [--project <id>] [--yes]` follows `import-true-words` (default file `data/custom-effects.csv`):
- It runs through `scripts/lib/target.ts` and a CSV parser in `scripts/lib/customEffectRows.ts`.
- The columns are matched without regard to case.
- Names are matched to the 18 types without regard to case.
- It sets each imported variant on `customEffects/main` with a merge, so a cell left empty in a new CSV keeps its old text.
- It reports in Turkish.

The emulator test uses `tests/fixtures/data/custom-effects.csv`, with invented texts for every type and one empty cell. Finished cards are never touched (spec: "Imported texts and finished cards").

### D8. The DM's effect edits are definition steps
- **The dialog.** "Efektleri düzenle" opens in the hand details for the DM only. It adds a type the card lacks, at a cost that has a variant, with that variant's current text, or removes one effect, keeping at least one.
- **The write.** One `definitionChanges` record (`recordedBy`, target `card`) and a card update that changes only:
  - `effects`
  - `cost`
  - `hasHeldEffect`
  - `isKeptOnUse`
  - `changeId`
- **The rule.** `changedByDm()` gains a `custom` branch. The kind stays the same, the holder stays the same (card-library, "Who writes card definitions"), the flags follow Held, and every other field stays the same.
- **Statuses.** Retire, bring back and delete are denied for `custom`.
- **The log.** It stays silent, as for every definition change.

### D9. The screen and the face
- **`src/features/custom-draft/`:**
  - `CustomDraftPage`, with "Kimin için" for the DM, reusing the True Words tab's chooser and its `?for=` parameter
  - `CostChoices`
  - `DraftAmountDialog` for the DM's amount, modelled on `DraftConfirmDialog`
  - `OpenCustomDraft`: the header with "n / m" and the bonus note, the picked strip, the options grid, and the DM's "İptal"
  - `api.ts` with `startCustomDraft`, `pickEffect` and `cancelCustomDraft`, each one transaction with `ensureTableFree`
  - `errors.ts` with Turkish messages, offline included
- **The face.** `CardFace` gains a `custom` branch: the cover, the hand cost badge, and, without a cover, the name, cost and effect types as text.
- **The hover preview.** It cycles the effect pictures. With reduced motion it shows them side by side without cycling.
- **The zoom view.** It shows the cover beside the effect pictures.
- **The hand details.** They show the effect list, the cost line from `cardCost`, and the discard button "✕ Custom kartı yok et" with a confirmation that says the card is destroyed.
- **After the last pick.** The page that made it navigates to the player's hand with `selected=<holdingId>`.

### D10. Ledger and log
- **The ledger.** `LEDGER_SOURCES` gains `customDraft`, an LP-only source. The ledger's word-draft functions become `forDraft`, `paysForDraft` and `refundsDraft` for both sources, matching the draft's kind to the entry's source, and `users/{uid}` gains the `customDraft` LP branch. The source check comes first, so the other branches stop early.
- **The log.** The log reads `draws` already. It gains a `customDraft` row: the starter, the user, "`<base>`-Cost Custom Card", the payment or "ücretsiz", the effect types, and the end. Like the word draft, it hides the ledger entries and the holding that the draft explains.

## Risks / Trade-offs

- **[Rule limits]** The finishing request touches the draft, the lock, the card, the holding, `customEffects/main`, `users/{uid}` and `table/main`, about 8 documents. → Put the kind/source discriminators first in every new and touched rule. Add an emulator test of the largest case: a 3-cost draft with Effects and Special, 7 picks, finished by the DM. Add a test that a normal pack choice still passes.
- **[Client-computed resolution]** A player with dev tools could store wrong resolved costs or a lower card cost. → An accepted trust trade-off (Non-Goals). The DM sees the effects and the cost line, and can fix them with the effect edit or a hand cost.
- **[Hard-coded cost tables]** A changed Effects or Cursed text would not change the cost. → D5 comment, `docs/domain.md` note, and the import report reminding about it when those two rows change.
- **[Kind added to a union used widely]** Exhaustive switches on `DefinitionKind` (flags labels, log, pictures, scripts' catalog) fail to compile until handled. → That is the wanted checklist. Tasks list each one.
- **[Growing card list]** Every finished Custom Card stays in `cards` and in every client's subscription. → It is a few dozen documents over a campaign, which is negligible.

## Migration Plan

1. There is no data migration. Existing documents are unchanged.
2. Commit the updated `public/art/` from `npm run build-art`. Deploy the rules and Hosting through CI as usual.
3. After the deploy, run `npm run import-custom-effects` against the live project, following the README's "Going live" runbook (updated in this change). Until it runs, the cost choices are disabled with the "not loaded" note.
4. **Rollback.** Revert the commit. Custom Cards already made would fail the old schema and be skipped by the client, and their holdings would show as unknown cards. Before reverting, the DM discards them.
