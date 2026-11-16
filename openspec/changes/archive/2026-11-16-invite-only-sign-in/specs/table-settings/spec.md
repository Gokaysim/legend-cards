# Spec Delta

## MODIFIED Requirements

### Requirement: The Ayarlar screen
The Ayarlar screen SHALL show a "Masa ayarları" section with "Oyuncu kart çekişi" as a choice of its three modes, each with a Turkish line on what it allows. For the DM only, it SHALL then show the "Masaya erişim" section (spec: table-access, "The 'Masaya erişim' section"). Last, it SHALL show a "Veri / Yedek" section that says in Turkish that it is coming soon. The DM SHALL change the mode there. A player SHALL see the chosen mode without a control to change it.

#### Scenario: The DM changes the mode
- **WHEN** the DM chooses "Kart seçme" on the Ayarlar screen
- **THEN** the mode is "Kart seçme" on every device, without a reload

#### Scenario: A player's view
- **WHEN** Ayla opens the Ayarlar screen while the mode is "Filtreli çekiş"
- **THEN** she sees "Filtreli çekiş" as the chosen mode, and no control changes it

#### Scenario: The sections in order
- **WHEN** the DM opens the Ayarlar screen
- **THEN** the sections are "Masa ayarları", "Masaya erişim" and "Veri / Yedek", in this order, and a player sees only "Masa ayarları" and "Veri / Yedek"

#### Scenario: Phone width
- **WHEN** the Ayarlar screen is shown 360 CSS pixels wide
- **THEN** the choices and their lines fit the width, and the page has no horizontal scrollbar
