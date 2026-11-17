# Proposal

## Why

The sets now carry their own cardback and Cardmaker pictures, but the screens use them only partly. The Kütüphane keeps `cardmaker_lib` when the user filters it to one set. A random draw and a Golden Pack show every face-down card on the neutral back, even when the card's set has a cardback picture. A card's picture is also fetched only after the card is turned, so the face appears blank for a moment. The owner wants the set art used where a set is known and wants cards to show their picture as soon as they are turned.

## What Changes

- **Kütüphane Cardmaker follows the set filter:** in the Kartlar tab, choosing a set in the Set filter shows that set's Cardmaker in the corner instead of `cardmaker_lib`. If the set has no Cardmaker picture, or the choice is "Blessed" or "Tüm setler", the tab's own Cardmaker stays.
- **BREAKING (game feel):** the back of a face-down card in a random draw (Kart Çek and every watching view of it) and in a Golden Pack now comes from the card under it:
  - a Blessed card shows the Blessed cardback,
  - a card of a set shows that set's cardback,
  - a card whose back has no picture shows the neutral back.

  The back no longer hides the card's set. This reverses the "Cardbacks that give nothing away" rule for these two cases, as the owner asked. Cursed draws, the Cursed pack types, set packs and Mechanic Packs keep their current backs.
- The deck pile in the draw dialogs keeps its current back: the chosen set's cardback under a set filter, the Cursed cardback in a Cursed draw, and the neutral back otherwise.
- **Pictures load before the turn:** while a card is face down in a draw dialog, a watching view or an open pack, its picture is fetched in the background, so the face shows the picture right after the turn. The face itself is still not rendered before the turn. Someone reading the browser's network traffic could see a card's picture before it is turned; the owner accepted this.
- No data, rules or Firestore paths change. Draw sessions keep storing the deck's back (`backSet`) as before.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-images`: "Cardbacks that give nothing away" is replaced by per-card backs for random draws and Golden Packs. "The Cardmaker on screens" adds the set Cardmaker of the Kartlar tab's Set filter. A new requirement covers fetching a face-down card's picture before it is turned.
- `card-draws`: "The deck's back" separates the deck pile's back, which is unchanged, from each face-down card's back, which now comes from the card.

## Impact

- **Backs:** `src/features/art/spreadBack.ts` (a Blessed back and a back chosen from a card), `src/features/draws/sessions.ts` (`sessionBack` takes the card), `src/features/draws/DrawDialog.tsx`, `LiveDrawDialog.tsx`, `LiveDrawView.tsx`, `src/features/packs/catalog.ts` (`spreadBackOf` per card for a Golden Pack), `OpenPackView.tsx`, and the banner entries built for `src/features/draws/table/LiveBanner.tsx`.
- **Prefetch:** `src/features/draws/FaceDownCard.tsx`, plus a small picture-prefetch hook in `src/features/art/`.
- **Kütüphane:** `src/features/library/LibraryPage.tsx` and `src/features/cards/CardBrowser.tsx` (it reports the chosen set to the page).
- **Tests:** unit tests for the back choice, the session back, the Golden Pack backs, the prefetch, and the Kütüphane Cardmaker. No emulator test changes, since no rules change.
