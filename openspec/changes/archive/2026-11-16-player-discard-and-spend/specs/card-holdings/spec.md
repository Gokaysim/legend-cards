## MODIFIED Requirements

### Requirement: Discarding a card
The holder SHALL be able to discard a card in their own hand, and the DM a card in any hand, without it being used, after a confirmation. The holding SHALL close with the reason "discarded", by the user who discarded it. Cursed and Blessed cards SHALL be discarded like other cards. A discard SHALL pay nothing. Players SHALL NOT be able to discard other players' cards. A holder SHALL NOT discard a True Word: only the DM takes a word back.

#### Scenario: The DM discards
- **WHEN** the DM discards a normal card from Ayla's hand and confirms
- **THEN** the card leaves her hand, its holding is closed as discarded, and the card is back in the pool

#### Scenario: A player discards
- **WHEN** Ayla, who has 5 LP, discards "Aboleth's Eyes" from her own hand and confirms
- **THEN** the card leaves her hand on every device, its holding is closed as discarded by Ayla, the card is back in the pool, and she still has 5 LP

#### Scenario: A player discards a Cursed card
- **WHEN** Ayla discards a Cursed card from her own hand and confirms
- **THEN** the card leaves her hand, and its holding is closed as discarded

#### Scenario: A player discards another player's card
- **WHEN** Ayla closes a holding in Bora's hand with the reason "discarded"
- **THEN** the server denies it

#### Scenario: A player discards their True Word
- **WHEN** Ayla closes the holding of her True Word "Abyss" with the reason "discarded"
- **THEN** the server denies it, and she still knows "Abyss"

### Requirement: Actions in the card details
In the card details, "Kullan" SHALL be the main action, in one row across the details' width, with "At" beside it as a smaller button marked as dangerous. The holder and the DM SHALL see both. The DM's own controls SHALL be in a separate section headed "DM araçları":
- the cost in this hand, with the card's own cost as "temel: <cost>"
- "Aktif et" or "Aktifliği kaldır" when the card's "Elde etkili" is on, and "Başkasına ver", as equal buttons

Each confirmation step SHALL open in place of the buttons. A control the user may not use SHALL NOT show.

#### Scenario: The holder
- **WHEN** Ayla opens the details of a card in her hand
- **THEN** she sees "Kullan" with "At" beside it, and no "DM araçları" section

#### Scenario: The DM
- **WHEN** the DM opens the details of a card in Ayla's hand whose "Elde etkili" is on
- **THEN** the DM sees "Kullan" with "At" beside it, and under "DM araçları" the cost field with "temel: 1", "Aktif et" and "Başkasına ver"

#### Scenario: The DM and a card without a held effect
- **WHEN** the DM opens the details of a card in Ayla's hand whose "Elde etkili" is off
- **THEN** "DM araçları" shows the cost field and "Başkasına ver", and no "Aktif et"

#### Scenario: Another player
- **WHEN** Bora opens the details of a card in Ayla's hand
- **THEN** he sees neither "Kullan", nor "At", nor the "DM araçları" section

#### Scenario: A confirmation step
- **WHEN** Ayla selects "At" in the details of a card in her hand
- **THEN** the question whether to discard the card opens in place of "Kullan" and "At", with "Evet, at" and "Vazgeç"

#### Scenario: A narrow phone
- **WHEN** Ayla opens the details of a card in her hand on a phone 360 CSS pixels wide
- **THEN** "Kullan" and "At" stand in one row, and the page does not scroll horizontally
