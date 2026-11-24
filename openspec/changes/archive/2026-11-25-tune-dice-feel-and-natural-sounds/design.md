# Design

## Context

See proposal.md for the why. The parts of the current code this design builds on:

- **The channel's end-keeping** (`DicePage.tsx`) already exists. A layout effect scrolls the box to its end when the user was within 48 px of it, but the effect depends on `[list.length, tab]`. `DiceProvider` subscribes to `limit(50)` newest-first, so once the channel holds 50 rolls a new roll drops the oldest and `list.length` stays 50. The effect never runs again.
- **Throws** come from `makeThrows` in `stage/owlbear/throws.ts`, called only on the roller's device (`throwDice.ts`). The record stores each die's throw and rest. Every device re-simulates from the stored throw (`simulate.ts`), and the server rules never check the throw ranges. The current spin is 2 to 6 rad/s on each axis, always positive. Dice fall about 1.1 m at twice the gravity, about 0.33 s in the air, so a die turns about a third of a turn before it lands, and the floor's friction of 10 then stops it.
- **The golden simulation test** (`goldenCases.ts`, `simulate.golden.ts`, `simulate.test.ts`) builds its throws with `makeThrows(dice, seededUnit(seed))`. It is meant to catch a Rapier upgrade that changes outcomes.
- **Sound.** `stage/owlbear/sounds.ts` holds a module-level `AudioContext` and the impact sounds. It lives in the lazily loaded stage chunk with three.js. `prepareSounds()` runs from an effect when the stage mounts, or from the "Zar sesi" switch's click, and resumes a suspended context. `playImpact()` never resumes it. After a reload on the Zarlar screen, the context is created without a user gesture, stays suspended, and nothing wakes it later. This is likely the "silent until toggled" bug.
- **Fresh rolls.** `DiceProvider` computes one `fresh` roll for the whole app (`freshness.ts`): newest arrival, at most 10 s old, with content. The roller's own roll becomes fresh at once from `rollHere`. A hidden roll has no content on a player's device, so it is never fresh there. `DiceNotice` (mounted in `AppShell`) shows the card from `fresh` when the user is not on the Zarlar screen. `DicePage` plays `fresh` in the strip and tracks `settlingId`, the fresh roll whose result is hidden until the strip calls `onRest`, until a newer roll replaces it, or until 10 s pass.
- **`onRest` also fires for rolls that do not play.** The strip calls it when it shows a roll at rest, with reduced motion and with flat dice. So `onRest` alone cannot mean "a roll just landed".

## Goals / Non-Goals

**Goals:**

- Natural sounds work on every screen without loading the 3D chunk.
- One audio context and one wake-up path for both kinds of sound.
- Old records replay bit-for-bit as before.
- The golden test keeps guarding Rapier, not the throw generator.

**Non-Goals:**

- Volume settings.
- De-duplicating sounds across several tabs of the same browser. Each open tab plays its own sound; tables do not keep two tabs open in practice.
- Playing a missed natural sound when the user leaves the Zarlar screen while its dice still tumble.

## Decisions

### D1. End-keeping follows the newest roll, not the count

The layout effect depends on the newest roll's id, the settling roll's id and the tab, instead of `list.length`. When a hidden result shows, its entry can change height, so `settlingId` is a dependency too.

`isAtEnd` stays a ref updated by the box's scroll events, with the same 48 px slack.

"Daha eski atışlar" adds rolls at the top without changing the newest id, so the channel no longer jumps to the end after loading older rolls. That fits a user who scrolled up to load them.

*Alternative:* a `ResizeObserver` on the list. It is more general, but jsdom lacks it, and the dependencies above cover every height change the channel makes.

### D2. Spin: a faster range, a random sign per axis, chosen by measurement

`makeThrows` draws each axis's spin magnitude from a new range and gives it a random sign.

- **Starting candidate:** 8 to 16 rad/s, which gives about 1 to 1.5 turns before landing.
- **Launch speed:** may rise from 1–2 m/s if the measurement shows the dice still settle too tamely.

The final values come from a measurement script run once during implementation. It simulates several hundred seeded throws each for 1d20, 2d6, 8d6 and 40d6 with the current and the candidate ranges, and reports:

- the mean turn before first floor contact
- the mean time to rest
- the share of throws that hit the five-second limit

The candidate is accepted when:

- the turn before landing is at least one full turn on average
- the share of throws at the five-second limit is no worse than today's plus 1 percentage point
- the mean time to rest grows by at most 1 s

The owner then judges the look in the browser.

**Measured (task 2.2):** 200–300 seeded throws per row, 60 for 40d6, galaxy dice.

- "Before landing" counts the turns up to a die's first impact. For several dice that impact is often another die, so the number is low for 8d6 and 40d6.
- No variant pushed a throw to the five-second limit.
- The time to rest did not move: about 1.0 s for 1d20 and 1.7 s for 40d6 in every variant.

| Spin (rad/s) | 1d20 turns before landing | 1d20 turns in all | 2d6 turns in all | 8d6 turns in all |
| --- | --- | --- | --- | --- |
| 2–6, always positive (before) | 0.37 | 0.89 | 0.91 | 0.76 |
| 8–16, random sign | 1.05 | 1.58 | 1.54 | 1.20 |
| 12–24, random sign | 1.57 | 2.12 | 2.04 | 1.60 |
| 16–32, random sign | 2.09 | 2.68 | 2.60 | 2.04 |
| 12–24 with launch 2–3 m/s | 1.50 | 2.12 | 1.99 | 1.44 |

**Chosen: 12–24 rad/s with a random sign, launch unchanged.**

- A lone die turns about one and a half times in the air, over four times as much as before.
- A faster launch only spread the dice and did not add turns.
- The owner judges the look in task 2.4, and the range can move within this table.

The random sign uses the same random source as everything else in a throw. The throw stays a pure function of that source, and `f32` rounding stays, so the roller's simulation and the stored record still match exactly.

`THROW_RANGES` stays exported as magnitudes, and the throws test checks `|spin|`. The header of `throws.ts` says the spin range and sign now differ from upstream.

*Alternative:* lower the floor's friction or raise the drop height. Both would change the physics that old records replay with, so old rolls would land differently. The spec forbids that.

### D3. Golden cases carry literal throws

`GOLDEN_CASES` stores each case's throws as literal data, captured once from the current `makeThrows` with the current seeds, before the ranges change. `simulate.test.ts` simulates those literal throws, so `GOLDEN_RESULTS` stays exactly as it is and still fails on a Rapier change.

The other simulation tests that use `makeThrows` with seeds keep doing so. Only their assertions that depend on particular outcomes, if any, are updated.

### D4. A shared audio module outside the stage

A new `src/features/dice/sound/` holds:

- `audio.ts`: the single lazily created `AudioContext`. It exposes:
  - `unlockAudio()`, which creates the context if needed and resumes it
  - `playBuffer(buffer, gain)`, which skips silently when the context is not running
  - `loadSound(url)`, which fetches and decodes once and caches by URL
- `natural.ts`: the two sound URLs, imported as Vite `?url` assets, plus `prepareNaturalSounds()` and `playNatural(mark)`.
- The two audio files, trimmed, loudness-matched and encoded as AAC (`.m4a`), which every current browser decodes. MP3 was the plan, but this machine has no MP3 encoder (no ffmpeg or lame, and `afconvert` cannot write MP3), so the files use AAC (decided during task 4.2).

This module is small and has no three.js, so `AppShell` can import it eagerly.

`stage/owlbear/sounds.ts` gives up its own context and uses `audio.ts`. `owlbear/` importing an app module is fine: the rule in `docs/conventions.md` limits who imports *from* `owlbear/`. The impact sound's cooldown and volume by speed are unchanged.

*Alternative:* put natural sounds in the stage chunk. That would load three.js on every screen just to play a jingle.

### D5. Wake audio on the first interaction

A `useAudioUnlock()` hook, mounted once in `AppShell`, listens once for `pointerdown` and `keydown` on `document`. On the first of either it calls `unlockAudio()`, and preloads the natural sounds when "Nat 20 / Nat 1 sesi" is on.

`playImpact` and `playNatural` also try `resume()` when the context is suspended. Since the page already has sticky user activation, that succeeds after any earlier click. This covers the case where the context was created before the first gesture and fixes the reload bug.

The settings switches keep calling the same unlock on their own click.

### D6. When the natural sound plays

Every play goes through `playNaturalOnce(roll)`. It checks the device setting and the roll's `naturalMark`, and keeps a module-level set of roll ids already sounded. That set enforces "at most once per fresh roll on a device" across the components.

Replays call `playNatural(mark)` directly, as they are meant to repeat.

**Off the Zarlar screen.** A `NaturalSoundWatcher` in `AppShell`, next to `DiceNotice`, acts when `fresh` changes to a new id while the path is not the Zarlar screen. It ignores `showRolls`, because the sound does not depend on the card.

**On the Zarlar screen.** `DicePage` plays a fresh roll's sound at the moment its result shows. That matches the spec's reference to "When a hidden result shows":

- When the roll starts settling, the sound plays when `settlingId` leaves that id: the dice rest, a newer roll replaces it, or 10 s pass.
- When the roll never settles, because of reduced motion, flat dice or 3D off, it plays when the roll becomes the strip's roll.

**Replays.** `DicePage` remembers the strip key of a "Tekrar izle" playback. When `onRest` fires for that key, it plays the natural sound if the setting is on. A strip shown at rest, never played, carries key 0 and is never remembered, so its `onRest` makes no sound.

**Hidden rolls** need no extra code. A hidden roll is never fresh on a player's device and has no content to replay. The DM's devices see its content and play it.

### D7. The new device setting

The key is `lcm.dice.natural`, read as on unless it is `'0'`, the same pattern as `showRolls` and `show3d`. The new switch "Nat 20 / Nat 1 sesi" sits in "Bu cihazda" after "Zar sesi". Turning it on also calls `unlockAudio()` and `prepareNaturalSounds()`.

### D8. Sound files and notices

The files come from the owner's choices, "Win sound effect" and "Game Over Trumpet SFX" on OpenGameArt. Before adding them, the implementer opens each asset page in the browser and confirms the license is CC0 or public domain. The Game Over Trumpet link points to a comment, so the asset's own page has to be found first. If either license is something else, implementation stops and the owner is asked.

- **`THIRD_PARTY_NOTICES.md`** gains a "Sounds" section: each file, its page URL, its author and its license.
- **`docs/conventions.md`** ("Adapted third-party code") notes that CC0 or public-domain assets live with their feature and are listed in the notice file, and gives where they live.

## Risks / Trade-offs

- [Faster spin keeps dice moving longer and hits the five-second limit more often, ending in a visible snap onto the recorded rest] → The D2 measurement bounds the share at the limit and the time to rest. If the starting candidate fails, the range comes down.
- [A tab never clicked since load stays silent] → Browsers require a gesture. The spec says such sounds are skipped silently. Most players click something early in a session.
- [The natural sound and the impact sounds overlap on the Zarlar screen] → The natural sound plays at rest, after the last impact, so they barely overlap.
- [Two tabs on one device both play] → Accepted (see Non-Goals).
- [The OpenGameArt files turn out not to be CC0 or public domain] → D8 stops and asks the owner. The code does not depend on which files are used.
- [Freezing the golden throws hides a change in `makeThrows` from the golden test] → `throws.test.ts` keeps covering the generator's ranges, signs and determinism.

## Migration Plan

No data migration. Deploy is the usual push to `master`.

- Old rolls replay unchanged.
- Rolls made after the deploy use the new spin. Devices on the old bundle still replay them correctly, because playback only reads the stored throw.
- Rollback is a revert. Rolls made in between keep their faster throws and still replay.
