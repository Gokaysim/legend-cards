# Tasks

## 1. Shared pieces

- [x] 1.1 Create `src/components/ui/Pill.tsx` with its optional border `tone` (design D2), and `Pill.test.tsx`, which checks that a tone changes only the border class. Verify: the test passes.
- [x] 1.2 Create `src/components/ui/NotePaper.tsx` (design D2). It has an editable mode (label, transparent `<textarea>`, placeholder) and a read-only mode (text, or "Not yok." when empty), on the `bubble` tokens, with a `bubble-title` focus outline. Add `NotePaper.test.tsx`:
  - the label names the field
  - read-only shows the text, or "Not yok."

  Verify: the tests pass.
- [x] 1.3 Create `src/components/ui/ToolSection.tsx` (a heading between two lines) and `src/components/ui/EmptyCardSlot.tsx` (a dashed card-shaped box, an outline icon, a title and a hint), with small tests that the heading and the texts are there. Verify: the tests pass.
- [x] 1.4 Add the "Aktif" badge's pair, the `green` text on its faint `green` surface over `pane`, to `src/styles/theme.test.ts`, and a token for the surface if one is needed. Verify: `theme.test.ts` passes.
- [x] 1.5 List the four pieces in the `components/ui/` part of `docs/conventions.md`. Verify: the list matches the files.

## 2. The panel frame

- [x] 2.1 Rework `HandDetailsPanel` (design D1):
  - `label` as the small upper-case `<h2>`
  - `badges` at its right
  - `name` as an `<h3 class="sr-only">`
  - `empty` drawn by `EmptyCardSlot`

  Update `HandDetailsPanel.test.tsx`:
  - the region is named by the label
  - the name heading is there for screen readers
  - the empty state shows "Bir kart seç" and its hint

  Verify: the tests pass.
- [x] 2.2 In `HandsPage`, pass the cards' and the words' labels, badges and empty texts. The card's empty state is "Bir kart seç" and "Elden bir karta tıkla, ayrıntıları burada görünsün.", and the word's "Bir True Word seç" and "Bir True Word'e tıkla, ayrıntıları burada görünsün." Update the `HandsPage` tests for the `card-holdings` delta's "No selection" and "The card leaves the hand" scenarios, and for the `true-words` delta's "No word selected". Verify: the tests pass.

## 3. The card's details

- [x] 3.1 Add `holdingBadges(entry)` next to `HoldingDetails`. It gives "Aktif" and "Ek kopya" as the holding has them. Test both marks, one, and none. Verify: the tests pass.
- [x] 3.2 Rework `HoldingDetails` in V1's order (design D3):
  - the badges in the dialog layout
  - the face at `max-w-66` with `isRevealed` and the light behind it
  - the `Pill` row, which replaces `infoLines` and the text paragraph
  - the holder line
  - `NotePaper`
  - the full-width "Kullan"
  - "DM araçları" with the cost row and the three buttons
  - the steps in place of the buttons
  - the table-busy note and the failure last

  Keep every permission rule as it is. Update `HoldingDialog.test.tsx` and the hand tests to the `card-holdings` delta's scenarios:
  - a Rare card's labels and the absence of its repeated name and text
  - an active extra copy
  - a Cursed card
  - a changed cost
  - a card without a picture
  - screen readers
  - the holder, Bora and the DM, and their notes
  - the actions per user
  - the discard step in place of the buttons

  Verify: the tests pass.
- [x] 3.3 Check the dialog layout: the face above the rest on a phone, and at its left from `sm`. Add a test for the class switch, or for the two widths through `src/test/media.ts`. Verify: the test passes.

## 4. The word's details

- [x] 4.1 Add `wordBadges(entry)` next to `TrueWordDetails`, and rework `TrueWordDetails` (design D4):
  - the picture at `max-w-66` with `glow-word` while active
  - `Pill`s for the cost and how the word was learned
  - "<name> biliyor"
  - the retired note
  - "DM araçları" with the two buttons and the take-back step in their place

  The `<dl>` goes. Update `HandTrueWords.test.tsx` and the `TrueWordDialog` tests to the `true-words` delta's scenarios: "Selecting a word on a desktop" and "The DM's details". Verify: the tests pass.

## 5. Docs and the browser

- [x] 5.1 Update `docs/domain.md` where it describes the hand's details: the "Seçili Kart" panel in V1's order, the note paper, the DM tools, and the empty slot. Verify: the doc matches the delta specs.
- [x] 5.2 Run `npm run check` and `npm run test:emulator`. Verify: both pass.
- [x] 5.3 With the owner's permission, run the app on the dev emulators and compare the panel at 1280 px with the V1 artboard, as a player and as the DM:
  - a Rare card, an active card, a Cursed card, and a card with a changed cost
  - the empty state
  - the True Word panel
  - the dialog at 800 px and in a 360 px frame

  Verify: it matches the canvas in order and look, and no page scrolls horizontally at 360 px.

## Workflow follow-up

- Build this change after `polish-cards-packs-and-mascots`.
- Stop the dev server and the emulators as CLAUDE.md says, and confirm with `lsof` that the project's ports are free.
- Archive the change with `/opsx:archive` after the owner's review.
