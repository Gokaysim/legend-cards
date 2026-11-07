# Spec Delta

## MODIFIED Requirements

### Requirement: Main screen navigation
The shell SHALL offer navigation to nine screens, with these labels in this order: "Oyuncu elleri", "Shops", "True Words", "Custom Card Draft", "Kart kütüphanesi", "Cursed Deck", "İşlem Logu", "Kurallar", "Veri / Yedek". Each screen SHALL have its own URL, so it can be bookmarked and reloaded. The navigation SHALL mark the current screen.

#### Scenario: Navigating between screens
- **WHEN** a signed-in user selects "Kurallar" in the navigation
- **THEN** the Kurallar screen is shown, the URL changes to that screen's address, and "Kurallar" is marked as the current screen

#### Scenario: Reloading a screen URL
- **WHEN** a signed-in user reloads the browser on the True Words screen's URL
- **THEN** the True Words screen is shown again

#### Scenario: Default screen
- **WHEN** a signed-in user opens the application's root URL
- **THEN** the "Oyuncu elleri" screen is shown

## ADDED Requirements

### Requirement: Shops hub
The Shops screen SHALL lead to two shop sub-screens: "Pack Shop" and "Elixir Shop". Each sub-screen SHALL have its own URL below the Shops screen's URL and SHALL offer a way back to the Shops screen. While a shop sub-screen is shown, the navigation SHALL mark "Shops" as the current screen. The sub-screens SHALL NOT be separate entries in the navigation.

#### Scenario: Choosing a shop
- **WHEN** a signed-in user on the Shops screen selects "Pack Shop"
- **THEN** the Pack Shop screen is shown, the URL changes to the Pack Shop address below the Shops address, and "Shops" stays marked as the current screen in the navigation

#### Scenario: Opening an unbuilt shop
- **WHEN** a signed-in user opens the Elixir Shop screen before any Elixir Shop feature exists
- **THEN** the screen shows the title "Elixir Shop", a note saying the screen is not ready yet, and a link back to the Shops screen

#### Scenario: Going back to Shops
- **WHEN** a signed-in user on the Pack Shop screen follows the link back to Shops
- **THEN** the Shops screen is shown with both shop choices

#### Scenario: Reloading a shop URL
- **WHEN** a signed-in user reloads the browser on the Elixir Shop screen's URL
- **THEN** the Elixir Shop screen is shown again and "Shops" is marked as the current screen
