# Tasks

Before running any command, run `. ~/.nvm/nvm.sh && nvm use` from the repository root. Work directly on `master`, without a feature branch. The owner's archives are in `~/Downloads`. Never change or move them; extract only into temporary folders.

This change does not touch Firestore. `npm run test:emulator` still has to pass at the end, and it cannot run while the owner's `npm run dev` is up. Ask before stopping the owner's dev session.

## 1. Matching the files

- [x] 1.1 Create `scripts/lib/artFiles.ts` with the pure `planArt(files, data, aliases)` of D2 and D3:
  - the 28 Cardmaker stems
  - the pack picture stems and their `PackDef.key` keys
  - set recognition by code, official name or alias
  - the plan: assignments, duplicates, unknown files, and missing targets per kind

  Add `artFiles.test.ts` covering every rule of D2 in order, plus:
  - a duplicate (the exactly matched file wins over an alias)
  - an unknown file
  - a missing target
  - a set pack picture for Pandemonium

  Verify: `npm run check` passes.
- [x] 1.2 Add the alias table reader to `artFiles.ts`: columns `File,Kind,Name`, Kind `legend|cursed|word|asset`, a target that does not exist reported with its row number. Create `data/image-aliases.csv` with the 17 rows of D3. Add tests: a valid table, an unknown kind, and a name that matches no card. Verify: `npm run check` passes.
- [x] 1.3 Add a test that plans the inventory's real file names against the repository data and the alias table. Put the 866 names in a fixture `scripts/lib/artInventory.fixture.ts` generated from the archive listings. It must reach the D3 coverage:
  - 571 normal, 19 Blessed and 153 Cursed cards
  - 53 words, 14 cardbacks, 10 pack pictures and 24 Cardmakers
  - Scorched Earth missing, and the expected duplicates and unknown files

  Verify: the test passes.

## 2. Building the pictures

- [x] 2.1 Add `sharp` (0.35) as a dev dependency. Create `scripts/lib/artWrite.ts` (D1, steps 6 and 7):
  - convert to WebP, with Cardmakers at most 480 px high and with alpha
  - content-hashed names
  - an emptied `public/art/`
  - the manifest of D4

  Add `artWrite.test.ts` (node environment) that writes two tiny generated PNGs into a temp folder and checks the files, their sizes, their hashed names and the manifest. Verify: `npm run check` passes.
- [x] 2.2 Create `scripts/build-art.ts` (`--source`, `--dry-run`): the 7-Zip check, extraction into a temporary folder that is always removed, reading the data and aliases, the plan, the Turkish report in `scripts/lib/messages.ts`, and the write unless it is a dry run. Add `"build-art"` to `package.json` and `public/art/` to `.gitignore`. Verify:
  - `npm run build-art -- --source ~/Downloads --dry-run` prints the D3 coverage and writes nothing
  - the real run fills `public/art/` with a manifest
  - `~/Downloads` is unchanged (same file list and sizes)
- [x] 2.3 Add the `/art/**/*.webp` cache header to `firebase.json` (D5). Update the docs:
  - `README.md`: building the pictures, and building them before a deploy
  - `data/README.md`: the picture archives, the file name rules and the alias table
  - `docs/conventions.md`: the script and the art feature
  - `docs/domain.md`: the picture file names, the backs that never give a card away, and the deliberate neutral back

  Verify: the README commands run as written.

## 3. Pictures in the app

- [x] 3.1 Create `src/features/art/` (D4):
  - `schema.ts` with `EMPTY_ART`
  - `artContext.ts` with `useArt()`
  - `ArtProvider.tsx` with the fetch, mounted in `App.tsx`
  - `TestArtProvider` and an `art` option for `renderApp`

  Add tests: a valid manifest gives URLs, while a failed fetch, an HTML answer and an invalid manifest each give `EMPTY_ART`. Verify: `npm run check` passes with every existing test unchanged.
- [x] 3.2 Change `CardFace` (D6):
  - the picture with its alt text, the frame, the caption, the marks and the `sr-only` text
  - the hand cost badge on the picture
  - the CSS look without a picture or after a load error

  Extend `CardFace.test.tsx` with the spec's card face and hand cost scenarios, with and without a picture. Verify: `npm run check` passes.
- [x] 3.3 Replace `FaceDownCard`'s `tone` with `back` (D7). Add `spreadBackOf` with a test for each pack type, and use it in `OpenPackView`; `DrawDialog` picks by its mode. Extend `FaceDownCard.test.tsx` and the draw and pack tests with the spec's back scenarios: a random draw's Blessed card keeps the neutral back, a set pack shows its set back, and a Cursed Pack shows the Cursed back. Verify: `npm run check` passes.
- [x] 3.4 Add pictures to `PackTile` and `TrueWordTile`, and show the picture large in `TrueWordDialog` (D8). Extend `PackShopPage.test.tsx` (mechanic pack, and a set pack with the set's back) and the True Words tests (a word in a draft with its picture, name and "5 LP"). Verify: `npm run check` passes.
- [x] 3.5 Add `Mascot` and the `mascot` field in `screens.ts`, pass it through `PageHeader` and `Placeholder`, and show the set, Pandemonium and Golden Cardmakers in the Pack Shop's group view (D9). Extend the tests:
  - a screen with its Cardmaker
  - a screen without one (Shops)
  - a set group

  Verify: `npm run check` passes.
- [x] 3.6 Add `useBlessedShock` with its keyframe in `theme.css`, and fire it in `DrawDialog` and `OpenPackView` (D10). Add tests with fake timers:
  - turning a Blessed card shows the pair, which leaves after 1.1 s
  - a watcher sees it when the card turns live
  - opening a view on an already turned Blessed card does not show it
  - with reduced motion, it shows without movement

  Verify: `npm run check` passes.

- [x] 3.7 Move the set, rarity and mechanic pack of a face with a picture into a note on its set symbol (the owner's request after 4.2; D6, the card-library delta). Nothing is written under the picture; the note shows on hover of the symbol, or after a tap until the focus leaves, stays inside the picture, and stays in the DOM for screen readers. Faces without a picture keep their CSS look. Update `CardFace.test.tsx`, `docs/domain.md`, and check the library and a hand at 360 px and on a wide screen. Verify: `npm run check` passes.

## 4. Integration

- [x] 4.1 Run the whole suite. Verify: `npm run check` and `npm run test:emulator` both pass.
- [x] 4.2 With pictures built, in the running app, check these screens at 360 px wide and on a wide screen:
  - the library and the Cursed Deck (card view), and a hand
  - the card details
  - a draw with a Blessed card (the shocked pair)
  - a set pack and a Cursed Pack (their backs)
  - the Pack Shop and a set group
  - the True Words screen and a draft
  - the log (its Cardmaker)

  Verify: no horizontal scrolling, every picture fits, and screenshots are saved.
- [x] 4.3 Move `public/art/` aside and reload. Verify: every screen shows the CSS look with no errors, then restore the folder.

## Workflow follow-up

- After the owner's review, archive the change with `/opsx:archive`, which syncs the specs.
- Commit only when the owner asks.
