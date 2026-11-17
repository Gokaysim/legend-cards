# Tasks

## 1. A card's own back

- [x] 1.1 In `src/features/art/spreadBack.ts`, add the `blessed` variant to `SpreadBack` and resolve it in `spreadBackUrl` with `art.backUrl('blessed')` (design D1). Add `cardBack(card)` for the kinds listed in design D1, and update the module's doc comment, which today says a back never depends on the card. Verify with `spreadBack.test.ts`:
  - a Blessed card gives `blessed`, which resolves to the built Blessed back
  - a Cursed card gives `cursed`
  - a set card gives `set` with its code, and a set without a cardback picture resolves to `null`
  - a card without a set code gives `neutral`
- [x] 1.2 Give `blessed` the neutral CSS tone wherever a back without a picture picks a tone: `FaceDownCard`, `DeckPile`, and the banner's `SmallBack`. Verify that `npm run typecheck` (or `npx tsc -b`) passes and that the existing `FaceDownCard.test.tsx` and `LiveBanner.test.tsx` still pass.

## 2. Random draws show each card's back

- [x] 2.1 In `src/features/draws/sessions.ts`, replace `sessionBack` with `sessionDeckBack(session, index)` (today's logic) and `sessionCardBack(session, card | undefined)` (design D2). Update the doc comments. Verify with `sessions.test.ts`:
  - a Cursed session gives `cursed` for any card
  - in a random session, a Blessed card gives `blessed`, a Kesqer card gives `set` with its code even when `backSet` is `null`, and an unknown card gives `neutral`
  - `sessionDeckBack` keeps today's cases
- [x] 2.2 In `src/features/draws/DrawDialog.tsx`, give each drawn entry `cardBack(result.card)` in a random draw and `CURSED_BACK` in a Cursed draw. Keep `deckBack` for the `DeckPile`, and update the comment above `deckBack`. Verify with `DrawDialog.test.tsx`: without a set filter, a drawn Kesqer card shows the Kesqer back, a drawn Blessed card shows the Blessed back, and the deck shows the neutral back. With the Kesqer filter, both show the Kesqer back.
- [x] 2.3 In `LiveDrawDialog.tsx`, use `sessionCardBack` for each `FaceDownCard` and `sessionDeckBack` for the deck. In `LiveDrawView.tsx`, use `sessionCardBack` for the banner entries. Verify with `LiveDrawDialog.test.tsx` and `LiveDrawView.test.tsx`: a watched random draw of a Blessed card without a filter shows the Blessed back in the open view and in the banner, and the deck shows the neutral back.

## 3. Golden Pack cards show their own back

- [x] 3.1 In `src/features/packs/catalog.ts`, add `packCardBack(pack, card | undefined)` (design D3) and update `spreadBackOf`'s doc comment for the Golden Pack. Verify with `catalog.test.ts`: in a Golden Pack, a Kesqer card gives `set` Kesqer, a Blessed card gives `blessed`, and an unknown card gives `neutral`. A Standard, Cursed, Cursed Golden or Mechanic Pack gives its `spreadBackOf` back for any card.
- [x] 3.2 In `src/features/packs/OpenPackView.tsx`, use `packCardBack` for each `FaceDownCard` and each banner entry. Verify with `OpenPackView.test.tsx`: an open Golden Pack with a Kesqer card and a Blessed card shows their own backs in the dialog and in the banner, and a Standard Pack still shows the set's back on every card.

## 4. Pictures fetched before the turn

- [x] 4.1 Add `usePrefetchPicture(url, enabled)` in `src/features/art/usePrefetchPicture.ts` (design D4), with a test that stubs `Image` and checks four things:
  - one image is created with the URL while `enabled` is true
  - no image is created for a `null` URL or while `enabled` is false
  - no new image is created on a re-render with the same URL
  - a failed load changes nothing
- [x] 4.2 Call it from `FaceDownCard` with the card's picture URL while the card is face down, and from the banner for each face-down entry whose card is known. Verify with `FaceDownCard.test.tsx` that a face-down card with a picture starts the fetch and that its face is still not in the DOM. Verify with `LiveBanner.test.tsx` that a face-down entry with a known card starts the fetch.

## 5. The Kütüphane's set Cardmaker

- [x] 5.1 In `src/features/cards/CardBrowser.tsx`, add the optional `onSetFilterChange(setCode | null)` (design D5). It is called with the chosen set's code from `setChoices`, and with `null` for "Tüm setler" and for Blessed. Verify with a `CardBrowser` or `LibraryPage` test that choosing "Kesqerian Nights", then "Blessed", then "Tüm setler" reports `KN`, `null` and `null`.
- [x] 5.2 In `src/features/library/LibraryPage.tsx`, keep the chosen set per tab and pass `setMascotStem(code)` to `PageHeader` while that set has a Cardmaker picture, and the tab's own Cardmaker otherwise. Update the page's doc comment. Verify with `LibraryPage.test.tsx`, using a set with a fake Cardmaker picture:
  - choosing that set shows its Cardmaker in place of `cardmaker_lib`
  - a set without a Cardmaker picture, "Blessed", and "Tüm setler" each show `cardmaker_lib`
  - after switching to the Cursed tab and back, `cardmaker_lib` shows again

## 6. Docs

- [x] 6.1 Update `docs/domain.md` and verify the changed passages against the card-images and card-draws delta specs:
  - the `drawSessions` row: `backSet` is the deck's set filter at the draw, and a face-down card's back now comes from the card
  - a new "Face-down cards" bullet under "Where they show": which back each draw and pack shows, the pictures fetched before the turn, and the owner's choice to let a random or Golden back show the card's set
  - the Cardmaker bullet: the Kartlar tab shows the filtered set's Cardmaker

## 7. Integration

- [x] 7.1 Run `npm run check` and `npm run test:emulator` (after `. ~/.nvm/nvm.sh && nvm use`), and verify that both pass.
- [x] 7.2 Check the running app against the emulators in Chrome, then stop every process on the project's ports as `CLAUDE.md` says:
  - as the DM, open the Kütüphane on a wide window, choose a set with a Cardmaker in the Set filter, and check that the corner Cardmaker changes and changes back with "Tüm setler"
  - draw several random cards without a filter into Oyuncu 1's hand, and check that each face-down card shows its set's back, and a Blessed card the Blessed back, also in Oyuncu 1's watching view and banner
  - with the network panel open, check that the face-down cards' pictures are fetched before the turn and that the face shows its picture as soon as it is turned
  - open a Golden Pack for Oyuncu 1, and check the per-card backs in the dialog and in the banner
