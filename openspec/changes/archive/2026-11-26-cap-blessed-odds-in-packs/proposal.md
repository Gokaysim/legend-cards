# Proposal

## Why

The packs that can show Blessed cards draw them as ordinary candidates, with the same chance as every other card. With the owner's data (25 Pandemonium Rares and 19 Blessed cards in the pool), about 95% of Pandemonium Packs show a Blessed card, about 2 per pack. The table noticed it on 2026-11-25, and the DM (Aslan Dilek) ruled that each card of a pack has a 2% chance of being Blessed, and that the Cursed packs show no Blessed card. This reverses the "Blessed cards are mixed into the rare packs" decision of `add-pack-shop`.

## What Changes

- **BREAKING (game rule).** In the Pandemonium Pack (and the Pack of any "Tek paket + Cursed" set), the Golden Pack and every Mechanic Pack, each of the 5 cards is Blessed with a 2% chance, rolled on its own. A card that rolls Blessed is a random Blessed card of that pack's candidates, and the others are drawn from the pack's other candidates as today. A pack can show more than one Blessed card, never the same card twice. When a card rolls Blessed but no Blessed candidate is left, it is an ordinary candidate instead.
- **BREAKING (game rule).** The Pandemonium Cursed Pack (any one-pack set's Cursed Pack) and the Cursed Golden Pack show no Blessed card: their 5 cards are Rares only, plus their Cursed card.
- The server denies choosing a Blessed card from a Cursed type of pack.
- The Kurallar screen's "Paketlerdeki Blessed Kartlar" states the 2% per card and that the Cursed packs give no Blessed card. A random draw keeps its equal chance, and its text still names no percentage.
- `docs/domain.md` replaces the deliberate decision on Blessed cards in the rare packs with the DM's ruling.
- Unchanged: which Blessed cards each pack can show (its pack flag, and for a Mechanic Pack its mechanic pack), the opening thresholds (Mechanic Packs still count their Blessed cards, the rare packs only their Rares), prices, and the Standard, Premium and Cursed Packs of a set, which never show Blessed cards.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pack-shop`: "Blessed cards in rare packs" becomes the 2% per card rule for the Pandemonium, Golden and Mechanic Packs and no Blessed card for the Cursed types; "Mechanic pack contents" and "Cards in a pack are distinct and in the pool" follow it; the server's check of a chosen card denies a Blessed card from a Cursed type.
- `rules-page`: "Blessed cards in packs and mechanics" states the 2% per card and the Cursed packs' exclusion; "Blessed chance in a draw" no longer forbids "%2" on the whole screen, only in the draw rules.

## Impact

- `src/features/packs/catalog.ts` (`packPools`: a separate Blessed pool, none for the Cursed types) and `src/features/packs/contents.ts` (`buildPack`: the per-card roll), with their unit tests.
- `firestore.rules` (`chosenFromPack`) and `tests/firestore.rules.emulator.test.ts`.
- `src/features/rules/RulesContent.tsx` and `RulesPage.test.tsx`.
- `docs/domain.md` (Packs differences, Blessed cards, Deliberate decisions).
- No data migration: packs already open keep the cards they show.
