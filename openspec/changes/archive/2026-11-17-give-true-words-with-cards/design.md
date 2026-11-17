# Design

## Context

See proposal.md for the problem. The pieces that already exist:

- `GiveCardDialog` reads `useCards()` (for the DM: every active normal, Blessed and Cursed card, hidden ones included), badges from `useCardStatuses()`, facets from `giveFacets()` and gives with `useHoldingActions().giveCard`.
- `CardFace` already takes a `Definition`, so it draws a True Word's face as the library does.
- The words come from `useWords()`. Who knows each word comes from `useWordStatuses()` (library-style `CardStatus`, `inPool` always false). The receiver's words come from `useKnownWords(uid)`, and teaching goes through `useTrueWordActions().teachWord`.
- `learnableWords` (`api.ts`) filters with `inWordDraft`: active, "Draft'ta çıkar" on, not known. Both `DraftStart`/`startDraft` and `TeachWordDialog` use it, which is the bug.
- The rules already accept a teach whatever the flags, and the emulator suite covers it ("lets the DM teach a word kept out of drafts and lists"). Nothing on the server changes.

## Goals / Non-Goals

**Goals:**
- One dialog where the DM gives a card or teaches a word, with one search, one grid and one count.
- Keep the draft's pool exactly as it is.

**Non-Goals:**
- No change to how a word is stored, recorded or shown in the activity log.
- No change to "+ Kart ver" for players (they still have none) or to the library's True Words tab.
- No change to drafts, word use, or the DM's tools in a word's details.

## Decisions

### D1. The grid holds `Definition`s, not only `Card`s

The dialog merges `useCards()` with the active words from `useWords()` into one `Definition[]`, sorted with `compareLabels` by name. Loading waits for both subscriptions, and an error in either shows the existing "Kartlar yüklenemedi." The count line keeps the word "kart".

*Alternative:* a second section or a tab for words inside the dialog. Rejected: the owner asked for one place, and the search should find "Ascend 3" without the DM knowing it is a word.

### D2. Facets work on a `Definition`

The `Facet` type's `cardKey` takes a `Definition`. `setFacet` and `mechanicPackFacet` return `null` for a word, so a chosen set or mechanic pack leaves the words out. `costFacet` works as it is. `GIVE_KINDS` gains `'trueWord'`, labelled "True Word", and `giveKind` returns it for a word. The draw dialog's facets do not change, because they never see a word.

### D3. Badges and the pool switch for a word

`badgeOf` gets a word branch, checked in this order:

1. the receiver knows it → "Biliyor" (tone `held`)
2. "Draft'ta çıkar" is off → "DM'e özel" (tone `dmOnly`, the library's rule for words)
3. someone knows it → their names (tone `held`)
4. otherwise → no badge

"Yalnızca havuzdakiler" keeps a word when it is active with "Draft'ta çıkar" on. This is `inWordDraft` without the receiver's known set, so it says what a draft could show.

### D4. Selection and the give step branch on the kind

A word face whose word the receiver knows is rendered as not selectable: it has no `onOpen`, is announced with "zaten biliyor", and pressing Enter does nothing. Selecting another word sets `holderName: null`, so the bar never asks about an extra copy. The bar's button reads "Öğret" ("Öğretiliyor…" while busy) and calls `teachWord({ uid: receiver.id, wordId, by })`. Success shows "✓ Öğretildi: <word> → <name>". Failures map through the word's existing `toWordFailure`/`wordFailureMessage`, so "already knows", offline and a busy table read as they do today. The dialog keeps a single failure slot holding either kind.

### D5. Split the word filter in `api.ts`

`teachableWords(words, known)` returns the active words the player does not know, whatever their flags. `learnableWords` keeps `inWordDraft` for the draft. The dialog uses the receiver's known set for "Biliyor", so it does not call either filter directly. `teachableWords` stays as the tested statement of the rule and is used by the dialog's "known" check if that reads simpler.

### D6. "+ True Word öğret" opens "+ Kart ver"

`GiveCardDialog` takes an optional `initialKind`. `HandTrueWords` renders `GiveCardDialog` with `initialKind="trueWord"` instead of `TeachWordDialog`. The kind pill starts on "True Word", and the DM can clear it like any filter. `TeachWordDialog` and its tests are deleted, and the teach tests move to the give dialog's tests.

*Alternative:* lift the "giving" state to `HandsPage` so both buttons share one dialog instance. Rejected: the two buttons live in different components, and the dialog holds no state worth sharing between them.

## Risks / Trade-offs

- [The grid grows by the number of active words, about 26] → negligible next to about 744 cards, and the grid already pages by 20.
- [The DM loses the teach dialog's word list that showed the words' text] → the faces show the text or the picture, as in the library, and the search matches the text.
- [The give dialog now depends on the True Words provider] → the hand screen already sits inside it, since the True Words tab uses it. A test renders the dialog inside it.

## Migration Plan

Client-only. It ships with the next push to `master`. Rolling back is a revert, with no data to restore.
