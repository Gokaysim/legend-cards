# Code conventions

These rules keep the codebase consistent for people and AI agents. For what the product is and what its words mean, see [domain.md](domain.md).

## Languages

| What                                                     | Language                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------- |
| Code: identifiers, file names, URL slugs                 | English                                                                 |
| Code comments, docs, OpenSpec artifacts, commit messages | English                                                                 |
| Interface text that users read                           | Turkish                                                                 |
| Game terms inside Turkish text                           | English, as in the legacy design: Pack, Cursed, Blessed, True Words, LP |

Turkish interface strings are written directly in the components. There is no translation layer.

## Project layout

```
src/
  main.tsx              entry: config check -> App (or ConfigErrorScreen)
  app/                  composition root
    App.tsx             ArtProvider + AuthProvider + UsersProvider + BalancesProvider + CardsProvider
                        + HoldingsProvider + TableProvider + PacksProvider + ActivityLogProvider
                        + DrawsProvider + TrueWordsProvider + router
    screens.ts          the single lists of screens (main menu and Shops sub-screens)
    routes.tsx          route table: sign-in, RequireAuth, AppShell, one route per screen, not-found
    layout/             AppShell, SidebarContent, MobileNav, UserBadge, OfflineBanner
    NotFoundPage.tsx, ConfigErrorScreen.tsx
  features/             one folder per product area
    art/                the built pictures: the manifest schema (EMPTY_ART), ArtProvider (loadArtManifest), useArt,
                        usePicture (the fallback after a load error), CardPicture, the spread backs (SpreadBack,
                        spreadBackUrl), Mascot, and useBlessedShock (the shocked Cardmaker pair)
    auth/               AuthProvider, useAuth, RequireAuth, SignInPage, authErrors
    users/              profiles and roles: schema, api, UsersProvider, useIsDm, DmOnly, PlayerList
    cards/              card definitions: schema, api, CardsProvider, useCards, useDeckCards, useCardsById,
                        the official sets, search and sort helpers, the pool and its distribution (pool),
                        and the card browser (CardBrowser, CardFace, CardTable)
    hands/              card holdings: schema, api (the card movements), errors, HoldingsProvider,
                        useOpenHoldings, and the "Oyuncu elleri" screen (HandsPage, the hand, its dialogs)
    balances/           LP and the party's GP: schema, api (changeBalance), errors, BalancesProvider,
                        usePartyPurse, useBalanceActions, the amount format, BalanceDialog, PartyPurse
    draws/              drawing cards into a hand: schema (card draws and pack openings), api (drawCard, one
                        transaction per card), errors, DrawsProvider, useDrawActions, and the hand's draw buttons
                        and dialog (DrawButtons, DrawDialog, FaceDownCard)
    table/              the table's lock (`table/main`): schema, api (tableRef, explainDenial), errors
                        (TableBusyError), TableProvider, useOpenPackId, useIsTableBusy, TableBusyNote
    packs/              the Pack Shop: the packs, prices and thresholds (catalog), the shown cards (contents),
                        api (openPack, turnPackCard, choosePackCard, cancelPack), errors, PacksProvider,
                        useOpenPack, usePackActions, and the shop and open-pack views
    true-words/         True Words: schema (words, learned words, player state, drafts), api (startDraft,
                        learnWord, skipDraft, cancelDraft, teachWord, takeBackWord, setWordActive), errors,
                        TrueWordsProvider, useTrueWords, useKnownWords, useOpenDraft, useTrueWordActions,
                        the True Words screen, the open draft panel, and the hand's True Words tab
    library/ cursed-deck/
                        the two card screens, each a <Name>Page.tsx around the shared card browser
    activity-log/       the İşlem Logu: the log queries (api), ActivityLogProvider (useLogRecords, useHolding),
                        events derived from holdings, draws and packs, and the ledger (events, eventText),
                        ActivityLogPage
    rules/              the Kurallar screen: RulesPage around RulesContent, the static rules text as JSX
    shops/              the Shops hub (ShopsPage), and the Elixir Shop placeholder
    custom-draft/ settings/
                        each with its <Name>Page.tsx (placeholders for now)
  components/ui/        shared primitives: Avatar, Button, PageHeader, Placeholder, Spinner, FullScreenSpinner
  lib/
    firebase/           settings check (config.ts) and the Firebase app, Auth and Firestore instances
    firestore/          real-time subscription hooks, converters, errors (including firebaseCode)
    cn.ts               class-name merge helper
    useOnlineStatus.ts  browser network status
    turkish.ts          Turkish grammar helpers, such as the genitive of a name ("Ayla'nın")
    random.ts           cryptographic random picks: randomIndex, pickRandom, sample, shuffle
    text.ts             cleanText: trims typed text and cuts it to a limit
  styles/
    index.css           Tailwind entry and base styles
    theme.css           design tokens
  test/                 test setup and shared test helpers (test providers for profiles, balances, cards,
                        holdings, the table, packs, the log's records and draws, fixtures)
public/art/             the pictures that `npm run build-art` builds, with their manifest; not committed
scripts/                admin scripts on Node with the Admin SDK, and the picture build (see Scripts)
data/                   the owner's CSV data that the scripts import (see data/README.md)
tests/                  emulator tests that need no app code: access rules, admin scripts
```

Rules:

- A feature does not import another feature's internals. When two features need the same code, move it to `components/` or `lib/`.
- Only `src/lib/firebase/` creates Firebase instances or connects to emulators in the app. Admin scripts do it only through `scripts/lib/target.ts`.
- Files outside `src/lib/` and the feature `api.ts` modules do not import Firebase SDKs directly. There is one exception: a feature's `schema.ts` may import Firestore value types such as `Timestamp`, to validate them.

## Naming

| Kind                             | Style                       | Example                           |
| -------------------------------- | --------------------------- | --------------------------------- |
| React component and its file     | PascalCase                  | `AppShell.tsx` exports `AppShell` |
| Hook                             | `useX`, camelCase file      | `useOnlineStatus.ts`              |
| Other modules                    | camelCase file              | `authErrors.ts`                   |
| Feature folder                   | kebab-case                  | `features/cursed-deck/`           |
| Screen component                 | `<Name>Page`                | `LibraryPage.tsx`                 |
| Boolean                          | `is` / `has` / `can` prefix | `isCursed`, `canOpenPack`         |
| Constant that is a true constant | UPPER_SNAKE_CASE            | `SET_PACK_ORDER`                  |

## Exports and types

- **Named exports only.** Default exports are allowed only where a tool requires them, for example `vite.config.ts`, `eslint.config.js`, and `prettier.config.js`.
- **`type`, not `interface`.** ESLint enforces it (`consistent-type-definitions`).
- **Type-only imports use `import type`.** ESLint enforces it (`consistent-type-imports`).
- **No `any`.** Data from outside the app (Firestore, environment variables, browser APIs, files) arrives as `unknown` and is parsed with zod before use.
- TypeScript runs in strict mode with `noUncheckedIndexedAccess`, so an indexed array item is `T | undefined` until checked.

## Domain names in code

Use the glossary in [domain.md](domain.md) for names. The data model will decide the final field names. Until then, these are the agreed spellings:

| Domain term                      | In code                                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Legend Points (LP)               | `legendPoints`                                                                                                        |
| Gold pieces (GP)                 | `goldPieces`                                                                                                          |
| Set code / official set name     | `setCode` / `setDisplayName`                                                                                          |
| Mechanic Pack                    | `mechanicPack`                                                                                                        |
| Rarity                           | `rarity`                                                                                                              |
| Cursed card, Blessed card        | `cursed`, `blessed` as kinds; `isCursed`, `isBlessed` as flags                                                        |
| Pool, Hand, Library, Cursed Deck | `pool`, `hand`, `library`, `cursedDeck`                                                                               |
| Pack type                        | `packType`: `standard`, `premium`, `cursed`, `pandemonium`, `pandemoniumCursed`, `mechanic`, `golden`, `cursedGolden` |
| True Word                        | `trueWord`                                                                                                            |
| Active effect                    | `isActive`, `activeEffects`                                                                                           |
| Cardmaker (the mascot)           | `cardmaker`                                                                                                           |

Never invent a set name. Set codes come from the card data. For example, the code is `Kesqer` and the official name is "Kesqerian Nights". There is no "Kesqeria".

## Styling

Styling uses Tailwind CSS utility classes, written directly in JSX.

- **Semantic tokens only.** Colors come from `src/styles/theme.css`: `canvas`, `sidebar`, `pane`, `pane-raised`, `line`, `ink`, `ink-muted`, `control`, `primary`, `gold`, `green`, `cursed`, `blessed`, `true-word`, and their variants. Tailwind's default palette is switched off, so classes like `bg-slate-800` do not exist.
- **No raw hex values or arbitrary color values in class names** (no `text-[#ff0000]`). If a color is missing, add a named token to `theme.css`.
- **New tokens need a reason in the design.** Text tokens must keep at least 4.5:1 contrast on every surface they are used on. `src/styles/theme.test.ts` checks this; add new pairs there.
- **Conditional classes go through `cn()`** from `@/lib/cn`. It joins classes and lets a later Tailwind class override a conflicting earlier one, so components can accept a `className` prop.
- **Repeated class clusters become a component** in `components/ui/` (or in the feature, if only one feature uses it). Do not use `@apply` to build component classes. `@apply` and plain CSS are fine in the `base` layer of `index.css`.
- **Class order is automatic.** Prettier (`prettier-plugin-tailwindcss`) sorts classes, including inside `cn(...)`. Do not sort them by hand.
- **Interface text in components is Turkish**, as in the legacy design.

## Tests

| Kind                             | File name                                                  | Runs with               |
| -------------------------------- | ---------------------------------------------------------- | ----------------------- |
| Unit test, no Firebase           | `*.test.ts` / `*.test.tsx`, next to the code it tests      | `npm run test`          |
| Test against the local emulators | `*.emulator.test.ts`                                       | `npm run test:emulator` |
| Admin script logic, no Firebase  | `scripts/**/*.test.ts`, with `// @vitest-environment node` | `npm run test`          |

- Import `describe`, `it`, and `expect` from `vitest`. Globals are off.
- Shared setup and helpers live in `src/test/`.
- Unit tests never talk to Firebase. Components that need auth are rendered inside a test auth provider with a fixed state.
- Firestore security rules tests live in `tests/firestore.rules.emulator.test.ts`. They load the real `firestore.rules` into the emulator for the project `demo-legend-cards`.

## Authentication

- **Use `useAuth()`.** It returns the auth `status` (`loading`, `signedOut`, `signedIn` with a plain `user`), plus `signInWithGoogle()` and `signOut()`. Feature code never imports `firebase/auth`; only `src/lib/firebase/` and `src/features/auth/` do.
- **Every app route goes under `RequireAuth`.** It shows a neutral loading state while the session is restored, and sends signed-out users to `/sign-in`, remembering where they wanted to go. Only `/sign-in` itself is public.
- **Sign-in is Google only, in a popup.** Error codes are mapped to Turkish messages in `authErrors.ts`. A cancelled popup shows nothing.
- **Roles come from the profile.** Every signed-in user has a profile at `users/{uid}` with the role `player` or `dm`. `UsersProvider` (`src/features/users/`) creates the profile at sign-in and shares the profiles. Read them with three hooks:
  - `useCurrentProfile()`
  - `useProfiles()`
  - `useIsDm()`, which is `true` only for a loaded DM profile; loading or missing profiles count as a player
- **DM-only controls go inside `<DmOnly>`.** Hiding is only a convenience. `firestore.rules` is the real check, so every DM-only write needs its own rule and rules test.
- **Roles change only through the admin script** (`npm run set-role`, see [Scripts](#scripts)). Never add a client write that touches `role`.
- **Tests** render components inside `TestAuthProvider` and `TestUsersProvider` (`src/test/`) with fixed states, instead of talking to Firebase. `renderApp` takes `users`, `balances`, `cards`, `holdings`, `table`, `packs`, `trueWords`, `activityLog`, `draws` and `art` options, and returns `setUsers`, `setBalances`, `setCards`, `setHoldings`, `setTable`, `setPacks`, `setTrueWords` and `setActivityLog` to simulate a real-time change. The `draws` option takes fake draws; by default a draw gives its first candidate. The `table` option takes an `openPackId`; by default no pack is open. The `packs` option takes the open `pack` and fake pack steps, which succeed by default. The `trueWords` option takes the `words`, the `knownWords` records, the `openDrafts` and fake True Word steps, which succeed by default (fixtures in `src/test/trueWordFixtures.ts`). The `art` option takes a picture manifest; by default it is `EMPTY_ART`, so every test sees the CSS look unless it gives pictures.

## Data access

All stored data lives in Firestore and is read in real time.

- **Who imports Firestore.** Only `src/lib/firestore/`, `src/lib/firebase/`, and feature `api.ts` modules import `firebase/firestore`. Components and hooks inside features call the feature's `api.ts`, `useDocument`, or `useCollection`.
- **Typed, validated refs.** Every ref and query uses a converter from `createConverter(schema)`. A document that does not match its zod schema never reaches feature code: the subscription reports `invalid-data` instead.
- **One converter per schema, at module level.** Define the converter once next to its schema. Do not create it inside a component, because refs with different converter instances are never equal and the subscription would restart on every render.
- **Reading.** Use `useDocument(ref)` for one document and `useCollection(query)` for many. Both return a `Subscription<T>`, and feature code branches on `status`:
  - `loading`: show a spinner or a skeleton.
  - `ready`: `data` holds the result. A missing document is `null`.
  - `error`: show a Turkish message based on `error.kind` (`permission-denied`, `invalid-data`, `unknown`).
- **Shared data comes from a provider.** Data that many screens need is subscribed to once, in a provider mounted in `App.tsx`, and read through hooks. Each provider has a test provider in `src/test/` that `renderApp` uses, so unit tests never touch Firebase.
  - Profiles: `useCurrentProfile()`, `useProfiles()`, `useIsDm()` (`UsersProvider`).
  - Cards: `useCards()` for every active card, and `useDeckCards('legend' | 'cursed')` for one deck. Retired cards are never in them. `useCardsById()` maps every card by its ID, retired ones included, so a hand can still show a held card that was retired (`CardsProvider`, one subscription to every card).
  - Balances: a player's LP is `lp` on their profile. `usePartyPurse()` gives the party's GP (`null` before the first change, which counts as 0), and `useBalanceActions()` the DM's changes (`BalancesProvider`).
  - The table: `useOpenPackId()` gives the open pack's ID, or `null`, and `useIsTableBusy()` whether a pack is open (`TableProvider`, one subscription to `table/main`). A loading or unreadable table counts as free: the rules are the real check.
  - Packs: `useOpenPack()` gives the pack the table waits for, live, and after it ends that ended pack until another opens, so every device can show how it ended; `usePackActions()` gives the pack steps (`PacksProvider`, inside `TableProvider`, one subscription to the pack the lock names).
  - True Words: `useTrueWords()` gives every word, retired ones included (sort the active ones with `activeWordsSorted`), `useKnownWords(uid)` one player's known words in the order learned, `useOpenDraft(uid)` their open draft or `null`, and `useTrueWordActions()` the steps (`TrueWordsProvider`, one subscription each to every word, every open learned-word record, and every open draft). A player's `playerWords` state is read only inside the api's transactions.
  - Draws: `useDrawActions()` gives `drawCard` (`DrawsProvider`). It subscribes to nothing: a drawn card arrives in the hand through `useOpenHoldings()`, and the new LP through the profiles.
  - Holdings: `useOpenHoldings()` for every card in every hand (`HoldingsProvider`). Derive views with the pure helpers next to it: `holdingsOf(holdings, uid)` for one hand in the order the cards were received, and `holdersOf(holdings, cardId)` for who holds a copy of a card.
  - The pool: derive it from the cards with the pure helpers in `cards/pool.ts`. A normal card's `holder` is the source of truth for whether it is in the pool, so `isDrawable`, `drawablePool`, `cursedPool`, the draw filters (`matchesFilters`, `drawFilterOptions`) and `poolDistribution` need only `useCards()`. The library's Durum also names who holds each card, so it comes from the holdings instead (`useDeckStatus` in `hands/cardStatus.ts`).
- **Data for one screen.** A screen that alone needs some data subscribes while it is shown, through hooks that a provider injects, so its test provider can answer instead of Firebase. The İşlem Logu reads `useLogRecords(uid, n)` and `useHolding(id)` from `ActivityLogProvider`. Its events are derived from its sources, the holdings, the draws (with the pack openings), the ledger, the True Word drafts and the learned True Words (`events.ts`), never written separately, through seven queries (`logQueries`): given holdings, closed holdings, draws, changes by hand, drafts, words taught, and words taken back. A draw is one event, and so is a pack opening, at the time it was opened, and a True Word draft, at the time it started. Their holdings, learned words, payments and refunds make no events of their own: the log queries leave them out (`givenVia` `dm` or `transfer`, `source` `manual`, and `learnedVia` `dm`), so every record a query returns is exactly one event and paging stays exact. A word taught and later taken back is one event in each of its two queries.
- **Composite indexes.** A query that filters on one field and orders by another needs a composite index in `firestore.indexes.json`, such as the log's filtered queries. The emulator does not check indexes, so a missing one only fails on a real project: add the index in the same change as the query, and deploy it with the rules.
- **Staleness hints.** When `ready`, `fromCache: true` means the data has not been confirmed by the server (for example while offline), and `hasPendingWrites: true` means local changes are still waiting to sync. Show a subtle hint where it matters, for example next to an LP balance.
- **Writing.** Write with the SDK (`setDoc`, `updateDoc`, `addDoc`, `runTransaction`, …) inside the feature's `api.ts`. Writes made offline are queued and sent when the connection returns. Do not wait for a write's promise before updating the UI: the subscription already shows the change as a pending write.
- **Transactions.** A write that must see the current server state, such as a card movement or a balance change, runs in `runTransaction` in the feature's `api.ts`. Transactions need a connection: they fail offline instead of being queued, so the interface says so (see `src/features/hands/errors.ts` and `src/features/balances/errors.ts`).
  - When two devices race, the rules can deny the loser's commit (`permission-denied`) before the SDK retries it, because they evaluate it against the winner's state. Re-read from the server to tell a race from a real denial: `giveCard` then reports who took the card, and `changeBalance` runs again when the balance moved.
- **The table waits for an open pack.** While a pack is open, the rules refuse every card movement, draw and balance change other than the pack's own steps (`tableFree()` in `firestore.rules`), and every True Word draft step, teaching and taking back. The True Words api reads `table/main` inside its transactions and throws `TableBusyError` itself.
  - Every api function that moves a card, draws or changes a balance throws `await explainDenial(db, error)` on a denial. It reads `table/main` from the server and turns the denial into a `TableBusyError` when a pack is open. Each feature's failure mapper reports it as `{ kind: 'table-busy' }`.
  - Controls that start such an action are disabled while `useIsTableBusy()` is true, with `TABLE_BUSY_NOTE` as their `title` and `<TableBusyNote />` next to them. Notes, switching a card active and cost overrides are not actions of this kind: they stay enabled.
- **Errors from Firebase.** Recognize Firebase errors by their `code` (`firebaseCode(error)` from `src/lib/firestore/errors.ts`), not with `instanceof`. Firebase's error classes reset their prototype, so `instanceof FirestoreError` is false even for real Firestore errors.

## Pictures

The card, cardback, pack, True Word and Cardmaker pictures are static files on Hosting, not data: `npm run build-art` writes them with a manifest to `public/art/` (see [The picture build](#the-picture-build)). Vite serves that folder in development and copies it into `dist/`.

- **Read them with `useArt()`** (`src/features/art/`). It gives `cardUrl(id)`, `wordUrl(id)`, `backUrl(key)`, `packUrl(key)` and `mascotUrl(stem)`, each the picture's URL or `null`. Set and pack keys are compared as set names are, so a set code written "The End Is Nigh" in the data finds the picture of "The End is Nigh".
- **`ArtProvider`** fetches `art/manifest.json` once at start. A failed request, an HTML answer (Vite and Hosting answer a missing file with `index.html`) or an invalid manifest gives `EMPTY_ART`: no pictures.
- **Every picture has a CSS fallback.** A component asks for its picture through `usePicture(url)`, and without one (no build, a missing picture, or an image that fails to load) it keeps the look it has without pictures. Never make a feature depend on a picture.
- **Pictures that repeat the text are decorative.** A card or word picture has the name as its `alt`, and the text it shows stays in the DOM as `sr-only`. A pack picture beside its name and the Cardmaker have `alt=""`.
- **A face-down card never gives its card away.** Its back comes from the spread (`SpreadBack`: `spreadBackOf(packType, setCode)` for a pack, `NEUTRAL_BACK` or `CURSED_BACK` for a draw), never from the card under it: see [domain.md](domain.md#pictures).
- **The shocked pair** comes from `useBlessedShock()`. Render its `overlay` inside the component's dialog: a modal dialog covers anything outside it.

## Adding a new screen

The main screens were added this way. A new one follows the same steps:

1. **Feature folder.** Create `src/features/<name>/` in kebab-case, for example `src/features/pack-history/`.
2. **Page component.** Add `<Name>Page.tsx` there, exporting a named `<Name>Page` component. Start with `<Placeholder title={screenById('<id>').label} />` until the feature exists.
3. **Screen entry.** Add the screen to `SCREENS` in `src/app/screens.ts`:
   - `id`: kebab-case, usually the folder name
   - `path`: an English URL slug, for example `/pack-history`
   - `label`: the Turkish label shown in the menu, keeping English game terms
   - `icon`: one glyph in the legacy style, for example `♠`, `☠` or `✦`

   The position in the array is the position in the menu.

4. **Route.** Add the page to the `pages` record in `src/app/routes.tsx`. TypeScript reports an error until every screen in `SCREENS` has a page. The route automatically sits under `RequireAuth` and `AppShell`, so it is protected and gets the sidebar.
5. **Style.** Style with Tailwind semantic tokens (see [Styling](#styling)) and start the page with `PageHeader`.
6. **Tests.** Extend `src/app/routes.test.tsx`: the expected label list and the navigation tests cover every screen in `SCREENS`.

A screen that is not part of the main menu (for example a detail page) gets a route in `routes.tsx` under the `AppShell` children, but no `SCREENS` entry.

**Sub-screens of a menu screen** follow the Shops screen:

- **One list.** The sub-screens are listed in their own array next to `SCREENS` (for Shops, `SHOP_SCREENS` in `src/app/screens.ts`). `routes.tsx` maps that list to routes with a typed page record, and the parent screen renders its links from the same list.
- **Paths.** Each sub-screen's path sits below the parent's path, for example `/shops/packs` under `/shops`. The menu's `NavLink` then keeps the parent marked while a sub-screen is open, with no extra code.
- **Back link.** Each sub-screen shows a link back to the parent in its header (`Placeholder` and `PageHeader` take `actions`), because on phones the menu is hidden behind a button.
- **Tests.** Cover the parent's links, the parent staying marked, and the back link, as in `src/features/shops/ShopsPage.test.tsx`.

## Adding a new data path

Firestore is closed by default (`firestore.rules`). Opening a collection or document path is a deliberate step, done in this order:

1. **Schema.** Declare the document shape with zod, next to the feature that owns it.
2. **Converter.** Build typed refs with `createConverter(schema)` from `src/lib/firestore/`, so every read is validated.
3. **Rule.** Add an explicit `match` block for the path in `firestore.rules`, above the closed catch-all. Every `allow` combines `isSignedIn()` with the path's own checks. Never loosen the catch-all.
4. **Rules tests.** In `tests/firestore.rules.emulator.test.ts` (or another `*.emulator.test.ts` file in `tests/`), add tests that show:
   - the intended access is allowed (`assertSucceeds`)
   - signed-out requests are denied
   - every other access is denied (`assertFails`), including other users' data and invalid writes

   Run `npm run test:emulator`.

   Two patterns in `firestore.rules` help here:
   - **Roles.** `isDm()` checks the signed-in user's profile. It costs one document read per request, so combine it with the cheap checks first.
   - **Writes that span documents.** When one action writes several documents that must agree, such as a card's `holder` and the holding it points at, each document's rule checks the other side's final state with `getAfter()` and `existsAfter()`, and its state before with `get()` and `exists()`. Then no write, not even one crafted outside the app, can leave them disagreeing. Test each allowed combination with a batched write, and each half on its own as denied.

5. **Feature code.** Only now write the feature's `api.ts` and the UI that reads and writes the path.

## Scripts

Admin scripts in `scripts/` change data with the Admin SDK, outside the security rules: the roles (`set-role`), the card definitions (`import-cards`) and the True Words (`import-true-words`). They work the same way against the emulators and against a real project, so data work is done once. The picture build (`build-art`) lives there too, but never touches Firebase.

- **Layout.**
  - One file per command in `scripts/`, for example `set-role.ts`.
  - Shared code lives in `scripts/lib/`:
    - `target.ts`: target choice, confirmation, Admin SDK start
    - `messages.ts`: the Turkish CLI text
    - one module per task with the logic, for example `setRole.ts`, `cardRows.ts`, `importCards.ts`, `trueWordRows.ts`, `importTrueWords.ts`, `artFiles.ts` and `artWrite.ts`
    - `csv.ts`: reading a CSV file and comparing header names, shared by both imports
    - `cardCatalog.ts`: the official sets and the mechanic packs the import checks against
  - Logic returns results. It does not print and does not exit, so it can be tested. The command file turns results into messages and exit codes.
- **Running.**
  - Scripts run on Node 24 directly (`node scripts/<name>.ts`), with an npm script per command, for example `npm run set-role -- --email … --role dm`.
  - They use erasable TypeScript only (`erasableSyntaxOnly`), relative imports with the `.ts` extension, and no app code (no `@/` alias).
  - Arguments are parsed with `node:util` `parseArgs`, merging `TARGET_OPTIONS`.
- **Targets.**
  - **Without `--project`,** a script uses the local emulators of `demo-legend-cards`. It stops with a clear message if they are not running.
  - **With `--project <id>`,** it targets that real project:
    - It uses Application Default Credentials (`gcloud auth application-default login`, or `GOOGLE_APPLICATION_CREDENTIALS`).
    - It asks the user to type the project ID to confirm. `--yes` skips the question for deliberate, scripted runs.
    - `demo-` IDs are refused, and so is a run where emulator variables are set at the same time.
  - Start every script through `connect()` from `target.ts`. Never build your own Admin SDK app.
- **Messages.** Output is Turkish, like the rest of the interface, and lives in `messages.ts`.
- **Tests.**
  - Unit-test target handling and argument rules in `scripts/**/*.test.ts`, with fake dependencies.
  - Test the data logic against the emulators in `tests/<name>.emulator.test.ts`, with `openAdmin({ kind: 'emulator', … })`.
  - Never point a test at a real project.

### The card import

`npm run import-cards` loads the card definitions from the owner's CSV files in `data/` (see `data/README.md`).

- **Files.** Without options it imports `data/legend-cards.csv` and `data/cursed-cards.csv`. `--legend <csv>` or `--cursed <csv>` imports only the decks named, and leaves the other deck alone.
- **Check first.** Every file is checked completely before anything is written. Any error stops the run with the file and row number, and nothing changes. Warnings (a row without a set, an unknown set code or mechanic pack) do not stop it.
- **Idempotent.** A card's ID is its deck plus its normalized name (`legend-abolethseyes`). An import adds, updates, or leaves each card alone, and retires the cards that are no longer in their file; it never deletes. It writes only the definition fields and `retired`, so fields owned by later features survive.
- **Dry run.** `--dry-run` prints the same report without writing. Use it first against a real project.
- **One catalog, two copies.** Scripts do not import app code, so the official sets and the name normalization live both in `scripts/lib/cardCatalog.ts` and in `src/features/cards/`. `scripts/lib/cardCatalog.drift.test.ts` fails when the two disagree: change both together.

### The True Words import

`npm run import-true-words` loads the True Words from `data/true-words.csv`, or from `--file <csv>`. It works like the card import:

- **Check first.** The columns Name, Cost and Text are required. An empty name or cost, a cost over 10 characters, or a duplicate name stops the run with its row number, and nothing changes. An empty text is a warning.
- **Idempotent.** A word's ID is `tw-` plus its normalized name (`tw-ancientword`). The import adds, updates, leaves alone or retires words, never deletes them, and writes only `name`, `nameKey`, `cost`, `text` and `retired`. Learned words and drafts are never touched.
- **Dry run.** `--dry-run` prints the same report without writing.

### The picture build

`npm run build-art -- --source <folder> [--dry-run]` builds the pictures from the owner's archives (see [data/README.md](../data/README.md#pictures)).

- **Read only.** It never changes the source folder, and never reads or writes Firestore, so it takes no `--project` and does not use `target.ts`.
- **7-Zip.** It runs `7zz` (`brew install sevenzip`), and stops without it. Each archive is extracted with `7zz e` into its own folder inside a temporary folder, which is removed at the end, after a failure or Ctrl+C too.
- **Check first.** The data files and the alias table are read before anything is extracted. An alias row that names nothing stops the run with its row number.
- **Pure matching.** `artFiles.ts` holds the rules: `planArt(files, data, aliases)` returns the assignments, duplicates, unknown files and coverage, and `readAliases` checks the table. It never touches files. `artWrite.ts` converts with `sharp` and writes the manifest last, so a run that fails halfway leaves no manifest and the app keeps its CSS look.
- **The manifest's IDs** are the Firestore document IDs (`cardId`, `trueWordId`), computed from the data files, so the build does not read Firestore.
- **Tests.** `artFiles.test.ts` covers each rule; `artInventory.test.ts` plans the archives' real file names (`artInventory.fixture.ts`) against the repository data, so a data or alias change that loses a picture fails there. Regenerate the fixture from `7zz l` when the archives change.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`, `test: ...`, `refactor: ...`.
