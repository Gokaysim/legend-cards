# Spec Delta

## ADDED Requirements

### Requirement: Behavior flags
Every card and every True Word SHALL have eight behavior flags, each on or off, independent of its status: "Listede görünür", the draw flag, "Set paketlerinde çıkar", "Mechanic paketlerinde çıkar", "Birden fazla elde olabilir", "Elde etkili", "Kullanınca efekt bırakır" and "Kullanınca elde kalır". The specs of the lists, draws, packs, hands and effects say what each one does.

#### Scenario: A Cursed card's flags
- **WHEN** the DM opens the Cursed card "Visions of Death"
- **THEN** its form shows its behavior flags, and changing one does not change its status

#### Scenario: A True Word's flags
- **WHEN** the DM opens the True Word "Abyss"
- **THEN** its form shows its behavior flags

### Requirement: Flags fixed by the kind
Some flags SHALL be fixed by the kind. A Cursed card SHALL have "Set paketlerinde çıkar" and "Mechanic paketlerinde çıkar" off. A True Word SHALL have both pack flags off, and "Birden fazla elde olabilir" and "Kullanınca elde kalır" on. The form SHALL NOT show a fixed flag, and the server SHALL deny any other value for it.

#### Scenario: A Cursed card in a pack
- **WHEN** the DM writes a Cursed card with "Set paketlerinde çıkar" on
- **THEN** the server denies it

#### Scenario: A True Word that leaves the hand
- **WHEN** the DM writes a True Word with "Kullanınca elde kalır" off
- **THEN** the server denies it

### Requirement: Starting values of the flags
A new definition SHALL start with its kind's current behavior. The four "where" flags and "Kullanınca efekt bırakır" start on. "Birden fazla elde olabilir" starts off for a normal card and on for the others. "Kullanınca elde kalır" starts off, except for a True Word. "Elde etkili" starts on when the text starts with "Held:". While the DM adds a definition, that box follows the text until the DM changes it.

#### Scenario: A new normal card
- **WHEN** the DM opens "+ Kart ekle" on the Kart kütüphanesi
- **THEN** every box of the first group is checked, "Birden fazla elde olabilir" and "Kullanınca elde kalır" are not, "Kullanınca efekt bırakır" is checked, and "Elde etkili" is not

#### Scenario: A held text
- **WHEN** the DM types the text "Held: +1 AC." into a new card without touching "Elde etkili"
- **THEN** "Elde etkili" becomes checked

#### Scenario: The DM decides
- **WHEN** the DM unchecks "Elde etkili" and then types a text that starts with "Held:"
- **THEN** "Elde etkili" stays unchecked

#### Scenario: A new Cursed card
- **WHEN** the DM opens "+ Kart ekle" on the Cursed Deck
- **THEN** "Birden fazla elde olabilir" is checked

### Requirement: The Davranış section
The card form and the True Word form SHALL have a section "Davranış" with two groups. "Görünürlük ve kanallar" holds "Listede görünür", the draw flag and the pack flags. "Sahiplik ve etki" holds the other four. The draw flag SHALL read "Kart çekmede çıkar" for a normal or Blessed card, "Cursed Deck'te çıkar" for a Cursed card, and "Draft'ta çıkar" for a True Word. The section SHALL show the flags of the kind that are not fixed.

#### Scenario: A normal card
- **WHEN** the DM opens the form of a normal card
- **THEN** "Davranış" shows eight boxes, with "Kart çekmede çıkar"

#### Scenario: A Cursed card
- **WHEN** the DM opens the form of a Cursed card
- **THEN** "Davranış" shows "Listede görünür", "Cursed Deck'te çıkar", and the four boxes of "Sahiplik ve etki", and no pack box

#### Scenario: A True Word
- **WHEN** the DM opens the form of a True Word
- **THEN** "Davranış" shows "Listede görünür", "Draft'ta çıkar", "Elde etkili" and "Kullanınca efekt bırakır" only

### Requirement: Only the DM gives a definition
The "Görünürlük ve kanallar" group SHALL offer a "Sadece DM verebilir" button that turns off every box of the group. While all of them are off, the group SHALL say "Bu kartı yalnızca DM verebilir." for a card and "Bu True Word'ü yalnızca DM öğretebilir." for a True Word. No separate value SHALL be stored for it.

#### Scenario: Making a card DM-only
- **WHEN** the DM selects "Sadece DM verebilir" in the form of "The Last Wish" and saves
- **THEN** its four "where" flags are off, and the group says "Bu kartı yalnızca DM verebilir."

#### Scenario: One box back on
- **WHEN** the DM then checks "Listede görünür"
- **THEN** the note is gone

### Requirement: Setting the flags
Saving a changed flag SHALL be an edit of the definition, with its change record, in every status. Only the DM SHALL change a flag; the server SHALL deny anyone else.

#### Scenario: Changing a flag of an active card
- **WHEN** the DM unchecks "Kart çekmede çıkar" on the active card "Aboleth's Eyes" and saves
- **THEN** the flag is off, and a change record names the edit with the flag before and after

#### Scenario: A player sets a flag
- **WHEN** a player writes a flag on a card
- **THEN** the server denies it

### Requirement: Turning on Birden fazla elde olabilir
"Birden fazla elde olabilir" SHALL be turned on only while no one holds the card as its one copy. While someone does, the box SHALL be greyed out with "Kart bir oyuncunun elinde.", and the server SHALL deny it. Turning it off SHALL always be possible; the copies already in hands then count as extra copies, and the card stays in the pool.

#### Scenario: A held card
- **WHEN** Bora holds "Aboleth's Eyes", and the DM opens its form
- **THEN** "Birden fazla elde olabilir" is greyed out with "Kart bir oyuncunun elinde."

#### Scenario: Turning it off while held
- **WHEN** Ayla and Bora hold the Cursed card "Visions of Death", and the DM unchecks "Birden fazla elde olabilir" and saves
- **THEN** both keep their copy, and the card is still in the Cursed Deck

## MODIFIED Requirements

### Requirement: A card's kind changes only in a draft
A card's kind SHALL change only while the card is a draft, and only between normal and Blessed. A Cursed card SHALL stay Cursed, a Legend card SHALL never become Cursed, and a True Word SHALL stay a True Word. When the kind changes, the form SHALL set the flags to the new kind's starting values.

#### Scenario: A draft becomes Blessed
- **WHEN** the DM changes the draft "Bard's Encore" from normal to Blessed
- **THEN** it is saved as a Blessed draft, without a set or a rarity, and with "Birden fazla elde olabilir" on

#### Scenario: An active card changes its kind
- **WHEN** the DM tries to make the active card "Aboleth's Eyes" Blessed
- **THEN** the form offers no kind choice, and the server denies such a write

#### Scenario: A True Word becomes a card
- **WHEN** the DM writes the True Word "Abyss" as a normal card
- **THEN** the server denies it

### Requirement: Status steps wait for an open pack
While a pack is open, the server SHALL deny publishing, retiring, bringing back, deleting, and changing a definition's "where" flags or "Birden fazla elde olabilir". The controls SHALL say in Turkish that the table is waiting for the pack, and those boxes SHALL be greyed out with "Bir Pack açık: seçim bekleniyor." Adding a draft, changing the other fields, and changing "Listede görünür" and the other flags SHALL stay possible.

#### Scenario: Retiring during a pack
- **WHEN** Ayla has an open pack, and the DM tries to retire a card
- **THEN** the card stays active, and the DM sees that the table is waiting for the pack

#### Scenario: Fixing a text during a pack
- **WHEN** Ayla has an open pack, and the DM fixes a typo in a card's text
- **THEN** the change is saved

#### Scenario: Marking a card DM-only during a pack
- **WHEN** Ayla has an open pack, and the DM selects "Sadece DM verebilir" for "Aboleth's Eyes" and saves
- **THEN** the card stays as it was, and the DM sees that the table is waiting for the pack

#### Scenario: A draw flag during a pack
- **WHEN** Ayla has an open pack, and the DM tries to turn off "Kart çekmede çıkar" of "Aboleth's Eyes"
- **THEN** the card stays as it was, and the box is greyed out with "Bir Pack açık: seçim bekleniyor."

#### Scenario: Hiding a card during a pack
- **WHEN** Ayla has an open pack, and the DM turns off "Listede görünür" of "Aboleth's Eyes"
- **THEN** the change is saved

### Requirement: Who reads the change records
A record SHALL be readable by every signed-in user when its definition is visible to players before or after the step: active or retired, with "Listede görünür" on. Those are a publish, an add straight to active, a change to such a definition, a retire, a bring-back, and turning "Listede görünür" on or off. Any other record SHALL be readable by the DM only, even after the definition becomes visible: work on a draft, and work on a definition that is not listed for players.

#### Scenario: A player reads a publish
- **WHEN** the DM publishes "Bard's Encore", and Ayla reads the change records
- **THEN** she can read the record of the publish

#### Scenario: A player reads draft work
- **WHEN** Ayla tries to read the record of the DM adding "Bard's Encore" as a draft
- **THEN** the server denies it, also after "Bard's Encore" is published

#### Scenario: A player reads work on a DM-only card
- **WHEN** the DM changes the text of the active card "The Last Wish", whose "Listede görünür" is off, and Ayla tries to read that record
- **THEN** the server denies it

#### Scenario: A player reads a flag change
- **WHEN** the DM turns on "Listede görünür" of the active card "The Last Wish", and Ayla reads the change records
- **THEN** she can read the record of that edit

## REMOVED Requirements

### Requirement: DM-only cards
**Reason**: The single DM-only flag is replaced by the behavior flags. "Sadece DM verebilir" is now a button that turns off the four "where" flags, and a card is hidden from players by "Listede görünür".
**Migration**: None for stored data: the development data is wiped and loaded again with the flags. A card that was DM-only is one whose four "where" flags are off.

### Requirement: Setting the DM-only flag
**Reason**: Replaced by "Setting the flags" and "Only the DM gives a definition".
**Migration**: The form's checkbox becomes the "Sadece DM verebilir" button in the "Davranış" section.
