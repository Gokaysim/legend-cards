# Spec Delta

## MODIFIED Requirements

### Requirement: The banner while a mode is on
While the mode is not "Kapalı", every screen SHALL show every signed-in user a banner that names the mode and says in Turkish what a player may do when drawing, the price of a draw included: 1 LP unless whoever draws changes it (spec: card-draws, "The draw price while the mode is on"). The Ayarlar screen's line for each mode that is not "Kapalı" SHALL say the same about the price. The DM's banner SHALL offer "Kapat", which sets the mode to "Kapalı". With "Kapalı", no banner SHALL be shown.

#### Scenario: A player sees the banner
- **WHEN** the DM sets "Filtreli çekiş" while Ayla is on the library screen
- **THEN** a banner on her screen says that "Filtreli çekiş" is on, that she can choose the set, cost, mechanic pack and rarity when drawing, and that a draw costs 1 LP unless she changes the price

#### Scenario: The price on the Ayarlar screen
- **WHEN** Ayla opens the Ayarlar screen
- **THEN** the lines of "Filtreli çekiş" and "Kart seçme" say that a draw costs 1 LP unless whoever draws changes the price, and the line of "Kapalı" does not mention a price

#### Scenario: The DM closes it
- **WHEN** the DM selects "Kapat" on the banner while the mode is "Kart seçme"
- **THEN** the mode is "Kapalı", and the banner goes away on every device

#### Scenario: No banner for players to close
- **WHEN** Ayla sees the banner
- **THEN** it has no "Kapat"

#### Scenario: Phone width
- **WHEN** the banner is shown 360 CSS pixels wide
- **THEN** its text wraps, "Kapat" stays in view, and the page has no horizontal scrollbar
