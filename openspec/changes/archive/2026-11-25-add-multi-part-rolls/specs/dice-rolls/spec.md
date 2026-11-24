# Spec Delta

## ADDED Requirements

### Requirement: A roll in parts
A formula SHALL hold up to 4 parts separated by ";". Each part SHALL be a formula of its own, with its own dice, fixed number and total. The roll SHALL throw every part's dice together, once, in one record. It SHALL show in one channel entry, one strip playback and one notification card. With two or more parts, every part SHALL hold at least one die. A formula without ";" SHALL be a roll of one part, as before.

#### Scenario: An attack and its damage
- **WHEN** Ayla types "d20+5;d4+9+d20" and selects "At", and the dice show 14, then 20 and 3
- **THEN** one roll is made, its channel entry shows "1d20 + 5" totalling 19 and "1d20 + 1d4 + 9" totalling 32

#### Scenario: One throw on the strip
- **WHEN** Bora rolls "1d20 + 5; 2d6 + 3" while Ayla has the Zarlar screen open
- **THEN** Ayla's strip plays all three dice in one throw

#### Scenario: Four parts
- **WHEN** Cem types "d20; d20; d20; d20" and selects "At"
- **THEN** one roll of four parts is made, each with its own total

#### Scenario: Sixty dice across parts
- **WHEN** the formula is "30d6; 30d6"
- **THEN** the formula is valid, and the form says "En fazla 60 zar"

#### Scenario: A part without a die
- **WHEN** Bora types "d20+5; 5" as the formula
- **THEN** the field is marked invalid, and "At" is disabled

#### Scenario: A single formula
- **WHEN** Ayla rolls "1d20 + 5" without ";"
- **THEN** the roll is a roll of one part, recorded and shown as before

## MODIFIED Requirements

### Requirement: Building a roll
The roll form SHALL build a roll from a formula, using these dice: d4, d6, d8, d10, d12, d20 and d100. The user SHALL be able to type the formula (see "A typed formula") or edit it with controls. Selecting a die SHALL add one to the formula's last part. Each die type in the last part SHALL have a chip that shows its count in an editable field, and a "×" that takes that die type away from the last part. With two or more parts, the chips SHALL be labelled "Son parça". The form SHALL also let the user write a note of up to 80 characters, one for the whole roll.

"At" SHALL be disabled while the formula has no die.

#### Scenario: Mixing dice
- **WHEN** Ayla selects d20, d6 and d6, then types " + 3" at the end of the formula
- **THEN** the formula reads "1d20 + 2d6 + 3"

#### Scenario: Typing a count on a chip
- **WHEN** Cem selects d6 and types 40 in the d6 chip's count
- **THEN** the formula reads "40d6"

#### Scenario: Taking a die type away
- **WHEN** the formula is "1d20 + 40d6 + 5" and Cem selects "×" on the d6 chip
- **THEN** the formula reads "1d20 + 5"

#### Scenario: No dice
- **WHEN** the formula has no die
- **THEN** "At" is disabled

#### Scenario: Only a fixed number
- **WHEN** Bora types "5" as the formula
- **THEN** the formula is not marked invalid, and "At" is disabled

#### Scenario: A long note
- **WHEN** Ayla types a note of 100 characters
- **THEN** the note keeps its first 80 characters

#### Scenario: A die control with parts
- **WHEN** the field reads "1d20 + 5; 1d6" and Ayla selects d6
- **THEN** the formula reads "1d20 + 5; 2d6"

#### Scenario: The chips with parts
- **WHEN** the formula is "1d20 + 5; 2d6 + 3"
- **THEN** the form shows one chip, for the d6 with the count 2, labelled "Son parça"

### Requirement: A typed formula
The formula field SHALL read dice terms and whole numbers joined by + and −, and parts separated by ";". A dice term SHALL be a count and a die, such as "40d6". A missing count SHALL mean 1, upper and lower case SHALL both be read, and "d%" SHALL mean d100. Terms of the same die SHALL add up within a part, never across parts. Spaces SHALL be ignored. An empty last part SHALL be ignored. While the user types, the field SHALL keep the text as typed. When the user leaves the field, or uses a die control or a chip, the formula SHALL be written in the canonical form, its parts joined by "; ".

#### Scenario: Typing a big roll
- **WHEN** Cem types "40d6+5" and selects "At"
- **THEN** the roll throws 40 d6 and adds 5

#### Scenario: The same die twice
- **WHEN** Bora types "2d6+3d6" and leaves the field
- **THEN** the formula reads "5d6"

#### Scenario: No count and capitals
- **WHEN** Ayla types "D20+4" and leaves the field
- **THEN** the formula reads "1d20 + 4", and "Avantaj" and "Dezavantaj" are enabled

#### Scenario: Percentile dice
- **WHEN** Bora types "d%" and leaves the field
- **THEN** the formula reads "1d100"

#### Scenario: Canonical order
- **WHEN** Cem types "5+2d6+d20" and leaves the field
- **THEN** the formula reads "1d20 + 2d6 + 5"

#### Scenario: Typing is not rewritten
- **WHEN** Ayla types "2d6+" in the formula field
- **THEN** the field still reads "2d6+" while she types

#### Scenario: A die control after typing
- **WHEN** the field reads "2d6+5" and Ayla selects d20
- **THEN** the formula reads "1d20 + 2d6 + 5"

#### Scenario: Parts in canonical form
- **WHEN** Ayla types "d20+5;d4+9+d20" and leaves the field
- **THEN** the formula reads "1d20 + 5; 1d20 + 1d4 + 9"

#### Scenario: The same die in two parts
- **WHEN** Bora types "2d6; 3d6" and leaves the field
- **THEN** the formula reads "2d6; 3d6"

#### Scenario: A trailing separator
- **WHEN** Cem types "d20+5;" as the formula
- **THEN** the field is not marked invalid, and when he leaves the field it reads "1d20 + 5"

### Requirement: An invalid formula
When the formula is not dice and whole numbers joined by + and −, when it names a die other than the seven, when a number is outside 0 to 99, when a part holds more than eight numbers, or when a part's numbers add up outside −99 to +99, the form SHALL keep the text as typed and mark the field as invalid. It SHALL also do so when the formula has more than 4 parts, when a part other than the last is empty, or when one of two or more parts has no die. It SHALL show a hint with an example, "örneğin 1d20+4+4-5", and SHALL disable "At" until the text is valid. When the formula holds more than 60 physical dice, the hint SHALL say "En fazla 60 zar". When it has more than 4 parts, the hint SHALL say "En fazla 4 parça".

#### Scenario: A sum left open
- **WHEN** Ayla types "1d20+4+" as the formula
- **THEN** the field is marked invalid, the hint shows, and "At" is disabled

#### Scenario: Fixing it
- **WHEN** Ayla then types "1", so the field reads "1d20+4+1"
- **THEN** the hint is gone, and "At" is enabled

#### Scenario: Not a sum
- **WHEN** Bora types "1d20+4*2", "2d7", "-1d4" or "2d20kh1" as the formula
- **THEN** the field is marked invalid, and "At" is disabled

#### Scenario: A sum out of range
- **WHEN** Cem types "1d20+90+20" as the formula
- **THEN** the field is marked invalid, and "At" is disabled

#### Scenario: Too many dice
- **WHEN** Cem types "61d6" or "31d100" as the formula
- **THEN** the field is marked invalid, the hint says "En fazla 60 zar", and "At" is disabled

#### Scenario: Too many dice across parts
- **WHEN** Cem types "40d6; 21d6" as the formula
- **THEN** the field is marked invalid, the hint says "En fazla 60 zar", and "At" is disabled

#### Scenario: Too many parts
- **WHEN** Ayla types "d20; d20; d20; d20; d20" as the formula
- **THEN** the field is marked invalid, the hint says "En fazla 4 parça", and "At" is disabled

#### Scenario: An empty part in the middle
- **WHEN** Bora types "d20;;d6" as the formula
- **THEN** the field is marked invalid, and "At" is disabled

#### Scenario: Each part's own range
- **WHEN** Cem types "d20+90; d6+90" as the formula
- **THEN** the field is not marked invalid

### Requirement: Advantage and disadvantage
When the formula has one part, and that part holds exactly one d20 and no other die, the form SHALL offer "Avantaj" and "Dezavantaj". Such a roll SHALL throw two d20 and keep the higher one (Avantaj) or the lower one (Dezavantaj). The die it does not keep SHALL be shown dimmed and struck through. With any other formula, two or more parts included, the two choices SHALL be disabled, and the roll is normal.

#### Scenario: Advantage
- **WHEN** Bora rolls 1d20 + 5 with "Avantaj", and the dice show 20 and 8
- **THEN** the roll keeps 20, shows 8 dimmed and struck through, and totals 25

#### Scenario: Not a single d20
- **WHEN** the formula is 1d20 + 1d6
- **THEN** "Avantaj" and "Dezavantaj" are disabled

#### Scenario: A d20 in each part
- **WHEN** the formula is "1d20 + 5; 1d20 + 3"
- **THEN** "Avantaj" and "Dezavantaj" are disabled

#### Scenario: Advantage chosen before adding a part
- **WHEN** Ayla chose "Avantaj" on "1d20 + 5", then types "; 2d6" and selects "At"
- **THEN** the roll is normal and throws one d20 and two d6

### Requirement: Results and the total
Each die SHALL show the face it lands on. Each part's total SHALL be the sum of its kept dice plus its fixed number. A roll of one part has one total. A d100 SHALL read its tens die (00 to 90) plus its d10 (0 to 9), with 00 and 0 reading 100. The totals SHALL be computed from the roll's record each time they are shown, never stored apart from it.

#### Scenario: A mixed roll
- **WHEN** Ayla rolls 1d20 + 2d6 + 3, and the dice show 17, 4 and 2
- **THEN** the roll's total is 26

#### Scenario: A d100
- **WHEN** the tens die shows 30 and the d10 shows 7
- **THEN** the d100 reads 37

#### Scenario: The highest d100
- **WHEN** the tens die shows 00 and the d10 shows 0
- **THEN** the d100 reads 100

#### Scenario: Totals of parts
- **WHEN** Ayla rolls "1d20 + 5; 2d6 + 3", and the dice show 12, then 4 and 6
- **THEN** the first part totals 17 and the second 13, and no total of the whole roll is shown

### Requirement: Natural 20 and natural 1
When a part's only kept die is a d20, a kept 20 SHALL mark that part "Nat 20" in gold, and a kept 1 SHALL mark it "Nat 1" in red, in the channel, the strip and the notification card. Each part SHALL be marked on its own. In a roll of one part, the part's mark is the roll's mark.

#### Scenario: A natural 20 with advantage
- **WHEN** Bora's advantage roll keeps a 20
- **THEN** the roll is marked "Nat 20"

#### Scenario: A natural 1
- **WHEN** Ayla rolls 1d20 + 4, and the d20 shows 1
- **THEN** the roll is marked "Nat 1" in red

#### Scenario: A 20 among other dice
- **WHEN** a 1d20 + 1d6 roll shows 20 on the d20
- **THEN** no "Nat 20" mark is shown

#### Scenario: A natural in one part
- **WHEN** Ayla rolls "1d20 + 5; 1d20 + 1d4 + 9", and both d20 show 20
- **THEN** the first part is marked "Nat 20", and the second part is not marked

### Requirement: The channel
Every signed-in user SHALL see every roll in the channel, live, oldest at the top and newest at the bottom. Each entry SHALL show:
- who rolled and when
- the note
- the formula
- each die with its result
- the total

A roll of two or more parts SHALL show one line per part, in order, each with its formula, its dice, its fixed number, its natural mark and its total.

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

#### Scenario: A roll in parts
- **WHEN** Cem rolls "1d20 + 5; 2d6 + 3" while Bora has the Zarlar screen open
- **THEN** Bora's channel shows one entry for Cem, with a line for "1d20 + 5" and its total and a line for "2d6 + 3" and its total

### Requirement: Dice without motion
With reduced motion, the dice SHALL appear at rest on their recorded faces without tumbling. Without WebGL, when the 3D part cannot load, or when "Zarları 3D göster" is off on the device, the strip SHALL show the results as numbers, grouped by part for a roll of two or more parts. The 3D strip SHALL NOT show which die belongs to which part. The channel, the form, the notification card and the totals SHALL work in every case.

#### Scenario: Reduced motion
- **WHEN** a device that asks for reduced motion shows Bora's roll
- **THEN** the dice appear at rest on their faces at once

#### Scenario: No 3D
- **WHEN** the 3D part fails to load on Cem's device
- **THEN** his strip shows the roll's results as numbers, and he can still roll

#### Scenario: 3D turned off
- **WHEN** Cem has turned "Zarları 3D göster" off
- **THEN** his strip shows each roll's results as numbers, and he can still roll

#### Scenario: Parts without 3D
- **WHEN** Cem has turned "Zarları 3D göster" off, and Ayla rolls "1d20 + 5; 2d6"
- **THEN** his strip shows the d20's result apart from the two d6 results

### Requirement: A roll arrives on another screen
When another user rolls while this user is on any screen other than Zarlar, a notification card SHALL show the roll. The card SHALL show, all at once:
- the roller and the note
- the formula, the kept results, the natural mark and the total, one line per part for a roll of two or more parts
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

#### Scenario: A roll in parts on another screen
- **WHEN** Bora rolls "1d20 + 5; 2d6 + 3" while Ayla is on her hand screen, and the dice show 15, then 2 and 5
- **THEN** the card shows "1d20 + 5" with 20, and "2d6 + 3" with 10, on two lines

### Requirement: Roll records
Each roll SHALL be stored as one record. The record SHALL hold:
- the roller and the server time
- the style, the mode and the fixed number
- the fixed number's numbers as written, when it was written as a sum of two or more
- for a roll of two or more parts, each part's number of physical dice and its fixed number as written
- the note
- each physical die with its type and result, part after part
- the throw and each die's rest

A roll of two or more parts SHALL have the mode normal and the fixed number 0, and SHALL keep each part's fixed number in its parts. A roll of one part SHALL be recorded without parts, as before. A record without parts SHALL show as one part. When a record's parts do not match its dice, devices SHALL show it as one part with its dice and the fixed number 0.

A hidden roll's public record SHALL hold only the roller, the time and that it is hidden. Its content SHALL be in a record only the DM can read. Records SHALL NOT be changed, by anyone. Only the DM SHALL delete them, public and DM-only alike, by resetting the channel.

#### Scenario: Changing a roll
- **WHEN** Ayla tries to change the result of her earlier roll
- **THEN** the server denies the write

#### Scenario: Reading a hidden roll's content
- **WHEN** a player tries to read the content of the DM's hidden roll
- **THEN** the server denies the read

#### Scenario: A roll from before sums
- **WHEN** Bora opens the channel, and it holds a roll recorded without written numbers
- **THEN** the roll shows its fixed number as one number, as before

#### Scenario: A player deletes a roll
- **WHEN** Ayla tries to delete her own earlier roll, or anyone else's
- **THEN** the server denies it, and the roll stays in every channel

#### Scenario: The DM deletes rolls
- **WHEN** the DM deletes a public roll record, a hidden roll's public record, and that hidden roll's DM-only record
- **THEN** the server accepts all three

#### Scenario: A roll from before parts
- **WHEN** Bora opens the channel, and it holds a roll recorded before this change
- **THEN** the roll shows as one part, as before

#### Scenario: Parts that do not match the dice
- **WHEN** a record's parts count 4 dice, and it holds 3
- **THEN** devices show its 3 dice as one part with the fixed number 0

#### Scenario: A hidden roll in parts
- **WHEN** the DM rolls "1d20 + 5; 2d6" hidden
- **THEN** the DM's channel shows both parts, marked hidden, and a player's channel shows "DM gizli zar attı"

### Requirement: Roll records are checked
The server SHALL accept a roll record only when all of these hold:
- the record is the signed-in user's own
- it is made at the server time
- it holds 1 to 60 physical dice, each only a valid type and a result its die can show
- advantage or disadvantage comes only with exactly two d20
- the fixed number is from −99 to +99, and the note is at most 80 characters
- the numbers as written, when present, are 2 to 8 whole numbers from 0 to 99 joined by + and −
- the parts, when present, are 2 to 4, each a dice count from 1 to 60 with an optional fixed number of 1 to 8 whole numbers from 0 to 99 joined by + and −, and the record then has the mode normal, the fixed number 0 and no numbers as written
- the style is one of the 8

#### Scenario: Rolling for someone else
- **WHEN** Bora writes a roll record that names Ayla as the roller
- **THEN** the server denies it

#### Scenario: An impossible result
- **WHEN** a record holds a d6 that shows 7
- **THEN** the server denies it

#### Scenario: An impossible result late in a big roll
- **WHEN** a record holds 59 valid d6 followed by a d6 that shows 7
- **THEN** the server denies it

#### Scenario: Sixty dice
- **WHEN** Cem writes a public roll record with 60 d6, its motion included
- **THEN** the server accepts it

#### Scenario: A hidden roll of sixty dice
- **WHEN** the DM writes a hidden public record and its DM-only record holding 60 dice together
- **THEN** the server accepts both

#### Scenario: Thirteen dice
- **WHEN** a record holds 13 valid physical dice
- **THEN** the server accepts it

#### Scenario: Sixty-one dice
- **WHEN** a record holds 61 physical dice
- **THEN** the server denies it

#### Scenario: A die with an extra field late in a big roll
- **WHEN** a record holds 59 valid d6 followed by a d6 with a third field
- **THEN** the server denies it

#### Scenario: A tens die without its d10
- **WHEN** a record of 40 dice holds a d100 tens die at position 35 followed by a d6
- **THEN** the server accepts it, and devices show the tens die as a die of its own and count its face in the total

#### Scenario: Signed out
- **WHEN** a request without a signed-in user reads or writes a roll record
- **THEN** the server denies it

#### Scenario: A written sum
- **WHEN** Ayla writes a roll record with the fixed number 11 and the numbers written as "5+10-4"
- **THEN** the server accepts it

#### Scenario: A malformed written sum
- **WHEN** a record's numbers as written read "5+*4" or hold a number above 99
- **THEN** the server denies it

#### Scenario: A roll in parts
- **WHEN** Ayla writes a public roll record of 3 dice with the parts "1:5;2:9", the mode normal and the fixed number 0
- **THEN** the server accepts it

#### Scenario: A hidden roll in parts
- **WHEN** the DM writes a hidden public record and its DM-only record with the parts "1:5+10-4;2"
- **THEN** the server accepts both

#### Scenario: Parts with advantage
- **WHEN** a record with parts has the mode advantage
- **THEN** the server denies it

#### Scenario: Parts with a fixed number
- **WHEN** a record with parts has the fixed number 5, or numbers as written
- **THEN** the server denies it

#### Scenario: Malformed parts
- **WHEN** a record's parts read "1:5", "1;1;1;1;1", "0;2" or "1:5*2;1"
- **THEN** the server denies it

### Requirement: Natural sounds
When a fresh roll's natural mark shows on a device, the device SHALL play a short sound: one for Nat 20 and another for Nat 1. A roll of two or more parts SHALL play one sound, that of its first marked part. On the Zarlar screen it SHALL play when the roll's result shows (see "When a hidden result shows"). On any other screen it SHALL play when the roll arrives, whether or not a notification card opens. Each fresh roll SHALL play its sound at most once on a device. A roll without a natural mark SHALL play none.

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

#### Scenario: Two naturals in parts
- **WHEN** Bora rolls "1d20; 1d20", and the first d20 shows 1 and the second 20
- **THEN** Ayla's device plays only the Nat 1 sound, once
