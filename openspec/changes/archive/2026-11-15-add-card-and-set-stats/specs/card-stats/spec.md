# Spec Delta

## Purpose

Counts what happened to each card from the permanent records of holdings, draws and pack openings, and shows it on a card's Kart geçmişi page and a set's Set istatistikleri page.

## ADDED Requirements

### Requirement: Counts come from the records
The statistics SHALL be computed from the stored holdings, card draws and pack openings each time they are read, and SHALL NOT be stored. An open page SHALL show a change on any device without a reload. History SHALL start with the records the application holds: nothing from the legacy app counts.

#### Scenario: A use while the page is open
- **WHEN** Bora has the Kart geçmişi of "Aboleth's Eyes" open, and Ayla uses that card
- **THEN** Bora's "Kullanıldı" is one higher, and the use is at the top of the Geçmiş list, without a reload

#### Scenario: A set's page while a pack is chosen from
- **WHEN** the DM has the Set istatistikleri of Kesqerian Nights open, and Ayla chooses "Jann In A Bottle" from a Kesqerian Nights pack
- **THEN** that card's "Ele geçti" and its chosen count are one higher, without a reload

### Requirement: Counting how a card reached a hand
"Ele geçti" SHALL count the holdings of a card that the DM gave, that a draw opened, or that came from a pack. A holding that a transfer opened SHALL count as a "Transfer" and not as "Ele geçti". Every holding counts, so each copy of a Blessed or Cursed card and each extra copy counts once.

#### Scenario: A card that changed hands
- **WHEN** Bora drew "Aboleth's Eyes", and the DM transferred it to Ayla
- **THEN** the card has "Ele geçti" 1, from a draw, and "Transfer" 1

#### Scenario: Copies of a Blessed card
- **WHEN** Ayla and Bora each got "Second Wind" from a draw
- **THEN** "Second Wind" has "Ele geçti" 2

### Requirement: Counting how a card left a hand
"Kullanıldı", "Discard" and "Transfer" SHALL count a card's holdings that closed as used, discarded and transferred. The LP paid for the uses SHALL be their recorded use payments added up, with a use recorded without a payment counting as 0.

#### Scenario: Two uses
- **WHEN** Dana used "Aboleth's Eyes" for 1 LP, and later Ayla used it for 1 LP
- **THEN** the card has "Kullanıldı" 2 with 2 LP paid

#### Scenario: A discard
- **WHEN** the DM discarded "Aboleth's Eyes" from Ayla's hand
- **THEN** the card has "Discard" 1

### Requirement: Counting cards shown in packs
A card SHALL count as shown in a pack once its position in that pack was turned face up, whether the pack was chosen from, is still open, or was cancelled. It SHALL count as chosen when it is the pack's chosen card. A Cursed card that went to the hand with a Cursed pack's choice SHALL count as having reached the hand through the pack, not as chosen.

#### Scenario: Shown but not chosen
- **WHEN** "Aboleth's Eyes" was turned face up in Bora's Kesqerian Nights Standard Pack, and Bora chose another card
- **THEN** it counts as shown once and chosen 0 times

#### Scenario: Never turned
- **WHEN** the DM cancelled a pack before its third card, "Celal's Gambit", was turned
- **THEN** that pack does not count as having shown "Celal's Gambit"

#### Scenario: The Cursed card of a Cursed Pack
- **WHEN** Ayla chose a card from a Kesqerian Nights Cursed Pack, and "Abandon All Hope" went to her hand with it
- **THEN** "Abandon All Hope" has "Ele geçti" 1, from a pack

### Requirement: Counting time in hands
"Elde kaldı" SHALL add up the time of each of a card's holdings, from when it was given to when it closed, or to now while it is open, in whole days rounded down. Its average SHALL be that total divided by the number of holdings, in days with one decimal, in Turkish number format.

#### Scenario: Four stays
- **WHEN** a card's four holdings lasted 4, 5, 3 and 2 days
- **THEN** "Elde kaldı" shows "14 gün" with "ortalama 3,5 gün"

#### Scenario: A card held right now
- **WHEN** Ayla has held a card for 3 days, and it has no other holdings
- **THEN** "Elde kaldı" shows "3 gün"

### Requirement: The Kart geçmişi page
Every card SHALL have a Kart geçmişi page under its own URL: below the Kart kütüphanesi's address for a Legend or Blessed card, below the Cursed Deck's for a Cursed card. The menu SHALL keep that screen marked. The page SHALL have a back link to it, and SHALL show the same page again on reload.

#### Scenario: Opening a Legend card's page
- **WHEN** a user opens the Kart geçmişi of "Aboleth's Eyes"
- **THEN** the page is shown under the Kart kütüphanesi's address, "Kart kütüphanesi" is marked in the menu, and the page has the link "← Kart kütüphanesi"

#### Scenario: A Cursed card's page
- **WHEN** a user opens the Kart geçmişi of "Abandon All Hope"
- **THEN** the page is shown under the Cursed Deck's address, with "Cursed Deck" marked and the link "← Cursed Deck"

#### Scenario: Reloading
- **WHEN** a user reloads the browser on the Kart geçmişi of "Aboleth's Eyes"
- **THEN** the same page is shown again

### Requirement: The card on its page
The Kart geçmişi page SHALL show the card's face large, its name as the page's heading, and its set, rarity, cost and mechanic pack as labels. A pill SHALL give its status with the Kart kütüphanesi's Durum text, or "Taslak" or "Kaldırıldı" for a draft or a retired card. A Cursed card's labels SHALL be "Cursed" and its cost.

#### Scenario: A card in the pool
- **WHEN** a user opens the page of "Aboleth's Eyes", a Common Kesqerian Nights card of Arcanus Divine that costs 1 and is in the pool
- **THEN** the page shows its face, the heading "Aboleth's Eyes", the labels "Kesqerian Nights", "Common", "Cost 1" and "Arcanus Divine", and the pill "Havuzda"

#### Scenario: A held card
- **WHEN** Bora holds "Jann In A Bottle" and a user opens its page
- **THEN** its pill reads "Elde: Bora"

### Requirement: The card's stat tiles
The Kart geçmişi page SHALL show eight tiles: "Ele geçti" with its parts by DM, draw and pack; "Kullanıldı" with the LP paid; "Discard"; "Transfer"; "Pakette göründü" with how often the card was chosen, or for a Cursed card how often it went to a hand; "Farklı oyuncu" with their names; "Elde kaldı" with its average; and "Son kullanım" with the date of the first holding.

#### Scenario: A card with a history
- **WHEN** "Aboleth's Eyes" was given by the DM to Dana, drawn by Bora, transferred to Ayla, discarded, shown in two packs and chosen from one by Ayla, used by Dana on 24 October and by Ayla on 14 November 2026, each for 1 LP
- **THEN** the tiles show "Ele geçti" 3 with "DM 1 · Çekiliş 1 · Paket 1", "Kullanıldı" 2 with "toplam 2 LP ödendi", "Discard" 1, "Transfer" 1, "Pakette göründü" 2 with "1 kez seçildi", "Farklı oyuncu" 3 with "Ayla, Bora, Dana", and "Son kullanım" "14 Kas 2026"

### Requirement: The Geçmiş list
The page SHALL list what happened to the card, newest first, grouped under the date in Turkish as the İşlem Logu groups its events. Each row SHALL give the time, who did what, and its details: how a card was drawn and paid for, the pack, the character and LP of a use, and who closed a holding.

#### Scenario: The rows of a card's history
- **WHEN** a user opens the page of the card in "The card's stat tiles"
- **THEN** the Geçmiş list starts with "Ayla kullandı" with "Kael üzerinde · 1 LP", and shows "Ayla, Kesqerian Nights Premium Pack'ten seçti", "Bora'nın Kesqerian Nights Standard Pack'inde göründü" with "Seçilmedi", "Ayla'nın elinden discard edildi", "Bora'dan Ayla'ya transfer edildi", "Bora çekti" with "Rastgele çekiliş · 1 LP", "Dana kullandı" and "DM, Dana'ya verdi"

#### Scenario: A transfer is one row
- **WHEN** the DM transferred a card from Bora to Ayla
- **THEN** the list shows one row for the transfer, not a row for each holding

#### Scenario: Grouped by day
- **WHEN** the card was chosen from a pack on 12 November 2026 and used on 14 November 2026
- **THEN** the use is listed under "14 Kasım 2026", above the choice under "12 Kasım 2026"

### Requirement: A card without a history
A card that no hand ever held SHALL show its tiles with 0 or "—", and the Geçmiş list SHALL say "Bu kart henüz kimsenin eline geçmedi." The packs that showed the card SHALL still be listed and counted.

#### Scenario: A card never given
- **WHEN** a user opens the page of "Hüssam's Heist", which no hand ever held and no pack ever showed
- **THEN** every count is 0 or "—", and the list says "Bu kart henüz kimsenin eline geçmedi."

### Requirement: Who opens a card's page
The DM SHALL open the page of every card. A player SHALL open the page of an active card that is not DM-only, and of a DM-only or retired card while someone holds it. Otherwise, and for an address that names no card or the wrong screen for the card's kind, the page SHALL say "Kart bulunamadı." with the back link.

#### Scenario: A draft
- **WHEN** Ayla opens the address of a draft card's page
- **THEN** the page says "Kart bulunamadı." with the link "← Kart kütüphanesi"

#### Scenario: A held DM-only card
- **WHEN** Bora holds the DM-only card "The Last Wish", and Ayla opens its page
- **THEN** Ayla sees its history

#### Scenario: A DM-only card no one holds
- **WHEN** no one holds the DM-only card "The Last Wish", and Ayla opens its address
- **THEN** the page says "Kart bulunamadı."

#### Scenario: The DM
- **WHEN** the DM opens the page of a draft
- **THEN** the DM sees its page with the pill "Taslak"

### Requirement: Loading and errors on the statistics pages
While their records load, the Kart geçmişi and Set istatistikleri pages SHALL show a loading state. When a record cannot be read, the page SHALL say in Turkish that the history could not be loaded.

#### Scenario: Records that fail
- **WHEN** a user opens a card's page and its holdings cannot be read
- **THEN** the page says in Turkish that the card's history could not be loaded

### Requirement: The Set istatistikleri page
Every stored set SHALL have a Set istatistikleri page under its own URL below the Setler screen's address. The menu SHALL keep "Setler" marked. The page SHALL have the link "← Setler", show the same page again on reload, and say "Böyle bir set yok." for an address that names no stored set.

#### Scenario: Opening a set's page
- **WHEN** a user opens the Set istatistikleri of Kesqerian Nights
- **THEN** the page is shown under the Setler screen's address, "Setler" is marked, and the page has the link "← Setler"

#### Scenario: An unknown set
- **WHEN** a user opens a set address that names no stored set
- **THEN** the page says "Böyle bir set yok." with the link "← Setler"

### Requirement: The set at the top of its page
The Set istatistikleri page SHALL show the set's cardback, its official name as the page's heading, its code and its pack layout, and its Cardmaker. A missing picture SHALL leave the neutral back in the cardback's place and no Cardmaker.

#### Scenario: Kesqerian Nights
- **WHEN** a user opens the Set istatistikleri of Kesqerian Nights
- **THEN** the page shows its cardback, the heading "Kesqerian Nights", "code: Kesqer · Standart / Premium / Cursed", and its Cardmaker

### Requirement: The cards a set's page counts
A set's page SHALL list and count the cards of that set that the Setler screen counts for the viewer: every card of the set, whatever its status, for the DM; the active cards that are not DM-only for a player. On the DM's page, drafts, DM-only cards and retired cards SHALL be marked "Taslak", "DM'e özel" and "Kaldırıldı".

#### Scenario: A player's page
- **WHEN** Kesqer has 120 active cards, 1 draft and 1 active DM-only card, and Ayla opens its page
- **THEN** the page counts and lists 120 cards

#### Scenario: The DM's page
- **WHEN** the DM opens the same page
- **THEN** it counts and lists 122 cards, the draft marked "Taslak" and the DM-only card "DM'e özel"

### Requirement: The set's tiles
A set's page SHALL show eight tiles over the cards it counts: "Kart"; "Havuzda", the cards in the pool; "Elde", the cards at least one hand holds; "Ele geçti" with its parts; "Kullanıldı" with the LP paid; "Discard" with the transfers; "Açılan pack", the set's pack openings that were not cancelled, with their number by pack type; and "Hiç ele geçmedi".

#### Scenario: Reading the tiles
- **WHEN** Ayla opens the page of Kesqerian Nights, whose 120 cards have 103 in the pool and 17 in hands, and whose packs were opened 21 times as Standard, 12 as Premium and 4 as Cursed, besides one cancelled pack
- **THEN** the tiles show "Kart" 120, "Havuzda" 103, "Elde" 17, and "Açılan pack" 37 with "Standard 21 · Premium 12 · Cursed 4"

#### Scenario: Cards never held
- **WHEN** 58 of those cards were never in a hand
- **THEN** "Hiç ele geçmedi" shows 58

### Requirement: The set's card table
A set's page SHALL list its cards in a table with the columns Kart, Rarity, Cost, Ele geçti, Kullanıldı, Discard, Pakette (shown / chosen) and Durum. It SHALL start sorted by Kullanıldı, most first, then by name. Every column heading SHALL sort, and a second selection SHALL reverse the order. Each card's name SHALL link to its Kart geçmişi.

#### Scenario: The first rows
- **WHEN** "Jann In A Bottle" was used 4 times, more than any other Kesqer card, and a user opens the page
- **THEN** its row is first, with Pakette "9 / 3" when it was shown in 9 packs and chosen from 3

#### Scenario: Sorting by discards
- **WHEN** a user selects the Discard heading
- **THEN** the cards with the most discards come first, and a second selection puts the fewest first

#### Scenario: Following a name
- **WHEN** a user selects "Aboleth's Eyes" in the table
- **THEN** its Kart geçmişi opens

### Requirement: Search and rarity in the set's table
The set's table SHALL offer a search that matches names and texts as the Kart kütüphanesi's search does, and a rarity filter with "Tüm rarity'ler", "Common" and "Rare". They SHALL narrow the table only, and SHALL NOT change the tiles.

#### Scenario: Searching
- **WHEN** a user types "gambit" in the search
- **THEN** the table lists only the set's cards whose name or text contains "gambit", and the tiles stay as they were

### Requirement: The statistics pages at phone width
At 360 CSS pixels wide, the Kart geçmişi and Set istatistikleri pages SHALL put their parts under each other and wrap their tiles. The set's table SHALL scroll sideways inside its own area. Neither page SHALL scroll horizontally.

#### Scenario: A phone
- **WHEN** a user opens the Set istatistikleri of Kesqerian Nights 360 CSS pixels wide
- **THEN** the tiles wrap, the table scrolls inside its area, and the page has no horizontal scrollbar
