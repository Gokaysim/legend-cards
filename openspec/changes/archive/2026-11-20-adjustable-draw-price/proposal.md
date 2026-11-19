# Proposal

## Why

While the DM lends the players the draw tools ("Filtreli çekiş" or "Kart seçme"), the price of a draw is fixed: a
player always pays 1 LP and the DM always draws for free. The owner wants the price to follow the table's ruling of
the moment, such as a cheaper reward draw after a boss or a dearer pick of a set, without the DM having to fix LP by
hand afterwards. So while the mode is on, whoever draws (the player, or the DM) sets the price of each draw, starting
at 1 LP.

## What Changes

- While "Oyuncu kart çekişi" is "Filtreli çekiş" or "Kart seçme", the random draw dialog shows a price control,
  starting at 1 LP each time the dialog opens. It takes any whole number of LP from 0 to 1,000,000. 0 is a free draw.
- A player sets the price of their own draws. The only limits are that the price is a whole number from 0 up and
  that it fits their LP. As with the player's other self-service actions, every draw is logged with its price, and the
  DM corrects mistakes by hand.
- The DM sees the same control when drawing into any hand, also starting at 1 LP. The price is paid from the hand
  owner's LP, the DM's own when it is the DM's hand. 0 keeps the DM's draw free.
- Under "Kapalı" nothing changes: a player's draw costs 1 LP, the DM's draw is free, and no price control is shown.
  A Cursed draw stays free in every mode.
- Each draw stores the price actually paid. The draw control, the "not enough LP" note and its error message name
  that price.
- **BREAKING (stored data shape)**: a draw's `cost` is any whole number from 0 to 1,000,000 instead of only 0 or 1,
  and each card of a draw session also stores its price (`cost`). Older records still read as before: an older
  session card without a price is read from the old rule (1 LP for a player's own random draw, free otherwise).
- The server accepts a player's random draw at a price other than 1 LP, a free one included, only while the stored
  mode is on. It accepts the DM's draws paid from the hand owner's LP at any price. A ledger entry for a draw takes
  exactly the draw's price from its hand owner. When a player's draw at another price is denied because the DM closed
  the mode meanwhile, the dialog says that the mode changed, and the price goes back to 1 LP.
- The watching view shows the session's payment as the sum of its cards' prices ("−3 LP" or "Ücretsiz") instead of
  "Her kart −1 LP".
- The İşlem Logu already shows each draw's paid amount. Its wording now allows any amount, a DM's paid draw
  included.
- The mode lines on the banner and the Ayarlar screen say that the price can be changed (1 LP by default).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-draws`: the price of a random draw becomes settable while the player draw mode is on, for the player and the
  DM, with 1 LP as the default. The DM can charge the hand owner's LP. Draw records, the payment checks, the LP note,
  the draw table and the mode-change handling follow the price.
- `live-draws`: the watching view shows the session's total payment instead of a fixed per-card price. Each session
  card records its price.
- `balances`: the draw payment is no longer fixed at 1 LP. The DM's draw payment from a user's LP joins the
  exceptions.
- `activity-log`: a draw event names its payment as the amount paid, not only 1 LP.
- `table-settings`: the banner's and the Ayarlar screen's lines for "Filtreli çekiş" and "Kart seçme" mention the
  price.

## Impact

- `firestore.rules`: the draw create rule (`paidByPlayer`, a new DM-paid branch, the mode read shared with
  `playerFiltersAllowed`), the ledger's `paysForDraw`, the profile's `lpSetByEntry('draw')` branch (the DM too), and
  the session entry check (`validSessionDraw`, `joinsSession`) for the new `cost` field. All of these stay within the
  rules' 1000-expression limit.
- `src/features/draws/`: `schema.ts` (draw cost range, session entry `cost`), `api.ts` (`drawCard` takes a price
  instead of `paid`, the mode-changed check covers the price), `DrawDialog.tsx` (the price control, the chips, the
  control's label, the LP note), `errors.ts` (the insufficient message names the price), `LiveDrawDialog.tsx` and
  `sessionText.ts` (the session's total payment).
- `src/features/table/playerDraw.ts`: the mode lines.
- `src/features/activity-log/eventText.ts`: only its doc comment. It already uses the stored cost.
- Tests: unit tests of the dialog, schema and log text. Emulator rules tests for the price under each mode, the DM's
  paid draw, the ledger amount and the session entry.
- `docs/domain.md`: the `draws` and `drawSessions` data rows, the "Oyuncu kart çekişi" glossary entry and the
  decision entry about lending the draw tools.
