# Proposal

## Why

The cards are in the app, but nobody holds any of them. The default screen, "Oyuncu elleri", is still a placeholder. The library cannot say whether a card is in the pool or in someone's hand.

Holding cards is what every later feature builds on:
- Packs and draws put cards into hands.
- The log and history read who held what.
- The final step before going live is the DM entering the table's current hands.

This change follows the "card holdings" part of the target data model agreed in `add-user-roles`.

## What Changes

- **Card holdings** at `userCards/{id}`. Each record is one card's stay with one player:
  - which card, which player, when it was given, by whom, and how (`dm` or `transfer` for now)
  - whether it is active, its note, and its cost override
  - when, by whom, and why it left the hand (`used`, `discarded` or `transferred`), and for a used card, on which character

  The history is permanent. A record is closed, never deleted.
- **A card's holder.** A normal card records its holder on `cards/{cardId}` (`holder`), so it is out of the pool while it is held. Cursed and Blessed cards have no holder, because they are repeatable.
  - A DM's extra copy of a held card is a holding of its own. It leaves the holder as it is.
  - Every movement is a transaction, so two devices can never take the same card.
- **Who may do what.** The access rules enforce this:
  - Everyone signed in sees every hand.
  - A player can use their own cards, giving the character they used it on, and can edit their own card notes.
  - The DM can do everything for anyone:
    - give any card, including an extra copy of a held card after a confirmation
    - use a card for a player, or discard it without use
    - switch a card active or inactive
    - transfer a card to another player
    - set a cost override
    - edit notes
- **"Oyuncu elleri" replaces its placeholder:**
  - It shows one player's hand, in the order the cards were received, as cards or as a list.
  - It shows how many cards the hand holds, the active effects, the distinct sets, and the number of Cursed cards.
  - The selected card has a details panel with the actions above.
  - Players start on their own hand. Every name in the "Oyuncular" list opens that player's hand.
  - The DM gives cards with "+ Kart ver": search the library, pick a card, give it.
- **The library shows pool status:**
  - the Kart kütüphanesi gets a "Durum" ("Havuzda" or "Elde: <names>"), a "Yalnızca havuzdakiler" filter, and the counts "Havuzda" and "Ellerde"
  - the Cursed Deck shows who holds each Cursed card
  - card faces of held normal cards are marked
- **BREAKING (spec):**
  - The card-library requirement "No card writes from the application" changes: clients may now change a card's `holder`, under the rules above. Card definitions still change only through the import script.
  - The "Oyuncular" list now links each name to that player's hand.
- **Docs:** `docs/domain.md` gets the data model rows, and the change from the legacy one-session log to permanent history. `docs/conventions.md` gets the new provider and the rule helpers.

Decided in the exploration with the owner:
- **No migration.** The "Drawn?" column is ignored.
- **The table's current state is entered last.** At the very end, the DM enters the players' current hands with the normal "give a card" action, so there is no separate "initial" kind of holding.
- **Player notes wait** for a later change.

Out of scope, each a later change:
- **pack-opening:**
  - LP and the party's GP, with their ledger
  - "🎲 Kart Çek", "☠ Cursed Kart Çek", the Pack Shop, and the İşlem Logu screen
  - the pool distribution statistics, which belong with the draws
- **True Words:** the hand's True Words tab and count.
- **Player notes.**
- **Dragging a card onto a player.** The legacy app's drag from the library or a hand onto a name in the sidebar is replaced by the "+ Kart ver" and "Başkasına ver" actions, which also work on phones.
- **card-images:** pictures.

## Capabilities

### New Capabilities

- `card-holdings`: who holds which card. Covers:
  - the holding records and their permanent history
  - pool status
  - who may give, use, discard, transfer, activate, annotate, and re-cost a held card
  - the "Oyuncu elleri" screen

### Modified Capabilities

- `card-library`: card writes are no longer all denied, because the holder may change through holdings. The library shows pool status, the "Yalnızca havuzdakiler" filter and the pool counts, and the Cursed Deck shows who holds each card.
- `user-profiles`: each name in the "Oyuncular" list opens that player's hand.

## Impact

- **Code:**
  - a new holdings data module in `src/features/hands/`:
    - schema, converter, and `api.ts` with the transactions
    - a `HoldingsProvider` that shares the open holdings app-wide
  - the "Oyuncu elleri" screen in `src/features/hands/`, with a route for each player (`/hands/:uid`)
  - `src/features/cards/`:
    - `holder` in the card schema
    - `CardsProvider` reads retired cards too, so a held card that was retired still shows in its hand
    - pool status in the browser
  - `src/features/users/PlayerList.tsx`: the names become links
  - `src/app/App.tsx` mounts `HoldingsProvider`, and `src/test/` gets a test provider and fixtures
- **Rules and tests:**
  - `firestore.rules` gets an `isDm()` helper, a `userCards/{id}` block, and holder updates on `cards/{cardId}`. Each side of a movement checks the other with `getAfter`.
  - rules tests for every action and role, with emulator tests for the transactions
- **Dependencies:** none.
- **Firebase usage:**
  - one subscription to the open holdings for each signed-in device: a few hundred documents at most
  - every rule that checks the role reads the user's profile once
