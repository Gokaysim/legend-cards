# Proposal

## Why

When the DM types a number into the "Bu eldeki cost" field of a card whose own cost is `X` or `d6`, the card's picture keeps showing the printed `X` or `d6`. A card with a number cost gets a badge on its cost corner instead. The owner wants the number to show on the card the same way, and wants a use to take exactly that many LP.

The cause is in the face. It shows the badge over the picture only when it can mark the hand cost lower or higher, and that needs two numbers. The `card-images` spec already asks for the badge whenever the hand cost differs from the card's own cost. Lower or higher is only its mark. The payment side already works: a use's price follows the hand cost (`holding.costOverride ?? card.cost`) in the app, in the use transaction and in the rules. With "3" written on an `X` card, the player is not asked for an amount and pays 3 LP.

## What Changes

- **The badge shows for any hand cost that differs.** A card with a picture, in a hand or in the card details, shows the DM's hand cost as the badge on the picture's cost corner whenever it differs from the card's own cost. That includes `X` → "3" and `d6` → "4", and also a number → `X`. The zoom view opened from a hand shows the same badge.
- **An unmarked badge is neutral.** When the two costs cannot be compared as numbers, the badge has no green or red mark. It uses the neutral look of the badge on a face without a picture, as the owner chose. Its title and its screen reader text still name the card's own cost ("temel cost: X"), as a marked badge's do.
- **"Differs" has one meaning.** Two numbers are compared by value ("3" and "3,0" are the same cost). Other costs are compared as text, without surrounding spaces or letter case ("d6" and "D6" are the same cost). The cost label in the card details ("Cost 3 (temel: X)") uses the same test, so the label names the card's own cost exactly when the badge shows.
- **No payment change.** A use of an `X` or `d6` card with a hand cost of a whole number pays exactly that number, as "The price of a use" already requires. The change adds scenarios and tests that hold this in place.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-images`: "Hand cost on a picture" says when two costs count as different, that a badge between costs that are not both numbers shows unmarked and neutral, and that the badge names the card's own cost either way. It gains `X` and `d6` scenarios.
- `card-zoom`: "Hand cost in the zoom view" gains the unmarked case and an `X` scenario.
- `card-holdings`: "The price of a use" gains scenarios for an `X` and a `d6` card with a number as the hand cost. The requirement text does not change.

## Impact

- **App code:**
  - `src/features/cards/display.ts`: the comparison of a hand cost with the card's own cost, which now reports "different but not comparable" too
  - `src/features/cards/CostBadge.tsx`: the neutral unmarked badge, whose title and screen reader text name the card's own cost
  - `src/features/cards/CardFace.tsx` and `src/features/cards/CardZoomDialog.tsx`: show the badge over the picture for any difference
  - `src/features/hands/holdingInfo.ts`: the details' cost label uses the same comparison
- **Tests:** `display.test.ts`, `CardFace.test.tsx`, `CardZoomDialog.test.tsx`, `holdingInfo.test.ts`, `HoldingDialog.test.tsx` (a player's use of an `X` card with a hand cost of "3"), and `tests/firestore.rules.emulator.test.ts` (the price of an `X` and a `d6` card with a hand cost).
- **Rules, data, indexes:** none. Nothing new is stored, and `firestore.rules` does not change.
- **Docs:** `docs/domain.md`, the card-face bullet about the hand cost badge.
- **Out of scope:**
  - True Words. A word's tile in the hand ignores the DM's cost for every word, not only for `X`. That is a separate follow-up if the owner wants it.
  - Letting players write the hand cost. It stays the DM's, as the rules require.
  - Rolling the `d6` in the dice channel, which belongs to the later `dice-card-rules` change.
  - Badges for long hand costs (up to 10 characters) that overflow the round badge. Faces without a picture already show them the same way.
