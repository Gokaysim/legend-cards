# Proposal

## Why

The DM reported that they cannot give a player the True Word "Ascend 3": it is not in "+ Kart ver". Two gaps stack:

1. "+ Kart ver" lists normal, Blessed and Cursed cards only. True Words are taught from "+ True Word öğret" on the True Words tab, and nothing on the give screen says so.
2. "+ True Word öğret" offers only the words whose "Draft'ta çıkar" is on. It filters with the draft's pool (`learnableWords`, `inWordDraft`), so a "DM'e özel" word never appears. The spec ("whatever its flags", scenario "Teaching a hidden word") and the Firestore rules already allow teaching it. The client drifted in `unify-cards-and-true-words`.

The owner wants one place to give anything: "+ Kart ver" should work for every kind of card, True Words included.

## What Changes

- "+ Kart ver" lists every active True Word next to the active cards, as their faces, sorted with them by name and counted with them. Its kind filter gains "True Word".
- A word's face shows its badge as the library's True Words tab shows its status: "DM'e özel" when "Draft'ta çıkar" is off, otherwise the names of those who know it. A word the receiver already knows shows "Biliyor" and cannot be selected.
- Selecting a word and confirming with "Öğret" teaches it to the receiver through the existing teach step: no draft, no LP, whatever its flags. The dialog says "Öğretildi: <word> → <name>" and stays open. A word never asks about an extra copy.
- "Yalnızca havuzdakiler" keeps the words whose "Draft'ta çıkar" is on. The set and mechanic pack filters do not match a word.
- "+ True Word öğret" on a hand's True Words tab becomes a shortcut: it opens "+ Kart ver" for that player with the kind "True Word" chosen. The separate teach dialog (`TeachWordDialog`) is removed. **BREAKING** (UI only): the teach dialog's own search goes away; "+ Kart ver"'s search covers it.
- Fixed: a word whose "Draft'ta çıkar" is off can be taught. Drafts still leave it out.
- No change to data, Firestore rules or records. A taught word is recorded as before ("DM öğretti").

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-holdings`: "+ Kart ver" covers True Words. The give requirement, browsing, filters, faces with badges, and the selection bar change.
- `true-words`: the DM teaches a word from "+ Kart ver". The teach requirement names the new place and keeps "whatever its flags". "+ True Word öğret" becomes a shortcut that opens "+ Kart ver" for True Words.

## Impact

- `src/features/hands/GiveCardDialog.tsx`: words in the grid, word badges, receiver's known words, the "Öğret" bar, and an initial kind.
- `src/features/cards/filters.ts`: the kind facet gains "True Word". The set and mechanic pack facets do not match a word.
- `src/features/true-words/HandTrueWords.tsx`: "+ True Word öğret" opens "+ Kart ver" with the kind "True Word". `TeachWordDialog.tsx` and its tests are removed.
- `src/features/true-words/api.ts`: a word the DM can teach is any active word the player does not know (`teachableWords`). `learnableWords` stays the draft's pool.
- Tests: unit and component tests for the dialog, the facets and the filter split. The emulator rules test for teaching a word kept out of drafts and lists already exists.
- `docs/domain.md`: the line that says how the DM teaches a word, if it names the old dialog.
