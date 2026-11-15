# Spec Delta

## MODIFIED Requirements

### Requirement: Main screen navigation
The shell SHALL offer navigation to nine screens, with these labels in this order: "Oyuncu elleri", "Shops", "Custom Card Draft", "Kütüphane", "Setler", "Zarlar", "İşlem Logu", "Kurallar", "Ayarlar". Each screen SHALL have its own URL, so it can be bookmarked and reloaded. The navigation SHALL mark the current screen.

#### Scenario: Navigating between screens
- **WHEN** a signed-in user selects "Kurallar" in the navigation
- **THEN** the Kurallar screen is shown, the URL changes to that screen's address, and "Kurallar" is marked as the current screen

#### Scenario: Reloading a screen URL
- **WHEN** a signed-in user reloads the browser on the address of the Kütüphane's True Words tab
- **THEN** the Kütüphane is shown again, on its True Words tab

#### Scenario: Default screen
- **WHEN** a signed-in user opens the application's root URL
- **THEN** the "Oyuncu elleri" screen is shown

#### Scenario: The Setler screen
- **WHEN** a signed-in user selects "Setler" in the navigation
- **THEN** the Setler screen is shown under its own URL, and "Setler" is marked, between "Kütüphane" and "Zarlar"

#### Scenario: One entry for the Kütüphane
- **WHEN** a signed-in user looks at the navigation
- **THEN** it has "Kütüphane" between "Custom Card Draft" and "Setler", and no "Kart kütüphanesi", "Cursed Deck" or "True Words" entry

#### Scenario: The Zarlar screen
- **WHEN** a signed-in user selects "Zarlar" in the navigation
- **THEN** the Zarlar screen is shown under its own URL, and "Zarlar" is marked, between "Setler" and "İşlem Logu"

#### Scenario: The Ayarlar screen
- **WHEN** a signed-in user selects "Ayarlar" in the navigation
- **THEN** the Ayarlar screen is shown under the address the Veri / Yedek screen had, "Ayarlar" is marked as the last entry, and there is no "Veri / Yedek" entry

### Requirement: Placeholder screens
Until a screen's feature exists, that screen SHALL show its title row and, under it, a "Yakında" panel: a neutral card back that drifts slowly, "YAKINDA" in gold over an ornament line, and the note "Bu ekran henüz hazır değil." in smaller, muted text. With reduced motion, the card SHALL stay still. The screen SHALL NOT show data or controls that do nothing.

#### Scenario: Opening an unbuilt screen
- **WHEN** a signed-in user opens the Custom Card Draft screen before any Custom Card Draft feature exists
- **THEN** the screen shows the title "Custom Card Draft", and under it a slowly drifting card back, "YAKINDA" and "Bu ekran henüz hazır değil."

#### Scenario: Reduced motion
- **WHEN** a user whose device asks for reduced motion opens Custom Card Draft
- **THEN** the "Yakında" panel shows the card back standing still

#### Scenario: The Elixir Shop
- **WHEN** a user opens the Elixir Shop
- **THEN** its title row keeps the "← Shops" link, and the "Yakında" panel is under it

#### Scenario: Phone width
- **WHEN** an unbuilt screen is shown 360 CSS pixels wide
- **THEN** the "Yakında" panel fits the width, and the page has no horizontal scrollbar
