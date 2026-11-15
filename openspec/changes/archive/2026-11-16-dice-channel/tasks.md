# Tasks

## 1. Spike: determinism, size and speed (decision gate)

- [x] 1.1 Add `three`, `@react-three/fiber`, `@types/three` and `@dimforge/rapier3d-deterministic-compat` at exact current versions (`nvm use` first). Verify that `npm install` succeeds and `npm run typecheck` passes.
- [ ] 1.2 Port the d6 and d20 hull points and the tray walls from Owlbear commit `ccc32bec` into a throwaway `simulateThrow` prototype. Run the same 20 seeded throws in Chrome, Firefox, Safari and a phone. Record in `design.md` (D2) whether the rests and values match on every one, and keep `sim` 1, or switch to sampled frames (`sim` 2) if they do not.
- [ ] 1.3 Measure the lazy chunk's size from `npm run build`, and the frame rate of 12 dice at 360 px on the phone. Record both in `design.md` (Risks), and choose the main thread or a Web Worker for `simulateThrow`.

## 2. License and adapted files

- [x] 2.1 Add `LICENSE` (the full GPL-3.0 text), `"license": "GPL-3.0-only"` in `package.json`, `THIRD_PARTY_NOTICES.md` (Owlbear Rodeo dice, GPL-3.0, commit `ccc32bec`, `src/features/dice/stage/owlbear/`), and a license section in `README.md`. Verify the files exist and that `npm run format:check` passes.
- [x] 2.2 Copy the adapted Owlbear assets into `src/features/dice/stage/owlbear/`: the rounded meshes, the collider hull points, the 8 dice materials and the tray material, the environment map, the `medium/dice` sounds and the previews. Give each code file the header that names the project, the commit and the license, and says what changed. Verify that no asset in upstream carries a separate license, and note the result in `THIRD_PARTY_NOTICES.md`.
- [x] 2.3 Add the "Adapted third-party code" rule to `docs/conventions.md` (the header, the notice file, and that only `stage/` imports from `owlbear/`). Verify the section reads as the developer-workflow spec says.

## 3. Roll data, formula logic and rules

- [x] 3.1 Write `src/features/dice/formula.ts`: die types and limits, `formulaText` (d20, d12, d10, d8, d6, d4, d100 order), `physicalCount` (a d100 is two), `canAdd`, `keptIndexes`, `rollTotal`, `percentileValue` (00 + 0 = 100) and `naturalMark`. Verify with unit tests for every scenario in the spec's "Building a roll", "At most twelve dice", "Advantage and disadvantage", "Results and the total" and "Natural 20 and natural 1".
- [x] 3.2 Write `src/features/dice/schema.ts`: the roll record and the hidden public record as zod schemas with converters, `DICE_STYLES`, and `motion` encode and decode (base64 Float32, 20 floats per die). Make a bad blob parse to `null` without failing the record (design D4). Verify with unit tests, including a record whose `motion` is garbage.
- [x] 3.3 Add `diceStyle` (optional, default `galaxy`) to the profile schema in `src/features/users/schema.ts`. Verify with a schema test that old profiles still parse.
- [x] 3.4 Add the `diceRolls` and `dmRolls` rules with `validRoll` and `dieAt` (design D5), and the profile's `diceStyle` branch, to `firestore.rules`. Verify with `npm run test:emulator` after 3.5.
- [x] 3.5 Extend `tests/firestore.rules.emulator.test.ts` with every scenario of "Roll records", "Roll records are checked" and "Hidden roll records are checked", the profile's dice style scenarios, and these allowed cases: a public roll of 12 dice with every type and a d100 pair, advantage with two d20, and a hidden pair written in one batch by the DM. Add the denied cases: an update, a delete, a player reading `dmRolls`, each half of the hidden pair alone, and the signed-out cases. Verify that `npm run test:emulator` passes.

## 4. The simulation

- [x] 4.1 Write `src/features/dice/stage/simulate.ts`: a fixed 1/120 s step, the tray, a body per physical die with its hull and density, a stop at sleep or 5 s, frames at 60 per second, rests, values from the face-normal table, and impacts. Verify with a node-environment unit test that the same throws give identical frames on two runs.
- [x] 4.2 Add `randomUnit()` to `src/lib/random.ts`, and a `makeThrows(dice, random)` that follows Owlbear's ranges. Verify with unit tests: the ranges hold, and an injected source gives a fixed throw.
- [x] 4.3 Add a golden test: fixed throws give fixed values and rests, stored as a fixture. It guards against Rapier upgrades. Verify that `npm run test` passes, and that the test fails when a fixture value is changed.

## 5. Provider, api and test provider

- [x] 5.1 Write `src/features/dice/api.ts`:
  - `rollDice`: simulate, encode, `setDoc`, or the hidden batch with `dmRolls`
  - `setDiceStyle`
  - the newest-first queries on `at`, with a limit, for `diceRolls` and `dmRolls`

  Verify with an emulator test that a roll round-trips and that a hidden roll writes both documents.
- [x] 5.2 Write `DiceProvider` (mounted in `App.tsx`, signed in only):
  - the growing limit and `loadOlder`
  - the DM merge, asking for `dmRolls` only when `useIsDm()`
  - `useDiceRolls`, `useFreshRoll` (arrival, newest of a batch, 10 s, own rolls skipped) and `useDiceActions`

  Verify with unit tests of the freshness logic for the spec's "Only fresh rolls play" scenarios.
- [x] 5.3 Add `TestDiceProvider` and a `dice` option to `renderApp` in `src/test/`. Add the Dice entry to the provider list in `docs/conventions.md` (Data access) and to the project layout. Verify that `npm run test` passes and that the docs name the hooks.

## 6. The stage and its fallback

- [x] 6.1 Write `FlatDice`: the style's preview picture per die with its value, dimmed and struck through when not kept, and the natural marks. Verify with component tests.
- [x] 6.2 Write `DiceStage` in `src/features/dice/stage/`. It is lazily loaded and has an error boundary to `FlatDice`. It takes the `strip` and `card` framings, loads only the roll's style, plays the frames against time, caps the pixel ratio at 1.5, and uses a demand frame loop at rest. It settles onto the recorded rest on a mismatch, with a `console.warn` (design D8), and renders the rests at once under reduced motion. Verify that unit tests with the stage mocked show the fallback on a load error, and check in the browser that 2d6 lands on the recorded faces.
- [x] 6.3 Play the impact sounds through Web Audio when "Zar sesi" is on (cooldown 200 ms per die). Verify in the browser: no sound by default, and sound when it is turned on.

## 7. The Zarlar screen

- [x] 7.1 Add the `dice` entry ("Zarlar", `⚄`, `/dice`, no Cardmaker) between Setler and İşlem Logu in `SCREENS`, and its page in `routes.tsx`. Verify by extending `src/app/routes.test.tsx` with the nine-entry order and the app-shell scenario "The Zarlar screen".
- [x] 7.2 Write `RollForm`:
  - the quick dice, the formula, the fixed number −99..+99 and the 80-character note
  - Avantaj and Dezavantaj, enabled only for exactly 1d20
  - "Gizli" inside `<DmOnly>`
  - "En fazla 12 zar"
  - "At", disabled with no die

  Verify with component tests of the form scenarios in the spec.
- [x] 7.3 Write the channel (`RollEntry`):
  - oldest to newest
  - name, time, note, formula, dice, total and the natural marks
  - "Tekrar izle" and "Daha eski atışlar"
  - "gönderiliyor" while pending
  - "DM gizli zar attı" for players, and full and marked for the DM

  Verify with component tests of "The channel", "Playing a roll again", "The DM's hidden roll" and "Rolling while offline".
- [x] 7.4 Assemble `DicePage` in the V2 · Sohbet layout: the strip above the channel, the form below it, and the side column with "Zar stilin" (8 previews, saved with `setDiceStyle`) and "Bu cihazda". The strip plays a roll from "At" at once, and a newer roll replaces the one playing. Verify with component tests of "The strip" and "The Zarlar screen", and in the browser at 1280 px and 360 px with no horizontal scroll.

## 8. Other screens: card, badge, settings

- [x] 8.1 Write the device settings hook (`lcm.dice.show`, `lcm.dice.sound`, `lcm.dice.seen.<uid>`, every access in try/catch). Verify with unit tests, including storage that throws.
- [x] 8.2 Write `DiceNotice` and mount it in `AppShell` beside `LiveDrawView`:
  - hidden on `/dice`, for one's own rolls, for hidden rolls on a player's device, and when "Atışları göster" is off
  - bottom right from 640 px up, at the top below that
  - a 4 s timer from rest, paused by hover, focus and selection
  - "Kapat" and "Kanalda aç"
  - a newer roll replaces it

  Verify with component tests of "A roll arrives on another screen" and "The notification card closes on its own" (with fake timers).
- [x] 8.3 Show the unseen count on the "Zarlar" menu entry ("9+" above 9), and clear it when the screen opens. Verify with tests of "Rolls the user has not seen", and with "Turning the cards off" for the count that stays.

## 9. Domain docs

- [x] 9.1 Add to `docs/domain.md`: the dice channel, its words (Zar atışı, Kanal, Gizli zar, Tekrar izle, zar stili), and that rolls make no log event or payment. Add the `dice/` folder to the layout in `docs/conventions.md`. Verify that both read as the specs say and that `npm run format:check` passes.

## 10. Integration checks

- [x] 10.1 Run `npm run check` and `npm run test:emulator` (after `nvm use`). Verify that both pass.
- [ ] 10.2 Run `npm run dev` and roll with two signed-in emulator users in two windows, plus a 360 px window:
  - a mixed roll, advantage, a d100, a hidden DM roll, a reload and an offline roll
  - the card on the hand screen, the badge, reduced motion, and sound

  Verify that each spec scenario behaves as written. Then stop every process on the project's ports as `CLAUDE.md` says, and confirm with `lsof -nP -iTCP -sTCP:LISTEN`.

## Workflow follow-up

- Archive `merge-library-tabs` before this change, and rebase the `app-shell` delta if its navigation changed.
- Archive this change after review.
- Making the repository public is the owner's step. Use the checklist in `design.md` (Migration Plan).
