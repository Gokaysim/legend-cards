# Spec Delta

## MODIFIED Requirements

### Requirement: Placeholder screens
Until a screen's feature exists, that screen SHALL show its title and a short Turkish note saying the screen is not built yet. It SHALL NOT show data or controls that do nothing.

#### Scenario: Opening an unbuilt screen
- **WHEN** a signed-in user opens the Custom Card Draft screen before any Custom Card Draft feature exists
- **THEN** the screen shows the title "Custom Card Draft" and a note saying the screen is not ready yet
