# dice-rolls Specification

## Purpose

Lets the table roll dice in the app and watch every roll together: a shared channel of rolls, and 3D dice that tumble the same way on every device.

## Requirements

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

### Requirement: Rolls the user has not seen
On each device, the "Zarlar" menu entry SHALL count the rolls made since the user last had the Zarlar screen open, the user's own rolls left out. Opening the Zarlar screen SHALL clear the count. A count above 9 SHALL read "9+".

#### Scenario: Two new rolls
- **WHEN** Bora and Cem roll while Ayla is on her hand screen
- **THEN** the "Zarlar" entry on Ayla's device shows 2

#### Scenario: Opening the screen
- **WHEN** Ayla opens the Zarlar screen
- **THEN** the count is gone

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

### Requirement: Resetting the dice channel
The DM SHALL be able to reset the dice channel from the Ayarlar screen (spec: table-settings, "The Ayarlar screen"). A reset SHALL first ask for confirmation, naming how many rolls will be deleted, and SHALL then delete every roll, the hidden ones and their DM-only content included. The channel, the strip and the menu count SHALL follow on every device without a reload.

#### Scenario: Confirming a reset
- **WHEN** the channel holds 142 rolls and the DM selects "Zar kanalını sıfırla"
- **THEN** a confirmation says that 142 rolls will be deleted for good, and offers "Vazgeç" and "Sıfırla"

#### Scenario: Giving up
- **WHEN** the DM selects "Vazgeç" in the confirmation
- **THEN** no roll is deleted

#### Scenario: The channel empties everywhere
- **WHEN** the DM confirms a reset while Ayla has the Zarlar screen open and Bora is on his hand screen with "Zarlar" showing 3
- **THEN** Ayla's channel is empty and her strip shows no dice, and Bora's "Zarlar" entry shows no count, without a reload

#### Scenario: Hidden content goes too
- **WHEN** the DM had made hidden rolls, and then resets the channel
- **THEN** neither their public records nor their DM-only content remain

#### Scenario: An empty channel
- **WHEN** the channel holds no rolls
- **THEN** "Zar kanalını sıfırla" is disabled

#### Scenario: Rolling after a reset
- **WHEN** Ayla rolls after a reset
- **THEN** her roll is the only one in the channel, and it plays and notifies as any new roll does

### Requirement: A reset leaves everything else alone
A dice channel reset SHALL delete only roll records. Combat and initiative, combatants' rolls, characters' initiative modifiers, users' dice styles, each device's dice settings, cards, LP and the İşlem Logu SHALL stay as they were. A reset during a combat SHALL be allowed, and its confirmation SHALL say that the initiative order stays.

#### Scenario: A reset during a fight
- **WHEN** a fight is running with 5 combatants and the DM resets the channel
- **THEN** the initiative order, each combatant's die and modifier, the turn and the round stay as they were, and only the channel's rolls are gone

#### Scenario: The confirmation during a combat
- **WHEN** a combat is open and the DM selects "Zar kanalını sıfırla"
- **THEN** the confirmation also says that the initiative order stays and only the channel's rolls are deleted

#### Scenario: Styles and device settings stay
- **WHEN** Ayla chose the Nebula style and turned "Zar sesi" on, and then the DM resets the channel
- **THEN** Ayla's next roll uses Nebula, and "Zar sesi" is still on on her device

### Requirement: A reset needs a connection
Resetting the dice channel SHALL require a network connection. Offline, the Ayarlar screen SHALL show a Turkish message, and no roll SHALL be deleted. When a reset is interrupted, the rolls not yet deleted SHALL stay, and a new reset SHALL delete them. A roll made while a reset runs MAY survive it.

#### Scenario: Offline reset
- **WHEN** the DM confirms a reset while the device is offline
- **THEN** a Turkish message says that a connection is needed, and every roll stays

#### Scenario: An interrupted reset
- **WHEN** the connection drops after part of the rolls are deleted, and the DM resets again once online
- **THEN** the remaining rolls are deleted

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
