# Proposal

## Why

The hand screen opens with six stat tiles in a 3 × 2 grid and the tabs stacked at their right. Two of the tiles ("Aktif
efekt", "Farklı set") repeat what other places already show, the Cursed and True Words counts take a tile each, and the
characters hide behind a "🧝 Karakterler" tab with a second row of tabs inside it. The owner wants a lighter dashboard:
one row of three stats, then one row of tabs where every character is a tab of its own, and character effects that read
at a glance in colors that tell their kind apart. The design canvas "Oyuncu Ekranı Yeni Düzen" (variant V2, chosen on
2026-11-17) is the visual reference.

## What Changes

- The six stat tiles become one thin strip with three sections: "Legend Point" (with "± LP" / "− LP" as today),
  "Kartlar" (the card count) and one section that shows the Cursed count (☠) and the True Words count (✦) side by side.
- **BREAKING (UI)**: the "Aktif efekt" and "Farklı set" stats are removed. The "Eldeki setler" list moves to the
  "Kartlar" section and opens the way it does today (pointer rest, keyboard focus, tap). The hand-wide list of active
  effects is gone; the effects show per character instead.
- The tabs move under the strip as one underlined row: "♠ Kartlar", "✦ True Words", one tab per active character
  (thumbnail, name, "✦ <count>"), a "+" button to add a character (owner and DM), an "Arşiv (<n>)" button when
  characters are archived, and "🔒 DM notu" at the end for the DM. The row wraps on narrow windows.
- **BREAKING (UI)**: the "🧝 Karakterler" tab and its inner row of character tabs are removed. Selecting a character's
  tab shows its view at full width under the row. The open character is kept in the URL (`?character=<id>`); an old
  `?tab=characters` link opens the first active character.
- Archived characters move from the collapsed list under the view to a dialog opened by "Arşiv (<n>)".
- Resting the pointer on a character's tab, or focusing it from the keyboard, shows a popover with the names of its
  active effects. A tap on a phone selects the character and shows no popover.
- Every effect, in the popover and in the character's "Aktif efektler", glows in its kind's color: Cursed red, Blessed
  white, True Word purple, other cards green, own ("Özel") and DM effects blue. Blue is a new theme color.
- An effect stored from a used card now records whether the card is Blessed (`blessed`), checked by the Firestore rules
  like `cursed`. Effects stored before this change have no `blessed` field and show green.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-holdings`: the hand summary becomes three stats with the sets list on "Kartlar" and no active-effects list; a new
  requirement for the hand's tab row.
- `characters`: characters become tabs in the hand's tab row instead of a Karakterler tab; adding, the selected view,
  the URL and the archived list change with it.
- `character-effects`: effect records gain `blessed`; the effects popover on a character's tab; the tab's count moves
  with the tab.
- `visual-effects`: the stat colors follow the new strip; effects glow in their kind's color; the True Word glow in the
  hand summary moves to the effect lists.
- `player-notes`: the DM notu tab comes after the character tabs, and the tab list no longer has "🧝 Karakterler".

## Impact

- UI: `src/features/hands/HandSummary.tsx`, `StatTile.tsx`, `HandsPage.tsx` (layout, tab state, URL),
  `src/components/ui/TabList.tsx` or a new hand tab row, `src/features/characters/CharactersTab.tsx`,
  `useHandCharacters.tsx`, `CharacterEffectsList.tsx`, a new effects popover, `src/styles/theme.css` (blue glow token).
- Data: `src/features/characters/effects.ts` (schema), `heldEffects.ts` (Blessed held cards), `api.ts` (`setUseEffect`
  writes `blessed`), `src/features/hands/api.ts` and the True Word use path (pass the card kind).
- Rules: `firestore.rules` `characterEffects` (`blessed` allowed, true only for a Blessed card's use), with emulator
  rules tests in `tests/firestore.rules.emulator.test.ts`.
- `src/app/screens.ts` (the character URL parameter), `docs/domain.md` if it names the stats or the Karakterler tab.
- Tests: the hand page, summary, characters tab and effects list tests change with the layout.
