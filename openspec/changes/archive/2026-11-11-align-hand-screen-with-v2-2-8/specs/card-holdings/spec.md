# Spec Delta

## MODIFIED Requirements

### Requirement: Hand screen per player
The "Oyuncu elleri" screen SHALL show one player's hand, and each player's hand SHALL have its own URL. A player opening the screen SHALL see their own hand. The DM SHALL see the first user of the "Oyuncular" list who is not the DM, or their own hand when there is none. The screen SHALL be titled "Oyuncu elleri", and the open tab's panel SHALL name whose hand it shows, for example "Ayla — Kart Eli" on the Kartlar tab.

#### Scenario: A player opens the screen
- **WHEN** Ayla opens "Oyuncu elleri"
- **THEN** she sees her own hand under the title "Oyuncu elleri", headed "Ayla — Kart Eli"

#### Scenario: The DM opens the screen
- **WHEN** the DM opens "Oyuncu elleri" and the "Oyuncular" list is Ayla, Bora, and the DM
- **THEN** the DM sees Ayla's hand

#### Scenario: Reloading a hand URL
- **WHEN** a user reloads the browser on Bora's hand URL
- **THEN** Bora's hand is shown again

#### Scenario: An unknown player
- **WHEN** a user opens the hand URL of a user ID that has no profile
- **THEN** the screen says in Turkish that there is no such player

### Requirement: Hand summary
Above the hand, the screen SHALL show how many cards the hand holds, how many effects are active, how many distinct sets the cards come from, how many are Cursed, and how many True Words the player knows. The active effects SHALL count the active cards and the active True Words. It SHALL list the active cards with their visible text, marking the Cursed ones, then the active True Words, marked ✦, and the sets with their card counts. True Words SHALL NOT count as cards. The active effects list SHALL open from the "Aktif efekt ⓘ" stat and the sets list from the "Farklı set ⓘ" stat: while the pointer rests on the stat, while the stat has the keyboard focus, and after a tap on it until the focus leaves it. Screen readers SHALL be able to read both lists at all times. The lists SHALL NOT widen the page.

#### Scenario: Reading the summary
- **WHEN** Ayla holds 3 Kesqer cards, 1 Havenholm card, and 1 Cursed card, and 2 of the cards are active
- **THEN** the summary shows 5 cards, 2 active, 2 sets, and 1 Cursed card, and lists the 2 active cards and both sets with their counts

#### Scenario: True Words in the summary
- **WHEN** Ayla holds 5 cards, 2 of them active, and knows 3 True Words, 1 of them "Abyss", which is active
- **THEN** the summary shows 5 cards, 3 active, and 3 True Words, and lists "Abyss" marked ✦ after the 2 active cards

#### Scenario: Pointing at the active effects
- **WHEN** a user rests the mouse pointer on the "Aktif efekt ⓘ" stat of Ayla's hand
- **THEN** the list of her active effects shows, and it goes away when the pointer leaves the stat

#### Scenario: Tapping the sets on a phone
- **WHEN** a user taps the "Farklı set ⓘ" stat of Ayla's hand on a phone 360 CSS pixels wide
- **THEN** the list of her sets with their card counts shows without a horizontal scrollbar, and it goes away when the user taps elsewhere

#### Scenario: Lists closed
- **WHEN** a user opens Ayla's hand and neither stat is pointed at, focused or tapped
- **THEN** neither list shows on the screen, and a screen reader can still read both

## ADDED Requirements

### Requirement: Card details beside the hand
In a window at least 1024 CSS pixels wide, the Kartlar tab SHALL show a "Seçili Kart" panel at the right of the hand. Selecting a card SHALL show its details there, with the same contents and controls as the dialog on narrow windows. The panel SHALL stay in view while the page scrolls. The selected card SHALL be marked in both views. Without a selection, the panel SHALL say "Detayları görmek için elden bir kart seç."

#### Scenario: Selecting a card on a desktop
- **WHEN** Ayla selects "Aboleth's Eyes" in her hand in a window 1280 CSS pixels wide
- **THEN** its details show in the "Seçili Kart" panel at the right of the hand, no dialog opens, and the card is marked as selected

#### Scenario: Selecting another card
- **WHEN** the panel shows "Aboleth's Eyes", and Ayla selects "Night Owl"
- **THEN** the panel shows "Night Owl", and only "Night Owl" is marked as selected

#### Scenario: The list view
- **WHEN** Ayla selects "Night Owl" in the list view of her hand in a wide window
- **THEN** its row is marked as selected, and its details show in the panel

#### Scenario: No selection
- **WHEN** a user opens Ayla's hand in a wide window
- **THEN** the panel says "Detayları görmek için elden bir kart seç."

#### Scenario: The card leaves the hand
- **WHEN** the panel shows Ayla's "Night Owl", and the DM discards it on another device
- **THEN** the panel goes back to "Detayları görmek için elden bir kart seç."

#### Scenario: Scrolling a long hand
- **WHEN** Ayla scrolls down her hand of 20 cards and selects the last one
- **THEN** the panel with its details is in view without scrolling back up

### Requirement: Card details in a dialog on narrow windows
In a window narrower than 1024 CSS pixels, selecting a card SHALL open its details in a dialog, and the hand SHALL have no side panel. Crossing 1024 CSS pixels, for example by turning a tablet, SHALL clear the selection, so no dialog opens by itself.

#### Scenario: Selecting a card on a phone
- **WHEN** Ayla selects "Aboleth's Eyes" in her hand on a phone
- **THEN** its details open in a dialog

#### Scenario: Turning a tablet
- **WHEN** a card's details show in the panel on a tablet 1100 CSS pixels wide, and the tablet is turned to 800 CSS pixels wide
- **THEN** no dialog opens, and no card is selected
