# Spec Delta

## ADDED Requirements

### Requirement: Cards not listed for players
A card whose "Listede görünür" is off SHALL NOT appear in a player's Kart kütüphanesi or Cursed Deck, or in their counts, also while someone holds it. The hiding is in the interface only: a player's device still reads the card, because the hands show it. The DM SHALL see such cards in the lists, marked "🔒 DM" on their face and list row.

#### Scenario: A player's library
- **WHEN** "The Last Wish" is an active card with "Listede görünür" off, and Ayla opens the Kart kütüphanesi
- **THEN** it is not listed, and the card count leaves it out

#### Scenario: A held hidden card
- **WHEN** the DM gives "The Last Wish" to Bora, and Ayla opens the Kart kütüphanesi
- **THEN** it is still not listed

#### Scenario: The DM's library
- **WHEN** the DM opens the Kart kütüphanesi
- **THEN** "The Last Wish" is listed and marked "🔒 DM"

#### Scenario: A listed card that is never drawn
- **WHEN** "Crown of Ash" has "Listede görünür" on and its three channel flags off, and Ayla opens the Kart kütüphanesi
- **THEN** "Crown of Ash" is listed

## MODIFIED Requirements

### Requirement: Card definitions
Every card SHALL be stored once, with a kind, a status (spec: definition-editing), its behavior flags (spec: definition-editing, "Behavior flags") and its definition: name, set code, cost, rarity, mechanic pack, and text. The kind SHALL be one of "normal", "blessed", "cursed" or "trueWord". A Blessed card SHALL have no set code and no rarity. A Cursed card and a True Word SHALL have no set code, no rarity, and no mechanic pack. A cost MAY be absent, except for a True Word that is not a draft. Each card keeps its cost as written, for example "X" or "d6". A draft MAY lack the other fields its kind requires.

#### Scenario: A Blessed card
- **WHEN** a user looks at a Blessed card
- **THEN** it shows "Blessed" in place of a set, "—" as its rarity, and its mechanic pack

#### Scenario: A Cursed card
- **WHEN** a user looks at a Cursed card
- **THEN** it shows its name, cost, and text, and has no rarity or mechanic pack

#### Scenario: A card without a cost
- **WHEN** a user looks at a card whose cost is absent
- **THEN** the cost shows as "—"

#### Scenario: A cost that is not a number
- **WHEN** a user looks at a card whose cost is "d6"
- **THEN** the cost shows as "d6"

#### Scenario: A draft without a set
- **WHEN** the DM looks at the normal draft "The Cartographer", which has no set, rarity or mechanic pack
- **THEN** its set, rarity and mechanic pack show as empty, and it is marked "Taslak"

#### Scenario: A True Word among the definitions
- **WHEN** a user opens the Kart kütüphanesi or the Cursed Deck
- **THEN** no True Word is listed there

### Requirement: Kart kütüphanesi lists the Legend cards live
The Kart kütüphanesi screen SHALL list every active normal and Blessed card, and no Cursed card or True Word; a player's screen leaves out the cards whose "Listede görünür" is off. It SHALL show the number of cards it lists. A change to the cards SHALL appear on every open device without a page reload.

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
- **WHEN** the DM turns off "Listede görünür" of an active card while Ayla has the Kart kütüphanesi open
- **THEN** the card disappears from Ayla's screen without a reload

### Requirement: Pool status in the library
The Kart kütüphanesi SHALL show each card's status, live. A card is in the pool when it is active, no one holds it as its one copy, and at least one of "Kart çekmede çıkar", "Set paketlerinde çıkar" and "Mechanic paketlerinde çıkar" is on. Such a card is "Havuzda". A held card with one copy is "Elde:" with the names of everyone holding a copy, and its card face is marked. A card with "Birden fazla elde olabilir" on is "Havuzda" followed by the names of those holding it, if any. A card with those three flags off is never in the pool: it is "DM'e özel", followed by "Elde:" and the names of those holding it, if any. The screen SHALL show how many cards are in the pool and how many copies are in hands.

#### Scenario: A held card
- **WHEN** Ayla holds "Aboleth's Eyes"
- **THEN** the library shows it as "Elde: Ayla" and marks its face

#### Scenario: Back in the pool
- **WHEN** Ayla uses that card while another user has the library open
- **THEN** the card shows as "Havuzda" there without a reload, and the pool count is one higher

#### Scenario: A Blessed card in a hand
- **WHEN** Ayla holds the Blessed card "Second Wind", whose "Birden fazla elde olabilir" is on
- **THEN** the library shows it as "Havuzda · Elde: Ayla"

#### Scenario: A DM-only card in a hand
- **WHEN** Bora holds "The Last Wish", whose three channel flags are off, and the DM opens the library
- **THEN** it shows as "DM'e özel · Elde: Bora", and the pool count leaves it out

#### Scenario: A card only in packs
- **WHEN** "Crown of Ash" has "Kart çekmede çıkar" off and "Set paketlerinde çıkar" on, and no one holds it
- **THEN** it shows as "Havuzda", and the pool count includes it

### Requirement: Cursed Deck lists the Cursed cards live
The Cursed Deck screen SHALL list every active Cursed card, and no other card; a player's screen leaves out the cards whose "Listede görünür" is off. It SHALL show the number of cards it lists. A change to the cards SHALL appear on every open device without a page reload.

#### Scenario: Opening the Cursed Deck
- **WHEN** a signed-in user opens the Cursed Deck after the initial data was imported
- **THEN** the screen lists 154 cards, all of them Cursed

#### Scenario: A DM-only Cursed card
- **WHEN** "Visions of Death" has "Listede görünür" off, and Ayla opens the Cursed Deck
- **THEN** it is not listed, and the DM's Cursed Deck lists it marked "🔒 DM"

### Requirement: Pool-only filter
The Kart kütüphanesi SHALL offer a "Yalnızca havuzdakiler" filter that, when on, lists only the cards in the pool (spec: "Pool status in the library"). It combines with the search and the other filters.

#### Scenario: Hiding held cards
- **WHEN** a user turns on "Yalnızca havuzdakiler" while Ayla holds "Aboleth's Eyes"
- **THEN** "Aboleth's Eyes" is not listed, the Blessed cards still are, and the count says how many cards are shown

#### Scenario: A card only the DM gives
- **WHEN** the DM turns on "Yalnızca havuzdakiler" while no one holds "The Last Wish", whose three channel flags are off
- **THEN** "The Last Wish" is not listed

### Requirement: Pool distribution
The Kart kütüphanesi SHALL offer a "▥ Havuz Dağılımı" dialog, live, over the cards a random draw can give (spec: card-draws, "Equal chance from the pool"). It SHALL show how many cards that is, and each rarity's and each set's share as a percentage and a count. Blessed cards SHALL count as the rarity "Blessed" and the set "Blessed". Each rarity SHALL list its sets with their counts.

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
- **WHEN** the DM turns off "Kart çekmede çıkar" of an active Rare card without a holder while the dialog is open
- **THEN** the total and the Rare count are one lower without a reload

### Requirement: The DM's status filter
For the DM, the Kart kütüphanesi and the Cursed Deck SHALL offer a status filter with "Yayında", "Taslak", "Kaldırıldı", "🔒 DM" and "Hepsi", starting at "Yayında". "🔒 DM" SHALL list the cards of every status whose "Listede görünür" is off. It SHALL combine with the search and the other filters, and the count SHALL follow it. With "Taslak", "Kaldırıldı" or "Hepsi" chosen, each card's face and list row SHALL show its status. Players SHALL NOT see the filter.

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
- **WHEN** the DM chooses "🔒 DM" while "The Last Wish" is active and "Crown of Ash" is a draft, both with "Listede görünür" off
- **THEN** only those two are listed, each marked "🔒 DM"

## REMOVED Requirements

### Requirement: DM-only cards are hidden from players
**Reason**: The DM-only flag is removed. Hiding a card from players' lists is now "Listede görünür" (spec: "Cards not listed for players").
**Migration**: None. "Sadece DM verebilir" turns "Listede görünür" off together with the channel flags.
