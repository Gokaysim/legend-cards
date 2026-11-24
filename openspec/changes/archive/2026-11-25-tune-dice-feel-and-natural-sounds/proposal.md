# Proposal

## Why

Three dice items from the owner's TODO list make the Zarlar screen feel off at the table:

- **The channel does not keep to its newest roll.** Once it holds 50 rolls, a new roll lands below the fold even when the user was reading at the end. The live channel always has more than 50 rolls.
- **The dice barely turn.** A die turns about a third of a turn before it lands, and every die spins the same way.
- **No sound for a natural.** The table wants a Nat 20 or a Nat 1 to be heard by everyone, not only seen on the Zarlar screen.

While reading the sound code, a likely bug turned up. Its cause is read from the code and has not been reproduced in a browser yet. After the app loads, "Zar sesi" stays silent until the switch is turned off and on again.

## What Changes

- **The channel keeps to its end.** When a roll arrives and the user is at the channel's end, the channel shows the new roll. This holds however many rolls the channel holds. A user who scrolled up keeps their place.
- **Livelier throws.** A new roll spins each die faster, in a random direction about each axis, so dice visibly tumble before they land.
  - The spin range is chosen by measuring simulated throws, so dice still come to rest within the five-second limit.
  - Rolls already in the channel keep their recorded throw and play exactly as before.
- **A sound for Nat 20 and Nat 1.** When a roll's natural mark shows, the device plays a short Nat 20 or Nat 1 sound, on every screen.
  - On the Zarlar screen it plays when the roll's result shows, after the dice rest. On other screens it plays when the roll arrives.
  - "Tekrar izle" plays it again, on that device only.
  - A player never hears the DM's hidden roll.
- **A new device setting.** "Bu cihazda" gains "Nat 20 / Nat 1 sesi", on by default. Turning it off silences the natural sounds on that device only.
  - It is separate from "Zar sesi" (the impact sounds, still off by default and still only on the Zarlar screen) and from "Atışları göster".
- **Sound starts after the first interaction.** The app wakes its audio at the user's first click or key press on the page, so sounds work after a reload. Browsers do not allow sound before that first interaction.
- **Two sound files.** The owner chose:
  - Nat 20: "Win sound effect" (OpenGameArt)
  - Nat 1: "Game Over Trumpet SFX" (OpenGameArt)

  Both are listed as public domain or CC0. Their licenses must be confirmed on their pages before the files are added. `THIRD_PARTY_NOTICES.md` names their source and license.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dice-rolls`: the channel keeps to its end when a roll arrives; throws spin livelier in random directions; a new "Natural sounds" behavior; a fourth device setting "Nat 20 / Nat 1 sesi"; "Zar sesi" works from the first interaction after a load; the notification card's "no sounds" rule is narrowed to the impact sounds.

## Impact

- **Code**
  - `src/features/dice/DicePage.tsx`: the channel's end-keeping, and reporting when a roll's result shows.
  - `src/features/dice/stage/owlbear/throws.ts`: the spin range and direction.
  - `src/features/dice/stage/owlbear/sounds.ts`: uses the shared audio context.
  - New `src/features/dice/sound/`: the shared audio context, the unlock on first interaction, the natural sounds and their files.
  - `src/features/dice/deviceSettings.ts` and `DiceSettingsDialog.tsx`: the new setting.
  - `src/app/layout/AppShell.tsx`: a watcher that plays the natural sound off the Zarlar screen.
- **Tests**
  - The golden simulation test generates its throws with the throw generator, so changing the generator would change its golden results. The golden cases are frozen to their current throws as literal data instead. The golden results stay unchanged and keep guarding Rapier.
  - Other throw and simulation tests are adjusted to the new ranges.
- **Data and rules**
  - No Firestore, rules or record format change.
  - The server never checked the throw ranges, and old records replay from their stored throws.
- **Assets and licensing**
  - Two small audio files are added. `THIRD_PARTY_NOTICES.md` and `docs/conventions.md` ("Adapted third-party code") gain a third-party sounds entry.
  - `throws.ts`'s header notes that the spin range now differs from upstream.
- **Out of scope**
  - Sounds for other events
  - A volume control
  - Dice sounds on the notification card
  - Changing the dice physics itself
