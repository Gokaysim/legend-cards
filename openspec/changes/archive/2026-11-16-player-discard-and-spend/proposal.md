# Proposal

## Why

Two things that happen at the table still need the DM. A card effect makes a player discard, or a player wants to drop a second Blessed card, but only the DM can discard. And the rules page says "1 LP harcayarak bir d20 zarında avantaj alınır", but a player cannot record spending that LP, so the DM lowers it by hand every time. The owner wants players to discard their own cards and lower their own LP. The table is a group of friends, and the owner chose to trust them: the server enforces only the limits the owner named, which are "only their own cards" and "only subtract". Every action is logged, and the DM fixes mistakes by hand.

## What Changes

- **A player discards their own card.**
  - The holder can discard any card in their own hand, Cursed and Blessed cards included, after the same confirmation the DM gets. The holding closes as `discarded`, and a normal card with one copy goes back to the pool, as it does today.
  - A True Word is not discarded by its holder. The table rule says a learned word cannot be forgotten. Taking a word back stays the DM's.
  - Players still cannot discard another player's card, and still cannot transfer cards.
- **"At" moves next to "Kullan".** In the card details, "At" leaves the "DM araçları" section and stands beside "Kullan", for everyone who may discard: the holder and the DM. "DM araçları" keeps the cost, "Aktif et" and "Başkasına ver". The confirmation still opens in place of the buttons.
- **A player lowers their own LP.**
  - On their own hand, the player's "Legend Point" tile gets a "− LP" control. It opens a "Legend Point harca" dialog with the amount (starting at 1), a required reason, a "d20 avantajı" shortcut that fills the reason and sets 1 LP, the LP after the change, and a single "− Düş" button. There is no way to add.
  - Other players' hands show no LP control, as today. The DM's "± LP" does not change.
  - The change is a change by hand (`manual` in the ledger), made by the player. LP still never goes below 0, a change still needs a connection, and nothing changes while a pack is open.
- **The log.** A player's own discard reads "<card> kartını attı." after the player's name, without repeating whose hand it was, the same way a player's own use reads today. A player's LP change shows like the DM's: the player's name, the account, the change, the balance before and after, and the reason.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-holdings`:
  - discarding: the holder may discard their own cards, but not a True Word
  - the card details' actions: "At" stands beside "Kullan" for the holder and the DM, and leaves "DM araçları"
- `balances`:
  - a player may lower their own LP by hand, with a reason, and never raise it or change another account
  - the reason rule covers the player's own changes
  - the "Legend Point" tile shows the player's "− LP" control on their own hand, and the "Legend Point harca" dialog
- `activity-log`:
  - the event row of a player's own discard does not repeat whose hand it was

## Impact

- **Firestore rules** (`firestore.rules`):
  - `userCards` update: a close as `discarded` is allowed to the holder for a card that is not a True Word
  - `users` update: `lpSetByEntry('manual')` is allowed to the player on their own profile when the LP falls
  - `ledger` create: the `manual` source is allowed to a player for their own LP with a negative change and a reason
  - emulator rules tests for each, including the denials: another player's card, a True Word, a raise, another player's LP, the purse, a missing reason, an open pack
- **Data:** no new fields, collections or indexes. The log already reads `manual` entries, so its query does not change.
- **App code:**
  - `src/features/hands/HoldingDetails.tsx`: "At" and its confirmation beside "Kullan"
  - `src/features/hands/HandSummary.tsx`: the player's "− LP" control
  - `src/features/balances/BalanceDialog.tsx`: the player's spend mode (or a small sibling dialog)
  - `src/features/activity-log/eventText.ts`: the discard sentence
- **Tests:** `HoldingDialog.test.tsx`, `HandDetailsPanel.test.tsx`, `BalanceDialog.test.tsx`, the hand summary tests, the log text tests, and `tests/firestore.rules.emulator.test.ts`. The existing test "denies a player discarding their own card" turns into an allow test.
- **Docs:** `docs/domain.md`: the `users`, `ledger` and `userCards` rows of the data table, the hand-screen note about "At", the LP bullet of the observed rules, and a new deliberate decision about trusting players.
- **Out of scope:**
  - trading cards between players, which stays a DM transfer
  - an LP-paid advantage roll in the dice channel, which belongs to the later `dice-card-rules` change
  - any check of the table's timing rules, such as "not in the encounter it was drawn" for a Cursed card
