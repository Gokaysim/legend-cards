## ADDED Requirements

### Requirement: The card anatomy picture
Where the `card_info` picture is built, the Kurallar screen SHALL show it at the top of the rules text, as v2.2.8 does. It is a card with its parts labeled Cost, Name, Effect and Set, so it SHALL have a Turkish alternative text that names those parts. It SHALL never catch the pointer. Where the picture is not built, or fails to load, the screen SHALL show nothing in its place.

#### Scenario: Reading the rules with the picture
- **WHEN** a signed-in user opens the Kurallar screen and `card_info` is built
- **THEN** the picture is shown before the first section's text, inside the rules text

#### Scenario: A screen reader
- **WHEN** a screen reader user reaches the picture
- **THEN** it reads "Bir kartın bölümleri: sol üst köşede maliyeti (Cost), ortada adı (Name), altında etkisi (Effect), sağ alt köşede seti (Set)."

#### Scenario: The picture is missing
- **WHEN** `card_info` is not built, or its file fails to load
- **THEN** the rules text is shown in full without a picture, a placeholder or an empty space

#### Scenario: The Cardmaker and the picture together
- **WHEN** a user opens the Kurallar screen on a tablet 800 CSS pixels wide
- **THEN** `cardmaker_wave` is next to the title, and `card_info` is at the top of the rules text

## MODIFIED Requirements

### Requirement: Rules screen layout
The Kurallar screen SHALL place its Cardmaker as card-images says: in the bottom-right corner on a wide window with a mouse, next to its title on a tablet or a narrower window, and nowhere on a phone. Its text SHALL keep a readable line length of about 70 characters, so that on a wide window the Cardmaker stands in the space beside it. From 640 CSS pixels wide, the `card_info` picture SHALL float at the right of the text's first lines, about half the text's width, and the text SHALL wrap beside it and continue below it at its full width. Narrower, the picture SHALL take the text's full width above the first section. It SHALL be readable at every width the shell supports, down to 360 CSS pixels, without horizontal scrolling.

#### Scenario: A desktop
- **WHEN** the Kurallar screen is shown on a 1440 CSS pixel wide window with a mouse
- **THEN** `cardmaker_wave` stands in the bottom-right corner, and the text's lines end before her

#### Scenario: The picture on a desktop
- **WHEN** the Kurallar screen is shown on a 1440 CSS pixel wide window with `card_info` built
- **THEN** the picture stands at the top right of the text, the first section's lines wrap at its left, the lines below it use the text's full width, and the text and the picture end before the corner Cardmaker

#### Scenario: A tablet
- **WHEN** the Kurallar screen is shown on a tablet 800 CSS pixels wide
- **THEN** `cardmaker_wave` is next to the title, and the picture floats at the right of the text's first lines

#### Scenario: Phone width
- **WHEN** the Kurallar screen is shown 360 CSS pixels wide
- **THEN** the text wraps to the width, no Cardmaker is shown, the `card_info` picture takes the text's full width above the first section, and the page has no horizontal scrollbar

#### Scenario: Without pictures
- **WHEN** the pictures are not built
- **THEN** the Kurallar screen shows its title and the full text, without a Cardmaker and without the `card_info` picture
