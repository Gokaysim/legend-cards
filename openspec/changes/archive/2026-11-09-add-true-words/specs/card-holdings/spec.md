# Spec Delta

## MODIFIED Requirements

### Requirement: Hand summary
Above the hand, the screen SHALL show how many cards the hand holds, how many effects are active, how many distinct sets the cards come from, how many are Cursed, and how many True Words the player knows. The active effects SHALL count the active cards and the active True Words. It SHALL list the active cards with their visible text, marking the Cursed ones, then the active True Words, marked ✦, and the sets with their card counts. True Words SHALL NOT count as cards.

#### Scenario: Reading the summary
- **WHEN** Ayla holds 3 Kesqer cards, 1 Havenholm card, and 1 Cursed card, and 2 of the cards are active
- **THEN** the summary shows 5 cards, 2 active, 2 sets, and 1 Cursed card, and lists the 2 active cards and both sets with their counts

#### Scenario: True Words in the summary
- **WHEN** Ayla holds 5 cards, 2 of them active, and knows 3 True Words, 1 of them "Abyss", which is active
- **THEN** the summary shows 5 cards, 3 active, and 3 True Words, and lists "Abyss" marked ✦ after the 2 active cards
