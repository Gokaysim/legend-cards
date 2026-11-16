# Design

## Context

See proposal.md for the motivation. The current state that shapes the approach:

- **Discarding.** `closeHolding` (`src/features/hands/api.ts`) closes a holding in one transaction and releases a normal card's `holder`, for any reason. The `userCards` rule allows the close as `discarded` only to the DM (`closesAs('discarded') && ... && isDm() && releasesCard() && tableFree()`), and for a True Word only together with the DM's take-back (`takenBack()`). The `cards` rule that clears the holder (`releasedByClosedHolding`) is not limited to the DM: it trusts the closed holding's reason. A player's use already goes through it.
- **The card details.** `HoldingDetails.tsx` shows cards only. True Words have their own `TrueWordDetails`. "Kullan" is a full-width primary button for `canUse` (the holder or the DM). "At" is the third of the equal buttons in the DM's `ToolSection`, and its confirmation (`discardStep`) renders inside that section.
- **LP by hand.** `changeBalance` (`src/features/balances/api.ts`) runs one transaction. It reads the balance, writes a `manual` ledger entry with the reason, and sets `lp` and `lpEntryId`. When another device changed the balance in between, it retries, and `explainDenial` turns a denial during an open pack into a "table busy" failure. The rules accept it through `lpSetByEntry('manual') && isDm()` on the profile and `manualByDm()` on the ledger, while the table is free. Nothing in this path is specific to the DM except those two `isDm()` checks.
- **The LP tile.** `HandSummary.tsx` shows "Legend Point" for a profile whose role is `player`, with "± LP" wrapped in `DmOnly`. "± LP" opens `BalanceDialog`: the amount, the reason, "+ Ekle" and "− Düş".
- **The log** reads the ledger's `manual` entries with `where('source', '==', 'manual')` and shows the actor from `entry.by`. A discarded holding's event takes its actor from `returnedBy`. Its sentence always says "<holder>'nın elinden <card> kartını attı.". A used card's sentence already leaves the holder out when the actor is the holder (`usedSentence`).

## Goals / Non-Goals

**Goals:**

- The server enforces exactly the owner's two limits: a player discards only their own cards, and a player only lowers their own LP. Everything else that holds today still holds: a closed holding never changes, LP never goes below 0, the table waits for an open pack, and a change by hand has a reason.
- No new data: no fields, collections, ledger sources or indexes.
- One "At" for everyone who may discard, in one place.

**Non-Goals:**

- Undoing a discard or a spend. The DM corrects mistakes with the tools they already have: "+ Kart ver" for the card, "± LP" with a reason for the LP.
- Checking table timing, such as a Cursed card's "not in the encounter it was drawn".
- Spending LP from the dice channel (`dice-card-rules`).

## Decisions

### D1. The holder's discard widens the existing branch

The `discarded` branch of the `userCards` update rule changes from `isDm()` to `(isDm() || (isHolder() && resource.data.cardKind != 'trueWord'))`. `closesAs('discarded')`, `usedOn == null`, `releasesCard()`, `tableFree()` and the True Word clause stay as they are.

- Excluding the True Word by its kind is clearer than relying on `takenBack()`. The `playerWords` rule happens to deny a player's take-back today, but this branch should not depend on that.
- The `cards` rule needs no change. `releasedByClosedHolding` already accepts a release by any user whose holding is closed as `discarded`.
- `closeHolding` needs no change either. It already writes `returnedBy: by`, and the rules check `returnedBy == request.auth.uid`.

*Alternative:* a separate `discardedByHolder` branch. Rejected: it would repeat the same five conditions for one difference in who may do it.

### D2. A player's spend is a `manual` change by the player

A player's own LP change is written exactly like the DM's: source `manual`, a reason, `drawId: null`, and `by` set to the player. Only the rules decide who may write which direction.

- **Ledger:** `manualByDm()` becomes `manualChange()`. The shared checks stay: the source, `drawId == null`, and a reason of 1 to 200 characters that is not only spaces. Then it requires either the DM, with `setsLp() || setsGp()`, or the player's own spend: `currency == 'lp'`, `account == request.auth.uid`, `delta < 0` and `setsLp()`. `validLedgerEntry()` already fixes `by == request.auth.uid` and bounds `delta` to ±1,000,000, and `setsLp()` keeps the balance at 0 or more.
- **Profile:** `lpSetByEntry('manual') && isDm()` becomes `lpSetByEntry('manual') && (isDm() || (isSelf(uid) && request.resource.data.lp < resource.data.get('lp', 0)))`. The ledger rule already forces the fall. The profile checks it too, so neither side relies on the other for the one limit the owner named.
- Both stay under `tableFree()`, as today.

*Alternative:* a new ledger source such as `spend`. That would mean a new `LEDGER_SOURCES` entry, a widened log query (`in ['manual', 'spend']`) with its index, and a new event kind, all to tell apart something `by` already tells apart. Rejected for now. If a later change needs to count spends separately, such as an advantage roll in `dice-card-rules`, that change can add its own source.

### D3. The client reuses `changeBalance`

The player's dialog calls `changeBalance({ account: { currency: 'lp', uid }, delta: -amount, reason, by: uid })` on their own account. That is the DM's code path, with its retry on a concurrent change and its "table busy" explanation (`explainDenial` reads the table, which every player may read). The failure messages already exist (`insufficient`, `table-busy`, `offline`, `invalid`, `permission-denied`).

### D4. One dialog with a spend variant

`BalanceDialog` gets a variant for the player's own spend instead of a sibling dialog, so the amount and reason fields, the limits, the offline check and the failure messages stay in one place. The spend variant:

- has the title "Legend Point harca"
- starts the amount at 1
- shows a "d20 avantajı" chip under the reason, which sets the reason to "d20 avantajı" and the amount to 1
- shows "Sonra: <LP − amount> LP" while the amount is a whole number from 1 to the balance
- shows only "− Düş"

The insufficient-balance message keeps its wording with the player's own name ("Ayla'nın 1 LP'si var; 2 LP düşülemez."). That matches the spec and avoids a second message.

`HandSummary` shows "− LP" beside the tile when the signed-in user is the profile's player, outside `DmOnly`. It is disabled at 0 LP, or while a pack is open, with the existing `TABLE_BUSY_NOTE` title. The DM's "± LP" stays as it is. The DM's own hand has no LP tile, so the two buttons never meet.

*Alternative:* a separate `SpendLpDialog`. Rejected: it would duplicate validation and error handling for a dialog that differs only in its buttons and one chip.

### D5. "At" joins the "Kullan" row; its confirmation replaces the row

In `HoldingDetails`, the idle action area becomes one row: "Kullan" (primary, flexible width) and "At" (danger, fixed width, with the bin icon). It shows when `canUse`, which is the holder or the DM, the same set that may discard. Selecting "At" swaps the row for `discardStep`, the way "Kullan" swaps to `useStep`. `discardStep` therefore moves out of the `ToolSection`. The DM's tool grid keeps two buttons ("Aktif et" when the card has a held effect, and "Başkasına ver"), so its columns become `grid-cols-2`, or one full-width button. While a pack is open, "At" is disabled with the same title as "Kullan".

At 360 CSS pixels the details are about 330 px wide, which leaves "Kullan" about 230 px beside an "At" of about 80 px. No horizontal scroll results.

### D6. The discard sentence leaves out the holder when the actor is the holder

`eventText` builds a discard as `usedSentence` builds a use: when `event.by === holding.uid`, the "<holder>'nın elinden " prefix is dropped, so the row reads "Ayla · Aboleth's Eyes kartını attı.". A DM discard keeps the prefix. A True Word take-back is a separate event kind (`wordTakenBack`) and does not change. The balance row does not change: it already names the account and the actor separately.

## Risks / Trade-offs

- [A player discards a card by mistake] → The confirmation step stays. The log shows it, and the DM gives the card back with "+ Kart ver". A normal card with one copy is back in the pool and free to give. Its note and active state are not restored, which is acceptable for a rare mistake.
- [A player discards a Cursed card instead of paying to use it] → Accepted by the owner: the table trusts its players. The log shows who discarded what, and the DM can give the card back.
- [A player spends LP by mistake, or twice] → The DM adds it back with "± LP" and a reason. Both entries stay in the log.
- [A player's device with an older build] → The rules only widen, so nothing an old client does starts failing. It just lacks the new controls until it reloads.
- [Two devices of the same player spend at once] → `changeBalance` retries on a concurrent change, as for the DM. Both spends count, or the second gets the insufficient message.

## Migration Plan

No data migration. Deploy the Firestore rules and the hosting build together. Until the new build loads, clients keep showing the old controls. Rollback means redeploying the previous rules and build. Entries and holdings written in the meantime stay valid under the old rules, because they are only read.
