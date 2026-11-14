# Spec Delta

## MODIFIED Requirements

### Requirement: Hand summary
Above the hand, the screen SHALL show how many cards the hand holds, how many effects are active, how many distinct sets the cards come from, how many are Cursed, and how many True Words the player knows. The active effects SHALL count the active cards, the active True Words, and the stored effects on the player's active characters. It SHALL list the active cards with their visible text, marking the Cursed ones, then the active True Words, marked ✦, then each active character's stored effects under its name, and the sets with their card counts. True Words SHALL NOT count as cards. The active effects list SHALL open from the "Aktif efekt ⓘ" stat and the sets list from the "Farklı set ⓘ" stat: while the pointer rests on the stat, while the stat has the keyboard focus, and after a tap on it until the focus leaves it. Screen readers SHALL be able to read both lists at all times. The lists SHALL NOT widen the page.

#### Scenario: Reading the summary
- **WHEN** Ayla holds 3 Kesqer cards, 1 Havenholm card, and 1 Cursed card, and 2 of the cards are active
- **THEN** the summary shows 5 cards, 2 active, 2 sets, and 1 Cursed card, and lists the 2 active cards and both sets with their counts

#### Scenario: True Words in the summary
- **WHEN** Ayla holds 5 cards, 2 of them active, and knows 3 True Words, 1 of them "Abyss", which is active
- **THEN** the summary shows 5 cards, 3 active, and 3 True Words, and lists "Abyss" marked ✦ after the 2 active cards

#### Scenario: Character effects in the summary
- **WHEN** Ayla holds 1 active card, "Thorin" has 2 stored effects, and her archived "Kuzgun" has 1
- **THEN** the summary shows 3 active, and lists the active card, then "Thorin" with its 2 effects

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

### Requirement: Adding the effect of a card's use
When a character is chosen from the list, the use step SHALL show "Aktif efekt olarak ekle", checked. With it checked, the use SHALL add the card's effect to that character in the same step (spec: character-effects, "Effects of a use"). Without a chosen character, with a typed name, or with the box unchecked, the use SHALL add no effect.

#### Scenario: Checked by default
- **WHEN** Ayla chooses "Thorin" in the use step of "Lord Vulfric's Valour" and confirms
- **THEN** the card is used, and "Thorin" has its effect

#### Scenario: An instant card
- **WHEN** Ayla chooses "Thorin", unchecks "Aktif efekt olarak ekle", and confirms
- **THEN** the card is used on "Thorin", and no effect is added

#### Scenario: A typed name
- **WHEN** the DM chooses "Başka (yaz)…" and types "Goblin şefi"
- **THEN** the step shows no "Aktif efekt olarak ekle", and the use adds no effect
