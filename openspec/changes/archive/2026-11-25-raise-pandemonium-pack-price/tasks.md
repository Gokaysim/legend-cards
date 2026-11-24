# Tasks

## 1. The new price

- [x] 1.1 Set the Pandemonium Pack to `{ lp: 4, gp: 10000 }` in `PACK_PRICES` (`src/features/packs/catalog.ts`) and `'pandemonium': 4` in `packPrice()` (`firestore.rules`), leaving the Pandemonium Cursed Pack at 3 / 7500. Verify with the updated `catalog.test.ts` price table and a `PackShopPage.test.tsx` case for "The Pandemonium packs" (Pandemonium "4 LP / 10.000 GP", Cursed "3 LP / 7.500 GP").
- [x] 1.2 Add a rules case to `tests/firestore.rules.emulator.test.ts` for "The Pandemonium Pack's price": Ayla's Pandemonium Pack opening for 4 LP is allowed, and one for 3 LP is denied. Verify with `npm run test:emulator`.
- [x] 1.3 Update `docs/domain.md`: the Pandemonium row of the pack table (4 LP / 10000 GP), the note that the two Pandemonium packs share a price, and a dated line under the price history recording the owner's change back. Verify with `npm run check` (format).

## 2. Integration check

- [x] 2.1 Run `npm run check` and `npm run test:emulator`; both pass. Stop every process on the project's ports afterwards.

## Workflow follow-up

- Archive with `/opsx:archive`, then commit (feat + docs archive).
