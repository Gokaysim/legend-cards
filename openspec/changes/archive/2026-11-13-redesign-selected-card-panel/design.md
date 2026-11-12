# Design

## Context

See proposal.md for why. The chosen look is the **V1 · Vitrin** artboard on the design canvas (https://claude.ai/artifact/GDTJzngEkzMCoJXwmW1wkC). It is drawn at the panel's real width of 312 px, in the player's and the DM's view and with nothing selected. The canvas also keeps the panel as it is today, for comparison. What the details must show is in the delta specs: `card-holdings`, `visual-effects` and `true-words`.

This is the current state that shapes the approach:

- **`HandDetailsPanel`** (`src/features/hands/`) is the sticky `<section>` beside the hand. It holds an `<h2>` title, an `<h3>` with the selection's name, and the children, or an empty line. `HandsPage` renders it twice, once with "Seçili Kart" and once with "Seçili True Word".
- **`HoldingDetails`** draws a held card's details for both the panel (`layout="panel"`) and `HoldingDialog` (`layout="dialog"`). It shows:
  - the `CardFace`
  - "<name>'in elinde"
  - the info lines from `infoLines(card)`, and the visible text
  - the note field, and the cost field for the DM
  - one wrapping row of buttons, with the steps `use`, `discard` and `transfer` replacing it

  Its rules (who may use, edit or discard, the table-busy note, offline moves) stay as they are.
- **`TrueWordDetails`** draws a word's picture, a `<dl>` (Kimde, Cost, Nasıl, Durum), the text (screen readers only when there is a picture), the retired note, and the DM's two buttons with the take-back step.
- **Colors.** The cream note colors already exist as tokens: `bubble`, `bubble-deep`, `bubble-line`, `bubble-title`, `bubble-ink` and `bubble-ink-muted`, tested for contrast in `theme.test.ts`. The glows already exist as `drop-shadow-*` tokens, and `glow-word` is the active True Word's utility. Glow colors are light, never text.
- **Glows.** `CardFace` picks its glow with `faceGlow()`. An active card gets its active glow (green, red or pearl), and `isRevealed` gives a kind's reveal glow.

## Goals / Non-Goals

**Goals:**
- One frame for both kinds of details: a small label with badges, a large picture, labels, a holder line, then the actions. The card and the True Word panels look like siblings.
- The panel and the dialog share every piece, as today, so a fix lands in both.
- No new color without a contrast test: text uses existing ink tokens, and the kind colors appear only as borders and light.

**Non-Goals:**
- No change to who may do what, to the steps' wording, or to the data.
- No change to the hand's card view, the list view, or the gold glow of the selected card in the hand.
- No visual change to the True Words screen or the draft panel. Only the hand's details change.

## Decisions

### D1. The panel is the frame, the details fill it

`HandDetailsPanel` gets new props:
- `label`, "Seçili Kart" or "Seçili True Word", drawn as a small upper-case `<h2>` that names the region
- `badges`, drawn at the label's right
- `name`, drawn as an `<h3 class="sr-only">`, so screen readers hear the selection's name as its heading, as the `visual-effects` delta asks
- `empty`, a title and a hint, drawn by `EmptyCardSlot` when nothing is selected

`HandsPage` passes the badges, built by small helpers next to each details component: `holdingBadges(entry)` and `wordBadges(entry)`. `HoldingDialog` and `TrueWordDialog` keep `Dialog`'s visible title with the name, and the details draw the badges at their own top when `layout="dialog"`.

- **Alternative: the details draw their own label row.** The panel is shared by both details and owns the sticky region and its name, so the label stays there.

### D2. Small shared pieces in `components/ui`

Four pieces are generic enough for the hand and the True Words feature both. Putting them in `src/components/ui/` keeps `true-words` from importing `hands`.

- **`Pill`:** a rounded label in `bg-pane-raised`, `border-line` and ink text. It has an optional `tone` that only changes the border: `common`, `gold` (Rare), `cursed`, `blessed` or `true-word`. Text stays `ink` or `ink-muted`, so there is no new contrast pair.
- **`NotePaper`:**
  - the cream note: a gradient from `bubble` to `bubble-deep`, the `bubble-line` border, and the label in `bubble-title` upper case
  - either a transparent `<textarea>` in `bubble-ink`, with the placeholder in `bubble-ink-muted`, or read-only text, with "Not yok." when empty
  - a focus outline in `bubble-title`, which keeps 3:1 against the cream
- **`ToolSection`:** a heading between two lines, used for "DM araçları".
- **`EmptyCardSlot`:** a dashed card-shaped box at the card's 563/788 ratio, with an outline icon, a title and a hint.

The "Aktif" badge uses the `green` text token on a faint `green` surface. Its pair is added to `theme.test.ts` on `pane`.

### D3. The card's details in V1's order

`HoldingDetails` draws these, from top to bottom:
1. **The badges, in the dialog only:** "Aktif" and "Ek kopya".
2. **The face:**
   - `CardFace` at `w-full max-w-66` (264 px, about the panel's inner width), with `isRevealed` so it glows as a revealed card of its kind; `isActive` still wins with the active glow
   - a soft radial light behind it in the same color, static
   - the note icon and the magnifier stay on the face; its marks ("● Aktif", "Ek kopya") show only as the badges at the top, as on the V1 artboard, so `CardFace` gets `showsMarks={false}` here (decided while implementing)
3. **The labels:**
   - a `Pill` row: set, rarity (the `tone` from the kind's frame), cost, and mechanic pack
   - a Cursed card: "Cursed" and the cost only
   - a Blessed card: "Blessed", the cost and the mechanic pack
   - a changed hand cost: "Cost 1 (temel: 3)"

   This replaces `infoLines` and the visible-text paragraph. The text stays on the face for screen readers, as `CardFace` already writes it.
4. **The holder line:** an `aria-hidden` person icon and "<name>'in elinde", with `genitive`.
5. **The note:** `NotePaper`, editable for the holder and the DM, read-only for others.
6. **"Kullan":** the primary button across the full width, `h-11`, for the holder and the DM.
7. **The DM's tools**, under `ToolSection` "DM araçları":
   - the cost row: the label "Bu eldeki cost", a 3.5rem centered input, and "temel: <cost>"
   - three equal buttons in a grid, each an icon over its label: "Aktif et" or "Aktifliği kaldır", "Başkasına ver", "At"
8. **A step:** `use`, `discard` or `transfer` opens in place of "Kullan" and the three buttons. The cost row stays.
9. **The rest:** `TableBusyNote` and the failure alert come last, as today.

In `layout="dialog"`, the face column stands at the left of the rest from `sm` (640 px), at `w-60`, as today, and above it on a phone.

### D4. A word's details in the same frame

`TrueWordDetails` draws:
- the badges (dialog only)
- the picture at `w-full max-w-66`, with the `glow-word` utility while active
- `Pill`s for "<cost> LP" and "Draft'tan öğrendi" or "DM öğretti"
- the holder line "<name> biliyor"
- the retired note when it applies
- under "DM araçları", two equal buttons, "Aktif et" or "Aktifliği kaldır" and "Geri al", with the take-back step in their place

The `<dl>` goes. A word without a picture shows its name and text in a pane in the picture's place, as today.

### D5. Icons

The new controls use small inline SVG icons with `aria-hidden`, stroked in the button's text color:
- a bolt for "Kullan"
- a power symbol for the active switch
- an arrow for "Başkasına ver"
- a bin for "At"
- a person for the holder line
- a card outline in the empty slot

The button labels stay text, so tests and screen readers keep their names. The old "●" and "✓" glyphs in the active switch's label go, because the icon shows the state.

## Risks / Trade-offs

- **[Risk] The panel gets taller: a 264 px face, the note and the DM tools.** It is already sticky with `max-h-[calc(100dvh-2rem)]` and scrolls inside on a short window, so nothing is cut off.
- **[Risk] Tests that look for the old empty line, the info lines, "● Aktif et" or the `<dl>` break.** Tasks update them with the new texts from the delta specs. The heading roles stay, because the label is still an `<h2>` and the name an `<h3>`.
- **[Trade-off] The card's name and text are no longer visible next to a picture.** They are printed on the picture, read by screen readers, and the zoom view shows them large. A card without a picture still writes them on its face.
- **[Trade-off] The kind colors appear only as pill borders and light.** That keeps every text pair inside the tested tokens, at the cost of the canvas's orange "Rare" text.
