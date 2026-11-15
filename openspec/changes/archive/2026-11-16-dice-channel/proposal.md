# Proposal

## Why

The table rolls its dice outside the app, so nobody else sees a roll unless they are in the room. The owner wants a dice channel: a place where everyone's rolls appear live, and where the dice tumble in 3D the same way on every screen. A roll is often a shared moment, like a natural 20 or a fireball's eight d6, so it should be watched together.

On 2026-11-15 the owner settled these points in an explore session:

- **Dice.** d4, d6, d8, d10, d12, d20 and d100. One roll can mix them and add a fixed number.
- **The same roll everywhere ("yol 2").** Every device shows the same throw with the same animation, not just the same numbers. The roll's record is the truth: the channel and the total always come from it.
- **The engine.** The dice, their colliders, materials and sounds come from Owlbear Rodeo's open-source dice roller, which is licensed GPL-3.0. Using it makes this project GPL-3.0 too. The owner accepts that and plans to make the repository public.
- **The look.** Out of three directions on a design canvas (https://claude.ai/artifact/NHYpcY8pHXGx7GyTKhsGMU), the owner chose **V2 · Sohbet**: the channel comes first, like a chat, with the latest roll tumbling in a strip above it and the roll form below it. On other screens a roll arrives as a notification card.
- **Scope.** Card rules that use dice (a `d6` cost, 1 LP for advantage, the Cursed bargain) are left for a later change, `dice-card-rules`.

## What Changes

**A new "Zarlar" screen**
- A menu entry "⚄ Zarlar", between "Setler" and "İşlem Logu".
- **The channel.** Every signed-in user sees every roll, live and oldest to newest, as in a chat. Each roll shows:
  - who rolled it, when, and its note
  - each die with its result, and the total
  - a natural 20 or a natural 1, when the roll is one d20
  - a "Tekrar izle" control that plays the throw again
- **The strip.** The newest roll tumbles in a 3D strip above the channel.
- **The roll form**, below the channel:
  - quick dice d4 to d100
  - the formula
  - a fixed number from −99 to +99
  - a note of up to 80 characters
  - "Avantaj" and "Dezavantaj" for a single d20
  - "At"
- **Limits.** At most 12 physical dice per roll. A d100 counts as two: a tens die and a d10.
- **Settings.** A side column holds the player's dice style (8 styles) and two device settings: "Atışları göster" and "Zar sesi".

**Everyone watches a roll**
- **Every device, the same way.** A roll tumbles the same way on every device. The roller's device throws the dice once, records the throw, the resting positions and the results, and every device plays that throw.
- **On other screens.** Another user's roll arrives as a notification card: bottom right on a wide window, at the top of a phone. The card holds a small tray, the note and the total.
  - It closes after 4 seconds, and stays open while the pointer is on it or after it is selected.
  - A newer roll replaces it.
  - Rolls older than 10 seconds, such as those that arrive after a reload or a lost connection, only appear in the channel.
- **Badge.** The menu's "Zarlar" entry counts the rolls the user has not seen yet on this device.
- **Without motion.** With reduced motion, without WebGL, or when the 3D part cannot load, the dice show at rest, or as numbers, and everything else works.

**The DM's hidden roll**
- The DM can roll "Gizli". Players see only "DM gizli zar attı" in the channel and no notification. The DM sees the roll in full, on all their devices.

**Dice style**
- Each user picks one of the 8 Owlbear styles, stored in their profile. Each roll records its style, so a user's dice look the same on every screen.

**License**
- The repository becomes GPL-3.0: a `LICENSE` file, the license in `package.json`, and a notice for the adapted Owlbear Rodeo files, which keep their copyright and mark what changed.

## Capabilities

### New Capabilities
- `dice-rolls`: the dice channel. It covers:
  - building a roll and its limits
  - the results and how a d100 and advantage count
  - the channel and its paging
  - the same throw on every device, with the record as the truth
  - the strip, the notification card and the badge
  - the dice styles and the device settings
  - the DM's hidden roll
  - the roll records and their access rules
  - reduced motion and the fallback without 3D

### Modified Capabilities
- `app-shell`: the navigation gets the "Zarlar" entry between "Setler" and "İşlem Logu". This builds on the eight entries of `merge-library-tabs`, which therefore lands first.
- `user-profiles`: a user may also change their own dice style, one of the 8 styles. Nothing else about the profile rules changes.
- `developer-workflow`: the repository carries the GPL-3.0 license and a notice for the third-party code it adapts.

## Impact

- **Data.**
  - A new `diceRolls/{rollId}` collection: one immutable record per roll. A hidden roll's public record holds only who rolled and when.
  - A new DM-only `dmRolls/{rollId}` collection holds the hidden roll's content.
  - `users/{uid}` gets an optional `diceStyle`.
- **Rules and tests.**
  - `firestore.rules` gets `diceRolls` and `dmRolls`: create only for oneself, the shape fully checked, a hidden roll only by the DM and only together with its `dmRolls` record, no update or delete.
  - The profile rule allows `diceStyle`.
  - `tests/firestore.rules.emulator.test.ts` covers every allowed and denied case.
  - The queries order on one field (`at`), so no composite index is needed.
- **Code.**
  - A new `src/features/dice/`: the schema and api, `DiceProvider` and its hooks, the Zarlar page, the notification card, the badge, the device settings, and the 3D part.
  - The 3D part sits in its own lazily loaded folder: the adapted Owlbear meshes, colliders, materials and sounds, a fixed-step Rapier simulation, and a React Three Fiber renderer.
  - `src/app/` gets the screen entry, the route, and the notification card mounted in `AppShell`.
  - `src/test/` gets `TestDiceProvider`, and `renderApp` a `dice` option.
- **Dependencies.**
  - New: `three`, `@react-three/fiber` and `@dimforge/rapier3d-deterministic-compat`. They are MIT and Apache-2.0, and both work with GPL-3.0.
  - They and the dice assets load only when the dice are first shown.
- **Unchanged.** The İşlem Logu, the statistics, cards, LP and the table lock. A roll makes no log event and no payment.
- **Docs.**
  - `docs/domain.md` gets the dice channel and its words.
  - `docs/conventions.md` gets the dice feature, its provider, and the rule for adapted GPL files.
  - `README.md` gets the license.
- **Publication.** Making the repository public is the owner's own step after this change. Its checklist is in `design.md`.
