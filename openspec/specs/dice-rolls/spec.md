# dice-rolls Specification

## Purpose

Lets the table roll dice in the app and watch every roll together: a shared channel of rolls, and 3D dice that tumble the same way on every device.

## Requirements

### Requirement: The Zarlar screen
The "Zarlar" screen SHALL put the wide strip, where the newest roll tumbles in 3D, on the right, with the roll form below it. On the left, one column SHALL hold two tabs, "Kanal" (the channel) and "İnisiyatif" (spec: initiative-tracker), with "Kanal" open by default. The open tab SHALL be kept in the URL. A "Zar stili" button on the strip SHALL open the dice settings.

At 360 CSS pixels wide, the strip, the form and the tabs SHALL be stacked in that order, and the page SHALL NOT scroll sideways.

#### Scenario: Opening the screen
- **WHEN** a signed-in user selects "Zarlar" in the navigation
- **THEN** the screen shows the strip with "Zar stili", the roll form below it, and the "Kanal" tab open beside them with the newest roll at the bottom

#### Scenario: Reloading on the İnisiyatif tab
- **WHEN** a signed-in user reloads the browser on the address of the Zarlar screen's İnisiyatif tab
- **THEN** the Zarlar screen is shown again, on its İnisiyatif tab

#### Scenario: Phone width
- **WHEN** the Zarlar screen is shown 360 CSS pixels wide
- **THEN** the strip, the form and the tabs are stacked in that order, and the page has no horizontal scrollbar

### Requirement: Building a roll
The roll form SHALL build a roll from these dice: d4, d6, d8, d10, d12, d20 and d100. Selecting a die SHALL add one to the formula. The formula SHALL show each die type once with its count, in the order d20, d12, d10, d8, d6, d4, d100. The form SHALL let the user:
- take dice away
- set a fixed number from −99 to +99, typed as one whole number or as a sum (see "A fixed number written as a sum")
- write a note of up to 80 characters

"At" SHALL be disabled while the formula has no die.

#### Scenario: Mixing dice
- **WHEN** Ayla selects d20, d6 and d6, and sets the fixed number to 3
- **THEN** the formula reads "1d20 + 2d6 + 3"

#### Scenario: No dice
- **WHEN** the formula has no die
- **THEN** "At" is disabled

#### Scenario: A long note
- **WHEN** Ayla types a note of 100 characters
- **THEN** the note keeps its first 80 characters

### Requirement: A fixed number written as a sum
The fixed number SHALL be either one whole number or whole numbers joined by + and −, each from 0 to 99, and their sum SHALL be from −99 to +99. The roll SHALL keep the numbers as written. The form's formula, the channel, the strip and the notification card SHALL show them in order, and the total SHALL use their sum. When a record's written numbers do not add up to its fixed number, devices SHALL show the fixed number alone.

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

### Requirement: An invalid fixed number
When the fixed number is not a whole number or a sum of whole numbers from 0 to 99, or when its sum is outside −99 to +99, the form SHALL keep the text as typed and mark the field as invalid. It SHALL show a hint with an example, "örneğin 4+4-5", and SHALL disable "At" until the text is valid.

#### Scenario: A sum left open
- **WHEN** Ayla types "4+" as the fixed number
- **THEN** the field is marked invalid, the hint shows, and "At" is disabled

#### Scenario: Fixing it
- **WHEN** Ayla then types "1", so the field reads "4+1"
- **THEN** the hint is gone, and "At" is enabled

#### Scenario: Not a sum
- **WHEN** Bora types "4*2" or "1d4" as the fixed number
- **THEN** the field is marked invalid, and "At" is disabled

#### Scenario: A sum out of range
- **WHEN** Cem types "90+20" as the fixed number
- **THEN** the field is marked invalid, and "At" is disabled

### Requirement: At most twelve dice
A roll SHALL hold at most 12 physical dice. A d100 SHALL count as two: a tens die and a d10. When a roll is full, the form SHALL disable the dice that no longer fit and say "En fazla 12 zar".

#### Scenario: Twelve d6
- **WHEN** Cem has added 12 d6
- **THEN** every die control is disabled, and the form says "En fazla 12 zar"

#### Scenario: A d100 with eleven dice
- **WHEN** the formula holds 11 physical dice
- **THEN** the d100 control is disabled, and d4 to d20 are still enabled

### Requirement: Advantage and disadvantage
When the formula holds exactly one d20 and no other die, the form SHALL offer "Avantaj" and "Dezavantaj". Such a roll SHALL throw two d20 and keep the higher one (Avantaj) or the lower one (Dezavantaj). The die it does not keep SHALL be shown dimmed and struck through. With any other formula, the two choices SHALL be disabled, and the roll is normal.

#### Scenario: Advantage
- **WHEN** Bora rolls 1d20 + 5 with "Avantaj", and the dice show 20 and 8
- **THEN** the roll keeps 20, shows 8 dimmed and struck through, and totals 25

#### Scenario: Not a single d20
- **WHEN** the formula is 1d20 + 1d6
- **THEN** "Avantaj" and "Dezavantaj" are disabled

### Requirement: Results and the total
Each die SHALL show the face it lands on. The total SHALL be the sum of the kept dice plus the fixed number. A d100 SHALL read its tens die (00 to 90) plus its d10 (0 to 9), with 00 and 0 reading 100. The total SHALL be computed from the roll's record each time it is shown, never stored apart from it.

#### Scenario: A mixed roll
- **WHEN** Ayla rolls 1d20 + 2d6 + 3, and the dice show 17, 4 and 2
- **THEN** the roll's total is 26

#### Scenario: A d100
- **WHEN** the tens die shows 30 and the d10 shows 7
- **THEN** the d100 reads 37

#### Scenario: The highest d100
- **WHEN** the tens die shows 00 and the d10 shows 0
- **THEN** the d100 reads 100

### Requirement: Natural 20 and natural 1
When a roll's only kept die is a d20, a kept 20 SHALL be marked "Nat 20" in gold, and a kept 1 SHALL be marked "Nat 1" in red, in the channel, the strip and the notification card.

#### Scenario: A natural 20 with advantage
- **WHEN** Bora's advantage roll keeps a 20
- **THEN** the roll is marked "Nat 20"

#### Scenario: A natural 1
- **WHEN** Ayla rolls 1d20 + 4, and the d20 shows 1
- **THEN** the roll is marked "Nat 1" in red

#### Scenario: A 20 among other dice
- **WHEN** a 1d20 + 1d6 roll shows 20 on the d20
- **THEN** no "Nat 20" mark is shown

### Requirement: The channel
Every signed-in user SHALL see every roll in the channel, live, oldest at the top and newest at the bottom. Each entry SHALL show:
- who rolled and when
- the note
- the formula
- each die with its result
- the total

The channel SHALL show the 50 newest rolls and load 50 older ones at a time with "Daha eski atışlar".

#### Scenario: A roll arrives
- **WHEN** Ayla rolls while Bora has the Zarlar screen open
- **THEN** Ayla's roll appears at the bottom of Bora's channel without a reload

#### Scenario: Older rolls
- **WHEN** the channel holds 50 rolls and Cem selects "Daha eski atışlar"
- **THEN** up to 50 older rolls appear above them

### Requirement: The same throw on every device
A roll SHALL be thrown once, on the roller's device. Every device that shows the roll SHALL play that same throw. The dice SHALL come to rest showing the roll's recorded results. When a device's playback would end on other faces, the dice SHALL settle onto the recorded rest. The channel and the totals SHALL always use the recorded results.

#### Scenario: Watching a roll
- **WHEN** Ayla rolls 2d6 and Bora watches on his screen
- **THEN** Bora's dice follow the same path as Ayla's and land on the same faces

#### Scenario: A playback that drifts
- **WHEN** a device's playback ends with a die on another face than the record
- **THEN** that die settles onto its recorded rest, and the channel shows the recorded result

### Requirement: Playing a roll again
Each roll in the channel SHALL offer "Tekrar izle", which SHALL play the same throw again in the strip. Playing a roll again SHALL write nothing.

#### Scenario: Watching a fireball again
- **WHEN** Bora selects "Tekrar izle" on Cem's 8d6 roll
- **THEN** the strip plays Cem's throw again and ends on the same faces

### Requirement: The strip
The strip on the Zarlar screen SHALL play each new roll as it arrives, the user's own rolls included. A newer roll SHALL replace the one playing. Between rolls, the strip SHALL keep the last roll's dice at rest.

#### Scenario: Rolling from the screen
- **WHEN** Ayla selects "At"
- **THEN** her dice tumble in the strip at once, before the roll reaches the other devices

#### Scenario: Two quick rolls
- **WHEN** Bora rolls while Ayla's dice are still tumbling in the strip
- **THEN** the strip plays Bora's roll instead

### Requirement: A roll arrives on another screen
When another user rolls while this user is on any screen other than Zarlar, a notification card SHALL show the roll. The card SHALL show:
- the roller and the note
- a small tray where the throw plays
- the formula, the dice's results and the total
- "Kanalda aç"

It SHALL sit at the bottom right of a window at least 640 px wide, and at the top of a narrower window.

#### Scenario: Watching from a hand
- **WHEN** Bora rolls 1d20 + 3 while Ayla is on her hand screen
- **THEN** a card at the bottom right of Ayla's screen plays Bora's throw and shows 21

#### Scenario: On a phone
- **WHEN** Bora rolls while Ayla uses a phone 360 CSS pixels wide
- **THEN** the card shows at the top of her screen

#### Scenario: Opening the channel
- **WHEN** Ayla selects "Kanalda aç" on the card
- **THEN** the Zarlar screen opens, and the card closes

### Requirement: The notification card closes on its own
The notification card SHALL close 4 seconds after its throw comes to rest. It SHALL stay open while the pointer or the keyboard focus is on it, and after the user selects it, until the user closes it with "Kapat". A newer roll SHALL replace it.

#### Scenario: Closing by itself
- **WHEN** a roll's card has shown its resting dice for 4 seconds, and nobody has touched it
- **THEN** the card closes

#### Scenario: Keeping it open
- **WHEN** Ayla selects the card
- **THEN** it stays open until she selects "Kapat" or a newer roll replaces it

### Requirement: Only fresh rolls play
A device SHALL play a roll in the strip or a notification card only when the roll arrives after the device started showing the channel, and was made at most 10 seconds earlier. When several rolls arrive at once, only the newest SHALL play. Every roll SHALL still appear in the channel.

#### Scenario: Reloading the page
- **WHEN** Ayla reloads the app after three rolls were made
- **THEN** no roll plays, and the three rolls are in the channel

#### Scenario: Back online
- **WHEN** Bora's connection returns after a minute, and four rolls arrive together
- **THEN** none of them plays, and all four are in the channel

### Requirement: Rolls the user has not seen
On each device, the "Zarlar" menu entry SHALL count the rolls made since the user last had the Zarlar screen open, the user's own rolls left out. Opening the Zarlar screen SHALL clear the count. A count above 9 SHALL read "9+".

#### Scenario: Two new rolls
- **WHEN** Bora and Cem roll while Ayla is on her hand screen
- **THEN** the "Zarlar" entry on Ayla's device shows 2

#### Scenario: Opening the screen
- **WHEN** Ayla opens the Zarlar screen
- **THEN** the count is gone

### Requirement: Device settings
"Bu cihazda" SHALL hold two settings, kept on the device:
- "Atışları göster", on by default. When it is off, other users' rolls SHALL NOT open notification cards, and the menu count stays.
- "Zar sesi", off by default. When it is on, the dice SHALL make their sounds while they tumble.

#### Scenario: Turning the cards off
- **WHEN** Ayla turns "Atışları göster" off and Bora rolls while she is on her hand screen
- **THEN** no card opens, and the "Zarlar" entry counts the roll

#### Scenario: Sound by default
- **WHEN** a device shows a roll for the first time
- **THEN** the dice make no sound

### Requirement: Dice styles
Each user SHALL choose one of 8 dice styles: Galaxy, Gemstone, Glass, Iron, Nebula, Sunrise, Sunset and Walnut. A user who never chose SHALL have Galaxy. Each roll SHALL keep the style its roller had when they rolled, and every device SHALL show the roll in that style.

#### Scenario: Choosing a style
- **WHEN** Bora chooses Walnut under "Zar stilin" and rolls
- **THEN** his dice are wooden on every device

#### Scenario: Changing style later
- **WHEN** Bora rolls in Walnut, then switches to Iron and plays his earlier roll again
- **THEN** the earlier roll still shows Walnut dice

### Requirement: The DM's hidden roll
The DM's roll form SHALL offer "Gizli". A hidden roll SHALL show to players as "DM gizli zar attı", with no dice, results, note or total, and SHALL NOT open a notification card or count in the menu on a player's device. The DM SHALL see the hidden roll in full, marked hidden, on each of their devices.

#### Scenario: A player sees a hidden roll
- **WHEN** the DM rolls 1d20 hidden while Ayla has the Zarlar screen open
- **THEN** Ayla's channel shows "DM gizli zar attı", and no dice play

#### Scenario: The DM sees it
- **WHEN** the DM rolls 1d20 hidden
- **THEN** the DM's channel shows the roll with its result, marked hidden

### Requirement: Rolling while offline
A roll made without a connection SHALL appear in the roller's channel at once, marked as waiting to be sent, and SHALL reach the other devices when the connection returns.

#### Scenario: A roll without a connection
- **WHEN** Ayla rolls while offline
- **THEN** her dice tumble, the roll shows in her channel as waiting, and Bora's channel gets it once Ayla is online again

### Requirement: Dice without motion
With reduced motion, the dice SHALL appear at rest on their recorded faces without tumbling. Without WebGL, or when the 3D part cannot load, the strip and the cards SHALL show the results as numbers. The channel, the form and the totals SHALL work in every case.

#### Scenario: Reduced motion
- **WHEN** a device that asks for reduced motion shows Bora's roll
- **THEN** the dice appear at rest on their faces at once

#### Scenario: No 3D
- **WHEN** the 3D part fails to load on Cem's device
- **THEN** his strip shows the roll's results as numbers, and he can still roll

### Requirement: Roll records
Each roll SHALL be stored as one record. The record SHALL hold:
- the roller and the server time
- the style, the mode and the fixed number
- the fixed number's numbers as written, when it was written as a sum of two or more
- the note
- each physical die with its type and result
- the throw and each die's rest

A hidden roll's public record SHALL hold only the roller, the time and that it is hidden. Its content SHALL be in a record only the DM can read. Records SHALL NOT be changed or deleted, by anyone.

#### Scenario: Changing a roll
- **WHEN** Ayla tries to change the result of her earlier roll
- **THEN** the server denies the write

#### Scenario: Reading a hidden roll's content
- **WHEN** a player tries to read the content of the DM's hidden roll
- **THEN** the server denies the read

#### Scenario: A roll from before sums
- **WHEN** Bora opens the channel, and it holds a roll recorded without written numbers
- **THEN** the roll shows its fixed number as one number, as before

### Requirement: Roll records are checked
The server SHALL accept a roll record only when all of these hold:
- the record is the signed-in user's own
- it is made at the server time
- it holds 1 to 12 physical dice, each a valid type with a result its die can show
- every d100 tens die is followed by its d10
- advantage or disadvantage comes only with exactly two d20
- the fixed number is from −99 to +99, and the note is at most 80 characters
- the numbers as written, when present, are 2 to 8 whole numbers from 0 to 99 joined by + and −
- the style is one of the 8

#### Scenario: Rolling for someone else
- **WHEN** Bora writes a roll record that names Ayla as the roller
- **THEN** the server denies it

#### Scenario: An impossible result
- **WHEN** a record holds a d6 that shows 7
- **THEN** the server denies it

#### Scenario: Thirteen dice
- **WHEN** a record holds 13 physical dice
- **THEN** the server denies it

#### Scenario: Signed out
- **WHEN** a request without a signed-in user reads or writes a roll record
- **THEN** the server denies it

#### Scenario: A written sum
- **WHEN** Ayla writes a roll record with the fixed number 11 and the numbers written as "5+10-4"
- **THEN** the server accepts it

#### Scenario: A malformed written sum
- **WHEN** a record's numbers as written read "5+*4" or hold a number above 99
- **THEN** the server denies it

### Requirement: Hidden roll records are checked
The server SHALL accept a hidden roll only from the DM, and only together with its DM-only record. Only the DM SHALL read or write DM-only records.

#### Scenario: A player's hidden roll
- **WHEN** Ayla writes a hidden roll record
- **THEN** the server denies it

#### Scenario: A hidden roll without its content
- **WHEN** the DM writes a hidden public record without its DM-only record
- **THEN** the server denies it

#### Scenario: The DM's hidden pair
- **WHEN** the DM writes a hidden public record and its DM-only record together
- **THEN** the server accepts both

### Requirement: The dice settings dialog
"Zar stili" SHALL open a dialog with "Zar stilin" and "Bu cihazda". Choosing a style SHALL save it and close the dialog. The dialog SHALL also close with "Kapat" or the Escape key. The dice style and the device settings SHALL NOT show on the screen outside the dialog.

#### Scenario: Choosing a style
- **WHEN** Bora selects "Zar stili" and then Walnut
- **THEN** the dialog closes, and Bora's next roll uses Walnut dice

#### Scenario: Changing a device setting
- **WHEN** Ayla selects "Zar stili", turns "Zar sesi" on and selects "Kapat"
- **THEN** the dialog closes, and her dice make their sounds from then on

#### Scenario: The screen without the dialog
- **WHEN** a signed-in user opens the Zarlar screen
- **THEN** neither the dice styles nor "Bu cihazda" show until "Zar stili" is selected
