# Tasks

## 1. Pack candidates and the 2% roll

- [x] 1.1 Add `blessed: Card[] | null` to `PackPools` in `src/features/packs/catalog.ts` and split the Blessed cards out of `cards` (design D1): Pandemonium and Golden get their Blessed cards by their pack flag, a Mechanic Pack its mechanic's Blessed cards, the Pandemonium Cursed and Cursed Golden Packs `null`, every other pack `null`. Keep the Mechanic threshold counting Blessed cards (design D3). Verify with updated `catalog.test.ts` cases: the one-pack set's and Golden pools by flag, no Blessed card in the Cursed types' pools, and "counts Blessed cards for a Mechanic Pack" still passing.
- [x] 1.2 Roll each of the 5 cards with `randomIndex(50, random) === 0` in `buildPack` (`src/features/packs/contents.ts`), sample that many distinct Blessed cards (at most as many as there are), fill the rest from `cards`, and shuffle (design D2); update its doc comment. Verify with `contents.test.ts` cases using a scripted random source: no hit gives no Blessed card even with Blessed candidates; one hit gives one; two hits give two different Blessed cards; a hit with no Blessed candidate gives an ordinary card; a Mechanic Pack's hit gives only its own mechanic's Blessed card; the Pandemonium Cursed and Cursed Golden Packs never show a Blessed card over many seeds; Standard and Premium Packs never do.
- [x] 1.3 Check the share over many seeded packs: across 10.000 Golden Packs the Blessed cards are close to 2% of the cards shown (for example between 1.6% and 2.4%). Verify with a `contents.test.ts` case.

## 2. Server check

- [x] 2.1 Move `isCursedPack` to the top level of `firestore.rules` next to `isSetPackType`, and add to `chosenFromPack` that the stored card's `kind` is not `blessed` for a Cursed type (design D4). Verify with `tests/firestore.rules.emulator.test.ts` cases: choosing a Blessed card from an open Cursed Golden Pack and from a Pandemonium Cursed Pack is denied, choosing it from a Golden Pack is still allowed, and the existing pack-choice cases still pass under `npm run test:emulator`.

## 3. Rules page and docs

- [x] 3.1 Add "Mechanic, Golden ve Pandemonium Pack'lerinde her kartın Blessed çıkma şansı %2'dir yavrum; Cursed paketlerde Blessed çıkmaz." under "Paketlerdeki Blessed Kartlar" in `src/features/rules/RulesContent.tsx`. In `RulesPage.test.tsx`, check the new sentence, and limit the "no %2" check to the draw text of "Blessed Kartların Nadirliği". Verify with `npm run check`.
- [x] 3.2 Update `docs/domain.md`: the Packs difference "Blessed cards in the rare packs", the Blessed cards section (packs at 2% per card, none in Cursed packs), the Mechanic row's note that its Blessed cards come at 2% per card, the deliberate decision "Blessed cards are mixed into the rare packs" rewritten as the DM's ruling of 2026-11-25 (about 95% of Pandemonium Packs before, about 9.6% now for any of the three packs), and the Kurallar note that the packs' 2% is stated. Verify with `npm run check` (format).

## 4. Integration check

- [x] 4.1 Run `npm run check` and `npm run test:emulator`; both pass. Stop every process on the project's ports afterwards and confirm with `lsof -nP -iTCP -sTCP:LISTEN`.

## Workflow follow-up

- Archive with `/opsx:archive`, then commit (feat + docs archive).
