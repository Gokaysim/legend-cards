# Spec Delta

## MODIFIED Requirements

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
