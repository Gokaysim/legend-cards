# Design

## Context

See proposal.md for the motivation. The current state that shapes the approach:

- **Characters** (`src/features/characters/`) are one collection read through one subscription in `CharactersProvider`. The hand's Karakterler tab is wired by `useHandCharacters(profile, isWide)`, which returns the tab's content, the selected character's details for the side panel, and the dialogs.
- **A card's use** is one transaction in `closeHolding` (`hands/api.ts`). It reads the holding, the card, the chosen character (`readUseTarget`) and the holder's profile. It then writes the ledger entry, the new LP and the closed holding with `usedOn` and `usedOnCharacterId`. The use step's list lives in `HoldingDetails.tsx` (`TYPED`, `characterGroups`). `UseTarget` is declared in `hands/api.ts`.
- **A True Word's use** is one transaction in `recordWordUse` (`true-words/api.ts`). It writes `wordUses/{useId}` with its payment. The rule `validWordUse()` requires exactly eight fields. The log's text for it is in `activity-log/eventText.ts`.
- **"Active"** is a flag on an open holding (`active`) and on a learned word record. Only the DM switches it. `HandsPage` already builds the hand's `entries` and `wordEntries`, and `HandSummary` derives its "Aktif efekt" list from them.
- **Rules budget.** A card use is the heaviest common request: holding, card, profile, ledger entry, table and character. The rules tests have "heaviest request" cases that guard the per-request lookup limit.

## Goals / Non-Goals

**Goals:**

- One stored record per effect, created with its use in the same request when it comes from a use, and checked from the effect's side by the rules.
- Held effects derived live from what already exists, so no card movement, draw or pack step changes.
- One character picker shared by the card and the word use steps.

**Non-Goals:**

- Durations, expiry or editing effects.
- Changing who switches cards or words active.

## Decisions

### D1. A top-level `characterEffects/{effectId}` collection

Each document has these fields:

- `characterId`, and `uid`: the character's owner, copied so the rules and queries need no character read for a delete
- `source`: `card`, `word`, `own` or `dm`
- `sourceId`: the holding for `card`, the word use for `word`, `null` otherwise
- `name`: 1 to 200 characters for a use, 1 to 60 by hand
- `text`: 0 to 2000 characters for a use, the card's or word's visible text; 1 to 500 by hand
- `cursed`: a boolean, true only for a Cursed card's effect, so it shows in the Cursed color
- `createdBy` and `createdAt`

Documents are created and deleted, never updated.

- **Why a collection of its own, not a field on the character:** effects come and go often, from several users at once. A list inside the character document would make concurrent adds overwrite each other and would need the character's rules to understand effects.
- **Why `uid` is copied:** the delete rule can tell the owner without a `get()` of the character.

### D2. A use's effect is written in the use's transaction, and the rule checks it against the use

`closeHolding` and `recordWordUse` take `addEffect: boolean` beside the target. When it is true and the target is a chosen character, the transaction also sets a new `characterEffects` document.

For a card, the effect carries `name` (the card's current name), `text` (`visibleText(card.text)`), `cursed` and `sourceId` (the holding). For a word, it carries the word's name, the word's visible text, and `sourceId` (the new word use).

The create rule for `source == 'card'` requires all of these:

- `get(holdingPath(sourceId)).data.returnReason == null`, so the holding was open before this request
- after the request, the holding is `used`, with `returnedBy == request.auth.uid` and `usedOnCharacterId == characterId`
- `uid` is the character's owner, and `createdBy` is the user

The rule for `source == 'word'` requires `!exists(wordUsePath(sourceId))`, `existsAfter(...)`, the use's `by` to be the user, and its `usedOnCharacterId` to be this character.

The character's existence and archived state are already checked by the holding's and the word use's own rules (D4).

- **Alternative:** a client-only write after the use. Rejected: a use without its effect, or an effect forged without a use, would be possible, and the offline queue could split them.

### D3. Effects by hand are plain writes

A player's own effect (`own`) and the DM's effect (`dm`) are a `setDoc`, queued offline like notes, with no `tableFree()` check.

The create rule for `own` requires:

- `isSelf(data.uid)`
- the character exists, is not archived, and its `uid` is `data.uid`
- `sourceId == null`
- the name and text within their limits

The rule for `dm` requires `isDm()` and the same character checks.

The delete rules are:

- `card` and `word`: `isSelf(resource.data.uid) || request.auth.uid == resource.data.createdBy || isDm()`
- `own`: `isSelf(resource.data.uid) || isDm()`
- `dm`: `isDm()`

Updates are denied.

### D4. Word uses record the character the way holdings do

`wordUses` gets `usedOn` (the name) and `usedOnCharacterId`, both optional. `validWordUse()` changes from `hasOnly(eight fields)` and `hasAll(eight)` to `hasOnly(ten)` and `hasAll(eight)`. It adds a `usedCharacterMatches` check, the same one the holding rule has: the character exists, is not archived, and its name equals `usedOn`.

`recordWordUse` reads the character in its transaction through the same `readUseTarget` logic. That logic moves to the characters feature, so the hands and the True Words features share it.

The log text adds `" <usedOn> üzerinde"` for a word use, as it does for a card. Older records lack the fields, which reads as `null`.

### D5. One shared character picker

`UseTarget`, `NO_USE_TARGET` and `readUseTarget` move to `src/features/characters/useTarget.ts`. The picker moves out of `HoldingDetails` into `src/features/characters/CharacterPicker.tsx`, which holds:

- the select with its groups
- "Başka (yaz)…" with its text field
- the archived-meanwhile check
- the new "Aktif efekt olarak ekle" checkbox, shown only for a chosen character and checked by default

It reports `{ target: UseTarget, addEffect: boolean }` to its parent, and the archived-meanwhile failure through a callback. `HoldingDetails` and `TrueWordDetails` both render it. The word's step passes the player's uid as the holder, so the player's group comes first.

### D6. Held effects are derived, then passed in

A pure helper `heldEffects(entries, wordEntries)` lives in `src/features/characters/heldEffects.ts`, taking minimal shapes so the characters feature imports no hands or True Words internals. It returns `{ kind: 'held' | 'word', name, text, cursed }` for each active hand card and each active known word.

`HandsPage` already has both lists. It computes the held effects once and passes them to `useHandCharacters(profile, isWide, held)` and to `HandSummary`. Every active character of that player shows the same held list, so the held list adds no data and no subscription.

### D7. The provider gets a second subscription

`CharactersProvider` also subscribes to the whole `characterEffects` collection. `useCharacterEffects()` gives them newest first, and `useCharacterActions()` gains `addEffect` and `removeEffect`. A pure `effectsOf(effects, characterId)` filters them for one character.

The archived rule ("not shown or counted") is applied by the callers through `charactersOf`, which already lists only active characters. `TestCharactersProvider` takes `effects` too.

### D8. Where it shows

- **`CharacterTile`** gets a `count`. It shows "✦ n" in a small badge on the portrait's top-right corner, with `aria-label` "n aktif efekt", and nothing at 0.
- **`CharacterDetails`** gets an "Aktif efektler" section:
  - the held cards ("Elden"), then the active words ("True Word"), then the stored effects
  - each row has a `Pill` mark, the name, the text, and for stored effects "<name> · 9 Kas 14:32", using the notes' date format
  - "Kaldır" deletes after no confirmation; the effect is gone at once, and a failure shows a Turkish alert
  - "+ Efekt ekle" opens `EffectFormDialog`, with the name (60) and the text (500)
- **`HandSummary`** gets the stored effects of the player's active characters, grouped by character. It adds their count to "Aktif efekt" and lists them after the active words, under each character's name.

## Risks / Trade-offs

- [A card use with an effect adds a document and two lookups to the heaviest request] → A rules test covers "a player's paid use of a normal card, released to the pool, on a character, with its effect". If it hits the limit, the effect rule drops its `get()` of the holding before the request and relies on `existsAfter` and the holding's own rule.
- [Deleting leaves no trace of hand-made effects] → The owner chose it. Uses still log the card or the word and its character.
- [A True Word that is active and also used shows twice] → Accepted in exploration: the two mean different things.
- [The picker moves out of `HoldingDetails`] → Its existing tests in `HoldingDialog.test.tsx` keep running against the details, so a regression shows there.

## Migration Plan

- No data migration. Old word uses and holdings read without a character, and there are no effects yet.
- Deploy `firestore.rules` with the app, when the owner asks for a deploy. No composite index: the provider reads the whole collection.
- Rollback: the previous app ignores `characterEffects`. The previous rules deny word uses that carry the new fields, so roll back the app and the rules together.
