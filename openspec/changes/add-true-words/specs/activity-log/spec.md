# Spec Delta

## MODIFIED Requirements

### Requirement: One list of what happened
The İşlem Logu screen SHALL list, newest first and live, every card given, drawn, used, discarded, and transferred, every pack opened, every True Word draft, every True Word the DM teaches or takes back, and every LP and GP change. The list SHALL be read from the card holdings, the draw and pack records, the True Word drafts and learned words, and the ledger, so it never disagrees with them. Switching a card or a True Word active, notes, and cost overrides SHALL NOT be listed.

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

#### Scenario: Live update
- **WHEN** Ayla uses a card while Bora has the log open
- **THEN** the event appears at the top of Bora's log without a reload

#### Scenario: State changes are not events
- **WHEN** the DM makes a card in Ayla's hand active, or one of her True Words
- **THEN** the log shows no new event

### Requirement: Player filter
The log SHALL offer a filter for one user. With a user chosen, it SHALL list only the cards that user received, including the cards drawn into their hand and the packs opened for them, the cards that left their hand, their True Word drafts, the True Words the DM taught them or took back from them, and the changes of their LP. Party purse changes SHALL be listed only without a filter.

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

#### Scenario: A transfer between two players
- **WHEN** a user chooses Bora in the filter after the DM transferred a card from Ayla to Bora
- **THEN** the transfer is listed

## ADDED Requirements

### Requirement: A True Word draft is one event
A True Word draft SHALL appear as one event, at the time it started. It names who started it, the player it is for, the payment or "ücretsiz", the 3 words it showed, and how it ended: the word learned, "pas geçti", or a cancel with its refund. While the draft is open, the event says so, and it SHALL update live. Its learned word, payment and refund SHALL NOT appear as separate events.

#### Scenario: A learned word
- **WHEN** Ayla starts a draft for 3 LP and learns "Abyss"
- **THEN** the log shows one event naming Ayla, −3 LP, the 3 words, and "Abyss", and no separate event for the word or for the LP change

#### Scenario: A skipped draft
- **WHEN** Bora skips a draft that the DM started for him for free
- **THEN** the event names the DM, Bora, "ücretsiz", the 3 words, and says that Bora skipped it

#### Scenario: A cancelled draft
- **WHEN** the DM cancels a draft that Ayla paid 3 LP for
- **THEN** the draft's event says that the DM cancelled it and refunded 3 LP, and there is no separate event for the refund

#### Scenario: An open draft
- **WHEN** Ayla has started a draft and has not chosen yet
- **THEN** the event says that Ayla's draft is open, and it changes as soon as the draft ends

### Requirement: True Words taught and taken back are events
A True Word the DM teaches SHALL appear as one event naming the DM, the player, and the word. A True Word the DM takes back SHALL appear as one event, at the time it was taken back, naming the DM, the player, and the word.

#### Scenario: Teaching a word
- **WHEN** the DM teaches Bora "Aid"
- **THEN** the log shows an event that the DM taught Bora "Aid"

#### Scenario: Taking back a word
- **WHEN** the DM takes back "Abyss" from Ayla
- **THEN** the log shows an event that the DM took back "Abyss" from Ayla, and the event of how she learned it stays
