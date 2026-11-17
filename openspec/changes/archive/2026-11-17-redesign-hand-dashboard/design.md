# Design

## Context

See proposal.md for the motivation and the design canvas "Oyuncu Ekranı Yeni Düzen", variant V2, for the look.

Today `HandContent` in `src/features/hands/HandsPage.tsx` renders a two-column dashboard: `HandSummary` (six
`StatTile`s in a 2- or 3-column grid, with the "Aktif efekt" and "Farklı set" lists opened by a covering
`ListTrigger` button) and a vertical `TabList` of four tabs. The Karakterler tab renders `useHandCharacters(...).content`,
which owns the character selection in component state and renders `CharactersTab` (an inner `role="tablist"` of
`CharacterTab`s, "+ Karakter ekle", the selected `CharacterDetails`, and the collapsed archived list).

`TabList` renders `role="tab"` buttons without arrow-key handling, so each tab is its own Tab stop. Tabs live in the URL
as `?tab=true-words|characters|dm-note`.

Effects: `heldEffects()` derives the hand's active cards and words with `cursed` only. A stored `characterEffects`
document has `cursed` and no Blessed flag; the rules (`firestore.rules`, `match /characterEffects`) require exactly the
listed fields and check `cursed == (cardKind == 'cursed')` against the use. `CharacterEffectsList` marks rows with a
`Pill` and a left border, red for Cursed and plain otherwise.

## Goals / Non-Goals

**Goals:**
- One reusable "rest, focus or tap opens a popover" behavior for the Kartlar stat and the character tabs.
- Character selection driven by the URL, so a character tab behaves like the other tabs (reload, back button).
- One function that decides an effect's kind, shared by the popover and the details list.

**Non-Goals:**
- No change to the hand's card view, the True Words tab, the details panels, or the words peeking above the hand.
- No backfill of `blessed` on effects stored before this change (they stay green, as agreed).
- No arrow-key navigation for the tab row; it keeps today's one-Tab-stop-per-tab behavior.

## Decisions

### D1. The strip: `HandSummary` keeps its role, `StatTile` gains a strip layout

`HandSummary` renders one `<dl>` with three sections in a `grid-cols-3` that holds at 360 px. Each section stacks its
label over its value below `sm` and puts them side by side from `sm` up (V2). The third section holds two values,
☠ count and ✦ count, in one `dd`, with screen-reader text "Cursed kart" and "True Words" before each number. The
"Kartlar" section keeps the covering trigger, now only for the sets list; the "Aktif efekt" list, its trigger and the
reads of characters and character effects leave `HandSummary`. `LIST_NAMES`/`TRIGGER_NAMES` shrink to the sets list,
headed "Eldeki setler · <n> set".

Alternative: keep six tiles and hide three on the dashboard. Rejected: the counts would still be computed and tested for
nothing.

### D2. The tab row: one tablist, with the DM notu tab owned through `aria-owns`

A new `HandTabRow` in `src/features/hands/` renders one wrapping flex row, in DOM and visual order:
`[♠ Kartlar] [✦ True Words] [character tabs…] [+] [Arşiv (n)] <spacer> [🔒 DM notu]`. The first group is a
`role="tablist"` (label "El"); "+" and "Arşiv" are plain buttons after it; "🔒 DM notu" is a `role="tab"` placed after
the spacer, and the tablist names it in `aria-owns`, so screen readers hear one list of tabs while the Tab key follows
the visual order. The open tab gets the gold underline (V2) and `aria-selected`.

Alternatives: (a) put "+" and "Arşiv" inside the tablist; rejected, a tablist owns only tabs. (b) move "+" and "Arşiv"
after "DM notu"; rejected, it breaks the order the owner approved. (c) render the row as links with `aria-current`;
rejected, the rest of the app and its tests use the tab pattern.

`TabList` stays for its other users; `HandTabRow` reuses its classes where it can.

### D3. The URL decides the open tab and the open character

`tabOf()` becomes `openTabOf(params, isDm, activeCharacters)` returning `{ kind: 'cards' | 'true-words' | 'dm-note' }`
or `{ kind: 'character', id }`:
- `?character=<id>` names a character tab. An id that is not an active character of the hand's user resolves to the
  first active character, or to Kartlar when there is none.
- `?tab=characters` (the former Karakterler tab) resolves the same way, with no id.
- `?tab=dm-note` stays DM-only; `?tab=true-words` is unchanged; anything else is Kartlar.

Choosing a tab writes the URL as today (`setParams`), deleting `character` for the non-character tabs and `tab` for a
character. Resolution happens during render and does not rewrite the URL, like today's selection fallbacks. The
`character` parameter name goes into `src/app/screens.ts` next to `HAND_TAB_PARAM`.

`useHandCharacters` loses its `selection` state: it takes the open character id from `HandContent` and returns the
pieces the page places: the character tab data (character, effect count, effect rows for the popover), the open
character's view, and the overlays (character form, effect form, archive dialog). The "select the new character once it
shows" logic (`pendingAdd`) stays, but navigates to `?character=<new id>` instead of setting state. `CharactersTab`'s
section, heading and inner tablist go away; `CharacterTab` moves into the row with a truncated name (`truncate`, full name
in `aria-label`-free text plus `title`).

The character view renders full width like the old Karakterler tab (`showsPanel` stays false for it), with the player
note under it.

### D4. One popover behavior, two triggers

`ListTrigger`'s logic moves into a `PopoverTrigger` button in `src/components/ui/`, with its open state from a small
`usePopover()` hook in `src/lib/` (the state, Escape, and a press outside, found through the trigger's
`data-popover-trigger`). Mouse/pen `pointerenter` opens and `pointerleave` closes; focus not caused by a press opens and
blur closes. The trigger takes a `tap` option:
- The Kartlar stat (`tap: 'toggle'`): a tap toggles the list, as today.
- A character tab (`tap: 'ignore'`): a tap or click only selects the tab (navigation); no popover opens from a touch.

The press bookkeeping (`lastPointer`, `isPressed`) stays in refs inside the trigger component. A hook that handed those
refs or handlers back to its caller trips the React Compiler's lint (`react-hooks/refs`), so the split is a component
plus a state hook.

The sets list keeps its `sr-only` closed state (spec). The character popover is rendered only while open, positioned
`absolute` under its tab, `max-w-[calc(100vw-2rem)]` so it never widens the page; the tab gets `aria-describedby`
pointing at it while it is open. The popover reads the same live data as the view, so a new effect appears in it
without a reload.

### D5. Effect kinds and colors

A pure `effectKind()` in `src/features/characters/effectRows.ts` maps a held or stored effect to
`'cursed' | 'blessed' | 'word' | 'card' | 'custom'`: Cursed wins, then Blessed, then word, then card, and own/DM effects
are `custom`. `effectRows()` builds the rows once for `CharacterEffectsList` and the new `CharacterEffectsPopover`, and
`EFFECT_STYLES` gives each kind its look. The left border goes; each row gets a border in its kind's glow color and an
outer glow from a `--shadow-glow-effect-<kind>` token in `theme.css` (a plain glow, so a JSX utility per the
conventions, not an `@utility`):

| Kind    | Glow token                         | Note                         |
|---------|------------------------------------|------------------------------|
| cursed  | `--color-glow-cursed` (exists)     |                              |
| blessed | `--color-glow-blessed` (exists)    |                              |
| word    | `--color-glow-word` (exists)       |                              |
| card    | `--color-glow-active` (exists)     | the active card's green      |
| custom  | `--color-glow-custom` `#4fa8ff` (new) | plus a light blue ink token |

Names take their kind's text token (`cursed-soft`, `blessed`, `true-word`, `green`, the new `custom-ink`), checked at
4.5:1 on `pane-raised` and `sidebar`; the `Pill` marks stay as text, so the
kind never rests on color alone. The popover rows use the same utilities at a smaller size.

### D6. `blessed` on stored effects: optional in the rules, always written by the client

- Schema (`effects.ts`): `blessed: z.boolean().default(false)`, so documents written before read as `false`; the
  superRefine rejects `blessed` on a non-card source.
- Writes: `UseEffectContent` gains `blessed`; `src/features/hands/api.ts` passes `current.kind === 'blessed'`, the True
  Word use path passes `false`; `addEffect` writes `blessed: false`.
- Rules: `blessed` joins `hasOnly` but not `hasAll`; `data.get('blessed', false) is bool`; it may be true only when
  `source == 'card'`, and in `followsClosedUse`/`followsKeptUse` only when the used card's `cardKind == 'blessed'`.
  The rules do not demand `true` for a Blessed card, so a page still open on the previous build keeps working after the
  deploy (its effects simply show green).
- `heldEffects()` gains `blessed: entry.card.kind === 'blessed'`.

Alternatives (discussed in explore): derive Blessed from the card library by name (fragile), or read each effect's
closed holding (extra reads, fails offline). Rejected.

## Risks / Trade-offs

- [Rules size: the project already sits near Firestore's 1000-expression limit] → the change adds a handful of
  expressions in one match block; run `npm run test:emulator` early and keep the checks inside the existing functions.
- [A popover on a tab that is also a navigation control can fight the click] → the hook never opens on touch and never
  toggles on click for the character tabs; tests cover mouse, keyboard and touch separately.
- [`aria-owns` support varies across screen readers] → the visual and Tab order are right without it; it only improves
  the announced tab count. Verify with the accessibility tree in Chrome.
- [Three stats in one row at 360 px] → labels may wrap to two lines; the strip is checked in the 360 px iframe like
  other screens.
- [Removing the hand-wide "Aktif efekt" list loses an overview for a player without characters] → accepted by the
  owner; active cards still glow in the hand, and active words peek above it.

## Migration Plan

No data migration. Rules and client ship together through the CI deploy on `master`. Old effects keep reading as not
Blessed. Rollback is a revert: the previous client ignores the extra `blessed` field because the previous rules never
let it be written, and the new rules accept documents without it.
