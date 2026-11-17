# Tasks

## 1. The word filters

- [x] 1.1 Add `teachableWords(words, known)` to `src/features/true-words/api.ts`: the active words the player does not know, whatever their flags. Keep `learnableWords` as the draft's pool (design D5). Verify with `learnableWords.test.ts` extended: a word with "Draft'ta çıkar" off is in `teachableWords` and not in `learnableWords`, and retired and draft-status words are in neither.

## 2. Facets over cards and words

- [x] 2.1 Let `Facet.cardKey` take a `Definition`. The set and mechanic pack facets return `null` for a word, and the cost facet reads a word's cost (design D2). Verify with the filters unit tests: a chosen set or mechanic pack leaves a word out, and a cost of "1" keeps a word whose cost is "1".
- [x] 2.2 Add `'trueWord'` to `GIVE_KINDS`, labelled "True Word", and return it from `giveKind` for a word. The draw dialog's facets stay unchanged. Verify with a unit test that the kind facet lists Common, Rare, Blessed, Cursed and True Word, and that choosing "True Word" keeps only words.

## 3. "+ Kart ver" gives words

- [x] 3.1 In `GiveCardDialog`, merge the active words from `useWords()` with `useCards()` into one list sorted by name. Wait for both, show the shared error on either failure, count both in one number, and add an optional `initialKind` prop (design D1, D6). Verify with `GiveCardDialog.test.tsx`: with cards and words loaded, the count includes the words, a search for "ascend" finds a word, and `initialKind="trueWord"` opens with only words listed.
- [x] 3.2 Add the word badges ("Biliyor", "DM'e özel", knowers' names, none) from the receiver's `useKnownWords` and `useWordStatuses`. Let "Yalnızca havuzdakiler" keep the active words with "Draft'ta çıkar" on (design D3). Verify with component tests for each badge and for the pool switch.
- [x] 3.3 Make a word the receiver knows unselectable. Teach a selected word from the bar with "Öğret" through `teachWord`, never ask about an extra copy, show "✓ Öğretildi: <word> → <name>", keep the dialog open, and map failures with the word's messages (design D4). Verify with component tests: teaching a word with "Draft'ta çıkar" off calls `teachWord` with the receiver and the DM, the face then shows "Biliyor", a known word cannot be selected by click or Enter, and an offline teach shows the offline message without writing.
- [x] 3.4 Check the dialog at 360 CSS pixels wide with words in the grid (two columns, no horizontal scroll) on the emulators, and confirm that a "DM'e özel" word taught from it appears on the player's True Words tab live on a second signed-in tab.

## 4. The shortcut and the old dialog

- [x] 4.1 Make "+ True Word öğret" in `HandTrueWords` open `GiveCardDialog` for the player with `initialKind="trueWord"`. Delete `TeachWordDialog.tsx` and move its still-relevant tests to `GiveCardDialog.test.tsx` (design D6). Verify with `HandTrueWords.test.tsx`: selecting "+ True Word öğret" opens "Kart ver: <name>" with the kind "True Word" chosen. Also verify that no import of `TeachWordDialog` remains.
- [x] 4.2 Update the "DM teaches and takes back" bullet in `docs/domain.md` to say the DM teaches a word from "+ Kart ver", whatever its flags, with "+ True Word öğret" as a shortcut. Verify by reading the bullet against the true-words delta spec.

## 5. Integration

- [x] 5.1 Run `npm run check` and `npm run test:emulator` (after `. ~/.nvm/nvm.sh && nvm use`). Both pass, including the existing rules test that lets the DM teach a word kept out of drafts and lists.
- [x] 5.2 Stop every process on the project's ports as CLAUDE.md says, and confirm with `lsof -nP -iTCP -sTCP:LISTEN`.

## Workflow follow-up

- Archive with `/opsx:archive`, then commit (feat + docs archive). Push only when the owner asks.
