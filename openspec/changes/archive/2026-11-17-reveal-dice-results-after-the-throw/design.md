# Design

## Context

- `DicePage.tsx` keeps a `StripState` (`roll`, `playing`, `key`). A fresh roll from `useFreshRoll()` sets `playing: true`, and so does "Tekrar izle" (`replay`). The strip's `DiceView` gets no `onRest`.
- `DiceView` calls `onRest` once the dice lie at rest. `DiceStage` calls it at the end of the playback, and at once when `playing` is false (reduced motion: `playing && !isReduced`). `FlatStage` calls it at once on a device without 3D, when the roll has no motion, or when the stage fails. While the 3D chunk loads under `Suspense`, nothing calls it.
- `RollEntry` renders the formula, `FlatDice`, `view.modifier`, `NaturalMarkLabel` and the total, with an `sr-only` "Toplam: " inside the total, and a gold or red border from `view.mark`.
- `DiceNotice` renders a `DiceView` with `variant="card"`, whose `onRest` starts the 4-second timer (`NOTICE_MS`). `variant="card"` is used nowhere else. `DiceStage` frames the dice up close for it (`variant === 'card'`, line 109).
- The page scroll was measured in Chrome. The channel box (`max-h-120 overflow-y-auto lg:max-h-[calc(100dvh-13rem)]`) is not positioned, so the `sr-only` spans (`position: absolute`) in its entries take the page as their containing block, and their overflow is not clipped. At 1728×877 the document was 1725 px. With `position: relative` on the box it was 877 px. At 360×740 it went from 2340 px to 1241 px. The dev-environment memory records the same pitfall on the library table.

## Goals / Non-Goals

**Goals:**
- Hide the result only where a throw is actually being watched, the Zarlar screen's channel, and keep the rule "the result shows when the dice rest".
- Make the card simpler and quicker to read, with no 3D work on other screens.

**Non-Goals:**
- No blur in the İnisiyatif tab. Its totals show at once, as today.
- No change to the strip, the record, the rules or the freshness logic.
- No sound on other screens. "Zar sesi" now only concerns the strip.

## Decisions

### D1. The Zarlar screen owns a "settling" roll ID

`DicePage` adds `settlingId: string | null`.

- **When it is set:** when a fresh roll starts playing in the strip. That is the existing branch `fresh.id !== playedFresh`. It is never set by `replay`.
- **When it is cleared:** by the strip's `onRest` (passed to its `DiceView`, compared with the roll's ID so a late callback from a replaced roll does nothing), when a newer fresh roll replaces it, and by a 10-second timeout keyed on the ID.
- **How it is used:** `RollEntry` gets `isSettling={roll.id === settlingId}`.

Reduced motion and no-3D devices clear the ID right away, because `DiceView` calls `onRest` at once in both cases. No special case is needed, and the spec's "nothing is hidden" holds.

- *Alternative: hide by the roll's age, for example the first 3 seconds.* Rejected. It does not follow the real throw, which varies with the dice and the device, and it would hide rolls on devices that never played them.
- *Alternative: keep the state in the provider, so it survives leaving the screen.* Rejected. Leaving the Zarlar screen unmounts the strip, so nothing is being watched. Coming back shows the roll at rest, which matches "a roll that does not play".

### D2. How `RollEntry` hides the result

When `isSettling` is set:

- The dice row (`FlatDice`, `view.modifier`, `NaturalMarkLabel`, the total) gets `blur-sm select-none` and `aria-hidden="true"`.
- An `sr-only` text, "sonuç bekleniyor", takes its place for assistive technology.
- The border falls back to `border-line`, and the natural mark is not rendered, so its color cannot leak through the blur.
- The formula, the note, the name, the time and "Tekrar izle" stay as they are.

When the result shows, the blur is removed with a short `transition-[filter]` under `motion-safe:`.

The blurred dice still render, so the entry does not jump in size when the result appears.

### D3. The card without a tray

`DiceNotice` drops `DiceView`, the `isAtRest` state and `onRest`. The timer starts when the card's state is created for a roll. `NOTICE_MS` becomes 6000, and the comment and spec reference are updated.

The layout is one column:
1. The avatar and the name, and "Kapat".
2. The note.
3. The formula and the kept results, wrapping (`break-words`, no `truncate`), then the natural mark and the total.

The mobile-only formula next to the name goes away, because there is now room for the full line on every width.

### D4. Remove the unused `card` variant

With no caller, `StageVariant` becomes `'strip'` only. The card framing branch in `DiceStage` and the `sm` size path that only the card used in `FlatStage` are removed. If removing them turns out to touch more of the stage than these spots, keep the type and leave a comment instead. This is dead-code cleanup, not behavior.

### D5. The scroll fix

Add `relative` to the channel box in `DicePage`. jsdom has no layout, so a unit test can only check that the box is positioned. The real check is in the browser: at 1728×877, `document.documentElement.scrollHeight` equals `clientHeight`.

## Risks / Trade-offs

- **[The 3D chunk loads slowly on a device, and the dice start late]** → The entry stays blurred until they rest, at most 10 seconds after the roll arrived (D1). After that the result shows even if the dice are still moving.
- **[A background tab pauses `requestAnimationFrame`, so `onRest` comes late]** → The 10-second timer is a `setTimeout`, which still runs in a background tab, though throttled. So the result shows within about 10 seconds either way.
- **[The roller sees their own result later than before]** → This is the owner's choice in exploration.
- **[Players on other screens see the total at once while those on Zarlar wait]** → Accepted. The owner chose a card with the total.
