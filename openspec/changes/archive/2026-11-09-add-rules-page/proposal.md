# Proposal

## Why

The Kurallar screen is still a placeholder. `adopt-legacy-v2-2-8` left it empty until the owner had reviewed the DM's rules text. The owner has now reviewed the text and decided how the app shows it. With the core loop built (LP, draws, packs, True Words, the log), the rules are what a player needs next to understand the table before the app goes live.

## What Changes

- **The Kurallar screen shows the table rules.** The Cardmaker tells them in Turkish, in four sections, in this order:
  - **Legend Point Kart Sistemi**
  - **Cursed Kartlar**
  - **Blessed Kart Kuralları**
  - **True Word Kuralları**

  The text is the DM's text from the v2.2.8 rules page (`rulesPage()`). The owner chose to rewrite it where it disagrees with the app (option C in the exploration):
  - **Blessed chance in a draw.** "Normal kart çekerken bir Blessed bulma ihtimalin yalnızca %2" is wrong for the app, where every drawable card has the same chance (`add-card-draws`). The fixed percentage goes. The new text says that every card in the deck has the same chance, Blessed cards among them. The claim that Blessed cards are "the hardest of all cards to find" goes with it.
  - **Blessed cards per mechanic.** "One per mechanic, plus one more for every 50 cards" goes. The app follows the card data, which has 2 or 3 per mechanic. Gambler's Gambit and Risk & Reward have 3, where the formula gives 2. The new text only says that each mechanic has its own Blessed cards.
  - **Packs with Blessed cards.** "Rare veya Mechanic Pack'ler" becomes Mechanic, Golden and Pandemonium Packs. v2.2.8 has no Rare Packs group, and these are the packs whose cards include Blessed cards in the app (`add-pack-shop`).
  - **Headings in Turkish.** "Cursed Cards", "Drawing Cards", "Trading", "Blessed Card Rules" and "True Words Rules" become "Cursed Kartlar", "Kart Çekmek", "Takas", "Blessed Kart Kuralları" and "True Word Kuralları".
  - **Typos fixed.** Examples: "ablabilirsin", "Cursee card", "Blessed cartlar", and the inconsistent capitals of "Çerçeveli". The Cardmaker's own voice stays as written ("keh keh", "kutsamama", "hemi?").
- **Static content in the app.** The text is part of the application, not data. It needs no Firestore path, rules or editor. It is the same for every signed-in user and shows at once, without loading. A change to the text is a code change and a deploy.
- **The look.** The title row shows the screen's Cardmaker, `cardmaker_wave`, as it already does. The legacy page's large `card_info` illustration is not shown, because the owner's archives do not have it.
- **`docs/domain.md`.**
  - The table rules section describes the app's Kurallar screen and how it differs from the legacy rules page.
  - The open question "Blessed cards per mechanic" is settled: the data decides. The "Open questions for the DM" list is then empty.
  - A deliberate decision records that the Kurallar screen follows the app.

Out of scope:
- **Editing the text in the app.** A DM-editable rules page would need a data path, access rules and an editor: a later change if the DM asks for it.
- **App-specific notes** such as "the DM records a trade in the app" or the pack prices. The screen is the table's rule book, not a manual for the app.
- **The `card_info` illustration**, until the owner has the picture.
- **A table of contents or jump links.** The legacy page had none.
- **Enforcing any table rule.** The app still records and does not enforce, for example one Blessed card per player.

## Capabilities

### New Capabilities
- `rules-page`: the Kurallar screen. Covers the table rules it shows, their sections and headings, their agreement with the app's behavior, and that the text is static and the same for everyone.

### Modified Capabilities
- `developer-workflow`: the "Domain reference document" requirement says that disagreements between the rules page and the app are listed as open questions for the DM. It changes so that the domain reference also records how the owner settled them, and the app's Kurallar screen that follows those decisions. Its Blessed scenario changes from an open question to a settled decision.

## Impact

- **Code:**
  - `src/features/rules/RulesPage.tsx`: from placeholder to the screen.
  - `src/features/rules/RulesContent.tsx` (new): the rules text as JSX.
  - `src/features/rules/RulesPage.test.tsx` (new).
  - `src/app/routes.test.tsx`: Kurallar joins the built screens.
- **Docs:**
  - `docs/domain.md`: the table rules, the open questions, the deliberate decisions, and the Kurallar entry in the glossary.
  - `docs/conventions.md`: the project layout no longer lists `rules/` as a placeholder.
- **No data, rules, scripts or dependencies change.**
