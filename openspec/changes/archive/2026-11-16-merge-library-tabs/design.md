# Design

## Context

See proposal.md for why. The current shape that the approach has to work with:

- **Three screens, two browsers.** `LibraryPage` and `CursedDeckPage` both render `CardBrowser` (`src/features/cards/CardBrowser.tsx`) with `deck="legend"` or `deck="cursed"`. The set, mechanic and pool-only filters are gated on `deck === 'legend'`. `TrueWordsPage` has its own list: `TrueWordTile` cards, a status filter, and no search or list view. Above that list it has the DM's "Kimin için", `DraftStart` and `OpenDraftPanel`.
- **One definition store.** Since `unify-cards-and-true-words`, `CardsProvider` makes one subscription and splits it into `Card` (normal, Blessed, Cursed) and `TrueWord`. A True Word has `setCode`, `rarity` and `mechanicPack` set to `null`, a `picture`, and the eight flags. Its "Draft'ta çıkar" is `isInDraws`. Its pack flags are fixed off, so `hasChannel(word)` is `isInDraws`.
- **Known words are open holdings.** `useOpenHoldings()` holds every open holding, cards and True Words (`cardKind: 'trueWord'`). `cardStatuses` (`src/features/hands/cardStatus.ts`) already turns open card holdings into `holderNames` per card. `useDeckStatus` leaves out the `trueWord` holdings.
- **Tabs and routes.** The hand screen's tabs are inline markup in `HandsPage.tsx` (`role="tablist"`, `Button` per tab, `?tab=` in the URL, no value for the default tab). `SCREENS` in `src/app/screens.ts` feeds both the router and the menu. `CARD_HISTORY_ROUTES` has one route per deck, and `CardHistoryPage` takes a `deck` prop to choose its back link and refuse the other deck's cards.
- **No data change.** Nothing here touches Firestore, its rules or its emulator tests.

## Goals / Non-Goals

**Goals:**
- One browser component, set up per tab by data rather than by `if (deck === …)` branches, so the three tabs look and behave alike (spec: card-library).
- The True Words tab keeps everything the True Words screen does: the player choice, the draft, the DM's editing. Only its list changes.
- Old addresses keep working.

**Non-Goals:**
- A "Hepsi" tab, or a search across the tabs.
- A Kart geçmişi for True Words.
- Moving the library's filters to the pill bar (`FilterBar`) of the draw and give dialogs.
- Moving the draft to the hand's True Words tab.

## Decisions

### D1. One screen, the tab in `?tab=`
- **The screen list.** `SCREENS` drops `true-words` and `cursed-deck`. `library` keeps `/library` and the icon ▤, and gets the label "Kütüphane". The menu order follows from the array.
- **The tab parameter.** The tab lives in `?tab=`, as on the hand screen:
  - `cursed` opens the Cursed tab, and `true-words` the True Words tab
  - Kartlar has no value, being the default, and an unknown value also opens Kartlar
  - the True Words tab keeps its `?for=<uid>` next to `tab`
- **The path helper.** A new `libraryPath(tab?, forUid?)` replaces `trueWordsPath`. Its one caller, the hand's "✦ True Word Draft" link, uses `libraryPath('true-words', forUid)`.
- **Alternative considered:** path segments (`/library/cursed`). They collide with `/library/:cardId` (D7), and the hand screen already uses `?tab=`. Rejected.

### D2. A shared tab list
- **The component.** The hand's tab markup moves into `src/components/ui/TabList.tsx`: a `role="tablist"` of `Button`s with `aria-selected` and `aria-controls`, styled primary when selected. The caller passes the tabs, the selected one, a callback and a `className`. The hand keeps its stacked layout through that `className`.
- **The library's row.** The Kütüphane puts the tabs in one row under its title. Each label carries its count in a muted span. The row may wrap at 360 px, so it never scrolls the page (spec: "The Kütüphane screen and its tabs", "Phone width").
- **Alternative considered:** a second copy of the markup. That means two places to keep accessible. Rejected.

### D3. `CardBrowser` sets itself up per deck from a table
- **The deck.** `CardBrowser` takes `deck: 'legend' | 'cursed' | 'words'` and a list of that deck's definitions (`Card | TrueWord`, called `Definition` here). A `SETUPS` table inside the browser holds what differs:
  - whether the set and mechanic filters show (`legend` only). Every deck gets the Cost filter.
  - the table's columns (`LEGEND_COLUMNS` or `PLAIN_COLUMNS` in `tableColumns.ts`)
  - the Turkish texts: the count's noun, loading, empty, not found, and the load errors
  - the on/off filter: its label and what a shown definition passes while it is on
- **The toggles.** Each toggle is derived from what the browser already receives:
  - Kartlar: the status's `inPool`
  - Cursed: the status has holders
  - True Words: `isKnown` is false

  The checkbox is disabled until that input is known. The page passes the live data only: `status`, `isKnown` and, for words, the count note.
- **The helpers.** `sortCards`, `cardHaystack`, `setChoices`, `CardTable`, `CardDeck` and `statusText` are widened from `Card` to `Definition`. A True Word's `null` set, rarity and mechanic pack already sort and search as empty. `Deck` (`legend | cursed`) stays as it is for draws, packs and statistics.
- **Alternatives considered:**
  - Three browsers: that is the duplication the owner asked to remove.
  - The page builds each toggle and passes it in: more props for the same three cases. Rejected during implementation.
  - Switching every tab to `FilterBar` pills: that would also change the Kartlar tab's look and its spec ("Library filters"), which this change keeps. Left out (Non-Goals).

### D4. True Words drawn by `CardFace`
- **The frame and labels.** `CardFace` accepts a `Definition`. `cardFrame` gains `'word'`, which maps to `border-true-word-line`, a lavender apart from the Common `border-common`. A face whose kind is `cursed` or `trueWord` leaves out the set, rarity and mechanic rows. This generalizes today's `kind === 'cursed'` checks.
- **The cost.** The cost sits in the round `CostBadge` without "LP", as on every face (spec: true-words, "An X cost"). `TrueWordTile` stays in the hand, the draft panel and the details, where "<cost> LP" remains.
- **The picture.** A word's picture goes through the same `useArt().pictureUrl(definition.picture)`, so faces with pictures, the zoom view (`CardZoomDialog`) and the tilt work unchanged.
- **The marks.** A new `isKnown` prop adds the "Biliyor" mark to the face. `CardTable` shows "Biliyor" next to the name, as it does "🔒 DM". Words never get the held glow (spec: visual-effects).
- **Alternative considered:** keeping `TrueWordTile` in the grid. The list view, the zoom, the tilt and the deck layout would all need a second path. Rejected.

### D5. Word statuses from the known-word records
- **The map.** `wordStatuses` (`src/features/true-words/wordStatus.ts`) turns the known-word records of the True Words context into a `CardStatus` per word: its knowers in the order learned as `holderNames`, with `inPool: false`. `useOpenHoldings` leaves out the word holdings, and the context already reads every player's records. Players see each other's known words already (spec: true-words, "Learned word records").
- **The Durum text.** `statusLabel` names the holders "Bilenler" for a word and "Elde" otherwise. Its existing no-channel branch then yields "DM'e özel · Bilenler: Bora" for a word whose "Draft'ta çıkar" is off.
- **The count notes.** `useDeckStatus` stays as it is:
  - Kartlar: "Havuzda X · Ellerde Y", as today
  - Cursed: "Ellerde Y". `useDeckStatus('cursed').handCount` already counts the copies of Cursed cards in hands.
  - True Words: "<name> <n> True Word biliyor", from the chosen player's known words
- **Unchanged.** `isMarkedHeld` returns false for a word, so a known word never gets the held mark or glow.

### D6. The Cost filter reuses the dialogs' cost facet
The choices come from `costFacet.choices(listed)`, and a definition matches through `costKey`. Both are in `src/features/cards/filters.ts`. The library and the draw and give dialogs therefore order and compare costs the same way: numbers first, trimmed, case-insensitive. The filter is a `<select>` with "Tüm cost'lar", next to the set and mechanic selects.

### D7. One Kart geçmişi route
- **The route.** `CARD_HISTORY_ROUTES` becomes one `CARD_HISTORY_ROUTE = '/library/:cardId'`, and `cardHistoryPath(card)` always returns `/library/<id>`.
- **The page.** `CardHistoryPage` loses its `deck` prop. It finds the card among the cards only, so a True Word ID stays "Kart bulunamadı.". Its back link is "← Kütüphane", to the card's tab.
- **The back link.** `BackLink` gains an optional `to`, so the history page can point at a tab of the Kütüphane. `SetStatsPage` keeps `screen="sets"`.

### D8. Redirects for the former addresses
- **The routes.** `routes.tsx` gains three routes in `FORMER_ADDRESSES` that render `<Navigate replace>`, so the browser history keeps only the new address:
  - `/cursed-deck` to `libraryPath('cursed')`
  - `/true-words` to `libraryPath('true-words', for)`, reading `for` from the search
  - `/cursed-deck/:cardId` to `/library/:cardId`
- **Their place.** The two that read the address are small components in `src/app/FormerAddresses.tsx`. No menu entry and no page refers to them.

### D9. Tabs remount, data does not
- **Fresh filters.** The Kütüphane renders only the open tab, keyed by the tab. Switching tabs unmounts the browser, which gives the "filters start afresh" scenario without extra state.
- **Instant switching.** The definitions, holdings and drafts come from providers mounted above the shell, so switching starts no new subscription.
- **The tab counts.** The counts are computed in the page from the same lists, at "Yayında": `useDeckCards('legend'|'cursed')` and the active words, leaving out the hidden ones for a player.

### D10. Adding in the header, editing in the tab
- **Adding.** `useAddDefinition(deck)` gives the DM's "+ Kart ekle" or "+ True Word ekle" and the form it opens. The page calls it, so the button sits in the header's actions with, on Kartlar, "▥ Havuz Dağılımı".
- **Editing.** `useCardEditing(deck)` and a new `useWordEditing()` keep the status filter and the edit form. They are called inside the keyed tab content, so the status filter starts at "Yayında" each time a tab opens (D9).
- **The Cardmaker.** The `PageHeader` takes the tab's Cardmaker, placed in the corner, from `LIBRARY_TABS` next to `SCREENS`.
- **Alternative considered:** one `useDefinitionEditing(tab)` at page level. Its filter state would outlive a tab switch, and a tab's content cannot fill the header without a portal. Rejected.

### D11. Spec wording outside the touched requirements
Some scenarios that this change does not otherwise touch still say "Kart kütüphanesi", "Cursed Deck" or "True Words screen". Examples are in `definition-editing` (publishing, retiring, pictures), `user-auth` and `developer-workflow`. They read as the Kartlar, Cursed and True Words tabs. "Cursed Deck" as the deck that Cursed cards are drawn from is not a screen name and stays everywhere. Rewriting those blocks would roughly double the delta without changing behavior.

## Risks / Trade-offs

- [`CardFace` is used by the hand, draws, packs and details] → The widening is type-only for those callers. The word branch is limited to the frame, the label rows and the "Biliyor" mark. Their existing tests must pass unchanged.
- [Three labelled tabs with counts at 360 px] → The row wraps (D2). The manual 360 px check in the tasks covers every tab, as a player and as the DM.
- [Old links in shared chats or bookmarks] → The redirects (D8), with route tests for each.
- [The in-flight change `live-draws` also edits `visual-effects` and `card-draws`] → It changes other requirements ("The draw spread", new requirements), so the archive syncs both. In code it touches draws, not the library.
- [Losing a tab's filters when switching] → An accepted simplification (D9), stated in the spec. If it annoys in use, the filters can move to the URL later without a spec change beyond that scenario.
- [v2.2.8 has three separate screens] → The owner's decision of 2026-11-15. `docs/domain.md` records it, so it is not "fixed" back.

## Migration Plan

- **Rollout.** There is no data migration. The change ships as a Hosting deploy, and the old addresses redirect from the first load.
- **Rollback.** Reverting the commit is enough. Nothing stored depends on the new screen.
