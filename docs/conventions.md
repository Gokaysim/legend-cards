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
    App.tsx             ArtProvider + AuthProvider + UsersProvider + CharactersProvider + BalancesProvider
                        + SetsProvider + CardsProvider
                        + HoldingsProvider + TableProvider + PacksProvider + ActivityLogProvider
                        + StatsProvider + DrawsProvider + TrueWordsProvider + PlayerNotesProvider + router
    screens.ts          the single lists of screens (main menu and Shops sub-screens)
    routes.tsx          route table: sign-in, RequireAuth, AppShell, one route per screen, not-found
    layout/             AppShell, SidebarContent, MobileNav, UserBadge, OfflineBanner
    NotFoundPage.tsx, ConfigErrorScreen.tsx
  features/             one folder per product area
    art/                the built pictures: the manifest schema (EMPTY_ART), ArtProvider (loadArtManifest), useArt,
                        usePicture (the fallback after a load error), CardPicture, the spread backs (SpreadBack,
                        spreadBackUrl), Mascot, CornerCardmaker (the shops' Cardmaker fixed in the bottom-right
                        corner on a wide window with a mouse, with her speech bubble), the speech state
                        (cardmakerSpeech: SpeechLine, useSpeechTrigger, useSpokenLine; CardmakerSpeechProvider),
                        and useBlessedShock (the shocked Cardmaker pair)
    auth/               AuthProvider, useAuth, RequireAuth, SignInPage, authErrors
    users/              profiles and roles: schema, api, UsersProvider, useIsDm, DmOnly, PlayerList
    cards/              card definitions: schema (statuses, isComplete), api (cardsRef for the DM,
                        playerVisibleCardsQuery for a player), CardsProvider, useCards, useDeckCards,
                        useDeckDefinitions (the DM's status filter), useCardsById,
                        the mechanic packs, search and sort helpers, the pool and its distribution (pool),
                        the DM's filters as facets (filters, setChoices) and their pill bar (FilterBar, FilterPill,
                        pillClasses), the card browser (CardBrowser, CardFace, CardTable), the cost badge
                        (CostBadge), and the zoom view (CardZoomDialog, opened from a face's magnifier)
    sets/               the card sets (spec: card-sets): schema (sets and their change records), the index (setIndex:
                        setOf, setName, setRank), api (addSet, saveSet, moveSet, deleteSet, each a transaction with
                        its record), errors, validation, SetsProvider (useSets, useSetIndex, useSetActions), SetArt
                        (the sets' cardbacks and Cardmakers in useArt), and the Setler screen (SetsPage, SetFormDialog)
    hands/              card holdings: schema, api (the card movements), errors, HoldingsProvider,
                        useOpenHoldings, and the "Oyuncu elleri" screen (HandsPage, the stats (HandSummary,
                        StatTile), the hand (HandView, HandTable), the card details (HoldingDetails, shown in
                        HandDetailsPanel beside the hand on a wide window, or in HoldingDialog), and its dialogs)
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
    definitions/        the DM's definition steps on cards and True Words: the statuses (status, STATUS_LABELS),
                        the change records (schema: stepFor, isPublicStep), api (addCard, saveCard, setCardStatus,
                        deleteCard and the same for words, each a transaction with its record), errors,
                        DefinitionsProvider, useDefinitionActions, the forms (DefinitionForm, CardFormDialog,
                        WordFormDialog), the status filter (StatusFilter, statusFilterOptions) and useCardEditing
    true-words/         True Words: schema (words, learned words, player state, drafts), api (startDraft,
                        learnWord, skipDraft, cancelDraft, teachWord, takeBackWord, setWordActive), errors,
                        TrueWordsProvider, useTrueWords, useKnownWords, useOpenDraft, useTrueWordActions,
                        the True Words screen, the open draft panel, the word's details (TrueWordDetails, in
                        the hand's panel or in TrueWordDialog), the hand's True Words tab, the active words
                        peeking out above the hand (ActiveWordsPeek), and a word shown large (TrueWordZoomDialog)
    characters/         the table's characters (spec: characters): schema (characterConverter, which also checks that a
                        photo is the character's own), the effects (effects: schema and limits; heldEffects: the
                        hand's active cards and words), the use target (useTarget: UseTarget), api (addCharacter,
                        saveCharacter, setCharacterArchived, readUseTarget and setUseEffect for the use steps,
                        addEffect, removeEffect; a new photo is uploaded first), errors, CharactersProvider,
                        useCharacters, useCharacterEffects, useCharacterActions, the pure helpers charactersOf,
                        characterGroups and effectsOf, the use step's shared picker (useCharacterChoice,
                        CharacterPicker), and the hand's Karakterler tab (useHandCharacters, CharactersTab,
                        CharacterTab, CharacterDetails, CharacterEffectsList, CharacterFormDialog, EffectFormDialog)
    player-notes/       the player note and the DM note: schema (hasNoteText), api (playerNoteRef, dmNoteRef,
                        savePlayerNote, saveDmNote), PlayerNotesProvider, usePlayerNote, useDmNote (only inside
                        <DmOnly>; dmNoteTarget), useNoteActions, and the hand's notes (HandNotes.tsx: PlayerNote,
                        under every tab, and DmNote, the DM notu tab)
    library/ cursed-deck/
                        the two card screens, each a <Name>Page.tsx around the shared card browser
    activity-log/       the İşlem Logu: the log queries (api), ActivityLogProvider (useLogRecords, useHolding),
                        events derived from holdings, draws and packs, and the ledger (events, eventText),
                        ActivityLogPage
    stats/              the Kart geçmişi and Set istatistikleri pages (spec: card-stats): the queries (api),
                        StatsProvider (useCardRecords, useAllRecords), the counting (cardHistory: cardStats,
                        historyRows; setStats: setCards, setCardRows, setTiles), the history's Turkish
                        (historyText), the pages (CardHistoryPage, SetStatsPage) and the set's table (SetCardTable)
    rules/              the Kurallar screen: RulesPage around RulesContent, the static rules text as JSX
    shops/              the Shops hub (ShopsPage), and the Elixir Shop placeholder
    custom-draft/ settings/
                        each with its <Name>Page.tsx (placeholders for now)
  components/ui/        shared primitives: Avatar, Button, Dialog (a native modal dialog; one may open inside
                        another, and closing the inner one leaves the outer one open; `closeOnBackdrop` also closes
                        it with a click outside, as the zoom view does), PageHeader, Placeholder, Spinner,
                        FullScreenSpinner, and the details' pieces: Pill (a label whose border takes a kind's
                        color), NotePaper (the card note on cream paper), ToolSection (a heading between two
                        lines, as "DM araçları"), EmptyCardSlot (the dashed card place of an empty details panel)
  lib/
    firebase/           settings check (config.ts) and the Firebase app, Auth and Firestore instances
    firestore/          real-time subscription hooks (with combineSubscriptions, which joins several into one),
                        converters, errors (including firebaseCode)
    cn.ts               class-name merge helper
    useOnlineStatus.ts  browser network status
    useReducedMotion.ts whether the device asks for reduced motion, live
    useMediaQuery.ts    whether a CSS media query matches, live; false where the browser cannot tell
    useWideHover.ts     whether this is a window at least 1024 px wide on a device with hover, live: the shops'
                        Cardmaker then stands in the corner and speaks
    useWideWindow.ts    whether this is a window at least 1024 px wide, live: the hand then shows the selected
                        card's or word's details in a panel beside it instead of a dialog
    usePhoneWidth.ts    whether this is a window narrower than 640 px, live: no Cardmaker shows there, and no
                        shocked pair
    useSavedField.ts    a text field saved on blur that keeps the user's draft while live changes arrive
                        (the card note, the cost override and the player notes)
    turkish.ts          Turkish grammar helpers, such as the genitive of a name ("Ayla'nın")
    days.ts             dates in lists of events: groupByDay ("14 Kasım 2026", pending times on the newest
                        day), formatTime ("19:42") and formatShortDate ("14 Kas 2026"), shared by the İşlem Logu
                        and the Kart geçmişi
    random.ts           cryptographic random picks: randomIndex, pickRandom, sample, shuffle
    text.ts             cleanText: trims typed text and cuts it to a limit
  styles/
    index.css           Tailwind entry and base styles
    theme.css           design tokens
  test/                 test setup and shared test helpers (test providers for profiles, balances, cards,
                        holdings, the table, packs, the log's and the statistics' records and draws, the notes,
                        fixtures)
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
- **Visual effects.** A visual effect that needs a pseudo-element or CSS variables, such as the card tilt's glint or a pack tile's ridged frame, is an `@utility` in `src/styles/effects.css`, written in plain CSS with tokens. Everything else, such as a lift, an angle or a glow, is a utility in the JSX. Glow colors and shadows are tokens in `theme.css` (`drop-shadow-glow-*`, `drop-shadow-reveal-*`).
- **Reduced motion.** Every moving effect stops when the device asks for reduced motion: through `motion-reduce:` on a utility, a `@media (prefers-reduced-motion: no-preference)` block in `effects.css`, or `useReducedMotion()` (`src/lib/`) for motion that JavaScript times. Glows and frames stay, because they do not move.
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
- **Tests** render components inside `TestAuthProvider` and `TestUsersProvider` (`src/test/`) with fixed states, instead of talking to Firebase. `renderApp` takes `users`, `characters`, `sets`, `balances`, `cards`, `holdings`, `table`, `packs`, `trueWords`, `notes`, `activityLog`, `stats`, `draws` and `art` options, and returns `setUsers`, `setCharacters`, `setSets`, `setBalances`, `setCards`, `setHoldings`, `setTable`, `setPacks`, `setTrueWords`, `setNotes`, `setActivityLog` and `setStats` to simulate a real-time change. The `stats` option takes the `records` of the statistics pages (holdings, card draws and pack openings, as one subscription); a card's page gets the records of its card. `src/test/statsFixtures.ts` holds the history of "Aboleth's Eyes" from the card-stats spec. The `characters` option takes the `characters` and the `effects` (subscriptions) and fake character steps, which succeed by default; `testCharacter(name, uid)` and `testEffect(name, character)` in `src/test/characterFixtures.ts` build them. The `sets` option takes the stored `sets` and fake set steps; by default the 12 sets of `data/sets.csv` without pictures (`src/test/setFixtures.ts`), and steps that succeed. A component that names sets without the rest of the app renders with `renderWithSets`. The `draws` option takes fake draws; by default a draw gives its first candidate. The `table` option takes an `openPackId`; by default no pack is open. The `packs` option takes the open `pack` and fake pack steps, which succeed by default. The `trueWords` option takes the `words`, the `knownWords` records, the `openDrafts` and fake True Word steps, which succeed by default (fixtures in `src/test/trueWordFixtures.ts`). The `notes` option takes the `playerNotes` and `dmNotes` by uid (each a subscription, for example `ready(note)`), fake saves, which succeed by default, and `onUseDmNote`, which is called with every uid whose DM note a component reads, so a test can show that a player's screen never asks for one. The `art` option takes a picture manifest; by default it is `EMPTY_ART`, so every test sees the CSS look unless it gives pictures.

## Data access

All stored data lives in Firestore and is read in real time.

- **Who imports Firestore.** Only `src/lib/firestore/`, `src/lib/firebase/`, and feature `api.ts` modules import `firebase/firestore`. Components and hooks inside features call the feature's `api.ts`, `useDocument`, or `useCollection`.
- **Who imports Cloud Storage.** Only `src/lib/firebase/storage.ts` and `src/features/definitions/api.ts` import `firebase/storage`. Components get a stored picture's address from `useArt().pictureUrl(path)`, never from the SDK.
- **Typed, validated refs.** Every ref and query uses a converter from `createConverter(schema)`. A document that does not match its zod schema never reaches feature code: the subscription reports `invalid-data` instead.
- **One converter per schema, at module level.** Define the converter once next to its schema. Do not create it inside a component, because refs with different converter instances are never equal and the subscription would restart on every render.
- **Reading.** Use `useDocument(ref)` for one document and `useCollection(query)` for many. Both return a `Subscription<T>`, and feature code branches on `status`:
  - `loading`: show a spinner or a skeleton.
  - `ready`: `data` holds the result. A missing document is `null`.
  - `error`: show a Turkish message based on `error.kind` (`permission-denied`, `invalid-data`, `unknown`).
- **Shared data comes from a provider.** Data that many screens need is subscribed to once, in a provider mounted in `App.tsx`, and read through hooks. Each provider has a test provider in `src/test/` that `renderApp` uses, so unit tests never touch Firebase.
  - Profiles: `useCurrentProfile()`, `useProfiles()`, `useIsDm()` (`UsersProvider`).
  - Characters: `useCharacters()` for every character, archived ones included, in the order added, `useCharacterEffects()` for every effect, newest first, and `useCharacterActions()` for the steps (`CharactersProvider`, one subscription each to the whole `characters` and `characterEffects` collections). Derive views with `charactersOf(characters, uid, { archived })`, `effectsOf(effects, characterId)` and, for the use step, `characterGroups(characters, profiles, holderUid)`. A card's and a True Word's use step share `useCharacterChoice` and `CharacterPicker`. The effects a hand puts on every character are derived with `heldEffects(entries, wordEntries)`, which the hand screen passes in; they are never stored.
  - Sets: `useSets()` for every stored set in the shop order, `useSetIndex()` for how a card's set code finds its set (`setName`, `setRank`, `setOf`; outside a provider or while loading, every code shows as written), and `useSetActions()` for the DM's steps (`SetsProvider`, one subscription to `sets`). Pure code takes the index or a `SetName` as a parameter.
  - Cards: `useCards()` for every active card, and `useDeckCards('legend' | 'cursed')` for one deck. Drafts and retired cards are never in them, and on a player's device neither are DM-only cards. `useCardsById()` maps every card the device reads by its ID, retired and DM-only ones included, so a hand can still show a held card that was retired or is DM-only, and `useDeckDefinitions(deck)` lists one deck's cards whatever their status, for the DM's status filter (`CardsProvider`, one subscription: the whole collection on the DM's device, `playerVisibleCardsQuery` on a player's, so a draft never reaches a player; the rules are not filters).
  - Balances: a player's LP is `lp` on their profile. `usePartyPurse()` gives the party's GP (`null` before the first change, which counts as 0), and `useBalanceActions()` the DM's changes (`BalancesProvider`).
  - The table: `useOpenPackId()` gives the open pack's ID, or `null`, and `useIsTableBusy()` whether a pack is open (`TableProvider`, one subscription to `table/main`). A loading or unreadable table counts as free: the rules are the real check.
  - Packs: `useOpenPack()` gives the pack the table waits for, live, and after it ends that ended pack until another opens, so every device can show how it ended; `usePackActions()` gives the pack steps (`PacksProvider`, inside `TableProvider`, one subscription to the pack the lock names).
  - Definition steps: `useDefinitionActions()` gives the DM's steps (`DefinitionsProvider`). It subscribes to nothing: the cards and words arrive through their providers, and the change records through the İşlem Logu's.
  - True Words: `useTrueWords()` gives every word the device reads, retired ones included and on the DM's device the drafts (sort the active ones with `activeWordsSorted`; a player's device uses `playerVisibleWordsQuery`), `useKnownWords(uid)` one player's known words in the order learned, `useOpenDraft(uid)` their open draft or `null`, and `useTrueWordActions()` the steps (`TrueWordsProvider`, one subscription each to every word, every open learned-word record, and every open draft). A player's `playerWords` state is read only inside the api's transactions.
  - Draws: `useDrawActions()` gives `drawCard` (`DrawsProvider`). It subscribes to nothing: a drawn card arrives in the hand through `useOpenHoldings()`, and the new LP through the profiles.
  - Holdings: `useOpenHoldings()` for every card in every hand (`HoldingsProvider`). Derive views with the pure helpers next to it: `holdingsOf(holdings, uid)` for one hand in the order the cards were received, and `holdersOf(holdings, cardId)` for who holds a copy of a card.
  - The pool: derive it from the cards with the pure helpers in `cards/pool.ts`. A normal card's `holder` is the source of truth for whether it is in the pool, so `isDrawable`, `drawablePool`, `cursedPool`, `activeFilters` and `poolDistribution` need only `useCards()`. The filters of the draw dialog and "+ Kart ver" are facets in `cards/filters.ts` (`drawFacets`, `giveFacets`, `applyFacets`, `facetChoices`, `matchesFilters`), with the sets ordered by `setChoices` in `cards/setChoices.ts`, which the library's set filter uses too. The library's Durum also names who holds each card, so it comes from the holdings instead (`useDeckStatus` in `hands/cardStatus.ts`).
- **Data for one screen.** A screen that alone needs some data subscribes while it is shown, through hooks that a provider injects, so its test provider can answer instead of Firebase. The İşlem Logu reads `useLogRecords(uid, n)` and `useHolding(id)` from `ActivityLogProvider`. Its events are derived from its sources, the holdings, the draws (with the pack openings), the ledger, the True Word drafts, the learned True Words and the definition change records (`events.ts`), never written separately, through eight queries (`logQueries`): given holdings, closed holdings, draws, changes by hand, drafts, words taught, words taken back, and definition changes (all of them on the DM's device, the public ones on a player's, none with a player filter). A draw is one event, and so is a pack opening, at the time it was opened, and a True Word draft, at the time it started. Their holdings, learned words, payments and refunds make no events of their own: the log queries leave them out (`givenVia` `dm` or `transfer`, `source` `manual`, and `learnedVia` `dm`), so every record a query returns is exactly one event and paging stays exact. A word taught and later taken back is one event in each of its two queries.
- **The statistics pages read the same way.** The Kart geçmişi and Set istatistikleri pages read `useCardRecords(cardId)` and `useAllRecords()` from `StatsProvider`, and count from the records on the device each time a snapshot arrives; nothing is stored (design D1 of `add-card-and-set-stats`). A card's page asks for its card's holdings (`cardId ==`), its card draws (`cardId ==` on `draws`, which no pack opening matches) and the packs that showed it (`offered array-contains`). Holdings do not record a set, so a set's page reads every holding and every pack opening (`kind == 'pack'`) and keeps those of its cards. None of these queries orders or adds a second filter, so they need no composite index. Each hook joins its subscriptions with `combineSubscriptions`, as the log does.
  - The hand screen reads the notes the same way: `usePlayerNote(uid)`, `useDmNote(uid)` and `useNoteActions()` from `PlayerNotesProvider` (`src/features/player-notes/`). `PlayerNote` subscribes to the player note while a hand is shown, under every tab. Only `DmNote`, inside `<DmOnly>` and mounted only while the DM notu tab is open, calls `useDmNote`. The real hook also asks for nothing unless `useIsDm()` is true (`dmNoteTarget`). So a player's device never requests `dmNotes`, which the rules deny it anyway.
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

Pictures come from two places:

- **Card and True Word pictures** are files in Cloud Storage, `cards/<id>/<hash>.webp` and `words/<id>/<hash>.webp`. The definition's `picture` field holds the path (`src/features/definitions/picturePath.ts`). `npm run import-pictures` and the DM's forms store them (see [The picture import](#the-picture-import)).
- **Set cardbacks and set Cardmakers** are files in Cloud Storage, `sets/<setId>/<hash>.webp`. The set's `cardback` and `mascot` fields hold the paths. `npm run import-sets` and the DM's set form store them (see [The set import](#the-set-import)).
- **Character photos** are files in Cloud Storage, `characters/<characterId>/<hash>.webp`, cropped from the center to 3:4 (`CHARACTER_PICTURE_BOX` in `src/features/definitions/picture.ts`). The character's `picture` field holds the path, and the character steps store them. The owner and the DM may store and delete them, and anyone may read them by address, as the card pictures.
- **The Blessed and Cursed cardbacks, pack pictures and the screens' Cardmaker** are static files on Hosting: `npm run build-art` writes them with a manifest to `public/art/` (see [The picture build](#the-picture-build)). Vite serves that folder in development and copies it into `dist/`.

How components use them:

- **Read them with `useArt()`** (`src/features/art/`). It gives:
  - `pictureUrl(card.picture)` for a card's or word's stored picture
  - `backUrl(key)`, `packUrl(key)` and `mascotUrl(stem)` for the built pictures, and `backUrl(setCode)`, `setMascotUrl(setCode)` and `mascotUrl(setMascotStem(setCode))` for a stored set's (`SetArt` in `src/features/sets/` adds them inside the sets' provider)

  Each gives the picture's URL or `null`. A set code finds its stored set as card data does, so a code written "The End Is Nigh" or the alias "endisnigh" finds the cardback of "The End is Nigh". Pack keys are compared ignoring case, accents and punctuation.

- **`ArtProvider`** fetches `art/manifest.json` once at start. A failed request, an HTML answer (Vite and Hosting answer a missing file with `index.html`) or an invalid manifest gives `EMPTY_ART`: no built pictures. A stored picture's address is built from the bucket setting without a request (`storedPictureUrl`), because `storage.rules` let anyone read the pictures. `TestArtProvider` builds `testPictureUrl(path)` instead. Give a test card a picture with `testPicturePath(target, id)`.
- **A definition's `picture` has three states.** No field means it never had a picture, `null` means the DM removed it, and a path is its picture. The app reads both empty states as `null`, and writes `picture` only when a step changes it, so the picture import can still tell them apart.
- **Every picture has a CSS fallback.** A component asks for its picture through `usePicture(url)`, and without one (no build, a missing picture, or an image that fails to load) it keeps the look it has without pictures. Never make a feature depend on a picture.
- **Pictures that repeat the text are decorative.** A card or word picture has the name as its `alt`, and the text it shows stays in the DOM as `sr-only`. A pack picture beside its name and the Cardmaker have `alt=""`.
- **A face-down card never gives its card away.** Its back comes from the spread (`SpreadBack`: `spreadBackOf(packType, setCode)` for a pack, `NEUTRAL_BACK` or `CURSED_BACK` for a draw), never from the card under it: see [domain.md](domain.md#pictures).
- **Every card face zooms.** `CardFace` has a magnifier in its top-right corner that opens `CardZoomDialog` for its card and hand cost; pass `isZoomable={false}` only for the face inside the zoom view. A face that opens something when selected, such as a hand card's details, takes `onOpen` and `openLabel` instead of a button laid over it from outside: the face's corner icons show on its own hover, which a button outside the face would hide.
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

A screen that is not part of the main menu (for example a detail page) gets a route in `routes.tsx` under the `AppShell` children, but no `SCREENS` entry. Its path sits below its menu screen's path, so the menu's `NavLink` keeps that screen marked, and `screens.ts` exports the route pattern and a builder for its URL:

- one player's hand: `HAND_ROUTE` (`/hands/:uid`) and `handPath(uid)`
- a card's Kart geçmişi: `CARD_HISTORY_ROUTES` (`/library/:cardId` for a Legend or Blessed card, `/cursed-deck/:cardId` for a Cursed card) and `cardHistoryPath(card)`, which picks the screen from the card's kind
- a set's Set istatistikleri: `SET_STATS_ROUTE` (`/sets/:setId`) and `setStatsPath(set)`

A detail page shows a link back to its menu screen ("← Kart kütüphanesi"), and its own message for an address that names nothing ("Böyle bir oyuncu yok.", "Kart bulunamadı.", "Böyle bir set yok.").

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

Cloud Storage is closed the same way (`storage.rules`). A new file path gets its own `match` block there, and tests in `tests/storage.rules.emulator.test.ts` that show the intended access allowed and every other access denied, signed-out requests included. Storage rules cannot call `isDm()` from `firestore.rules`: their own `isDm()` reads the profile through `firestore.get()`, a cross-service read that the emulators support. The card and word pictures are the one path anyone may read without signing in (spec: data-access-control).

## Scripts

Admin scripts in `scripts/` change data with the Admin SDK, outside the security rules: the roles (`set-role`), the sets and their pictures (`import-sets`), the card definitions (`import-cards`), the True Words (`import-true-words`) and the card and word pictures (`import-pictures`). They work the same way against the emulators and against a real project, so data work is done once. The picture build (`build-art`) lives there too, but never touches Firebase.

- **Layout.**
  - One file per command in `scripts/`, for example `set-role.ts`.
  - Shared code lives in `scripts/lib/`:
    - `target.ts`: target choice, confirmation, Admin SDK start, and the Cloud Storage bucket (`--bucket`, else `<project>.firebasestorage.app`)
    - `messages.ts`: the Turkish CLI text
    - one module per task with the logic, for example `setRole.ts`, `setRows.ts`, `importSets.ts`, `cardRows.ts`, `importCards.ts`, `trueWordRows.ts`, `importTrueWords.ts`, `artFiles.ts`, `artWrite.ts` and `importPictures.ts`
    - `archives.ts`: the owner's picture archives, extracted with 7-Zip, shared by `build-art`, `import-sets` and `import-pictures`
    - `csv.ts`: reading a CSV file and comparing header names, shared by the imports
    - `cardCatalog.ts`: the name normalization, and the mechanic packs the card import checks against. The sets are stored data: scripts read them from Firestore.
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
- **Check first.** Every file is checked completely before anything is written. Any error stops the run with the file and row number, and nothing changes. An empty value is not an error. Warnings do not stop it: a mechanic pack that is not one of the eight, and a set code that no stored set has as its code or alias. For the set codes, the import reads the stored sets with the Admin SDK, also in a dry run, and passes their spellings to `unknownSetWarnings` in `cardRows.ts`. With no sets stored, every set code is warned about: run `import-sets` first.
- **It only adds.** A card's ID is its deck plus its normalized name (`legend-abolethseyes`). A row is left alone when its deck already has a card with that ID or that `nameKey`, so a card the DM renamed is not added again. Every other row is created (never set, so nothing is overwritten), as `active`, or as `draft` when a column its kind uses is empty (`ParsedCard.missing`). The import never changes, retires or deletes a stored card: the DM does that in the app (design D7 of `add-card-and-word-editing`).
- **Upgrade.** A stored card without a `status` gets one from its old `retired` flag, and the flag is deleted. Nothing else about it changes.
- **Records.** After the additions, the import writes up to two `definitionChanges` records with `step: 'imported'` and `by: null`: a public one of the active additions and a DM-only one of the drafts. Each added card's `changeId` points at its record. A run that adds nothing writes none. `writeImport` in `importCards.ts` does this for both imports.
- **Dry run.** `--dry-run` prints the same report without writing. Use it first against a real project.
- **One catalog, two copies.** Scripts do not import app code, so the eight mechanic packs and the name normalization live both in `scripts/lib/cardCatalog.ts` and in `src/features/cards/` (`mechanicPacks.ts`, `text.ts`). `scripts/lib/cardCatalog.drift.test.ts` fails when the two disagree: change both together. The sets are no longer in either copy: they are stored data.

### The set import

`npm run import-sets -- [--file <csv>] [--source <folder>] [--dry-run] [--project <id>] [--yes] [--bucket <name>]` loads the sets from `data/sets.csv`, or from `--file <csv>`, and with `--source` their cardbacks and Cardmakers from the owner's archives (design D10 of `add-set-management`). Run it before `import-cards`.

- **Check first.** `setRows.ts` checks the whole file before anything is written: the columns Code, Name, Aliases and Packs, an empty code or name, a value over 100 characters, more than 10 aliases, a Packs value other than `standard` or `pandemonium`, the code `Blessed`, and two rows sharing a name or a spelling among their codes and aliases (compared with `normalize`). Every problem is reported with its row number, and nothing changes. With `--source`, the alias table's set rows are checked against the sets after the import, before anything is extracted.
- **It only adds.** A set's ID is its normalized code (`kesqer`). A row is left alone when a stored set has its code as its code or alias, so a set the DM renamed is not added again. Every other row is created (never set) after the stored sets, at the next positions in the file's order, without `cardback` or `mascot` fields. The import never changes, reorders or deletes a stored set.
- **Pictures.** With `--source`, `importSets.ts` plans the archives in the `sets` mode of `artFiles.ts` against the stored and added sets: `<set>_cb` is a set's cardback and `cardmaker_<set>` its Cardmaker, the set named by its code, official name or alias, plus the alias table's set rows. It converts as the build does (`convertPicture`: WebP quality 82, a cardback at its own size, a Cardmaker at most 480 pixels high with its transparency), stores the file at `sets/<setId>/<hash>.webp` with the app's metadata (`Content-Disposition` with `<setId>-cardback.webp` or `<setId>-cardmaker.webp`), and sets the field in a transaction that checks it is still absent. A set with a picture, or whose picture the DM removed (`null`), is left alone, and a picture saved meanwhile wins: the upload is deleted again.
- **Records.** Each run that adds sets or stores pictures writes one `setChanges` record with `step: 'imported'` and `by: null`, listing the added sets and the sets that got a picture by name. The added sets' `changeId` points at it. It is written at the end, also after a failure halfway. A run that changes nothing writes none.
- **Dry run.** `--dry-run` plans and reports without writing, converting or storing.
- **Tests.** `setRows.test.ts` checks `data/sets.csv` and every invalid case. `tests/import-sets.emulator.test.ts` covers a first run, a second run that changes nothing, a renamed set, a removed Cardmaker, and pictures from small PNG files made by `sharp`.

### The True Words import

`npm run import-true-words` loads the True Words from `data/true-words.csv`, or from `--file <csv>`. It works like the card import:

- **Check first.** The columns Name, Cost and Text are required. An empty name, a cost over 10 characters, or a duplicate name stops the run with its row number, and nothing changes. An empty cost or text makes the word a draft.
- **It only adds.** A word's ID is `tw-` plus its normalized name (`tw-ancientword`). The import adds the words that are not stored, matched by ID or `nameKey`, upgrades old words to a status, and records its additions, as the card import does. Stored words, learned words and drafts are never touched.
- **Dry run.** `--dry-run` prints the same report without writing.

### The picture build

`npm run build-art -- --source <folder> [--dry-run]` builds the Blessed and Cursed cardbacks, the pack pictures and the screens' Cardmaker from the owner's archives (see [data/README.md](../data/README.md#pictures)). The card and True Word pictures are left to [the picture import](#the-picture-import), and the sets' cardbacks and Cardmakers to [the set import](#the-set-import): the build no longer builds set pictures, and needs no set list.

- **Read only.** It never changes the source folder, and never reads or writes Firestore or Cloud Storage, so it takes no `--project` and does not use `target.ts`.
- **7-Zip.** It runs `7zz` (`brew install sevenzip`), and stops without it. `archives.ts` extracts each archive with `7zz e` into its own folder inside a temporary folder, which is removed at the end, after a failure or Ctrl+C too.
- **Check first.** The alias table's asset rows are checked before anything is extracted. An asset row that names nothing stops the run with its row number.
- **Pure matching.** `artFiles.ts` holds the rules: `planArt(files, data, aliases, mode)` returns the assignments, duplicates, unknown files, the files left to the other scripts (`leftTo`, by script), and coverage. `readAliases(text, data, mode)` checks the table. It never touches files. There are three modes, one per script: `assets` for the build, `sets` for the set import and `definitions` for the picture import. A file's name alone says which script it belongs to: `blessed_cb`, `cursed_cb`, the screens' `CARDMAKER_STEMS` and the named packs are the build's; every other `*_cb` and `cardmaker_*` is the set import's; the rest is the picture import's. So the build plans against no definitions and no sets, and counts the set files as left to the set import. `<set>_std`, `_prm`, `_crs` and `_gold` are no pictures. `artWrite.ts` converts with `sharp` and writes the manifest last, so a run that fails halfway leaves no manifest and the app keeps its CSS look.
- **Tests.** `artFiles.test.ts` covers each rule in every mode. `artInventory.test.ts` plans the archives' real file names (`artInventory.fixture.ts`): the assets on their own, the set pictures against the sets of `data/sets.csv`, and the cards and words against the definitions the repository data would store (`definitionsOfRows`). So a data or alias change that loses a picture fails there. Regenerate the fixture from `7zz l` when the archives change.

### The picture import

`npm run import-pictures -- --source <folder> [--dry-run] [--project <id>] [--yes] [--bucket <name>]` stores the owner's card and True Word pictures in Cloud Storage (design D9 of `upload-card-and-word-pictures`).

- **Against the stored definitions.** It reads every card and word, whatever its status, and plans the archives in the `definitions` mode, leaving the asset files to the build and the set files to the set import. A file finds the definition whose ID its name gives (`legend-<name>`, `cursed-<name>`, `tw-<name>`), or else the one with that `nameKey`, so a renamed card keeps its picture and a card added in the app is found. The alias table's card and word rows are checked against the stored definitions before anything is extracted.
- **It only adds.** A definition gets a picture only while it has no `picture` field. A path means it has one, and `null` means the DM removed it: both are left alone, and the report counts them. The field is set in a transaction that checks it is still absent, so a picture the DM saves meanwhile wins, and the upload is deleted again.
- **The files.** `importPictures.ts` converts with `convertPicture` (WebP, quality 82, own size), names the file `cards/<id>/<hash>.webp` or `words/<id>/<hash>.webp` with `contentHash`, and stores it with the app's metadata: `image/webp`, a year of immutable caching, and `Content-Disposition` with `<id>.webp` for "İndir".
- **Records.** At the end, also after a failure halfway, it writes `step: 'imported'`, `what: 'pictures'` records of what it added: for cards and for words, a public one of the active and retired definitions that are not DM-only, a DM-only one of the drafts, and for cards a DM-only one of the other DM-only cards. `changeId` is not changed. A run that stops halfway is completed by running it again.
- **Dry run.** `--dry-run` plans and reports without converting, storing or writing.
- **Tests.** `tests/import-pictures.emulator.test.ts`, with small PNG files made by `sharp`.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`, `test: ...`, `refactor: ...`.
