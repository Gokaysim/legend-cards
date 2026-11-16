## MODIFIED Requirements

### Requirement: The Cardmaker in the corner
On the shop screens (Shops, Pack Shop, Elixir Shop), every tab of the Kütüphane, İşlem Logu, Kurallar, and the unbuilt screens, on a device with hover whose window is at least 1024 CSS pixels wide, the screen's Cardmaker SHALL stand fixed in the window's bottom-right corner instead of next to the title. She SHALL stay there while the page scrolls and SHALL never catch the pointer. She SHALL fade out while the pointer is over her, or the keyboard focus is on something under her.

#### Scenario: The Pack Shop on a desktop
- **WHEN** a user opens the Pack Shop on a 1280 CSS pixel wide window with a mouse and scrolls to the Mechanic Packs
- **THEN** `cardmaker_shop` stands in the bottom-right corner, and no Cardmaker is next to the title

#### Scenario: A pack under her
- **WHEN** the user moves the pointer over a Mechanic Pack that lies under the Cardmaker
- **THEN** the Cardmaker fades out, and selecting the pack opens its confirmation

#### Scenario: The keyboard under her
- **WHEN** a user tabs to the Risk & Reward Mechanic Pack while it lies under the Cardmaker
- **THEN** the Cardmaker fades out until the focus moves away from under her

#### Scenario: The library on a desktop
- **WHEN** a user opens the Kütüphane's Kartlar tab on a 1280 CSS pixel wide window with a mouse
- **THEN** `cardmaker_lib` stands in the bottom-right corner, no Cardmaker is next to the title, and a card under her makes her fade out when the pointer reaches it

#### Scenario: Switching tabs on a desktop
- **WHEN** that user switches to the True Words tab
- **THEN** `cardmaker_true` stands in the bottom-right corner in place of `cardmaker_lib`

#### Scenario: An unbuilt screen on a desktop
- **WHEN** a user opens Veri / Yedek on a 1280 CSS pixel wide window with a mouse
- **THEN** `cardmaker_peek` stands in the bottom-right corner

#### Scenario: A tablet
- **WHEN** a user opens the Pack Shop on a tablet 800 CSS pixels wide
- **THEN** `cardmaker_shop` is next to the title

#### Scenario: A phone
- **WHEN** a user opens the Pack Shop on a phone 360 CSS pixels wide
- **THEN** no Cardmaker is shown, in the corner or next to the title

#### Scenario: Another screen
- **WHEN** a user opens İşlem Logu on a 1280 CSS pixel wide window with a mouse
- **THEN** `cardmaker_think` stands in the bottom-right corner, and no Cardmaker is next to its title

#### Scenario: An event under her
- **WHEN** the user moves the pointer over a log event that lies under the Cardmaker
- **THEN** the Cardmaker fades out, and the event stays readable

#### Scenario: The log on a tablet
- **WHEN** a user opens İşlem Logu on a tablet 800 CSS pixels wide
- **THEN** `cardmaker_think` is next to its title
