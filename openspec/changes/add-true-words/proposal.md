# Proposal

## Why

True Words are the second kind of power players collect, next to cards. The True Words screen is still a placeholder, the hand has no True Words tab, and `data/true-words.csv` (53 words) has been waiting in the repository since `add-card-library`. With cards, LP, draws and packs in place, True Words are the next table feature that can be built from data already at hand.

## What Changes

- **The True Words list.** A new import script, `npm run import-true-words`, loads `data/true-words.csv` (Name, Cost, Text) the way the card import does:
  - It checks every row before writing anything.
  - It matches words by normalized name. A word missing from the file is retired, never deleted.
  - It supports dry runs and Turkish reports.
  - Each word keeps its cost as written (`0` to `5`, or `X`): the LP a player pays each time they use it at the table. The legacy app ignored the Cost column. The app shows the cost, but never charges it.
- **The True Words screen** at `/true-words` replaces the placeholder:
  - It lists every active word with its name, cost and visible text.
  - It marks the words the chosen player already knows.
  - It starts a draft. A player starts one for themselves. The DM picks the player, as in the Pack Shop.
- **The draft**, following the rules page:
  - It shows 3 random words that the player does not know. The player learns 1 of them, or skips all three ("Pas Geç").
  - At least 3 learnable words are needed.
  - A player can have only one open draft at a time.
- **Paying for a draft.** The owner decided the rules page's price applies: 1 LP plus the number of True Words the player already knows.
  - A player pays it from their own LP when the draft starts.
  - The DM starts a draft for any player. The DM can change the amount, which starts at the price; 0 is free. A draft is paid only in LP, never in GP.
  - **This deliberately departs** from the legacy app, where a draft cost nothing and LP changed only by hand, just as draws and packs did.
- **An open draft survives.**
  - The draft is saved when it starts. Closing the window or reloading never ends it, and its owner can continue where they left off.
  - It ends only in one of three ways:
    - **Learning:** the owner or the DM picks a word.
    - **Skipping:** "Pas Geç" does not refund the payment.
    - **Cancelling:** only the DM cancels, and a cancel refunds the payment in full.
  - Everyone sees an open draft live, on that player's True Words tab and on the True Words screen.
  - A draft does not lock the table: two players can learn the same word, so nothing shown in a draft can be taken from someone else.
- **The DM teaches and takes back.**
  - The DM can teach any active word directly to any player, without a draft. This is how the table's current True Words are entered before going live.
  - The DM can take back a learned word, to correct a mistake.
  - Taking back closes the record and never deletes it, and the log shows it. The rules page says a learned word cannot be forgotten. Taking back is only the DM's correction, not a player action.
- **Learned words.**
  - A player never knows the same word twice.
  - A learned word stays with the player and can be switched active or inactive. As with cards, only the DM switches it.
- **The hand screen.**
  - It gets two tabs, "♠ Kartlar" and "✦ True Words", as in the legacy app.
  - The True Words tab lists the player's words in the order learned, with their cost, text and active state.
    - The DM can open a word's details there to switch it active or to take it back.
    - The DM has a "+ True Word öğret" dialog.
    - There is a link to the draft.
  - The summary gets a "✦ True Words" count. "Aktif efekt" counts the active True Words too and lists them, marked ✦.
- **The table waits for an open pack.** While a pack is open, nobody can start, finish, skip or cancel a draft, and the DM cannot teach or take back a word. Switching a word active stays possible, as it does for cards.
- **İşlem Logu.**
  - A draft is one event: who started it and for whom, the payment or "ücretsiz", the 3 words shown, and how it ended (the word learned, "pas geçti", or the DM's cancel with its refund). While the draft is open, the event says so.
  - A word the DM teaches and a word the DM takes back are events of their own.
  - The payment and the refund of a draft are not listed again.
  - The player filter includes that player's drafts and words.
  - Switching a word active is current state, not an event.
- **Records.**
  - **Words:** `trueWords` holds the word definitions.
  - **Learned words:** `userTrueWords` holds each word one player learned, with how they learned it (from a draft or from the DM) and, if the DM took it back, when and by whom.
  - **Player state:** `playerWords/{uid}` holds the words a player knows and their open draft. The server uses it to stop duplicates and to check the price.
  - **Drafts:** `wordDrafts` holds the drafts.
  - **Ledger:** a draft's payment and refund have the source `wordDraft`.

Out of scope:
- **card-images:** True Word pictures (`true words.7z`), the hover preview, and the Cardmaker on this screen. Until then, a word is drawn as a CSS tile with its name and cost.
- **Using a True Word.** The table pays a word's cost when it is used. As with cards, the app does not charge it. The DM changes LP by hand.
- **Table rules the app does not track:** a word used only in the first round of a combat, and the effect lasting until the end of that combat.
- **Custom Card Draft and the Elixir Shop.** They are separate changes with their own data.

## Capabilities

### New Capabilities
- `true-words`: the word definitions and their import, the True Words screen, the draft with its price, payment, skip and cancel, the open draft that survives and shows live, the DM teaching and taking back a word, learned words with their active switch, the hand's True Words tab, and the records.

### Modified Capabilities
- `admin-scripts`: a True Words import script, with the same checks, matching, retiring and report as the card import.
- `card-holdings`: the hand summary gets the True Words count. Its active effects include the active True Words.
- `balances`:
  - A player's own LP also drops when they pay for their own draft. A draft's payment and refund are recorded with the source "wordDraft" and no written reason.
  - The DM can charge a player's LP for a draft, and a cancel refunds it.
- `activity-log`:
  - The list includes True Word drafts, words the DM teaches, and words the DM takes back.
  - A draft is one event.
  - The player filter includes them.
- `pack-shop`: while a pack is open, the table also waits for True Word drafts, teaching and taking back.

## Impact

- **New code:**
  - `src/features/true-words/`:
    - the word, learned-word, player-state and draft schemas
    - the api: start, learn, skip, cancel, teach, take back, switch active
    - a provider
    - the True Words page, the draft dialog, the hand's True Words tab, the details dialog and the teach dialog
  - `scripts/import-true-words.ts`, reusing `scripts/lib/target.ts`, the CSV reader and the messages.
- **Changed code:**
  - `hands`:
    - the tabs on `HandsPage` and `HandSummary`
    - the summary's count and its active effects
  - `balances`: the `wordDraft` source.
  - `activity-log`: three new queries (drafts, words taught, words taken back), and their events, text and rows.
  - `app/App.tsx`: the provider.
  - `app/routes.tsx`: the page.
  - `package.json`: the script.
- **Rules:** in `firestore.rules`,
  - new blocks for `trueWords` (read only), `userTrueWords`, `playerWords` and `wordDrafts`
  - the `wordDraft` source on `ledger`
  - a player's own draft payment on `users`
  - the table lock on every draft step, on teaching and on taking back

  `tests/firestore.rules.emulator.test.ts` gets matching tests.
- **Indexes:** in `firestore.indexes.json`, for the log's new queries on `userTrueWords` and `wordDrafts`.
- **Tests:**
  - the import script's tests
  - the api's emulator tests
  - test providers, fixtures and `renderApp` options
- **Docs:**
  - `docs/domain.md`:
    - the data model rows
    - the True Words rules
    - the deliberate decisions: the draft price, the DM taking back a word, and the cost column
  - `docs/conventions.md`: the feature, the script and the provider.
  - `data/README.md`: `true-words.csv` is now imported.
- **Dependencies:** none new.
