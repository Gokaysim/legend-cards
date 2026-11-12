# Proposal

## Why

The owner found that the "Seçili Kart" panel beside the hand "did not turn out well". Several things cause this:

- The panel stacks two headings, "Seçili Kart" and the card's name.
- It keeps the face small, at 208 px in a 312 px panel.
- It writes the card's name and text again under a picture that already shows them.
- It lists the set, rarity and mechanic pack as flat grey lines.
- It puts the player's and the DM's controls in one wrapping row.

On 2026-11-12, the owner compared three directions on a design canvas (https://claude.ai/artifact/GDTJzngEkzMCoJXwmW1wkC) and chose **V1 · Vitrin**.

## What Changes

- **Header.** The panel's title becomes a small upper-case "Seçili Kart" label. The card's state shows beside it as badges: "Aktif" in green, "Ek kopya".
- **The face.** It fills the panel's width, about 264 px. While active, it has its active glow: green, or red or pearl white for a Cursed or Blessed card. Otherwise it glows in its kind's reveal color.
- **No repeated text.** Under a picture, the card's name and text are no longer written again. Screen readers still hear them.
- **Labels.** Pills under the face give the set, the rarity, the cost and the mechanic pack. A Cursed card shows "Cursed" and its cost, and a Blessed card "Blessed", its cost and its mechanic pack. A changed hand cost reads "Cost 1 (temel: 3)".
- **Holder line.** A line with a person icon says who holds the card: "Oyuncu 1'in elinde".
- **The note.** It sits on cream note paper, like the scrolls printed on the cards. The holder and the DM edit it there; other players read it, and see "Not yok." when there is none.
- **"Kullan".** It becomes a full-width main button.
- **DM tools.** The DM's tools move into their own section, headed "DM araçları":
  - the cost in this hand, as a small field with "temel: <cost>" beside it
  - three equal buttons: "Aktif et" or "Aktifliği kaldır", "Başkasına ver", "At"

  The confirmation steps open in that place, as today.
- **Empty panel.** Without a selection, the panel shows an empty card slot with dashed edges, "Bir kart seç", and "Elden bir karta tıkla, ayrıntıları burada görünsün."
- **The dialog.** On a narrower window, the card details dialog uses the same pieces. It keeps its title with the card's name. From 640 px, the face stands at the left of the rest.
- **True Words.** The "Seçili True Word" panel and the True Word dialog follow the same frame:
  - the small label with an "Aktif" badge
  - the word's picture large, glowing purple while active
  - pills for its cost and for how it was learned
  - the holder line
  - the DM's "Aktif et" or "Aktifliği kaldır" and "Geri al" under "DM araçları"
  - an empty slot with "Bir True Word seç"

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-holdings`:
  - the panel's empty state and its "Seçili Kart" label
  - new requirements for what the card details show
  - where the note shows
  - how the actions are grouped
- `visual-effects`: the selected card's panel names the card for screen readers, while the picture shows its name.
- `true-words`: the word's details and the "Seçili True Word" panel's empty state in the new frame.

## Impact

- **Code:**
  - `src/features/hands/HandDetailsPanel.tsx`, `HoldingDetails.tsx` and `HoldingDialog.tsx`, and the panel's use in `HandsPage.tsx`
  - `src/features/true-words/TrueWordDetails.tsx` and `TrueWordDialog.tsx`
  - possibly small shared pieces: a pill label, the note paper, an empty card slot
- **Tests:** `HandDetailsPanel`, `HoldingDialog`, `HandsPage`, `HandView`, `TrueWordDetails` and `TrueWordDialog` tests, where they look for the old headings, lines and empty text.
- **Data:** no data, rules or emulator change.
- **Order:** built after `polish-cards-packs-and-mascots`, whose double click also reaches the face in the panel.
