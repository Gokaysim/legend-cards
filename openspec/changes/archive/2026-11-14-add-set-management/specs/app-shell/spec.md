## MODIFIED Requirements

### Requirement: Main screen navigation
The shell SHALL offer navigation to ten screens, with these labels in this order: "Oyuncu elleri", "Shops", "True Words", "Custom Card Draft", "Kart kütüphanesi", "Setler", "Cursed Deck", "İşlem Logu", "Kurallar", "Veri / Yedek". Each screen SHALL have its own URL, so it can be bookmarked and reloaded. The navigation SHALL mark the current screen.

#### Scenario: Navigating between screens
- **WHEN** a signed-in user selects "Kurallar" in the navigation
- **THEN** the Kurallar screen is shown, the URL changes to that screen's address, and "Kurallar" is marked as the current screen

#### Scenario: Reloading a screen URL
- **WHEN** a signed-in user reloads the browser on the True Words screen's URL
- **THEN** the True Words screen is shown again

#### Scenario: Default screen
- **WHEN** a signed-in user opens the application's root URL
- **THEN** the "Oyuncu elleri" screen is shown

#### Scenario: The Setler screen
- **WHEN** a signed-in user selects "Setler" in the navigation
- **THEN** the Setler screen is shown under its own URL, and "Setler" is marked, between "Kart kütüphanesi" and "Cursed Deck"
