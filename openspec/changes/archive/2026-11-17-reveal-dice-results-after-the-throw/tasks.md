# Tasks

## 1. The scroll fix

- [x] 1.1 Add `relative` to the channel's scroll box in `src/features/dice/DicePage.tsx`, with a comment on why (the entries' `sr-only` spans). Add a `DicePage.test.tsx` check that the box holding "Atışlar" is positioned (`relative` class). The browser measurement is in 5.2

## 2. Results hidden until the dice rest

- [x] 2.1 In `RollEntry.tsx`, add an `isSettling` prop (design D2): blur the dice row and mark it `aria-hidden`, add the `sr-only` "sonuç bekleniyor", drop the natural mark and its border color, and keep the name, time, note, formula and "Tekrar izle". Verify with `DicePage.test.tsx` through the page in 2.2
- [x] 2.2 In `DicePage.tsx`, add `settlingId` (design D1): set it when a fresh roll starts in the strip, not on `replay`; clear it on the strip's `onRest` for that roll, on a newer fresh roll, and after 10 seconds; pass `isSettling` to each `RollEntry`. Verify with `DicePage.test.tsx`, which already mocks the stage or renders flat dice. Cover:
  - a fresh roll's entry hides "Toplam" and the faces, and reads "sonuç bekleniyor"
  - the user's own roll is hidden too
  - the result shows after the strip reports rest
  - a newer roll shows the older one's result and hides its own
  - "Tekrar izle" hides nothing
  - fake timers show the result after 10 seconds
  - "Nat 20" and the gold border are absent while hidden
- [x] 2.3 Check that reduced motion and the flat (no-3D) path hide nothing, because `onRest` fires at once. Verify with a `DicePage.test.tsx` case using the reduced-motion mock or a roll without motion

## 3. The card without a tray

- [x] 3.1 In `DiceNotice.tsx`, remove `DiceView`, `isAtRest` and `onRest`, and start the timer when the card appears with `NOTICE_MS = 6000` (design D3). Lay it out in one column with the formula and the kept results wrapping, then the natural mark and the total. Update `DiceNotice.test.tsx`:
  - the card shows the roller, the note, the formula as written (with a sum) and the total, with no dice tray
  - it closes 6 seconds after it appears, not after a rest
  - pointer, focus, selection and replacement behave as before
- [x] 3.2 Remove the now unused `card` stage variant and its framing in `DiceView.tsx`, `stage/DiceStage.tsx` and `FlatStage` (design D4). Verify with `npm run check` (types, lint and the `DiceView` tests)

## 4. Docs

- [x] 4.1 Update `docs/domain.md`:
  - the "Kanal" entry: the channel hides a new roll's result until the strip's dice rest
  - the card shows the roll's text and total without dice
  - the "Zar atışı" line "every device plays that same throw" now refers to the strip

  Verify by reading both glossary rows against the spec delta

## 5. The whole check

- [x] 5.1 Run `npm run check` and `npm run test:emulator`, and confirm both pass. If the owner's `npm run dev` is running, back up `.firebase-emulator-data/` and stop it in the safe order first
- [x] 5.2 Check in Chrome on a throwaway emulator copy (no `--export-on-exit`):
  - at the owner's window size, the Zarlar screen's `scrollHeight` equals its `clientHeight` with a full channel, and at 360 px there is no sideways scroll
  - a roll's entry is blurred while the strip's dice tumble and shows its total when they rest
  - another user's roll on another screen opens the trayless card with the total, and it closes after about 6 seconds

  Delete the test rolls, sign out, and stop the servers and the emulators as CLAUDE.md says

## Workflow follow-up

- Tick "Batch 3" in `TODOS.md` once the owner accepts the change.
- Archive the change with `/opsx:archive` after review.
