# Design

## Context

The pool is computed from the cards on the client:
- `isDrawable` and `cursedPool` in `src/features/cards/pool.ts` decide what draws, packs and the pool distribution may use.
- `cardStatuses` in `src/features/hands/cardStatus.ts` computes the library's Durum and pool counts.

The server checks the drawn or chosen card's status in `drawnInto` and `chosenFromPack` (`firestore.rules`), but not the pool for every offered pack card. `CardsProvider` reads the whole collection for the DM and the active and retired cards for players, and then exposes two views:
- `useCards()`: the active cards, for the lists, draws and packs
- `useCardsById()`: every card the device reads, for the hands

Each definition step writes a change record whose `before`/`after` snapshots must equal the stored card (`agreesWithTarget`). Its `public` flag must equal "visible to players before or after" (`isPublicStep` and the rule's `playerVisible`).

## Goals / Non-Goals

**Goals:**
- One boolean drives every exclusion, so draws, packs, counts and the distribution cannot disagree.
- The server enforces "never drawn, never chosen" and "DM-only work stays private", as it does for statuses.
- No data upgrade: missing reads as `false` everywhere, in the app, the rules and the scripts.

**Non-Goals:**
- Keeping DM-only cards off players' devices (decision A).
- A server check on the cards a pack offers when it opens. Today's rules do not check those either.

## Decisions

### D1. A separate `dmOnly` boolean, not a fourth status
The flag is about who may hand a card out, not about its lifecycle. A DM-only card can still be a draft, active or retired, and the steps between statuses stay as they are.
- A status `dmOnly` would have needed new step names and changes to every `status == 'active'` check.
- It would also have mixed up retiring with hiding.

The field is optional on `cards/{cardId}`:
- the app's schema reads it with `.default(false)`, and the rules with `data.get('dmOnly', false)`
- the app writes it on every definition step, so cards the DM touches get an explicit value
- the import scripts never write it

### D2. "Drawable" and "visible to players" each gain one condition
- `isDrawable` and `cursedPool` add `!card.dmOnly`. Packs (`catalog.ts`), draws (`DrawDialog`, `DrawButtons`) and the pool distribution follow without their own change.
- `cardStatuses`' `inPool` adds the same condition, so the "Havuzda" status and the pool count agree with draws.
- In the rules, `drawnInto` and `chosenFromPack` add `get(cardPath(cardId)).data.get('dmOnly', false) == false` next to their status check. `chosenFromPack` covers both the chosen card and the mandatory Cursed card.
- `givenByDm` is unchanged, because the DM gives any active card.
- Alternative considered: also checking the offered IDs when a pack opens. That costs up to six `get()` calls in a rule that is already near the limit. The choice check is enough to stop a DM-only card from reaching a hand.

### D3. Players' lists come from `useCards()` without DM-only cards
`CardsProvider` already knows the role:
- On a player's device, `useCards()` leaves DM-only cards out. The library, the Cursed Deck and their counts then follow without per-screen code.
- `useCardsById()` keeps them, so hands and the hand details still render a held DM-only card.
- On the DM's device both views keep them.

The player paths that use `useCards()` all go through the pool functions, which drop DM-only cards anyway: draws, packs and the draw buttons.
- Alternative considered: filtering in `CardBrowser`. That spreads the rule over screens and leaves the counts to each of them.

### D4. Who reads a record: "visible" means active or retired and not DM-only
- `isPublicStep` takes the two snapshots instead of the two statuses.
- The rules' `validChangeRecord` uses a `visibleSnapshot(s)` helper: `s != null && s.status in ['active','retired'] && !s.get('dmOnly', false)`.
- The card snapshot (`cardSnapshotSchema` and the rules' `cardSnapshot`) gains `dmOnly`, with a default of `false` for records written before.
- Word snapshots have no flag, and the helper's `get` default covers them.

This gives the specified results without a special case:
- edits of a DM-only card are DM-only
- turning the flag on or off is public, because one side is visible
- work on a DM-only draft stays private
- `stepFor` is unchanged, so a flag change is an `edited` step

### D5. A flag change waits for an open pack
In `changedByDm`, the condition "a status change needs `tableFree()`" becomes "a status change or a flag change needs `tableFree()`". This also applies to drafts, for one simple rule, even though a draft is never in the pool. The form shows the same Turkish waiting message as for status steps.
- Alternative considered: waiting only for an active card's flag. It is more precise, but adds a rule branch and a message variant for no practical gain.

### D6. The DM's status filter gets a "DM'e özel" choice for cards only
- `StatusFilterValue` becomes `DefinitionStatus | 'dmOnly' | 'all'`.
- The options move from a constant to a list per screen. The card screens get "DM'e özel" before "Hepsi", and the True Words screen keeps today's four.
- A card filter function keeps `card.dmOnly` of any status for `'dmOnly'`. The other values work as today, so "Yayında" still shows active DM-only cards, marked.
- The "🔒 DM" mark on `CardFace` and in `CardTable` shows on the DM's device whatever the filter.

### D7. Log line and picture import
- `eventText.ts` adds `['dmOnly', "DM'e özel"]` to the card fields, shown as "evet"/"hayır".
- `LogEventRow` already marks non-public records "🔒 Yalnızca DM".
- `scripts/lib/importPictures.ts` reads `dmOnly` with each stored card. Its public record keeps `status !== 'draft' && !dmOnly`. Drafts stay in the drafts' DM-only record, and the other DM-only cards get a DM-only record of their own.
  - An import item carries `dmOnly`, with a default of `false` for older records.
  - The app's record check accepts a non-public record whose items are drafts or DM-only.
  - The log calls such a record "N DM'e özel karta resim ekledi."
  - Mixing DM-only active cards into the drafts' record would have made the log call them "taslak".
- `importCards` is unchanged: it never touches a stored card's fields beyond the status upgrade, and new cards have no flag.

## Risks / Trade-offs

- **[Risk] A curious player can read DM-only cards from the network or devtools.** → The owner accepted this (decision A). The change records, which hold every edit, stay server-protected.
- **[Risk] The snapshot shape changes.** The rule compares the record's snapshot with the stored card, so a client that writes snapshots without `dmOnly` would be refused. → The app and the rules change together. The schema default reads old records, and emulator tests cover a card without the field.
- **[Risk] A forged pack could offer a DM-only Cursed card,** which then cannot be chosen. → The pack stays open until the DM cancels it, the same outcome as a forged retired card today.
- **[Trade-off] A flag change on a draft also waits for an open pack.** This is accepted for one simple rule (D5).

## Migration Plan

No data migration. Deploy the rules and the app together. Older records and cards read the missing field as `false`. Rollback means reverting both. Cards the DM marked keep a `dmOnly` field that the older app ignores. Its stricter rule key list would refuse edits of those cards until the flag is removed in the console.
