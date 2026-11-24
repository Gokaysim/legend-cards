# Proposal

## Why

The owner says the Pandemonium Pack's price is wrong: it should be 4 LP / 10.000 GP. v2.2.8 had lowered it from 4 LP / 10.000 GP to 3 LP / 7.500 GP, and the app followed v2.2.8 (see "Changes since v2.1.15" in `docs/domain.md`). The owner now restores the higher price.

## What Changes

- The Pandemonium Pack costs 4 LP / 10.000 GP, up from 3 LP / 7.500 GP. This holds for every set of the one-pack layout, such as "Ballad of Ulagal Pack", since those are priced as the Pandemonium Pack.
- The Pandemonium Cursed Pack stays at 3 LP / 7.500 GP (the owner's choice). The two Pandemonium tiles no longer share a price.
- The server takes 4 LP from a player who opens a Pandemonium Pack, and refuses 3.
- Packs opened before the change keep the price they were paid; no record changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pack-shop`: the "Pack prices" table gives the Pandemonium Pack 4 LP / 10.000 GP.
- `card-images`: the Pandemonium group's scenario shows each tile's own price.

## Impact

- `src/features/packs/catalog.ts` (`PACK_PRICES`) and `firestore.rules` (`packPrice`), kept in step.
- Tests: `catalog.test.ts`, `PackShopPage.test.tsx`, and a rules test for a Pandemonium Pack opening.
- Docs: the Pandemonium row of the pack table and the note on shared prices in `docs/domain.md`, with this decision recorded.
- No data migration.
