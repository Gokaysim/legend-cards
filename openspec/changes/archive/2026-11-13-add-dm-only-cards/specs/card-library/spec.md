## ADDED Requirements

### Requirement: DM-only cards are hidden from players
A DM-only card SHALL NOT appear in a player's Kart kütüphanesi or Cursed Deck, or in their counts, also while someone holds it. The hiding is in the interface only: a player's device still reads the card, because the hands show it. The DM SHALL see DM-only cards in the lists, marked "🔒 DM" on their face and list row.

#### Scenario: A player's library
- **WHEN** "The Last Wish" is an active DM-only card, and Ayla opens the Kart kütüphanesi
- **THEN** it is not listed, and the card count leaves it out

#### Scenario: A held DM-only card
- **WHEN** the DM gives "The Last Wish" to Bora, and Ayla opens the Kart kütüphanesi
- **THEN** it is still not listed

#### Scenario: The DM's library
- **WHEN** the DM opens the Kart kütüphanesi
- **THEN** "The Last Wish" is listed and marked "🔒 DM"

## MODIFIED Requirements

### Requirement: Kart kütüphanesi lists the Legend cards live
The Kart kütüphanesi screen SHALL list every active normal and Blessed card, and no Cursed card; a player's screen leaves out the DM-only cards. It SHALL show the number of cards it lists. A change to the cards SHALL appear on every open device without a page reload.

#### Scenario: Opening the library
- **WHEN** a signed-in user opens the Kart kütüphanesi after the initial data was imported
- **THEN** the screen lists 588 cards, none of them Cursed, and says that it shows 588 cards

#### Scenario: An import while the screen is open
- **WHEN** an import adds an active card while a user has the Kart kütüphanesi open
- **THEN** the new card appears on that user's screen without a reload

#### Scenario: A card published while the screen is open
- **WHEN** the DM publishes a draft while Ayla has the Kart kütüphanesi open
- **THEN** the card appears on Ayla's screen without a reload

#### Scenario: A card marked DM-only while the screen is open
- **WHEN** the DM marks an active card DM-only while Ayla has the Kart kütüphanesi open
- **THEN** the card disappears from Ayla's screen without a reload

### Requirement: Cursed Deck lists the Cursed cards live
The Cursed Deck screen SHALL list every active Cursed card, and no other card; a player's screen leaves out the DM-only cards. It SHALL show the number of cards it lists. A change to the cards SHALL appear on every open device without a page reload.

#### Scenario: Opening the Cursed Deck
- **WHEN** a signed-in user opens the Cursed Deck after the initial data was imported
- **THEN** the screen lists 154 cards, all of them Cursed

#### Scenario: A DM-only Cursed card
- **WHEN** "Visions of Death" is DM-only, and Ayla opens the Cursed Deck
- **THEN** it is not listed, and the DM's Cursed Deck lists it marked "🔒 DM"

### Requirement: Pool status in the library
The Kart kütüphanesi SHALL show each card's status, live. A normal card without a holder is "Havuzda". A held normal card is "Elde:" with the names of everyone holding a copy, and its card face is marked. A Blessed card is always "Havuzda", followed by the names of those holding it, if any. A DM-only card is never in the pool: it is "DM'e özel", followed by "Elde:" and the names of those holding it, if any. The screen SHALL show how many cards are in the pool and how many copies are in hands.

#### Scenario: A held card
- **WHEN** Ayla holds "Aboleth's Eyes"
- **THEN** the library shows it as "Elde: Ayla" and marks its face

#### Scenario: Back in the pool
- **WHEN** Ayla uses that card while another user has the library open
- **THEN** the card shows as "Havuzda" there without a reload, and the pool count is one higher

#### Scenario: A Blessed card in a hand
- **WHEN** Ayla holds the Blessed card "Second Wind"
- **THEN** the library shows it as "Havuzda · Elde: Ayla"

#### Scenario: A DM-only card in a hand
- **WHEN** Bora holds the DM-only card "The Last Wish", and the DM opens the library
- **THEN** it shows as "DM'e özel · Elde: Bora", and the pool count leaves it out

### Requirement: Pool distribution
The Kart kütüphanesi SHALL offer a "▥ Havuz Dağılımı" dialog, live, over the drawable cards: the active normal cards without a holder and every active Blessed card, none of them DM-only. It SHALL show how many cards that is, and each rarity's and each set's share as a percentage and a count. Blessed cards SHALL count as the rarity "Blessed" and the set "Blessed". Each rarity SHALL list its sets with their counts.

#### Scenario: Reading the distribution
- **WHEN** the drawable cards are 300 Common, 100 Rare, and 20 Blessed cards, and a user opens "▥ Havuz Dağılımı"
- **THEN** the dialog shows 420 cards, and in Turkish number format Common "%71,4" (300), Rare "%23,8" (100), and Blessed "%4,8" (20)

#### Scenario: Sets within a rarity
- **WHEN** 60 of the 100 drawable Rare cards are from Kesqer
- **THEN** the Rare entry lists "Kesqerian Nights" with 60

#### Scenario: A card is drawn
- **WHEN** a normal card is drawn while a user has the dialog open
- **THEN** the counts and shares update without a reload

#### Scenario: An empty pool
- **WHEN** no card can be drawn and a user opens the dialog
- **THEN** it says in Turkish that the pool has no cards to show

#### Scenario: A DM-only card
- **WHEN** the DM marks an active Rare card without a holder as DM-only while the dialog is open
- **THEN** the total and the Rare count are one lower without a reload

### Requirement: The DM's status filter
For the DM, the Kart kütüphanesi and the Cursed Deck SHALL offer a status filter with "Yayında", "Taslak", "Kaldırıldı", "DM'e özel" and "Hepsi", starting at "Yayında". "DM'e özel" SHALL list the DM-only cards of every status. It SHALL combine with the search and the other filters, and the count SHALL follow it. With "Taslak", "Kaldırıldı" or "Hepsi" chosen, each card's face and list row SHALL show its status. Players SHALL NOT see the filter.

#### Scenario: Finding the drafts
- **WHEN** the DM chooses "Taslak" in the Kart kütüphanesi after the initial data was imported
- **THEN** only "Hrolf's Hornswaggle", "The Grand Finale" and "The Cartographer" are listed, each marked "Taslak"

#### Scenario: A retired card in a hand
- **WHEN** the DM chooses "Kaldırıldı" while Ayla holds the retired card "Aboleth's Eyes"
- **THEN** "Aboleth's Eyes" is listed, marked "Kaldırıldı", with "Elde: Ayla" as its status

#### Scenario: A player's library
- **WHEN** Ayla opens the Kart kütüphanesi
- **THEN** she sees no status filter, and only active cards are listed

#### Scenario: Finding the DM-only cards
- **WHEN** the DM chooses "DM'e özel" while "The Last Wish" is active and "Crown of Ash" is a draft, both DM-only
- **THEN** only those two are listed, each marked "🔒 DM"
