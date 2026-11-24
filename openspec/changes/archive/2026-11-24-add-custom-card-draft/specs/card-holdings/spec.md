# Spec Delta

## MODIFIED Requirements

### Requirement: Holding records
Every time a player receives a card, the application SHALL record a holding: the card, the player, when it was given, by whom, and how ("dm", "transfer", "draw", "pack" or "draft"). A holding received through a draw SHALL name its draw, one received from a pack SHALL name its pack opening, and one received from a draft, a learned True Word or a finished Custom Card, SHALL name its draft. A holding starts open. When the card leaves the hand, the holding SHALL be closed with when, by whom, and why ("used", "discarded" or "transferred"). A holding closed as used SHALL also record the LP paid for the use, and the ledger entry of that payment when it is more than 0. Holdings SHALL never be deleted.

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

#### Scenario: A finished Custom Card
- **WHEN** Ayla makes the last pick of her Custom Card draft
- **THEN** an open holding records her Custom Card, Ayla, the time, Ayla as the giver, "draft" as the way it was given, and the draft

### Requirement: Browsing the cards to give
"+ Kart ver" SHALL list every active card and every active True Word before any search or filter, together, sorted by name in Turkish alphabetical order. It SHALL never list a Custom Card. It SHALL show 20 at first, and "Daha fazla göster" SHALL add 20 more each time. It SHALL show how many cards and words match, as one number.

#### Scenario: Opening the dialog
- **WHEN** the DM opens "+ Kart ver" with 744 active cards and 26 active True Words
- **THEN** the dialog shows 20 of them and says that 770 match

#### Scenario: Showing more
- **WHEN** the DM selects "Daha fazla göster" once
- **THEN** the dialog shows 40 of them

#### Scenario: Searching a word
- **WHEN** the DM searches for "ascend"
- **THEN** the dialog lists the active True Words and cards whose name or text matches, the words "Ascend 1", "Ascend 2" and "Ascend 3" among them

#### Scenario: Custom Cards are not given
- **WHEN** Ayla holds a Custom Card, and the DM opens "+ Kart ver" or searches for "Custom"
- **THEN** no Custom Card is listed or counted
