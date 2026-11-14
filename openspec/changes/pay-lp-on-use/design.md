# Design

## Context

See proposal.md for the motivation. The current state that shapes the approach:

- **Card use.** `closeHolding` (`src/features/hands/api.ts`) runs one transaction. It re-reads the holding, and the card only for a normal card. It then closes the holding and releases a normal card's `holder`. The rules allow the close through `closesAs('used')`, which permits only `returnedAt`, `returnedBy`, `returnReason` and `usedOn` to change, for the holder or the DM, while the table is free.
- **Payments.** Draws, packs and True Word drafts each pay in the transaction that creates their record. The record names its ledger entry (`entryId`), and the entry names the record in `drawId`. The profile's `lp` points at the entry through `lpEntryId`. Three rules check the same write from their own side:
  - `lpSetByEntry(source)` on the profile
  - one function per source on the ledger (`paysForDraw`, `forPack`, `forWordDraft`)
  - the record's own rule

  When another device moves the LP between the transaction's read and its commit, the rules deny the commit before the transaction can retry. `drawCard` therefore re-reads the LP from the server and tries again.
- **Costs** are free text (`cards/{id}.cost`, `trueWords/{id}.cost`, `userCards/{id}.costOverride`). The data holds:
  - cards: whole numbers 0 to 6, `X`, `d6`, and `null` (Blessed cards and the 2 cards with an empty cost)
  - True Words: 0 to 5 and `X`
  - cost overrides: any text the DM types, up to 10 characters

  `numericCost` in `src/features/cards/display.ts` reads "-1" and "1,5" as numbers for the cost badges.
- **True Words** have no use action and no use record. A known word is an open `userTrueWords/{recordId}` record.
- **The log** reads only the ledger's `manual` entries (`src/features/activity-log/api.ts`). It already never lists draw, pack or draft payments as balance changes.

## Goals / Non-Goals

**Goals:**

- One price rule, shared by cards and True Words, by the UI and by the Firestore rules.
- The use and its payment are one atomic write that the rules check from every side, as for draws.
- No data migration: older holdings and ledger entries stay valid.

**Non-Goals:**

- Checking a die roll or an X value against the table. The app records what the user enters, and the log shows it to everyone.
- A "use" for Custom Cards or elixirs, which do not exist yet.
- Refunding a use. The DM corrects a mistake by hand.

## Decisions

### D1. The holding records a card use's payment

When a holding closes as used, it also writes `useCost` (a whole number ≥ 0) and `useEntryId` (the ledger entry, or `null` when `useCost` is 0). The fields are written only on that close. An open holding, a holding closed before this change, and a discarded or transferred holding lack them, and the schema reads them as `null`.

- **Why:** the holding already is the use record. The log's "used" event and the hand both read it.
- **Alternative:** a separate `cardUses` collection. Rejected: it would duplicate the holding's close and add a second source for one event.
- **Alternative:** add the fields at creation to every holding. Rejected: it touches every way of giving (`validNewHolding`, `openHolding`, draws, packs, transfers) for fields that only a closed holding needs.

The zod schema adds a refinement: only a holding closed as used carries `useCost` or `useEntryId`, and a `useEntryId` comes only with a `useCost` above 0.

### D2. True Word uses get their own collection, `wordUses/{useId}`

A use is an event, and the word stays known. So a use cannot close or change the learned word's record. Each use is a new document with these fields:

- `uid`, `wordId`, `wordName` (the word's name at the time), and `recordId` (the open `userTrueWords` record)
- `by` and `at`
- `cost` (the LP paid, a whole number ≥ 0)
- `entryId` (the ledger entry, or `null` for 0)

A use record has no `usedOn`, because the spec does not ask for a character.

- **Alternative:** a use counter on `userTrueWords`. Rejected: the log needs one event per use, with its time and payment.

The rules check every word use record from the record's side:

- the record exists, belongs to `uid` and to `wordId`, and is not taken back
- `wordName` equals the word's current name
- the word is active or retired
- `by` is the signed-in user, and `at` is the request time
- the user is the player (`uid`) or the DM
- the table is free
- a cost above 0 comes with a ledger entry created in the same write that names this use, and a cost of 0 comes with none

Every signed-in user reads the records. No one changes or deletes one.

### D3. One price rule: `priceOfUse(cost)`

A pure helper next to `numericCost` turns a written cost into one of three kinds:

| written cost (trimmed) | kind | the player pays |
|---|---|---|
| empty or `null` | `fixed`, 0 | nothing |
| digits only (`^[0-9]+$`) | `fixed`, that number | exactly that |
| `d6`, in any case | `die` | what they enter, 1 to 6 |
| anything else (`X`, `X+1`, `-1`, `1,5`) | `chosen` | what they enter, 0 up |

A card's cost in the hand is `costOverride ?? card.cost`, as the hand already shows it (`HandEntry.cost`). A word's cost is `word.cost`.

- **"-1" and "1,5" differ from `numericCost` on purpose.** LP is a whole number, never below 0, so such a cost cannot be paid as written. It becomes an amount the user enters, like X. The badges keep using `numericCost`.
- **The rules mirror the helper** in one function, `priceAllows(cost, amount)`, with the same four branches. It uses `trim()`, `matches('^[0-9]+$')`, `int()` and `lower()`. Unit tests on `priceOfUse` and emulator tests on the rule use the same table of cases.
- **Who the price binds.** It binds a player's own use. The DM may charge any whole amount from 0 to 1,000,000. The ledger's balance check keeps it within the player's LP, as for drafts.

### D4. Ledger sources `use` and `wordUse`, named through `drawId`

The two new sources keep the entry's fixed field list. `drawId` names the holding (`use`) or the word use (`wordUse`), as it already names a draft for `wordDraft`. `currency` is always `lp`, and `reason` is `null`.

New ledger rules, both under `tableFree()`:

- **`forUse()`:**
  - the holding named by `drawId` was open before this write, and is closed as used after it
  - the holding's `useEntryId` is this entry, and its `useCost` equals `-delta`
  - `account` is the holding's `uid`
  - `setsLp()`
- **`forWordUse()`:**
  - the word use named by `drawId` is created in this same write
  - its `entryId` is this entry, and its `cost` equals `-delta`
  - `account` is its `uid`
  - `setsLp()`

The profile rule gains `lpSetByEntry('use')` and `lpSetByEntry('wordUse')`, each for the player themselves or the DM. Who may use a card or a word is decided by the holding's and the word use's own rules, as packs leave it to the pack's rules. So a player can never pay for another player's use: the profile rule needs `isSelf(uid)`, and the ledger ties the account to the holding's or the use's player.

- **Alternative:** a new field such as `useId` on the entry. Rejected: it changes the entry's shape for every reader and every ledger rule.

### D5. The holding's close as used gets its own rule

`closesAs('used')` becomes `closesAsUsed()`. It allows the four close fields plus `useCost` and `useEntryId`, and requires both. It checks:

- `useCost` is an int from 0 to 1,000,000
- the closer is the DM, or the holder with `priceAllows(handCost(), useCost)`
  - `handCost()` is the holding's `costOverride` when set, else the card's `cost` (missing counts as `null`)
- a `useCost` of 0 has `useEntryId == null`
- a `useCost` above 0 has an entry created in this write with source `use`, `drawId` equal to this holding, and `delta` equal to `-useCost`

`closesAs('discarded')` and the transfer stay as they are.

A close as used without the new fields is denied. That is what makes the payment mandatory, so the rule has no "old client" exception (see Risks).

### D6. The client transactions

- **`closeHolding` for `used`** takes `amount`, the number the user confirmed. Inside one transaction it:
  1. re-reads the holding, the card (now for every kind, for its cost) and, when `amount > 0`, the holder's profile
  2. for a player's own use: recomputes the price, and throws `HoldingError('price-changed', price)` when a fixed price differs from `amount`
  3. throws `HoldingError('insufficient', lp)` when the LP is below `amount`
  4. for a holder whose profile is not a player (the DM's own hand): requires `amount === 0`
  5. writes the close with `useCost` and `useEntryId`, the ledger entry from `newLedgerEntry({ source: 'use', drawId: holdingId })`, the profile's `lp` and `lpEntryId`, and the normal card's release

  A denied commit re-reads the LP from the server and tries again when it moved, up to 3 times. `drawCard` handles a moved LP the same way.
- **`recordWordUse`** in `src/features/true-words/api.ts` works the same way:
  1. reads the record (open, not taken back), the word, and the player's profile when `amount > 0`
  2. creates `wordUses/{id}`, the entry and the new LP
  3. throws `TrueWordError` with `insufficient`, `price-changed` or `not-known`

  It is exposed as `recordWordUse` in `TrueWordActions`.
- **Names.** The helpers are `priceOfUse` and `recordWordUse`, not `usePrice` and `useWord`: the project's React lint rule treats any function named `use…` as a hook.

### D7. One payment block for both use steps

`UsePayment` in `src/features/balances/` holds the payment part of a use step, for cards and for words. It lives in balances, so that hands and true-words both import it without depending on each other. It shows:

- the price, and the holder's LP before → after
- the amount field: "Zar sonucu (1–6)" for a die, "Kaç LP ödenecek?" for a chosen price, or the DM's "Tutar (<name>'nın LP'sinden)" with "0 = ücretsiz"
- the "not enough LP" note
- the confirm label: "Kullanımı onayla (2 LP)", or "Kullanımı onayla" for 0

It reads the price and the LP live, so a cost change or an LP change on another device shows at once. It gives the parent the amount, or `null` while the amount is not valid yet. `HoldingDetails` places it under the "Hangi karakter üzerinde?" field. `TrueWordDetails` gets a `Kullan` button across the details, which opens the same step without the character field. After a use, the word's details show "<word> kullanıldı (−5 LP)." until another word is selected.

### D8. The log

- **Card uses.** `usedSentence` appends ` (−2 LP)` when `useCost > 0`.
- **Word uses** are a tenth source in `logQueries`: `wordUses`, filtered by `uid` under the player filter, ordered by `at` descending, limited to `n`. They become a new event kind, `wordUsed`.
  - Its sentence is "Abyss True Word'ünü kullandı (−5 LP)."
  - When the DM uses a player's word, the sentence starts with that player's name in the genitive: "Ayla'nın Abyss True Word'ünü kullandı (−5 LP)."
- **Index.** A composite index (`uid` ascending, `at` descending) on `wordUses` serves the filter. The ledger query stays on `source == 'manual'`, so payments are never listed twice.

## Risks / Trade-offs

- **[Risk] An open tab running the old app cannot use a card after the rules deploy**, because its close lacks the payment fields. → The rules and the app deploy together. The denial shows the existing generic Turkish error. A reload fixes it, and the group is small.
- **[Risk] A player could under-report a d6 roll or an X.** → Accepted: the app is a tracker. The entered amount is in the log for the whole table. The DM can correct it by hand.
- **[Risk] The rules' document reads.** One use touches up to 6 documents: the user's profile, the holder's profile, the card, the holding, the ledger entry and `table/main`. Each is read with `get` and `getAfter`, which stays within Firestore's 20-read limit for a multi-document write. → The emulator tests include the heaviest case: a player's paid use of a normal card while the table is free.
- **[Risk] A fixed price changes between showing and confirming.** → The transaction re-reads it and refuses a mismatch with `price-changed`. The step shows the new price live.
- **[Trade-off] The DM's amount is not tied to the price.** It matches packs and drafts, and it covers table effects that change costs, such as Ardalion's Abdication or Diana's Decoy. Nothing records the price the DM overrode. The log shows only what was paid.

## Migration Plan

1. There is no data migration. Missing `useCost` and `useEntryId` read as `null`, and existing ledger entries keep their sources.
2. Deploy the Firestore rules, the index and the app in one `firebase deploy`, only when the owner asks. Development stays on the emulators.
3. Rollback: redeploy the previous rules and app. Holdings closed with the new fields stay readable by the old schema, because zod objects drop unknown keys. Entries with the new sources would fail the old `LEDGER_SOURCES` enum, so the rollback must keep the two new sources in the schema.
