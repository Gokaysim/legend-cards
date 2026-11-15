## MODIFIED Requirements

### Requirement: The Kart geçmişi page
Every card SHALL have a Kart geçmişi page under its own URL, below the Kütüphane's address, whatever its kind. The menu SHALL keep "Kütüphane" marked. The page SHALL have the back link "← Kütüphane" to the tab of the card's kind: the Kartlar tab for a normal or Blessed card, the Cursed tab for a Cursed card. It SHALL show the same page again on reload.

#### Scenario: Opening a Legend card's page
- **WHEN** a user opens the Kart geçmişi of "Aboleth's Eyes"
- **THEN** the page is shown under the Kütüphane's address, "Kütüphane" is marked in the menu, and the link "← Kütüphane" leads to the Kartlar tab

#### Scenario: A Cursed card's page
- **WHEN** a user opens the Kart geçmişi of "Abandon All Hope"
- **THEN** the page is shown under the Kütüphane's address, with "Kütüphane" marked, and the link "← Kütüphane" leads to the Cursed tab

#### Scenario: Reloading
- **WHEN** a user reloads the browser on the Kart geçmişi of "Aboleth's Eyes"
- **THEN** the same page is shown again

### Requirement: The card on its page
The Kart geçmişi page SHALL show the card's face large, its name as the page's heading, and its set, rarity, cost and mechanic pack as labels. A pill SHALL give its status with the Durum text of its Kütüphane tab, or "Taslak" or "Kaldırıldı" for a draft or a retired card. A Cursed card's labels SHALL be "Cursed" and its cost.

#### Scenario: A card in the pool
- **WHEN** a user opens the page of "Aboleth's Eyes", a Common Kesqerian Nights card of Arcanus Divine that costs 1 and is in the pool
- **THEN** the page shows its face, the heading "Aboleth's Eyes", the labels "Kesqerian Nights", "Common", "Cost 1" and "Arcanus Divine", and the pill "Havuzda"

#### Scenario: A held card
- **WHEN** Bora holds "Jann In A Bottle" and a user opens its page
- **THEN** its pill reads "Elde: Bora"

### Requirement: Who opens a card's page
The DM SHALL open the page of every card. A player SHALL open the page of an active card whose "Listede görünür" is on, and of a hidden or retired card while someone holds it. Otherwise, and for an address that names no card or names a True Word, the page SHALL say "Kart bulunamadı." with the back link "← Kütüphane".

#### Scenario: A draft
- **WHEN** Ayla opens the address of a draft card's page
- **THEN** the page says "Kart bulunamadı." with the link "← Kütüphane"

#### Scenario: A held DM-only card
- **WHEN** Bora holds "The Last Wish", whose "Listede görünür" is off, and Ayla opens its page
- **THEN** Ayla sees its history

#### Scenario: A DM-only card no one holds
- **WHEN** no one holds "The Last Wish", whose "Listede görünür" is off, and Ayla opens its address
- **THEN** the page says "Kart bulunamadı."

#### Scenario: The DM
- **WHEN** the DM opens the page of a draft
- **THEN** the DM sees its page with the pill "Taslak"

#### Scenario: A True Word's address
- **WHEN** the DM opens the Kütüphane address of the True Word "Abyss"
- **THEN** the page says "Kart bulunamadı."
