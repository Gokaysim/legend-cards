# Spec Delta

## MODIFIED Requirements

### Requirement: Set, rarity and mechanic pack on the set symbol
On a card face with a picture, the set, rarity and mechanic pack SHALL show in a note only while the pointer rests on the picture's set symbol in its bottom-right corner, or after the symbol is tapped until it loses the focus. A Cursed card SHALL have no note. The note SHALL stay inside the picture, and stay readable to screen readers while hidden.

#### Scenario: The set symbol
- **WHEN** a user rests the pointer on the set symbol of "Aboleth's Eyes", or taps it
- **THEN** a note shows "Kesqerian Nights · Common" and its mechanic pack, and it goes away when the pointer leaves or the symbol loses the focus

#### Scenario: A marked card in a hand
- **WHEN** Ayla's hand shows her active card with a note, and a user rests the pointer on it
- **THEN** its face shows the picture with the "● Aktif" mark, and the "✎" note icon in the picture's bottom-left corner
