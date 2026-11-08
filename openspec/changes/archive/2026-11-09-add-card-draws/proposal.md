# Proposal

## Why

At the table, a player spends 1 LP to draw a card, and draws a Cursed card as the price of rerolling a d20. The app cannot record either yet. Today the DM has to give the card with "+ Kart ver" and lower the LP by hand, with a reason, in two separate steps. The app also has no record of what was drawn.

This is the first half of pack-opening. It builds the `draws` part of the target data model agreed in `add-user-roles`, along with the player's own payment. The Pack Shop, the second half, then builds on the same records and rules.

## What Changes

- **"🎲 Kart Çek" on the hand screen.**
  - A player draws for their own hand. Each card costs 1 LP and goes into the hand at once, so a paid card is never left outside the hand.
  - A player can draw again and again in the same dialog, as long as they have LP.
  - Each card is picked at random from the pool: the normal cards that no one holds, plus every Blessed card. Every card has the same chance. Blessed cards are always in the pool, so they come up at their share of the pool, as in the legacy app.
  - The DM draws for any hand, free of charge. The DM can narrow the draw with filters: cost, mechanic pack, rarity (Common, Rare, Blessed), and a keyword. The dialog shows how many cards match.
  - Drawn cards appear face down in the dialog, and each one is flipped to reveal it.
- **"☠ Cursed Kart Çek" on the hand screen.**
  - The hand's owner or the DM draws a random card from the Cursed Deck into that hand. This draw is free, because a Cursed card is itself the price of a d20 reroll.
  - Several Cursed cards can be drawn in a row, for example two after rolling a 1.
- **A permanent record of every draw.**
  - Each draw is stored with:
    - who drew, and for whose hand
    - the card, its kind, and the holding it opened
    - the payment: 1 LP, or none
    - the DM's filters, if any
  - Draws are never changed or deleted.
- **A player's own payment.**
  - A player may lower their own LP by exactly 1 for each random draw they make.
  - The access rules accept the draw, the holding, the card's holder, the ledger entry, and the new LP only all together, so none of them can be written without the others.
  - Every other balance change stays with the DM.
- **İşlem Logu.**
  - A draw is one event that names the drawer, the hand, the card, and the payment, for example "Ayla kart çekti: Aboleth's Eyes (−1 LP)".
  - The draw's holding and its ledger entry are not listed again as separate events.
- **Pool distribution in the library.** A "▥ Havuz Dağılımı" dialog on the Kart kütüphanesi shows:
  - how many cards can be drawn
  - their share by rarity (Common, Rare, Blessed), with the sets inside each rarity
  - their share by set

  With an equal chance for every card, these shares are also the odds of a draw.
- **BREAKING (spec):**
  - Players may now create a holding for themselves, but only through a draw.
  - Players may now lower their own LP, but only by paying for a draw.
  - A ledger entry from a draw has no written reason. Its source is `draw`, and it points to its draw.
- **Docs.** `docs/domain.md` gets the `draws` row, the refinements of the target model, and the owner's answer to the open question about the Blessed chance in a draw.

Decided in the exploration with the owner:
- **The client picks the card for now.** The access rules check the structure: the card can be drawn, the payment is right, and every record agrees. They cannot check that the pick was random. A draw is stored whole when it is made, so a server function could write the same records later without migrating any data.
- **Every card has the same chance**, Blessed cards included. This is the legacy behavior, not the rules page's fixed 2%.
- **Filters are for the DM only.** A player's 1 LP draw always draws from the whole pool.
- **Each card is paid and added at once.** There is no batch that is collected first and confirmed later.
- **The work is split.** This change brings the draws. The Pack Shop follows as its own change.

Decided defaults, recorded in the design:
- The DM's draws are free, as agreed in `add-user-roles`. When the DM draws for a player who should pay, the DM lowers that player's LP by hand.
- A specific draw (search and pick a card) is already covered by the DM's "+ Kart ver", so it is not a separate feature.
- A draw never creates an extra copy. A pool card that someone takes while the draw is running is replaced by another random card, and nothing is charged twice.

Out of scope, each a later change:
- **add-pack-shop:** the Pack Shop, the eight pack types and their thresholds, the opening flow, choosing a card, the mandatory Cursed card, and paying with LP or the party's GP.
- **card-images:** cardbacks, card pictures, and the "shocked" Cardmaker when a Blessed card is revealed. Until then, the face-down side is drawn with CSS.
- **Table rules the app does not track:** one Blessed card per player, losing a Blessed card on drawing a Cursed card or on leveling up, and when in a session cards may be drawn.

## Capabilities

### New Capabilities

- `card-draws`: drawing cards into a hand. Covers:
  - the random draw and the Cursed draw, and who may draw for whom
  - the 1 LP payment, the DM's free and filtered draws, and the equal chance per card
  - the permanent draw records, and the rules that keep a draw, its holding, its card, and its payment in agreement
  - the draw dialog: drawing again, face-down cards, flipping, and the error and empty states

### Modified Capabilities

- `card-holdings`: holdings can now be given via a draw. A player can create a holding for themselves through a draw, and through nothing else.
- `balances`: a player can lower their own LP by 1 by paying for a draw. Ledger entries now have a source (`manual` or `draw`) and a link to their draw. Only manual changes have a written reason.
- `user-profiles`: the profile write rule gains its second exception, a player's own LP lowered by a draw payment.
- `activity-log`: draws are listed as one event each, and they are included in the player filter.
- `card-library`: the Kart kütüphanesi gets the pool distribution dialog.

## Impact

- **Firestore:**
  - a new collection `draws/{drawId}`, with its rules and rules tests
  - `userCards`: `givenVia` adds `draw`, and a new field `drawId` (missing in older holdings, which counts as `null`)
  - `ledger`: `source` adds `draw`, and a new field `drawId`. `reason` is `null` for draw entries.
  - `users/{uid}`: a new rule path for a player's own LP payment
  - `firestore.indexes.json`: an index for the log's filtered draw query (`uid`, `at`)
- **Code:**
  - a new `src/features/draws/` with the schema, the api (one transaction per draw), the random pick, the draw dialog, and the hand screen buttons
  - `src/features/cards/`: the pool and its distribution (`pool.ts`), and the library's distribution dialog
  - changed:
    - `hands/schema.ts` and `hands/api.ts` (exported holding builder)
    - `balances/schema.ts` and `balances/api.ts` (exported ledger entry builder)
    - `activity-log/` (a third source, draw events, and the Turkish text)
    - `HandsPage`, `LibraryPage`, and the test providers and fixtures in `src/test/`
- **Tests:**
  - unit tests for the pool, the random pick, the filters, the distribution, the dialog, and the log events
  - emulator tests for the draw transaction
  - rules tests for every allowed and every denied combination
- **Docs:**
  - `docs/domain.md`: the data model, the target model refinements, and the resolved open question
  - `docs/conventions.md`: the draws feature, the pool helpers, and the log's third source
