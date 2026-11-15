# app-shell Specification

## Purpose

Provides the frame that signed-in users work in: the navigation between the main screens of Legend Card Manager, the shared layout and visual theme, and the shell-level status messages shown on every screen.

## Requirements

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

### Requirement: Placeholder screens
Until a screen's feature exists, that screen SHALL show its title row and, under it, a "Yakında" panel: a neutral card back that drifts slowly, "YAKINDA" in gold over an ornament line, and the note "Bu ekran henüz hazır değil." in smaller, muted text. With reduced motion, the card SHALL stay still. The screen SHALL NOT show data or controls that do nothing.

#### Scenario: Opening an unbuilt screen
- **WHEN** a signed-in user opens the Custom Card Draft screen before any Custom Card Draft feature exists
- **THEN** the screen shows the title "Custom Card Draft", and under it a slowly drifting card back, "YAKINDA" and "Bu ekran henüz hazır değil."

#### Scenario: Reduced motion
- **WHEN** a user whose device asks for reduced motion opens Veri / Yedek
- **THEN** the "Yakında" panel shows the card back standing still

#### Scenario: The Elixir Shop
- **WHEN** a user opens the Elixir Shop
- **THEN** its title row keeps the "← Shops" link, and the "Yakında" panel is under it

#### Scenario: Phone width
- **WHEN** an unbuilt screen is shown 360 CSS pixels wide
- **THEN** the "Yakında" panel fits the width, and the page has no horizontal scrollbar

### Requirement: Not-found page
An unknown URL inside the application SHALL show a not-found message with a link back to the default screen.

#### Scenario: Unknown address
- **WHEN** a signed-in user opens an application URL that matches no screen
- **THEN** a not-found message is shown with a link that leads to the "Oyuncu elleri" screen

### Requirement: Turkish interface text
All interface text written for this application SHALL be in Turkish. The established game terms stay in English as in the legacy design, for example Pack, Cursed, Blessed, True Words, and LP.

#### Scenario: Reading the interface
- **WHEN** a user reads the navigation, the placeholder notes, the status messages, or the not-found page
- **THEN** that text is in Turkish, and the game terms keep their English names

### Requirement: Responsive layout
On wide screens the shell SHALL show the navigation as a permanent sidebar. At narrow widths, down to 360 CSS pixels, the shell SHALL show the navigation as a menu that opens and closes. The page SHALL NOT scroll horizontally at any of these widths.

#### Scenario: Desktop width
- **WHEN** the application is shown in a window at least 1024 CSS pixels wide
- **THEN** the navigation sidebar is visible next to the screen content

#### Scenario: Phone width
- **WHEN** the application is shown 360 CSS pixels wide
- **THEN** the navigation is hidden behind a menu button and the page has no horizontal scrollbar

#### Scenario: Choosing a screen from the phone menu
- **WHEN** a user at phone width opens the menu and selects a screen
- **THEN** that screen is shown and the menu closes

### Requirement: Legacy visual theme
The shell SHALL use a dark theme based on the legacy design's palette: a near-black blue background, layered dark panes, light text, muted secondary text, and a gold accent. It SHALL also have dedicated colors for cursed (red), blessed (cream), and True Words (purple) content. Text SHALL keep a contrast ratio of at least 4.5:1 against its background.

#### Scenario: Default appearance
- **WHEN** any screen is shown
- **THEN** the page uses the dark background and light text, and the current screen's marker in the navigation uses the gold accent

#### Scenario: Readable text
- **WHEN** ordinary body text or muted secondary text is shown on the background or on a pane
- **THEN** its contrast ratio against that surface is at least 4.5:1

### Requirement: Offline status banner
When the device has no network connection, the shell SHALL show a Turkish banner saying the user is offline and that changes will sync when the connection returns. The banner SHALL disappear when the connection comes back.

#### Scenario: Losing the connection
- **WHEN** the device goes offline while the application is open
- **THEN** a banner appears saying the user is offline and changes will sync when the connection returns

#### Scenario: Connection restored
- **WHEN** the device comes back online
- **THEN** the offline banner disappears without a page reload

### Requirement: Application identity and version
The shell SHALL show the application name "Legend Cards" and the current application version number.

#### Scenario: Seeing the version
- **WHEN** a signed-in user looks at the navigation area
- **THEN** it shows "Legend Cards" and the version number of the running build

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
