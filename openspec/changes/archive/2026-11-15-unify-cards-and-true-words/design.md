# Design

## Context

See proposal.md for why. The current shape that the approach has to work with:

- **Definitions.** `cards/{cardId}` holds normal, Blessed and Cursed cards, as a zod discriminated union on `kind` (`src/features/cards/schema.ts`). True Words live in `trueWords/{wordId}`, with their own schema, rules block and provider.
- **Behavior is hard-wired to the kind.** `isDrawable` and `cursedPool` in `src/features/cards/pool.ts` decide draws, packs and the pool distribution, and `packPools` in `src/features/packs/catalog.ts` decides pack candidates. In `firestore.rules`, `validCard` lets only a normal card have a `holder`. `drawnInto` and `chosenFromPack` check the kind, the status and `dmOnly`.
- **True Word ownership is separate.** It is split over `userTrueWords` (learned records), `playerWords` (what the rules read without a query: `known`, `openDraftId`, `recordId`), `wordDrafts` and `wordUses`. A card's use closes its holding (`userCards`) and stores the payment on it. A word's use is a `wordUses` record with a `wordUse` ledger entry.
- **Character effects.** `characterEffects` rules accept a card effect only together with a holding closed in the same request (`followsCardUse`), and a word effect only with a word use created in it (`followsWordUse`). Held effects are derived on the client (`characters/heldEffects.ts`) from active holdings and active word records.
- **Rule limits.** `firestore.rules` is about 93 KB, against a 256 KB limit. The largest requests (a pack choice with its Cursed card, a use with its effect) already make many `get()`/`getAfter()` calls. A batched write may make at most 20.
- **Dev data.** The emulator data is the only data. The owner chose to wipe it and load it again (proposal, last point).

## Goals / Non-Goals

**Goals:**
- One place decides each behavior. A flag on the definition is read by the pure pool helpers on the client and by the rules on the server, never re-derived from the kind.
- Today's behavior is the starting point. A definition created with its kind's starting flags behaves exactly as it does today, so the existing scenarios still hold for imported data.
- True Words move onto the card paths without changing what a player sees. Their own rules stay: the price, no word twice, one open draft, no transfer.

**Non-Goals:**
- An upgrade path for stored data. Every write path writes the full new shape, and nothing reads the old one.
- Server checks on the cards a pack or a draft offers when it opens. Today's rules check the chosen or drawn card only, and the same stays true.
- New screens. The three list screens and the hand tabs keep their layout. Only the forms gain a section.

## Decisions

### D1. One `cards` collection, two app types
- **The schema.** `cards/{cardId}` keeps its ID scheme: `legend-…`, `cursed-…`, and `tw-…` for True Words. The zod union gains a fourth member, `kind: 'trueWord'`:
  - `setCode`, `rarity` and `mechanicPack` are `null`
  - `holder` is `null`
  - `cost` is required unless the word is a draft
- **The types.** The app keeps two types parsed by that one schema: `Card` (normal, Blessed, Cursed) and `TrueWord`. Existing code that handles cards keeps compiling without a fourth case, and True Word code gets a narrow type.
- **The provider.** `CardsProvider` makes the only subscription: all documents for the DM, `status in ['active','retired']` for players. It splits the snapshot by kind:
  - `useCards()` / `useCardsById()` keep their meaning for cards only
  - new `useWords()` / `useWordsById()` give the True Words
  - `TrueWordsProvider` reads the words from there instead of `trueWords`
- **Alternative considered:** two queries on `cards` filtered by kind. That is two listeners on one collection and still the same split. Rejected.

### D2. Flags are required booleans, with one source of starting values
- **Storage.** Each definition stores all eight flags: `isInLibrary`, `isInDraws`, `isInSetPacks`, `isInMechanicPacks`, `isRepeatable`, `hasHeldEffect`, `hasUseEffect`, `isKeptOnUse`. The data is wiped (D11), so there is no missing-field default:
  - zod uses plain `z.boolean()`
  - the rules require `is bool` for each flag
  - the flags join `definitionKeys()`
- **Fixed flags.** The flags a kind fixes are enforced in both places. In zod they are literals on the kind's member, for example `isKeptOnUse: z.literal(true)` for `trueWord`. In the rules a `fixedFlags(data)` helper checks them.
- **Starting values.** `startingFlags(kind, text)` gives the values for a new definition, with `hasHeldEffect` taken from `/^\s*Held:/i`. It lives in `src/features/definitions/flags.ts`, with the Turkish labels and the per-kind visibility. Scripts cannot import app code, so `scripts/lib/cardCatalog.ts` keeps a copy, and the existing drift test is extended to compare the two.
- **`dmOnly`** is deleted everywhere: the schema, the rules, the snapshots, the scripts and the UI.

### D3. Availability and channels as small pure helpers
`src/features/cards/pool.ts` replaces `isDrawable` and `cursedPool` with:

- **`isAvailable(c)`:** `status === 'active' && (c.isRepeatable || c.holder === null)`
- **`inRandomDraw(c)`:** kind normal or Blessed, `isInDraws`, available
- **`inCursedDeck(c)`:** kind Cursed, `isInDraws`, available. This is also the pack's Cursed slot.
- **`inSetPacks(c)` / `inMechanicPacks(c)`:** the flag and available. `packPools` filters each pack's candidates with them. The Golden and Cursed Golden Packs use `inMechanicPacks`.
- **`isInPool(c)`:** available and at least one of the three channel flags. The library's Durum, the pool count and "Yalnızca havuzdakiler" use it. A card with all three flags off is "DM'e özel".
- **`inWordDraft(w, known)`:** active, `isInDraws`, not known

Every consumer goes through these: draws, packs, the pool distribution, the library and the draft start. So no screen re-derives a rule. A unit test covers the flag matrix for each kind.

### D4. The holder follows `isRepeatable`, in the rules and the app
- **The card shape.** `validCard` allows a non-null `holder` only when `isRepeatable == false`. A `trueWord` must always be repeatable.
- **The holder rules.** `takenFromPool`, `releasedByClosedHolding`, `movedByTransfer` and the holding-side checks in `userCards` change their `kind == 'normal'` tests to `isRepeatable == false`. A Cursed card with one copy then gets a holder from a Cursed draw or a pack's Cursed slot, through the same path a normal card uses.
- **Turning it on.** `changedByDm` allows `false → true` only when the stored `holder == null`.
- **Turning it off.** `true → false` is always allowed. The holder stays `null`, so the copies already in hands behave as the DM's extra copies do today. This needs no new rule.
- **Alternative considered:** a counter of open holdings on the card, so that turning it off could also be checked. It would add a write to every give, draw and close. Rejected.

### D5. True Words are holdings, drafts are draws, kept uses are `uses`
- **Learned words.**
  - A learned word is a `userCards` holding with `cardKind: 'trueWord'` and `givenVia: 'draft'` (with `drawId` naming the draft) or `'dm'`. `GIVEN_VIA` gains `draft`.
  - Taking a word back closes the holding with `returnReason: 'discarded'`. The log and the details call it "geri aldı" from the kind.
  - A True Word holding is never closed as used or transferred. The rules deny both for `cardKind == 'trueWord'`.
- **`playerWords`.**
  - It keeps `known` (word ID → holding ID) and `openDraftId`. `recordId` becomes `holdingId`.
  - Its rules (`gainsRecord`, `teaches`, `takesBack`) point at `holdingPath` instead of `learnedWordPath`.
  - The `userCards` create rule gets two True Word branches, `learnedFromDraft()` and `taughtByDm()`, moved from `userTrueWords`. `givenByDm()` refuses `trueWord`, so a word can only be taught through the branch that updates `playerWords`.
- **Drafts.**
  - A draft is a `draws` document with `kind: 'wordDraft'`. Its fields are today's draft fields, with `learned: { cardId, cardName, holdingId }`.
  - The `wordDrafts` rules move into the `draws` block as `kind == 'wordDraft'` branches. They keep `tableFree()` on every step and never touch `table/main`.
  - The open drafts are read with `where('kind','==','wordDraft').where('status','==','open')`. Two equality filters need no composite index.
- **Kept uses.** `uses/{useId}` replaces `wordUses` for every card whose `isKeptOnUse` is on, True Words included. A use record holds:
  - who: `uid`, `by`
  - what: `cardId`, `cardName`, `cardKind`, `holdingId`
  - when: `at`
  - the payment: `cost`, `entryId`
  - the character: `usedOn`, `usedOnCharacterId`

  The rules require:
  - an open holding of that card for `uid`
  - the card's `isKeptOnUse`
  - the payment as for a card's use, priced from the cost in the hand (`costOverride` before the card's cost)

  The ledger source `wordUse` becomes `keptUse`. `use` stays for a use that closes its holding. `closesAsUsed()` refuses a card whose `isKeptOnUse` is on.
- **Alternative considered:** keeping `wordDrafts` and `wordUses` as their own paths and only moving the definitions and learned words. The owner chose the full merge, and `uses` is needed for kept cards anyway.

### D6. Held effects are derived from the flag, uses check `hasUseEffect`
- **New holdings.** Every holding-creating rule path requires `active == card.hasHeldEffect`, except a transfer, which copies `active`. This covers a give, a draw, a pack choice and its Cursed card, learning from a draft, and teaching.
- **Switching.** Switching `active` requires `card.hasHeldEffect`.
- **Showing.** The client shows a holding as active only when `holding.active && card.hasHeldEffect`, through one helper used by the hand marks, `heldEffects`, `ActiveWordsPeek` and the hand summary. Turning the flag off then hides an active holding at once without rewriting holdings.
- **Use effects.** `followsCardUse` and `followsWordUse` become one `followsUse(data)`. It reads the holding (closed now as used) or the `uses` record (created now), then its card, and requires `card.hasUseEffect`. The source is `'word'` for a True Word and `'card'` otherwise. `cursed` is set only for a Cursed card.
- **The UI.** `CharacterPicker` gets an `offersEffect` prop from the card, which hides "Aktif efekt olarak ekle" when the flag is off.

### D7. Flag changes, visibility and records
- **Waiting for an open pack.** `changedByDm` requires `tableFree()` when the status changes, or when any of `isInDraws`, `isInSetPacks`, `isInMechanicPacks`, `isRepeatable` changes. Unlike `dmOnly`, `isInLibrary` does not wait.
- **Who reads a record.** `visibleSnapshot(s)` becomes `s != null && s.status in ['active','retired'] && s.isInLibrary == true`. `isPublicStep` and the picture import's record split use the same test.
- **Snapshots.** The card snapshot (`cardSnapshotSchema` and the rules' `cardSnapshot`) gains the eight flags. The word snapshot merges into it.
- **The record target.** `definitionChanges.target` stays `'card' | 'word'`, with `'word'` exactly when the kind is `trueWord`, so the log keeps "True Word" in its texts. Both targets resolve to `cards/{id}`.
- **Log lines.** `eventText.ts` adds the flag fields with the form labels, the draw flag's label chosen by the snapshot's kind, and "evet"/"hayır" values.

### D8. One "Davranış" section for both forms
- **The component.** A `BehaviorSection` in `src/features/definitions/` takes the kind, the values, the stored definition (for `holder`) and the table state. It renders the two groups, the "Sadece DM verebilir" button and its note, and the greyed-out boxes with their reason:
  - "Bir Pack açık: seçim bekleniyor." (the existing `TABLE_BUSY_NOTE`)
  - "Kart bir oyuncunun elinde."
- **Where it is used.** `CardFormDialog` and `WordFormDialog` both use it, in place of the "Sadece DM verebilir" checkbox.
- **Following the text.** While a definition is added, the form keeps a `heldTouched` state, and "Elde etkili" follows `startingFlags(kind, text).hasHeldEffect` until the DM touches the box.
- **Changing the kind.** A kind change resets the flags to `startingFlags`.
- **The status filter.** The value `'dmOnly'` becomes `'hidden'`, labelled "🔒 DM", and the True Words screen gets the same options as the card screens.

### D9. The hand reads True Words from holdings
- **One holdings subscription.** `HoldingsProvider` already reads every holding. Hand entries split by `cardKind`: the Kartlar tab, the summary tiles and every card count leave `trueWord` out ("True Words are not cards"), and the True Words tab takes them.
- **The details.** `TrueWordDetails` gains the note on cream paper and the DM's cost field, by reusing the pieces `HoldingDetails` uses (`NotePaper`, the cost field). It shows "Aktif et" only with `hasHeldEffect`, and "Başkasına ver" never.
- **The use step.** One step, `closeHolding` with the reason `used`, serves cards and words alike, and branches inside its transaction on the definition's `isKeptOnUse`, read there: kept → a `uses` record with its payment, the holding left open; otherwise → the holding closes. The client never chooses the branch, so a flag changed meanwhile cannot make it pick the wrong one, and the rules check the same flag.

### D10. Log and statistics read the new sources
- **The İşlem Logu.**
  - It reads holdings (learned and taught words among them), draws (with `wordDraft`), `uses`, the ledger, the change records and the set records.
  - A True Word holding given via `dm` is a "taught" event, never a "card given" event. Closing one is a "took back" event. A word learned from a draft stays inside the draft's event.
  - A `uses` record is one event: the card-use text for cards, the True Word text for words.
  - `keptUse` ledger entries are folded into their use, as `use` and `wordUse` were.
- **Statistics.** `cardHistory` adds the card's `uses` (`where('cardId','==',id)`), and `setStats` reads all `uses`, as it reads all holdings. "Kullanıldı" and the LP paid add both sources. True Word IDs never appear in a card page, because the library route refuses the `trueWord` kind.

### D11. Imports, pictures and the dev data reset
- **`import-cards`** writes `startingFlags` on every card it adds.
- **`import-true-words`** writes `kind: 'trueWord'` documents into `cards`, with ID `tw-<nameKey>`. Its "only adds" match looks only at stored True Words in `cards`.
- **`import-pictures`** finds words among the `cards` documents of kind `trueWord`, and splits its records by D7's visibility test.
- **Word pictures** stay at `words/<id>/<hash>.webp`, so `storage.rules` does not change. `validPicture` picks the folder by kind.
- **The reset** follows the Migration Plan below. It needs no code beyond the scripts that already exist.

## Risks / Trade-offs

- **[Largest change so far]** It touches about a dozen features, the rules and a 5,300-line rules test file. → The tasks go layer by layer: schema and helpers, rules with their tests, providers and screens, log and statistics, scripts, docs. `npm run check` and `npm run test:emulator` run at each layer boundary, not only at the end.
- **[Rule access calls]** The flag checks add `get()`s to the largest requests. Examples: a pack choice with its Cursed card and two holders; a kept use with its ledger entry, LP and effect; learning from a draft with `playerWords`. → Most read card documents those rules already read. Each of these batches gets an emulator test, which fails when the 20-call limit is passed. If one does, the check moves to the create of the record that names the card, as `drawnInto` does today.
- **[Flag combinations nobody has used]** Examples: a Cursed card with one copy, a kept normal card, a Blessed card only in Mechanic Packs. → D3's matrix test over the pure helpers, and rules tests for the holder paths of a Cursed card with one copy and for a kept card's use.
- **[Turning `isRepeatable` off is not checked against hands]** → Accepted in explore. The copies become extra copies, and the card stays in the pool.
- **[Hidden cards are hidden in the interface only]** Players' devices still read them, as with `dmOnly`. → Accepted earlier (DM-only decision A), and unchanged.
- **[Dev data loss]** → The owner chose the wipe. `.firebase-emulator-data/` is backed up to the session scratchpad first, and the wipe waits for the owner's explicit go-ahead.

## Migration Plan

1. Implement and pass `npm run check` and `npm run test:emulator`. Those run on their own emulators, so the owner's data is untouched.
2. Stop any dev session as `CLAUDE.md` says, so the emulators export. Copy `.firebase-emulator-data/` to the scratchpad as a backup.
3. Ask the owner to confirm the wipe. Start the emulators, delete every Firestore document and every Storage object through the emulator REST endpoints, and keep the Auth accounts.
4. Recreate the three profiles (DM, Oyuncu 1, Oyuncu 2) as on 2026-11-11, and run `npm run set-role` for the DM.
5. Load the data again:
   - `npm run import-sets -- --source ~/Downloads`
   - `npm run import-cards`
   - `npm run import-true-words`
   - `npm run import-pictures -- --source ~/Downloads`
6. Check the counts (745 cards, 53 True Words, 12 sets, the pictures) and a few flags: "Held:" cards are "Elde etkili", and Cursed cards are repeatable. Stop the emulators so they export.

**Rollback:** `git revert` the change and restore the backed-up `.firebase-emulator-data/`.
