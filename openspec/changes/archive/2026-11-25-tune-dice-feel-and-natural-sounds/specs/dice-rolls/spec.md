# Spec Delta

## MODIFIED Requirements

### Requirement: The channel
Every signed-in user SHALL see every roll in the channel, live, oldest at the top and newest at the bottom. Each entry SHALL show:
- who rolled and when
- the note
- the formula
- each die with its result
- the total

The channel SHALL show the 50 newest rolls and load 50 older ones at a time with "Daha eski atışlar".

When a roll arrives while the channel is scrolled to its end, the channel SHALL scroll to show the new roll, however many rolls it holds. When the user has scrolled away from the end, the channel SHALL keep its position.

#### Scenario: A roll arrives
- **WHEN** Ayla rolls while Bora has the Zarlar screen open
- **THEN** Ayla's roll appears at the bottom of Bora's channel without a reload

#### Scenario: Older rolls
- **WHEN** the channel holds 50 rolls and Cem selects "Daha eski atışlar"
- **THEN** up to 50 older rolls appear above them

#### Scenario: Keeping to the newest roll
- **WHEN** Bora's channel holds 50 rolls, Bora is at its end, and Ayla rolls
- **THEN** Bora's channel scrolls to show Ayla's roll at the bottom

#### Scenario: Reading older rolls
- **WHEN** Bora has scrolled up the channel, and Ayla rolls
- **THEN** Bora's channel stays where he was reading

### Requirement: A roll arrives on another screen
When another user rolls while this user is on any screen other than Zarlar, a notification card SHALL show the roll. The card SHALL show, all at once:
- the roller and the note
- the formula, the kept results, the natural mark and the total
- "Kanalda aç"

The card SHALL NOT play the throw or the dice's impact sounds. A natural's sound follows "Natural sounds". A long formula SHALL wrap rather than be cut off. The card SHALL sit at the bottom right of a window at least 640 px wide, and at the top of a narrower window.

#### Scenario: Watching from a hand
- **WHEN** Bora rolls 1d20 + 3 while Ayla is on her hand screen, and the d20 shows 18
- **THEN** a card at the bottom right of Ayla's screen shows Bora, "1d20 + 3" and 21 at once, without dice

#### Scenario: A long formula
- **WHEN** Bora rolls 1d20 + 1d4 + 5 + 10 − 4 while Ayla is on her hand screen
- **THEN** the card shows the whole formula

#### Scenario: On a phone
- **WHEN** Bora rolls while Ayla uses a phone 360 CSS pixels wide
- **THEN** the card shows at the top of her screen

#### Scenario: Opening the channel
- **WHEN** Ayla selects "Kanalda aç" on the card
- **THEN** the Zarlar screen opens, and the card closes

### Requirement: Device settings
"Bu cihazda" SHALL hold four settings, kept on the device:
- "Atışları göster", on by default. When it is off, other users' rolls SHALL NOT open notification cards, and the menu count stays.
- "Zar sesi", off by default. When it is on, the dice SHALL make their sounds while they tumble.
- "Nat 20 / Nat 1 sesi", on by default. When it is off, the device SHALL NOT play the natural sounds (see "Natural sounds").
- "Zarları 3D göster", on by default. When it is off, the device SHALL show every roll's dice flat, as numbers. The user's own rolls SHALL still be thrown with physics, so other devices play them in 3D.

#### Scenario: Turning the cards off
- **WHEN** Ayla turns "Atışları göster" off and Bora rolls while she is on her hand screen
- **THEN** no card opens, and the "Zarlar" entry counts the roll

#### Scenario: Sound by default
- **WHEN** a device shows a roll for the first time
- **THEN** the dice make no impact sound

#### Scenario: Natural sounds by default
- **WHEN** a device that never changed its settings shows a fresh Nat 20
- **THEN** it plays the Nat 20 sound

#### Scenario: Turning the natural sounds off
- **WHEN** Ayla turns "Nat 20 / Nat 1 sesi" off and Bora rolls a Nat 1
- **THEN** Ayla's device plays no sound, and Bora's device plays the Nat 1 sound

#### Scenario: 3D by default
- **WHEN** a device shows a roll for the first time
- **THEN** the strip plays the roll's dice in 3D

#### Scenario: Turning the 3D dice off
- **WHEN** Ayla turns "Zarları 3D göster" off and Bora rolls 40d6 while she has the Zarlar screen open
- **THEN** Ayla's strip shows Bora's 40 results as numbers at once, without tumbling dice

#### Scenario: One's own roll with the 3D dice off
- **WHEN** Ayla, with "Zarları 3D göster" off, rolls 10d6 while Bora watches with it on
- **THEN** Ayla's strip shows her results as numbers, and Bora's strip plays her throw in 3D

#### Scenario: Kept after a reload
- **WHEN** Ayla turns "Zarları 3D göster" off and reloads the app
- **THEN** the setting is still off on her device

## ADDED Requirements

### Requirement: Natural sounds
When a fresh roll's natural mark shows on a device, the device SHALL play a short sound: one for Nat 20 and another for Nat 1. On the Zarlar screen it SHALL play when the roll's result shows (see "When a hidden result shows"). On any other screen it SHALL play when the roll arrives, whether or not a notification card opens. Each fresh roll SHALL play its sound at most once on a device. A roll without a natural mark SHALL play none.

#### Scenario: A Nat 20 on the Zarlar screen
- **WHEN** Bora rolls 1d20 and it lands on 20 while Ayla has the Zarlar screen open
- **THEN** Ayla's device plays the Nat 20 sound when the dice come to rest, not before

#### Scenario: A Nat 1 on another screen
- **WHEN** Bora rolls a Nat 1 while Ayla is on her hand screen
- **THEN** Ayla's device plays the Nat 1 sound when the roll arrives, with the card

#### Scenario: Cards turned off
- **WHEN** Ayla has turned "Atışları göster" off, and Bora rolls a Nat 20 while she is on her hand screen
- **THEN** no card opens, and Ayla's device plays the Nat 20 sound

#### Scenario: One's own natural
- **WHEN** Ayla rolls a Nat 20
- **THEN** her own device plays the Nat 20 sound when her dice come to rest

#### Scenario: Without the 3D dice
- **WHEN** Ayla has turned "Zarları 3D göster" off, and Bora rolls a Nat 1 while she has the Zarlar screen open
- **THEN** her device plays the Nat 1 sound at once

#### Scenario: No natural
- **WHEN** Bora rolls 2d20 with advantage and keeps a 17
- **THEN** no device plays a natural sound

#### Scenario: Reloading the page
- **WHEN** Ayla reloads the app right after Bora rolled a Nat 20
- **THEN** her device plays no sound, as the roll does not play (see "Only fresh rolls play")

### Requirement: Natural sounds and hidden rolls
A player's device SHALL NOT play a natural sound for the DM's hidden roll. The DM's devices SHALL play it as for any roll.

#### Scenario: A hidden Nat 20
- **WHEN** the DM rolls a hidden Nat 20 while Ayla has the Zarlar screen open
- **THEN** Ayla's device plays no sound, and the DM's device plays the Nat 20 sound

### Requirement: Natural sounds when watching again
"Tekrar izle" on a roll with a natural mark SHALL play its natural sound again when the replayed dice rest, or at once without the 3D dice. It SHALL play only on the device that watches it again, and only when that device's "Nat 20 / Nat 1 sesi" is on.

#### Scenario: Watching a Nat 20 again
- **WHEN** Bora selects "Tekrar izle" on Cem's Nat 20
- **THEN** Bora's device plays the Nat 20 sound when the dice rest, and no other device plays it

### Requirement: Sound after the first interaction
A device SHALL be able to play the impact sounds and the natural sounds once the user has clicked, tapped or pressed a key anywhere in the app since it loaded. Turning a sound setting off and on again SHALL NOT be needed after a reload. Before the first interaction, a sound the browser does not allow SHALL be skipped silently, and the rest of the app SHALL work as usual.

#### Scenario: After a reload
- **WHEN** Ayla, with "Zar sesi" on, reloads the Zarlar screen, clicks anywhere in the app, and Bora rolls
- **THEN** Ayla's dice make their sounds

#### Scenario: Before any interaction
- **WHEN** Ayla's tab was opened and never clicked, and Bora rolls a Nat 20
- **THEN** the roll still shows in the channel and the card, and no error shows

### Requirement: A lively throw
A new roll SHALL spin each die about each axis in a random direction, fast enough that the dice visibly tumble before they first land. Throws SHALL still come to rest within the five-second limit in nearly every case. A roll made before this change SHALL keep its recorded throw and play as it did.

#### Scenario: Dice that tumble
- **WHEN** Ayla rolls 4d6
- **THEN** the dice turn over in the air before they land, and they do not all spin the same way

#### Scenario: An older roll
- **WHEN** Bora selects "Tekrar izle" on a roll made before this change
- **THEN** the dice follow the same path as before and land on the same faces
