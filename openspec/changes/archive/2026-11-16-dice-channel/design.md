# Design

## Context

The motivation and the owner's decisions are in `proposal.md`, and the required behavior is in the specs (`dice-rolls`, plus the deltas to `app-shell`, `user-profiles` and `developer-workflow`). This design explains how the parts fit together.

What already exists:

- **Shared data comes from providers.** Data that many screens share is subscribed to once, in a provider mounted in `App.tsx`. Each provider has a test provider in `src/test/` (docs/conventions.md, "Data access").
  - `DrawsProvider` and `LiveDrawView` are the closest model: a short newest-first query, and a view mounted in `AppShell` that shows other users' activity on any screen (`live-draws`).
- **Access rules.** Firestore is closed by default. Each path gets an explicit rule plus emulator tests. Writes that span documents check each other with `getAfter()` and `existsAfter()`.
- **Documents are validated on read.** Every read goes through a zod converter. A document that fails validation turns the whole subscription into `invalid-data`. So one malformed roll record could blank the channel for everyone. D4 is shaped by this.
- **Randomness.** `src/lib/random.ts` already gives cryptographic random integers.
- **Ordering with another change.** The navigation is being cut to eight entries by `merge-library-tabs`, which is in progress. This change's `app-shell` delta assumes those eight entries, so `merge-library-tabs` is archived first.
- **The engine to adapt.** Owlbear Rodeo's dice roller (GPL-3.0, last commit `ccc32beceee0888c0a48129fbb23f4a636c710ee`, 2024-04-10) is a React 18 / R3F 8 / `@react-three/rapier` 1 app with MUI and zustand.
  - It holds every die (d4 to d20, plus a d100 tens die) as glTF meshes in two shapes, convex-hull colliders, 8 PBR styles plus a tray material, an HDR environment, impact sounds and preview pictures.
  - It syncs a roll by sharing each die's throw (position, rotation, linear and angular velocity), its final transform and its value. Rapier is deterministic, so each client re-simulates the throw.

## Goals / Non-Goals

**Goals:**
- The same throw on every device, with the stored record as the final word (spec: "The same throw on every device").
- Physics and rendering kept apart. The roller can then compute the outcome before writing, and every device runs the same computation.
- No cost for screens that never show dice. Three.js, Rapier and the assets load only when a roll is first shown.
- A malformed or hostile record can at worst lose its own 3D. It can never break the channel.

**Non-Goals:**
- Card rules with dice: the `d6` cost, advantage for 1 LP, and the Cursed bargain. They go to `dice-card-rules`.
- Interactive dice (dragging and throwing with the pointer), custom dice sets, and dice per character.
- Proving fairness on the server. The roller's device creates the throw, as it creates the draws today.
- Showing who is online, typing indicators, or reactions in the channel.

## Decisions

### D1. Adapt Owlbear's assets and geometry, not its app

From the pinned commit, take:
- the **rounded** dice meshes
- the collider hull points
- the 8 dice materials and the tray material, with their textures
- the environment map
- one set of impact sounds (`medium/dice`)
- the preview pictures

Rewrite the rest for this app's stack. Drop MUI, emotion, zustand, immer and the Owlbear SDK.

The adapted files live in `src/features/dice/stage/owlbear/`. Each file keeps the upstream copyright, names the project and the commit, and says what changed (spec: developer-workflow, "Adapted third-party code").

- *Alternative:* port the whole app and its stores. Rejected, because it would bring two UI systems and a second state library into the project.
- *Alternative:* write our own meshes. Rejected, because the owner chose Owlbear's look on the canvas, and it is much more work.

### D2. Physics in a pure module, rendering only plays frames

`simulateThrow(dice, throws)` builds a Rapier world:
- fixed step of 1/120 s
- the tray's walls and floor
- one rigid body per physical die, with its hull collider and density

It steps until every die sleeps, or for 5 s at most. It returns:
- one frame per two steps (60 per second), each frame the dice's transforms
- each die's rest transform and its upward face's value
- the impacts, as a frame index and a strength

The R3F scene draws the frames against elapsed time and interpolates between two frames. It never steps physics.

The package is `@dimforge/rapier3d-deterministic-compat`:
- It is Rapier's build for cross-platform determinism.
- Its WASM is inlined, so Vite needs no plugin.
- Owlbear's `@react-three/rapier` uses the regular build, tied to the render loop.

Why the physics is kept out of the render loop:
- A background tab or a slow phone would otherwise step a different number of times.
- The roller could not know the outcome before the throw is shown.

With a pure function, the roller simulates first (a few milliseconds for 12 dice), writes the record, and plays the frames it already has. Watchers run the same function on the recorded throws.

- *Alternative:* Owlbear's live `@react-three/rapier` simulation. Rejected for the reasons above.
- *Alternative:* store sampled frames and play them back without physics on the watchers' devices. This is the fallback if the spike (task 1) shows that determinism fails across browsers. The record's `motion` field (D4) is versioned so that it can switch.

**Spike result (2026-11-16, task 1.2).** 20 seeded throws (1, 2, 8 and 12 dice, every type, Galaxy and Iron) ran in Node 24 (V8), Chrome 157 and Safari 27.2 (JavaScriptCore) on an Apple-silicon Mac. Every throw matched bit for bit on all three: the values, a hash of every frame, a hash of the rests, and the impacts. So `sim` stays 1. Firefox and a phone were not available to the agent and are still to be checked; D8's settling and its `console.warn` cover a device that drifts until then.

The spike also found that Owlbear's d20 mesh is turned by −1.38 rad about its z axis inside its group, and its face locators with it. Without that turn the face table reads some d20 faces twice as often as others. `owlbear/faces.ts` applies the turn, and the renderer turns the mesh the same way. With it, 1,200 simulated d20 are spread evenly over the 20 faces.

### D3. Throws, faces and how results are read

The roller's device makes each die's throw with Owlbear's ranges (`DiceThrower`). It draws uniform floats from `cryptoRandom`, through a new `randomUnit()` in `src/lib/random.ts`.

A die's value is the face whose normal points most nearly up at rest. Owlbear finds it from locator children in the glTF. We port those into a per-type table of face normals and values, so the reading works in the pure module without three.js scene objects.

Stored face values are what the die shows:
- d4 to d20: 1 to N
- a d10: 1 to 10, where the "0" face is 10
- the d100 tens die: 0, 10, …, 90, where "00" is 0

For a percentile pair, the d10 counts its 10 as 0, and a pair of 0 and 0 reads 100. This is the spec's "Results and the total".

Advantage and disadvantage throw two d20 bodies. Which one is kept is derived when the roll is read, never stored.

### D4. Records: strict where the channel reads, a sealed blob for motion

`diceRolls/{rollId}` holds:

```
by        uid of the roller
at        server timestamp (null in the local snapshot while pending)
hidden    false
style     'galaxy' | 'gemstone' | 'glass' | 'iron' | 'nebula' | 'sunrise' | 'sunset' | 'walnut'
mode      'normal' | 'advantage' | 'disadvantage'
modifier  int, -99..99
note      string, 0..80 characters (trimmed with cleanText)
dice      [{ t: 'd20', v: 17 }, ...]   physical dice in throw order, 1..12
motion    string, at most 1400 characters
sim       int, the motion format (1 = throws + rests)
```

`motion` is base64 of a little-endian `Float32Array` with 20 floats per die:
- the throw: position (3), rotation (4), linear velocity (3), angular velocity (3)
- the rest: position (3), rotation (4)

That is 960 bytes and 1280 characters for 12 dice.

The rules check everything the channel shows down to the value (D5). They check `motion` only as a bounded string. On the client:
- the converter parses `motion` leniently (a zod `catch` to `null`), and a decoded length must match `dice`
- a bad blob therefore only costs that roll its 3D, and it shows flat (spec: "Dice without motion")
- the strict fields cannot be bad, because the rules refuse them

Validating 240 floats element by element in the rules would come close to the rules' expression limit, and would buy nothing the lenient parse does not give.

A hidden roll writes two documents in one batch:
- `diceRolls/{id}` = `{ by, at, hidden: true }`
- `dmRolls/{id}`, with the full shape above and `hidden: true`

The ID comes from `doc(collection(db, 'diceRolls'))`.

- *Alternative:* encrypt the hidden content in the public record. Rejected, because the rules cannot hide fields, and a key on the client hides nothing.

### D5. Rules

**`diceRolls`:**
- **read:** signed in.
- **create:**
  - `by == request.auth.uid`, and `at == request.time`
  - either a public roll: `hidden == false` with exactly the keys above, `validRoll(data)`, and `motion` a string of at most 1400 characters
  - or a hidden one: keys exactly `by`, `at` and `hidden`, `hidden == true`, `isDm()`, and `existsAfter(dmRolls/{id})`
- **update, delete:** never.

**`dmRolls`:**
- **read:** `isDm()`.
- **create:**
  - `isDm()`, `by == uid`, `at == request.time`, `validRoll`
  - `getAfter(diceRolls/{id}).data.hidden == true`
- **update, delete:** never.

**`validRoll`:** rules have no loops, so it calls `dieAt(dice, i)` for i = 0..11 explicitly. Each call is true past the list's end. Otherwise it checks:
- keys `t`, `v`
- `t` among the 7 types
- `v` an int in the type's range, checked with one pattern on `<type>:<v>` per die (1 to the size, and multiples of 10 up to 90 for `d100`). A map lookup of the maximum cost so many expressions that more than six dice hit the rules' limit of 1000 expressions per request; the pattern keeps 12 dice and a hidden pair inside it.
- a `d100` is followed by a `d10`
- `dice.size()` from 1 to 12
- `mode != 'normal'` only with exactly two `d20`
- `modifier` an int in −99..99
- `note` a string of at most 80 characters
- `style` in the list

**`users/{uid}`** gains one more branch: `isSelf(uid) && onlyChanges(['diceStyle']) && diceStyle in STYLES`.

The queries order by `at` alone, which needs no composite index.

### D6. One provider, freshness by arrival

`DiceProvider` in `App.tsx`, signed in only:
- On every device, it subscribes to `diceRolls` ordered by `at` descending, with a growing limit: 50, plus 50 per "Daha eski atışlar".
- On the DM's device, it also subscribes to `dmRolls` with the same shape, and puts the DM content in place of the hidden public records. It asks for `dmRolls` only when `useIsDm()` is true, as `dmNoteTarget` does.

It exposes:
- `useDiceRolls()`: oldest to newest, with `pending` per record from `hasPendingWrites`
- `useFreshRoll()`: the roll to play now, or null
- `useDiceActions()`: `roll(input)`, which simulates, writes and returns the result for local playback; `setDiceStyle(style)`; `loadOlder()`

A roll counts as fresh (spec: "Only fresh rolls play") when:
- it was added in a snapshot after the provider's first one
- it is the newest of that snapshot's additions
- its `at` is within 10 s of `Date.now()`, with a pending `at` counting as now

The roller's own roll plays from `roll()`'s return value. Its snapshot arrival is recognized by its ID and not played again.

Arrival is the main test, and the clock check only stops a reconnect from playing old rolls. Clock skew can therefore only cost a playback, never a channel entry.

### D7. One lazily loaded stage, one canvas at a time

`DiceStage` is a `React.lazy` import of `src/features/dice/stage/`, which holds three.js, R3F, Rapier, the loaders and the assets as URL imports. Nothing outside that folder imports them. It takes:
- `roll`
- `variant`: `strip` or `card`, which sets the camera's framing
- `playing`: play the frames, or show the rest

Inside, it:
- runs `simulateThrow`, memoized by roll ID
- loads only the meshes and the textures of the roll's style
- caps the device pixel ratio at 1.5
- uses `frameloop="demand"` once the dice are at rest

The Zarlar screen's strip and the notification card are never shown together, because the card is hidden on the Zarlar route. So at most one WebGL context lives at a time, and the card's canvas unmounts when the card closes.

If the lazy import fails or WebGL is missing, an error boundary renders `FlatDice`: the style's preview picture for each die type, with its value. The same component serves rolls whose `motion` is null.

### D8. Settling onto the record

When the frames end, the stage compares each die's simulated value with the record's.
- If they agree, nothing more happens. The rest transforms agree too, given determinism.
- If they differ, the die eases from its simulated rest to the recorded rest over 300 ms. A mismatch is logged with `console.warn` and the roll ID, so the spike and later reports can count drift.

With reduced motion (`useReducedMotion()`), the stage skips the frames and renders the recorded rests at once.

### D9. The notification card, the badge and the device settings

**`DiceNotice`** is mounted in `AppShell` next to `LiveDrawView`. It shows `useFreshRoll()` when:
- the route is not `/dice`
- the roll is not the user's own
- the roll is not hidden on a player's device
- "Atışları göster" is on

It is placed with Tailwind:
- bottom right from 640 px up, at the top below that
- `z` above the page and below the live draw dialog's modal

Its timer starts when the stage reports `rest`. Hover, focus and a selection pause it.

**The badge** counts the rolls in the provider's window that are:
- newer than the stored last-seen time
- not the user's own
- visible to the user

A window of 50 is enough for "9+".

**Storage.** Device settings and last-seen live in `localStorage` through one small hook that wraps every access in try/catch:
- `lcm.dice.show`
- `lcm.dice.sound`
- `lcm.dice.seen.<uid>`

**Sound** is off by default. When it is on, the stage plays the adapted impact sounds through Web Audio, at the impacts' frames, scaled by strength, with Owlbear's 200 ms cooldown per die.

### D10. The Zarlar screen (V2 · Sohbet)

The screen is `src/features/dice/DicePage.tsx` at `/dice`, with `SCREENS` id `dice`, label "Zarlar", icon `⚄` and no Cardmaker. Its layout follows artboard "V2 · Sohbet — Zarlar ekranı":
- a title row with "Canlı"
- the strip (`DiceStage variant="strip"`)
- the channel, a list of `RollEntry`
- the form, `RollForm`, with the quick-dice buttons, the formula, the fixed number, the note, Avantaj and Dezavantaj, "Gizli" inside `<DmOnly>`, and "At"
- a side column with "Zar stilin" (8 preview buttons) and "Bu cihazda"

The column wraps below the content under `lg`. The channel scrolls to the bottom when a roll arrives and the user was already at the bottom.

**Styling.** It uses only existing tokens:
- The tray's felt and wood live in the 3D scene, not in CSS.
- Gold and red for the natural marks use the existing `gold` and `cursed` tokens.

**Pure logic** lives next to it in `dice/formula.ts`, unit-tested without React or Firebase:
- `formulaText`
- `physicalCount`
- `canAdd`
- `keptIndexes`
- `rollTotal`
- `naturalMark`
- `percentileValue`

### D11. License files

The repository gets:
- `LICENSE`, the full GPL-3.0 text
- `"license": "GPL-3.0-only"` in `package.json`
- `THIRD_PARTY_NOTICES.md`, which lists Owlbear Rodeo dice (GPL-3.0, the commit, `src/features/dice/stage/owlbear/`)
- a license section in `README.md`

GPL-3.0-only is used because Owlbear declares "GPL-3.0" without "or later". The new dependencies are MIT (three, R3F) and Apache-2.0 (Rapier). Both are compatible with GPL-3.0.

## Risks / Trade-offs

- **[Determinism differs across browsers or CPUs]** → Each record carries the rests and values, and the stage settles onto them (D8). The spike measures the drift first. If drift is common, switch `sim` to 2 (sampled frames, about 20 KB per roll) without changing the specs.
- **[The bundle is too large on a phone]** → One lazy chunk, loaded only on the first roll shown, and only the textures of the styles in use. The spike records the chunk's size. If it is too large, cap the textures at 1024 px.
- **[Jank on small phones with 12 dice]** → A capped pixel ratio, a demand frame loop at rest, and simulation off the render loop. If the spike shows jank, move `simulateThrow` to a Web Worker. It is pure, so the move does not touch callers.

**Measured on 2026-11-16 (task 1.3).**
- **Chunks** (`npm run build`): Rapier's chunk is 4,371 kB (1,679 kB gzip), because the compat build inlines its WASM as base64. three.js and React Three Fiber with the stage are 976 kB (260 kB gzip). The main chunks hold neither. On top come one style's textures (three 2048 px maps, 0.4 to 1 MB), the 1.6 MB environment map and the meshes (6 to 25 kB each). All of it loads only when a roll is first shown or made, and is cached after.
- **Speed**: in Chrome on an Apple-silicon Mac, a 12-dice roll simulates in about 20 ms and plays at the display's rate (about 104 frames per second on a 120 Hz screen). The first roll that needs new meshes stalls one frame for about 250 ms while they load. A phone was not available to the agent, so the 360 px frame rate on a phone is still to be measured.
- **Choice**: `simulateThrow` stays on the main thread. If the phone shows jank, a Web Worker is the next step; if the download is too large on a phone, the non-compat Rapier package (a separate `.wasm` file) and 1024 px textures are the next steps.
- **[A crafted `motion` string]** → It costs only that roll's 3D (D4). The values a user sees are checked by the rules.
- **[Rules near the expression limit]** → `validRoll` unrolls 12 checks. An emulator test with 12 dice, a d100 pair and every type proves it fits.
- **[Clock skew hides a fresh roll]** → Arrival-based freshness (D6). The clock only filters reconnect floods.
- **[Too many WebGL contexts]** → One canvas at a time (D7).
- **[GPL obligations]** → The whole app is GPL-3.0-only. The owner accepted this on 2026-11-15. Anyone the app is served to may ask for its source, and a public repository answers that.
- **[Order with `merge-library-tabs`]** → This change's navigation delta assumes the eight entries. Archive `merge-library-tabs` first, and rebase the delta if it changed.

## Migration Plan

- No data migration. The collections are new, and `diceStyle` is optional with Galaxy as its default.
- Deploy the rules and the app together, only when the owner asks. Development stays on the emulators.
- **Rollback:** remove the menu entry and the notice mount. The rolls stay readable and harmless.
- **Publishing the repository** is the owner's step after this change. The checklist:
  - The scan on 2026-11-15 found no keys or email addresses in tracked files. The git history still shows the author's email in commits, and switching to a GitHub noreply address affects only new commits.
  - `data/` (the owner's card CSVs), `reference/legacy/` and `docs/` become public. The owner decides whether that is acceptable.
  - `.env*.local`, `.firebase-emulator-data/` and `public/art/` are ignored and stay private.

## Open Questions

- **Rounded or sharp dice?** D1 picks rounded. The other shape is one import away, and the specs do not depend on it.
- **Which sound set?** `medium/dice` is assumed. The others can follow later without a spec change.
