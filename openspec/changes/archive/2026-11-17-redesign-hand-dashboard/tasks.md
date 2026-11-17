# Tasks

## 1. Blessed on effects (data and rules)

- [x] 1.1 Add `blessed` to `characterEffectSchema` in `src/features/characters/effects.ts` (default `false`, rejected on a non-card source) and verify with new cases in `schema.test.ts`/`effects.test.ts` that a document without the field reads as not Blessed and a Blessed own/DM effect fails
- [x] 1.2 Add `blessed` to `HeldEffect` in `heldEffects.ts` from `card.kind === 'blessed'` and verify in `heldEffects.test.ts`
- [x] 1.3 Pass `blessed` through `UseEffectContent`/`setUseEffect` and `addEffect` in `src/features/characters/api.ts`, from `current.kind === 'blessed'` in `src/features/hands/api.ts` and `false` on the True Word use path, and verify with `api.emulator.test.ts` that using a Blessed card stores `blessed: true` and a normal card `false`
- [x] 1.4 Update `match /characterEffects` in `firestore.rules` per design D6 (`blessed` optional, bool, true only for a Blessed card's use) and add rules tests in `tests/firestore.rules.emulator.test.ts`: a Blessed card's effect with `blessed: true` is allowed, without the field is allowed, `blessed: true` on a normal card's use, a word's use, an own and a DM effect is denied; verify with `npm run test:emulator`

## 2. Effect kinds and colors

- [x] 2.1 Add `effectKind()` in `src/features/characters/` (Cursed, then Blessed, then word, then card, own/DM as custom) and verify each kind and the old-effect case (no `blessed`, card) in a unit test
- [x] 2.2 Add `--color-glow-custom` (`#4fa8ff`) and a light blue ink token to `src/styles/theme.css`, and `glow-effect-<kind>` utilities to `src/styles/effects.css`; verify name tints reach 4.5:1 on `pane-raised` with a contrast check noted in the test or the PR
- [x] 2.3 Restyle `CharacterEffectsList` rows with the kind's border and glow instead of the left border, keeping the `Pill` marks and a "Blessed" screen-reader prefix like "Cursed", and verify in `CharacterEffects.test.tsx` that each row carries its kind (for example a `data-kind` attribute) and that a held Blessed card is marked Blessed

## 3. Shared popover behavior

- [x] 3.1 Extract `ListTrigger`'s open/close logic from `HandSummary.tsx` into a `usePopover` hook with `tap: 'toggle' | 'ignore'` (design D4), and verify with a hook test covering mouse rest and leave, keyboard focus and blur, Escape, press outside, and touch with both `tap` options

## 4. The summary strip

- [x] 4.1 Rework `HandSummary` and `StatTile` into the three-section strip (design D1): "Legend Point" with "± LP"/"− LP", "Kartlar ⓘ" with the sets list headed "Eldeki setler · <n> set" through `usePopover`, and ☠/✦ counts in one section; remove the "Aktif efekt" and "Farklı set" stats and the character reads; verify by updating `HandsPage.test.tsx` summary tests to the scenarios of `card-holdings` "Hand summary" (counts, 0 shown, sets list on pointer/focus/tap, closed list readable by screen readers, no active effects)
- [x] 4.2 Apply the stat colors of `visual-effects` "The hand's stat colors" (gold Legend Point and Kartlar, red ☠ count, purple ✦ count on a red-to-purple surface) and verify the tone classes in the summary test and 4.5:1 contrast of each label and number
- [x] 4.3 Update the hand-screen paragraph of `docs/domain.md` (six tiles, tabs beside them) to the strip and the tab row, naming this change, and verify the paragraph no longer mentions "Aktif efekt ⓘ" or "Farklı set ⓘ"

## 5. The tab row and character tabs

- [x] 5.1 Add the `character` URL parameter to `src/app/screens.ts` and replace `tabOf()` with `openTabOf()` (design D3), and verify in a unit test: `?character=<id>` of an active character, of an archived or unknown one (first active, or Kartlar), `?tab=characters` with and without characters, `?tab=dm-note` for a player, and old `?tab=notes`
- [x] 5.2 Build `HandTabRow` (design D2): Kartlar, True Words, character tabs (thumbnail, truncated name with full name for screen readers, "✦ <count>"), "+" ("Karakter ekle", owner and DM), "Arşiv (<n>)" (everyone, when archived), spacer, "🔒 DM notu" (DM, owned by the tablist through `aria-owns`), wrapping at 360 px; verify with `HandsPage.test.tsx` cases for the player's, another player's and the DM's rows from `card-holdings` "The hand's tab row" and `player-notes` "DM notu tab"
- [x] 5.3 Refactor `useHandCharacters` to take the open character from the URL and return tab data, the open view and the overlays; navigate to `?character=<new id>` after an add; remove `CharactersTab`'s section, heading and inner tablist; verify with the `characters` scenarios (adding opens the new tab, first character added, archived open character falls back, last one archived opens Kartlar, reload keeps the character) in `CharactersTab.test.tsx`/`HandsPage.test.tsx`
- [x] 5.4 Move the archived list into an "Arşivlenen karakterler" dialog opened by "Arşiv (<n>)", with "Geri al" for the owner and the DM, and verify the `characters` "Archived characters on the tab" scenarios
- [x] 5.5 Lay out `HandContent` as strip, then row, then content (the character view full width with the player note under it, no side panel), and verify the "Selecting on a desktop" and "Selecting on a phone" scenarios
- [x] 5.6 Update the Character entry of `docs/domain.md` (characters as tabs of their own in the hand's tab row, archive dialog) and verify it no longer says the characters show on the "🧝 Karakterler" tab

## 6. Effects on a character's tab

- [x] 6.1 Add `CharacterEffectsPopover` (names and marks in "Aktif efektler" order, headed with the name and count, "Aktif efekt yok." when empty, glows from group 2) opened on the character tabs through `usePopover` with `tap: 'ignore'`, positioned so it never widens the page; verify with tests for pointer rest and leave, keyboard focus and Escape, a tap that opens the character without a popover, and a live update while open (`character-effects` "Effects on a character's tab")
- [x] 6.2 Verify the `visual-effects` "Effect colors" and "True Word glows" scenarios: the five kinds glow in the view and the popover, an own effect is blue, an old Blessed effect is green

## 7. Integration

- [x] 7.1 Run `npm run check` and `npm run test:emulator` and verify both pass
- [x] 7.2 Check the hand screen in the browser against the design canvas (V2) at 1280 px and in the 360 px iframe, as a player and as the DM: one-row strip, wrapping tab row, sets popover, character popover, effect colors, no horizontal scrollbar; then stop the dev server and emulators as `CLAUDE.md` requires and verify with `lsof -nP -iTCP -sTCP:LISTEN` that the project's ports are free

## Workflow follow-up

- Archive the change with `/opsx:archive` after the owner reviews the result.
