# Tasks

## 1. The channel keeps to its end

- [x] 1.1 In `src/features/dice/DicePage.tsx`, make the end-keeping layout effect depend on the newest roll's id, `settlingId` and `tab` instead of `list.length` (design D1). Keep `isAtEnd` and the 48 px slack.

  Verify with new `DicePage.test.tsx` cases:
  - a channel already holding 50 rolls, at its end, scrolls to the end when a 51st arrives and the oldest drops out
  - a channel scrolled up keeps its `scrollTop`

  Stub `scrollHeight` and `clientHeight` on the box, as jsdom has no layout. Scenarios: "Keeping to the newest roll" and "Reading older rolls".

## 2. Livelier throws

- [x] 2.1 Freeze the golden throws (design D3), before touching `makeThrows`:
  - Capture each `GOLDEN_CASES` case's throws from the current `makeThrows(dice, seededUnit(seed))`, and store them as literal data in `src/features/dice/stage/goldenCases.ts`.
  - Point `simulate.test.ts`'s golden test at them.

  Verify that `simulate.test.ts` passes with `simulate.golden.ts` unchanged (`git diff --stat` shows no change to it).
- [x] 2.2 Write a throwaway measurement script in the scratchpad, not in the repo. It imports `makeThrows` and `simulateThrow`, and runs 300 seeded throws each of 1d20, 2d6, 8d6 and 40d6 for:
  - today's ranges
  - the D2 candidate: spin 8–16 rad/s with a random sign, launch unchanged
  - if needed, a variant with launch 1.5–3 m/s

  For each, it reports the mean turn before the first floor contact, the mean time to rest, and the share of throws at the five-second limit. Run it under `vitest --project unit` or `tsx`, never a path-only vitest run.

  Pick the range that meets the D2 acceptance bounds, and record the numbers in this change's `design.md` under D2.
- [x] 2.3 Change `src/features/dice/stage/owlbear/throws.ts`:
  - the chosen spin magnitudes, and the launch speed if changed
  - a random sign per spin axis, drawn from the injected source, with `f32` rounding kept
  - `THROW_RANGES` holds the magnitudes
  - the header says the spin range and sign differ from upstream

  Update `throws.test.ts`:
  - it checks `|spin|` against the range
  - over a seeded batch, both signs occur on every axis
  - determinism stays

  Update the `THIRD_PARTY_NOTICES.md` line for `throws.ts` to say the ranges were changed. Verify with `npm run check`.
- [x] 2.4 Roll 1d20, 4d6 and 40d6 on the emulator app in two browser sessions. Check that:
  - the dice tumble visibly
  - both sessions play the same path and faces
  - an older roll's "Tekrar izle" plays as before

  Ask the owner to judge the look before moving on.

## 3. Shared audio and the wake-up

- [x] 3.1 Add `src/features/dice/sound/audio.ts` (design D4): one lazily created `AudioContext`, `unlockAudio()`, `loadSound(url)` cached by URL, and `playBuffer(buffer, gain)`. `playBuffer` tries `resume()` when the context is suspended and skips silently when the context is unavailable or not running.

  Verify with `audio.test.ts`, using a fake `AudioContext` on `globalThis`:
  - one context only
  - resume on unlock and on play
  - a decode failure is skipped
  - no throw without `AudioContext`
- [x] 3.2 Move `src/features/dice/stage/owlbear/sounds.ts` onto `audio.ts`. It drops its own context and keeps the cooldown and volume by speed. Update its header's "Changed for Legend Card Manager" note and the `THIRD_PARTY_NOTICES.md` line for it.

  Verify with `npm run check`. Then reload the Zarlar screen with "Zar sesi" on, click once anywhere, and check in the browser that another session's roll is heard. This is the reload bug from design Context.
- [x] 3.3 Add `useAudioUnlock()` (design D5) and mount it once in `src/app/layout/AppShell.tsx`. It listens once for the first `pointerdown` or `keydown` on `document`, calls `unlockAudio()`, and preloads the natural sounds when their setting is on.

  Verify with a test that:
  - the first pointer or key event unlocks once
  - the listeners are removed afterwards
  - nothing loads when the setting is off

## 4. The natural sounds setting and files

- [x] 4.1 Confirm the licenses before adding the files (design D8):
  - Open "Win sound effect" (https://opengameart.org/content/win-sound-effect) in Chrome.
  - Find "Game Over Trumpet SFX"'s own asset page (the known link https://opengameart.org/comment/106657 is a comment).
  - Confirm that each page states CC0 or public domain, and note the author and the URL.
  - If either says anything else, stop and ask the owner.
- [x] 4.2 Download both files into the scratchpad.
  - Convert each to MP3 with macOS `afconvert` or `ffmpeg` if installed: trim the leading silence, match their loudness to the impact sounds, keep each under about 3 s and 100 KB.
  - Save them as `src/features/dice/sound/nat20.mp3` and `nat1.mp3`.
  - Verify that they play in Chrome and Safari from a `file://` test or the dev server.
- [x] 4.3 Add a "Sounds" section to `THIRD_PARTY_NOTICES.md`: each file, its page URL, its author, its license and the conversion done. Add to `docs/conventions.md` ("Adapted third-party code") that CC0 or public-domain assets live with their feature and are listed in the notice file. Verify that the notice names both files exactly.
- [x] 4.4 Add `NATURAL_SOUND_KEY = 'lcm.dice.natural'` with `naturalSound`/`setNaturalSound` to `src/features/dice/deviceSettings.ts`. The setting is on unless `'0'` (design D7). Add the "Nat 20 / Nat 1 sesi" checkbox after "Zar sesi" in `DiceSettingsDialog.tsx`; turning it on calls `unlockAudio()` and `prepareNaturalSounds()`.

  Verify with:
  - `deviceSettings.test.ts`: on by default, off after writing `'0'`, kept after reload
  - a dialog test: the switch shows checked by default and turns the setting off
- [x] 4.5 Add `src/features/dice/sound/natural.ts`: the two `?url` imports, `prepareNaturalSounds()`, `playNatural(mark)`, and `playNaturalOnce(roll, enabled)` with a module-level set of sounded roll ids (design D6). It uses `naturalMark` from `formula.ts`.

  Verify with `natural.test.ts`:
  - a Nat 20 and a Nat 1 pick their sound
  - a roll without a mark, a roll without content (hidden on a player's device) and a disabled setting play nothing
  - the same roll id sounds once

## 5. When the natural sound plays

- [x] 5.1 Add `NaturalSoundWatcher` next to `DiceNotice` and mount it in `AppShell`. When `useFreshRoll()` changes to a new id while the path is not the Zarlar screen, it calls `playNaturalOnce`, whatever `showRolls` says.

  Verify with tests:
  - a Nat 1 arriving on the hand screen plays once
  - with `showRolls` off it still plays
  - on the Zarlar path it does not play
  - a hidden roll on a player's device plays nothing

  Scenarios: "A Nat 1 on another screen", "Cards turned off", "A hidden Nat 20".
- [x] 5.2 In `DicePage.tsx`, play a fresh roll's natural sound when its result shows (design D6):
  - when `settlingId` leaves the roll's id: rest, replacement or the 10 s timeout
  - at once when the roll never settles: flat dice, 3D off or reduced motion

  Verify with `DicePageSettling.test.tsx` cases:
  - a Nat 20 plays on rest, not before
  - with 3D off it plays at once
  - a roll replaced before rest plays when replaced
  - the user's own Nat 20 plays on rest
  - the roll shown at rest after a reload plays nothing

  Scenarios: "A Nat 20 on the Zarlar screen", "One's own natural", "Without the 3D dice", "Reloading the page".
- [x] 5.3 In `DicePage.tsx`, remember the strip key of a "Tekrar izle" playback, and on its `onRest` call `playNatural(mark)` when the setting is on.

  Verify with a test:
  - a replayed Nat 20 sounds on rest
  - a replay with the setting off is silent
  - the at-rest strip's own `onRest` with key 0 is silent

  Scenario: "Watching a Nat 20 again".

## 6. Domain docs and integration

- [x] 6.1 Update `docs/domain.md`:
  - the "Kanal" glossary entry: the natural sounds on every screen, the device setting, the end-keeping channel
  - the dice paragraph: livelier throws for rolls made after this change, old rolls replay unchanged

  Verify that the text matches the spec delta.
- [x] 6.2 End-to-end in the browser on the emulators, with the DM and Oyuncu 1 in two sessions:
  - a Nat 20 while the other session is on Zarlar is heard at rest
  - a Nat 1 while it is on the hand screen is heard with the card
  - turning "Nat 20 / Nat 1 sesi" off silences only that device
  - a hidden DM Nat 20 is silent for the player and heard by the DM
  - the channel with more than 50 rolls keeps to its end

  Seed rolls by rolling, never by writing to Firestore from outside the app.
- [x] 6.3 Verify that `npm run check` and `npm run test:emulator` both pass. Then stop every process on the project's ports as `CLAUDE.md` describes, and confirm with `lsof -nP -iTCP -sTCP:LISTEN`.

## Workflow follow-up

- Archive the change with `/opsx:archive` once it is reviewed, then commit (feat + docs archive) as the project does.
- Tick the three dice items ("zar sesi", the channel scroll, the spin) in `TODOS.md` when the change is archived.
