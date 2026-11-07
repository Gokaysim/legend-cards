# app-shell Specification

## Purpose

Provides the frame that signed-in users work in: the navigation between the main screens of Legend Card Manager, the shared layout and visual theme, and the shell-level status messages shown on every screen.

## Requirements

### Requirement: Main screen navigation
The shell SHALL offer navigation to seven screens, with these labels in this order: "Oyuncu elleri", "Pack Shop", "True Words", "Kart kütüphanesi", "Cursed Deck", "İşlem Logu", "Veri / Yedek". Each screen SHALL have its own URL, so it can be bookmarked and reloaded. The navigation SHALL mark the current screen.

#### Scenario: Navigating between screens
- **WHEN** a signed-in user selects "Pack Shop" in the navigation
- **THEN** the Pack Shop screen is shown, the URL changes to that screen's address, and "Pack Shop" is marked as the current screen

#### Scenario: Reloading a screen URL
- **WHEN** a signed-in user reloads the browser on the True Words screen's URL
- **THEN** the True Words screen is shown again

#### Scenario: Default screen
- **WHEN** a signed-in user opens the application's root URL
- **THEN** the "Oyuncu elleri" screen is shown

### Requirement: Placeholder screens
Until a screen's feature exists, that screen SHALL show its title and a short Turkish note saying the screen is not built yet. It SHALL NOT show data or controls that do nothing.

#### Scenario: Opening an unbuilt screen
- **WHEN** a signed-in user opens the Cursed Deck screen before any Cursed Deck feature exists
- **THEN** the screen shows the title "Cursed Deck" and a note saying the screen is not ready yet

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
