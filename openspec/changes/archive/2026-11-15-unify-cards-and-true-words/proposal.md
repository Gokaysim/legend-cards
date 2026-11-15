# Proposal

## Why

Today a card's behavior is fixed by its kind. Where it can come from, whether several hands can hold it, whether it acts while held, whether a use leaves an effect, and whether a use keeps it in the hand are all decided by whether it is normal, Blessed or Cursed. True Words sit apart in their own five collections, with their own rules. The DM wants to set each of these behaviors per card and per True Word, in one place. The owner chose this on 2026-11-15 in an explore session, option B: True Words join the cards both as definitions and in how players own them.

## What Changes

- **BREAKING: one definition collection.** A True Word becomes a card definition of the kind `trueWord` in `cards/{cardId}`, keeping its `tw-…` ID. `trueWords` is removed.
- **BREAKING: one ownership model.**
  - A learned True Word is a holding in `userCards`, given by a draft or by the DM. Taking it back closes the holding.
  - A True Word draft is a `draws` record of the kind `wordDraft`.
  - Each use of a card or word that stays in the hand is a record in a new `uses` collection.
  - `userTrueWords`, `wordDrafts` and `wordUses` are removed. `playerWords` stays: the rules need it to read the draft price, "no word twice" and "one open draft" without a query.
- **Eight behavior flags on every definition.** The DM sets them in a new "Davranış" section of the card and True Word forms. A new definition starts with its kind's current behavior.

  | Flag | Label | Starts as | Shown for |
  |---|---|---|---|
  | `isInLibrary` | Listede görünür | on | every kind |
  | `isInDraws` | Kart çekmede / Cursed Deck'te / Draft'ta çıkar | on | every kind |
  | `isInSetPacks` | Set paketlerinde çıkar | on | normal, Blessed |
  | `isInMechanicPacks` | Mechanic paketlerinde çıkar | on | normal, Blessed |
  | `isRepeatable` | Birden fazla elde olabilir | off for normal, on for Blessed and Cursed | every kind but True Word (always on) |
  | `hasHeldEffect` | Elde etkili | on when the text starts with "Held:" | every kind |
  | `hasUseEffect` | Kullanınca efekt bırakır | on | every kind |
  | `isKeptOnUse` | Kullanınca elde kalır | off | every kind but True Word (always on) |

- **`isInDraws` means the kind's own draw.** For normal and Blessed cards that is "Kart çek". For Cursed cards it is the Cursed Deck, which covers the Cursed draw and a Cursed pack's mandatory card. For True Words it is the draft.
- **The pack flags.** `isInSetPacks` covers the Standard, Premium and Cursed Packs and a one-pack set's two packs. `isInMechanicPacks` covers the Mechanic, Golden and Cursed Golden Packs. Pack thresholds and the "▥ Havuz Dağılımı" dialog count only the cards whose flag is on. The DM's "+ Kart ver" ignores the flags.
- **BREAKING: `dmOnly` is removed.**
  - "Sadece DM verebilir" becomes a button that turns the four "where" flags off.
  - A card whose "Listede görünür" is off is hidden from players' lists and marked "🔒 DM".
  - Its change records are the DM's only. Turning the flag on or off is public.
  - The status filter's "DM'e özel" becomes "🔒 DM".
- **`isRepeatable`.**
  - On: the card is never out of the pool, and any number of hands can hold it, the same hand more than once too.
  - Off: the card has one copy with a holder. The DM's extra copy stays.
  - It can be turned on only while no one holds the card. Turning it off is always possible: the copies already in hands become extra copies.
- **`hasHeldEffect`.** A card or word with the flag enters a hand active, and the DM can still switch it. Without the flag there is no "Aktif" switch, and the card or word never shows as "Elden". For True Words this replaces switching any known word active: a word's effect "until the end of combat" is now the effect its use leaves on a character.
- **`hasUseEffect`.** With the flag, the use step offers "Aktif efekt olarak ekle", checked. Without it, the box is not shown, and the server denies the effect.
- **`isKeptOnUse`.** A use does not close the holding. Each use pays again, is recorded in `uses`, can leave an effect, is one event in the İşlem Logu, and counts as "Kullanıldı" on the card's history page.
- **Flag changes and an open pack.** A change of a "where" flag or `isRepeatable` waits for an open pack, as status steps do. The other flags do not. The form greys out a box it cannot change now and says why in Turkish. Flag changes show in the İşlem Logu as changed fields, for example "Kart çekmede çıkar: evet → hayır".
- **Kind changes in a draft.** When the kind of a draft changes between normal and Blessed, its flags return to the new kind's starting values.
- **Kept True Word rules.** These stay tied to the kind:
  - True Words do not count as cards.
  - A player knows a word once.
  - A draft costs 1 LP plus the number of words the player knows, and a player has at most one open draft.
  - A draft does not hold the table.
  - True Words cannot be transferred.
- **Notes and cost overrides on known True Words.** These come with the shared holding, and the True Word details show them as a card's details do.
- **Screens stay as they are.** The Kart kütüphanesi, the Cursed Deck and the True Words screen still list by kind, and the hand keeps its True Words tab.
- **Imports.**
  - `import-cards` writes each new card's flags.
  - `import-true-words` writes the words into `cards`.
  - The CSV files get no new column.
- **BREAKING: dev data is reset, not upgraded.** Nothing is live yet. On the owner's go-ahead, the emulator data is wiped and loaded again from the files and the picture archives. The accounts are kept.

## Capabilities

### New Capabilities

None. The flags belong to the definitions that `definition-editing` owns, as `dmOnly` did.

### Modified Capabilities

- `definition-editing`:
  - the eight flags with their starting values, labels and per-kind visibility
  - the "Davranış" section and the "Sadece DM verebilir" button
  - which flag changes wait for an open pack, and when `isRepeatable` can be turned on
  - who reads a record now depends on "Listede görünür"
  - the DM-only flag is removed
- `true-words`:
  - words are offered by `isInDraws` and listed by `isInLibrary`
  - learned and taught words start active only with a held effect
  - the "Aktif" switch only for held-effect words
  - the effect box follows `hasUseEffect`
  - notes and cost overrides on known words
- `card-holdings`:
  - repeatable cards instead of Blessed and Cursed by kind
  - active only with a held effect
  - kept cards stay in the hand when used, and their use records
  - the effect box follows `hasUseEffect`
  - True Words cannot be transferred
  - the DM-only rule is removed
- `card-draws`: the random draw and the Cursed draw follow `isInDraws` and `isRepeatable`, and the server checks both.
- `pack-shop`:
  - the candidates and thresholds follow the pack flags and `isRepeatable`
  - the mandatory Cursed card follows `isInDraws`
  - the DM-only rule is removed
- `card-library`:
  - lists, counts and the "🔒 DM" mark follow `isInLibrary`
  - the pool status, the pool-only filter and the pool distribution follow the flags
  - the "🔒 DM" filter choice
- `character-effects`:
  - a use's effect needs `hasUseEffect`
  - a kept card's effect names its use record
- `activity-log`:
  - flag changes as fields
  - a kept card's use is one event
  - import events leave out cards not listed for players
  - the sources the log reads
- `card-stats`:
  - kept cards' uses count from their use records
  - who opens a page, and a set page's cards, follow `isInLibrary`
- `card-sets`: a player's set count follows `isInLibrary`.
- `admin-scripts`: the imports write the flags, and the True Words import writes into `cards`.

## Impact

- **Data:**
  - `cards/{cardId}`: the kind `trueWord`, the eight flags, no `dmOnly`
  - `userCards`: True Word holdings, with the way "draft"
  - `draws`: the kind `wordDraft`
  - new `uses/{useId}`
  - `playerWords`: points at holdings
  - `characterEffects`: may name a use record
  - `definitionChanges`: snapshots with the flags
  - ledger: the True Word use source becomes the use source of any kept card
  - removed: `trueWords`, `userTrueWords`, `wordDrafts`, `wordUses`
- **Firestore rules:**
  - the card shape and flags
  - holder rules by `isRepeatable`
  - the draw, pack and draft checks by flags
  - word drafts moved under `draws`
  - learned words under `userCards`
  - `uses` with its payment and effect
  - the removed paths closed
  - emulator rules tests rewritten for all of these
- **App code:**
  - `src/features/cards/` (schema, pool, filters, display, status, context)
  - `src/features/true-words/` (rebuilt on holdings, draws and uses)
  - `src/features/hands/`, `src/features/draws/`, `src/features/packs/`
  - `src/features/definitions/` (forms, schema, snapshots)
  - `src/features/characters/` (held and use effects)
  - `src/features/activity-log/`, `src/features/stats/`, `src/features/library/`, `src/features/cursed-deck/`, `src/features/sets/` (counts)
- **Scripts:** `scripts/lib/cardRows.ts`, `trueWordRows.ts`, `importCards.ts`, `importTrueWords.ts`, `importPictures.ts`.
- **Docs:**
  - `docs/domain.md`: the data model, the glossary, the DM-only decision replaced, a new decision for the flags and the merge
  - `docs/conventions.md`: the feature layout and the pool helpers
- **Dev data:** wiped and reseeded after the owner confirms. Storage character photos go with it.
- **Out of scope:**
  - merging the three list screens
  - Kart geçmişi pages for True Words
  - CSV columns for the flags
  - an upgrade path for stored data
