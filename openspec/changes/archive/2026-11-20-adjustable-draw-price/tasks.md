# Tasks

## 1. The price rule and the stored shape

- [x] 1.1 Add `drawPrice({ kind, byDm, playerMode, chosen })` to `src/features/table/playerDraw.ts` (design D1). It returns 0 for a Cursed draw; under `off`, 1 for a player and 0 for the DM; otherwise `chosen`. Add `DRAW_COST_MAX = 1_000_000`. Verify in `playerDraw.test.ts` each mode × player/DM × random/Cursed, and that `chosen` 0 and 3 pass through while the mode is on.
- [x] 1.2 In `src/features/draws/schema.ts`, change a card draw's `cost` to a whole number from 0 to `DRAW_COST_MAX`. Keep the refine `paidWith === 'lp'` ⇔ `cost > 0` ⇔ `entryId !== null` (design D2). Add an optional `cost` to a session card, reading a missing one as `null` (design D4). Verify in `schema.test.ts`:
  - a draw with `cost: 3` and an entry reads
  - `cost: 3` without an entry, `cost: 0` with `paidWith: 'lp'`, `1.5`, `-1` and `1_000_001` are rejected
  - a session card without `cost` reads as `null`, and one with `cost: 2` reads as 2

## 2. Rules

- [x] 2.1 In `firestore.rules`, change the `draws` create rule as design D3 describes:
  - a `playerDrawMode()` helper, shared by `playerFiltersAllowed`
  - `validPayment()`
  - `drawnByPlayer()` in place of `paidByPlayer()`, so that a price other than 1, free included, is accepted only while the mode is not `off`
  - the DM's paid branch `isDm() && kind == 'random' && validPayment()`

  Verify in `src/features/draws/api.emulator.test.ts` (or `tests/firestore.rules.emulator.test.ts`, wherever the draw rules tests live today) the card-draws scenarios of "The server checks the draw price" and "Draw, holding, card, and payment agree":
  - accepted: 2 LP under Filtreli çekiş, 0 LP under Kart seçme, the DM at 2 LP from Bora's LP
  - denied: 2 LP or free under Kapalı, a price/entry mismatch, the wrong account, 1,000,001 LP, 1.5 LP, a negative price, a DM paid draw without its entry
- [x] 2.2 Change the ledger's `paysForDraw()` to read the draw it names and take exactly `draw.cost` from `draw.uid`, made by that user or the DM. Change the profile's `draw` LP branch to `isSelf(uid) || isDm()` (design D3). Update the comments that say the draw payment is fixed at 1. Verify with emulator tests:
  - a player's entry that takes LP from another player is denied
  - the DM's draw entry on Bora's LP is accepted together with its draw
  - a lone draw entry without its draw is denied
  - the balances scenarios "The DM charges a draw" and "A player pays for another player's draw" pass
- [x] 2.3 Add `cost` to the fields of a new session card in `validSessionDraw`, and `entry.cost == data.cost` to the draw's `joinsSession()` (design D4). Verify with emulator tests:
  - a draw at 2 LP whose session card records 1 is denied
  - a new card without `cost` is denied
  - a session that already holds an older card without `cost` still takes a new card with `cost`
- [x] 2.4 Check the expression budget. Write an emulator test of the heaviest request: the DM's paid draw with every filter set, of a one-copy card, joining an existing session. Verify that it is accepted, with no evaluation-limit error.

## 3. API

- [x] 3.1 In `src/features/draws/api.ts`, replace `DrawCardInput.paid` with `price: number` and `byDm: boolean` (design D2). `drawOnce`:
  - charges `price` when it is above 0, from the hand owner's LP
  - stores `paidWith`, `cost` and `entryId` from the price
  - writes the ledger entry with `delta: -price`
  - writes the session card with `cost: price`

  `isModeChangedOnServer` checks a player's (`!byDm`) price as well as their filters. Carry the price in `DrawError('insufficient')` and in its `DrawFailure`. Update `useDrawActions`, and every caller and test helper that passes `paid`. Verify with `api.emulator.test.ts`:
  - a player's 3 LP draw leaves 3 LP less, with a matching draw, entry and session card
  - the DM's 2 LP draw into Bora's hand lowers Bora's LP
  - a price above the LP throws `insufficient`
  - a 3 LP player draw denied after the DM sets `off` throws `mode-changed` and charges nothing
- [x] 3.2 In `src/features/draws/errors.ts`, make the insufficient message name the price: "Kart çekmek için N LP gerekiyor; X'in Y LP'si var.". Verify in `errors.test.ts` and in the `DrawDialog.test.tsx` failure table that N = 1 keeps today's text and N = 3 shows 3.

## 4. The draw dialog

- [x] 4.1 In `DrawDialog.tsx`, add the price state (starting at 1) and the price control row "Fiyat" with "−", a number input, "+" and "LP", shown only for a random draw while the mode is on (design D5). Reset the price to 1 in the `seenMode` block, and to 1 on a `mode-changed` failure. Compute each draw's price with `drawPrice` and pass `price` and `byDm` to `drawCard`. An empty or invalid input disables the draw control. Verify in `DrawDialog.test.tsx` the card-draws scenarios:
  - "The default price"
  - "A player raises the price"
  - "A free draw by a player"
  - "Different prices in one dialog"
  - "The DM's default price"
  - "The DM draws for free"
  - "Reopening the dialog"
  - "Kapalı"
  - "A Cursed draw"
  - "The price after the mode closes"
  - "The DM's price after the mode closes"
  - "A price that crosses the change"
- [x] 4.2 Update the chips, the draw control's label and the short note:
  - the owner's LP chip whenever the dialog is paid or priced
  - "Her kart N LP" or "Ücretsiz"
  - "🎲 Çek · N LP" or "🎲 Çek"
  - "Kart çekmek için N LP gerekiyor." when the owner's LP is below a price above 0

  Verify in `DrawDialog.test.tsx` the card-draws scenarios "A player's table", "A priced table", "A free priced table", "No LP left", "A price above the LP" and "The DM's price above the owner's LP".
- [x] 4.3 Check the dialog at 360 CSS pixels in the dev app, as player and as DM, with the mode on, the price control and the filters on. Verify that the control's buttons stay in view and that `scrollWidth` equals `clientWidth`.

## 5. Watching view, log and mode lines

- [x] 5.1 Add `sessionPayment(session, profileOf)` to `src/features/draws/sessionText.ts` (design D4). It sums the session cards' prices, and a `null` price falls back to the old `isPaidSession` rule. `LiveDrawDialog.tsx` shows "−N LP" or "Ücretsiz" instead of "Her kart −1 LP". Verify:
  - in `sessions.test.ts` or a new `sessionText.test.ts`: the sum, an all-free session, and an older session without prices (2 cards by a player → 2)
  - in `LiveDrawDialog.test.tsx`: the live-draws scenarios "A player's paid draw", "Prices set while the mode is on", "Free draws while the mode is on" and "An older session"
- [x] 5.2 Check in `eventText.test.ts` that the DM's paid draw into Bora's hand shows "−2 LP", a player's 3 LP draw shows "−3 LP", and a 0 LP draw shows no payment (activity-log "A draw is one event"). Update the doc comment of the draw text. Check in the card history tests that a 3 LP draw shows 3 LP. No other code change is expected.
- [x] 5.3 Add the price sentence "Bir çekiş 1 LP; çeken kişi fiyatı değiştirebilir." to `PLAYER_DRAW_LINES.filtered` and `.pick` in `src/features/table/playerDraw.ts` (design D6). Verify with `PlayerDrawBanner.test.tsx` and `SettingsPage.test.tsx` (the table-settings scenarios "A player sees the banner" and "The price on the Ayarlar screen") and with the banner's 360 px wrap.

## 6. Docs

- [x] 6.1 Update `docs/domain.md`:
  - the `draws` row: the payment's `cost` is any whole amount from 0 up; a player's draw is priced while the mode is on; the DM's draw can be paid from the hand owner's LP
  - the `drawSessions` row: each card's `cost`, and what an older card without it means
  - the "Oyuncu kart çekişi" glossary entry: the price control, 1 LP by default
  - the deliberate-decision entry on lending the draw tools: on 2026-11-19 the owner asked that whoever draws (the player, or the DM) can change the price while the mode is on, 1 LP by default, 0 allowed, logged

  Verify by reading the changed passages against the card-draws and live-draws delta specs.
- [x] 6.2 Update the comments that describe the fixed price: the `DrawDialog` doc comment, `isPaidSession`, the `firestore.rules` comments next to `paidByPlayer`, `paysForDraw` and the profile's LP rule, and `DRAW_PRICE`. Verify that `grep -rn "1 LP" src firestore.rules` finds no comment that still says every draw costs 1 LP.

## 7. Integration

- [x] 7.1 Run `npm run check` and `npm run test:emulator` (after `. ~/.nvm/nvm.sh && nvm use`). Both pass.
- [x] 7.2 In the dev app with two browser profiles (the DM and Oyuncu 1), walk this flow and confirm each step live on the other screen:
  - the DM sets "Filtreli çekiş", and the banner mentions the price
  - the player draws once at 1 LP and once at 3 LP, and the DM's watching view shows "−4 LP"
  - the player draws at 0 LP, and their LP does not change
  - the DM draws into the player's hand at the default 1 LP, and the player's LP drops by 1
  - the DM sets "Kapalı" while the player's dialog shows 3, and the price control goes away and the control reads "🎲 Çek · 1 LP"
  - the İşlem Logu shows each draw with its amount
- [x] 7.3 Stop every process on the project's ports as `CLAUDE.md` describes: SIGINT to the dev server and the emulators, wait for the export, then confirm with `lsof -nP -iTCP -sTCP:LISTEN`.

## Notes from verification (2026-11-19)

- 7.1: `npm run check` passes (3,058 unit tests). `npm run test:emulator` passes (1,339 tests, 29 files).
- 7.2: walked on a throwaway copy of the dev data (emulators with `--import` and no export), the DM on `http://localhost:5173` and Oyuncu 1 on `http://[::1]:5173`:
  - "Filtreli çekiş" showed the banner live for the player, with the price sentence.
  - The player drew at 1 LP (30 → 29), at 3 LP (29 → 26) and at 0 LP (stayed 26). The DM's watching view showed "−4 LP".
  - In a fresh run, the DM's dialog for Oyuncu 1 showed "Bakiye: 30 LP", "Her kart 1 LP" and the price 1. The DM's draw lowered Oyuncu 1's LP to 29, live in the player's open dialog, which still showed the price 3.
  - The DM selected "Kapat" on the banner. The player's price control went away, and the control read "🎲 Çek · 1 LP".
  - The İşlem Logu listed the mode changes, "DM Oyuncu 1'a … kartını çekti (−1 LP)." and "… kartını çekti (−3 LP; filtre: Rare)."
  - One wording change beyond the specs: the mode-changed message now reads "DM oyuncu kart çekişini değiştirdi; filtreler ve fiyat sıfırlandı.", since the price resets too.
- 4.3, 5.3: checked under "Kart seçme" in a fixed 360 px iframe.
  - The player's dialog had the Rarity filter on and the price 3. The price row fit with its buttons at 75–111 and 203–239 px inside the 328 px dialog, and `scrollWidth` was 360, equal to `clientWidth`, also after a 3 LP draw.
  - The DM's dialog with a set filter on also gave `scrollWidth` 360.
  - The banner wrapped onto several lines (98 px high) without widening the page.
- Lint: `formatAmount(price)` with a nullable `price` in the JSX made the React Compiler report the existing `Date.now()` in `sessionForDraw` as impure during render. The fix computes the shown price once (`shownPrice`).

## Workflow follow-up

- Archive the change with `/opsx:archive` after review, then commit (feat + docs archive) as usual. Push only on request.
