# Design

## Context

See proposal.md for why. The current code this design works with:

- **One back per spread.** `SpreadBack` (`src/features/art/spreadBack.ts`) is `neutral`, `cursed`, `set` or `pack`, and `spreadBackUrl` resolves it through `useArt()`. `FaceDownCard`, `DeckPile` and the banner's `SmallBack` draw it. A `blessed` back does not exist yet, although the manifest builds `blessed` next to `cursed`, and `art.backUrl('blessed')` already finds it.
- **Draw backs come from the deck.** `DrawDialog` gives every drawn entry the `deckBack` that was in effect at the draw. Watching views call `sessionBack(session, index)` (`src/features/draws/sessions.ts`), which reads the stored `backSet` of each draw. The server rules (`firestore.rules`, about line 1281) require `backSet` to equal the draw's set filter.
- **Pack backs come from the pack.** `spreadBackOf(pack)` (`src/features/packs/catalog.ts`) gives one back for the whole pack. `OpenPackView` uses it for the open dialog and for the banner.
- **Pictures load on the turn.** `FaceDownCard` renders `CardFace` only once the card is revealed, and `CardFace` then starts loading `art.pictureUrl(card.picture)`. Stored picture addresses are synchronous (`storedPictureUrl`), so the address is known before the turn.
- **The Kütüphane Cardmaker comes from the tab.** `LibraryPage` passes `libraryTabById(tab).mascot` to `PageHeader`. The Set filter state lives inside `CardBrowser`'s `LoadedCardBrowser` as the chosen set's label. `setChoices` gives each label its code, and Blessed gets the special `BLESSED_SET_CHOICE`. `SetArt` already gives `art.setMascotUrl(code)` and `setMascotStem(code)`, so `Mascot` and `CornerCardmaker` can show a set's Cardmaker by stem.

## Goals / Non-Goals

**Goals:**
- Choose the back of a random-draw card and a Golden Pack card from the card itself, the same way on every device and in the banner.
- Keep the deck pile's back and every other spread's back unchanged.
- Fetch face-down pictures early without rendering the face early.

**Non-Goals:**
- Changing what draw sessions store, or the rules. `backSet` keeps meaning "the deck's set filter at the draw".
- Showing a set's Cardmaker anywhere other than the Kütüphane's Kartlar tab, for example in the draw dialog.
- Prefetching anything other than the face-down cards' own pictures, for example the next pack's pictures.

## Decisions

### D1. A card's back is computed from the card, at render time

Add a `blessed` variant to `SpreadBack`. `spreadBackUrl` resolves it with `art.backUrl('blessed')`, and without a picture it uses the neutral CSS look. Add `cardBack(card)` next to `spreadBackOf`:

| Card | Back |
| --- | --- |
| Blessed | `{ kind: 'blessed' }` |
| Cursed | `CURSED_BACK` |
| set code | `{ kind: 'set', setCode }` (neutral without a picture, as today) |
| no set code | `NEUTRAL_BACK` |

Every viewer already has the card definitions, so each device computes the same back from the card ID that the session or pack stores.

*Alternative:* store the card's set in `backSet`. This needs a rules change that reads the card in the rule, plus emulator tests, and old sessions would still show the neutral back. Computing the back at render time needs no data change and gives old sessions per-card backs too, which is harmless because ended sessions show their cards face up.

### D2. Two session helpers: the deck's back and a card's back

`sessionBack` is split into two helpers:
- `sessionDeckBack(session, index)` keeps today's logic (the Cursed back, or the stored `backSet`, or neutral). It is used only for the watching view's `DeckPile`.
- `sessionCardBack(session, card)` returns `CURSED_BACK` in a Cursed session. Otherwise it returns `cardBack(card)`, or `NEUTRAL_BACK` while the card is not loaded yet, which only the banner can show.

`DrawDialog` sets each drawn entry's back to `cardBack(result.card)` in a random draw and keeps `CURSED_BACK` in a Cursed draw. The `DeckPile` keeps `deckBack`.

### D3. A pack card's back

Add `packCardBack(pack, card)`. For `golden` it returns `cardBack(card)`, or `NEUTRAL_BACK` while the card is not loaded. For every other type it returns `spreadBackOf(pack)`. `OpenPackView` uses it in the dialog and in the banner entries. `burstArtUrl` is unchanged.

### D4. Prefetch with a detached `Image`, kept while the card is face down

Add a hook `usePrefetchPicture(url: string | null, enabled: boolean)` in `src/features/art/`. While `enabled` and `url` is set, it creates `new Image()` with `decoding = 'async'` and assigns `src`. It holds the image in a ref until the URL changes or the component unmounts, so the decoded image stays in the browser's memory cache for the turn. `FaceDownCard` calls it with `art.pictureUrl(card.picture)` and `!isRevealed`. The banner's face-down entries call it too, so a shrunk watching view also has the picture ready. The face is still not rendered before the turn, so screen readers and the DOM reveal nothing.

*Alternatives:* `<link rel="prefetch">` has low priority, and some browsers do not reuse it for `<img>`. `<link rel="preload" as="image">` warns in the console when the image is not used within a few seconds, which happens whenever a card stays face down. A hidden `<img>` would put the card's picture in the DOM before the turn.

### D5. The Kütüphane reads the chosen set from `CardBrowser`

`CardBrowser` gets an optional `onSetFilterChange(setCode: string | null)`. It calls it with the choice's code from `setChoices`, `null` for "Tüm setler", and `null` for Blessed. It keeps holding the label as it does today. `LibraryPage` stores `{ tab, setCode }` and uses the set only while the stored tab is the open tab. A tab switch made through the URL (back button, link) therefore drops it too, which matches "filters start afresh". The header Cardmaker is `setMascotStem(code)` when `art.setMascotUrl(code) !== null`, and the tab's own Cardmaker otherwise.

*Alternative:* lift the whole filter state into `LibraryPage`. That is a larger refactor of `CardBrowser`, which the draw and give dialogs also use, and it buys nothing here.

## Risks / Trade-offs

- [The back shows a random card's set, and whether it is Blessed, before the turn] → the owner accepted this. Cursed draws and every pack other than Golden keep a shared back.
- [Players can see a face-down card's picture in the network panel] → the owner accepted this (trusted table). The DOM still holds no face before the turn.
- [A Golden Pack fetches several pictures at once] → a pack offers at most nine cards. The pictures are WebP files of a few dozen kilobytes each, fetched once and then cached.
- [A set without a cardback picture shows the neutral back, so it reads like an unknown set] → this is the same fallback that set packs use today.

## Migration Plan

None. No data or rules change. Existing draw sessions render with per-card backs as soon as the new build is deployed, and rollback is a redeploy of the previous build.
