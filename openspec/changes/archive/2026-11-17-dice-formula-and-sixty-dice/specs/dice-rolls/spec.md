# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: At most twelve dice`
- TO: `### Requirement: At most sixty dice`

- FROM: `### Requirement: An invalid fixed number`
- TO: `### Requirement: An invalid formula`

## ADDED Requirements

### Requirement: A typed formula
The formula field SHALL read dice terms and whole numbers joined by + and −. A dice term SHALL be a count and a die, such as "40d6". A missing count SHALL mean 1, upper and lower case SHALL both be read, and "d%" SHALL mean d100. Terms of the same die SHALL add up. Spaces SHALL be ignored. While the user types, the field SHALL keep the text as typed. When the user leaves the field, or uses a die control or a chip, the formula SHALL be written in the canonical form.

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

## MODIFIED Requirements

### Requirement: Building a roll
The roll form SHALL build a roll from a formula, using these dice: d4, d6, d8, d10, d12, d20 and d100. The user SHALL be able to type the formula (see "A typed formula") or edit it with controls. Selecting a die SHALL add one to the formula. Each die type in the formula SHALL have a chip that shows its count in an editable field, and a "×" that takes that die type away. The form SHALL also let the user write a note of up to 80 characters.

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

### Requirement: A fixed number written as a sum
The fixed number SHALL be the numbers in the formula that are not dice. It SHALL be one whole number, or up to eight joined by + and −, each from 0 to 99, and their sum SHALL be from −99 to +99. The roll SHALL keep the numbers as written. The form's formula, the channel and the notification card SHALL show them in order after the dice, and the total SHALL use their sum. When a record's written numbers do not add up to its fixed number, devices SHALL show the fixed number alone.

#### Scenario: Writing a sum
- **WHEN** Ayla types "1d20+5+10-4" as the formula and leaves the field
- **THEN** the formula reads "1d20 + 5 + 10 − 4"

#### Scenario: The total of a sum
- **WHEN** Ayla rolls 1d20 + 5 + 10 − 4, and the d20 shows 12
- **THEN** the roll's total is 23

#### Scenario: Others see the sum
- **WHEN** Ayla rolls 1d20 + 5 + 10 − 4 while Bora has the Zarlar screen open
- **THEN** Bora's channel shows the roll's formula as "1d20 + 5 + 10 − 4"

#### Scenario: Spaces and a leading sign
- **WHEN** Cem types " -2 - 3 + 1d6 " as the formula and leaves the field
- **THEN** the formula reads "1d6 − 2 − 3", and the roll adds −5

#### Scenario: Numbers among the dice
- **WHEN** Bora types "5+1d20+3" as the formula and leaves the field
- **THEN** the formula reads "1d20 + 5 + 3"

#### Scenario: Numbers that do not add up
- **WHEN** a record's fixed number is 11 and its written numbers are 5, 10 and −3
- **THEN** devices show the fixed number as "+ 11", and the total uses 11

### Requirement: An invalid formula
When the formula is not dice and whole numbers joined by + and −, when it names a die other than the seven, when a number is outside 0 to 99, when it holds more than eight numbers, or when their sum is outside −99 to +99, the form SHALL keep the text as typed and mark the field as invalid. It SHALL show a hint with an example, "örneğin 1d20+4+4-5", and SHALL disable "At" until the text is valid. When the formula holds more than 60 physical dice, the hint SHALL say "En fazla 60 zar".

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

### Requirement: At most sixty dice
A roll SHALL hold at most 60 physical dice. A d100 SHALL count as two: a tens die and a d10. When a roll is full, the form SHALL disable the dice that no longer fit and say "En fazla 60 zar". A count typed on a chip SHALL NOT go above what fits.

#### Scenario: Twelve d6
- **WHEN** Cem has added 12 d6
- **THEN** every die control is still enabled, and the form does not say "En fazla 60 zar"

#### Scenario: Sixty d6
- **WHEN** Cem has 60 d6 in the formula
- **THEN** every die control is disabled, and the form says "En fazla 60 zar"

#### Scenario: A d100 with eleven dice
- **WHEN** the formula holds 11 physical dice
- **THEN** every die control, the d100 included, is enabled

#### Scenario: A d100 with fifty-nine dice
- **WHEN** the formula holds 59 physical dice
- **THEN** the d100 control is disabled, and d4 to d20 are still enabled

#### Scenario: A count that does not fit
- **WHEN** the formula is "1d20" and Cem types 70 in the d6 chip's count
- **THEN** the formula reads "1d20 + 59d6"

#### Scenario: A big roll on every device
- **WHEN** Cem rolls 40d6 while Ayla has the Zarlar screen open
- **THEN** Ayla's strip plays all 40 dice, and her channel shows 40 results and their total

### Requirement: When a hidden result shows
A hidden result SHALL show as soon as the strip's dice rest, when a newer roll replaces it in the strip, or 10 seconds after it arrived, whichever comes first. Nothing SHALL be hidden for a roll played again with "Tekrar izle", for a roll that does not play, or on a device with reduced motion, without the 3D dice, or with "Zarları 3D göster" off.

#### Scenario: A newer roll
- **WHEN** Cem rolls while Bora's dice still tumble in the strip
- **THEN** Bora's entry shows its result at once, and Cem's entry hides its own

#### Scenario: Watching again
- **WHEN** Ayla selects "Tekrar izle" on an earlier roll
- **THEN** that roll's entry keeps showing its result while the strip plays it

#### Scenario: Reduced motion
- **WHEN** a device that asks for reduced motion shows Bora's new roll
- **THEN** the entry shows its result at once

#### Scenario: 3D dice turned off
- **WHEN** Ayla has turned "Zarları 3D göster" off, and Bora rolls while she has the Zarlar screen open
- **THEN** Ayla's entry for Bora's roll shows its result at once

#### Scenario: A stalled throw
- **WHEN** the strip has not reported its dice at rest 10 seconds after a roll arrived
- **THEN** the entry shows its result

### Requirement: Device settings
"Bu cihazda" SHALL hold three settings, kept on the device:
- "Atışları göster", on by default. When it is off, other users' rolls SHALL NOT open notification cards, and the menu count stays.
- "Zar sesi", off by default. When it is on, the dice SHALL make their sounds while they tumble.
- "Zarları 3D göster", on by default. When it is off, the device SHALL show every roll's dice flat, as numbers. The user's own rolls SHALL still be thrown with physics, so other devices play them in 3D.

#### Scenario: Turning the cards off
- **WHEN** Ayla turns "Atışları göster" off and Bora rolls while she is on her hand screen
- **THEN** no card opens, and the "Zarlar" entry counts the roll

#### Scenario: Sound by default
- **WHEN** a device shows a roll for the first time
- **THEN** the dice make no sound

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

### Requirement: Dice without motion
With reduced motion, the dice SHALL appear at rest on their recorded faces without tumbling. Without WebGL, when the 3D part cannot load, or when "Zarları 3D göster" is off on the device, the strip SHALL show the results as numbers. The channel, the form, the notification card and the totals SHALL work in every case.

#### Scenario: Reduced motion
- **WHEN** a device that asks for reduced motion shows Bora's roll
- **THEN** the dice appear at rest on their faces at once

#### Scenario: No 3D
- **WHEN** the 3D part fails to load on Cem's device
- **THEN** his strip shows the roll's results as numbers, and he can still roll

#### Scenario: 3D turned off
- **WHEN** Cem has turned "Zarları 3D göster" off
- **THEN** his strip shows each roll's results as numbers, and he can still roll

### Requirement: Roll records are checked
The server SHALL accept a roll record only when all of these hold:
- the record is the signed-in user's own
- it is made at the server time
- it holds 1 to 60 physical dice, each only a valid type and a result its die can show
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
