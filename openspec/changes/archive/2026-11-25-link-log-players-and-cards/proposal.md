# Proposal

## Why

The İşlem Logu names players and cards in plain text. To see a player's hand or the history of a card that an event names, a user has to leave the log and find it through the menu. The pages already exist (a player's hand at `/hands/:uid`, a card's Kart geçmişi at `/library/:cardId`), and every log record already carries the uid and the card ID, so the log can lead straight to them.

## What Changes

- In each event row, a player's name, the name of the user who did it and every player named in the sentence, becomes a link to that player's hand. The link covers the name only; the Turkish suffix stays outside it (`[Ayla]'nın elinden`).
- A card's name in an event row, the "Sunulan:" list of a pack included, becomes a link to that card's Kart geçmişi, but only when the viewer may open that page (the card-stats rule: the DM every card; a player a listed active card, a card someone holds, or a Custom Card).
- No link for what names no player or no openable card: "Import", "Grup kesesi", "DM" in "DM iptal etti", "İsimsiz oyuncu" (a uid without a profile), True Words (they have no Kart geçmişi), and cards the viewer may not open. These read as they do today.
- Links look like the Kütüphane table's card links: same colour at rest, gold and underlined on hover, with a visible focus.
- Out of scope: set names in set events, the "Sunulan:" words of a True Word draft, and the rows of the Kart geçmişi page itself.

No data, rules or Firestore paths change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `activity-log`: a new requirement for links to players and cards in the event rows.

## Impact

- `src/features/activity-log/eventText.ts`: sentence parts carry the uid of a named player and the ID of a named card; player names and their suffixes become separate parts. `sentenceText` keeps returning the same plain text.
- `src/features/activity-log/LogEventRow.tsx`: renders those parts as links, with the visibility check.
- `src/features/stats/CardHistoryPage.tsx`: its `isOpenTo` rule moves to a shared place so the log and the page agree.
- `src/lib/turkish.ts`: a way to get a name's suffix apart from the name.
- Tests: `eventText.test.ts`, `ActivityLogPage.test.tsx`.
