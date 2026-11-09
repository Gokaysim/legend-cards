# Tasks

Before running any command, run `. ~/.nvm/nvm.sh && nvm use` from the repository root. Work directly on `master`, without a feature branch.

This change does not touch Firestore. `npm run test:emulator` still has to pass at the end, and it cannot run while the owner's `npm run dev` is up. Ask before stopping the owner's dev session.

## 1. The Kurallar screen

- [x] 1.1 Create `src/features/rules/RulesContent.tsx` with the whole rules text as JSX (D1, D2):
  - the four sections as `<section aria-labelledby>` with `h2` titles, and their topics as `h3`
  - paragraphs, the two bulleted lists, and the `<strong>` runs
  - the text transcribed from `rulesPage()` in legacy v2.2.8, with HTML entities as plain characters and only the edits listed in D3
  - the look of D4: canvas background, a line between sections, `max-w-3xl`, `break-words`, and only existing tokens

  Verify: `npm run check` passes, and a word-by-word comparison of the rendered text against `rulesPage()` shows only the D3 differences.
- [x] 1.2 Replace the placeholder in `src/features/rules/RulesPage.tsx` with `PageHeader` (title and mascot from `screenById('rules')`) and `RulesContent`. Update its doc comment. Verify: `npm run dev:web` shows the Kurallar screen with the text and without the not-ready note.
- [x] 1.3 Add `src/features/rules/RulesPage.test.tsx` (D5), with a test or more for each scenario in `specs/rules-page/spec.md`:
  - the four regions in order, each with its `h3` topics
  - no English headings and no not-ready note
  - the Blessed rarity sentence, and no `%2` anywhere
  - the pack sentence, with no "Rare veya" and no "her 50 kart"
  - the four card colors
  - no button and no form inside the page's section
  - the same text for a player and for the DM
  - the full text while cards and profiles are loading
  - without pictures, the title and full text without a Cardmaker

  Verify: `npm run test` passes.
- [x] 1.4 Add `/rules` to `BUILT_SCREENS` in `src/app/routes.test.tsx`, checking the "Legend Point Kart Sistemi" region. Add a `gold on canvas` text contrast pair to `src/styles/theme.test.ts` (D4). Verify: `npm run check` passes.
- [x] 1.5 Update `docs/conventions.md`: in the project layout, `rules/` is the Kurallar screen with its static text, and the placeholder list no longer includes it. Verify: `npm run check` passes (format check included).

## 2. The domain reference

- [x] 2.1 Update `docs/domain.md` as in D6:
  - "Table rules (Kurallar page)": the intro about the app's screen, the Blessed bullets with what the screen says now, and the note pointing disagreements to the deliberate decisions
  - "Open questions for the DM": the "Blessed cards per mechanic" row removed, with a note that no question is open
  - "Deliberate decisions": the new entry "The Kurallar screen follows the app" (the D3 rewrites, and that the data decides the Blessed cards per mechanic, with Gambler's Gambit and Risk & Reward at 3 against the formula's 2), and the random-draw entry noting that the Kurallar screen no longer states 2%
  - the glossary's "Kurallar" entry

  Verify: the scenarios of the `developer-workflow` delta hold when reading the document, and `npm run check` passes.

## 3. Integration

- [x] 3.1 Run the whole suite. Verify: `npm run check` and `npm run test:emulator` both pass.
- [x] 3.2 In the running app, signed in once as a player and once as the DM, open Kurallar at 360 px (the iframe check) and on a wide screen, with pictures built and with `public/art/` moved aside. Verify:
  - no horizontal scrolling
  - the four sections read in order
  - `cardmaker_wave` shows only when pictures are built
  - screenshots are saved

  Afterwards, restore `public/art/`.
- [x] 3.3 Stop every process on the project's ports (CLAUDE.md): send SIGINT to the process group of `npm run dev` or the emulators, and wait for the export. Verify: `lsof -nP -iTCP -sTCP:LISTEN` shows nothing on 5173, 4173, 8080, 9099, 4000, 4400, 4500, 9150 or 5002.

## Workflow follow-up

- After the owner's review, archive the change with `/opsx:archive`, which syncs the specs.
- Commit only when the owner asks.
