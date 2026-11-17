## MODIFIED Requirements

### Requirement: The Ayarlar screen
The Ayarlar screen SHALL show a "Masa ayarları" section with "Oyuncu kart çekişi" as a choice of its three modes, each with a Turkish line on what it allows. For the DM only, it SHALL then show the "Masaya erişim" section (spec: table-access, "The 'Masaya erişim' section"). Last, it SHALL show a "Veri / Yedek" section. For the DM, that section SHALL hold "Zar kanalı", with a Turkish line on what a reset deletes and leaves alone, and "Zar kanalını sıfırla" (spec: dice-rolls, "Resetting the dice channel"). For everyone, it SHALL say in Turkish that backup and restore are coming soon. The DM SHALL change the mode there. A player SHALL see the chosen mode without a control to change it.

#### Scenario: The DM changes the mode
- **WHEN** the DM chooses "Kart seçme" on the Ayarlar screen
- **THEN** the mode is "Kart seçme" on every device, without a reload

#### Scenario: A player's view
- **WHEN** Ayla opens the Ayarlar screen while the mode is "Filtreli çekiş"
- **THEN** she sees "Filtreli çekiş" as the chosen mode, and no control changes it

#### Scenario: The sections in order
- **WHEN** the DM opens the Ayarlar screen
- **THEN** the sections are "Masa ayarları", "Masaya erişim" and "Veri / Yedek", in this order, and a player sees only "Masa ayarları" and "Veri / Yedek"

#### Scenario: The DM's data section
- **WHEN** the DM opens the Ayarlar screen
- **THEN** "Veri / Yedek" shows "Zar kanalı" with its line and "Zar kanalını sıfırla", and the note that backup and restore are coming soon

#### Scenario: A player's data section
- **WHEN** Ayla opens the Ayarlar screen
- **THEN** "Veri / Yedek" shows only the note that backup and restore are coming soon, and no reset

#### Scenario: Phone width
- **WHEN** the Ayarlar screen is shown 360 CSS pixels wide
- **THEN** the choices and their lines fit the width, "Zar kanalını sıfırla" stays in view, and the page has no horizontal scrollbar

### Requirement: Change records
Each change of the mode SHALL be stored permanently with who changed it, when, the mode before and the mode after. Only the DM SHALL create one, together with the change of the mode it records. Each dice channel reset SHALL be stored permanently as a change record too, with who reset it, when, and how many rolls it deleted; only the DM SHALL create one. Every signed-in user SHALL be able to read every change record. No record SHALL be changed or deleted.

#### Scenario: A stored change
- **WHEN** the DM sets "Filtreli çekiş" from "Kapalı"
- **THEN** a change record names the DM, the time, "Kapalı" before and "Filtreli çekiş" after

#### Scenario: A record without its change
- **WHEN** the DM writes a change record without changing the mode
- **THEN** the server denies it

#### Scenario: A stored reset
- **WHEN** the DM resets a dice channel of 142 rolls
- **THEN** a change record names the DM, the time and 142 rolls

#### Scenario: A player records a reset
- **WHEN** Ayla writes a dice reset change record
- **THEN** the server denies it

#### Scenario: A malformed reset record
- **WHEN** the DM writes a dice reset record with a negative or fractional number of rolls, at another time than the server's, or naming another user
- **THEN** the server denies it

#### Scenario: Changing a record
- **WHEN** any signed-in user, including the DM, tries to change or delete a change record
- **THEN** the server denies it

#### Scenario: Signed-out read
- **WHEN** a request without a signed-in user tries to read the mode or a change record
- **THEN** the server denies it
