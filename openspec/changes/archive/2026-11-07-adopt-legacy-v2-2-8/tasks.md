# Tasks

Before running any command, run `. ~/.nvm/nvm.sh && nvm use` from the repository root. Do not edit either file in `reference/legacy/*.html`.

## 1. Legacy reference pointers

- [x] 1.1 Rewrite `reference/legacy/README.md` as described in D7:
  - title "Legacy reference: Legend Card Manager"
  - v2.2.8 is the current reference, and v2.1.15 is the earlier version
  - a SHA-256 checksum for each file (see design: Context)
  - the "do not edit, do not port, not part of the build" rules
  - a pointer to "Rules observed in legacy v2.2.8" in `docs/domain.md`

  Verify: `shasum -a 256 reference/legacy/*.html` matches both checksums in the README.
- [x] 1.2 Update `CLAUDE.md` (the Rules bullet about the legacy file) and the `context` in `openspec/config.yaml`. Both should name `reference/legacy/Legend_Card_Manager_v2.2.8.html` as the reference, say that v2.1.15 is kept as the earlier version, and keep the "never edit or port" rule. Verify:
  - `git grep -n "2\.1\.15" -- CLAUDE.md openspec/config.yaml` shows v2.1.15 only as the earlier version.
  - `openspec context --json` still resolves the root.

## 2. Domain reference re-baselined on v2.2.8

- [x] 2.1 In `docs/domain.md`, rename the rules section to "Rules observed in legacy v2.2.8" and re-transcribe it from the v2.2.8 functions listed in D6. Update the pack table:
  - Mechanic Pack: 4 LP / 10000 GP
  - Pandemonium: 3 LP / 7500 GP
  - new Pandemonium Cursed row: threshold, contents, and what the player gets
  - shop groups: Set Packs including Pandemonium, and Mechanic Packs including the Golden Packs group

  Update the "More pack rules" bullets: the burst animation replaces the tearing animation, and the opening shows the set's cardback. Verify each price and threshold in the table against `packPrice` and `canOpenPack` in the v2.2.8 file.
- [x] 2.2 Add the "Custom Card Draft" and "Elixir Shop" subsections, and extend "Data and history" (D6, item 3):
  - the 18 effect types and the costs 1, 3, and 5
  - the pick count rules, including Effects and Special
  - the Special effects at each cost
  - the custom card lifecycle (not in the pool, destroyed when returned or when its player is deleted)
  - Elixir Withdrawal
  - the CSV formats and asset file names
  - per-dataset clearing, which can be undone and is logged
  - the asset check

  Verify every number and name against `CUSTOM_TYPES`, `CUSTOM_COSTS`, `customDraftRequired`, `customDraftPicksResolved`, `addElixirWithdrawal`, and `flushDataset` in the v2.2.8 file.
- [x] 2.3 Update "The product", the glossary, and "Sets" (D6, items 1, 2, and 8):
  - new terms: Shops, Pack Shop, Elixir Shop, Elixir, Elixir Withdrawal, Custom Card Draft, Custom Card, Custom effect, Pandemonium Cursed Pack, and Kurallar
  - corrected Shop, Cardmaker, and Blessed card entries
  - the Pandemonium row in Sets notes its two packs

  Verify that every term named in the developer-workflow spec scenario "Looking up a term" has a glossary entry.
- [x] 2.4 Add the "Table rules (Kurallar page)" section, an English summary of the v2.2.8 rules page (`rulesPage`) in these groups: LP, using and trading cards, card colors, Cursed, Blessed, and True Words. Add the note that the app records and does not enforce these rules, and that a rule becomes binding only when a spec adopts it. Verify: each `<h3>` topic of `rulesPage` maps to a bullet in the section.
- [x] 2.5 Update "Deliberate decisions" (D6, item 5). Add "Open questions for the DM" (D6, item 6) and a short "Changes since v2.1.15" list. Verify:
  - The domain reference covers the developer-workflow spec scenarios "Checking a legacy rule" (Golden Pack, v2.2.8, deliberate), "Checking a changed price" (Mechanic Pack: 4 LP / 10000 GP), and "A table rule that the application does not follow" (Blessed sources).
  - `npx prettier --check docs/domain.md` passes.

## 3. Placeholder header actions

- [x] 3.1 Add an optional `actions` prop to `src/components/ui/Placeholder.tsx` and pass it to `PageHeader` (D5). Add a case to `Placeholder.test.tsx` showing that a passed action is rendered next to the title. Verify: `npm run test` passes.

## 4. Nine-screen menu and the Shops hub

- [x] 4.1 In `src/app/screens.ts`, make two changes:
  - Change `SCREENS` to the nine v2.2.8 entries in order (D3).
  - Add `SHOP_SCREENS` (`pack-shop` → `/shops/packs`, `elixir-shop` → `/shops/elixirs`, each with a label, icon, and Turkish summary) plus `shopScreenById` (D2).

  Verify: `npm run typecheck` reports only the expected missing-page errors in `routes.tsx`. Those are fixed in 4.3.
- [x] 4.2 Add the pages:
  - `src/features/custom-draft/CustomDraftPage.tsx` and `src/features/rules/RulesPage.tsx`, both placeholders
  - in `src/features/shops/`: `PackShopPage.tsx` and `ElixirShopPage.tsx`, both placeholders with a "← Shops" link to `/shops` (D5)
  - `src/features/shops/ShopsPage.tsx`: the hub, with link cards rendered from `SHOP_SCREENS` (D4)

  Delete `src/features/shop/`. Verify: `git grep -n "features/shop/"` returns nothing.
- [x] 4.3 Map `SHOP_SCREENS` into routes in `src/app/routes.tsx` under `AppShell`, next to the `SCREENS` routes, with a `Record<ShopScreenId, ReactNode>` page map. Update the `pages` record for the new screen ids. Verify: `npm run typecheck` passes.
- [x] 4.4 Give the desktop sidebar container in `src/app/layout/AppShell.tsx` `overflow-y-auto`, so nine items do not clip on short windows (design: Risks). Verify: the AppShell tests still pass.
- [x] 4.5 Update `src/app/routes.test.tsx` (D8):
  - the expected labels are the nine v2.2.8 labels
  - the test name drops "seven"
  - the fallback start path is `/rules`
  - the Shops screen is checked for its two hub links instead of the not-ready note

  Verify: `npm run test` passes.
- [x] 4.6 Add `src/features/shops/ShopsPage.test.tsx` covering the app-shell "Shops hub" scenarios (D8):
  - choosing Pack Shop keeps "Shops" marked as `aria-current="page"`
  - Elixir Shop shows its title, the not-ready note, and the back link
  - the back link returns to the hub
  - a direct load of `/shops/elixirs` works
  - `/shop` shows the not-found page

  Verify: `npm run test` passes.
- [x] 4.7 Update `docs/conventions.md` "Adding a new screen":
  - drop "seven"
  - add one paragraph on sub-screens: a list next to `SCREENS`, paths below the parent's path so the menu keeps the parent marked, and a back link to the parent

  Verify: `npm run format:check` passes.

## 5. Integration checks

- [x] 5.1 Run `npm run check` and `npm run test:emulator`. Verify: both pass.
- [x] 5.2 Run `npm run dev`, sign in with an emulator test account, and check the menu at 1024×600 and at 360×640 (phone menu). Verify:
  - all nine items can be reached
  - "Shops" stays marked on both shop sub-screens
  - there is no horizontal scrollbar
  - the last menu item and the user badge can be reached by scrolling if they do not fit
- [x] 5.3 Verify that neither legacy file has changed (`git diff --stat -- reference/legacy/*.html` is empty), and that `openspec validate adopt-legacy-v2-2-8 --strict` passes.

## Workflow follow-up

- Archive the change with `/opsx:archive` after review, so the app-shell and developer-workflow specs are updated.
