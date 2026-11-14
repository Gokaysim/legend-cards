# Proposal

## Why

The sets are a fixed list in the code (`src/features/cards/sets.ts`), copied by hand into `scripts/lib/cardCatalog.ts` and `docs/domain.md`. Adding a set, fixing a name or changing the shop order needs a code change and a deploy. The set's cardback, its Cardmaker and the Pandemonium pack rule also hang off that list and the set's name. The DM wants the sets to be data that they manage in the app, with the set statistics page to follow on top of it.

## What Changes

- Sets become stored data at `sets/{setId}`: code, official name, aliases, position in the shop order, pack layout (Standard/Premium/Cursed, or one pack plus a Cursed pack as Pandemonium has), cardback and Cardmaker picture.
- A new "Setler" screen, after "Kart kütüphanesi" in the navigation, lists the sets in their order with cardback, name, code, aliases, packs and card count. Every signed-in user sees it. Only the DM adds, edits, reorders (↑ ↓) and deletes. The code cannot change after a set is created. A set can be deleted only while no card uses it.
- The set form takes the cardback and the Cardmaker picture the way the card form takes a card picture, stored in Cloud Storage under `sets/{setId}/`.
- Every set change writes a record in the same step, and the İşlem Logu shows it.
- Changing a set's pack layout and deleting a set wait for an open pack.
- Everything that read the fixed list now reads the stored sets: set names on cards, the library filter and sort, the card form's set choice, the Pack Shop groups and their order, pack names, cardbacks and group Cardmakers, the log and the hand summary.
- **BREAKING** The Pandemonium rules no longer key on the set's name. A set whose layout is the single pack gets a "<Set> Pack" and a "<Set> Cursed Pack" drawn from its Rares and the Blessed cards. The rule that puts Pandemonium last in the shop is replaced by the stored order.
- New `npm run import-sets` seeds the 12 sets from a new `data/sets.csv` (row order is the shop order), adds only sets that are not stored, and with `--source` stores each set's cardback and Cardmaker from the owner's archives.
- **BREAKING** `npm run build-art` no longer builds set cardbacks, set Cardmakers or set pack pictures (`<set>_std`, `_prm`, `_crs`, `_gold`; none exist in the archives today). Blessed and Cursed cardbacks, Mechanic and Golden pack pictures and the screens' Cardmakers stay built.
- `npm run import-cards` warns about set codes that are not among the stored sets, instead of the fixed list.
- The fixed set list, its script copy and their drift test are removed. The mechanic packs stay a fixed list (a later change).

## Capabilities

### New Capabilities
- `card-sets`: the stored sets and their fields, who reads and writes them, the Setler screen, adding, editing, ordering and deleting a set, its pictures, its change records, and how a card's set code finds its set.

### Modified Capabilities
- `app-shell`: the navigation gains "Setler" after "Kart kütüphanesi".
- `card-library`: set names and the set filter's order come from the stored sets.
- `definition-editing`: the card form offers the stored sets in their order.
- `pack-shop`: the groups follow the stored order; a set's packs, thresholds and Blessed candidates follow its pack layout instead of the Pandemonium name.
- `card-images`: set cardbacks and Cardmakers come from the stored sets instead of the picture build; set pack pictures are gone; a set's single pack is named after the set inside its group; set pictures are stored pictures that anyone may open.
- `admin-scripts`: the new set import, and the card import's set warning against the stored sets.
- `activity-log`: set changes are events.
- `data-access-control`: the signed-out exception covers set pictures too.

## Impact

- Firestore: new `sets` and `setChanges` collections, with rules and emulator rules tests. Storage: new `sets/{setId}/{file}` path, with rules and tests.
- App: a new `src/features/sets/` feature (provider, schema, API, screen, form). Replaces `src/features/cards/sets.ts` and touches `artContext`/`ArtProvider`, `packs/catalog.ts`, `CardBrowser`, `display.ts`, `HandSummary`, `CardFormDialog`, `activity-log` and `app/screens.ts`.
- Scripts: new `scripts/import-sets.ts` and `data/sets.csv`. Changes to `build-art` (`artFiles.ts`), `import-cards` (`cardRows.ts`, `messages.ts`) and `cardCatalog.ts`. The drift test is removed.
- Data: the dev emulator data needs one `import-sets` run with the archive folder. A real project will need the same run when it is deployed; the owner will do that together with us later.
- Docs: `docs/domain.md` (Sets), `README.md` (setup order: `import-sets` before `import-cards`).
