# custom-cards Specification

## Purpose

Lets a player build a one-off Custom Card from random custom effects in a paid Custom Card Draft. The finished card stays in their hand until it is used or discarded, and then it is gone.

## Requirements

### Requirement: Custom effect variants
There SHALL be 18 effect types: Blessed, Caster, Combat, Cursed, Damage, Discard, Draw, Effects, Enhance, Gain, Gold, Held, Reduce, Restore, Roll, Special, TW and XP. Each type SHALL have at most one text per cost: 1, 3 and 5. Every signed-in user SHALL be able to read the variants. Only the import SHALL write them.

#### Scenario: Reading the variants
- **WHEN** a signed-in player opens the Custom Card Draft
- **THEN** the draft can show the text of every stored variant

#### Scenario: A player writes a variant
- **WHEN** a signed-in user, the DM included, tries to change an effect text
- **THEN** the server denies it

### Requirement: Importing the custom effects
`import-custom-effects` SHALL read a CSV with the columns `name`, `1-cost version`, `3-cost version` and `5-cost version`, matched without regard to case. Each row SHALL be one effect type, and each cost column SHALL hold that variant's text. A row whose name is not one of the 18 types SHALL be skipped, and so SHALL an empty cell. A new import SHALL replace the stored texts of the variants it has.

#### Scenario: A first import
- **WHEN** the owner imports a CSV with 18 rows and every cell filled
- **THEN** 54 variants are stored, and the script reports in Turkish that 54 variants were stored

#### Scenario: An unknown row and an empty cell
- **WHEN** the CSV has a row named "Luck" and a Draw row with an empty 5-cost cell
- **THEN** the "Luck" row and that cell are skipped and named in the Turkish report, and the other variants are stored

#### Scenario: Missing columns
- **WHEN** the CSV has no `3-cost version` column
- **THEN** the script stops with a Turkish message naming the expected columns, and stores nothing

#### Scenario: A dry run
- **WHEN** the owner runs the import with `--dry-run`
- **THEN** the script reports what it would store, and changes nothing

### Requirement: Effect names in the import
The import SHALL match a row's name to the effect types without regard to case. It SHALL read the names "True Word" and "EXP", as the owner's file writes them, as TW and XP.

#### Scenario: The owner's names for TW and XP
- **WHEN** the CSV has rows named "True Word" and "EXP"
- **THEN** their texts are stored as the TW and XP variants

### Requirement: Imported texts and finished cards
A new import SHALL NOT change any Custom Card that is already made. A finished card keeps the effect texts it was made with.

#### Scenario: Re-importing after a card is made
- **WHEN** Ayla holds a Custom Card with a Caster effect, and the owner imports a new Caster text
- **THEN** her card still shows the old Caster text, and a new draft shows the new one

### Requirement: The Custom Card Draft screen
The Custom Card Draft screen SHALL show three choices, "1-Cost Custom Card", "3-Cost Custom Card" and "5-Cost Custom Card". Each choice SHALL show its cover picture and its price in LP. A player SHALL see the screen for themselves. The DM SHALL choose the user in "Kimin için", a DM's own hand included, and the choice SHALL be kept in the URL. The chosen user's open draft SHALL show in place of the choices.

#### Scenario: A player opens the screen
- **WHEN** Ayla, with no open draft, opens Custom Card Draft
- **THEN** she sees the three choices with their covers and "1 LP", "3 LP" and "5 LP"

#### Scenario: The DM chooses a player
- **WHEN** the DM chooses Bora in "Kimin için"
- **THEN** the choices act for Bora, and the address names Bora

#### Scenario: An open draft
- **WHEN** Ayla has an open draft and opens the screen
- **THEN** her open draft shows instead of the three choices

#### Scenario: Phone width
- **WHEN** the screen is shown 360 CSS pixels wide
- **THEN** the choices and an open draft fit the width, and the page has no horizontal scrollbar

### Requirement: Starting a Custom Card draft
A player SHALL be able to start a draft for themselves, and the DM for any user. A draft SHALL need at least one stored variant at the chosen cost. Without one, the choice SHALL be disabled with a Turkish note, and no draft SHALL start. When a draft starts, it SHALL show its first options.

#### Scenario: Starting
- **WHEN** Ayla, who has 5 LP, chooses "3-Cost Custom Card"
- **THEN** a 3-cost draft starts for her and shows up to 3 effect options

#### Scenario: No effects loaded
- **WHEN** no variant is stored
- **THEN** every choice is disabled with a Turkish note that the custom effects are not loaded

#### Scenario: A player starts a draft for another player
- **WHEN** Ayla tries to start a draft for Bora
- **THEN** the server denies it

### Requirement: Custom Card draft price
A draft SHALL cost as many LP as its card cost: 1, 3 or 5. A player SHALL pay exactly that from their own LP, in the same step that starts the draft. A player with less LP SHALL NOT start that draft. Its choice SHALL then be disabled with a Turkish note naming the price and their LP. The server SHALL deny any other amount from a player. A draft SHALL never be paid with GP.

#### Scenario: Paying for a draft
- **WHEN** Ayla, who has 5 LP, starts a 3-cost draft
- **THEN** she pays 3 LP, and she has 2 LP on every device

#### Scenario: Not enough LP
- **WHEN** Ayla has 2 LP
- **THEN** "3-Cost Custom Card" and "5-Cost Custom Card" are disabled with a note naming the price and her 2 LP, and "1-Cost Custom Card" is enabled

#### Scenario: A wrong amount
- **WHEN** Ayla writes a 5-cost draft of her own that pays 1 LP
- **THEN** the server denies it

### Requirement: The DM chooses the amount of a Custom Card draft
When the DM starts a draft for a user, the DM's own hand included, the amount SHALL start at the draft's price. The DM SHALL be able to change it to any whole number from 0 to that user's LP. The amount SHALL be taken from that user's LP in the same step that starts the draft. With 0 the draft SHALL start for free.

#### Scenario: The DM keeps the price
- **WHEN** the DM starts a 5-cost draft for Bora, who has 6 LP, without changing the amount
- **THEN** Bora pays 5 LP and has 1 LP

#### Scenario: A free draft
- **WHEN** the DM starts a 3-cost draft for Bora with the amount 0
- **THEN** the draft starts, and Bora's LP does not change

#### Scenario: More than the user has
- **WHEN** the DM enters 5 for Bora, who has 4 LP
- **THEN** the draft cannot be started, with a Turkish message naming Bora's LP

### Requirement: One open Custom Card draft per user
A user SHALL have at most one open Custom Card draft. While it is open, no other Custom Card draft SHALL be started for that user, by them or by the DM. Drafts of different users SHALL be open at the same time. An open Custom Card draft SHALL NOT stop the same user's True Word draft, or the other way round.

#### Scenario: A second draft
- **WHEN** Ayla has an open Custom Card draft, and the DM tries to start another for her
- **THEN** the screen shows her open draft instead, and the server denies a second draft

#### Scenario: Two players at once
- **WHEN** Ayla has an open draft, and Bora starts one
- **THEN** Bora's draft starts

#### Scenario: A True Word draft at the same time
- **WHEN** Ayla has an open Custom Card draft and starts a True Word draft
- **THEN** the True Word draft starts

### Requirement: Draft options
Each step SHALL show up to 3 options. They SHALL be drawn from the types not picked yet in this draft that have a text at the step's cost, each with the same chance, in random order. Each option SHALL show its picture, its type, its cost and its text. The draft's player or the DM SHALL pick one. There SHALL be no reroll and no skip.

#### Scenario: Picking an option
- **WHEN** Ayla's 3-cost draft shows Caster, Draw and Gold, and she picks Draw
- **THEN** Draw at 3-cost is among her picks, and the next step shows up to 3 options without Draw

#### Scenario: A pick that was not shown
- **WHEN** Ayla writes a pick of Roll while her draft shows Caster, Draw and Gold
- **THEN** the server denies it

#### Scenario: A player picks in another player's draft
- **WHEN** Bora tries to pick in Ayla's open draft
- **THEN** the server denies it

### Requirement: The cost of a step
A step SHALL use the draft's cost, except for the two extra picks a 3-cost Special gives. From the fourth pick on, while those extra picks remain, a step SHALL use the 1-cost variants.

#### Scenario: Steps after a 3-cost Special
- **WHEN** Ayla picks Special as one of her first three picks in a 3-cost draft
- **THEN** her fourth and fifth steps show 1-cost options

#### Scenario: A 3-cost Special as the third pick
- **WHEN** Ayla's third pick in a 3-cost draft is Special
- **THEN** the draft goes on with two 1-cost steps

### Requirement: Number of picks
A Custom Card SHALL need 3 different effects. Picking Effects SHALL add 2 picks, or 3 when it is picked at 5-cost. Picking Special at 3-cost SHALL add 2 picks. The draft's header SHALL show how many picks are made of how many are needed, and while extra 1-cost picks remain, how many.

#### Scenario: A plain card
- **WHEN** Ayla's 1-cost draft gets 3 picks, none of them Effects or Special
- **THEN** the card is finished

#### Scenario: Effects at 5-cost
- **WHEN** Ayla picks Effects in a 5-cost draft
- **THEN** the draft needs 6 picks

#### Scenario: Effects and a 3-cost Special
- **WHEN** Ayla picks Effects and Special in a 3-cost draft
- **THEN** the draft needs 7 picks, two of them at 1-cost

#### Scenario: Effects in a 1-cost step
- **WHEN** Ayla picks Effects in a 1-cost step of a 3-cost draft
- **THEN** the draft needs 2 more picks

#### Scenario: The header
- **WHEN** Ayla has made 3 picks in a 3-cost draft with a Special
- **THEN** the header says "3 / 5" and that 2 extra 1-cost picks remain

### Requirement: Too few options
When a step has no option left before the card is complete, the draft SHALL say in Turkish that the custom effects are incomplete. It SHALL show no options. It SHALL stay open until the DM cancels it.

#### Scenario: An incomplete table
- **WHEN** Ayla's 5-cost draft needs a fourth pick and no unpicked type has a 5-cost text
- **THEN** the draft shows the Turkish note and no options, and only the DM's cancel ends it

### Requirement: Resolving the effects
When the card is finished, each effect SHALL take the text of its resolved cost:
- In a 5-cost draft with Special picked at 5-cost, every other effect SHALL use its 1-cost text.
- In a 1-cost draft with Special picked at 1-cost, one random other effect that has a 3-cost text SHALL use that 3-cost text.

Every other effect SHALL keep the cost it was picked at.

#### Scenario: A 5-cost Special
- **WHEN** Ayla finishes a 5-cost draft with Special, Caster and Gold
- **THEN** her card has Special at 5-cost, and Caster and Gold at 1-cost

#### Scenario: A 1-cost Special
- **WHEN** Ayla finishes a 1-cost draft with Special, Caster and Gold
- **THEN** exactly one of Caster and Gold is at 3-cost, the other at 1-cost, and Special at 1-cost

#### Scenario: A 1-cost Special in a 3-cost draft
- **WHEN** Ayla picks Special in a 1-cost step of a 3-cost draft
- **THEN** no effect is raised to 3-cost, and the draft needs no extra picks for it

### Requirement: The cost of a Custom Card
A Custom Card's cost SHALL be computed when it is finished, from its resolved effects. It SHALL be the draft's cost, plus 1, 2 or 2 for an Effects at 1, 3 or 5-cost, minus 1, 2 or 3 for a Cursed at 1, 3 or 5-cost, and never below 0. The draft's price SHALL NOT change with it.

#### Scenario: Effects and Cursed
- **WHEN** Ayla finishes a 3-cost draft with Effects and Cursed, both at 3-cost
- **THEN** her card costs 3 (3 + 2 − 2), and she paid 3 LP for the draft

#### Scenario: A Cursed 1-cost card
- **WHEN** Ayla finishes a 1-cost draft with Cursed at 1-cost
- **THEN** her card costs 0

#### Scenario: A 5-cost Special lowers the Effects
- **WHEN** Ayla finishes a 5-cost draft with Special and Effects
- **THEN** Effects resolves to 1-cost, and her card costs 6 (5 + 1)

### Requirement: Finishing a Custom Card
The pick that completes the card SHALL also make it, in the same step:
- the card goes to the end of the player's hand, as a card received through a draft
- the draft ends as finished, naming the card

The user who made that pick SHALL be taken to that player's hand with the card selected. If any resolved effect has no text, the card SHALL NOT be made, and the user SHALL see a Turkish message.

#### Scenario: The last pick
- **WHEN** Ayla makes the third and last pick of her 1-cost draft
- **THEN** a "1-Cost Custom Card" is at the end of her hand on every device, her draft is finished, and she sees her hand with the card selected

#### Scenario: The DM finishes for a player
- **WHEN** the DM makes the last pick of Bora's draft
- **THEN** the card is at the end of Bora's hand, and the DM sees Bora's hand with the card selected

### Requirement: Custom Card fields
A Custom Card SHALL be a card of the kind "custom", named "<cost>-Cost Custom Card" after its draft cost. It SHALL have its draft cost, its computed cost, its resolved effects in pick order (each a type, a cost and a text), and the draft that made it. It SHALL have no set, rarity or mechanic pack. Its text SHALL list each effect as "<Type> (<cost>-Cost): <text>".

#### Scenario: A finished card
- **WHEN** Ayla finishes a 3-cost draft with Caster, Draw and Gold
- **THEN** her card is named "3-Cost Custom Card", costs 3, lists Caster, Draw and Gold at 3-cost with their texts, and names her draft

### Requirement: Custom Cards are never in the pool
A Custom Card SHALL have one copy. It SHALL NOT be listed in any Kütüphane tab or in "+ Kart ver". It SHALL NOT come up in a draw or a pack, and it SHALL NOT return to the pool. Its "Kart geçmişi" page SHALL show its history like any other card's.

#### Scenario: The library
- **WHEN** Ayla holds a Custom Card, and anyone opens any Kütüphane tab
- **THEN** the Custom Card is not listed

#### Scenario: The card's history
- **WHEN** a user opens the "Kart geçmişi" of Ayla's Custom Card from her hand
- **THEN** the page shows the draft that made it and its holdings

### Requirement: Using a Custom Card
A Custom Card SHALL be used like any other card in the hand, paying its cost or its hand cost. Using it SHALL close its holding. Nothing SHALL return to a pool, so the card leaves the game. A Custom Card with a Held effect SHALL have "Elde etkili" and "Kullanınca elde kalır" on: it SHALL stay in the hand when used, and each use SHALL be recorded and paid.

#### Scenario: Using a card
- **WHEN** Ayla, who has 4 LP, uses her 3-cost Custom Card
- **THEN** the card leaves her hand, she has 1 LP, and the card is in no hand, pool or list

#### Scenario: A Held card
- **WHEN** Ayla uses her Custom Card with a Held effect
- **THEN** it stays in her hand, the use is recorded and paid, and she can use it again

### Requirement: Discarding a Custom Card
The holder SHALL be able to discard their Custom Card, and the DM any Custom Card, after a confirmation that says the card will be destroyed. The details' discard button SHALL read "✕ Custom kartı yok et". A discarded Custom Card SHALL leave the game.

#### Scenario: Discarding a Held card that is done
- **WHEN** Ayla discards her Held Custom Card and confirms
- **THEN** it leaves her hand, its holding is closed as discarded, and it is in no hand, pool or list

### Requirement: Transferring a Custom Card
The DM SHALL be able to transfer a Custom Card to another hand, and to set its hand cost, as for any card with one copy. Players SHALL NOT transfer it.

#### Scenario: Moving a Custom Card
- **WHEN** the DM transfers Ayla's Custom Card to Bora and confirms
- **THEN** it is at the end of Bora's hand with its effects and note

### Requirement: The DM edits a Custom Card's effects
The DM SHALL be able to add an effect to a Custom Card, of a type it does not have, at a cost that has a text. The DM SHALL also be able to remove an effect, as long as one remains. The card's text and computed cost SHALL follow, and the step SHALL be recorded as a definition change. Players SHALL NOT change a Custom Card.

#### Scenario: A Held 5-cost effect grows the card
- **WHEN** the DM adds Roll at 1-cost to Ayla's Custom Card
- **THEN** the card lists Roll at 1-cost with its text on every device

#### Scenario: Removing the Cursed effect
- **WHEN** the DM removes Cursed at 3-cost from a card that costs 1
- **THEN** the card costs 3

#### Scenario: A player edits
- **WHEN** Ayla tries to change her Custom Card's effects
- **THEN** the server denies it

### Requirement: The Custom Card's face
A Custom Card's face SHALL show the cover picture of its draft cost. On a device with hover, hovering it SHALL show a preview that cycles through its effects' pictures. Without a cover picture, the face SHALL show its name, cost and effects as text. Its zoom view SHALL show the cover with its effects' pictures beside it, or the face without pictures.

#### Scenario: The face in the hand
- **WHEN** Ayla looks at her 3-cost Custom Card in her hand
- **THEN** it shows the 3-cost cover with its hand cost badge

#### Scenario: Hovering
- **WHEN** Ayla hovers over her Custom Card with Caster, Draw and Gold
- **THEN** the preview shows the Caster, Draw and Gold pictures in turn

### Requirement: The Custom Card's details
The card details SHALL list each effect with its type, cost and text, and SHALL show how the cost was reached, for example "3 + 2 (Effects) − 2 (Cursed)". When nothing changes the cost, only the cost SHALL show.

#### Scenario: A cost with changes
- **WHEN** Ayla selects her 3-cost Custom Card with Effects and Cursed at 3-cost
- **THEN** the details show "3 + 2 (Effects) − 2 (Cursed) = 3"

### Requirement: An open Custom Card draft survives
Closing the screen, reloading, or losing the connection SHALL NOT end a draft. An open draft SHALL show, live, to every signed-in user who opens that user's draft screen. It SHALL show the picks made so far as small pictures, and the current options. The player and the DM SHALL be able to return to it and act.

#### Scenario: Reloading during a draft
- **WHEN** Ayla reloads the application during her draft
- **THEN** her draft screen shows the same picks and the same options

#### Scenario: Watching a draft
- **WHEN** the DM watches Ayla's draft while she picks Draw
- **THEN** the DM sees Draw join her picks and the next options without a reload

### Requirement: The DM cancels a Custom Card draft
Only the DM SHALL be able to cancel an open draft, after a confirmation. The draft SHALL end without a card. Its payment SHALL be refunded in full to the user's LP, in the same step.

#### Scenario: Cancelling with a refund
- **WHEN** the DM cancels Ayla's open 5-cost draft, for which she paid 5 LP
- **THEN** the draft ends without a card, and Ayla gets 5 LP back

#### Scenario: A player cancels
- **WHEN** Ayla tries to cancel her own draft
- **THEN** the server denies it, and she sees no cancel control

### Requirement: Custom Card drafts do not hold the table
An open draft SHALL NOT stop anyone from drawing, opening a pack, moving a card or changing a balance. While a pack is open, starting a draft, picking and cancelling SHALL wait, with the Turkish message the other steps show.

#### Scenario: Drawing during a draft
- **WHEN** Bora draws a card while Ayla's draft is open
- **THEN** the draw is made

### Requirement: Custom Card draft records
Each draft SHALL be stored with these fields:
- the user, who started it, and when
- its cost
- the payment: an LP amount, or none
- the picks so far, each a type and a cost, and the current options
- its status: open, finished or cancelled
- when and by whom it ended
- the card it made
- the refund

An ended draft SHALL never change. No draft SHALL be deleted. Every signed-in user SHALL be able to read every draft.

#### Scenario: Recording a paid draft
- **WHEN** Ayla starts a 3-cost draft for 3 LP
- **THEN** a draft record names Ayla as the user and the starter, the time, the cost 3, a payment of 3 LP, its first options, and the status open

#### Scenario: Changing an ended draft
- **WHEN** any signed-in user, including the DM, tries to change or delete an ended draft
- **THEN** the server denies it

### Requirement: Custom Card draft steps agree
The server SHALL accept each draft step only together with the writes that go with it:
- a start, with its payment and the user's new LP
- the last pick, with the new card and its holding
- a cancel, with its refund and the user's new LP

It SHALL deny a step that does not agree with the others, and a pick before the card is complete that makes a card.

#### Scenario: A start without its payment
- **WHEN** Ayla writes a draft of her own that names a payment, without the ledger entry and her new LP
- **THEN** the server denies it

#### Scenario: A card before the last pick
- **WHEN** Ayla writes a Custom Card for her draft after its second pick of three
- **THEN** the server denies it

### Requirement: Custom Card steps need a connection
Starting, picking, cancelling, and the DM's effect edits SHALL require a network connection. Offline, the application SHALL show a Turkish message and change nothing.

#### Scenario: Picking offline
- **WHEN** Ayla tries to pick an option without a connection
- **THEN** she sees a Turkish message, and her draft does not change
