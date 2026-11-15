# Tasks

## 1. The session record and its rules

- [x] 1.1 Add the session schema to `src/features/draws/schema.ts` (design D1): `drawSessionSchema` with `kind`, `uid`, `by`, `startedAt`, `lastAt`, `draws` (`{ drawId, cardId, backSet }`), `turned`, `endedAt` and `endedBy`, and its converter. Add `sessionId` to `cardDrawSchema`, with a default of `null` for older records. Extend `schema.test.ts`:
  - a valid session parses
  - a turned index outside `draws` fails
  - an older draw record without `sessionId` reads `null`

  Verify: the tests pass.
- [x] 1.2 Add `sessionState(session, now)` and `sessionBack(session, index)` to a new `src/features/draws/sessions.ts` (design D4, D1). Add `sessions.test.ts`, which covers:
  - an ended session
  - a session idle for 10 minutes and one idle for 9
  - a pending `lastAt` counted as now
  - the Cursed back, a set back and the neutral back

  Verify: the tests pass.
- [x] 1.3 In `firestore.rules`, add the `drawSessions/{sessionId}` match block (design D2, D3): read when signed in; create with its first draw; add a draw; turn; end; never delete. Add `sessionId` to `validDraw()` and require `joinsSession()` on random and Cursed draws. Verify: `firebase emulators:exec` loads the rules without errors.
- [x] 1.4 Add a `drawSessions` block to `tests/firestore.rules.emulator.test.ts`, and update the existing draw tests to write their session. Cover every scenario of the `live-draws` delta's "Session records" and "Session steps agree", and the `card-draws` delta's "A draw without its session". Include:
  - a player's paid draw and the DM's filtered draw, each creating and then joining a session
  - another drawer's draw into a session
  - a draw into an ended session
  - a session without its draw, and a draw whose session does not take it
  - a mismatched `backSet`
  - turns by the owner and by the DM, by another player, of a missing index, and twice
  - a turn and an end while a pack is open (allowed)
  - ends by the owner and by the DM, by another player, and twice
  - a delete, and a signed-out read

  Verify: `npm run test:emulator` passes.

## 2. Session steps in the api

- [x] 2.1 Extend `drawCard` in `src/features/draws/api.ts` with `sessionId` and `backSet`. In its transaction, read the session, create it or append the draw, and set `lastAt`. Throw `DrawError('session-ended')` for an ended session (design D2). Add `turnDrawCard` and `endDrawSession` as plain updates (design D3), and `recentSessionsQuery` (design D5). Give `session-ended` a Turkish message in `errors.ts`, and test it in `errors.test.ts`. Extend `api.emulator.test.ts`:
  - three draws in one session
  - a retried taken card leaves one entry
  - a draw into an ended session throws `session-ended`
  - a turn and an end

  Verify: `npm run test:emulator` passes.
- [x] 2.2 Subscribe to `recentSessionsQuery` in `DrawsProvider` while signed in. Expose `useDrawSessions()` from `drawsContext.ts`, and add `turnDrawCard` and `endDrawSession` to `DrawActions` (design D5). Extend `TestDrawsProvider` and `renderApp`'s `draws` option with `sessions` and a setter, and add session fixtures to `src/test/drawFixtures.ts`. Verify: `npm run check` passes.
- [x] 2.3 Document the sessions in `docs/domain.md` (the glossary and the `drawSessions/{sessionId}` data row, plus `sessionId` on the `draws` row) and in `docs/conventions.md` (the Draws entry: the subscription, `useDrawSessions`, the steps, and staleness). Verify: both docs name `drawSessions`, `useDrawSessions` and the 10-minute rule.

## 3. The shared table pieces

- [x] 3.1 Add `--animate-live-pulse` to `src/styles/theme.css` (design D9). Create `src/features/draws/table/` with `DrawTable` (a neutral and a Cursed tone), `TableChip`, `LiveMark` and `DrawSpread`, which moves the fan out of `DrawDialog` (design D7). Add tests for:
  - the Cursed tone
  - `LiveMark` without its pulse under reduced motion
  - the spread's straight cards under reduced motion

  Verify: the tests pass.
- [x] 3.2 Create `LiveBanner` in `src/features/draws/table/`, with the live mark, a text, small card pictures (the face when turned, the spread's back otherwise), "Göster" and optional actions (design D7). Add `LiveBanner.test.tsx` for the `pack-shop` delta's "A shrunk pack" and the `live-draws` delta's "Shrinking" pictures, and check that a face-down card's picture never gives its card away. Verify: the tests pass.

## 4. The drawer's dialog

- [x] 4.1 Move `DrawDialog` onto `DrawTable` with the chips and the live line (the `card-draws` delta's "The draw table"). Give it a session id: made on the first draw, and made again when its session counts as stale or the draw reports `session-ended` (design D2). Pass `backSet` from the set filter. Verify: the dialog tests below pass.
- [x] 4.2 Drive each card's turned state from the session (`useDrawSessions()`), with `FaceDownCard`'s controlled mode and `turnDrawCard`. On close, end the session after any draw in flight settles (design D3). Write nothing when no card was drawn. Extend `DrawDialog.test.tsx`:
  - "A player's table"
  - "The live line"
  - turning calls `turnDrawCard` with the card's position
  - closing ends the session once, and only after a pending draw
  - closing without a draw ends nothing
  - a stale session gets a new id on the next draw

  Verify: the tests pass.

## 5. The watching view

- [x] 5.1 Create `LiveDrawDialog` in `src/features/draws/`: the title ("Ayla kart çekiyor", or "DM, Bora'ya kart çekiyor"), the chips without filters, the deck with its unfiltered pool count, the session's cards with their backs, turning for the owner and the DM only, the DM's "Bitir", and the ended line (the `live-draws` delta's "What the watching view shows", "Who turns the cards" and "How a session ended stays in view"). Run the Blessed shock when a Blessed card turns while it is open. Add `LiveDrawDialog.test.tsx` for those scenarios. Verify: the tests pass.
- [x] 5.2 Create `LiveDrawView` (design D6) and mount it in `AppShell` next to `OpenPackView`. It hides the user's own sessions, expands the newest open session, turns the others into banners, keeps an ended expanded session until it is closed, drops an ended shrunk one, and re-evaluates staleness every 30 seconds. Add `LiveDrawView.test.tsx` with `setDraws` updates, covering the `live-draws` delta's:
  - "A player watches" and "The DM draws for a player"
  - "Two players draw" and "Back to the older session"
  - "A banner at the end" and "Only on one device"
  - "A closed tab", with fake timers

  Verify: the tests pass.

## 6. The pack view on the table

- [x] 6.1 Move `PackDialog` in `src/features/packs/OpenPackView.tsx` onto `DrawTable` and `DrawSpread` (design D8). Use the title "<owner> Pack açıyor", the chips (the pack, the hand, the payment, live and "Masa bekliyor"), and the pack picture with its card count as the source. Keep the burst, the "Seç" buttons, the Zorunlu badge, the cancel and `PackResult`. Update `OpenPackView.test.tsx` for the `pack-shop` delta's "Watching a set pack" and "After the pack ends", keeping its existing scenarios. Verify: the tests pass.
- [x] 6.2 Replace `OpenPackBanner` with `LiveBanner`, showing the pack's cards as small pictures, and delete `OpenPackBanner.tsx`. Verify: `OpenPackView.test.tsx`'s shrinking test passes against the new banner, and no file imports `OpenPackBanner`.

## 7. Integration checks

- [x] 7.1 Run `npm run check` and `npm run test:emulator`. Verify: both pass.
- [x] 7.2 In the app against the emulators, with the DM and Oyuncu 1 in two windows, check:
  - a paid draw shows live on the other window, with turns syncing both ways
  - a DM draw into a player's hand
  - a Cursed draw on the red table
  - closing reveals the face-down cards
  - a shrunk banner shows the cards as small pictures
  - an open pack on the new table and its banner
  - the draw dialog and the watching view at 360 CSS pixels wide, with no horizontal scrollbar

  Verify: every check holds, and the look matches V1 · Masa on the canvas.
- [x] 7.3 Stop every process on the project's ports, as CLAUDE.md describes, and confirm with `lsof -nP -iTCP -sTCP:LISTEN`. Verify: no listener remains on those ports.

## Workflow follow-up

- Archive the change with `/opsx:archive` once the owner has reviewed it.
