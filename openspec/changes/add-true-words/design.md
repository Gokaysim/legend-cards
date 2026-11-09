# Design

## Context

See proposal.md for the motivation and the owner's four decisions:
- the draft costs 1 LP plus the number of words the player knows
- a player starts a draft for themselves, and the DM for anyone
- an open draft is saved and ends by learning, "Pas Geç", or the DM's cancel with a refund
- the DM teaches and takes back words

The current state that shapes the approach:

- **Hub rules.** Every multi-document step is a client transaction that the Firestore rules check document by document. Each document checks the others with `get`/`getAfter`/`existsAfter` (`firestore.rules`). Examples:
  - a balance points at its newest ledger entry (`users.lpEntryId`, `party.gpEntryId`)
  - a normal card points at its open holding (`cards.holder`)
  - a pack opening takes `table/main`
- **Rule lookup budget.** A rule evaluation is limited to 10 document lookups per document, and the request to 20. `add-pack-shop` proved its heaviest steps on the emulator. The same check applies here.
- **The table lock.** `tableFree()` is required by every card movement, draw and balance change except a pack's own steps. The client mirrors it with `useIsTableBusy()`, and `explainDenial` turns a denial into `TableBusyError` (`src/features/table/`).
- **Packs as a model.** `src/features/packs/api.ts` already has a paid, two-step flow that is saved while open: open, choose or cancel with a refund. The pick happens outside the transaction, and a denial is re-read to tell a race from a real denial.
- **The card import.** `scripts/import-cards.ts` with `scripts/lib/{cardRows,importCards,target,messages}.ts` validates first, then plans and writes merges by normalized name, retires instead of deleting, and prints Turkish reports.
- **The log.** `src/features/activity-log/` reads four queries:
  - given holdings
  - closed holdings
  - draws, including packs
  - manual ledger entries

  Each record is exactly one event, so the 50 newest events are among each query's 50 newest records.
- **Providers.**
  - `CardsProvider` loads every card app-wide.
  - `HoldingsProvider` loads every open holding app-wide.
  - `TableProvider` and `PacksProvider` load the lock and the open pack.

## Goals / Non-Goals

**Goals:**
- The server enforces every rule in the true-words spec: the price, one open draft per player, no word twice, who may do what, and the table lock. This holds even against a modified client.
- Reuse the pack flow's shape: transactions, re-reading on denial, Turkish failures, test providers.
- Keep the log exact when paging, with one event per record.
- Keep the hand screen's existing card behavior unchanged behind a tab.

**Non-Goals:**
- Server-side randomness. As for draws and packs, the client picks the 3 words, and the rules check everything else.
- Showing on the True Words screen which players know a word. Only the chosen player's knowledge is marked.
- True Word pictures, the hover preview and the Cardmaker. These come with card-images.

## Decisions

### D1. Four new paths, and drafts outside `draws`

```
trueWords/{wordId}          name, nameKey, cost (string as written), text, retired
                            id: "tw-" + nameKey, e.g. tw-ancientword; written only by the import script

userTrueWords/{recordId}    wordId, wordName, uid, learnedAt, learnedBy, learnedVia: draft | dm,
                            draftId (draft only, else null), active,
                            removedAt, removedBy (null while known; set once by the DM's take-back)

playerWords/{uid}           known: { [wordId]: recordId }, openDraftId: string | null,
                            recordId: the record whose learning or take-back last changed `known`
                            missing document = knows nothing, no open draft

wordDrafts/{draftId}        uid, by, at, offered: [3 wordIds], status: open | learned | skipped | cancelled,
                            paidWith: lp | none, cost, entryId, closedAt, closedBy,
                            learned: null | { wordId, wordName, recordId }, refundEntryId
```

The ledger gets the source `wordDraft`. Its `drawId` names the draft, so no new ledger field is needed. The domain doc will say "the draw, pack opening or True Word draft".

**Why `wordDrafts` and not `draws` with a new kind.**
- `draws` records cards that went into a hand. Its union, the log's `eventOfDraw`, and the rules' create and update branches would all grow a third shape with no card in it.
- A separate collection keeps the draws rules unchanged, at the cost of one more log query.
- *Alternative considered:* `draws` with `kind: 'wordDraft'`, which would keep the log at four queries. It was rejected for the coupling above.

**Why `playerWords/{uid}`.** The rules cannot query. Three checks need per-player state readable with one `get`:
- the price, from `known.size()`
- no word twice, from `wordId in known`
- one open draft, from `openDraftId`

`recordId` plays the role of `lpEntryId`: it points at the record that explains the newest change to `known`, so the rules can tie the two together.
- *Alternative considered:* the same fields on `users/{uid}`. It was rejected because the profile's update rule already has four branches (name and picture, manual LP, draw, pack), each guarded by `onlyChanges`. A separate document keeps both rules small.

**Why records are never reused.** Taking back closes a record (`removedAt`). Learning or teaching the same word later creates a new record. So the log keeps both the original learning and the take-back. *Alternative considered:* a record ID made from the player and the word, reopened on re-learning. It was rejected because reopening rewrites history.

### D2. Rules per step

Every step below also requires `tableFree()`, except switching a word active (spec: pack-shop, "The table waits for an open pack").

| Step | Writes | Who | Key checks |
| --- | --- | --- | --- |
| start | `wordDrafts` create, `playerWords` set, + ledger entry and `users.lp` when paid | the player for themselves, or the DM | 3 distinct IDs, none in `known`. No open draft before, and `openDraftId` becomes this draft. A player pays `paidWith: 'lp'`, `cost == 1 + known.size()`. The DM pays `none`/0 or `lp` 1..1,000,000. `paysWith(entryId)` as for packs |
| learn | `wordDrafts` open→learned, `userTrueWords` create, `playerWords` update | the draft's player or the DM | the word is in `offered`, not in `known`, and `trueWords/{w}` exists and is not retired. The record is created now, with `learnedVia: 'draft'` and this `draftId`. `known` gains exactly `w → recordId`, and `openDraftId` becomes null |
| skip | `wordDrafts` open→skipped, `playerWords` update | the draft's player or the DM | `onlyChanges(['status','closedAt','closedBy'])`, and `openDraftId` becomes null |
| cancel | `wordDrafts` open→cancelled, `playerWords` update, + ledger refund and `users.lp` when paid | the DM | the refund returns exactly `cost` to `uid`'s LP (`refundsWordDraft`), and `openDraftId` becomes null |
| teach | `userTrueWords` create, `playerWords` set | the DM | `learnedVia: 'dm'`, `draftId: null`, the word exists, is not retired and is not in `known`. `known` gains exactly `w → recordId` |
| take back | `userTrueWords` update (`removedAt`, `removedBy`), `playerWords` update | the DM | the record was open. `known` loses exactly `w`, and `recordId` is this record |
| active | `userTrueWords` update | the DM | `onlyChanges(['active'])` on an open record. No table check |

- **`playerWords` checks consistency only.** Each `known` change goes through `request.resource.data.known.diff(before.known)`:
  - learning or teaching adds exactly one key
  - taking back removes exactly one key
  - nothing else changes

  The key and record come from the record named by `recordId`. Each `openDraftId` change is explained by the draft it names: created now, or ended now. *Who* may act is decided on the draft and record documents, as `users.lp` leaves that to the ledger.
- **The ledger.** A `forWordDraft()` branch, like `forPack()`, covers the payment and the refund. Unlike `forPack()`, it requires `tableFree()`. The users rule gets `lpSetByEntry('wordDraft') && (isSelf(uid) || isDm())`.
- **Retired words are checked at learn and teach time only.** The draft does not check that the offered words exist. That would cost 3 lookups on the heaviest step, and a forged ID only hurts the forger: they paid for a draft whose fake word can never be learned.

**Budget.** The heaviest requests touch up to about 7 distinct documents, before and after:
- a paid start: the draft, `playerWords`, the ledger entry, the user, `table/main`, and the actor's profile for `isDm()`
- a cancel with refund
- a learn: the draft, the record, `playerWords`, the word, `table/main`, and the actor's profile

This is within 20 per request and 10 per document. Emulator rules tests cover each of these at its heaviest: the DM's paid start, the DM's cancel with refund, and the DM learning for the player.

### D3. Client flow mirrors packs

`src/features/true-words/api.ts` exports:
- `startDraft(db, { uid, by, amount | 'price', random })`
- `learnWord(db, { draftId, wordId, by })`
- `skipDraft`
- `cancelDraft`
- `teachWord`
- `takeBackWord`
- `setWordActive`

Each multi-document step is one transaction:

- **Start.** The 3 words are picked outside the transaction, from the active words not in the player's known set (`sample` from `src/lib/random.ts`). Inside the transaction:
  - read `table/main`, `playerWords/{uid}` and the user's LP
  - recompute the price
  - if a picked word became known meanwhile, abort with a retry marker, and re-pick outside (at most 5 tries, like draws)
- **Failures** are typed, as in `packs/errors.ts`:
  - `too-few-words`
  - `insufficient` with the LP
  - `draft-open`
  - `word-known`
  - `table-busy`
  - `offline`
  - `permission-denied`
  - `unknown`

  Each has a Turkish message. `explainDenial` (table) maps a denial during a pack to `table-busy`.
- **Re-reading on denial.** A denied learn re-reads the draft. If it is no longer open, someone else ended it (the DM, or the other device), and the UI just follows the live draft.

### D4. One app-wide provider

`TrueWordsProvider` subscribes to three collections and exposes them through `useTrueWords()`, along with the action hooks:
- every `trueWords` document (53, retired included, so known retired words still render)
- every open record (`userTrueWords` where `removedAt == null`)
- every open draft (`wordDrafts` where `status == 'open'`)

All three are small at this table's scale, a handful of players with tens of words each. One subscription each serves the hand summary of any hand, the True Words tab, the screen's "Biliyor" marks, and the open draft panels. This mirrors `HoldingsProvider`.

- *Alternative considered:* per-screen queries. They were rejected for the same reason holdings did not use them: the summary and the screen would each subscribe again, and each hand switch would flash a loading state.
- `TestTrueWordsProvider`, fixtures (`src/test/trueWordFixtures.ts`) and a `renderApp({ trueWords })` option follow the existing pattern.

### D5. Screens

- **True Words screen** (`/true-words`, `?for=<uid>` for the DM, as in the Pack Shop).
  - The header has the DM's "Kimin için" select, and the draft start: price, LP and the disabled reasons.
  - Then the open draft panel, if any.
  - Then the word grid, sorted with `compareLabels`. A word tile is drawn in CSS: ✦, name, a cost badge "`<cost>` LP", the visible text, and "Biliyor" for known words.
- **Starting.**
  - A player confirms "Draft başlat: 3 LP ödenecek".
  - The DM gets a confirm dialog with the amount, prefilled with the price, and the note "0 = ücretsiz". The dialog reuses the Pack Shop confirm dialog's amount field pattern, LP only.
- **Open draft panel** (`OpenDraftPanel`), shown on both the screen and the hand tab.
  - It shows the 3 word tiles with "Öğren" for the player and the DM. A word known meanwhile is marked "Zaten biliyor" and disabled.
  - It has "✕ Pas Geç", with a confirmation that names the payment that will not come back.
  - For the DM it has "İptal et ve iade et", with a confirmation.
  - Everyone else sees it read-only, live.
  - It is an inline panel, not a modal, because a draft does not stop the table (spec: "Drafts do not hold the table").
- **Hand screen.**
  - **Tabs.** `HandsPage` gets "♠ Kartlar" / "✦ True Words" tabs, kept in the URL as `?tab=true-words`, so the True Words screen and the log can link straight to a player's words. The default stays the cards, unchanged.
  - **The True Words tab** (`HandTrueWords`) has the open draft panel, the words in learn order, "✦ True Word Draft" (a link to `/true-words?for=<uid>`), and the DM's "+ True Word öğret".
  - **Word details** (`TrueWordDialog`). For the DM it offers "● Aktif et" / "✓ Aktifliği kaldır" and "Geri al", with a confirmation. For others it is read-only.
  - **The teach dialog** (`TeachWordDialog`) searches the active words the player does not know, using the library's search matcher on name and text.
- **Summary.**
  - `HandSummary` gets the "✦ True Words" stat.
  - "Aktif efekt" counts the active cards plus the active words.
  - The list shows the active words after the active cards, marked ✦.
- **Table busy.** Start, learn, skip, cancel, teach and take back are disabled with `TABLE_BUSY_NOTE` while a pack is open. The active switch is not.

### D6. Log: three more queries, three more event kinds

`logQueries` gains three queries:
- `drafts`: `wordDrafts`, by `uid`, ordered by `at`.
- `taught`: `userTrueWords` where `learnedVia == 'dm'`, ordered by `learnedAt`. Words learned in a draft belong to the draft's event, so they are left out at query level.
- `takenBack`: `userTrueWords` where `removedAt != null`, ordered by `removedAt`.

Each takes the user filter on `uid`. The ledger query already keeps only `source == 'manual'`, so draft payments and refunds are left out with no change.

Events:
- `wordDraft`, at the draft's `at`
- `wordTaught`, at `learnedAt`
- `wordTakenBack`, at `removedAt`

A taught record that was later taken back yields one event from each query, under different keys. Each query still returns at most one event per record, so paging stays exact.

**Indexes:**
- `wordDrafts (uid, at↓)`
- `userTrueWords (learnedVia, learnedAt↓)`
- `userTrueWords (uid, learnedVia, learnedAt↓)`
- `userTrueWords (uid, removedAt↓)`

The provider combines seven subscriptions instead of four. That is acceptable for one screen.

### D7. Import script

`scripts/import-true-words.ts` (`npm run import-true-words -- [--file <csv>] [--dry-run] [--project <id>] [--yes]`) reuses the card import's parts:
- `target.ts`: emulators by default, with a confirmed real project
- `normalize` from `cardCatalog.ts`
- the batch writer pattern of `importCards.ts`

The card import's CSV reading (`readRecords`, `normalizeHeader`) moves into `scripts/lib/csv.ts` so both imports share it. `cardRows.ts` imports it from there, with no behavior change; its tests keep passing as they are.

New pure modules:
- `trueWordRows.ts` validates rows: required Name, Cost and Text columns; a cost of 1 to 10 characters; duplicate names; a warning on empty text.
- `importTrueWords.ts` plans added, updated, unchanged, retired or restored, and applies merges in batches.

Turkish report texts go in `messages.ts`. Each word is stored with `cost` exactly as written, trimmed, so "X" stays "X".

## Risks / Trade-offs

- **[Risk] The client picks the words, so a modified client could choose its own 3.** → It would still pay the full price, could not offer a known word, and could pick only real words to learn. The owner accepted the same trade-off for draws and packs.
- **[Risk] `playerWords` and the records drift apart.** For example, a crash between writes. → Every change happens in one transaction, and the rules require the two to agree in the same request. Neither can be written alone.
- **[Risk] The lookup budget on the heaviest steps.** → Retired words are checked only at learn time (D2), and `get` calls on the same path are cached. Emulator tests cover the heaviest requests. If one exceeds the budget, the offered-word checks move from the start to the learn step.
- **[Trade-off] An open draft does not lock the table, but a pack locks the draft.** A draft's steps wait while a pack is open, as the owner wanted ("nobody acts until the choice is made"). A draft open before the pack stays open and continues afterwards.
- **[Trade-off] "Pas Geç" keeps the payment.** This follows the rules page: the price buys the look at 3 words. It is confirmed in the UI, and only the DM's cancel refunds.
- **[Trade-off] Seven log subscriptions.** They are acceptable at this data size. If the log grows slow, the sources could later share a single derived feed.

## Migration Plan

1. Deploy the rules and indexes with the code. On the emulators this happens automatically.
2. Run `npm run import-true-words` once. On a real project, add `--project <id>` and confirm it.
3. Before going live, the DM enters each player's current True Words with "+ True Word öğret".

No data migration is needed. A missing `playerWords/{uid}` reads as "knows nothing, no open draft".

**Rollback:** revert the change. The new collections stay unused, and the catch-all rule makes them unreadable again.
