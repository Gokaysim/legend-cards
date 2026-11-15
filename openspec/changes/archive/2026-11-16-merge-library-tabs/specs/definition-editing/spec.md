## MODIFIED Requirements

### Requirement: Only the DM manages definitions
Only the DM SHALL add, edit, publish, retire, bring back or delete a card or a True Word in the application. The server SHALL deny these steps to players. Players SHALL see no controls for them.

#### Scenario: The DM fixes a text
- **WHEN** the DM changes the text of "Aboleth's Eyes"
- **THEN** the change is saved

#### Scenario: A player changes a card
- **WHEN** Ayla tries to change the text of "Aboleth's Eyes"
- **THEN** the server denies it, and the card does not change

#### Scenario: A player adds a word
- **WHEN** Ayla tries to create a True Word
- **THEN** the server denies it

#### Scenario: No controls for players
- **WHEN** Ayla opens any tab of the Kütüphane
- **THEN** she sees no "+ Kart ekle", "+ True Word ekle" or "✎ Düzenle" control

### Requirement: Adding a card
The DM SHALL add a normal or Blessed card from "+ Kart ekle" on the Kütüphane's Kartlar tab, and a Cursed card from "+ Kart ekle" on its Cursed tab. The form SHALL ask for the fields of the card's kind. "Kaydet" SHALL store the card as a draft, even with empty fields. "Kaydet ve yayınla" SHALL store it as active, and SHALL be possible only when the card is complete.

#### Scenario: Saving an unfinished card
- **WHEN** the DM adds the normal card "Bard's Encore" with a set and a rarity, but no text, and chooses "Kaydet"
- **THEN** "Bard's Encore" is stored as a draft

#### Scenario: Adding and publishing at once
- **WHEN** the DM fills in every field of the new Cursed card "Hollow Bones" on the Cursed tab and chooses "Kaydet ve yayınla"
- **THEN** "Hollow Bones" is active, and it is listed on the Cursed tab of every device

#### Scenario: Publishing an incomplete card at once
- **WHEN** the DM adds a normal card without a mechanic pack
- **THEN** "Kaydet ve yayınla" is not possible, and the form names the empty mechanic pack in Turkish

#### Scenario: The add control follows the tab
- **WHEN** the DM opens the True Words tab
- **THEN** it offers "+ True Word ekle" and no "+ Kart ekle"

### Requirement: Adding a True Word
The DM SHALL add a True Word from "+ True Word ekle" on the Kütüphane's True Words tab, with its name, cost and text. "Kaydet" SHALL store it as a draft, even with empty fields. "Kaydet ve yayınla" SHALL store it as active, and SHALL be possible only when the word is complete.

#### Scenario: Adding a word as a draft
- **WHEN** the DM adds the word "Echo" with a cost but no text, and chooses "Kaydet"
- **THEN** "Echo" is stored as a draft

#### Scenario: Adding and publishing a word
- **WHEN** the DM adds the word "Echo" with the cost "2" and a text, and chooses "Kaydet ve yayınla"
- **THEN** "Echo" is active and can be offered in a draft

### Requirement: Starting values of the flags
A new definition SHALL start with its kind's current behavior. The four "where" flags and "Kullanınca efekt bırakır" start on. "Birden fazla elde olabilir" starts off for a normal card and on for the others. "Kullanınca elde kalır" starts off, except for a True Word. "Elde etkili" starts on when the text starts with "Held:". While the DM adds a definition, that box follows the text until the DM changes it.

#### Scenario: A new normal card
- **WHEN** the DM opens "+ Kart ekle" on the Kartlar tab
- **THEN** every box of the first group is checked, "Birden fazla elde olabilir" and "Kullanınca elde kalır" are not, "Kullanınca efekt bırakır" is checked, and "Elde etkili" is not

#### Scenario: A held text
- **WHEN** the DM types the text "Held: +1 AC." into a new card without touching "Elde etkili"
- **THEN** "Elde etkili" becomes checked

#### Scenario: The DM decides
- **WHEN** the DM unchecks "Elde etkili" and then types a text that starts with "Held:"
- **THEN** "Elde etkili" stays unchecked

#### Scenario: A new Cursed card
- **WHEN** the DM opens "+ Kart ekle" on the Cursed tab
- **THEN** "Birden fazla elde olabilir" is checked
