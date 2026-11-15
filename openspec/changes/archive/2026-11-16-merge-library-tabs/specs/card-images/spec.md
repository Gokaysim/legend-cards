## MODIFIED Requirements

### Requirement: Card faces with pictures
A card face with a picture SHALL show the picture, with the card's name as its alternative text, without a frame of its own: the picture's printed frame shows the card's kind. It SHALL write nothing about the card under it. The face SHALL keep its marks. The cost, name and text SHALL stay readable to screen readers. This SHALL hold in every tab of the Kütüphane, True Word faces included, the hand, the card details, and the revealed cards of draws and packs.

#### Scenario: A card in the library
- **WHEN** a user looks at "Aboleth's Eyes" in the Kartlar tab's card view
- **THEN** its face shows its picture, with its printed purple frame, without a frame around it and with no text under it

#### Scenario: A card with a picture next to one without
- **WHEN** the Cursed tab shows "Scorched Earth", which has no picture, next to "Visions of Death", which has one
- **THEN** "Scorched Earth" has its CSS face in a red frame, and "Visions of Death" shows only its picture

#### Scenario: A True Word face with a picture
- **WHEN** a user looks at "Aid", which has a picture and which Ayla knows, in Ayla's True Words tab
- **THEN** its face shows only the picture of "Aid", with "Aid" as its alternative text, and keeps its "Biliyor" mark

### Requirement: True Word pictures
A True Word tile with a picture SHALL show the picture, with the word's name as its alternative text, in place of its text paragraph. It keeps its name, its "<cost> LP" badge, its marks and its controls. The text SHALL stay readable to screen readers. This SHALL hold on the hand's True Words tab, the draft panel, and the word's details. The Kütüphane's True Words tab SHALL show its words as faces instead (spec: card-library, "Card view").

#### Scenario: A word in a draft
- **WHEN** Ayla's open draft shows "Abyss"
- **THEN** its tile shows the Abyss picture, its name and "5 LP", and the "Öğren" button

#### Scenario: The same word in the Kütüphane
- **WHEN** a user opens the Kütüphane's True Words tab
- **THEN** "Abyss" shows as a face, not as a tile

### Requirement: The Cardmaker on screens
Each screen title SHALL show its Cardmaker picture, when there is one, as decoration without alternative text, unless the screen places her in the corner (see "The Cardmaker in the corner"). The Kütüphane SHALL show the Cardmaker of its open tab:

| Screen | Cardmaker |
| --- | --- |
| Pack Shop | `cardmaker_shop` |
| Kütüphane, Kartlar tab | `cardmaker_lib` |
| Kütüphane, Cursed tab | `cardmaker_cursed` |
| Kütüphane, True Words tab | `cardmaker_true` |
| İşlem Logu | `cardmaker_think` |
| Elixir Shop | `cardmaker_zaddir` |
| Kurallar | `cardmaker_wave` |
| Custom Card Draft | `cardmaker_custom` |
| Veri / Yedek | `cardmaker_peek` |

A screen whose Cardmaker has no picture SHALL show none. On a window narrower than 640 CSS pixels, no screen SHALL show a Cardmaker.

#### Scenario: The library
- **WHEN** a user opens the Kütüphane on a tablet 800 CSS pixels wide
- **THEN** the Kartlar tab's Cardmaker, `cardmaker_lib`, is shown next to its title

#### Scenario: Another tab
- **WHEN** a user opens the Kütüphane's Cursed tab on a tablet 800 CSS pixels wide
- **THEN** `cardmaker_cursed` is shown next to the title

#### Scenario: The library on a phone
- **WHEN** a user opens the Kütüphane 360 CSS pixels wide
- **THEN** no Cardmaker is shown, next to the title or anywhere else

#### Scenario: A missing Cardmaker
- **WHEN** a user opens the Custom Card Draft on a tablet where `cardmaker_custom` has no picture
- **THEN** the title is shown without a picture

### Requirement: The Cardmaker in the corner
On the shop screens (Shops, Pack Shop, Elixir Shop), every tab of the Kütüphane, Kurallar, and the unbuilt screens, on a device with hover whose window is at least 1024 CSS pixels wide, the screen's Cardmaker SHALL stand fixed in the window's bottom-right corner instead of next to the title. She SHALL stay there while the page scrolls and SHALL never catch the pointer. She SHALL fade out while the pointer is over her, or the keyboard focus is on something under her.

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
- **THEN** `cardmaker_think` is next to its title
