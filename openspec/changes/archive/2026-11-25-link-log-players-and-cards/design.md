# Design

## Context

`describeEvent` in `src/features/activity-log/eventText.ts` builds each event's sentence as `SentencePart[]`, where a part is Turkish text or `{ card: name }`. Player names are not parts of their own: they are inflected and merged into the text (`` `${genitive(nameOf(uid))} elinden ` ``), so the row cannot tell where a name starts. Card parts carry the name only, although every source record has the ID (`holding.cardId`, `draw.cardId`, `pack.chosen.cardId`, `pack.cursed.cardId`, `draft.learned.cardId`, a Custom Card draft's `cardId`, `use.cardId`, `record.wordId`).

`LogEventRow` renders the parts and the "Sunulan:" line. It already reads `useHandCardsById()` (normal, Blessed, Cursed and Custom Cards; no True Words) for the pack's offered names.

The Kart geçmişi page decides who may open it with `isOpenTo(card, isDm, isHeld)` in `src/features/stats/CardHistoryPage.tsx`, with `isHeld` from `useOpenHoldings()`. `CardsProvider` and `HoldingsProvider` wrap the whole signed-in app, so the log can read the same hooks.

The Turkish suffix helpers in `src/lib/turkish.ts` (`genitive`, `dative`, `ablative`, `accusative`) return the trimmed name plus an apostrophe and suffix.

## Goals / Non-Goals

**Goals:**
- One place decides whether a card page opens, shared by the page and the log, so a log link never leads to "Kart bulunamadı.".
- `eventText.ts` stays free of React and routes: it says *who* and *which card*; the row decides *whether and where* to link.
- `sentenceText` keeps returning exactly today's text, so the existing text tests keep passing unchanged.

**Non-Goals:**
- Keeping the log's "Daha fazla" depth when a user goes back from a link (see Risks).
- Links in the Kart geçmişi page's own rows, set names, or a word draft's offered words.

## Decisions

### D1. New sentence parts: `{ player, name, suffix }` and `{ card, cardId }`

`SentencePart` becomes `string | { card: string; cardId: string | null } | { player: string; name: string; suffix: string }`. The player part holds the uid, the name as `nameOf` gives it, and the suffix that follows it (`"'nın"`, `"'ya"`, `""`). `cardId` is `null` only where a record has no ID to give.

`sentenceText` joins `name + suffix` for a player part and `card` for a card part, so the plain text does not change.

*Alternative:* keep the strings and let the row search for known names in them. Rejected: a name can appear inside another word or twice, and the suffix boundary would be guessed.

*Alternative:* link the whole inflected word (`[Ayla'nın]`). Rejected in exploration: the owner chose name-only links.

### D2. Suffix helpers return the suffix apart from the name

Add `suffixed(name, inflect)` (or one `…Suffix` function per case) in `src/lib/turkish.ts` that returns `{ name, suffix }`, where `suffix = inflect(name).slice(name.trim().length)`. A small helper in `eventText.ts`, `player(uid, inflect?)`, builds the part from `nameOf`. The inflection rules stay in one place and need no new logic.

### D3. Every player mention becomes a part

These places change from text to a player part:
- `given`, `transferred` (both sides), `drawn` into another hand, `discarded` and `used` from another hand, `wordTaught`, `wordTakenBack`, `wordUsed`/`keptUsed` of another player.
- `pack`, `wordDraft`, `customDraft`: "`<name>` için" and the draft's closer when it is the player (not "DM").
- `balance`: the LP account before the colon. "Grup kesesi" stays text.
- `role`: the target in "…'ı DM yaptı." and "…'ın DM'liğini aldı.".

A part adjoining text keeps the spaces in the text parts, as card parts do today.

### D4. The row resolves links

`LogEventRow` gets two lookups and renders:
- player part: `<Link to={handPath(uid)}>` when a profile exists for the uid, otherwise the name as text. The page already builds a profile map (`byId`); it passes `hasProfile` (or the map) next to `nameOf`. The top line's actor is linked the same way, and "Import" never is.
- card part: `<Link to={cardHistoryPath({ id })}>` when `cardId` is in `useHandCardsById()` and `canOpenCardPage(card, isDm, isHeld)` is true; otherwise the bold `lang="en"` span as today. A True Word ID is never in that map, so True Words fall through to text without a special case.
- "Sunulan:" names of a pack: each offered ID goes through the same card-link rendering, joined with ", ".

The link renders inside the existing bold span for cards (`lang="en"` kept on the card text).

### D5. Share the page rule as `canOpenCardPage`

Move `isOpenTo` out of `CardHistoryPage.tsx` into `src/features/stats/cardAccess.ts` as `canOpenCardPage(card, isDm, isHeld)`, unchanged, and use it from both. A small hook in the same module, `useCardPageAccess()`, reads `useIsDm()` and `useOpenHoldings()` once and returns `(cardId) => boolean` over `useHandCardsById()`, so each row does not filter the holdings itself. While a subscription is loading, the hook answers `false` (text, no link), and the row re-renders when it is ready.

### D6. Link styling

One class cluster in the activity log, `LOG_LINK_CLASSES = 'hover:text-gold hover:underline'`, the same as the Kütüphane table's card link. Colour and weight come from the surrounding text. The global `:focus-visible` outline in `src/styles/index.css` gives the focus ring, so no extra focus classes are needed. No new colour token.

## Risks / Trade-offs

- [Going back from a link reloads the log at its first 50 events; a user deep in "Daha fazla" loses the place] → Accepted for now; the browser's back restores the page, not the depth. A later change can keep the limit in the URL if it bites.
- [Many links in a long log, each reading the card map and holdings] → The lookups are memoised once per page in the hook (D5); a row only does map lookups.
- [A part's spacing changes the text by a space] → `sentenceText` tests stay unchanged and catch it.
- [A uid whose profile is not loaded yet shows "İsimsiz oyuncu" without a link, then a link] → Same as today's name; it settles when the profiles load.
