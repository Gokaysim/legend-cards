## MODIFIED Requirements

### Requirement: Main screen navigation
The shell SHALL offer navigation to nine screens, with these labels in this order: "Oyuncu elleri", "Shops", "Custom Card Draft", "Kütüphane", "Setler", "Zarlar", "İşlem Logu", "Kurallar", "Veri / Yedek". Each screen SHALL have its own URL, so it can be bookmarked and reloaded. The navigation SHALL mark the current screen.

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
