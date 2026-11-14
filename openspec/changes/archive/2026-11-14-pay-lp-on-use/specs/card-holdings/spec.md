# Spec Delta

## MODIFIED Requirements

### Requirement: Holding records
Every time a player receives a card, the application SHALL record a holding: the card, the player, when it was given, by whom, and how ("dm", "transfer", "draw" or "pack"). A holding received through a draw SHALL name its draw, and one received from a pack SHALL name its pack opening. A holding starts open. When the card leaves the hand, the holding SHALL be closed with when, by whom, and why ("used", "discarded" or "transferred"). A holding closed as used SHALL also record the LP paid for the use, and the ledger entry of that payment when it is more than 0. Holdings SHALL never be deleted.

#### Scenario: The DM gives a card
- **WHEN** the DM gives "Aboleth's Eyes" to Ayla
- **THEN** an open holding records "Aboleth's Eyes", Ayla, the time, the DM as the giver, and "dm" as the way it was given

#### Scenario: A drawn card
- **WHEN** Ayla draws "Aboleth's Eyes"
- **THEN** an open holding records "Aboleth's Eyes", Ayla, the time, Ayla as the giver, "draw" as the way it was given, and the draw

#### Scenario: A card chosen from a pack
- **WHEN** the DM chooses "Aboleth's Eyes" from Ayla's open pack
- **THEN** an open holding records "Aboleth's Eyes", Ayla, the time, the DM as the giver, "pack" as the way it was given, and the pack opening

#### Scenario: History survives
- **WHEN** Ayla uses that card
- **THEN** the holding is still stored, closed with the time, Ayla as the one who closed it, and "used" as the reason

#### Scenario: A paid use is recorded
- **WHEN** Ayla uses her 2-cost "Aboleth's Eyes"
- **THEN** its closed holding records 2 LP as paid, and the ledger entry of that payment

#### Scenario: A free use is recorded
- **WHEN** Ayla uses a card that costs "0"
- **THEN** its closed holding records 0 LP as paid, and no ledger entry

#### Scenario: Deleting a holding
- **WHEN** any signed-in user, including the DM, tries to delete a holding
- **THEN** the server denies it

### Requirement: Using a card
A player SHALL be able to use a card in their own hand, and the DM a card in any hand. Using asks, optionally, on which character the card was used, as free text. The use SHALL pay its amount from the holder's LP, in the same step that closes the holding with the reason "used" and that text. Players SHALL NOT be able to use other players' cards.

#### Scenario: A player uses their card
- **WHEN** Ayla, who has 5 LP, uses her 2-cost "Aboleth's Eyes" on "Thorin"
- **THEN** the card leaves her hand, its holding is closed as used on "Thorin", and she has 3 LP on every device

#### Scenario: Using another player's card
- **WHEN** Ayla tries to close a holding in Bora's hand
- **THEN** the server denies it

#### Scenario: A use without its payment
- **WHEN** a signed-in user closes Ayla's 2-cost card as used without lowering her LP in the same write
- **THEN** the server denies it

## ADDED Requirements

### Requirement: The price of a use
A use's price SHALL follow the card's cost in this hand: the DM's cost override when set, otherwise the card's own cost. A whole number SHALL cost exactly that many LP. No cost SHALL cost nothing. "d6" SHALL cost the die rolled at the table, which the user enters as a whole number from 1 to 6. Any other cost, such as "X", SHALL cost the whole number of LP the user enters, from 0 up. Cursed cards SHALL pay as other cards do.

#### Scenario: A whole number
- **WHEN** Ayla uses a card that costs "2"
- **THEN** the price is 2 LP

#### Scenario: A cost override
- **WHEN** the DM has set the cost of Ayla's 3-cost card to "1", and Ayla uses it
- **THEN** the price is 1 LP

#### Scenario: A Blessed card
- **WHEN** Ayla uses a Blessed card, which has no cost
- **THEN** the card is used without a payment, and her LP does not change

#### Scenario: A d6 card
- **WHEN** Ayla uses "Hran's Diligent Defence", which costs "d6", and enters 4
- **THEN** she pays 4 LP

#### Scenario: A die out of range
- **WHEN** Ayla enters 0 or 7 for a "d6" card
- **THEN** she cannot confirm the use

#### Scenario: An X card
- **WHEN** Ayla uses "Leon's Lanza", which costs "X", and enters 3
- **THEN** she pays 3 LP

#### Scenario: X as 0
- **WHEN** Ayla enters 0 for an "X" card
- **THEN** the card is used without a payment

#### Scenario: A Cursed card
- **WHEN** Ayla uses the Cursed card "Visions of Death", which costs "1"
- **THEN** she pays 1 LP

#### Scenario: Other text as the cost
- **WHEN** the DM has set the cost of Ayla's card to "X+1", and Ayla uses it
- **THEN** she enters the amount she pays, as for "X"

### Requirement: A player pays the price
When a player uses a card in their own hand, they SHALL pay its price from their own LP. A player whose LP is below the price SHALL NOT use the card. The confirm control is then disabled, with a Turkish note naming the price and their LP. The server SHALL deny a player's use that pays anything other than the price.

#### Scenario: Not enough LP
- **WHEN** Ayla, who has 1 LP, opens the use step of a 3-cost card
- **THEN** the confirm control is disabled, and a Turkish note says that the card costs 3 LP and Ayla has 1 LP

#### Scenario: A forged amount
- **WHEN** Ayla closes her 3-cost card as used, paying 1 LP
- **THEN** the server denies it

#### Scenario: LP changed on another device
- **WHEN** Ayla, who has 3 LP, confirms the use of a 2-cost card while the DM lowers her LP to 1 on another device
- **THEN** the card stays in her hand, she has 1 LP, and a Turkish message says that she has 1 LP

#### Scenario: The price changed meanwhile
- **WHEN** Ayla's use step shows 2 LP, and the DM changes that card's cost to "3" before she confirms
- **THEN** the step shows 3 LP, and a confirmation that would pay the old price is not made

### Requirement: The DM chooses the amount of a use
When the DM uses a card in a player's hand, the amount SHALL start at the price, or be empty when the user enters the price. The DM SHALL be able to set any whole number from 0 to that player's LP. The amount SHALL be taken from that player's LP, and with 0 the card SHALL be used for free. A card in the DM's own hand SHALL be used without a payment.

#### Scenario: The DM charges the price
- **WHEN** the DM uses Ayla's 2-cost card and keeps the amount 2
- **THEN** Ayla's LP drops by 2, and the ledger records the DM as the one who made the change

#### Scenario: A free use by the DM
- **WHEN** the DM uses Ayla's 3-cost card with the amount 0
- **THEN** the card leaves her hand, and her LP does not change

#### Scenario: More than the player has
- **WHEN** the DM enters 6 for Ayla's card while Ayla has 5 LP
- **THEN** the DM cannot confirm the use

#### Scenario: An X card for the DM
- **WHEN** the DM opens the use step of Ayla's "X" card
- **THEN** the amount is empty, and the DM must enter one to confirm

#### Scenario: The DM's own hand
- **WHEN** the DM uses a card in the DM's own hand
- **THEN** no amount is asked, and no balance changes

### Requirement: The use step shows the payment
The use step SHALL show the price and the holder's LP before and after the use. A price the user enters SHALL have its own field: "Zar sonucu (1–6)" for "d6", or "Kaç LP ödenecek?" for any other cost. The DM's field SHALL be labelled "Tutar (<name>'nın LP'sinden)" with the Turkish suffix that fits the name, and noted "0 = ücretsiz". The confirm control SHALL name the amount when it is more than 0, as "Kullanımı onayla (2 LP)".

#### Scenario: A fixed price
- **WHEN** Ayla, who has 5 LP, opens the use step of a 2-cost card
- **THEN** the step shows "2 LP", "5 LP → 3 LP", and "Kullanımı onayla (2 LP)"

#### Scenario: A die to enter
- **WHEN** Ayla opens the use step of a "d6" card
- **THEN** the step shows the field "Zar sonucu (1–6)", and confirming waits for a value

#### Scenario: The DM's field
- **WHEN** the DM opens the use step of Ayla's 2-cost card
- **THEN** the step shows "Tutar (Ayla'nın LP'sinden)" with 2, and "0 = ücretsiz"

#### Scenario: Nothing to pay
- **WHEN** Ayla opens the use step of a Blessed card
- **THEN** the step shows no amount, and the confirm control reads "Kullanımı onayla"
