# Design

## Context

See `proposal.md` (Why) for the motivation. The behavior contracts are in `specs/app-shell/spec.md` and `specs/developer-workflow/spec.md`.

**Current state**
- **Screens.** The app shell has seven placeholder screens. They are listed once in `SCREENS` (`src/app/screens.ts`), which drives both the routes (`src/app/routes.tsx`) and the menu (`src/app/layout/SidebarContent.tsx`, which uses `NavLink`). Pack Shop is at `/shop`, and its page is in `src/features/shop/`.
- **Domain reference.** `docs/domain.md` is transcribed from v2.1.15. Its rules section is titled "Rules observed in legacy v2.1.15".
- **References to v2.1.15.** `reference/legacy/README.md`, `CLAUDE.md`, and the `context` in `openspec/config.yaml` name v2.1.15 as the reference. The archived bootstrap change also mentions it, but that change is history and stays as it is.
- **The two legacy files.** Both are in `reference/legacy/`. Their SHA-256 checksums:
  - v2.1.15: `add3bd5718a588b9043d30c95660f3239a1255998c468b7f3d0328bd49118fdc`
  - v2.2.8: `b44408ac3e302a8ed2fe0948c3ebcbf5ee5ceef5f13c2dee588820ebc8859e6e`
- **Release state.** The app has not been released. There are no real users, no deployed URLs, and no stored domain data.

**What v2.2.8 changed (observed by diffing the two files)**
- **Navigation.**
  - The menu is: Oyuncu elleri, Shops, True Words, Custom Card Draft, Kart kütüphanesi, Cursed Deck, İşlem Logu, Kurallar, Veri / Yedek.
  - Shops is a hub with Pack Shop and Elixir Shop. The menu keeps "Shops" marked while either sub-screen is open.
- **Packs.**
  - Mechanic Pack: 4 LP / 10000 GP.
  - Pandemonium: 3 LP / 7500 GP.
  - New Pandemonium Cursed Pack: 3 LP / 7500 GP. It opens when Pandemonium has at least 5 available non-blessed Rare cards and the Cursed Deck is not empty. It shows 5 non-blessed Rare cards plus 1 random cursed card, and the player gets both the cursed card and 1 chosen Rare.
  - The Rare Packs shop group is gone. Pandemonium is a group under Set Packs. Golden and Cursed Golden form a "Golden Packs" group that appears as the last tile among the Mechanic Packs.
  - The price of Mechanic Packs is shown once, in their section heading.
- **New features.**
  - Custom Card Draft: per-cost custom effect drafting that creates per-hand custom cards.
  - Elixir Shop: a catalog, plus the special "Elixir Withdrawal" cursed card.
  - Rules page "Kurallar": the table rules, told by the Cardmaker.
  - Data tools: per-dataset CSV import and clearing, and an asset check, all on Veri / Yedek. The import buttons are removed from the other screens.
- **Unchanged.** The other pack rules, thresholds, the 2% Blessed chance in Golden Packs, the pool and hand rules, drawing, LP, the True Word draft, undo, and the log all work as in v2.1.15.

**A correction to the current `docs/domain.md`, found while checking the Blessed rules.** The same in both versions:
- **The pool includes every Blessed card.** `available()` always includes Blessed cards.
- **Random draw.** The random batch draw (`matchingDrawCards`) picks uniformly from that pool.
- **Mechanic Pack.** It draws 5 cards from all available cards that have that mechanic pack.
- **The owner's data.** `cards.csv` has 19 Blessed cards. Each has Set "Blessed", rarity "—", and a real mechanic pack (2 or 3 per mechanic pack).

So with the real data, Blessed cards come up in random draws, at a rate set by their share of the pool (about 3% with a full pool, higher as the pool shrinks). They also come up in Mechanic Packs, and in the Golden Pack's fixed 2% slot. They never come up in set packs, Pandemonium, or the cursed packs. The current `domain.md` statement "only Golden Packs can offer a Blessed card" is a transcription error from the bootstrap change, not a DM decision.

## Goals / Non-Goals

**Goals:**
- One place for each fact. Screen labels, icons, and paths stay in `src/app/screens.ts`, and domain facts stay in `docs/domain.md`.
- Keep three things clearly apart in `docs/domain.md`:
  - what the legacy app does (observed behavior)
  - what the DM's rules page says (table rules)
  - what conflicts between the two (open questions)

  Feature work must not mistake a table rule for app behavior, or the other way round.
- The shell changes follow the existing "Adding a new screen" convention, plus one small, documented pattern for sub-screens.

**Non-Goals:**
- A generic nested-menu system. Shops is the only screen with sub-screens.
- Fixing typos in the rules page text, or settling the rules conflicts. Both wait for the DM.
- Showing any legacy content (rules text, elixir lists, mechanic descriptions) in the app, apart from the two one-line shop summaries on the Shops hub (D4).

## Decisions

### D1. Shop sub-screens live under the Shops URL: `/shops`, `/shops/packs`, `/shops/elixirs`
`NavLink` marks a link active when the current path is its `to` path or lies below it. So the "Shops" menu entry stays marked on both sub-screens without custom matching code. The spec requires that, and the URLs also show the hierarchy.

Alternatives considered:
- Keep `/shop` for Pack Shop and add `/elixir-shop`. This needs custom active-state logic in the sidebar, and the URLs would not reflect the hub.
- One `/shops` route with a tab or query parameter. The sub-screens would not be ordinary, reloadable screens, and later features (pack opening, elixir actions) would need real routes anyway.

**`/shop` gets no redirect.** The app is unreleased, so no bookmark points at `/shop`, and it falls through to the existing not-found page. A redirect would be one more route to keep for no user.

### D2. Sub-screens are listed in `SHOP_SCREENS` next to `SCREENS`
`src/app/screens.ts` gets a second list. Each entry has `{ id, path, label, icon, summary }`:
- `pack-shop`: `/shops/packs`, label "Pack Shop", icon `🎴`
- `elixir-shop`: `/shops/elixirs`, label "Elixir Shop", icon `⚗`

`routes.tsx` maps that list into routes under `AppShell`, the same way it maps `SCREENS`. A `Record<ShopScreenId, ReactNode>` makes TypeScript require a page for each entry. The Shops hub renders its choices from the same list, so the hub and the routes cannot drift apart. A `shopScreenById` helper mirrors `screenById`.

This follows the existing convention: a screen outside the main menu gets a route under `AppShell` but no `SCREENS` entry.

Alternative considered: hard-code the two routes in `routes.tsx` and the two links in the Shops page. Rejected because it repeats each path and label in two places.

### D3. Feature folders and screen ids
The new main screens:

| id | Path | Label | Icon | Page |
|---|---|---|---|---|
| `shops` | `/shops` | Shops | `🎁` | `src/features/shops/ShopsPage.tsx` (hub) |
| `custom-draft` | `/custom-draft` | Custom Card Draft | `✧` | `src/features/custom-draft/CustomDraftPage.tsx` (placeholder) |
| `rules` | `/rules` | Kurallar | `📖` | `src/features/rules/RulesPage.tsx` (placeholder) |

The shop sub-screens go in the same folder as the hub: `src/features/shops/PackShopPage.tsx` and `src/features/shops/ElixirShopPage.tsx`, both placeholders. `src/features/shop/` is removed, because its only file is the old Pack Shop placeholder. Each pack and elixir feature will later grow inside `shops/`, or in its own folder if it gets big. That choice is left to the feature change.

The labels and icons come from the v2.2.8 sidebar. Pack Shop and Elixir Shop take their icons from the v2.2.8 Shops hub (`🎴`, `⚗`).

### D4. The Shops hub is a real screen, not a placeholder
The hub has a `PageHeader` titled "Shops" and two large link cards, one per `SHOP_SCREENS` entry. Each card shows the icon (`aria-hidden`), the label, and a one-line summary:
- Pack Shop: "Spesifik bir set veya mekanikten 5 kart gör, birini seç."
- Elixir Shop: "Kartların kendilerini değiştirmeyi sağlayan etkiler."

These summaries are the ones v2.2.8 shows in the Cardmaker bubble. On wide screens the cards sit in two columns, and below the `sm` breakpoint in one column. They use the semantic Tailwind tokens (`pane`, `line`, `gold` on hover and focus).

The placeholder rule ("no controls that do nothing") holds: both cards are working links.

### D5. Placeholder pages can show header actions
`Placeholder` gets an optional `actions` prop and passes it to `PageHeader`. The two shop sub-screens pass a `Link` back to `/shops`, labeled "← Shops". It is styled like `NotFoundPage`'s link, the existing link-styled-as-button pattern.

The link matters on phones, where the menu is behind a button. v2.2.8 has the same "← Shops" button.

Alternative considered: a `Button` that calls `navigate`. Rejected because navigation belongs in a real link, which can be middle-clicked and is announced as a link.

### D6. `docs/domain.md` is re-baselined in place, with clearly separated sections
The file keeps its current shape. The new or changed sections:

1. **The product.** One sentence mentions custom cards and the Elixir Shop.
2. **Glossary.** New terms:
   - Shops, Pack Shop, Elixir Shop, Elixir, Elixir Withdrawal
   - Custom Card Draft, Custom Card, Custom effect (type × cost variant)
   - Pandemonium Cursed Pack, under Pack types
   - Kurallar (rules page)

   Changed entries:
   - Shop: two groups now.
   - Cardmaker: the new per-screen pictures `cardmaker_keep`, `cardmaker_zaddir`, `cardmaker_custom`, `cardmaker_peek`, `cardmaker_gold`, `cardmaker_pandemonium`, and `card_info`.
3. **"Rules observed in legacy v2.2.8"** replaces the v2.1.15 section. It lists the v2.2.8 functions it is transcribed from:
   - packs: `packDefs`, `packPrice`, `canOpenPack`, `openPack`, `flipPackOption`, `selectCursedPackNormal`, `addToHand`
   - Custom Card Draft: `customDraftStart`, `selectCustomEffect`, `customDraftRequired`, `customDraftPicksResolved`, `finishCustomDraft`
   - Elixir Shop: `addElixirWithdrawal`, `importElixirsCSV`
   - data tools: `parseCustomEffectsCSV`, `flushDataset`, `diagnosticsData`

   New subsections:
   - **Custom Card Draft:**
     - the 18 effect types and the costs 1, 3, and 5
     - 3 random options per pick, no repeats
     - 3 picks, plus 2 for Effects and 2 more 1-cost picks for a 3-cost Special
     - a 5-cost Special turns the other effects into their 1-cost text
     - a 1-cost Special upgrades one random other effect to its 3-cost text
     - the card is not in the pool, and returning it destroys it
   - **Elixir Shop:** a catalog only, and Elixir Withdrawal is a repeatable cursed card that is not in the Cursed Deck.
   - **Data and history:**
     - the per-dataset clearing, which can be undone and is logged
     - the asset check
     - the CSV formats for elixirs (`Name, Cost, Effect`) and custom effects (`name, 1-cost version, 3-cost version, 5-cost version`)
     - the asset file names: `1custom.png`, `3caster.png`, `elixir_<name>.png`, `cursedelixirwithdrawal.png`
4. **"Table rules (Kurallar page)"** is a new section. It gives a short English summary of the rules page, grouped as LP, using and trading cards, card colors, Cursed, Blessed, and True Words. A note says the app records and does not enforce. Like the observed rules, these rules become binding only when a spec adopts them.
5. **"Deliberate decisions"**:
   - The Pandemonium item now says that Pandemonium has its own group under Set Packs, with only the Pandemonium Pack and the Pandemonium Cursed Pack.
   - The Blessed item keeps "Golden Packs have a 2% Blessed chance" but drops "only Golden Packs can offer a Blessed card" (see Context). The glossary entry for "Blessed card" is corrected the same way.
   - The other items stay.
6. **"Open questions for the DM"** is a new section. These are disagreements that this change records but does not resolve:
   - **Blessed chance in a 1-LP draw.** The rules page says 2%. The app draws uniformly from the pool, so the chance depends on how many Blessed cards there are compared with the rest of the pool (about 3% with a full pool).
   - **"Rare Packs".** The rules page says Blessed cards can be found in "Rare or Mechanic Packs". In the app, the only rare pack that can show a Blessed card is the Golden Pack. Pandemonium, Cursed Golden, and Pandemonium Cursed exclude Blessed cards.
   - **Blessed count per mechanic.** The rules page says one Blessed card per mechanic, plus one more per 50 cards in that mechanic. The owner's data has 2 or 3 per mechanic. This is a data check, not app behavior.

   Table rules that the app simply does not track stay in the table-rules section and are not listed as questions: one Blessed card per player, losing a Blessed card on drawing a Cursed card or on leveling up, and cursed cards that cannot be played during the encounter in which they were drawn. Tracking them is future feature work.
7. **"Changes since v2.1.15"** is a short list that points back to the earlier file.
8. **Sets.** The Pandemonium row notes its two packs.

Alternative considered: a separate `docs/legacy-v2.2.8.md` next to an unchanged `domain.md`. Rejected because readers would have to merge the two in their heads, and the spec asks for one domain reference.

**Language.** The domain reference stays in English. Turkish appears only for interface labels (for example "Kurallar", "Belleği Temizle") and quoted strings.

### D7. Reference pointers
- **`reference/legacy/README.md`:**
  - Retitled "Legacy reference: Legend Card Manager".
  - States that v2.2.8 is current and v2.1.15 is the earlier version.
  - Gives both checksums and keeps the "do not edit, do not port" rules.
  - Points to `docs/domain.md` ("Rules observed in legacy v2.2.8").
- **`CLAUDE.md` and the `openspec/config.yaml` `context`:**
  - name `reference/legacy/Legend_Card_Manager_v2.2.8.html` as the reference
  - say that v2.1.15 is kept as the earlier version
  - keep the "never edit or port" rule for both files
- **`README.md`.** Already version-neutral, so it needs no change.

### D8. Tests
- **`src/app/routes.test.tsx`:**
  - The expected label list becomes the nine v2.2.8 labels.
  - The test name drops "seven".
  - The per-screen navigation test currently starts every screen on `/hands`, except `/hands` itself, which starts on `/shop`. That fallback start path changes to `/rules`.
  - The Shops screen is not a placeholder, so the shared assertion "Bu ekran henüz hazır değil." must be skipped for it. Instead, it checks that the hub's two links are present.
- **New `src/features/shops/ShopsPage.test.tsx`**, using `renderApp`, covers the spec scenarios:
  - choosing Pack Shop changes the URL to `/shops/packs` and keeps "Shops" as `aria-current="page"` in the main menu
  - Elixir Shop shows its title, the not-ready note, and a "← Shops" link
  - the back link returns to the hub
  - rendering directly at `/shops/elixirs` works and marks "Shops"
  - `/shop` shows the not-found page
- **`Placeholder.test.tsx`** gets a case for the `actions` prop.

## Risks / Trade-offs

- **[Risk] Transcription mistakes.** The legacy code is minified-style one-liners, so rules may be copied wrong.
  - Mitigation: domain.md names the functions each rule comes from.
  - The apply step re-checks every price, threshold, and count against `Legend_Card_Manager_v2.2.8.html` before finishing.
- **[Risk] Table rules mistaken for requirements.** A contributor could read a rules-page rule as something the app must enforce.
  - Mitigation: the section header and its note say these rules are not enforced and not binding until a spec adopts them.
  - The conflicts are listed under open questions, not silently resolved.
- **[Risk] Sidebar overflow.** With nine items, the desktop sidebar (`sticky top-0 h-dvh`, no overflow handling) could clip on short windows.
  - Mitigation: give the sidebar container `overflow-y-auto`.
  - The mobile drawer already scrolls (`overflow-y-auto`).
  - Check both at 1024×600 and 360×640.
- **[Trade-off] No `/shop` redirect.** It is accepted because nothing is released (D1). If the app is deployed before this change lands, add a redirect instead.
- **[Trade-off] Shop summaries now, the rest later.** The Shops hub shows two legacy summaries, while other legacy text, such as the mechanic descriptions and the rules, waits. The two summaries are what makes the hub usable. The rest belongs to the features that use it.

## Migration Plan

- There is no data and no deployment.
- The only URL change is `/shop` → `/shops/packs` (D1).
- Rollback is a plain revert of the change's commits.

## Open Questions

- Whether the Kurallar screen shows the rules text verbatim (with its typos) or a corrected version. This is decided in the later change that builds that screen, after the DM reviews the text. It does not affect this change.
