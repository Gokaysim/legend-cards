## MODIFIED Requirements

### Requirement: Not-found page
An unknown URL inside the application SHALL show only the picture of the shy but dangerous manticore, centered in the page, with the line "Sayfa bulunamadı" under it and nothing else in the page. The picture SHALL be scaled to the page's width up to a maximum, on every width including phones, with the Turkish alternative text "Mahcup ama tehlikeli bir mantikor". The menu SHALL stay, so the user leaves through it. When the picture cannot load, the line SHALL still show.

#### Scenario: Unknown address
- **WHEN** a signed-in user opens an application URL that matches no screen
- **THEN** the page shows the manticore picture, centered, with "Sayfa bulunamadı" under it, and no other text or link in the page

#### Scenario: Leaving the page
- **WHEN** a signed-in user is on the not-found page
- **THEN** the menu is there, and its "Oyuncu elleri" entry leads to that screen

#### Scenario: Phone width
- **WHEN** the not-found page is shown 360 CSS pixels wide
- **THEN** the picture fits the width above the line, and the page has no horizontal scrollbar

#### Scenario: The picture fails
- **WHEN** the picture cannot load
- **THEN** "Sayfa bulunamadı" still shows
