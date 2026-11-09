# Proposal

## Why

Packs are how players get most of their cards in the legacy app. The Pack Shop is still a placeholder, and `add-card-draws` named it as the next change. This change also builds the rest of the `draws` target model: `offered[]`, `chosen[]`, `status`, and payment with GP.

A pack takes two steps: open it, then choose a card. Between the steps, other people can act. In the legacy app this never mattered, because one person ran it on one computer. In the new app, another device could take a card that is still showing in someone's open pack. The owner decided how to handle that: **the table waits**. Only one pack is open at a time, everyone watches it live, and no one moves a card or a balance until it closes.

## What Changes

- **The Pack Shop screen** at `/shops/packs` replaces the placeholder. It has the same groups as the legacy app:
  - Set Packs: one group per set, in the official order, with the Pandemonium group last
  - Mechanic Packs, with one price in the section heading
  - the Golden Packs group

  There are eight pack types, with the legacy thresholds and price labels. A pack that cannot be opened shows why.
- **Opening a pack.**
  - A player opens a pack for themselves and pays its LP price.
  - The DM opens a pack for any player. The DM chooses the player's LP or the party's GP. The amount starts at the pack's price, and the DM can change it. 0 opens the pack for free.
  - Only the DM can pay with GP.
  - Payment is taken when the pack opens.
- **Pack contents** follow the legacy rules, with one exception the owner decided. Blessed cards are mixed, each with the same chance, into the candidates of the rare-only packs: Golden, Cursed Golden, Pandemonium, and Pandemonium Cursed. This replaces the Golden Pack's 2% Blessed slot. **This deliberately departs** from legacy v2.2.8 and from the "Golden Packs have a 2% Blessed chance" entry in `docs/domain.md`.
- **The table waits for an open pack.**
  - Only one pack can be open at a time, across the group.
  - While it is open, nobody, the DM included, can draw, open another pack, give, use, discard, or transfer a card, or change LP or GP. The server enforces this.
  - Viewing, notes, switching cards active, and cost overrides stay available.
- **Live for everyone.**
  - Every signed-in user sees the open pack on any screen, and each card as it is turned over. A user can shrink the view to a banner and bring it back.
  - The pack opens with a burst animation. Until card-images, it is drawn with CSS, and it is skipped with reduced motion.
- **Choosing.**
  - The hand's owner or the DM turns over every card, then chooses one.
  - In Cursed, Cursed Golden, and Pandemonium Cursed Packs, the Cursed card is mandatory: it goes to the hand together with the chosen card.
  - The DM can choose for the player.
- **Ending a pack.**
  - A pack ends only when a card is chosen, or when the DM cancels it. A cancel refunds the payment in full and gives no card.
  - Closing the window, reloading, or losing the connection never ends a pack. Its owner can continue where they left off.
- **Records.**
  - **Pack opening:** stored in `draws` with the kind `pack`. It changes while the pack is open, and is permanent once the pack ends.
  - **Holdings:** a holding received from a pack has the way `pack`.
  - **Ledger:** pack payments and refunds have the source `pack`.
  - **Lock:** a new singleton `table/main` names the open pack.
- **İşlem Logu.**
  - A pack opening is one event. It shows the pack, the chosen card or cards, the payment, and whether the pack was cancelled and refunded.
  - The log queries now leave out drawn and pack holdings and payment entries at the query level, so paging stays exact.
- **Hand screen.** It gets a "🎁 Pack Shop" link, as in the legacy app.
- **`docs/domain.md`.**
  - The data model gets `table/main` and the `pack` fields.
  - The Blessed decision moves from "Open questions for the DM" into the rules and the deliberate decisions.
  - The pack table is updated.

Out of scope:
- **card-images.** Cardbacks, pack art, Cardmaker mascots and speech bubbles, and the "shocked" Cardmaker when a Blessed card is revealed.
- **Server-side randomness.** As with draws, the client picks the cards and the rules check everything else.
- **Changing the DM's random draw.** It stays free and is unaffected by the new payment choice.
- **Undo.** A wrong choice is corrected with the opposite actions: the DM discards the card and gives the payment back by hand.
- **Table rules the app does not track.** For example, one Blessed card per player.

## Capabilities

### New Capabilities
- `pack-shop`: the Pack Shop screen, the pack types with their thresholds, prices and contents, opening and paying, the one open pack that the whole table waits for and watches live, turning cards over, choosing, the mandatory Cursed card, the DM's cancel with refund, and the pack records.

### Modified Capabilities
- `card-holdings`: holdings can also be received from a pack (`pack`, naming the pack opening). A player can open a holding for themselves through a draw or a pack.
- `balances`:
  - A player's own LP also drops when they pay for their own pack.
  - The DM can charge a player's LP or the party's GP for a pack, and a cancel refunds it.
  - Pack payments and refunds have no written reason, and the ledger records the source "pack".
- `card-draws`: the "never changed" rule now covers random and Cursed draws only. A pack opening changes while it is open (pack-shop).
- `activity-log`:
  - The list includes pack openings.
  - A pack opening is one event.
  - The player filter includes packs opened into that player's hand.

## Impact

- **New code:**
  - `src/features/table/`: the lock document's schema, api, provider and hook, and the "a pack is open" error.
  - `src/features/packs/`: the pack definitions, thresholds and contents, the open, flip, choose and cancel transactions, the Pack Shop page, the dialog that confirms an opening and its payment, and the live open-pack view with its banner.
- **Changed code:**
  - `draws/schema.ts`: becomes a union with the pack opening.
  - `hands`: the `pack` way of giving, the lock in its errors, and the controls that are disabled while a pack is open.
  - `balances`: the `pack` source, the lock in its errors, and the disabled controls.
  - `draws`: the lock in its errors, and the disabled buttons.
  - `activity-log`: the queries, events, text, and rows.
  - Other files: `app/App.tsx` (providers), `app/layout/AppShell.tsx` (the open pack on every screen), `app/routes.tsx`, and the `shops` placeholder, which is removed.
- **Rules:** in `firestore.rules`,
  - a new `table/main` block
  - pack create and update rules on `draws`
  - the `pack` way of giving on `userCards`
  - the `pack` source on `ledger`
  - a player's own pack payment on `users`
  - the lock check on every card movement, draw, and balance change

  `tests/firestore.rules.emulator.test.ts` gets matching tests.
- **Indexes:** `firestore.indexes.json` gets the indexes for the log's new query filters on the way of giving and the ledger source, and drops the ones those queries no longer use.
- **Tests:** test providers and fixtures for the lock and the packs, and `renderApp` options.
- **Docs:** `docs/domain.md` (data model, pack rules, deliberate decisions, open questions) and `docs/conventions.md` (layout, providers).
- **Dependencies:** none new.
