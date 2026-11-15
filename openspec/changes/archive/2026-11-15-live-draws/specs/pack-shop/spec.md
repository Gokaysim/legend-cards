# Spec Delta

## ADDED Requirements

### Requirement: The open pack lies on the draw table
The open pack view SHALL use the draw table (spec: card-draws, "The draw table"). The pack, with its number of cards on it, SHALL stand where the deck stands, and its cards SHALL lie beside it. Above the table, the same chips as a draw SHALL name the pack, whose hand it is for and the payment, with the live mark and "Masa bekliyor" while it is open. Its title SHALL read "<owner> Pack açıyor".

#### Scenario: Watching a set pack
- **WHEN** Bora watches Ayla's open Kesqerian Nights Standard Pack, paid with 2 LP
- **THEN** his view reads "Ayla Pack açıyor", shows the chips "Kesqerian Nights Standard Pack", "Ayla'nın eline", "−2 LP" and "Masa bekliyor", and the Kesqer cardback with 5 on it beside the cards

#### Scenario: After the pack ends
- **WHEN** Ayla chooses a card and Bora's view stays open
- **THEN** "Masa bekliyor" and the live mark are gone, and the view says what was chosen

### Requirement: Draws and packs share one banner
The banner of a shrunk pack SHALL be the same as the banner of a shrunk draw (spec: live-draws, "Shrinking the watching view"): the live mark, a line that names the open pack, its cards as small pictures (face up when turned, the back otherwise), and "Göster".

#### Scenario: A shrunk pack
- **WHEN** Bora shrinks Ayla's open pack with three of its five cards face up
- **THEN** the banner shows the live mark, "Ayla Pack açıyor", three small faces and two small backs, and "Göster"
