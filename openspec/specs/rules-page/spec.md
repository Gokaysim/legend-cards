# rules-page Specification

## Purpose

Shows the table's rules on the Kurallar screen, as the Cardmaker tells them, so that every player can read how Legend Points, cards, Cursed and Blessed cards, and True Words work at the table.

## Requirements

### Requirement: Rules sections
The Kurallar screen SHALL show the table rules in Turkish, in the Cardmaker's voice, in four sections in this order: "Legend Point Kart Sistemi", "Cursed Kartlar", "Blessed Kart Kuralları", "True Word Kuralları". Each section SHALL be a titled region of the page, and its topics SHALL be headings below the section title. Game terms keep their English names.

#### Scenario: Reading the sections
- **WHEN** a signed-in user opens the Kurallar screen
- **THEN** they see the four sections in that order, each with its title, and no "Bu ekran henüz hazır değil." note

#### Scenario: The topics of each section
- **WHEN** a user reads the sections
- **THEN** the topics are:
  - "Legend Point Kart Sistemi": "Legend Point nasıl kazanılır?", "Peki, bu puanlarla ne yapacağız?", "Kart alışverişi nasıl oluyor?", "Kartları ne zaman kullanabilirim?", "Kullandığım kartlara ne oluyor?", "Şu kartların renkleri ne anlama geliyor?"
  - "Cursed Kartlar": "Kart Çekmek", "Takas", "Lanetten Kurtulmak", "Sonsuz Lanetler"
  - "Blessed Kart Kuralları": "Blessed Kartlar Nasıl Kazanılır?", "Blessed Kartların Nadirliği", "Paketlerdeki Blessed Kartlar", "Bir Kutsama", "Blessed Kartlar Neden Kaybolur?", "Blessed Kartların Bedeli"
  - "True Word Kuralları": "True Word Nasıl Kullanılır?", "True Word Nasıl Öğrenilir?", "True Word Sahipliği"

#### Scenario: No English headings
- **WHEN** a user reads the headings
- **THEN** none of "Cursed Cards", "Drawing Cards", "Trading", "Blessed Card Rules" or "True Words Rules" appears

### Requirement: Blessed chance in a draw
The rules SHALL say that, in a card draw, every card in the deck has the same chance, Blessed cards among them. They SHALL NOT state a fixed percentage for finding a Blessed card, because the app gives every drawable card the same chance.

#### Scenario: Reading the Blessed rarity
- **WHEN** a user reads "Blessed Kartların Nadirliği"
- **THEN** it says that every card in the deck has the same chance in a draw, Blessed cards among them, and no "%2" appears anywhere on the screen

### Requirement: Blessed cards in packs and mechanics
The rules SHALL name Mechanic, Golden and Pandemonium Packs as the packs where Blessed cards can be found. They SHALL say that each mechanic has its own Blessed cards, without a count or a formula, because the card data decides how many there are.

#### Scenario: Reading where Blessed cards come from
- **WHEN** a user reads "Paketlerdeki Blessed Kartlar"
- **THEN** it names Mechanic, Golden and Pandemonium Packs, and it does not mention Rare Packs

#### Scenario: No per-mechanic formula
- **WHEN** a user reads "Paketlerdeki Blessed Kartlar"
- **THEN** it says each mechanic has its own Blessed cards, and it does not say "one more for every 50 cards"

### Requirement: Card colors in the rules
The rules SHALL describe the card frame colors as the app shows them: purple for Common, gold for Rare, white for Blessed, red for Cursed.

#### Scenario: Reading the colors
- **WHEN** a user reads "Şu kartların renkleri ne anlama geliyor?"
- **THEN** it lists purple frames for Common, gold for Rare, white for Blessed and red for Cursed cards

### Requirement: The same static rules for everyone
The rules text SHALL be part of the application, not data. It SHALL show at once, without a loading state. It SHALL be the same for the DM and for every player. The screen SHALL have no controls.

#### Scenario: A player and the DM
- **WHEN** a player and the DM each open the Kurallar screen
- **THEN** both see the same text, and neither sees a button or a form on the screen

#### Scenario: Before the data arrives
- **WHEN** a user opens the Kurallar screen while the card and player data is still loading
- **THEN** the rules text is shown in full

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
