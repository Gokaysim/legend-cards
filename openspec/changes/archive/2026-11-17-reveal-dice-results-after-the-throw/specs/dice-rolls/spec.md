# Spec Delta

## ADDED Requirements

### Requirement: Results hidden until the dice rest
While the strip plays a roll that just arrived, the roll's channel entry SHALL hide its result until the strip's dice come to rest. That covers the dice faces, the fixed number, the total, the natural mark and the mark's border color. The roller, the time, the note and the formula SHALL stay visible. The user's own rolls SHALL be hidden the same way. A hidden result SHALL NOT be read out to assistive technology.

#### Scenario: Watching a roll land
- **WHEN** Bora rolls 1d20 + 5 while Ayla has the Zarlar screen open
- **THEN** Ayla's channel shows Bora's entry with "1d20 + 5" and its result blurred, and shows the result once the strip's dice rest

#### Scenario: One's own roll
- **WHEN** Ayla selects "At"
- **THEN** her own entry hides its result until her dice rest in the strip

#### Scenario: A natural 20 under the blur
- **WHEN** Bora's hidden roll keeps a natural 20
- **THEN** the entry shows neither "Nat 20" nor its gold border until the dice rest

#### Scenario: What a screen reader hears
- **WHEN** a screen reader reads an entry whose result is hidden
- **THEN** it reads "sonuç bekleniyor" instead of the dice and the total

### Requirement: When a hidden result shows
A hidden result SHALL show as soon as the strip's dice rest, when a newer roll replaces it in the strip, or 10 seconds after it arrived, whichever comes first. Nothing SHALL be hidden for a roll played again with "Tekrar izle", for a roll that does not play, or on a device with reduced motion or without the 3D dice.

#### Scenario: A newer roll
- **WHEN** Cem rolls while Bora's dice still tumble in the strip
- **THEN** Bora's entry shows its result at once, and Cem's entry hides its own

#### Scenario: Watching again
- **WHEN** Ayla selects "Tekrar izle" on an earlier roll
- **THEN** that roll's entry keeps showing its result while the strip plays it

#### Scenario: Reduced motion
- **WHEN** a device that asks for reduced motion shows Bora's new roll
- **THEN** the entry shows its result at once

#### Scenario: A stalled throw
- **WHEN** the strip has not reported its dice at rest 10 seconds after a roll arrived
- **THEN** the entry shows its result

## MODIFIED Requirements

### Requirement: The Zarlar screen
The "Zarlar" screen SHALL put the wide strip, where the newest roll tumbles in 3D, on the right, with the roll form below it. On the left, one column SHALL hold two tabs, "Kanal" (the channel) and "İnisiyatif" (spec: initiative-tracker), with "Kanal" open by default. The open tab SHALL be kept in the URL. A "Zar stili" button on the strip SHALL open the dice settings.

At 360 CSS pixels wide, the strip, the form and the tabs SHALL be stacked in that order, and the page SHALL NOT scroll sideways. On a window at least 1024 px wide, a long channel SHALL scroll inside its own box, and the page SHALL NOT grow taller than its visible content.

#### Scenario: Opening the screen
- **WHEN** a signed-in user selects "Zarlar" in the navigation
- **THEN** the screen shows the strip with "Zar stili", the roll form below it, and the "Kanal" tab open beside them with the newest roll at the bottom

#### Scenario: Reloading on the İnisiyatif tab
- **WHEN** a signed-in user reloads the browser on the address of the Zarlar screen's İnisiyatif tab
- **THEN** the Zarlar screen is shown again, on its İnisiyatif tab

#### Scenario: Phone width
- **WHEN** the Zarlar screen is shown 360 CSS pixels wide
- **THEN** the strip, the form and the tabs are stacked in that order, and the page has no horizontal scrollbar

#### Scenario: A long channel on a wide window
- **WHEN** the channel holds 50 rolls on a window 1728 by 877 CSS pixels
- **THEN** the page does not scroll, and the channel scrolls inside its box

### Requirement: A fixed number written as a sum
The fixed number SHALL be either one whole number or whole numbers joined by + and −, each from 0 to 99, and their sum SHALL be from −99 to +99. The roll SHALL keep the numbers as written. The form's formula, the channel and the notification card SHALL show them in order, and the total SHALL use their sum. When a record's written numbers do not add up to its fixed number, devices SHALL show the fixed number alone.

#### Scenario: Writing a sum
- **WHEN** Ayla selects d20 and types "5+10-4" as the fixed number
- **THEN** the formula reads "1d20 + 5 + 10 − 4"

#### Scenario: The total of a sum
- **WHEN** Ayla rolls 1d20 + 5 + 10 − 4, and the d20 shows 12
- **THEN** the roll's total is 23

#### Scenario: Others see the sum
- **WHEN** Ayla rolls 1d20 + 5 + 10 − 4 while Bora has the Zarlar screen open
- **THEN** Bora's channel shows the roll's formula as "1d20 + 5 + 10 − 4"

#### Scenario: Spaces and a leading sign
- **WHEN** Cem types " -2 - 3 " as the fixed number
- **THEN** the formula ends with "− 2 − 3", and the roll adds −5

#### Scenario: Numbers that do not add up
- **WHEN** a record's fixed number is 11 and its written numbers are 5, 10 and −3
- **THEN** devices show the fixed number as "+ 11", and the total uses 11

### Requirement: A roll arrives on another screen
When another user rolls while this user is on any screen other than Zarlar, a notification card SHALL show the roll. The card SHALL show, all at once:
- the roller and the note
- the formula, the kept results, the natural mark and the total
- "Kanalda aç"

The card SHALL NOT play the throw or the dice's sounds. A long formula SHALL wrap rather than be cut off. The card SHALL sit at the bottom right of a window at least 640 px wide, and at the top of a narrower window.

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

### Requirement: The notification card closes on its own
The notification card SHALL close 6 seconds after it appears. It SHALL stay open while the pointer or the keyboard focus is on it, and after the user selects it, until the user closes it with "Kapat". A newer roll SHALL replace it.

#### Scenario: Closing by itself
- **WHEN** a roll's card has been shown for 6 seconds, and nobody has touched it
- **THEN** the card closes

#### Scenario: Keeping it open
- **WHEN** Ayla selects the card
- **THEN** it stays open until she selects "Kapat" or a newer roll replaces it

### Requirement: Only fresh rolls play
A device SHALL play a roll in the strip, or show it in a notification card, only when the roll arrives after the device started showing the channel, and was made at most 10 seconds earlier. When several rolls arrive at once, only the newest SHALL play or be shown in a card. Every roll SHALL still appear in the channel.

#### Scenario: Reloading the page
- **WHEN** Ayla reloads the app after three rolls were made
- **THEN** no roll plays, no card opens, and the three rolls are in the channel

#### Scenario: Back online
- **WHEN** Bora's connection returns after a minute, and four rolls arrive together
- **THEN** none of them plays, and all four are in the channel

### Requirement: Dice without motion
With reduced motion, the dice SHALL appear at rest on their recorded faces without tumbling. Without WebGL, or when the 3D part cannot load, the strip SHALL show the results as numbers. The channel, the form, the notification card and the totals SHALL work in every case.

#### Scenario: Reduced motion
- **WHEN** a device that asks for reduced motion shows Bora's roll
- **THEN** the dice appear at rest on their faces at once

#### Scenario: No 3D
- **WHEN** the 3D part fails to load on Cem's device
- **THEN** his strip shows the roll's results as numbers, and he can still roll
