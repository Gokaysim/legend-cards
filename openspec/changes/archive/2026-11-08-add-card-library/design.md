# Design

## Context

See `proposal.md` for the motivation, and `specs/` for the behavior contracts (`card-library`, plus the deltas to `admin-scripts`, `developer-workflow`, and `app-shell`).

**Current state**
- **Data.** Only `users/{uid}` is open. `firestore.rules` has no `isDm()` helper yet.
- **Target model.** The `add-user-roles` design ("Target data model") fixes the overall shape of `cards/{cardId}`:
  - kind, name, nameKey, set, cost, rarity, mechanicPack, text
  - `imageUrl`, added by card-images
  - `holder`, added by card-holdings
  - `retired`
- **Scripts.** `scripts/lib/target.ts` already picks the target, confirms real projects, and starts the Admin SDK. `set-role.ts` shows the command and logic split: logic returns results, and the command prints them.
- **Screens.** `LibraryPage` and `CursedDeckPage` are placeholders. `src/app/routes.test.tsx` expects every screen to show the placeholder text.
- **Owner's data.** The data now lives in `data/`, copied unchanged from `~/Downloads` (see the sketch below).
  - `legend-cards.csv` has 591 rows with the columns `Name, Set, Cost, Rarity, Drawn?, Text, Mechanic Pack, Shuffle`.
  - `cursed-cards.csv` has 154 rows with `Name, Set, Cost, Text`, and every Set is "Cursed".
  - `true-words.csv` has 53 rows with `Name, Cost, Text`.

  Observed in the data:
  - **Blessed cards.** 19 rows have the Set `Blessed`, the rarity `—`, and the cost `—`.
  - **"The Cartographer"** has no set, rarity, or mechanic pack.
  - **Missing costs.** Two normal cards have an empty cost.
  - **Spaces.** Three texts end with a space.
  - **Brackets.** 54 texts have `[bracket]` metadata.
  - **Accented names.** 34 names have accented letters.
  - **No collisions.** No two names in a file collide, even after normalization.
  - **Ulagal** has one card.
  - **"Drawn?"** is "Yes" for 150 cards. The legacy app ignored this column, and so does this change.

```
data/
  legend-cards.csv     from ~/Downloads/cards.csv          (imported here)
  cursed-cards.csv     from ~/Downloads/cursed.csv         (imported here)
  true-words.csv       from ~/Downloads/true words.csv     (kept for the True Words change)
```

**Decisions taken without the owner's explicit answer**

These are the defaults proposed in the exploration. The owner went on to this proposal without objecting:
- **Script only.** Card data is maintained with the import script. In-app editing and in-app CSV import are separate, later changes.
- **Rows without a set.** They are skipped with a warning. This matches the legacy app, which hid them (`visibleInLibrary = hasName && hasSet`).

## Goals / Non-Goals

**Goals:**
- **A repeatable import.** The import is idempotent and safe to re-run, so the same command seeds the emulators and, later, the real project.
- **A model the next changes extend.** card-holdings adds `holder`, and card-images adds `imageUrl`, without re-importing or migrating.
- **Faithful browsing.** The legacy library and Cursed Deck behave the same, apart from the parts that need holdings or pictures.

**Non-Goals:**
- **No client writes to `cards`.** That includes the DM. The `isDm()` helper comes with the first rule that needs it.
- **No pool status yet.** There is no "Havuzda / Elde", no pool-only filter, and no pool statistics. They need holdings.
- **No pictures yet.** There is no hover preview or zoom, and no detail panel. Without pictures, the card face already shows every field.
- **Nothing remembered.** Filters, the view, and the sort are not kept across visits.
- **No virtualization.** The longest list has 590 items, which renders fine without it.

## Decisions

### D1. Document shape

```
cards/{cardId}
  kind          'normal' | 'blessed' | 'cursed'
  name          string (1-200)                  as written, trimmed
  nameKey       string                          normalized name (D3)
  setCode       string | null                   null for blessed and cursed
  cost          string (1-10) | null            as written; null when empty or "—"
  rarity        'common' | 'rare' | null        null for blessed and cursed
  mechanicPack  string (1-100) | null           null for cursed
  text          string (0-2000)                 raw, [bracket] metadata included
  retired       boolean
```

- **The zod schema** (`src/features/cards/schema.ts`) is a discriminated union on `kind`, so the type system knows that a Cursed card has no rarity.
- **Field names refine the target model.** `set` becomes `setCode`, as `docs/conventions.md` agreed. Rarity values are lowercase, like `packType`. The interface shows "Common", "Rare", or "—".
- **Markers are not sets.** The values "Blessed" and "Cursed" in the CSV Set column are markers (`docs/domain.md`, Sets). They become the `kind`, and `setCode` is then `null`. Later pack logic can then take `setCode` as a real set without filtering out marker values.
- **Fields added later.** `holder` (card-holdings) and `imageUrl` (card-images) are added later, with zod defaults. The import never writes them (D5), so the data they hold survives a re-import.
- **Alternative: keep the raw strings** ("—" and "Blessed"), as the legacy app did. It was rejected, because every reader would have to know the marker values.

### D2. Document IDs are derived from the deck and the name

The ID is `legend-<nameKey>` for normal and Blessed cards and `cursed-<nameKey>` for Cursed cards, for example `legend-abolethseyes`.
- **Idempotent.** Re-running an import, even after a failure halfway through, can never create a duplicate.
- **Readable.** IDs are easy to read in the emulator UI and in tests.
- **Safe characters.** `nameKey` is `[a-z0-9]+`, so the ID is always a valid Firestore ID.
- **Per-deck matching.** The deck prefix keeps a Legend card and a Cursed card with the same name apart. A card that moves between normal and Blessed stays in the same deck, so it keeps its ID.
- **Renames.** Renaming a card in a way that changes its `nameKey` makes a new card and retires the old one. That is the same as the legacy app, which also matched by name.
- **Alternative: random IDs, matched by `nameKey`.** It needs the same read, but adds a duplicate risk and gives no benefit.

### D3. Name normalization is the legacy `norm`

`nameKey` and search both use the legacy normalization:
1. lowercase
2. turn special letters into ASCII: þ→th, ð→d, æ→ae, ø→o, ł→l, ı→i, ß→ss, and the rest of the legacy table
3. NFKD, then remove combining marks
4. remove everything outside `[a-z0-9]`

Examples: "Brünn's Batallion" becomes `brunnsbatallion`, and "Al-Hızran's Hazard" becomes `alhizranshazard`.

**Rejected rows.** A name whose key is empty is invalid. Two rows with the same key in one file are a duplicate error.

### D4. The import script

**Layout:**

```
scripts/
  import-cards.ts          CLI: npm run import-cards -- [--legend <csv>] [--cursed <csv>] [--dry-run] [--project id] [--yes]
  lib/
    cardRows.ts            parse a CSV text into validated rows + errors + warnings (pure, no Firebase)
    cardCatalog.ts         official set names and aliases, the 8 mechanic packs, normalize() (D3)
    importCards.ts         plan(existing, rows) -> changes; apply(db, plan) (Admin SDK)
    messages.ts            + Turkish texts for the import
```

**Steps:**
1. **Files.** Without `--legend` or `--cursed`, the script uses both repository files, resolved from the script's location, so the working directory does not matter. With either flag, it imports only the decks that are named.
2. **Parse and validate** each file completely. This happens before connecting, so a bad file never asks for confirmation:
   - The CSV is read with `csv-parse` (`bom: true`; multi-line quoted cells are allowed).
   - Headers are normalized: lowercase, `_` and `-` become spaces, spaces are collapsed and trimmed.
   - A missing required column stops the import at once.
   - Each row is checked by the rules in the `admin-scripts` spec. Errors are collected with spreadsheet row numbers, where the header is row 1.
   - Any error stops the import with exit 1, before anything is written.
3. **Connect** through `connect()` from `target.ts`, unchanged. A real project asks for confirmation, even for a dry run.
4. **Read** all existing `cards` documents, about 745 reads.
5. **Plan** each imported deck. For every row, the plan decides one outcome:
   - `added`: no document has this ID
   - `restored`: the document was retired
   - `updated`: some definition field differs
   - `unchanged`: everything is equal

   A document of the deck with no row in the file becomes `retired`, unless it is retired already.
6. **Write** the plan, unless this is a dry run. The writes go in `WriteBatch` chunks of up to 500. Every write is `set(definition + { retired }, { merge: true })`, so no other field is touched.
7. **Report** counts per deck and the warnings, in Turkish. The exit code is 0 when warnings are the only findings.

**Warnings, which never stop the import:**
- skipped rows with no set
- set codes that match no official name or alias
- mechanic packs that are not among the 8 known ones

**Alternative: `BulkWriter`.** Its retries are useful at a larger scale. Chunked batches are simpler to reason about and to test, and re-running repairs a partial import anyway (D2).

**Alternative: a hand-written CSV parser,** as in the legacy app. It was rejected: quoted fields with line breaks and BOM handling are a classic source of bugs. `csv-parse` is a small, well-known dev dependency, and it never reaches the app bundle.

### D5. Rules: read for signed-in users, no client writes

```
match /cards/{cardId} {
  allow read: if isSignedIn();
  allow write: if false;   // only the import script (Admin SDK) writes; later changes open holder writes
}
```

The `write: if false` is explicit, even though the catch-all already denies writes. It shows that the path is closed for writing on purpose, and later changes replace it with narrow rules.

**Rules tests:**
- a player and the DM can read a card, and can run a query over `cards`
- a signed-out user cannot read
- create, update, and delete are denied for a player and for the DM

### D6. App-side code: one shared `cards` feature

The two screens are separate features with the same data and the same UI, so the shared part lives in `src/features/cards/`. `users` is shared the same way.

```
src/features/cards/
  schema.ts         Card (discriminated union), cardConverter (idField 'id')
  api.ts            cardsRef(db), activeCardsQuery(db) = where('retired', '==', false)
  sets.ts           SETS in shop order (code, official name, aliases); setDisplayName(); setOrder()
  text.ts           normalize() (D3), visibleText() (strip [..]), searchTerms(); no imports (the script tests import it)
  display.ts        labels (set, rarity, kind), cardHaystack(), cardMatchesQuery()
  sort.ts           compare functions for the list columns (D8)
  cardsContext.ts   CardsContext, useCards(), useDeckCards(deck: 'legend' | 'cursed')
  CardsProvider.tsx subscribes once to activeCardsQuery while signed in, and shares the result
  CardBrowser.tsx   header with count, search, filters (legend only), view switch, grid or table, states
  CardFace.tsx      one card face (D7)
  CardTable.tsx     the sortable table
src/features/library/LibraryPage.tsx         <CardBrowser deck="legend" cards={useDeckCards('legend')} />
src/features/cursed-deck/CursedDeckPage.tsx  <CardBrowser deck="cursed" cards={useDeckCards('cursed')} />
src/app/App.tsx                              AuthProvider > UsersProvider > CardsProvider > router
src/test/TestCardsProvider.tsx               fixed card subscription; renderApp gets a `cards` option
```

**One app-wide subscription, as with `UsersProvider`:**
- `CardsProvider` subscribes to `where('retired', '==', false)` once a user is signed in. Signed out, it subscribes to nothing.
- `useDeckCards(deck)` splits the result by kind with `useMemo`.
- **Instant screens.** Opening or switching between the two screens shows the cards at once.
- **Ready for later changes.** The upcoming hands and pack screens, starting with the default screen "Oyuncu elleri", need the same data.
- **A test seam.** `renderApp` and the route tests get cards from `TestCardsProvider`, so unit tests never touch Firebase, the same pattern as `TestUsersProvider`.
- **No composite index.** The query has only one filter, and splitting by kind on the client needs no index. A query on both `kind` and `retired` might.
- `CardBrowser` takes the subscription as a prop, as `PlayerList` does, so it can be tested with fixtures directly.
- **Alternative: a subscription in each page.** It was rejected. It needs its own test seam, and it would subscribe again on every visit.
- **Cost:** every signed-in device reads the active cards once per app start. The persistent cache serves later reads.

**Search.**
- Each card gets a haystack of name, set code, official set name, cost, rarity label, mechanic pack, and raw text. Blessed and Cursed cards also get the word "Blessed" or "Cursed", as the legacy Set column gave them. Normal cards get no kind word, so a search for "normal" finds texts that say "normal", not every card. The haystack is normalized with D3. Normalization strips spaces, so terms can match across word boundaries, as in the legacy app.
- A query splits at `,` and `;`, and every normalized term must be a substring of the haystack.
- The haystack is computed once for each card set, with `useMemo`.
- The query goes through `useDeferredValue`, so typing stays smooth.

**Shared with the script.**
- `sets.ts` and `normalize()` are duplicated in `scripts/lib/cardCatalog.ts`, because scripts do not import app code. A unit test in `scripts/lib/` imports both copies and checks that they agree on every set, alias, and sample name.
- **Alternative: a shared root module** that both the app and the scripts import. It was rejected for now: the app's TypeScript config would need `.ts`-extension imports, for about 40 lines of code.

### D7. Card face

Without pictures, the face shows the data:
- **top:** the cost badge, then the name
- **middle:** the visible text
- **bottom:** the set's official name, the rarity, and the mechanic pack, in small muted text

**Frame colors** follow the Kurallar table rules:

| Card | Frame |
| --- | --- |
| Common | the new `common` token, purple |
| Rare | `gold` |
| Blessed | `blessed`, cream white |
| Cursed | `cursed`, red |

**The new `common` token.**
- The Kurallar page says that Common cards have a purple frame.
- The existing purple, `true-word`, means True Words. Reusing it would blur the two meanings.
- The token is used only for borders, so it needs at least 3:1 contrast against `pane` and `pane-raised`, the WCAG rule for non-text graphics. `theme.test.ts` gets that check for all four frame tokens.

**The grid** uses `repeat(auto-fill, minmax(…, 1fr))`, so it fits 360 px without horizontal scrolling. Texts are at most 113 characters, so faces do not need to clip their text.

**Later changes:**
- card-images replaces the middle part with the picture, and brings back a detail view.
- card-holdings adds the owner marking (`owned-card` in the legacy app).

### D8. List view and sorting

**Columns and labels** match the legacy app:
- Kart kütüphanesi: Kart, Set, Cost, Rarity, Mechanic Pack, Metin
- Cursed Deck: Kart, Cost, Metin

Durum and İşlem are left out until holdings exist.

**Headings.** Each heading is a button, and its `<th>` carries `aria-sort`. The button's label says the direction, as the legacy app's did.

**Comparison:**
- `Intl.Collator('tr', { numeric: true, sensitivity: 'base' })` compares the shown values. Set uses the official name, and Metin uses the visible text.
- **Cost:** when both costs are numeric, they are compared as numbers. Otherwise the collator compares them, so `X` and `d6` come after the numbers when ascending.
- **No cost:** cards without a cost always come last.
- **Ties** are broken by name, ascending.

**Default order:** by name, ascending.

**Narrow widths.** The table sits in an `overflow-x-auto` container, so only the table scrolls sideways, never the page.

### D9. Loading, empty, and error states

These follow the `PlayerList` pattern:
- **Loading:** a `role="status"` line, "Kartlar yükleniyor…".
- **Error:** a `role="alert"` line, "Kartlar yüklenemedi.". Invalid data adds a hint that the import should be run again.
- **No cards at all:** "Henüz kart yok."
- **Nothing matches:** "Kart bulunamadı."

**Count line:** "590 kart" without filters, and "42 kart (toplam 590)" when a search or filter narrows the list.

### D10. Tests

- **Unit tests for the scripts** (`scripts/lib/*.test.ts`, Node environment):
  - header matching
  - every row rule
  - duplicate detection
  - the warnings
  - plan outcomes, including retire and restore
  - the drift test between `cardCatalog.ts` and the app's `sets.ts` and `text.ts`
- **Emulator tests:**
  - `tests/import-cards.emulator.test.ts`: the first import of the repository files (590 + 154), a second import that writes nothing, a changed text, a removed and re-added row, a one-deck import, and a dry run.
  - `tests/firestore.rules.emulator.test.ts`: the `cards` rules (D5).
- **App unit tests:**
  - `text.ts`: normalization, visible text, and search
  - `sort.ts`
  - `sets.ts`
  - `CardBrowser`, with fixture card subscriptions passed as props: filters, views, sorting, the empty, error, and loading states, and hidden bracket text
  - `routes.test.tsx`, through `renderApp` with `TestCardsProvider`: it now expects placeholders only for the unbuilt screens, and the two card screens list their deck

## Risks / Trade-offs

- **[Risk] A wrong file retires a whole deck.** Mitigation:
  - required columns are checked first, so passing `true-words.csv` stops at the header check
  - `--dry-run` shows the plan first
  - retiring never deletes, and re-running with the right file restores every card
- **[Risk] A partial import if the network fails between batches.** Mitigation: the IDs are deterministic and every write is a merge, so re-running finishes the job.
- **[Risk] One invalid card document breaks both screens.** `useCollection` fails the whole subscription by design. Mitigation:
  - only the import writes cards, and it validates against the same rules as the app schema
  - the error message points to re-running the import
- **[Trade-off] Duplicated set list and normalization in the script.** Mitigation: the drift test fails if the two copies disagree.
- **[Trade-off] Each fresh device load reads about 745 card documents.** That is negligible for one group, and the persistent cache serves later visits.
- **[Trade-off] The repository holds the DM's card texts.** The repository is private and has no remote. If it is ever published, `data/` needs a decision first.

## Migration Plan

- **Development:**
  1. Run `npm run dev`.
  2. Run `npm run import-cards`.

  The emulator data persists in `.firebase-emulator-data/`.
- **A real project later:** run `npm run import-cards -- --dry-run --project <id>`, then run the same command without `--dry-run`.
- **Rollback:** revert the change. The `cards` documents stay in Firestore, and the catch-all makes them unreadable again.
