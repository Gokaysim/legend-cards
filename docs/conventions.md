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
    App.tsx             AuthProvider + router
    screens.ts          the single list of main screens (path, Turkish label, icon)
    routes.tsx          route table: sign-in, RequireAuth, AppShell, one route per screen, not-found
    layout/             AppShell, SidebarContent, MobileNav, UserBadge, OfflineBanner
    NotFoundPage.tsx, ConfigErrorScreen.tsx
  features/             one folder per product area
    auth/               AuthProvider, useAuth, RequireAuth, SignInPage, authErrors
    hands/ shop/ true-words/ library/ cursed-deck/ activity-log/ settings/
                        each with its <Name>Page.tsx (placeholders for now)
  components/ui/        shared primitives: Button, PageHeader, Placeholder, Spinner, FullScreenSpinner
  lib/
    firebase/           settings check (config.ts) and the Firebase app, Auth and Firestore instances
    firestore/          real-time subscription hooks, converters, errors
    cn.ts               class-name merge helper
    useOnlineStatus.ts  browser network status
  styles/
    index.css           Tailwind entry and base styles
    theme.css           design tokens
  test/                 test setup and shared test helpers
```

Rules:

- A feature does not import another feature's internals. When two features need the same code, move it to `components/` or `lib/`.
- Only `src/lib/firebase/` creates Firebase instances or connects to emulators.
- Files outside `src/lib/` and the feature `api.ts` modules do not import Firebase SDKs directly.

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

| Domain term                      | In code                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| Legend Points (LP)               | `legendPoints`                                                                                   |
| Gold pieces (GP)                 | `goldPieces`                                                                                     |
| Set code / official set name     | `setCode` / `setDisplayName`                                                                     |
| Mechanic Pack                    | `mechanicPack`                                                                                   |
| Rarity                           | `rarity`                                                                                         |
| Cursed card, Blessed card        | `cursed`, `blessed` as kinds; `isCursed`, `isBlessed` as flags                                   |
| Pool, Hand, Library, Cursed Deck | `pool`, `hand`, `library`, `cursedDeck`                                                          |
| Pack type                        | `packType`: `standard`, `premium`, `cursed`, `mechanic`, `pandemonium`, `golden`, `cursedGolden` |
| True Word                        | `trueWord`                                                                                       |
| Active effect                    | `isActive`, `activeEffects`                                                                      |
| Cardmaker (the mascot)           | `cardmaker`                                                                                      |

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

| Kind                             | File name                                             | Runs with               |
| -------------------------------- | ----------------------------------------------------- | ----------------------- |
| Unit test, no Firebase           | `*.test.ts` / `*.test.tsx`, next to the code it tests | `npm run test`          |
| Test against the local emulators | `*.emulator.test.ts`                                  | `npm run test:emulator` |

- Import `describe`, `it`, and `expect` from `vitest`. Globals are off.
- Shared setup and helpers live in `src/test/`.
- Unit tests never talk to Firebase. Components that need auth are rendered inside a test auth provider with a fixed state.
- Firestore security rules tests live in `tests/firestore.rules.emulator.test.ts`. They load the real `firestore.rules` into the emulator for the project `demo-legend-cards`.

## Authentication

- **Use `useAuth()`.** It returns the auth `status` (`loading`, `signedOut`, `signedIn` with a plain `user`), plus `signInWithGoogle()` and `signOut()`. Feature code never imports `firebase/auth`; only `src/lib/firebase/` and `src/features/auth/` do.
- **Every app route goes under `RequireAuth`.** It shows a neutral loading state while the session is restored, and sends signed-out users to `/sign-in`, remembering where they wanted to go. Only `/sign-in` itself is public.
- **Sign-in is Google only, in a popup.** Error codes are mapped to Turkish messages in `authErrors.ts`. A cancelled popup shows nothing.
- **No roles yet.** Every signed-in user sees the same app. DM and player roles come with the data model, and they are enforced in `firestore.rules`, not only in the UI.
- **Tests** render components inside `TestAuthProvider` (`src/test/`) with a fixed state, instead of talking to Firebase.

## Data access

All stored data lives in Firestore and is read in real time.

- **Who imports Firestore.** Only `src/lib/firestore/`, `src/lib/firebase/`, and feature `api.ts` modules import `firebase/firestore`. Components and hooks inside features call the feature's `api.ts`, `useDocument`, or `useCollection`.
- **Typed, validated refs.** Every ref and query uses a converter from `createConverter(schema)`. A document that does not match its zod schema never reaches feature code: the subscription reports `invalid-data` instead.
- **One converter per schema, at module level.** Define the converter once next to its schema. Do not create it inside a component, because refs with different converter instances are never equal and the subscription would restart on every render.
- **Reading.** Use `useDocument(ref)` for one document and `useCollection(query)` for many. Both return a `Subscription<T>`, and feature code branches on `status`:
  - `loading`: show a spinner or a skeleton.
  - `ready`: `data` holds the result. A missing document is `null`.
  - `error`: show a Turkish message based on `error.kind` (`permission-denied`, `invalid-data`, `unknown`).
- **Staleness hints.** When `ready`, `fromCache: true` means the data has not been confirmed by the server (for example while offline), and `hasPendingWrites: true` means local changes are still waiting to sync. Show a subtle hint where it matters, for example next to an LP balance.
- **Writing.** Write with the SDK (`setDoc`, `updateDoc`, `addDoc`, `runTransaction`, …) inside the feature's `api.ts`. Writes made offline are queued and sent when the connection returns. Do not wait for a write's promise before updating the UI: the subscription already shows the change as a pending write.
- **Errors from Firebase.** Recognize Firebase errors by their `code`, not with `instanceof`. Firebase's error classes reset their prototype, so `instanceof FirestoreError` is false even for real Firestore errors.

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

5. **Feature code.** Only now write the feature's `api.ts` and the UI that reads and writes the path.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`, `test: ...`, `refactor: ...`.
