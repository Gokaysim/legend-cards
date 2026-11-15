# Spec Delta

## ADDED Requirements

### Requirement: Behavior flags in the log
An edit event that changes a behavior flag SHALL show it as a changed field, with the flag's label from the form and "evet" or "hayır" before and after, for example "Kart çekmede çıkar: evet → hayır". A player SHALL see that event when the definition is visible to players on either side of it (spec: definition-editing, "Who reads the change records").

#### Scenario: A card kept out of draws
- **WHEN** the DM turns off "Kart çekmede çıkar" of the active card "Aboleth's Eyes", and Ayla opens the İşlem Logu
- **THEN** she sees one event naming the DM, "Aboleth's Eyes", and "Kart çekmede çıkar: evet → hayır"

#### Scenario: Hiding a card
- **WHEN** the DM turns off "Listede görünür" of the active card "Aboleth's Eyes", and Ayla opens the İşlem Logu
- **THEN** she sees one event with "Listede görünür: evet → hayır"

#### Scenario: A Cursed card's draw flag
- **WHEN** the DM turns off the draw flag of the Cursed card "Visions of Death"
- **THEN** the event shows "Cursed Deck'te çıkar: evet → hayır"

### Requirement: A kept card's use is one event
A use of a card that stays in the hand SHALL appear as one event, at the time it was used, with the same text as a card that leaves the hand (spec: "Event rows"). Each use SHALL be its own event.

#### Scenario: Using a kept card twice
- **WHEN** Ayla uses her kept 2-cost card "Lucky Coin" on "Thorin", and later again without a character
- **THEN** the log shows "Lucky Coin kartını Thorin üzerinde kullandı (−2 LP)." and, above it, "Lucky Coin kartını kullandı (−2 LP)."

## MODIFIED Requirements

### Requirement: One list of what happened
The İşlem Logu screen SHALL list, newest first and live, every card given, drawn, used, discarded, and transferred, every pack opened, every True Word draft, every word the DM teaches or takes back, every use of a card or True Word that stays in the hand, every LP and GP change, every definition change, and every set change. It SHALL be read from the holdings (the learned True Words among them), the draws, packs and True Word drafts, the use records, the ledger, the change records and the set change records, so it never disagrees with them. Switching a card or a word active, notes, and cost overrides SHALL NOT be listed.

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

#### Scenario: A taught word is not a card given
- **WHEN** the DM teaches Bora "Aid"
- **THEN** the log shows that the DM taught Bora "Aid", and no event of a card given

### Requirement: Definition changes are events
Each definition change record SHALL appear as one event. It names who made the change (the DM, or "Import"), the card or word, and the step: added, edited, published, retired, brought back or deleted. An edit SHALL show each changed field before and after. A publish and an add straight to active SHALL show the definition. Events of the DM's work on drafts and on definitions whose "Listede görünür" is off SHALL be marked as visible to the DM only.

#### Scenario: An edit
- **WHEN** the DM changes the cost of "Aboleth's Eyes" from "2" to "3"
- **THEN** the log shows one event naming the DM, "Aboleth's Eyes", and the cost "2 → 3"

#### Scenario: A retire
- **WHEN** the DM retires the True Word "Abyss"
- **THEN** the log shows that the DM retired the True Word "Abyss"

#### Scenario: Draft work in the DM's log
- **WHEN** the DM adds the draft "Bard's Encore" and opens the İşlem Logu
- **THEN** the event of adding it is marked as visible to the DM only

#### Scenario: Work on a DM-only card
- **WHEN** the DM changes the text of the active card "The Last Wish", whose "Listede görünür" is off
- **THEN** the DM's log marks that event as visible to the DM only, and Ayla's log does not show it

### Requirement: An import is one event
An import's change record SHALL appear as one event naming "Import", whether cards or True Words were added or got pictures, how many, and their names. A player SHALL see only the event of the active additions, or of the active and retired definitions that got pictures, leaving out the definitions whose "Listede görünür" is off.

#### Scenario: The first import
- **WHEN** the repository card files were imported into empty emulators, and Ayla opens the İşlem Logu
- **THEN** she sees one event that the import added 742 cards, and no event of the 3 drafts

#### Scenario: A picture import
- **WHEN** the picture import gave pictures to 700 active cards and to the draft "The Cartographer", and Ayla opens the İşlem Logu
- **THEN** she sees one event that the import gave pictures to 700 cards, and no event of "The Cartographer"

#### Scenario: A picture for a DM-only card
- **WHEN** the picture import gave pictures to 700 active cards, one of them "The Last Wish", whose "Listede görünür" is off, and Ayla opens the İşlem Logu
- **THEN** she sees one event that the import gave pictures to 699 cards, and the DM's log also shows a DM-only event naming "The Last Wish"

## REMOVED Requirements

### Requirement: The DM-only flag in the log
**Reason**: The DM-only flag is removed. Flag changes show under "Behavior flags in the log".
**Migration**: None.
