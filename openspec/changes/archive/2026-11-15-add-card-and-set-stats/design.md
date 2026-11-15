# Design

## Context

See proposal.md for the motivation, and `specs/card-stats/spec.md` for the counting rules and the pages. The current state that shapes the approach:

- **The records are permanent and readable by everyone.**
  - `userCards` keeps every holding, open and closed. A holding has `cardId`, `uid`, `givenAt`, `givenBy` and `givenVia` (`dm`, `draw`, `pack` or `transfer`), and `drawId` for a draw or pack.
  - A closed holding also has `returnedAt`, `returnedBy` and `returnReason` (`used`, `discarded` or `transferred`), and for a use `usedOn` and `useCost`.
  - `draws` keeps card draws, which have `cardId`, `by`, `paidWith` and `cost`.
  - `draws` also keeps pack openings, which have `offered` (card IDs), `revealed` (positions), `status`, `chosen` and `cursed`.
  - `firestore.rules` lets every signed-in user read both collections, so list queries need no rule change.
- **Only open holdings are shared.** `HoldingsProvider` subscribes to `returnedAt == null`. Closed holdings are read only by the İşlem Logu, through `ActivityLogProvider`: a provider that injects hooks, and that the log page calls while it is shown (docs/conventions.md, "Data for one screen").
- **Detail routes already exist.**
  - `HAND_ROUTE` (`/hands/:uid`) sits below its menu entry's path, so the sidebar's `NavLink` keeps "Oyuncu elleri" marked.
  - `PlayerHandPage` handles a missing player with "Böyle bir oyuncu yok."
- **Faces and their corner icons.** `CardFace` draws its corner icons, the magnifier and the DM's edit, at fixed positions in the face's top row (`MAGNIFIER_POSITION`, `EDIT_POSITION`). They show on hover and focus, and always on devices without hover. Presses on elements marked `data-face-control` do not count toward the face's own double click.
- **Card visibility on a device.**
  - `useCardsById()` holds every card the device reads: active and retired ones, and DM-only ones for everyone. Drafts reach the DM's device only.
  - `statusLabel()` and `useCardStatuses()` give the library's Durum text.

## Goals / Non-Goals

**Goals:**
- Both pages derive everything from records that exist today, with no new data path, rule or composite index.
- The counting is pure functions that take records and the current time. That is where the spec's scenarios are tested.
- The pages subscribe only while they are shown, as the İşlem Logu does.

**Non-Goals:**
- Server-side aggregation or stored counters.
- Sharing the İşlem Logu's sentence builder. Its sentences are about the table and name the card. The history is about one card and never needs to name it.

## Decisions

### D1. Compute on read; store nothing

Both pages count from the raw records each time a snapshot arrives.

- **Alternative: counters on each card** (`timesUsed`, `timesDiscarded`, …). Rejected:
  - every holding step would also have to write the card, and `firestore.rules` would have to check each counter against the step that changed it
  - existing history would need a backfill
  - races between devices would become a rules problem
- **Alternative: a Cloud Function that aggregates.** Rejected: the project has no functions, and the emulator-first workflow would gain a new runtime.

Computing on read also keeps the pages from ever disagreeing with the İşlem Logu, which reads the same records.

### D2. A card's page: three single-field queries

The card page subscribes to three queries:

- `userCards where cardId == <id>`: every holding of the card, open and closed
- `draws where cardId == <id>`: its card draws, for how each was drawn and paid for. Pack openings have no `cardId`, so they never match.
- `draws where offered array-contains <id>`: every pack that showed it

None of the queries orders or adds a second filter, so Firestore's automatic single-field indexes serve them and `firestore.indexes.json` does not change. The rows are sorted on the device: there are only a few dozen per card.

### D3. A set's page: the whole holdings collection and every pack opening

Holdings do not record a set, so a set's page cannot ask for only its own holdings. It subscribes to:

- the whole `userCards` collection
- `draws where kind == 'pack'`

It then keeps the records of the cards it counts. A group of a few players produces some hundreds of holdings a year, each under 1 KB, so a page open reads a modest number of documents and later changes arrive as deltas.

- **Alternative: add `setCode` to every holding.** Rejected for now: a new field, a rules check against the card, and a backfill, for a cost that is small at this table's size. See Risks.

### D4. A `stats` feature with injected hooks

`src/features/stats/` holds:

- `api.ts`: the queries of D2 and D3
- `StatsProvider.tsx`: injects `useCardRecords(cardId)` and `useAllRecords()`. Each combines its subscriptions with `combineSubscriptions`, exactly like `ActivityLogProvider`. The helper moves from the log's context to `src/lib/firestore/subscription.ts`, because a feature does not import another feature's internals (docs/conventions.md).
- `statsContext.ts`
- `TestStatsProvider` in `src/test/`, with a `stats` option on `renderApp`, so page tests never load Firebase

Nothing subscribes until a page calls a hook.

- **Alternative: subscribe in the shared providers.** Rejected: every device would pay for every closed holding all the time, for two pages that are opened rarely.

### D5. Pure counting in two modules

- **`cardHistory.ts`** takes a card's holdings, card draws and pack openings, the profiles' names and `now`. It returns the tile values (`CardStats`) and the history rows (`HistoryRow[]`).
  - A transfer is one row, built from the closed holding with `returnReason: 'transferred'`. The receiving holding, `givenVia: 'transfer'`, adds no row.
  - A pack opening adds a "seen" row only for a revealed position that was neither `chosen` nor `cursed`. A pack that gave the card adds no row of its own, because its holding's row names the pack.
  - A holding whose server time is still pending (`givenAt` or `returnedAt` is `null`) counts at `now`.
- **`setStats.ts`** takes the set's counted cards, the holdings, the pack openings, the statuses and `now`. It builds a map from card ID to `CardStats` in one pass over the records. It returns the tiles, from the sum of the rows, and one table row per card.

### D6. Card-centric wording

The row texts live in `historyText.ts`:

- They use the Turkish suffix helpers in `src/lib/turkish.ts`: `genitive`, `dative` and `ablative`.
- They name packs with `packOpeningTitle()` from `packs/catalog.ts`.
- The DM is "DM", players go by their profile names, and a missing profile is "İsimsiz oyuncu", as in the library.

The patterns come from the chosen design:

| Event                       | Row                                                    | Details                                                    |
| --------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| DM's give                   | "DM, Dana'ya verdi"                                    | "Kart ver"                                                 |
| Player's draw               | "Bora çekti"                                           | "Rastgele çekiliş · 1 LP", or "Cursed çekiliş"             |
| DM's draw into a hand       | "DM, Bora'nın eline çekti"                             | "Rastgele çekiliş · ücretsiz"                              |
| Pack choice                 | "Ayla, Kesqerian Nights Premium Pack'ten seçti"        | "Pack'i Ayla açtı" or "Pack'i DM açtı"                     |
| Cursed card of a Cursed pack | "Kesqerian Nights Cursed Pack ile Ayla'nın eline geçti" |                                                            |
| Shown, not taken            | "Bora'nın Kesqerian Nights Standard Pack'inde göründü" | "Seçilmedi", "Pack iptal edildi", or "Pack açık" while open |
| Use                         | "Ayla kullandı"                                        | "Kael üzerinde · 1 LP" (DM's use: "DM, Ayla'nın kartını kullandı") |
| Discard                     | "Ayla'nın elinden discard edildi"                      | "DM"                                                       |
| Transfer                    | "Bora'dan Ayla'ya transfer edildi"                     | "DM"                                                       |

A use or a discard of a normal card that is not DM-only adds "kart havuza döndü" to its details, as the chosen design shows ("DM · kart havuza döndü").

### D7. Dates and days

- **Day grouping.** The log's day grouping (`groupByDay` and the `tr-TR` day and time formats in `ActivityLogPage.tsx` and `LogEventRow.tsx`) moves to `src/lib/days.ts`, generic over anything with an `at`. Both screens group the same way.
- **"Son kullanım"** uses `{ day: 'numeric', month: 'short', year: 'numeric' }`, which gives "14 Kas 2026".
- **"Elde kaldı"**:
  - the total is the summed milliseconds, divided by a day and rounded down
  - the average is the total time divided by the number of holdings, formatted with `tr-TR` and at most one decimal ("3,5")
  - `now` is read once, when the page opens (the React lint forbids reading the clock during a render). The page does not tick. A pending server time sorts above every other row.

### D8. Routes and the page guards

`screens.ts` adds `CARD_HISTORY_ROUTES` (`/library/:cardId` and `/cursed-deck/:cardId`) and `SET_STATS_ROUTE` (`/sets/:setId`), with two builders:

- `cardHistoryPath(card)` picks the deck screen from `card.kind`
- `setStatsPath(set)` uses the set's document ID

`routes.tsx` adds the three routes next to `HAND_ROUTE`. They sit below their menu entry's path, so the menu stays marked with no extra code.

`CardHistoryPage` resolves the card from `useCardsById()` and checks the spec's visibility: for a player, a card that is active and not DM-only, or one with an open holding (`useOpenHoldings()`). A wrong kind for the route also shows "Kart bulunamadı.". The check runs on the device and is about what the interface shows:

- The rules already let every signed-in user read these records.
- The library hides DM-only cards from players the same way.

`SetStatsPage` resolves the set from `useSets()` by ID.

### D9. Where the links go

- **`CardFace` gets `historyPath?: string`.** When set, the face draws a react-router `<Link>` as a corner control, marked `data-face-control`.
  - The control is a stroked clock icon, inline SVG with `aria-hidden`, named "<name>: geçmiş".
  - It sits one slot left of the edit control when there is one, else one slot left of the magnifier. That adds `HISTORY_POSITION` values next to the existing ones.
  - It shows and hides with the same classes as the other corner icons.
- **`CardBrowser` gets `linksHistory?: boolean`**, which only `LibraryPage` and `CursedDeckPage` pass. Its faces then get `historyPath`, and `CardTable` makes the Kart cell a link.
- **Other faces stay as they are.** Hands, draws, packs, the zoom view and "+ Kart ver" never pass it.
- **`HoldingDetails`** adds the "Kart geçmişi →" link under the labels.
- **`SetsPage`** wraps the set's name in a link, in both the table and the phone cards.

### D10. The set table is its own component

The table's columns are counts, not card fields, so `SetCardTable` is new rather than a variant of `CardTable`. It reuses:

- `compareLabels` and the cost order from `cards/sort.ts`
- the library's search (`searchTerms` and `matchesAllTerms` over the same haystack)
- the `table-scroll` look of the list views

Sorting is local state. It starts at Kullanıldı, descending, and ties go by name.

## Risks / Trade-offs

- **The set page reads every holding, and that grows with the campaign.** → The cost stays small at this table's size (D3). If it ever matters, store `setCode` on holdings in a later change, and the set page can then filter by set.
- **A Cursed card in an open pack that is not yet turned is in `offered`.** The card page's array-contains query returns that pack. → `cardHistory.ts` ignores positions not in `revealed`, so nothing face-down shows or counts (spec: "Counting cards shown in packs").
- **Collision with `improve-draw-and-give-dialogs`.** That change adds status badges to `CardFace` in the "+ Kart ver" grid. → The new prop is opt-in and the icon sits in the top row, where the badges do not go. Whichever change lands second rebases its `CardFace` edit.
- **Holdings whose card was deleted.** Only drafts are deleted, and drafts have no holdings, so this cannot happen. A holding whose card is missing from the device is skipped on a set's page, and a card page needs its card to exist.

## Migration Plan

Nothing to migrate. No data, rules or indexes change, so a deploy is the app alone, and rolling back is the previous build.
