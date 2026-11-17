# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
