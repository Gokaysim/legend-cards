# Proposal

## Why

The DM wants cards that only the DM hands out: rewards and surprises that no draw or pack can give, and that players do not find by browsing the library. Today every active card is drawable and listed for everyone, so the DM has no such card.

## What Changes

- **A DM-only flag on cards.** A card of any kind (normal, Blessed or Cursed) can be marked "Sadece DM verebilir". The flag is separate from the card's status. A card without the field reads as not DM-only, so no stored data needs an upgrade.
- **Not drawable.** A DM-only card is never drawn and never shown in a pack:
  - not by a random draw
  - not by a Cursed draw or as a pack's mandatory Cursed card
  - not among any pack's cards

  The server denies a draw or a pack choice of one. A DM-only normal card that comes back from a hand stays out of the pool.
- **Only the DM gives it.** "+ Kart ver" offers DM-only cards like any other active card. Once given, the card shows in the hand, and in the log's give event, to everyone, as hands do today.
- **Players do not see it in the lists.** A player's Kart kütüphanesi and Cursed Deck never list a DM-only card, even while someone holds it, and their counts leave it out.
  - The hiding is in the interface only. The card's document still reaches the players' devices, because the hands read it. The owner accepted this.
- **The DM sees it marked.** On the DM's screens a DM-only card's face and list row are marked "🔒 DM". The Durum shows "DM'e özel", and "Elde:" with the holders when someone holds it. The DM's status filter gets a "DM'e özel" choice. The pool count and the "▥ Havuz Dağılımı" dialog leave DM-only cards out.
- **Set in the card form.** The card form gets a "Sadece DM verebilir" checkbox, in every status.
  - Turning the flag on or off changes the pool, so it waits for an open pack, as status steps do.
  - When the flag is turned off, an active normal card without a holder goes into the pool.
- **The log keeps DM-only work private.** A DM-only card's change records are readable by the DM only, as draft work is, and marked "🔒 Yalnızca DM". Turning the flag on or off is recorded as an edit with "DM'e özel: hayır → evet" or "evet → hayır". The record is public, because the card is visible to players on one side of the change.
  - A picture import's public record leaves DM-only cards out. They go into its DM-only record.
- **Imports leave the flag alone.** The card import never writes it, and `cards.csv` gets no column. New cards are not DM-only, and stored cards keep their flag.
- True Words get no such flag.

## Capabilities

### New Capabilities
None. The flag is part of the card definitions that `definition-editing` owns.

### Modified Capabilities
- `definition-editing`:
  - the DM-only flag and the form's checkbox
  - flag changes wait for an open pack
  - a DM-only card's records are the DM's only
- `card-library`:
  - players' lists and counts leave DM-only cards out
  - the DM's mark, Durum and status filter choice
  - the pool distribution excludes DM-only cards
- `card-draws`: random and Cursed draws never give a DM-only card, and the server denies one.
- `pack-shop`: packs never show a DM-only card, and the server denies choosing one.
- `card-holdings`:
  - the DM gives DM-only cards
  - a DM-only normal card does not return to the pool
- `activity-log`:
  - DM-only cards' change events are marked for the DM only
  - the flag change line
  - the picture import's public event leaves DM-only cards out

## Impact

- **Data:** `cards/{cardId}` gets an optional boolean `dmOnly`, and missing reads as `false`. The card snapshots in `definitionChanges` include it.
- **Firestore rules:**
  - the card shape and the definition keys
  - a flag change counts like a status step for the open pack
  - the record's `public` uses "visible to players" (`playerVisible` and not DM-only)
  - `drawnInto` and `chosenFromPack` deny DM-only cards
  - emulator rules tests for each
- **App code:**
  - `src/features/cards/` (`schema.ts`, `pool.ts`, `status.ts`, `cardsContext.ts`, `CardFace.tsx`, `CardTable.tsx`, `CardBrowser.tsx`)
  - `src/features/hands/cardStatus.ts`
  - `src/features/definitions/` (`schema.ts` snapshots and `isPublicStep`, `api.ts`, `CardFormDialog.tsx`, `statusFilterOptions.ts`, `StatusFilter.tsx`)
  - `src/features/packs/catalog.ts`, through `isDrawable` and `cursedPool`
  - `src/features/activity-log/eventText.ts`
- **Scripts:** `scripts/lib/importPictures.ts`, whose record split must treat DM-only cards as DM-only.
- **Docs:** `docs/domain.md` (data model, glossary, decisions).
- **Out of scope:**
  - hiding the card's document from players' devices
  - DM-only True Words
  - a CSV column for the flag
  - a DM "draw this specific card" control (a separate item in `TODOS.md`)
