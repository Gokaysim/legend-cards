# Proposal

## Why

Card faces are small: the library, the Cursed Deck and the hand show them about 150 pixels wide, so the art and the printed text are hard to read. The legacy app opens a card's picture large on a click ("zoom"), and the new app has no such view. In the library and the Cursed Deck a face does nothing when clicked.

The owner also wants the face of a card with a note to stay clean. Today a "✎ Not var" mark sits under every such face at all times. The owner wants a small note icon in the face's bottom-left corner that shows on hover.

## What Changes

- **A magnifier on every card face.** A "🔍" control sits in the face's top-right corner. It shows while the pointer rests on the face or the focus is inside it. On a device without hover, such as a phone, it shows at all times. It is on the faces of:
  - the Kart kütüphanesi
  - the Cursed Deck
  - the hand's card view
  - the card details (the dialog a hand card opens)
  - the revealed cards of draws and open packs

  A face-down card has none.
- **A zoom view.** Selecting the magnifier opens the card large in a dialog, as in the legacy app:
  - The title is the card's name. Under it is one line with the set, the cost and the rarity, leaving out what the card does not have: "Kesqerian Nights · Cost 1 · Common", "Cursed · Cost 1", and just "Blessed" for a Blessed card, which has neither.
  - The card's picture is shown as large as the screen allows, up to the picture's own size.
  - A card without a picture shows its CSS face, larger.
  - Opened from a hand where the card's cost differs, the line and the picture show the hand cost, as the face does.
  - Nothing else is shown: no marks, no note, no controls. The view is the same for the DM and the players.
  - It closes with "✕ Kapat", Escape, or a click or tap outside it. Opened from the card details, a draw or an open pack, closing it leaves that dialog open.
- **In the hand, the face keeps opening the card details.** Selecting the rest of a hand card's face opens its details, as today. Only the magnifier opens the zoom view.
- **The note icon replaces the "Not var" mark.** A held card with a note shows a "✎" icon in its face's bottom-left corner. The icon follows the magnifier's rules: it shows while the pointer rests on the face or the focus is inside it, and at all times on a device without hover. Screen readers still read "Not var" on the face. The "● Aktif", "Ek kopya" and "Elde:" marks do not change.
- **The zoom view is local.** Opening it writes nothing and shows on no other device.

Out of scope:
- **Zoom on True Word tiles, pack tiles and cardbacks.** Only card faces get the magnifier.
- **The list views.** A table row has no face, so it gets no magnifier. The hand list keeps its own note marker.
- **Showing the note's text on the face.** The icon only says that a note exists. The text stays in the card details.

## Capabilities

### New Capabilities
- `card-zoom`: the magnifier on card faces and the zoom view it opens. Covers:
  - which faces have the magnifier, and when it shows
  - what the zoom view shows, with and without a picture, and with a hand cost
  - closing it, including from inside another dialog
  - its fit at phone width

### Modified Capabilities
- `card-holdings`: the "Card notes" requirement says a card with a note "SHALL be marked in the hand". It now says how: the note icon in the face's bottom-left corner, shown on hover or focus, and at all times without hover.
- `card-images`: the "Set, rarity and mechanic pack on the set symbol" requirement has a scenario in which a hand card's picture shows the "Not var" mark. It now shows the note icon instead.

## Impact

- **New code:** in `src/features/cards/`:
  - `CardZoomDialog`, the zoom view
  - a shared cost badge, taken out of `CardFace`, so the zoomed picture shows the hand cost the same way
- **Changed code:**
  - `src/features/cards/CardFace.tsx`:
    - the magnifier and the zoom state
    - the note icon in place of the "Not var" mark
    - an `onOpen` prop for a face that opens something when selected
  - `src/features/hands/HandView.tsx`: the hand passes `onOpen` to the face, which replaces its own covering button.
  - `src/components/ui/Dialog.tsx`:
    - It ignores a `close` event from a dialog nested inside it. Otherwise closing the zoom view would also close the card details, the draw or the pack around it.
    - It gets a `closeOnBackdrop` option, which the zoom view uses: a click outside the dialog closes it. The other dialogs keep closing only with their button or Escape.
- **Tests:**
  - unit tests for the magnifier, the zoom view, the note icon and the nested dialog
  - the hand and card face tests that look for "Not var" change with the mark
- **Docs:**
  - `docs/domain.md`: the zoom view, and the note icon in place of the mark
  - `docs/conventions.md`: the face's magnifier and nested dialogs
- **Data and rules:** none. No Firestore path or rule changes.
- **Dependencies:** none new.
