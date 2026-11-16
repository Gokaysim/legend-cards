## MODIFIED Requirements

### Requirement: Event rows
Each event SHALL show its time, the name of the user who did it with the DM marked, and what happened, in Turkish. A card event SHALL name the card and the player. When the user who used or discarded a card is its holder, the row's name SHALL name the player, and the sentence SHALL NOT repeat whose hand it was. A used card SHALL show the character, if one was given, and the LP paid, if more than 0. A balance change SHALL show the account, the change, the balance before and after, and the reason.

#### Scenario: A used card
- **WHEN** Ayla uses "Aboleth's Eyes" on "Thorin"
- **THEN** the event shows the time, Ayla, "Aboleth's Eyes", and "Thorin"

#### Scenario: A paid use
- **WHEN** Ayla uses her 2-cost "Aboleth's Eyes" on "Thorin"
- **THEN** the event reads "Aboleth's Eyes kartını Thorin üzerinde kullandı (−2 LP)."

#### Scenario: A free use
- **WHEN** the DM uses Ayla's 3-cost "Aboleth's Eyes" with the amount 0
- **THEN** the event names Ayla and the card, and shows no payment

#### Scenario: The DM discards a card
- **WHEN** the DM discards "Aboleth's Eyes" from Ayla's hand
- **THEN** the event shows the DM's name marked as DM, and reads "Ayla'nın elinden Aboleth's Eyes kartını attı."

#### Scenario: A player discards their own card
- **WHEN** Ayla discards "Aboleth's Eyes" from her own hand
- **THEN** the event shows Ayla's name, not marked as DM, and reads "Aboleth's Eyes kartını attı."

#### Scenario: An LP change
- **WHEN** the DM adds 2 LP to Ayla, who had 5 LP, with the reason "Boss'u yendi"
- **THEN** the event shows the time, the DM's name marked as DM, Ayla, +2 LP, 5 → 7, and "Boss'u yendi"

#### Scenario: A player's own LP change
- **WHEN** Ayla, who had 5 LP, lowers her own LP by 1 with the reason "d20 avantajı"
- **THEN** the event shows the time, Ayla's name not marked as DM, Ayla as the account, −1 LP, 5 → 4, and "d20 avantajı"

#### Scenario: A GP change
- **WHEN** the DM adds 5,000 GP to a purse of 7,500 GP with the reason "Ejderha hazinesi"
- **THEN** the event shows "Grup kesesi", +5.000 GP, 7.500 → 12.500, and "Ejderha hazinesi"
