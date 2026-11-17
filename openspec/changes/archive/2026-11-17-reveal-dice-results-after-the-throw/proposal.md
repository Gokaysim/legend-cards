# Proposal

## Why

This is Batch 3 of TODOS.md: how a roll's result is shown.

- **The result is spoiled.** On the Zarlar screen, a roll's entry in the channel shows its faces, its total and its natural mark while the dice are still tumbling in the strip, so the throw has no suspense.
- **The notification card's tray adds little.** On another screen, the card gives most of its room to a small 3D tray, which starts empty while the 3D part loads and is hard to see. It also cuts off the formula, which grew longer with written sums.
- **The Zarlar screen scrolls too far.** On a 1728×877 window, the page is 1725 px tall, so it scrolls about 850 px past its content.

## What Changes

- **Results hidden until the dice rest.** While the strip plays a newly arrived roll, that roll's channel entry blurs its dice faces, its fixed number, its total and its natural mark, and drops the gold or red border. The roller, the time, the note and the formula stay visible. The result shows as soon as the dice rest. It also shows at once when a newer roll replaces the playing one, and after at most 10 seconds.
  - The user's own rolls are hidden the same way.
  - Screen readers read "sonuç bekleniyor" instead of the result until it shows.
  - Nothing is hidden for "Tekrar izle", with reduced motion, on a device without 3D, or for rolls that do not play.
- **A card without the tray.** The notification card no longer has the 3D tray and plays no throw or sound. It shows the roller, the note, the formula as written with the kept results, the natural mark and the total, all at once. The formula wraps instead of being cut off.
- **The card closes 6 seconds after it appears.** This replaces "4 seconds after its dice rest". It still stays open while the pointer or the focus is on it, and after it is selected. A newer roll still replaces it.
- **No extra scrolling.** The channel's scroll box contains its screen-reader text. On a wide window the Zarlar screen is then no taller than its content, and the channel scrolls inside its own box.
- **A spec mismatch fixed.** The spec said the strip shows a written sum. The strip shows no formula, so that wording is corrected.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `dice-rolls`: new requirement "Results hidden until the dice rest". Modified requirements:
  - "The Zarlar screen": no scrolling past the content.
  - "A roll arrives on another screen": no tray.
  - "The notification card closes on its own": 6 seconds after it appears.
  - "Only fresh rolls play": the card is shown, not played.
  - "Dice without motion": only the strip has a numbers fallback.
  - "A fixed number written as a sum": the strip is no longer named.

## Impact

- **Code in `src/features/dice/`:**
  - `DicePage.tsx`: tracks the strip's playing roll and its rest, and fixes the channel box.
  - `RollEntry.tsx`: the hidden state.
  - `DiceNotice.tsx`: no `DiceView`, and a timer from when the card appears.
  - `DiceView.tsx` and `stage/DiceStage.tsx`: the unused `card` variant and its close-up framing are removed.
  - The tests of these files: `DicePage.test.tsx`, `DiceNotice.test.tsx`, `DiceView.test.tsx`.
- **Docs:** `docs/domain.md`, if its glossary mentions the card's tray.
- **Not affected:** no data, rules or record changes.
- **Out of scope:** the İnisiyatif tab still shows initiative totals at once.
