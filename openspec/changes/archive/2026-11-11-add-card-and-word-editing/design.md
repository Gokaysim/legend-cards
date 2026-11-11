# Design

## Context

See proposal.md for the motivation. The owner decided four things in the explore session:
- **Visibility (option A).** A player reads active and retired definitions, and never a draft.
- **Imports only add.** The DM's screen is where definitions change from now on.
- **Status of an imported definition.** Active by default, or a draft when a value its kind uses is empty. "—" means deliberately none.
- **The log (option C).** Every definition step is recorded. Draft work is visible to the DM only.

The current state that shapes the approach:

- **Definitions are script-only.** `cards/{id}` and `trueWords/{id}` carry `retired: boolean`. In `firestore.rules`, `cards` allows only `holder` updates, and `trueWords` denies every write. The IDs are `legend-<nameKey>`, `cursed-<nameKey>` and `tw-<nameKey>` (`scripts/lib/importCards.ts`, `importTrueWords.ts`). Pictures are keyed by these IDs in `public/art/manifest.json`.
- **Four rules check `retired == false`:** the DM's give, a draw, a pack choice (in `userCards`), and a new learned-word record (in `userTrueWords`).
- **App code checks `retired` in these places:**
  - `cards/pool.ts`, `packs/catalog.ts`, `packs/api.ts`, `draws/api.ts`
  - `cardsContext.ts`
  - `true-words/trueWordsContext.ts` and its draft and teach code
- **Providers.** `CardsProvider` and `TrueWordsProvider` each subscribe to the whole collection, once for the app. `cardsById` keeps retired cards so hands can show them (`hands/handEntries.ts`).
- **The hub pattern.** A multi-document step is one client transaction. Each document's rule checks the others' final state with `getAfter`/`existsAfter`, for example `users.lpEntryId` with its ledger entry. `tableFree()` holds every card and balance step while a pack is open. `explainDenial` (`src/features/table/api.ts`) turns a denial into `TableBusyError`.
- **The log.** `src/features/activity-log/api.ts` merges seven queries, each newest first with `limit(n)`. Each record is exactly one event, so the `n` newest events are always among each query's `n` newest records.
- **Converters.** A document that fails its zod schema makes the whole subscription report `invalid-data` (`src/lib/firestore/converter.ts`).

## Goals / Non-Goals

**Goals:**
- The server enforces every rule in the definition-editing spec, even against a modified client: who may write, the status steps, completeness, kind changes, the table lock, and each change paired with its record.
- A player's device never receives a draft definition or a draft-work record.
- The log stays exact when paging: one record is one event.
- One shared idea of "complete", used by the form, the rules and the imports.

**Non-Goals:**
- A server function. Every step stays a client transaction checked by rules, as in the earlier changes.
- Enforcing unique names on the server when a definition is renamed.
- Keeping the repository CSV files in step with the stored definitions.

## Decisions

### D1. One `status` field replaces `retired`

Cards and words get `status: 'draft' | 'active' | 'retired'`, and `retired` is dropped. The interface labels are "Taslak", "Yayında" and "Kaldırıldı".

- In code, "active" now means `status == 'active'`. It is never a holding's or a learned word's `active`.
- `docs/domain.md` gets glossary entries: "definition status", and how it differs from a True Word Draft and from an active card in a hand.

*Alternative:* keep `retired` and add a `draft` flag. Rejected: two booleans allow the invalid draft-and-retired state, and every check would need both.

### D2. Drafts live in the same collections, with relaxed fields

A draft is the same document as the active definition it will become. Publishing changes only `status`, so the ID, the picture and any later holdings stay attached.

The schemas keep one variant per kind. A draft may hold `null` in the fields its kind requires:
- a normal card's `setCode`, `rarity` and `mechanicPack`
- a word's `cost`

An empty `text` (`''`) is allowed in a draft. A card's `cost` is `null` when the card has no cost; it is never required, so `null` needs no second meaning.

"Complete" is one rule, written three times, and tests keep the three copies in step:
- `isComplete()` in the app, which the form and the controls use
- `completeCard()` and `completeWord()` in `firestore.rules`
- the row check in `scripts/lib`

The kind rules are in the definition-editing spec, "Complete definitions".

*Alternative:* a separate `cardDrafts` collection. Rejected: publishing would move the document and change its ID, which pictures and holdings key on. Every reader would also need two sources.

### D3. Reads by role, on the server and in the providers

Rules:

```
allow read: if isSignedIn() && (resource.data.status in ['active', 'retired'] || isDm());
```

The cheap check comes first, so a player's read costs no profile lookup.

Rules are not filters, so the providers ask for what the user may read:
- the DM's device subscribes to the whole collection
- a player's device subscribes with `where('status', 'in', ['active', 'retired'])`

The provider waits for the signed-in user's profile before it subscribes, because the role picks the query.

`cardsContext` keeps its shape:
- `useCards()` and `useDeckCards()` give the active cards, for everyone
- `useCardsById()` gives every card the device has, which includes retired cards for the hands, and drafts on the DM's device
- a new DM-only `useDeckDefinitions(deck)` gives the status filter its list

`trueWordsContext` mirrors this.

*Alternative:* a public mirror collection without drafts. Rejected: the mirror would need its own writes and rules, and it could drift.

### D4. Every definition step is a transaction with a change record

A new collection `definitionChanges/{changeId}` holds the records. Each record:

```
target: 'card' | 'word'
targetId: string
name: string                       // after the step; before it, for a delete
step: 'added' | 'edited' | 'published' | 'retired' | 'restored' | 'deleted'
before: Definition | null          // every definition field plus status; null for 'added'
after:  Definition | null          // null for 'deleted'
public: boolean
by: uid
at: server time
```

The definition gets `changeId`, which points at its newest record, as `lpEntryId` does for a balance. Each side's rule checks the other:

- **The definition's rule** (update or create) requires `isDm()` and a `changeId` that this request creates (`createdNow`). It also checks:
  - the field types and limits
  - the allowed status step (D5)
  - completeness unless the result is a draft
  - kind changes (D6)
  - the deck prefix of the ID
  - `tableFree()` when the status changes (D8)
  - that `holder` and the definition are never changed in the same write (card-library, "Who writes card definitions")
- **A delete** requires a draft, `tableFree()`, and a record of `deleted` created in this request for this ID.
- **The record's rule** requires:
  - `isDm()`, with `by == request.auth.uid` and `at == request.time`
  - `before` equals the stored definition (`get`), field by field
  - `after` equals the stored result (`getAfter`), field by field
  - the step agrees with the status pair
  - `public` agrees with D5
  - records are never updated or deleted

Full snapshots, rather than only the changed fields, let the rule compare whole definitions against `get` and `getAfter` directly. The log computes the differences. A definition is at most about 2.5 KB.

The lookup budget, per document:
- the definition's rule: profile, table before and after, record exists and its after state
- the record's rule: profile (cached), definition before and after

Both are well under 10. The emulator tests exercise the heaviest step, a publish, as `add-pack-shop` did.

### D5. The status steps

| before    | after     | step        | public | needs                                                  |
| --------- | --------- | ----------- | ------ | ------------------------------------------------------ |
| none      | `draft`   | `added`     | no     |                                                        |
| none      | `active`  | `added`     | yes    | complete, `tableFree()`                                |
| `draft`   | `draft`   | `edited`    | no     |                                                        |
| `draft`   | `active`  | `published` | yes    | complete, `tableFree()`; field changes may come with it |
| `active`  | `active`  | `edited`    | yes    | complete                                               |
| `active`  | `retired` | `retired`   | yes    | `tableFree()`; status only                             |
| `retired` | `retired` | `edited`    | yes    | complete                                               |
| `retired` | `active`  | `restored`  | yes    | `tableFree()`; status only                             |
| `draft`   | none      | `deleted`   | no     | `tableFree()`                                          |

`public` is true exactly when the before or the after status is `active` or `retired`. Every other pair is denied, `active` to `draft` included.

Publishing may carry field changes, so that "Kaydet ve yayınla" on an edited draft is one step with one record. Retire and bring-back change the status only, so that their records read clearly.

### D6. Kind changes and IDs

- **Kind.** It changes only while the card is a draft before the step (so also in the step that publishes it), and only between `normal` and `blessed`. A Blessed draft holds `setCode: null` and `rarity: null`. A Legend card can never become Cursed, or the other way round, so the `legend-` or `cursed-` prefix always matches the deck. The rules check the prefix against the kind.
- **New IDs.** They follow the import: `legend-<nameKey>`, `cursed-<nameKey>` or `tw-<nameKey>`. If that ID is taken, for example by a card renamed away from that name, the client adds `-2`, `-3` and so on. The DM's device has every definition, so it can choose. A create never overwrites, because the rules treat an existing document as an update.
- **Renaming** changes `name` and `nameKey` and keeps the ID. Holdings, records and the picture stay attached.
- **Unique names.** The form checks `nameKey` against every definition of the deck, or every word, drafts and retired ones included. The rules cannot query, so the server does not check it (see Risks).

### D7. Imports only add, and upgrade old documents

These modules change: `scripts/lib/cardRows.ts`, `trueWordRows.ts`, `importCards.ts` and `importTrueWords.ts`.

- **Parsing.** Each parsed row carries its `missing` fields, the ones its kind uses that are empty. In card files, `isBlank` stays the test for an empty cell, except that a Cost of "—" means `cost: null` and is not missing. In the True Words file, "—" counts as empty. The cases that stop an import today and become drafts instead:
  - an empty rarity on a normal row
  - an empty Set
  - an empty word cost
- **Planning.** A row is `added` when no stored definition of its deck has its ID or its `nameKey`. Otherwise it is `existing`, and nothing is written for it. The outcomes `updated`, `retired` and `restored` are gone. An added row gets `status` `active` when `missing` is empty, and `draft` otherwise.
- **Upgrade.** Before planning, every stored document of the imported deck without a `status` gets one: `retired` when `retired === true`, and `active` otherwise. The `retired` field is deleted (`FieldValue.delete()`). The upgrade is counted as `upgraded`. A dry run only counts it.
- **Records.** After the additions are written, the import writes up to two records with the Admin SDK:
  - `step: 'imported'`, `public: true`, listing the active additions
  - `step: 'imported'`, `public: false`, listing the drafts

  Each has `by: null`, and `items: [{ target, id, name }]` in place of `before` and `after`. Every added document gets `changeId` pointing at its record. The import's records are a second variant of the record schema.

  The first full import lists 742 items, about 50 KB, far below the 1 MiB document limit.
- **Report.** The Turkish report shows these counts: added as active, added as draft (each named with its empty fields), already stored, and upgraded.

### D8. The table lock

`tableFree()` is required for a step that changes a status (D5). Field edits of any definition, and adding a draft, are allowed while a pack is open.

A pack holds card IDs. A retired card in an open pack would make its choice fail, because `chosenFromPack` requires `status == 'active'`. That is why status steps wait. A text fix only changes what every device shows.

The client mirrors the lock with `useIsTableBusy()` and `TableBusyNote`, and a denial goes through `explainDenial`. A True Word draft does not hold the table. A word retired while it is offered in an open word draft just cannot be learned (`validNewRecord`), so the player learns another or skips.

### D9. Conflicts

The form keeps the definition as it was when the form opened. The save transaction reads the definition again. If any definition field or the status differs from that base, the transaction stops with a `DefinitionChangedError`: the form shows the Turkish message and reloads the new values. The record rule's `before == get(...)` check gives the same protection against a crafted write.

### D10. The log's eighth query

`logQueries()` gets `changes`:
- for players: `where('public', '==', true), orderBy('at', 'desc'), limit(n)`
- for the DM: no `where` clause

With a user filter, the query is left out, as party entries are. The players' query needs a composite index on `public` and `at` in `firestore.indexes.json`.

`events.ts` gets two event kinds:
- `definition`, for one step
- `import`, for an import's record

`eventText.ts` writes their Turkish lines:
- an edit lists each changed field as "eski → yeni"
- a text is compared by its `visibleText`; when only the bracket part changed, it says "metnin gizli kısmı değişti"
- a non-public record is marked "🔒 Yalnızca DM"

### D11. The screens

A new feature folder `src/features/definitions/` holds:
- the change-record schema and converter
- `api.ts`, with the transactions `addCard`, `saveCard`, `setCardStatus` and `deleteCard`, and the same for words
- errors
- a `DefinitionsProvider` that offers the actions, plus a test provider, as `TrueWordsProvider` does
- `CardFormDialog` and `WordFormDialog`, both built on `components/ui/Dialog`
- `StatusFilter`

On the screens:
- **Kart kütüphanesi and Cursed Deck.** For the DM, the `PageHeader` actions get "+ Kart ekle" and the status filter. `CardBrowser` takes an optional `onEdit`. The card view shows "✎ Düzenle" beside the magnifier, and the list view shows a row button. A face or row outside "Yayında" shows its status. The library's add form offers normal and Blessed. The Cursed Deck's form adds a Cursed card.
- **True Words screen.** For the DM, it gets "+ True Word ekle", the status filter, and "✎ Düzenle" on each word.
- **The form.**
  - Its buttons are "Kaydet", plus "Kaydet ve yayınla" for a new definition. When editing, it offers "Yayınla" for a draft, "Kaldır" for an active one, "Geri al" for a retired one, and "Sil" for a draft.
  - "Kaldır" and "Sil" ask for a confirmation.
  - Disabled controls say why: the empty fields, the table waiting for a pack, or no connection.
  - Validation is a zod schema per kind with Turkish messages.

## Risks / Trade-offs

- **[Risk] Firestore may not prove the players' `in` query against the read rule.** → The first rules test covers a player's `in` query. If it is refused, the fallback is two listeners with `==` (`active`, `retired`), merged in the provider. The rule stays the same.
- **[Risk] Two definitions with the same name after a rename.** The server cannot query names. → Only the DM writes. The form checks every definition the DM's device holds, drafts and retired ones included. The imports also match by `nameKey`, so a rename never brings the old name back.
- **[Trade-off] Players can read every retired definition, not only the ones in hands.** → The owner chose this (option A). The screens show a retired definition only where a hand holds it or a player knows it. Drafts, the only private part, never leave the server for a player.
- **[Trade-off] Cards added in the app have no picture.** `build-art` finds pictures through the repository CSV files and `data/image-aliases.csv`. → Out of scope. Adding the card's row to the CSV, with an unsuffixed ID, lets `build-art` match a picture later.
- **[Trade-off] The repository CSV files stop being the full truth.** → `data/README.md` and `docs/domain.md` will say they are the seed data. The stored definitions are the truth from then on.
- **[Risk] Every saved typo fix is a log event.** → One event per save, not per keystroke, and fixing a held card's text is exactly what players should be able to see.
- **[Risk] Documents without `status` break the new code.** A schema failure makes the whole subscription `invalid-data`, and the rules' `status == 'active'` checks fail closed. → The app is not live. Right after this change, one import run upgrades the dev emulators (Migration Plan).

## Migration Plan

1. Ship the rules, the indexes, the app and the scripts together, in one commit.
2. **Dev emulators.** With the owner's permission, run `npm run import-cards` and `npm run import-true-words` once against the running emulators.
   - This upgrades every stored card and word to a status.
   - It adds "The Cartographer" as a draft, because it was skipped before.
   - "Hrolf's Hornswaggle" and "The Grand Finale" are already stored and stay active. Only a fresh import makes them drafts.
3. **The real project** does not exist yet. Its first import creates every definition with a status.
4. **Rollback.** Revert the commit. Upgraded documents have no `retired` field, so the old rules would deny gives and draws. Rolling back the dev data needs the reverse upgrade (`retired = status == 'retired'`), a one-off script that is not part of this change.
