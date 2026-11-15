# Design

## Context

See proposal.md for the motivation, and the delta specs for the behavior. This design covers how sessions are stored, kept in agreement with the draws, and shown on every device, and how the pack view moves onto the shared table.

What exists today:

- **Draws.** `drawCard` (`src/features/draws/api.ts`) runs one transaction per card. It writes the draw record, the holding, the card's holder and, when paid, the ledger entry and the LP. Draw records are never changed (`allow update` only for packs and drafts).
- **The dialog's turned state.** `DrawDialog` keeps the drawn cards and their turned state in React state. `FaceDownCard` already has a controlled mode (`isRevealed`, `onReveal`), which the pack view uses.
- **The pack view.** `OpenPackView`, mounted once in `AppShell`, shows the pack that `PacksProvider` subscribes to. It keeps the ended pack until it is closed, and shrinks to `OpenPackBanner`.
- **Providers.** `DrawsProvider` subscribes to nothing today.
- **The design.** It is V1 · Masa on https://claude.ai/artifact/ECHuoTfEKXgpA6Jjf9LG4Y.

## Goals / Non-Goals

**Goals:**
- A session record that no write, not even one crafted outside the app, can leave out of step with its draws.
- One subscription for the whole app that serves both the watching views and the drawer's dialog.
- The table, chips, live mark and banner are built once, and used by draws and packs.

**Non-Goals:**
- No presence: the dialog says "everyone sees it live", not who is watching right now.
- No change to the İşlem Logu, the statistics pages, the pack steps, the pack lock or the opening animation.
- No server-side clean-up of stale sessions: staleness is read, never written (spec: live-draws, "A stale session ends on its own").

## Decisions

### D1. A session is its own document

`drawSessions/{sessionId}`, with:

```
kind:      'random' | 'cursed'
uid:       the hand's owner
by:        who draws (the owner or the DM)
startedAt: server time of the first draw
lastAt:    server time of the last draw, turn or end
draws:     [{ drawId, cardId, backSet }]   in the order drawn; backSet = the DM's set filter's code, or null
turned:    [index, ...]                    positions in `draws`, each at most once
endedAt:   null | server time
endedBy:   null | uid
```

- **The back.** `backSet` keeps each card's back without exposing the filters: `CURSED_BACK` for a Cursed session, the set's back for a `backSet`, and the neutral back otherwise (spec: card-draws, "The deck's back").
- **No card details.** The card's details come from `useCardsById()`, as in the pack view.

Alternatives considered:

- *A `turned` field on the draw records.* This breaks "draw records never change" and needs a query per session.
- *The session in `table/main`.* The table document is the pack lock. Several sessions can be open at once, and they must not lock anything.

### D2. The session is written inside the draw's transaction

- **The id.** The dialog makes a session id (`doc(collection(db, 'drawSessions')).id`) when it first draws, and passes it to `drawCard` as `sessionId`.
- **The write.** `drawOnce` reads the session in its transaction, and in the same transaction either creates it or appends `{ drawId, cardId, backSet }` and sets `lastAt`. The draw record gets `sessionId`.
- **Replaced cards.** A taken-card retry re-runs the whole transaction, so the session never holds a draw that failed.
- **Errors.** `drawCard` throws `DrawError('session-ended')` when the session read in the transaction has ended. The dialog then starts a new session and draws again once, without asking. This can happen when the DM ended it from the banner.
- **A stale session.** Before each draw, the dialog checks whether its session counts as stale (D4). If it does, the dialog starts a new id (spec: "Drawing after a long pause").

The rules cross-check both sides, as the holding and ledger rules already do:

- **The draw's create rule** gains `sessionId` in `validDraw()`'s fields. It requires `joinsSession()`: after the request, the session exists, is not ended, and has the same `kind`, `uid` and `by`. Its last `draws` entry names this draw and its card, with `backSet` equal to `filters.setCode` (or `null`).
- **The session's create rule** requires:
  - exactly the fields above
  - `startedAt == lastAt == request.time`
  - a single entry in `draws`, with `turned` empty and `endedAt` and `endedBy` null
  - `by == request.auth.uid`
  - `createdNow(drawPath(draws[0].drawId))` and that draw's `sessionId` equal to this session
- **The session's "add a draw" update** requires:
  - only `draws` and `lastAt` change
  - the list grows by exactly one, and its prefix equals the old list (`draws[0:n] == resource.data.draws`)
  - the session is not ended
  - `request.auth.uid == resource.data.by`
  - the new entry's draw is created now and names this session
- **Table and permissions.** The draw's existing checks (`tableFree`, payment, owner) stay as they are. The session rules need no `tableFree`.

### D3. Turning and ending are plain updates

Neither step needs to read the server state first, so both are plain `updateDoc` calls, not transactions:

- **Turn:** `turned: arrayUnion(index)`, `lastAt: serverTimestamp()`.
- **End:** `endedAt: serverTimestamp()`, `endedBy: uid`, `lastAt: serverTimestamp()`.

The rules accept:

- **A turn by the owner or the DM** when only `turned` and `lastAt` change, the list grows by exactly one, the new index is under `draws.size()`, the session is not ended, and `lastAt == request.time`.
- **An end by the owner or the DM** when only `endedAt`, `endedBy` and `lastAt` change, `endedAt == lastAt == request.time`, `endedBy == request.auth.uid`, and the session was not ended.
- **No deletes.**

Neither step checks the table, so both work while a pack is open (spec: "Cards turn over on every device").

Because these are plain updates, the local snapshot shows a turn at once (a pending write), and the flip starts with no round trip. An offline turn is queued.

**Closing the dialog during a draw.** The dialog keeps the promise of a draw in flight. On close, it ends the session only after that promise settles, so an end can never land between the session's read and the draw's commit. Closing without a session writes nothing.

### D4. Staleness is computed, never written

- **The helper.** `sessionState(session, now)` in `draws/sessions.ts` gives `'open'` or `'ended'`. A session is ended when `endedAt` is set, or when `lastAt` is more than 10 minutes before `now`.
- **The tick.** The watching view and the dialog re-evaluate it every 30 seconds.
- **Pending times.** A pending `lastAt` (`null` in the local snapshot) counts as now.
- **Clock skew.** The device's clock compares against a server time. A few minutes of skew only moves when a stale session closes, so it is accepted (see Risks).

### D5. One subscription for recent sessions

- **The query.** `DrawsProvider` subscribes, while signed in, to `drawSessions` ordered by `startedAt` descending, limited to 20 (`recentSessionsQuery`). A single-field order needs no composite index.
- **The hook.** It exposes `useDrawSessions()`. Ended sessions stay in the list, which lets an expanded view show how a session ended (as `PacksProvider` keeps the ended pack).
- **The drawer's dialog** finds its own session in the same list by id, and reads `turned` from it. Before the first snapshot arrives, the local pending write stands in.
- **The actions.** `useDrawActions()` gains `turnDrawCard(sessionId, index)` and `endDrawSession(sessionId, by)`.

### D6. The watching view decides per device

`LiveDrawView` is mounted once in `AppShell`, next to `OpenPackView`. It keeps per-device state:

- **Seen:** the session ids this device has seen.
- **Expanded:** the id of the one shown expanded, or null.
- **Closed:** the ids the user closed after they ended.

Its rules, over `useDrawSessions()` without the ones where `by` is the user:

- **A new session.** An open session this device has not seen becomes the expanded one, and the previous expanded one turns into its banner (spec: "Several sessions at once"). This includes the open sessions found on the first snapshot after a reload.
- **Banners.** Every other open session shows as its banner, newest first, above the page content, where `OpenPackBanner` shows today.
- **The end of a session.** When an expanded session ends, it stays until it is closed. When a shrunk one ends, its banner goes away.
- **The DM's end.** The DM gets "Bitir" on the expanded view and on each banner, which calls `endDrawSession`.

### D7. Shared table pieces live in the draws feature

New components in `src/features/draws/table/`:

- **`DrawTable`:** the tinted surface. It takes a `source` slot (the deck or the pack) and a `children` slot (the spread), and a `tone` of `'neutral'` or `'cursed'`.
- **`TableChips` and `TableChip`:** one chip, with variants for gold (LP), live (green) and waiting (gold line).
- **`LiveMark`:** the green dot.
- **`LiveBanner`:** the shared banner, with a text, small pictures of the cards and a "Göster" control, plus optional actions (the DM's "Bitir").
- **`DrawSpread`:** the fan, moved out of `DrawDialog`.

Packs already import `FaceDownCard` from the draws feature, so these join it as the draws feature's public table pieces. `components/ui/` is not an option, because the pieces need the art hooks (`useArt`), and a component there must not import a feature.

`DrawDialog`, the new `LiveDrawDialog` (the watching view) and `PackDialog` all render on `DrawTable`. `OpenPackBanner` is replaced by `LiveBanner`.

### D8. The pack view keeps its steps

- **What changes.** `PackDialog` moves to the table and gets the new title "<owner> Pack açıyor" and the shared chips: the pack, the hand, the payment, live and "Masa bekliyor".
- **The source.** The pack's picture (`burstArtUrl`) stands on the left with the card count. Without a picture, it uses the CSS back of its spread.
- **What stays.** Its cards, the "Seç" buttons, the Zorunlu badge, the burst and the DM's cancel are unchanged.
- **After the end.** The live mark and "Masa bekliyor" go, and `PackResult` stays in view.

### D9. Styling with the existing tokens

- **The live mark** is `bg-green` with a pulse: a new `--animate-live-pulse` in `theme.css` that grows and fades a ring in `green`, with `motion-reduce:animate-none`.
- **The live chip** uses `text-green`, which already passes 4.5:1 on `pane`, with `border-green/40`.
- **The Cursed table** uses the existing `stat-cursed-deep` as the inner color of the table's radial gradient, in place of `pane-raised`.

No new color tokens are needed, so `theme.test.ts` gets no new pairs.

## Risks / Trade-offs

- **[Rules access limit]** A paid draw's transaction already reads several documents in its rules: the table, card, holding, ledger, profile and user. The session adds one document, read before and after. → Each new check reads only the session and the draw it names, both of which the request already touches. Emulator tests run the full paid DM and player draws, so a limit hit fails in CI, not in play.
- **[Clock skew]** Staleness compares the device clock with `lastAt`. → 10 minutes leaves room for skew. A wrong clock only changes when a forgotten session closes, never a draw or a payment.
- **[20 recent sessions]** A dialog whose session drops out of the newest 20 stops seeing its turns arrive. → This needs 20 newer sessions while one dialog stays open, which a single table does not reach. The dialog falls back to its own local state.
- **[Distraction]** Every draw opens a view on every other screen. → Any user can shrink it to a banner. V3's corner window stays on the canvas in case the table finds this too much.
- **[Older clients]** After the rules deploy, a client without `sessionId` can no longer draw. → The app and the rules are deployed together, and the group runs one version.

## Migration Plan

- **Data.** No migration. Old draw records read with `sessionId: null`, through a zod default, and the İşlem Logu and statistics ignore the field.
- **Deploy.** The rules and the hosting deploy go out together.
- **Rollback.** Redeploy the previous rules and hosting. Session documents left behind are harmless, because nothing reads them.
