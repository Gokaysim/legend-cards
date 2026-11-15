## MODIFIED Requirements

### Requirement: Main screen navigation
The shell SHALL offer navigation to eight screens, with these labels in this order: "Oyuncu elleri", "Shops", "Custom Card Draft", "Kütüphane", "Setler", "İşlem Logu", "Kurallar", "Veri / Yedek". Each screen SHALL have its own URL, so it can be bookmarked and reloaded. The navigation SHALL mark the current screen.

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
- **THEN** the Setler screen is shown under its own URL, and "Setler" is marked, between "Kütüphane" and "İşlem Logu"

#### Scenario: One entry for the Kütüphane
- **WHEN** a signed-in user looks at the navigation
- **THEN** it has "Kütüphane" between "Custom Card Draft" and "Setler", and no "Kart kütüphanesi", "Cursed Deck" or "True Words" entry

## ADDED Requirements

### Requirement: Former addresses of the merged screens
The former addresses of the Cursed Deck and the True Words screens SHALL open the Kütüphane on its Cursed tab and its True Words tab. A True Words address that names a player SHALL keep that player. The former address of a Cursed card's Kart geçmişi SHALL open that page under the Kütüphane's address. The browser history SHALL keep only the new address.

#### Scenario: An old Cursed Deck bookmark
- **WHEN** a signed-in user opens the former Cursed Deck address
- **THEN** the Kütüphane is shown on its Cursed tab, "Kütüphane" is marked in the navigation, and the address is the Cursed tab's

#### Scenario: An old True Words link for a player
- **WHEN** the DM opens the former True Words address that names Bora
- **THEN** the Kütüphane is shown on its True Words tab with Bora chosen

#### Scenario: An old Kart geçmişi address
- **WHEN** a signed-in user opens the former Kart geçmişi address of the Cursed card "Abandon All Hope"
- **THEN** the Kart geçmişi of "Abandon All Hope" is shown under the Kütüphane's address

#### Scenario: Going back
- **WHEN** a user opens the former Cursed Deck address from the Setler screen and then goes back in the browser
- **THEN** the Setler screen is shown, and the former address is not opened again
