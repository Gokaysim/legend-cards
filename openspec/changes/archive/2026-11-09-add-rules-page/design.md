# Design

## Context

See proposal.md for the owner's decisions: rewrite the text to follow the app (option C), keep it static in the app, and show no `card_info` illustration. The requirements are in `specs/rules-page/spec.md`.

The current state:
- `src/features/rules/RulesPage.tsx` renders `<Placeholder>` with the screen's title and `cardmaker_wave`.
- `PageHeader` already shows the Cardmaker next to the title, and hides it when the manifest has no picture (`Mascot`).
- `RequireAuth` waits only for the session. Each screen handles its own data, so a screen that reads no data renders at once.
- `src/app/routes.test.tsx` expects the not-ready note on every screen not listed in `BUILT_SCREENS`.

The source text is `rulesPage()` in `reference/legacy/Legend_Card_Manager_v2.2.8.html`. It is one HTML string with:
- an `h2` for each of four sections
- `h3` topics within each section
- paragraphs, two bulleted lists, and `<strong>` runs
- HTML entities (`&quot;`, `&#x27;`)

Its CSS puts the text straight on the page background, with a line between sections, gold section titles, light gold topics and bold runs, and a floating `card_info` illustration on the right.

## Goals / Non-Goals

**Goals:**
- The text is reviewable in a diff, like any other interface text in the components.
- The headings give the page a structure that screen readers can navigate and tests can query.
- No new dependency and no new design token.

**Non-Goals:**
- A content format or renderer that other screens could reuse.
- Copying the legacy markup or CSS. Only the DM's words are carried over.

## Decisions

### D1. The text is JSX in its own component

`src/features/rules/RulesContent.tsx` holds the whole text as JSX: semantic `section`, `h2`, `h3`, `p`, `ul` and `strong` elements, with two small local helpers for a section and a bulleted list. `RulesPage.tsx` renders `PageHeader` (title and mascot from `screenById('rules')`) and `RulesContent`.

This follows the conventions: Turkish interface strings are written directly in the components, with no translation layer.

Alternatives considered:
- **A Firestore document with an editor for the DM.** The owner chose static content. A DM-editable page needs a data path, access rules, an editor and their tests. That is a later change, if the DM asks for it.
- **A Markdown file with a renderer.** It needs a new dependency, such as `react-markdown`, or a hand-written parser, both for one page. JSX already is a typed tree, and Prettier formats it.
- **A typed array of sections and blocks.** Every `<strong>` run inside a sentence would need its own segment type. That is an indirection with no gain over JSX.

### D2. Carry over the words, not the markup

The text is transcribed from `rulesPage()`:
- HTML entities become plain characters (`"`, `'`).
- Every sentence not listed in D3 stays word for word.
- The markup, class names and styles are written new with the project's tokens.
- The legacy section IDs (`rules-section-0` to `-3`) are not kept. Each section gets an ID only for `aria-labelledby`.

This keeps to the rule that the legacy file's code is never ported. The DM's text is content, not code.

### D3. The approved edits

These are the only differences from the legacy text.

| Where | Legacy | New |
| --- | --- | --- |
| Section 2 title | Cursed Cards | Cursed Kartlar |
| Section 2 topic | Drawing Cards | Kart Çekmek |
| Section 2 topic | Trading | Takas |
| Section 3 title | Blessed Card Rules | Blessed Kart Kuralları |
| Section 4 title | True Words Rules | True Word Kuralları |
| Blessed Kartların Nadirliği, 1st paragraph | "Bak evladım, Blessed kartlar benim en nadide yavrularımdır! Bütün kartlar arasında en zor bulunanları bunlar. Normal kart çekerken bir Blessed bulma ihtimalin yalnızca %2!" | "Bak evladım, Blessed kartlar benim en nadide yavrularımdır! Kart çekerken destedeki her kartın şansı eşittir, Blessed'lar da onların arasındadır. Ama sayıları öyle azdır ki karşına çıkarsa kıymetini bil!" |
| Paketlerdeki Blessed Kartlar, 1st paragraph | "Blessed kartları, Rare veya Mechanic Pack'lerde de bulabilirsin yavrum." | "Blessed kartları Mechanic Pack'lerde, Golden Pack'lerde ve Pandemonium Pack'lerinde de bulabilirsin yavrum." |
| Paketlerdeki Blessed Kartlar, 2nd paragraph | "Her Mechanic'in kendine ait bir Blessed kartı bulunur. Üstelik o Mechanic'teki her 50 kart için bir Blessed kart daha eklenir! Bereket dediğin böyle olur işte. Maşallah!" | "Her Mechanic'in kendine ait Blessed kartları vardır. Bereket dediğin böyle olur işte. Maşallah!" |
| LP section, the advantage bullet | "avantaj ablabilirsin" | "avantaj alabilirsin" |
| Cursed section, 1st paragraph | "iki tane Cursee card çekmen gerekiyor" | "iki tane Cursed kart çekmen gerekiyor" |
| Card colors, white | "Beyaz Çerçeveli kartlar: Bunlar Blessed cartlar canım" | "Beyaz çerçeveli kartlar: Bunlar Blessed kartlar canım" |
| Card colors, red | "Kırmızı Çerçeveli Kartlar:" | "Kırmızı çerçeveli kartlar:" (as "Mor çerçeveli kartlar:" and "Altın çerçeveli kartlar:") |
| True Words, 2nd paragraph | "hiç bir şey" | "hiçbir şey" |
| True Word Nasıl Kullanılır?, 2nd paragraph | "…ödeyerek onu kullanabilirsin" | "…ödeyerek onu kullanabilirsin." |

The Cardmaker's voice stays as written, including "keh keh", "kutsamama", "hemi?", "Ayol" and "packten".

### D4. Structure and look

- **Sections.** Each section is a `<section aria-labelledby>` with an `h2`. It is a region named by its title, so a screen reader can jump between the four sections, and tests can find them with `getByRole('region', { name })`. Topics are `h3`, under the page's `h1` from `PageHeader`.
- **On the page background.** The text sits on the canvas, with no panel, as in the legacy page. A `border-line` rule and spacing separate the sections. The text column is at most `max-w-3xl` wide, for a readable line length. Long words wrap (`break-words`), so 360 CSS pixels never scroll sideways.
- **Colors.** Only existing tokens are used:
  - section titles: `text-gold`
  - topics: `text-ink`, semibold
  - body: `text-ink`, relaxed line height
  - bold runs: `text-gold`, semibold

  Gold text sits on the canvas here for the first time, so `theme.test.ts` gets a `gold on canvas` contrast pair. The canvas is darker than the sidebar, where gold is already checked, so the pair passes.
- **No illustration.** Without `card_info` there is nothing to float. Adding it later is a `Mascot` with that stem in `RulesContent`. It renders nothing while the picture is missing, so the later change is small.

### D5. Tests

- **`src/features/rules/RulesPage.test.tsx`**, with `renderApp({ path: '/rules' })`. One test or more for each scenario in `specs/rules-page/spec.md`:
  - the four regions in order, and each region's `h3` topics
  - no English headings and no not-ready note
  - the Blessed rarity sentence, and no `%2` anywhere
  - the pack sentence, with no "Rare veya" and no "her 50 kart"
  - the four colors
  - no `button` and no `form` inside the page's section
  - the same text for a player and for the DM
  - the full text while the cards and the profiles are still loading
- **`src/app/routes.test.tsx`.** `BUILT_SCREENS` gets `/rules`, which checks the first section's region. The existing Cardmaker test for `/rules` stays as it is.
- **The 360-pixel check** is done in the browser, as for earlier screens. jsdom has no layout.

### D6. `docs/domain.md`

- **"Table rules (Kurallar page)".**
  - The intro says that the app's Kurallar screen shows this text, rewritten where it disagreed with the app (`add-rules-page`).
  - The Blessed bullets keep the legacy rules page's statements, each with what the Kurallar screen says now.
  - The note at the top points disagreements to the deliberate decisions, and to the open questions only while they are open.
- **"Open questions for the DM".** The "Blessed cards per mechanic" row moves out. The section stays, says that no question is open, and keeps its pointer to the settled ones.
- **"Deliberate decisions".**
  - A new entry, "The Kurallar screen follows the app": what was rewritten (D3) and why. It also records the per-mechanic decision: the data decides, with Gambler's Gambit and Risk & Reward at 3 Blessed cards where the formula gave 2.
  - The random-draw entry ("The rules page's fixed 2% is not used") also says that the Kurallar screen no longer states it.
- **Glossary "Kurallar".** It says that the app's screen shows the rules, adapted.

`docs/conventions.md`: the project layout lists `rules/` as the Kurallar screen with its static text, no longer among the placeholders.

## Risks / Trade-offs

- **[Risk] The text drifts from the app.** A later change could change a rule that the text describes, such as the draw chances or which packs hold Blessed cards. Mitigation:
  - The deliberate decision in `docs/domain.md` names the Kurallar screen as following the app.
  - The tests pin the two statements that depend on app behavior.
  - A later change to draws or packs then meets the Kurallar text in the domain reference and in the failing tests.
- **[Risk] The DM disagrees with the rewritten text.** The owner approved it. A correction is a small code change.
- **[Trade-off] A text change needs a deploy.** Accepted by the owner. The text rarely changes.
- **[Trade-off] A long page on phones without jump links.** The legacy page had none. The section regions already let screen reader users jump. Links can come later.

## Migration Plan

No data, rules or scripts change. The screen replaces its placeholder on the next build. Rollback is a revert.
