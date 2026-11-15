# Spec Delta

## MODIFIED Requirements

### Requirement: Counts come from the records
The statistics SHALL be computed from the stored holdings, card draws, pack openings and use records each time they are read, and SHALL NOT be stored. An open page SHALL show a change on any device without a reload. History SHALL start with the records the application holds: nothing from the legacy app counts.

#### Scenario: A use while the page is open
- **WHEN** Bora has the Kart geçmişi of "Aboleth's Eyes" open, and Ayla uses that card
- **THEN** Bora's "Kullanıldı" is one higher, and the use is at the top of the Geçmiş list, without a reload

#### Scenario: A set's page while a pack is chosen from
- **WHEN** the DM has the Set istatistikleri of Kesqerian Nights open, and Ayla chooses "Jann In A Bottle" from a Kesqerian Nights pack
- **THEN** that card's "Ele geçti" and its chosen count are one higher, without a reload

#### Scenario: A kept card's use while the page is open
- **WHEN** Bora has the Kart geçmişi of the kept card "Lucky Coin" open, and Ayla uses it
- **THEN** Bora's "Kullanıldı" is one higher, and the use is at the top of the Geçmiş list, without a reload

### Requirement: Counting how a card left a hand
"Kullanıldı" SHALL count a card's holdings that closed as used, and the use records of a card that stays in the hand. "Discard" and "Transfer" SHALL count the holdings that closed as discarded and transferred. The LP paid for the uses SHALL be their recorded use payments added up, with a use recorded without a payment counting as 0.

#### Scenario: Two uses
- **WHEN** Dana used "Aboleth's Eyes" for 1 LP, and later Ayla used it for 1 LP
- **THEN** the card has "Kullanıldı" 2 with 2 LP paid

#### Scenario: A discard
- **WHEN** the DM discarded "Aboleth's Eyes" from Ayla's hand
- **THEN** the card has "Discard" 1

#### Scenario: A kept card used three times
- **WHEN** Ayla used her kept card "Lucky Coin" three times for 2 LP each, and still holds it
- **THEN** the card has "Kullanıldı" 3 with 6 LP paid, and no closed holding

### Requirement: Who opens a card's page
The DM SHALL open the page of every card. A player SHALL open the page of an active card whose "Listede görünür" is on, and of a hidden or retired card while someone holds it. Otherwise, and for an address that names no card, a True Word, or the wrong screen for the card's kind, the page SHALL say "Kart bulunamadı." with the back link.

#### Scenario: A draft
- **WHEN** Ayla opens the address of a draft card's page
- **THEN** the page says "Kart bulunamadı." with the link "← Kart kütüphanesi"

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
- **WHEN** the DM opens the library address of the True Word "Abyss"
- **THEN** the page says "Kart bulunamadı."

### Requirement: The cards a set's page counts
A set's page SHALL list and count the cards of that set that the Setler screen counts for the viewer: every card of the set, whatever its status, for the DM; the active cards whose "Listede görünür" is on for a player. On the DM's page, drafts, hidden cards and retired cards SHALL be marked "Taslak", "🔒 DM" and "Kaldırıldı".

#### Scenario: A player's page
- **WHEN** Kesqer has 120 active cards, 1 draft and 1 active card with "Listede görünür" off, and Ayla opens its page
- **THEN** the page counts and lists 120 cards

#### Scenario: The DM's page
- **WHEN** the DM opens the same page
- **THEN** it counts and lists 122 cards, the draft marked "Taslak" and the hidden card "🔒 DM"
