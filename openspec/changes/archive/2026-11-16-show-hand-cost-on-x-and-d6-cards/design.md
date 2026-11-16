# Design

## Context

See proposal.md for why. The code that the approach has to work with:

- **One comparison, two meanings.** `costChange(cardCost, handCost)` in `src/features/cards/display.ts` returns `'lower'`, `'higher'` or `null`. It returns `null` both when the costs are the same and when either one is not a number. `CardFace` and `CardZoomDialog` use that result to decide whether the badge shows over the picture (`change ? badge : sr-only badge`). So "cannot be marked" also hides the badge.
- **The badge.** `CostBadge` takes `cost`, `baseCost` and `change`. With no `change` it renders the neutral look (`border-line bg-canvas text-ink`). Its title and screen reader text name the card's own cost only when `change` is set.
- **The face without a picture** always shows the badge in its header. That is the only place an `X` → "3" hand cost is visible on a face today.
- **The details label.** `costInfo` in `src/features/hands/holdingInfo.ts` compares the raw strings (`handCost !== card.cost`). That is a third way to decide whether a hand cost differs.
- **The price is settled.** `priceOfUse(holding.costOverride ?? card.cost)` drives the use step (`planUsePayment`), the use transaction (`src/features/hands/api.ts`) and the rules (`handCost()` with `priceAllows`). A number written on an `X` or `d6` card is a fixed price everywhere. Nothing about payment changes here.

## Goals / Non-Goals

**Goals:**
- The face, the zoom view and the details label agree on when a hand cost differs. The badge shows exactly when the label names "temel".
- An unmarked difference looks like the existing neutral badge, as the owner chose.

**Non-Goals:**
- No change to the face without a picture, beyond the badge's title and screen reader text.
- No change to `TrueWordTile` (see proposal, Out of scope).
- No change to how a badge fits long text.

## Decisions

### D1. `costChange` gets a fourth state, `'other'`
- **The result.** `costChange(cardCost, handCost)` returns:
  - `null` when the costs are the same
  - `'lower'` or `'higher'` when both are numbers that differ
  - `'other'` when they differ but are not both numbers
- **The comparison.**
  - Two numbers (`numericCost`) compare by value, so "3" and "3,0" are the same.
  - Otherwise both are trimmed and lowercased, so "d6" and "D6" are the same. A missing cost counts as the empty text.
  - Examples: a Blessed card (no cost) with "2" in the hand is `'other'`. "X" with "3" is `'other'`. "3" with "X" is `'other'`.
- **The callers.** `CardFace` and `CardZoomDialog` keep `change !== null` as their test for showing the badge over the picture. The bug goes away without new branches in either face.
- **Alternative considered:** a separate `handCostDiffers()` beside `costChange`. Two functions would have to agree, and every caller would need both. Rejected.

### D2. The badge marks only lower and higher
- **The look.** `CostBadge` treats `'other'` as unmarked. It keeps the neutral classes and sets no `data-cost-change`, since that attribute names a mark. The picture's position classes (`border-2 shadow-md`) apply as for a marked badge, so the neutral badge stands off the picture the same way.
- **The text.**
  - The title becomes "Cost: 3 (temel cost: X)", as a marked badge's title already reads.
  - The screen reader text adds " (temel cost: X)", without a lower or higher word.
- **Consequences for the existing tests.** The face tests "does not mark a non-numeric hand cost" and "does not mark a non-numeric card cost" stay true, since there is no mark. The new tests check that the badge is visible (not inside `.sr-only`) and names the card's own cost.
- **Alternative considered:** a gold "set by the DM" look. The owner chose neutral, and gold already means the Rare frame and the selected glow.

### D3. The details label uses the same comparison
- **The change.** `costInfo` names "temel" when `costChange(card.cost, handCost) !== null`, instead of comparing the raw strings.
- **What it changes.** "3,0" on a 3-cost card now reads "Cost 3", and "D6" on a "d6" card reads "Cost d6". Every case the specs name keeps its text: "Cost 1 (temel: 3)", "Cost 2 (temel: —)", and now "Cost 3 (temel: X)".
- **Alternative considered:** leaving `costInfo` alone. The label and the badge would then disagree on a written-another-way cost. That is harmless but confusing, and the fix is one line. Rejected.

### D4. Payment is held in place by tests, not by code
- **Rules emulator test.** Next to "pays the cost override instead of the card's own cost", seed an "X" card with "3" in the hand, which allows 3 and denies 2, and a "d6" card with "4", which allows 4 and denies 3. A die value is not enough once the hand cost is a number.
- **UI test.** In `HoldingDialog.test.tsx`, Ayla's use of an "X" card with "3" in the hand shows no amount field, reads "Kullanımı onayla (3 LP)", and calls the use with 3.
- **No new code.** No app code changes for payment. If either test fails, that is a bug in the existing payment path. Fix it in this change, because the owner asked for this behavior.

## Risks / Trade-offs

- [A neutral badge is less striking than green or red over a busy picture] → It keeps the same `border-2 shadow-md` and an opaque canvas background as the marked badges. Check it in the running app on a light and a dark picture, at 360 CSS pixels and on a desktop width.
- [A hand cost of more than about three characters ("1d6+2") overflows the round badge] → The face without a picture already behaves this way. The DM writes numbers in practice. Left out of scope.
- [The details label changes for costs written another way] → Only the "temel" part goes away, and only when the badge also does. No spec scenario covers those texts.

## Migration Plan

None. No data, rules or indexes change, and there is nothing to roll back beyond the code.
