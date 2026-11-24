# Proposal

## Why

The v2.2.8 reference has a Custom Card Draft. In it, a player builds a one-off card from random effect pieces. `adopt-legacy-v2-2-8` put the screen in the menu as a "Yakında" placeholder and left the feature and its data model for a later change, and no later change took it up. The pieces that blocked it now exist: the owner's effects table (18 effect types, each with a 1, 3 and 5-cost text), the 54 effect pictures and the 3 cost covers. The owner and the DM also decided how the draft works at a table where players act for themselves, which the single-user legacy app never had to decide.

## What Changes

- **Custom Card Draft screen.** The placeholder becomes the draft. A player picks the card's cost (1, 3 or 5) and pays that many LP. They then pick one of up to 3 random effects at each step until the card is complete. The DM chooses the player in "Kimin için", the DM's own hand included, and may set the amount from 0 up to that user's LP.
- **The legacy draft rules carry over:**
  - 3 different effects. Picking Effects adds more.
  - A 3-cost Special adds two 1-cost picks.
  - A 5-cost Special turns the other effects into their 1-cost texts.
  - A 1-cost Special raises one random other effect to its 3-cost text.
  - There is no reroll and no skip.
- **Owner decisions that differ from the legacy app:**
  - The draft costs LP. Legacy changed LP only by hand.
  - A 5-cost Effects adds 3 picks, as its text says. Legacy added 2.
  - The card's use cost is computed when the card is made: the draft cost, plus the Effects increase, minus the Cursed reduction, never below 0. Legacy kept the draft cost. The card's details show how the cost was reached.
  - An open draft is saved and survives a reload. It is live for everyone, and a player has at most one at a time. Legacy kept the draft in a dialog, so cancelling and starting again gave new options for free.
  - Only the DM cancels a draft, and the payment is refunded in full.
- **Custom Cards in hands.** The finished card goes to the end of the player's hand as a card with one copy. It is never in the library, the pool, a pack or "+ Kart ver".
  - Its face shows the cover for its draft cost and cycles through its effect pictures on hover.
  - Using it closes its holding. Nothing returns to a pool, so the card is gone. Discarding it does the same.
  - A card with a Held effect stays in the hand when used ("Kullanınca elde kalır"), and is discarded when it is done.
  - The DM can transfer it, set its hand cost, and add or remove effects on it, for the Held effects that change a card each session.
  - The "draw a Cursed card" part of a Cursed effect stays text: the table draws by hand.
- **Effects data.** A new admin import, `import-custom-effects`, loads the owner's effects CSV into Firestore. Players read it. Only the import writes it.
- **Pictures.** `build-art` also builds the 3 Custom Card covers and the 54 effect pictures into `public/art/`, with the other static art.
- **Log and ledger.**
  - Each Custom Card draft is one İşlem Logu event: who, for whom, the payment, the picks, and how it ended.
  - Its payment and refund are ledger entries with the new source "Custom Card draft".
- **Out of scope:**
  - the Elixir Shop
  - effect editing in the app (the CSV is the source)
  - any automatic session tracking for Held effects
  - any automatic Cursed draw

## Capabilities

### New Capabilities

- `custom-cards`: the custom effect variants and their import, the Custom Card Draft (cost choice, price, steps, pick counts, resolution, the open draft, cancel), the finished Custom Card (fields, computed cost, face and pictures, use, discard, transfer, the DM's effect edits), and the custom draft records and access.

### Modified Capabilities

- `app-shell`: "Placeholder screens". Custom Card Draft is no longer a placeholder, and the Elixir Shop becomes the example.
- `card-library`: "Card definitions". The kind may be "custom", and no Kütüphane tab lists a Custom Card.
- `card-library`: "Who writes card definitions". A finished Custom Card draft creates its card.
- `definition-editing`: "Only the DM manages definitions". The finished draft creates the card, and only the DM changes it.
- `definition-editing`: "Flags fixed by the kind". A Custom Card's flags are fixed.
- `card-holdings`: "Holding records". "draft" is the way a Custom Card is received.
- `card-holdings`: "Browsing the cards to give". "+ Kart ver" never lists a Custom Card.
- `balances`: "Permanent ledger". A new source, the Custom Card draft.
- `activity-log`: The log lists Custom Card drafts, also in the per-user filter, as one event each.
- `card-images`: The build and the manifest cover the Custom Card covers and the effect pictures.

## Impact

- **Firestore:**
  - a new kind `custom` in `cards/{cardId}` (`custom-` IDs, with the effects list and the draft cost)
  - a new draw kind `customDraft` in `draws/{drawId}`
  - a per-player lock doc for the open draft
  - `customEffects/main` for the effect texts
  - a new ledger source
  - new rules in `firestore.rules`, which is close to its per-request expression and access-call limits
- **Code:**
  - `src/features/custom-draft/` (new screen, API, schema)
  - `src/features/cards/` (schema, face, zoom, details)
  - `src/features/definitions/flags.ts` (the kind)
  - `src/features/hands/` (holding kind, card details)
  - `src/features/balances/` (ledger source)
  - `src/features/activity-log/`
  - the "+ Kart ver" and library lists
- **Scripts:**
  - `scripts/import-custom-effects.ts` and its lib
  - `scripts/build-art.ts` and `scripts/lib/artFiles.ts` (custom pictures)
  - a test fixture under `tests/fixtures/data/`
- **Docs:** `docs/domain.md` (the owner decisions above replace the observed legacy behavior), `docs/conventions.md`, `data/README.md`, `README.md`.
- **Tests:**
  - emulator rules tests for every new path and write
  - unit tests for the draft rules and the cost
  - emulator tests for the import
