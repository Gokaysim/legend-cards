# Proposal

## Why

The rules page says that using a card costs the LP in its top-left corner, and that using a True Word costs the LP in its middle, each time. The app records a card's use but never charges it, so the DM lowers each player's LP by hand after every use. The owner wants the LP to drop when a card or a True Word is used. This drops the last part of the legacy "LP is only changed by hand" rule (v2.2.8: "No automatic LP spending"). Draws, packs and True Word drafts already pay this way, so a use can follow the same pattern.

## What Changes

- **Using a card pays its cost.** "Kullan" takes the card's cost in this hand from the holder's LP, in the same step that closes the holding as used. The cost in this hand is the DM's cost override when there is one, otherwise the card's own cost. Cursed cards pay too.
- **What the cost asks for** (the same for cards and True Words):
  - a whole number ("0" to "6" in the data): exactly that amount
  - no cost (the 19 Blessed cards, and the 2 cards with an empty cost): nothing to pay
  - "d6": the player types the die rolled at the table, from 1 to 6
  - "X", or any other text (a cost override can be free text): the player types how much they pay, a whole number from 0 up
- **A player who cannot pay cannot use.** A player whose LP is below the amount cannot confirm. The details show the price and the player's LP. LP still never goes below 0.
- **The DM chooses the amount.** When the DM uses a card or a True Word for a player, the amount starts at the price, or is empty for "d6" and "X". The DM can set any whole number from 0 to that player's LP, and 0 uses it for free. Packs and True Word drafts already work this way. Using a card in the DM's own hand pays nothing, because the DM has no LP.
- **Using a True Word.** The True Word details get "Kullan" across the panel, for the player who knows the word and for the DM. Using a word pays its cost the same way. The word stays with the player and can be used again. Each use is recorded permanently and appears in the log.
- **The ledger.** A use that pays creates a ledger entry with a new source: `use` for a card or `wordUse` for a True Word. The entry names the holding or the word use. A use that costs 0 creates no entry.
- **The log.** A used card's event shows its payment, for example "Aboleth's Eyes kartını Thorin üzerinde kullandı (−2 LP).". A True Word use is a new event, for example "Abyss True Word'ünü kullandı (−5 LP).". The payment is never listed as a separate balance change. The user filter includes the player's word uses.
- **BREAKING (data rules):** the server will deny closing a holding as used without the new payment fields. A browser tab still running the old app gets a denial on "Kullan" until it reloads.

## Capabilities

### New Capabilities

None. A card's use belongs to `card-holdings`, and a True Word's use to `true-words`.

### Modified Capabilities

- `card-holdings`:
  - using a card pays its cost: the price rules, the player's limit and the DM's amount
  - a closed used holding records its payment
  - the use step shows the price
- `true-words`:
  - a new "Kullan" on a known word, with the same price rules
  - the permanent word use record
  - the server accepts a use only together with its payment
  - uses need a connection
- `balances`:
  - the player's own payments now include card and True Word uses
  - the DM's uses of a player's card or word may charge that player
  - the ledger's sources gain `use` and `wordUse`, which carry no reason
- `activity-log`:
  - a used card's event shows its payment
  - a new True Word use event
  - the user filter includes word uses

## Impact

- **Data:**
  - `userCards/{holdingId}` gets `useCost` (a whole number) and `useEntryId` (the ledger entry, or `null`), both written only when the holding closes as used. Older holdings lack them, which reads as no payment.
  - A new collection `wordUses/{useId}` holds one record per True Word use. It is never changed or deleted.
  - `ledger` entries get the sources `use` and `wordUse`, whose `drawId` names the holding or the word use.
- **Firestore rules:**
  - the holding's close as used, with the price check for the holder
  - `lpSetByEntry('use' | 'wordUse')` on the profile
  - `forUse()` and `forWordUse()` on the ledger
  - a new `match /wordUses/{useId}` block
  - emulator rules tests for each
- **Indexes:** `wordUses` by `uid` and `at`, for the log's user filter.
- **App code:**
  - `src/features/hands/` (`api.ts` closeHolding, `schema.ts`, `HoldingDetails.tsx`, `errors.ts`)
  - a shared price helper next to `numericCost` in `src/features/cards/display.ts`
  - `src/features/true-words/` (a new word use API, schema and converter, "Kullan" in `TrueWordDetails.tsx`)
  - `src/features/balances/schema.ts` (`LEDGER_SOURCES`)
  - `src/features/activity-log/` (`api.ts`, `events.ts`, `eventText.ts`)
- **Docs:** `docs/domain.md` (data model, glossary, the "LP is only changed by hand" decision, the True Words notes).
- **Out of scope:**
  - Custom Cards and the Elixir Shop, which the app does not have yet
  - writing a used card's effect to the active effects, which is a separate item in `TODOS.md`
  - switching a True Word active on use, which the DM keeps doing by hand
  - an undo of a use: the DM corrects mistakes by hand, by giving the card back and adding the LP back with a reason
