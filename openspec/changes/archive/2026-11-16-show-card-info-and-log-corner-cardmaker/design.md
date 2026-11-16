# Design

## Context

- **Placement today.** `PageHeader` takes `mascotPlacement?: 'title' | 'corner'` (design D5 of `polish-cards-packs-and-mascots`). With `corner` and `useWideHover()` true, it renders `CornerCardmaker` instead of the title's `Mascot`. `CornerCardmaker` fades on its own: it hit-tests the pointer and the focused element against its box on document-level events, so a screen needs nothing else. `ActivityLogPage` is the only screen with a Cardmaker that does not pass `corner`; `src/app/routes.test.tsx` has a case that pins it by the title ("keeps the Cardmaker of /log by the title").
- **`card_info` today.** `scripts/lib/artFiles.ts` lists it in `CARDMAKER_STEMS`, so `build-art` writes it to `public/art/mascots/` and the manifest's `mascots` table. `useArt().mascotUrl('card_info')` already returns its URL where it is built. Nothing renders it. The picture is 640 × 480: a card with red labels Cost, Name, Effect and Set.
- **v2.2.8.** `rulesPage()` puts `<div class="rules-illustration" aria-hidden="true">` with `mascotImage('card_info')` first in a `display:flow-root` layout. `.rules-illustration` floats right: `width:min(52%,540px)`, `min(50%,380px)` at ≤ 850 px, `min(48%,245px)` at ≤ 520 px, with a left and bottom margin and a drop shadow, `pointer-events:none`. The text has no maximum width there.
- **Rules text today.** `RulesContent` is one `div[data-rules-text]` with `flex max-w-[70ch] flex-col gap-8`. Each `RulesSection` is `flex flex-col gap-3`, and `BulletList` is `flex flex-col gap-2`. A float inside a flex container is a flex item and does not float, and a flex container next to a float is narrowed as a whole instead of wrapping its lines.

## Goals / Non-Goals

**Goals:**
- İşlem Logu's Cardmaker follows the same placement as every other screen with one.
- `card_info` shows in the rules with v2.2.8's float, readable on a phone, and announced to screen readers.

**Non-Goals:**
- Any change to `Mascot`, `CornerCardmaker`, `PageHeader` or the art build.
- Showing `card_info` anywhere other than Kurallar.

## Decisions

### D1. The log passes `mascotPlacement="corner"`

`ActivityLogPage` passes `mascotPlacement="corner"` to its `PageHeader`, like `RulesPage` and `SettingsPage`. Nothing else changes: the log's rows sit under her as library cards do, and her fade on pointer or focus already covers them.

### D2. A small `RulesPicture` in `src/features/rules/`, not `Mascot`

`Mascot` is the wrong component here: it hides on a phone, has empty alternative text, and carries `data-mascot`, which the tests and the phone rule treat as "a Cardmaker". `RulesPicture` reads `usePicture(useArt().mascotUrl('card_info'))`, renders nothing while `src` is `null` (not built, or failed to load), and otherwise an `<img>` with:
- the Turkish `alt` from the spec, kept in a constant next to the component;
- `data-rules-picture`, for tests;
- `decoding="async"`, `draggable={false}`, `pointer-events-none`, and the shared `drop-shadow-lift`.

The stem is a constant (`CARD_INFO_STEM = 'card_info'`) in the same file.

Alternative considered: a `decorative?: boolean` or `alt` prop on `Mascot`. Rejected: it would mix the phone rule, which is about the Cardmaker, with a picture that is information.

### D3. The rules text becomes block layout so that the float works

`RulesContent`'s wrapper becomes `flow-root max-w-[70ch] space-y-8` (it keeps `data-rules-text`, `leading-relaxed break-words text-ink`). `RulesSection` becomes `space-y-3` instead of `flex flex-col gap-3`, and `BulletList` `list-disc space-y-2 pl-6`. The spacing stays the same, and lines can now wrap around a float. `RulesPicture` is the first child of the first section, after its `h2`, so the section title stays on top as in v2.2.8's text and the first paragraph wraps beside it.

`space-y-*` puts a top margin on every child but the first, so the picture gets the same space below the `h2` as a paragraph would.

### D4. Sizes from v2.2.8, measured against the 70ch column

From `sm` (640 px) the picture floats right with one rule at every wider width: `sm:float-right sm:mb-4 sm:ml-6 sm:w-1/2`. v2.2.8's 52 % was of a column without a maximum width, capped at 540 px. Half of our 70ch column (about 330 px) is close to v2.2.8's tablet size (380 px) and leaves about 35 characters beside it, so one size serves desktop and tablet. The 540 px cap is never reached, so it is left out.

Below `sm`, the picture is a block at `w-full` with `mb-4`, no float. At 360 px it is about 328 px wide, so its labels stay readable; v2.2.8's 48 % (about 157 px) makes them a few pixels high.

### D5. The alternative text

"Bir kartın bölümleri: sol üst köşede maliyeti (Cost), ortada adı (Name), altında etkisi (Effect), sağ alt köşede seti (Set)." It names the four labels in the picture's own English words, in brackets, so a screen reader user hears the same terms a sighted player reads.

## Risks / Trade-offs

- **The float and the corner Cardmaker.** On a wide window the picture is inside the 70ch column, so it never reaches the corner Cardmaker's side of the screen. On a short window both can be on screen at once, the picture at the top and `cardmaker_wave` at the bottom right, in different columns: acceptable, as in v2.2.8.
- **Changing flex to block in `RulesContent`.** `gap` and `space-y` differ only for children that are not shown or are absolutely positioned; the rules have none. Existing tests read roles and headings, not layout classes, except the `max-w-[70ch]` check, which stays true.
- **A broken picture.** `usePicture` drops the `<img>` after an error, so no broken-image icon or empty float stays behind.
