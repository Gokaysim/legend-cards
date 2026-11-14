# Spec Delta

## MODIFIED Requirements

### Requirement: One list of what happened
The İşlem Logu screen SHALL list, newest first and live, every card given, drawn, used, discarded, and transferred, every pack opened, every True Word draft, every word the DM teaches or takes back, every True Word use, every LP and GP change, every definition change, and every set change. It SHALL be read from the holdings, draws, packs, True Word drafts, learned words and word uses, the ledger, the change records and the set change records, so it never disagrees with them. Switching a card or a word active, notes, and cost overrides SHALL NOT be listed.

#### Scenario: Events from both sources
- **WHEN** the DM gives Ayla a card and then adds 2 LP to Bora
- **THEN** the log shows the LP change first and the card given below it

#### Scenario: A draw among the events
- **WHEN** the DM adds 2 LP to Bora, and then Ayla draws a card
- **THEN** the log shows the draw first and the LP change below it

#### Scenario: A pack among the events
- **WHEN** the DM adds 2 LP to Bora, and then Ayla opens a pack
- **THEN** the log shows the pack first and the LP change below it

#### Scenario: A True Word draft among the events
- **WHEN** the DM adds 2 LP to Bora, and then Ayla starts a True Word draft
- **THEN** the log shows the draft first and the LP change below it

#### Scenario: A True Word use among the events
- **WHEN** the DM adds 2 LP to Bora, and then Ayla uses "Abyss"
- **THEN** the log shows the use of "Abyss" first and the LP change below it

#### Scenario: A definition change among the events
- **WHEN** the DM adds 2 LP to Bora, and then fixes the text of "Aboleth's Eyes"
- **THEN** the log shows the text change first and the LP change below it

#### Scenario: A set change among the events
- **WHEN** the DM adds 2 LP to Bora, and then renames the set "Ulagal"
- **THEN** the log shows the set change first and the LP change below it

#### Scenario: Live update
- **WHEN** Ayla uses a card while Bora has the log open
- **THEN** the event appears at the top of Bora's log without a reload

#### Scenario: State changes are not events
- **WHEN** the DM makes a card in Ayla's hand active, or one of her True Words
- **THEN** the log shows no new event

### Requirement: Event rows
Each event SHALL show its time, the name of the user who did it with the DM marked, and what happened, in Turkish. A card event SHALL name the card and the player. A used card SHALL show the character, if one was given, and the LP paid, if more than 0. A balance change SHALL show the account, the change, the balance before and after, and the reason.

#### Scenario: A used card
- **WHEN** Ayla uses "Aboleth's Eyes" on "Thorin"
- **THEN** the event shows the time, Ayla, "Aboleth's Eyes", and "Thorin"

#### Scenario: A paid use
- **WHEN** Ayla uses her 2-cost "Aboleth's Eyes" on "Thorin"
- **THEN** the event reads "Aboleth's Eyes kartını Thorin üzerinde kullandı (−2 LP)."

#### Scenario: A free use
- **WHEN** the DM uses Ayla's 3-cost "Aboleth's Eyes" with the amount 0
- **THEN** the event names Ayla and the card, and shows no payment

#### Scenario: An LP change
- **WHEN** the DM adds 2 LP to Ayla, who had 5 LP, with the reason "Boss'u yendi"
- **THEN** the event shows the time, the DM's name marked as DM, Ayla, +2 LP, 5 → 7, and "Boss'u yendi"

#### Scenario: A GP change
- **WHEN** the DM adds 5,000 GP to a purse of 7,500 GP with the reason "Ejderha hazinesi"
- **THEN** the event shows "Grup kesesi", +5.000 GP, 7.500 → 12.500, and "Ejderha hazinesi"

### Requirement: Player filter
The log SHALL offer a filter for one user. With a user chosen, it SHALL list only the cards that user received, including the cards drawn into their hand and the packs opened for them, the cards that left their hand, their True Word drafts, the True Words the DM taught them or took back from them, the uses of their True Words, and the changes of their LP. Party purse changes and definition changes SHALL be listed only without a filter.

#### Scenario: Filtering by a player
- **WHEN** a user chooses Ayla in the filter
- **THEN** only the card events of Ayla's hand, Ayla's True Word events, and Ayla's LP changes are listed

#### Scenario: Draws in the filter
- **WHEN** a user chooses Ayla in the filter after the DM drew a card into Ayla's hand and Bora drew one into his own
- **THEN** the draw into Ayla's hand is listed, and Bora's draw is not

#### Scenario: Packs in the filter
- **WHEN** a user chooses Ayla in the filter after the DM opened a pack for Ayla
- **THEN** that pack is listed

#### Scenario: True Words in the filter
- **WHEN** a user chooses Ayla in the filter after the DM started a draft for Ayla and taught Bora a word
- **THEN** Ayla's draft is listed, and the word taught to Bora is not

#### Scenario: True Word uses in the filter
- **WHEN** a user chooses Ayla in the filter after Ayla used "Abyss" and Bora used "Aid"
- **THEN** Ayla's use of "Abyss" is listed, and Bora's use of "Aid" is not

#### Scenario: A transfer between two players
- **WHEN** a user chooses Bora in the filter after the DM transferred a card from Ayla to Bora
- **THEN** the transfer is listed

#### Scenario: Definition changes in the filter
- **WHEN** a user chooses Ayla in the filter after the DM changed the text of a card that Ayla holds
- **THEN** the text change is not listed

## ADDED Requirements

### Requirement: A use's payment is part of the use
A card's or a True Word's use payment SHALL appear only inside its use event, never as a separate balance change.

#### Scenario: One event for a paid card use
- **WHEN** Ayla uses her 2-cost "Aboleth's Eyes"
- **THEN** the log shows one event for the use with "−2 LP", and no separate LP change

#### Scenario: One event for a paid word use
- **WHEN** Ayla uses "Abyss" for 5 LP
- **THEN** the log shows one event for the use with "−5 LP", and no separate LP change

### Requirement: A True Word use is one event
A True Word use SHALL appear as one event, at the time it was used. It names who used the word, the player whose word it is when the DM used it, the word, and the LP paid, if more than 0.

#### Scenario: A player uses a word
- **WHEN** Ayla uses "Abyss" for 5 LP
- **THEN** the event reads "Abyss True Word'ünü kullandı (−5 LP).", with Ayla as the user

#### Scenario: The DM uses a player's word
- **WHEN** the DM uses Ayla's "Abyss" for 5 LP
- **THEN** the event reads "Ayla'nın Abyss True Word'ünü kullandı (−5 LP).", with the DM as the user

#### Scenario: A free use
- **WHEN** Ayla uses "Chaos", which costs 0
- **THEN** the event reads "Chaos True Word'ünü kullandı.", with Ayla as the user
