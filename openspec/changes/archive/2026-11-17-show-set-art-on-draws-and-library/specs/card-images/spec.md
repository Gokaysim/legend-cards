## RENAMED Requirements

- FROM: `### Requirement: Cardbacks that give nothing away`
- TO: `### Requirement: Cardbacks of face-down cards`

## MODIFIED Requirements

### Requirement: Cardbacks of face-down cards
Each face-down card SHALL show the back of its draw or pack:
- a Cursed draw, and a Cursed, Cursed Golden or Pandemonium Cursed Pack: the Cursed cardback, for every card
- a set's Standard, Premium or Pandemonium Pack: that set's cardback, for every card
- a Mechanic Pack: that Mechanic Pack's own picture, or the neutral back while it has none, for every card
- a random draw and a Golden Pack: the card's own back, which is the Blessed cardback for a Blessed card and the cardback of the card's set for any other card

A back without a picture SHALL show the neutral back. Only in a random draw and a Golden Pack SHALL the back depend on the card under it.

#### Scenario: A random draw
- **WHEN** Ayla draws a random card that turns out to be Blessed
- **THEN** its back is the Blessed cardback

#### Scenario: A random draw of a set card
- **WHEN** Ayla draws a random card of Kesqerian Nights without a set filter
- **THEN** its back is the Kesqerian Nights cardback

#### Scenario: A random draw of a set without a cardback picture
- **WHEN** Ayla draws a random card whose set has no cardback picture
- **THEN** its back is the neutral back

#### Scenario: A set pack
- **WHEN** a Kesqerian Nights Standard Pack opens
- **THEN** all its face-down cards show the Kesqerian Nights cardback

#### Scenario: A Cursed Pack
- **WHEN** a Kesqerian Nights Cursed Pack opens
- **THEN** all its face-down cards, the Cursed card included, show the Cursed cardback

#### Scenario: A Mechanic Pack
- **WHEN** a Blood & Battle Mechanic Pack opens, and one of its cards is Blessed
- **THEN** all its face-down cards, the Blessed card included, show the Blood & Battle pack picture

#### Scenario: A Mechanic Pack without a picture
- **WHEN** a Mechanic Pack opens whose pack picture is not built
- **THEN** all its face-down cards show the neutral back

#### Scenario: A Golden Pack
- **WHEN** a Golden Pack opens with cards of Kesqerian Nights, a card of Pandemonium and a Blessed card
- **THEN** each Kesqerian Nights card shows the Kesqerian Nights cardback, the Pandemonium card the Pandemonium cardback, and the Blessed card the Blessed cardback

#### Scenario: A shrunk Golden Pack
- **WHEN** Bora shrinks Ayla's open Golden Pack to its banner
- **THEN** each small back in the banner is the back of the card under it, as in the open view

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

While the Kartlar tab's Set filter names a stored set with a Cardmaker picture, the Kütüphane SHALL show that set's Cardmaker in place of `cardmaker_lib`. "Tüm setler", "Blessed", and a set without a Cardmaker picture SHALL keep `cardmaker_lib`.

A screen whose Cardmaker has no picture SHALL show none. On a window narrower than 640 CSS pixels, no screen SHALL show a Cardmaker.

#### Scenario: The library
- **WHEN** a user opens the Kütüphane on a tablet 800 CSS pixels wide
- **THEN** the Kartlar tab's Cardmaker, `cardmaker_lib`, is shown next to its title

#### Scenario: Another tab
- **WHEN** a user opens the Kütüphane's Cursed tab on a tablet 800 CSS pixels wide
- **THEN** `cardmaker_cursed` is shown next to the title

#### Scenario: The library filtered to a set
- **WHEN** a user chooses "Kesqerian Nights" in the Kartlar tab's Set filter on a 1280 CSS pixel wide window with a mouse, and Kesqerian Nights has a Cardmaker picture
- **THEN** the Kesqerian Nights Cardmaker stands in the bottom-right corner in place of `cardmaker_lib`

#### Scenario: A set without a Cardmaker
- **WHEN** a user chooses a set without a Cardmaker picture in the Kartlar tab's Set filter
- **THEN** `cardmaker_lib` stays

#### Scenario: Blessed in the Set filter
- **WHEN** a user chooses "Blessed" in the Kartlar tab's Set filter
- **THEN** `cardmaker_lib` stays

#### Scenario: Clearing the Set filter
- **WHEN** a user who chose "Kesqerian Nights" chooses "Tüm setler" again
- **THEN** `cardmaker_lib` comes back

#### Scenario: Leaving the tab
- **WHEN** a user who chose "Kesqerian Nights" opens the Cursed tab and comes back to Kartlar
- **THEN** the Cursed tab shows `cardmaker_cursed`, and Kartlar shows `cardmaker_lib` again, with its Set filter empty

#### Scenario: The library on a phone
- **WHEN** a user opens the Kütüphane 360 CSS pixels wide
- **THEN** no Cardmaker is shown, next to the title or anywhere else

#### Scenario: A missing Cardmaker
- **WHEN** a user opens the Custom Card Draft on a tablet where `cardmaker_custom` has no picture
- **THEN** the title is shown without a picture

## ADDED Requirements

### Requirement: Pictures fetched before the turn
While a card with a picture is face down in a draw dialog, a watching view or an open pack, its picture SHALL be fetched in the background, so the face shows the picture right after the turn. The face SHALL still not be shown before the turn. A picture that fails to fetch SHALL change nothing: the face falls back as in "Pictures with a fallback".

#### Scenario: A drawn card
- **WHEN** Ayla draws "Aboleth's Eyes", waits a moment, and turns it over
- **THEN** its picture is already loaded, and the face shows it as the turn ends

#### Scenario: A card in an open pack
- **WHEN** a Kesqerian Nights Standard Pack opens on Bora's screen
- **THEN** the pictures of its nine cards are fetched while the cards are still face down

#### Scenario: A failed fetch
- **WHEN** the picture of a face-down card cannot be fetched
- **THEN** nothing is shown about it before the turn, and after the turn the face falls back to its look without a picture
