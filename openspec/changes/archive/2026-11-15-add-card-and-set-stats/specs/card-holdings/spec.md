# Spec Delta

## ADDED Requirements

### Requirement: History link in the card details
The card details of a hand SHALL show the link "Kart geçmişi →" under the card's labels, for every user who sees the details, in the panel beside the hand and in the dialog on narrow windows. It SHALL open the card's Kart geçmişi (spec: card-stats), and SHALL stay apart from "Kullan" and the "DM araçları" section.

#### Scenario: Opening the history from a hand
- **WHEN** Bora selects "Aboleth's Eyes" in Ayla's hand and follows "Kart geçmişi →"
- **THEN** the Kart geçmişi of "Aboleth's Eyes" opens

#### Scenario: A Cursed card in a hand
- **WHEN** Ayla follows "Kart geçmişi →" in the details of her Cursed card "Abandon All Hope"
- **THEN** its Kart geçmişi opens under the Cursed Deck's address

#### Scenario: A held DM-only card
- **WHEN** Ayla follows "Kart geçmişi →" in the details of the DM-only card "The Last Wish" in Bora's hand
- **THEN** its Kart geçmişi opens
