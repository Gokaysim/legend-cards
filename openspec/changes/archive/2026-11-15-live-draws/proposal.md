# Proposal

## Why

The TODO list asks that everyone sees a normal card draw. Today, only the person who draws sees the moment:

- They see the cards face down, and they turn them over themselves.
- The rest of the table finds the card later, in the hand or in the İşlem Logu.

A pack opening already shows on every device and turns its cards over everywhere, and the table enjoys it. Single draws should share the same moment.

The pack view and the draw dialog also look unrelated:

- The draw dialog has a table with a deck and a fan of cards.
- The pack view has a plain grid with different titles and payment text, and a banner with an emoji.

On 2026-11-15 the owner settled these points in an explore session:

- **Scope.** Both 🎲 Kart Çek and ☠ Cursed Kart Çek are watched live, including the DM's draws into a player's hand.
- **Watching.** Cards start face down and turn over on every device. The table does not wait: a draw locks nothing, and the DM's filters are not listed on the watching devices.
- **Lifecycle.** A session is one opening of the draw dialog:
  - It starts with the first draw and ends when the dialog closes.
  - Cards still face down at the end turn over on every device.
  - A session with no activity for 10 minutes counts as ended, and the DM can end one from its banner.
- **The look.** Out of three directions on a design canvas (https://claude.ai/artifact/ECHuoTfEKXgpA6Jjf9LG4Y), the owner chose **V1 · Masa**. The draw dialog, the watching view and the open pack view share one table, and they bring the pack view and the draw dialog in line.

## What Changes

**Draw sessions**
- A draw session is stored for each opening of the draw dialog that draws at least one card.
- It is created together with the session's first draw. Each later draw in the same dialog joins it in the same step as the draw.
- A session keeps:
  - its kind (random or Cursed)
  - the hand's owner and who draws
  - its drawn cards, in order
  - which of them are turned over
  - when it last changed
  - when it ended, and who ended it
- Every draw record names its session. Draw records stay unchangeable.

**Everyone watches a draw**
- When a session starts, every signed-in user other than the drawer sees it on whatever screen they are on, live.
- Each device shows the newest open session. Other open sessions show as banners.
- The view shows:
  - whose hand the cards go to, and who draws when it is not the hand's owner
  - the kind and the payment
  - the deck with the number of cards in its pool
  - the drawn cards in order, face down until turned
- It names no DM filters. A card's back still follows the deck's-back rule, so a set filter's cardback can show, as the İşlem Logu already names the filters.

**Turning over, on every device**
- The hand's owner and the DM turn the cards over, in the draw dialog or in the watching view.
- A turned card turns over on every device and stays face up for good, also in the draw dialog.
- Other players only watch, and the server denies their turns.

**Ending**
- Closing the draw dialog ends the session. The cards still face down then turn over on every device.
- An expanded watching view keeps showing how the session ended until it is closed.
- A session with no change for 10 minutes counts as ended on every device, without a write.
- The DM can end any open session from its banner or its view.

**V1 · Masa, shared by draws and packs**
- **One table.** The draw dialog, the watching view and the open pack view share the same table: the source on the left (the deck, or the opened pack with its card count), the cards in a fan on the right.
- **One header.** All three use the same chips: the kind or the pack, whose hand, the payment, and "Masa bekliyor" while a pack is open. They also use the same green "Canlı" mark.
- **One title style.** Watching titles read "Ayla kart çekiyor" and "Ayla Pack açıyor".
- **One banner.** The shrunk draw view and the shrunk pack view share a banner component. It shows the live mark, thumbnails of the cards (face up when turned), and a "Göster" control. The pack's 🎴 emoji goes.
- **Cursed table.** A Cursed session's table takes a red tint.
- **The drawer's note.** The drawer's dialog says that the others watch live, and that a turned card turns over for them too.

## Capabilities

### New Capabilities
- `live-draws`: draw sessions watched live on every device. It covers what starts and ends a session, what the watching view and its banner show, turning cards over everywhere, stale sessions, the DM's end, several sessions at once, and the session records and their rules.

### Modified Capabilities
- `card-draws`: a drawn card turns over on every device and stays turned, for the hand's owner and the DM. Draw records name their session, and a draw is accepted only together with its session. The draw table gets the shared chips and the live note.
- `pack-shop`: the open pack view moves onto the shared table, with the shared chips and title. Its banner becomes the shared banner with card thumbnails.
- `visual-effects`: the draw spread also lays out the watching view and the open pack's cards. A Cursed session's table is tinted red.

## Impact

- **Data.** A new `drawSessions/{sessionId}` collection. Random and Cursed draw records get a `sessionId` field.
- **Rules and indexes.**
  - `firestore.rules` gets new rules for `drawSessions`: create with the first draw, add a draw, turn a card, end.
  - The draw rules change to require the session.
  - `tests/firestore.rules.emulator.test.ts` covers every allowed and denied case.
  - The watching devices' query orders sessions by start time, a single-field order, so no composite index is added.
- **Code.**
  - `src/features/draws/`: the session schema, its api, a subscription to recent sessions in `DrawsProvider`, and the shared table pieces (table, chips, banner). The draw dialog moves its turned state to the session.
  - A watching view, mounted once in the app shell next to `OpenPackView`.
  - `src/features/packs/OpenPackView.tsx` and `OpenPackBanner.tsx` move onto the shared pieces.
  - `src/test/` gets a test provider for the sessions.
- **Unchanged.** The İşlem Logu and the statistics pages keep reading the draws as today, and a session adds no event. Packs keep their opening animation, lock and steps.
- **Docs.** `docs/domain.md` gets the draw session, and `docs/conventions.md` the sessions in the Draws provider entry.
