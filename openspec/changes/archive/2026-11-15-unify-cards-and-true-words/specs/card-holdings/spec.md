# Spec Delta

## ADDED Requirements

### Requirement: Cards with one copy leave the pool while held
A card whose "Birden fazla elde olabilir" is off SHALL have one copy: it SHALL be out of the pool while it has a holder, and back in the pool when its holder's holding closes. A card with the flag on SHALL never have a holder and never leave the pool: any number of players can hold it, the same player more than once. For a Cursed card, the pool is the Cursed Deck.

#### Scenario: Giving a pool card
- **WHEN** the DM gives a normal card that is in the pool to Ayla
- **THEN** the card is out of the pool, and Ayla is its holder

#### Scenario: Using a card with one copy
- **WHEN** Ayla uses that card
- **THEN** the card is back in the pool and has no holder

#### Scenario: A Cursed card twice
- **WHEN** the DM gives the Cursed card "Visions of Death", whose "Birden fazla elde olabilir" is on, to Ayla and then to Bora
- **THEN** both hold it, and it stays in the Cursed Deck

#### Scenario: A Cursed card with one copy
- **WHEN** "Where They Breed" has "Birden fazla elde olabilir" off, and Ayla holds it
- **THEN** no Cursed draw and no Cursed pack gives it until her copy leaves her hand

#### Scenario: A repeatable normal card
- **WHEN** "Aboleth's Eyes" has "Birden fazla elde olabilir" on, and Ayla holds it
- **THEN** it has no holder, and a draw can still give it to Bora

### Requirement: Use records of kept cards
Each use of a card whose "Kullanınca elde kalır" is on SHALL be recorded with the card, its name at the time, the player, the player's holding of it, who used it, when, the LP paid, and the ledger entry of the payment when it is more than 0. A use on a character SHALL also record the character's name at the time, and the character when it was chosen from the list. A use record SHALL never be changed or deleted. Every signed-in user SHALL be able to read every use record.

#### Scenario: Recording a use
- **WHEN** Ayla uses her kept card "Lucky Coin" for 2 LP on "Thorin"
- **THEN** a use record holds "Lucky Coin", Ayla, her holding of it, Ayla as the user, the time, 2 LP, the ledger entry and "Thorin"

#### Scenario: Changing a use
- **WHEN** any signed-in user, including the DM, tries to change or delete a use record
- **THEN** the server denies it

### Requirement: A kept card's use agrees with its payment
The server SHALL accept a use of a kept card only for an open holding of that card, together with its payment and the player's new LP when it pays more than 0, with the holding left open. It SHALL deny a use whose amount disagrees with its ledger entry, a player's use that pays anything other than the price, a use of a card the player does not hold, and a use record for a card whose "Kullanınca elde kalır" is off.

#### Scenario: A forged amount
- **WHEN** Ayla records a use of her kept 2-cost card paying 1 LP
- **THEN** the server denies it

#### Scenario: A card that leaves the hand
- **WHEN** a signed-in user records a use of a card whose "Kullanınca elde kalır" is off, without closing its holding
- **THEN** the server denies it

## MODIFIED Requirements

### Requirement: One holder at a time
The server SHALL keep the holder of a card with one copy consistent with its holdings: a holder is set only from the pool by opening that holding, moved only by a transfer, and cleared only by closing that holding. When two devices give the same pool card at the same moment, exactly one SHALL succeed.

#### Scenario: Two devices race
- **WHEN** the DM's phone and laptop give the same pool card to two players at the same moment
- **THEN** one player holds it, and the other attempt fails with a Turkish message that the card was just taken

#### Scenario: A forged holder
- **WHEN** a signed-in user sets a card's holder without opening a matching holding
- **THEN** the server denies the write

#### Scenario: A holder on a repeatable card
- **WHEN** a signed-in user sets a holder on a card whose "Birden fazla elde olabilir" is on
- **THEN** the server denies the write

### Requirement: The DM gives cards
The DM SHALL be able to give any active card, of the kind normal, Blessed or Cursed, whatever its behavior flags, to any user who has a profile, from a "+ Kart ver" dialog on the hand screen. True Words are taught on the True Words tab instead (spec: true-words). The dialog searches the cards as the library search does, filters them, and shows each card's status. Players SHALL NOT be able to give cards, not even to themselves. A player's only ways to open a holding for themselves SHALL be a draw, as the card-draws rules allow, and a choice from their own open pack, as the pack-shop rules allow.

#### Scenario: Searching and giving
- **WHEN** the DM opens "+ Kart ver" on Ayla's hand, searches for "aboleth", selects "Aboleth's Eyes" and gives it
- **THEN** the card is added to the end of Ayla's hand

#### Scenario: Giving a card only the DM gives
- **WHEN** the DM gives "The Last Wish", whose four "where" flags are off, to Ayla
- **THEN** the card is added to the end of Ayla's hand, and Bora sees it there

#### Scenario: A player tries to give a card
- **WHEN** a player creates a holding for themselves given by "dm"
- **THEN** the server denies it

#### Scenario: A player's holding without a draw
- **WHEN** a player creates a holding for themselves given by "draw" without the draw that it names
- **THEN** the server denies it

#### Scenario: A player's holding without a pack choice
- **WHEN** a player creates a holding for themselves given by "pack" without choosing it from their open pack in the same write
- **THEN** the server denies it

#### Scenario: Giving to someone without a profile
- **WHEN** the DM creates a holding for a user ID that has no profile
- **THEN** the server denies it

### Requirement: DM extra copy of a held card
When the DM gives a card with one copy that someone already holds, the dialog SHALL name the holder and ask for confirmation. Once confirmed, the player SHALL get an extra copy: a holding of its own, which leaves the card's holder unchanged. Closing an extra copy SHALL NOT return the card to the pool.

#### Scenario: Confirming an extra copy
- **WHEN** the DM gives "Aboleth's Eyes", which Bora holds, to Ayla and confirms the extra copy
- **THEN** Ayla holds a copy, and Bora is still the card's holder

#### Scenario: Cancelling
- **WHEN** the DM gives a card that Bora holds and does not confirm
- **THEN** nothing changes

### Requirement: Using a card
A player SHALL be able to use a card in their own hand, and the DM a card in any hand. Using asks, optionally, on which character the card was used: one of the table's characters, or a name typed for one that has none. The use SHALL pay its amount from the holder's LP in the same step. When the card's "Kullanınca elde kalır" is off, that step SHALL close the holding with the reason "used" and that character. When it is on, the holding SHALL stay open, the step SHALL record the use, and the card SHALL be usable again, paying each time. Players SHALL NOT be able to use other players' cards.

#### Scenario: A player uses their card
- **WHEN** Ayla, who has 5 LP, uses her 2-cost "Aboleth's Eyes" on her character "Thorin"
- **THEN** the card leaves her hand, its holding is closed as used on "Thorin", and she has 3 LP on every device

#### Scenario: A kept card
- **WHEN** Ayla, who has 5 LP, uses her 2-cost "Lucky Coin", whose "Kullanınca elde kalır" is on
- **THEN** the card stays in her hand, the use is recorded, and she has 3 LP on every device

#### Scenario: Using a kept card again
- **WHEN** Ayla, who now has 3 LP, uses "Lucky Coin" again
- **THEN** she pays 2 LP again, and the card is still in her hand

#### Scenario: Using another player's card
- **WHEN** Ayla tries to close a holding in Bora's hand
- **THEN** the server denies it

#### Scenario: A use without its payment
- **WHEN** a signed-in user closes Ayla's 2-cost card as used without lowering her LP in the same write
- **THEN** the server denies it

#### Scenario: Closing a kept card as used
- **WHEN** a signed-in user closes the holding of a card whose "Kullanınca elde kalır" is on with the reason "used"
- **THEN** the server denies it

### Requirement: Transferring a card
The DM SHALL be able to transfer a card from one player's hand to another's, after a confirmation. The old holding SHALL close as "transferred", and a new holding SHALL open for the receiver with the way "transfer", the same note, cost override, and active state, at the end of their hand. The holder of a card with one copy SHALL move with it. Players SHALL NOT be able to transfer. A True Word SHALL never be transferred.

#### Scenario: Moving a card
- **WHEN** the DM transfers "Aboleth's Eyes" from Ayla to Bora and confirms
- **THEN** it is at the end of Bora's hand with its note, Ayla's holding is closed as transferred, and Bora is the card's holder

#### Scenario: A player transfers
- **WHEN** a player tries to transfer a card
- **THEN** the server denies it

#### Scenario: A True Word
- **WHEN** the DM opens the details of Ayla's True Word "Abyss"
- **THEN** there is no "Başkasına ver", and the server denies a transfer of it

### Requirement: Active cards
A card whose "Elde etkili" is on SHALL enter a hand active, by every way it arrives except a transfer, which keeps the active state. The DM SHALL be able to switch such a held card active or inactive. A card without the flag SHALL have no switch, and SHALL NOT count or show as active. Players SHALL NOT be able to change whether a card is active. Active cards SHALL be marked in the hand.

#### Scenario: A held effect arrives
- **WHEN** the DM gives Ayla "Visions of Death", whose "Elde etkili" is on
- **THEN** it is marked active in her hand on every device

#### Scenario: Switching it off
- **WHEN** the DM makes "Visions of Death" in Ayla's hand inactive
- **THEN** it is no longer marked active

#### Scenario: Activating a card
- **WHEN** the DM makes "Visions of Death" in Ayla's hand active again
- **THEN** it is marked active in her hand on every device

#### Scenario: A card without a held effect
- **WHEN** Ayla draws "Aboleth's Eyes", whose "Elde etkili" is off
- **THEN** it enters her hand inactive, the details offer no switch, and the server denies switching it active

#### Scenario: The flag is turned off
- **WHEN** the DM turns off "Elde etkili" of "Visions of Death" while it is active in Ayla's hand
- **THEN** it no longer shows as active anywhere

#### Scenario: A player activates
- **WHEN** a player tries to switch their own card active
- **THEN** the server denies it

### Requirement: Actions in the card details
In the card details, "Kullan" SHALL be the main action, across the details' width. The DM's own controls SHALL be in a separate section headed "DM araçları":
- the cost in this hand, with the card's own cost as "temel: <cost>"
- "Aktif et" or "Aktifliği kaldır" when the card's "Elde etkili" is on, "Başkasına ver" and "At", as equal buttons

Each confirmation step SHALL open in place of the buttons. A control the user may not use SHALL NOT show.

#### Scenario: The holder
- **WHEN** Ayla opens the details of a card in her hand
- **THEN** she sees "Kullan" across the details, and no "DM araçları" section

#### Scenario: The DM
- **WHEN** the DM opens the details of a card in Ayla's hand whose "Elde etkili" is on
- **THEN** the DM sees "Kullan", and under "DM araçları" the cost field with "temel: 1", "Aktif et", "Başkasına ver" and "At"

#### Scenario: The DM and a card without a held effect
- **WHEN** the DM opens the details of a card in Ayla's hand whose "Elde etkili" is off
- **THEN** "DM araçları" shows the cost field, "Başkasına ver" and "At", and no "Aktif et"

#### Scenario: Another player
- **WHEN** Bora opens the details of a card in Ayla's hand
- **THEN** he sees neither "Kullan" nor the "DM araçları" section

#### Scenario: A confirmation step
- **WHEN** the DM selects "At" in the details
- **THEN** the question whether to discard the card opens in place of the buttons, with "Evet, at" and "Vazgeç"

### Requirement: Adding the effect of a card's use
When a character is chosen from the list and the card's "Kullanınca efekt bırakır" is on, the use step SHALL show "Aktif efekt olarak ekle", checked. With it checked, the use SHALL add the card's effect to that character in the same step (spec: character-effects, "Effects of a use"). Without a chosen character, with a typed name, with the box unchecked, or for a card whose "Kullanınca efekt bırakır" is off, the use SHALL add no effect.

#### Scenario: Checked by default
- **WHEN** Ayla chooses "Thorin" in the use step of "Lord Vulfric's Valour" and confirms
- **THEN** the card is used, and "Thorin" has its effect

#### Scenario: An instant card
- **WHEN** Ayla chooses "Thorin", unchecks "Aktif efekt olarak ekle", and confirms
- **THEN** the card is used on "Thorin", and no effect is added

#### Scenario: A typed name
- **WHEN** the DM chooses "Başka (yaz)…" and types "Goblin şefi"
- **THEN** the step shows no "Aktif efekt olarak ekle", and the use adds no effect

#### Scenario: A card that leaves no effect
- **WHEN** Ayla chooses "Thorin" in the use step of "Aboleth's Eyes", whose "Kullanınca efekt bırakır" is off
- **THEN** the step shows no "Aktif efekt olarak ekle", and the use adds no effect

## REMOVED Requirements

### Requirement: Normal cards leave the pool while held
**Reason**: Replaced by "Cards with one copy leave the pool while held": whether a card has one copy is now its "Birden fazla elde olabilir" flag, not its kind.
**Migration**: None for stored data. Normal cards start with the flag off, and Blessed and Cursed cards with it on, which keeps today's behavior.

### Requirement: DM-only cards reach hands only from the DM
**Reason**: The DM-only flag is removed. A card reaches a hand from a draw or a pack only through its "where" flags (specs: card-draws, pack-shop); with all of them off, only the DM's give or a transfer brings it.
**Migration**: None. "Sadece DM verebilir" turns the four "where" flags off.
