# Proposal

## Why

The TODO list asks for a set filter in the DM's draw, and for a way to get one specific card. The DM can already give any card with "+ Kart ver". The problem is that finding the card there is hard:

- The dialog only searches by text.
- It shows no pictures and no filters.
- It lists at most 30 results, and nothing until the DM types.

The draw dialog has its own problems:

- Its filters are four plain selects.
- Nothing shows which filters are on, and there is no way to clear them.
- The choices ignore each other, so a combination that leaves 0 cards is easy to reach.
- The DM sees only a count, not which cards remain.

On 2026-11-14 the owner settled these points in an explore session:

- **A specific card is given, never drawn.** "+ Kart ver" stays the way to hand out a chosen card, and a draw record always stays random.
- **The look.** Out of three directions on a design canvas (https://claude.ai/artifact/XxsnKTGBEqMEC1VtbiKGYQ), the owner chose **V3 · Deste**.

## What Changes

**Draw dialog, set filter**
- The DM's draw dialog gets a set filter.
- It lists the sets that have drawable cards, in the stored order, by their official names. Codes that no stored set has follow, as written.
- "Blessed" is not in the list, because the rarity filter already offers it.
- The draw record stores the chosen set's code with the other filters. The log names the set by its official name.

**Filters that narrow each other**
- In the DM's draw dialog and in "+ Kart ver", each filter choice shows how many cards remain with it, given the other filters.
- A chosen value stays listed even when its count drops to 0.
- Filters that are on can be cleared one by one or all at once with "Temizle".

**Draw dialog, V3 look**
- Filters sit in one row of pills. Each pill opens a small menu of choices with their counts.
- A deck stands in the middle with the number of cards left on it, and the draw control sits under it.
- The drawn cards lie in a fan beside the deck.
- "Destede ne var?" shows the cards that match, face up, for the DM only.
- A player's draw dialog and the Cursed draw keep no filters. They get the same table look:
  - the player sees their LP as a pill, and a "🎲 Çek · 1 LP" control
  - the Cursed draw shows the Cursed cardback on its deck

**Set back**
- While the DM's set filter is on, the deck and every face-down card drawn after the choice show that set's cardback.
- Without a set filter, the back stays neutral.
- Neither back can give the card away: a set-filtered draw can only give a card of that set, and never a Blessed card.

**"+ Kart ver", V3 look**
- A large search field sits on top, with the same filter pills under it:
  - set, mechanic pack and cost
  - a kind menu with Common, Rare, Blessed and Cursed
  - a "Yalnızca havuzdakiler" switch
  - a count of the matching cards
- With no search and no filter, the dialog lists every active card, so the DM can browse.
- Results are card faces in a grid, each with a status badge in its corner: "Havuzda", the holder's name, "DM'e özel" or "Cursed".
- "Daha fazla göster" adds 20 cards at a time.
- Selecting a face selects the card, and a bar at the bottom gives it. For a held normal card, the bar asks for the extra copy, as the dialog asks today.
- The dialog stays open, so the DM can give several cards in a row.

**Phone width**
- At 360 px the pills wrap, and the open menu spans the dialog.
- The grid of "+ Kart ver" has 2 columns, and its bottom bar stays at the bottom of the dialog.

**Fixed behavior that stays**
- Filters reset when the dialog closes.
- The player's draw records no filters.
- The Cursed draw has no filters.
- No new card or draw kinds are added.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-draws`:
  - the DM's filters gain the set
  - choices show counts and narrow each other, and can be cleared
  - the DM can look at the matching cards
  - the dialog's deck and table look
  - the set's cardback while the set filter is on
- `card-holdings`: "+ Kart ver" browses without a search, filters like the draw dialog, shows faces with status badges in a grid, and gives the selected card from a bar at the bottom.
- `visual-effects`: the draw spread becomes a fan beside the deck.
- `activity-log`: a DM's draw event names the set filter by its official name.

## Impact

- **Code:**
  - `src/features/draws/DrawDialog.tsx`, `DrawButtons.tsx` and `FaceDownCard.tsx`
  - `src/features/hands/GiveCardDialog.tsx`
  - `src/features/cards/pool.ts`: the filters, the options and their counts
  - `src/features/draws/schema.ts`
  - `src/features/activity-log/eventText.ts`
  - `src/features/art/spreadBack.ts` (already has a `set` back)
  - a new shared filter-pill component, used by both dialogs
- **Data and rules:**
  - draw records get `filters.setCode`
  - `firestore.rules` `validFilters` accepts it, and requires it on new draws
  - records written before this change have no `setCode`, and the app reads it as none
  - emulator rules tests cover the new field
- **Tests:**
  - `DrawDialog`, `GiveCardDialog`, `pool`, the draw schema and the log's event text unit tests
  - `tests/firestore.rules.emulator.test.ts`
- **Not affected:**
  - the player's paid draw, the Cursed draw's rules, the Pack Shop and the library
  - the library keeps its own set filter, which also lists "Blessed"
