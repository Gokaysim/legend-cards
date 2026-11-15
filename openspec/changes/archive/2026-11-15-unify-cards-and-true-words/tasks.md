# Tasks

## 1. Definitions: flags, schema and pool helpers

- [x] 1.1 Add `src/features/definitions/flags.ts` (design D2) with:
  - the eight flag names and their Turkish labels, with the draw flag's label per kind
  - the flags each kind shows and the values it fixes
  - `startingFlags(kind, text)`, with "Elde etkili" from a text that starts with "Held:"

  Verify with `flags.test.ts`: each kind's starting values, "Held:" with leading spaces and any case, and the fixed values.
- [x] 1.2 Rebuild `src/features/cards/schema.ts` on one schema for the whole `cards` collection (design D1, D2):
  - the `trueWord` member, with no set, rarity, mechanic pack or holder, and a cost required outside a draft
  - the eight required flags, with literals for the fixed ones
  - `holder` only when `isRepeatable` is off
  - no `dmOnly`
  - the `Card` and `TrueWord` types

  Move the True Word definition schema out of `src/features/true-words/schema.ts`. Verify with `schema.test.ts`: a True Word parses, and a fixed flag with another value, a missing flag, and a holder on a repeatable card are rejected.
- [x] 1.3 Replace `isDrawable` and `cursedPool` in `src/features/cards/pool.ts` with `isAvailable`, `inRandomDraw`, `inCursedDeck`, `inSetPacks`, `inMechanicPacks`, `isInPool` and `inWordDraft` (design D3). Move `packPools`, the thresholds in `src/features/packs/catalog.ts`, `poolDistribution`, the draw facets and `learnableWords` onto them. Verify with:
  - a flag-matrix test per kind in `pool.test.ts`
  - `catalog.test.ts`: Golden uses `isInMechanicPacks`, a one-pack set's packs use `isInSetPacks`, the Cursed slot uses `inCursedDeck`, and the thresholds count only flagged cards
- [x] 1.4 Add the flags and the `trueWord` kind to `cardSnapshotSchema`, merge the word snapshot into it, and base `isPublicStep` on `isInLibrary` (design D7), in `src/features/definitions/schema.ts`. Verify with `schema.test.ts`:
  - work on a hidden card is private
  - turning "Listede görünür" on or off is public
  - draft work is private
  - a True Word's record has the target `word`
- [x] 1.5 Update the test fixtures (`src/test/cardFixtures.ts`, `definitionFixtures.ts` and the word fixtures) to the new shape, and verify `npm run typecheck` and `npm run test` pass for the cards, definitions and packs folders.
- [x] 1.6 Update `docs/domain.md`:
  - the glossary: Card, Cursed card, Blessed card, Pool, True Word, Active effect
  - a new "Behavior flags" entry
  - the DM-only card entry replaced by "Sadece DM verebilir" and "🔒 DM"
  - the "Deliberate decisions" entry for DM-only cards rewritten for `isInLibrary`
  - a new decision for the merge (option B, 2026-11-15)

  Verify the entries agree with the delta specs.

## 2. Firestore rules and their tests

- [x] 2.1 `cards` block in `firestore.rules` (design D2, D4, D7):
  - the flags in `definitionKeys()`, `validCard` and `fixedFlags`
  - the `trueWord` kind with the `tw-` IDs, and `completeWord` merged into `completeCard`
  - `holder` only when `isRepeatable == false`, and the holder paths keyed on that flag
  - `changedByDm` waits with `tableFree()` for the channel flags and `isRepeatable`
  - turning `isRepeatable` on only while `holder == null`
  - `visibleSnapshot` by `isInLibrary`
  - both record targets resolve to `cards/`
  - the `trueWords` block and `dmOnly` removed

  Verify with emulator rules tests for each point, including a player writing a flag and a fixed flag with another value.
- [x] 2.2 `userCards` block (design D4, D5, D6):
  - `active == card.hasHeldEffect` on every create except a transfer
  - switching `active` only with the flag
  - `drawnInto` and `chosenFromPack` by kind and flags: a random draw `isInDraws` on normal and Blessed, a Cursed draw and the Cursed slot `isInDraws` on Cursed, a set pack `isInSetPacks`, Mechanic and Golden `isInMechanicPacks`
  - `closesAsUsed` refuses a kept card
  - the True Word branches `learnedFromDraft`, `taughtByDm` and taking back (closed as `discarded`)
  - no transfer and no close-as-used of a True Word
  - `givenByDm` refuses True Words
  - the `userTrueWords` block removed

  Verify with emulator rules tests, including a Cursed card with one copy that takes and releases its holder through a Cursed draw and a pack's Cursed slot.
- [x] 2.3 `draws` and `playerWords` blocks (design D5):
  - the `wordDraft` kind's start, learn, skip and cancel moved from `wordDrafts`, with the price, the payment and refund, one open draft, and `tableFree()`
  - `playerWords.recordId` renamed to `holdingId`, and its helpers pointing at holdings and draws
  - the `wordDrafts` block removed

  Verify with emulator rules tests for each step and that an open pack blocks every draft step.
- [x] 2.4 `uses`, `ledger` and `characterEffects` blocks (design D5, D6):
  - a new `uses` block: an open holding of a kept card, its payment priced from the cost in the hand, never changed or deleted
  - the ledger source `keptUse` in place of `wordUse`
  - `followsUse` in place of `followsCardUse` and `followsWordUse`, requiring `hasUseEffect`
  - the `wordUses` block removed

  Verify with emulator rules tests, including the largest batches (a pack choice with its Cursed card and two holders, a kept use with its ledger entry, LP and effect, learning from a draft) staying within the access-call limit.
- [x] 2.5 Update the data model table in `docs/domain.md`:
  - the `cards`, `userCards`, `draws`, `ledger`, `playerWords` and `characterEffects` rows
  - a new `uses` row
  - the `trueWords`, `userTrueWords`, `wordDrafts` and `wordUses` rows removed
  - the "True Words extend the target model" notes rewritten

  Verify `npm run test:emulator` passes for `tests/firestore.rules.emulator.test.ts`.

## 3. Data access

- [x] 3.1 `src/features/definitions/api.ts`: write the eight flags in every card and True Word step, and add, save, publish, retire and delete True Words in `cards`. Verify with `src/features/definitions/api.emulator.test.ts`: a flag change with its record, a True Word's whole lifecycle, and a channel flag change refused while a pack is open.
- [x] 3.2 `src/features/hands/api.ts`:
  - every new holding gets `active` from `hasHeldEffect`
  - the holder follows `isRepeatable`
  - `closeHolding`'s use step branches on the stored `isKeptOnUse`: a kept card's use writes the `uses` record with its payment and optional effect and leaves the holding open (design D9)
  - switching active needs the flag

  Verify with `src/features/hands/api.emulator.test.ts`.
- [x] 3.3 `src/features/draws/api.ts` and `src/features/packs/api.ts`: draws and pack choices of a Cursed card with one copy set its holder, and the flags drive what is drawn and offered. Verify with their `api.emulator.test.ts` files.
- [x] 3.4 Rebuild `src/features/true-words/api.ts` on the shared paths:
  - drafts are `draws` documents of the kind `wordDraft`
  - learning and teaching open holdings
  - taking back closes the holding
  - uses go through `closeHolding`'s kept use step
  - `playerWords` uses `holdingId`

  Verify with a rewritten `src/features/true-words/api.emulator.test.ts`.
- [x] 3.5 `src/features/characters/`: effects come from a closed holding or a `uses` record, with `source` `word` for a True Word. Verify with `src/features/characters/api.emulator.test.ts`.

## 4. Providers and screens

- [x] 4.1 `CardsProvider` makes the one subscription and splits it into `useCards`/`useCardsById` and `useWords`/`useWordsById`. Players' lists leave out definitions whose `isInLibrary` is off (design D1). `TrueWordsProvider` reads its words from there, the known words from the holdings, and the open drafts from `draws`. Verify with `cardsContext.test.tsx` and `trueWordsContext.test.tsx` for a player and for the DM.
- [x] 4.2 Add one "shows as active" helper (`holding.active && card.hasHeldEffect`), and use it in the hand marks, `heldEffects`, `ActiveWordsPeek` and `HandSummary`. Verify with `heldEffects.test.ts`, `ActiveWordsPeek.test.tsx` and a hand summary test, each with the flag turned off on an active holding.
- [x] 4.3 The hand (design D9):
  - entries split by kind, so True Words are not counted as cards
  - card details show "Aktif et" only with `hasHeldEffect`
  - `TrueWordDetails` gains the note, the DM's cost and "Aktif et" only with the flag, and no "Başkasına ver"
  - the use step branches on `isKeptOnUse`
  - `CharacterPicker` hides "Aktif efekt olarak ekle" without `hasUseEffect`

  Verify with `HandView`, `HoldingDialog`, `HandTrueWords` and `CharacterEffects` tests: a kept card used twice, a word's note, and a card without a use effect.
- [x] 4.4 Lists:
  - the Kart kütüphanesi, the Cursed Deck and the True Words screen show the "🔒 DM" mark from `isInLibrary`
  - the status filter's `'hidden'` choice, labelled "🔒 DM", is offered on all three screens
  - the library's Durum and pool count come from `isInPool` ("DM'e özel" when the three channel flags are off)
  - "Yalnızca havuzdakiler" and "▥ Havuz Dağılımı" follow the helpers

  Verify with `LibraryPage`, `CursedDeckPage`, `TrueWordsPage`, `CardBrowser` and `PoolDistributionDialog` tests.
- [x] 4.5 Add `BehaviorSection` to `CardFormDialog` and `WordFormDialog` (design D8):
  - the two groups and the kind's boxes
  - "Sadece DM verebilir" with its note
  - greyed-out boxes with "Bir Pack açık: seçim bekleniyor." and "Kart bir oyuncunun elinde."
  - "Elde etkili" follows the text until touched
  - a kind change resets the flags

  Verify with `CardFormDialog.test.tsx` and `WordFormDialog.test.tsx`.
- [x] 4.6 The draw and pack screens (`DrawButtons`, `DrawDialog`, `PackShopPage`, `OpenPackView`) use the helpers, so "☠ Cursed Kart Çek" and the packs disable when their candidates run out by flag. Verify with their tests.
- [x] 4.7 The Setler screen's counts and the set statistics page count and mark cards by `isInLibrary` ("🔒 DM"). Verify with `SetsPage.test.tsx` and `SetStatsPage` tests.
- [x] 4.8 Update `docs/conventions.md`:
  - the feature layout lines for cards, definitions, true-words and hands
  - the pool helpers paragraph
  - the data-access notes for the one cards subscription and the `uses` collection

  Verify the named functions exist.

## 5. Log and statistics

- [x] 5.1 `src/features/activity-log/` (design D10):
  - read holdings (True Word holdings as taught and taken-back events), draws with `wordDraft`, and `uses`
  - fold `keptUse` entries into their use
  - add the flag field lines with their labels
  - split import events by `isInLibrary`

  Verify with `events.test.ts`, `eventText.test.ts` and `api.emulator.test.ts`: a taught word is not a card given, two uses of a kept card are two events, and the "Kart çekmede çıkar: evet → hayır" line shows.
- [x] 5.2 `src/features/stats/`: `cardHistory` and `setStats` count the `uses` records into "Kullanıldı" and the LP paid, and the library route answers "Kart bulunamadı." for a True Word. Verify with `cardHistory.test.ts`, `setStats.test.ts` and `src/features/stats/api.emulator.test.ts`.

## 6. Scripts

- [x] 6.1 Add the copy of the starting flags to `scripts/lib/cardCatalog.ts`, and extend `cardCatalog.drift.test.ts` to compare it with `src/features/definitions/flags.ts`. `importCards.ts` and `cardRows.ts` write the flags on every added card. Verify with `cardRows.test.ts`, `importCards.test.ts` and `tests/import-cards.emulator.test.ts`: a "Held:" card is "Elde etkili", and a Cursed card is repeatable with no pack flags.
- [x] 6.2 `importTrueWords.ts` and `trueWordRows.ts` write True Words into `cards` with the kind `trueWord`, and match "already stored" only among them. Verify with `importTrueWords.test.ts` and `tests/import-true-words.emulator.test.ts` (53 words; a second run adds nothing).
- [x] 6.3 `importPictures.ts` finds words in `cards`, keeps writing word pictures under `words/`, and splits its records by `isInLibrary`. Verify with `importPictures.test.ts` and `tests/import-pictures.emulator.test.ts`.
- [x] 6.4 Update the imports section of `docs/conventions.md` (the flags written, True Words in `cards`), and verify it matches the scripts' behavior.

## 7. Integration and the dev data

- [x] 7.1 Run `npm run check` and `npm run test:emulator`, and verify both pass.
- [x] 7.2 Ask the owner to confirm the wipe, then reset the dev data as the design's Migration Plan says:
  - back up `.firebase-emulator-data/` to the scratchpad
  - wipe Firestore and Storage, and keep the accounts
  - recreate the profiles and the DM role
  - run the four imports

  Verify 745 cards, 53 True Words and 12 sets with their pictures.
- [x] 7.3 In Chrome against the emulators:
  - **As the DM:**
    - add a card with the "Davranış" section and use "Sadece DM verebilir"
    - hide a card and see "🔒 DM"
    - make a normal card "Kullanınca elde kalır", give it to Oyuncu 1 and use it twice
    - give a Cursed card with one copy and see it leave the Cursed Deck
    - teach "Justice" and see it active
  - **As Oyuncu 1:** see the hidden card missing from the library but in the hand, write a note on a True Word, and see the İşlem Logu events.

  Verify the hand and the forms at 360 px.
- [x] 7.4 Stop every process on the project's ports as `CLAUDE.md` says, and verify with `lsof -nP -iTCP -sTCP:LISTEN` that none remains.

## Workflow follow-up

- Archive the change with `/opsx:archive` once the owner has reviewed it.
