# Proposal

## Why

The cards, the Cursed cards and the True Words are browsed on three separate screens: Kart kütüphanesi, Cursed Deck, and True Words. These screens also work differently. The Cursed Deck has no filters, and the True Words screen has neither search nor a list view. The owner wants them in one place, called Kütüphane, where each kind sits in its own tab and every tab is browsed the same way. Since the `unify-cards-and-true-words` change, all three kinds are stored as one kind of definition, so they can now share one browser.

## What Changes

- **BREAKING (navigation):** The menu entries "Kart kütüphanesi", "Cursed Deck" and "True Words" become one entry, "Kütüphane", at `/library`, where "Kart kütüphanesi" was. The menu has 8 entries instead of 10.
- The Kütüphane has three tabs: "♠ Kartlar" (normal and Blessed cards), "☠ Cursed" and "✦ True Words". Each tab shows its count. The open tab is kept in the URL (`?tab=cursed`, `?tab=true-words`), and Kartlar is the default. Each tab has its own Cardmaker in the corner and its own DM actions ("+ Kart ekle" and "▥ Havuz Dağılımı", "+ Kart ekle", "+ True Word ekle").
- All three tabs use one browser: search, the DM's status filter, a new Cost filter, a card view and a sortable list view, and a count line. On top of that, each tab adds its own filters:
  - **Kartlar:** Set, Mechanic Pack and "Yalnızca havuzdakiler", as today.
  - **Cursed:** a new "Yalnızca eldekiler" filter.
  - **True Words:** a new "Yalnızca öğrenilmemişler" filter, for the chosen player.
- In the True Words tab, the words show as card faces with a purple frame instead of tiles, and they get a list view. Their Durum reads "Bilenler: …". The faces get the magnifier, the zoom view, the tilt and the deck layout of other cards. They have no history control, because a True Word has no Kart geçmişi.
- The True Word draft stays in the True Words tab: "Kimin için" for the DM, the start control and the open draft panel. The hand's "✦ True Word Draft" link opens that tab for the player.
- Old addresses lead to their new place: `/cursed-deck` goes to the Cursed tab, and `/true-words` to the True Words tab with `?for=` kept. A Cursed card's Kart geçmişi moves from `/cursed-deck/<id>` to `/library/<id>`, like every other card's, and its back link becomes "← Kütüphane".
- No data, rules or Firestore paths change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-shell`: the navigation has 8 entries with "Kütüphane" in place of the three screens, and the former addresses redirect.
- `card-library`: the Kütüphane screen with its three tabs. The shared browser (search, Cost filter, views, status filter, Durum) now covers Cursed cards and True Words, and adds the "Yalnızca eldekiler" and "Yalnızca öğrenilmemişler" filters. The True Word faces and list rows are new.
- `true-words`: the True Words screen becomes the Kütüphane's True Words tab, and the hand's draft link points there.
- `card-stats`: every Kart geçmişi is under the Kütüphane's address, with the back link "← Kütüphane".
- `card-holdings`: the hand's "Kart geçmişi →" for a Cursed card opens under the Kütüphane's address.
- `definition-editing`: "+ Kart ekle" and "+ True Word ekle" are on the Kütüphane's tabs.
- `card-images`: the tabs' Cardmakers stand in the corner, True Word faces with pictures appear in the Kütüphane, and True Word tiles remain only in the hand, the draft and the details.
- `card-zoom`: the faces in every Kütüphane tab, True Words included, have the magnifier and open the zoom view.
- `visual-effects`: the tilt and the deck layout apply to every Kütüphane tab, and a held Cursed card glows in the Cursed tab.

## Impact

- **Screens and routes:** `src/app/screens.ts`, `src/app/routes.tsx`, `src/app/layout/*` (menu), `src/features/library/LibraryPage.tsx` (becomes the tabbed screen). `src/features/cursed-deck/CursedDeckPage.tsx` is removed. `src/features/true-words/TrueWordsPage.tsx` becomes the True Words tab's content.
- **Browser:** `src/features/cards/CardBrowser.tsx`, `CardFace.tsx`, `CardTable.tsx`, `display.ts`, `sort.ts`, `status.ts` are widened from cards to cards and True Words. A shared tab list component is extracted from `src/features/hands/HandsPage.tsx`.
- **Links:** `src/features/true-words/HandTrueWords.tsx` (draft link), `src/features/stats/CardHistoryPage.tsx` and the `cardHistoryPath` callers (one history route).
- **Tests:** the screen tests of the three former screens become Kütüphane tab tests. The route and menu tests change. Firestore rules and emulator tests do not change, but `npm run test:emulator` must still pass.
- **Docs:** `docs/domain.md` and `docs/conventions.md` name the screens, so they are updated.
