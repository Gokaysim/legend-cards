# Spec Delta

## MODIFIED Requirements

### Requirement: Rules screen layout
The Kurallar screen SHALL place its Cardmaker as card-images says: in the bottom-right corner on a wide window with a mouse, next to its title on a tablet or a narrower window, and nowhere on a phone. Its text SHALL keep a readable line length of about 70 characters, so that on a wide window the Cardmaker stands in the space beside it. It SHALL be readable at every width the shell supports, down to 360 CSS pixels, without horizontal scrolling.

#### Scenario: A desktop
- **WHEN** the Kurallar screen is shown on a 1440 CSS pixel wide window with a mouse
- **THEN** `cardmaker_wave` stands in the bottom-right corner, and the text's lines end before her

#### Scenario: A tablet
- **WHEN** the Kurallar screen is shown on a tablet 800 CSS pixels wide
- **THEN** `cardmaker_wave` is next to the title

#### Scenario: Phone width
- **WHEN** the Kurallar screen is shown 360 CSS pixels wide
- **THEN** the text wraps to the width, no Cardmaker is shown, and the page has no horizontal scrollbar

#### Scenario: Without pictures
- **WHEN** the pictures are not built
- **THEN** the Kurallar screen shows its title and the full text, without a Cardmaker
