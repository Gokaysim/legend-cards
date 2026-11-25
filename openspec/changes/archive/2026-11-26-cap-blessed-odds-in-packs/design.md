# Design

## Context

A pack is built on the client. `packPools` (`src/features/packs/catalog.ts`) gives a pack its candidates, and `buildPack` (`src/features/packs/contents.ts`) samples 5 distinct cards from them with `sample()` from `src/lib/random.ts`, adds a Cursed card for a Cursed type, and shuffles. Today the Blessed cards are part of `cards` for the Pandemonium, Pandemonium Cursed, Golden, Cursed Golden and Mechanic Packs, so each one has the same chance as a Rare. The thresholds (`countFor`) count only the Rares for the rare packs, but for a Mechanic Pack they count `packPools(...).cards.length`, which includes the Blessed cards.

The server does not check how random a pack is: `validPack` checks the shape of `offered`, and `chosenFromPack` in `firestore.rules` checks that the chosen card is active, in the pool, and has the pack's flag on. That stays the trust model (see docs/domain.md, "Players are trusted").

## Goals / Non-Goals

**Goals:**

- Build the Pandemonium, Golden and Mechanic Packs with a separate 1-in-50 Blessed roll per card, and the Cursed types with no Blessed candidates, as a pure, seedable function, as `buildPack` is today.
- Keep every threshold where it is.
- Make the server deny a Blessed card chosen from a Cursed type.

**Non-Goals:**

- The server does not check the 2% roll, as it does not check the equal chance today.
- Random draws (spec: card-draws) keep the equal chance for every drawable card.
- The pool distribution dialog (`PoolDistributionDialog`) describes draws, not packs, and stays as it is.

## Decisions

### D1. A separate Blessed pool in `PackPools`

`PackPools` gets a `blessed: Card[] | null` field next to `slot` and `cursed`: the Blessed candidates of a pack that can show them, and `null` for every other pack. `cards` no longer holds Blessed cards.

- Pandemonium (one-pack set's Pack): `cards` = the set's Rares, `blessed` = the Blessed cards with "Set paketlerinde çıkar" on.
- Golden: `cards` = the Rares across all sets, `blessed` = the Blessed cards with "Mechanic paketlerinde çıkar" on.
- Mechanic: `cards` = the mechanic pack's normal cards, `blessed` = its Blessed cards, both with "Mechanic paketlerinde çıkar" on.
- Pandemonium Cursed and Cursed Golden: `cards` = the Rares as above, `blessed` = `null`.

Alternative: keep the Blessed cards in `cards` and split them out in `buildPack`. Rejected: the pool would no longer say what a pack can show, and the Cursed types would have to filter them out a second time.

### D2. The roll: `randomIndex(50, random) === 0` per card

`buildPack` rolls 5 times with `randomIndex(50, random)`. A 0 is a hit, so the chance is exactly 1 in 50 with no modulo bias, and a seeded source in the tests decides it. With `k` hits, it samples `min(k, blessed.length)` distinct Blessed cards, then fills the rest of the 5 from `cards` (after the Premium Rare slot where there is one), and shuffles as today. Rolling all 5 first and then sampling gives the same distribution as deciding card by card, because every card is shuffled anyway.

Alternative: `randomUnit(random) < 0.02`. Rejected: a float comparison is less exact than one whole-number draw, and `randomIndex` is already how the pack picks.

### D3. Thresholds stay the same

The Mechanic Pack's threshold keeps counting its Blessed cards (spec: "Blessed cards count for a Mechanic Pack"), so `countFor` counts `cards.length + blessed.length` for it. The rare packs keep counting their Rares only. When a Mechanic Pack passes the threshold but has fewer normal cards than its non-Blessed cards need, `buildPack` returns `null`, and the open fails with the existing "not enough cards" error. Every mechanic has far more normal cards than Blessed cards, so this does not happen with real data.

### D4. The server denies a Blessed card from a Cursed type

`chosenFromPack` adds: the chosen card's stored `kind` is not `blessed` when the pack's type is a Cursed type. It reads the card document (`card.kind`), not the client-written `chosen.cardKind`. `isCursedPack` is defined inside the draws block today, so it moves to the top level next to `isSetPackType`, and both blocks use it. The rules are close to their 1000-expression limit, so the emulator tests run the whole suite.

### D5. Rules page and domain docs

`RulesContent.tsx` gets the sentence the spec gives under "Paketlerdeki Blessed Kartlar". The test that forbade "%2" anywhere on the screen now checks only the draw section ("Blessed Kartların Nadirliği"). `docs/domain.md` rewrites the Packs difference "Blessed cards in the rare packs", the Blessed cards section and the deliberate decision "Blessed cards are mixed into the rare packs" to the DM's ruling of 2026-11-25, with the old and new odds.

## Risks / Trade-offs

- [The table expected more Blessed cards from these packs] → It is the DM's ruling; the Kurallar screen states the 2%, so everyone sees the rule.
- [A forged pack can still show more Blessed cards] → As today, the server checks only the channel and the pool; the table trusts its players, and the log shows every pack.
- [The rules hit the expression limit] → The addition is a few expressions; `npm run test:emulator` loads the whole rules file and fails if it does.

## Migration Plan

No data changes. A pack that is open during the deploy keeps the cards it shows, and its choice follows the new rule: a Blessed card in an open Cursed type pack cannot be chosen after the deploy, so the DM cancels such a pack (which refunds it). The deploy runs through CI on a push to `master`. Rollback is a revert.
