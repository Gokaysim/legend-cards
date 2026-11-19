# initiative-tracker Specification

## Purpose

Tracks a D&D 3.5 fight at the table: the DM starts a combat, everyone rolls initiative from their own device, and the whole table sees the same order and whose turn it is, live.

## Requirements

### Requirement: The İnisiyatif tab
The Zarlar screen SHALL have an "İnisiyatif" tab beside "Kanal". Without a combat, it SHALL say that no combat is open, and the DM SHALL see "Savaş başlat". With a combat, every signed-in user SHALL see it there, live. While a combat is open, the tab SHALL carry a mark.

#### Scenario: No combat
- **WHEN** Ayla opens the İnisiyatif tab while no combat is open
- **THEN** the tab says that no combat is open, and shows no "Savaş başlat"

#### Scenario: The DM without a combat
- **WHEN** the DM opens the İnisiyatif tab while no combat is open
- **THEN** the tab shows "Savaş başlat"

#### Scenario: A combat opens
- **WHEN** the DM opens a combat while Bora has the Kanal tab open
- **THEN** the İnisiyatif tab gets its mark on Bora's screen without a reload

### Requirement: Setting up a combat
"Savaş başlat" SHALL show the table's unarchived characters grouped by owner, with the characters of every player who is online (spec: player-presence, "Who counts as online") checked, and the characters of offline players and the DM's own characters unchecked. Each offline player's group SHALL be marked as offline. While presence has not loaded, every player's characters SHALL be checked. The checked characters SHALL be chosen when the setup opens: a player who comes or goes while it is open SHALL NOT change them. The DM SHALL be able to check and uncheck them, and add NPCs. "Modifier iste" SHALL open the combat with the checked characters and the added NPCs, and SHALL be disabled while there are none. Closing the setup SHALL store nothing.

#### Scenario: The default choice
- **WHEN** Ayla owns "Thorn" and "Kuzgun", Bora owns "Elara", the DM owns "Goblin şefi", Ayla and Bora are online, and the DM selects "Savaş başlat"
- **THEN** "Thorn", "Kuzgun" and "Elara" are checked, and "Goblin şefi" is not

#### Scenario: An offline player
- **WHEN** Ayla owns "Thorn", Bora owns "Elara", Ayla is online, Bora is offline, and the DM selects "Savaş başlat"
- **THEN** "Thorn" is checked, "Elara" is not, and Bora's group is marked as offline

#### Scenario: Bringing an offline player's character in
- **WHEN** Bora is offline, the DM checks "Elara" in the setup and selects "Modifier iste"
- **THEN** a combat opens with "Elara" among its combatants

#### Scenario: Presence not loaded
- **WHEN** nobody's presence has loaded yet, and the DM selects "Savaş başlat"
- **THEN** every player's characters are checked, and no group is marked as offline

#### Scenario: A player comes online during the setup
- **WHEN** the setup is open with "Elara" unchecked because Bora was offline, and Bora opens the application
- **THEN** "Elara" stays unchecked, and Bora's group is no longer marked as offline

#### Scenario: Asking for initiative
- **WHEN** the DM unchecks "Kuzgun" and selects "Modifier iste"
- **THEN** a combat opens with "Thorn" and "Elara", and every device shows it

#### Scenario: Nobody chosen
- **WHEN** the DM unchecks every character and has added no NPC
- **THEN** "Modifier iste" is disabled

### Requirement: Typed NPCs
"NPC ekle" SHALL take a name of 1 to 40 characters, a count from 1 to 12 and a modifier. A count of 1 SHALL add one NPC with the name as typed. A larger count SHALL add that many NPCs named with the name and a number from 1, in order. A combat SHALL hold at most 50 combatants.

#### Scenario: Four goblins
- **WHEN** the DM adds "Goblin" with the count 4 and the modifier +1
- **THEN** the combat gets "Goblin 1", "Goblin 2", "Goblin 3" and "Goblin 4", each with the modifier +1

#### Scenario: One ogre
- **WHEN** the DM adds "Ogre" with the count 1
- **THEN** the combat gets one NPC named "Ogre"

#### Scenario: Too many combatants
- **WHEN** a combat holds 48 combatants and the DM adds an NPC with the count 3
- **THEN** the NPCs are not added, and the form says that a combat holds at most 50

### Requirement: NPCs roll hidden
The DM's device SHALL roll each group of NPCs as one hidden roll of one d20 per NPC, with the group's modifier, when the combat opens or, for NPCs added later before the fight starts, when they are added. Each NPC SHALL get its own d20. Players SHALL see the hidden roll in the channel as the DM's hidden roll.

#### Scenario: Rolling a group
- **WHEN** the DM opens a combat with "Goblin" ×4 at +1, and the hidden roll shows 14, 7, 20 and 2
- **THEN** Goblin 1 has 15, Goblin 2 has 8, Goblin 3 has a natural 20, and Goblin 4 has a natural 1

#### Scenario: A player's channel
- **WHEN** the DM's device rolls the goblins
- **THEN** Ayla's channel shows "DM gizli zar attı"

### Requirement: Asking for initiative
While a combat waits for rolls, each player SHALL see their own combatants with a modifier box, filled with the modifier the character rolled with last, or 0, and "At". A player with a combatant to roll who has the Zarlar screen open SHALL be taken to the İnisiyatif tab. On any other screen, they SHALL see a notice "İnisiyatif isteniyor" that opens the İnisiyatif tab.

#### Scenario: A remembered modifier
- **WHEN** the DM asks for initiative, and Ayla's "Thorn" rolled with +3 in the last combat
- **THEN** Ayla sees "Thorn" with +3 in its box and "At"

#### Scenario: On the Kanal tab
- **WHEN** the DM asks for initiative while Ayla has the Kanal tab open
- **THEN** her screen switches to the İnisiyatif tab

#### Scenario: On another screen
- **WHEN** the DM asks for initiative while Bora is on his hand screen
- **THEN** Bora sees "İnisiyatif isteniyor", and selecting it opens the İnisiyatif tab of the Zarlar screen

### Requirement: Rolling initiative
"At" SHALL roll 1d20 plus the modifier as an ordinary roll in the channel, on the roller's device, with the note "İnisiyatif · <character>". The combatant's total SHALL be that roll's result. The character SHALL keep the modifier for its next combat. The owner of a character and the DM SHALL be able to roll for it; when the DM rolls, the channel SHALL name the DM as the roller.

#### Scenario: Ayla rolls
- **WHEN** Ayla rolls "Thorn" with +3, and the d20 shows 17
- **THEN** the channel shows her roll "İnisiyatif · Thorn" with 20, and "Thorn" has 20 on every device

#### Scenario: The DM rolls for a player
- **WHEN** Bora has no connection, and the DM rolls "Elara" with +2
- **THEN** the channel shows the DM's roll "İnisiyatif · Elara", and "Elara" has its total

#### Scenario: Another player's character
- **WHEN** Bora tries to roll Ayla's "Thorn"
- **THEN** the server denies it

### Requirement: The initiative modifier
A modifier SHALL be a whole number from −10 to +30. The box SHALL not accept anything else, and "At" SHALL be disabled while the box does not hold a valid modifier.

#### Scenario: Too high
- **WHEN** Ayla types 31 in the modifier box
- **THEN** "At" is disabled

#### Scenario: A negative modifier
- **WHEN** Ayla rolls "Thorn" with −2, and the d20 shows 5
- **THEN** "Thorn" has 3

### Requirement: One roll per combatant
A combatant SHALL roll once. While the combat waits for rolls, the DM SHALL be able to select "Yeniden attır" on a rolled combatant, which clears its roll so that it can roll again. The cleared roll SHALL stay in the channel. Once the fight has started, nobody SHALL roll for a combatant.

#### Scenario: Rolling twice
- **WHEN** Ayla has rolled "Thorn" and tries to roll it again
- **THEN** "Thorn" offers no "At", and the server denies a second roll

#### Scenario: Rolling again
- **WHEN** the DM selects "Yeniden attır" on "Thorn"
- **THEN** "Thorn" has no total, and Ayla sees its box and "At" again

### Requirement: The initiative order
The order SHALL put first the combatants whose d20 showed 20, then the others by total from high to low, then those whose d20 showed 1. Within the natural 20s, within the natural 1s, and within equal totals, the order SHALL be random. A natural 20 or a natural 1 SHALL be marked "nat 20" or "nat 1".

#### Scenario: A natural 1 with a high modifier
- **WHEN** Ayla's "Thorn" rolls a natural 1 with +12, and Bora's "Elara" rolls 4 with +0
- **THEN** "Elara" comes before "Thorn"

#### Scenario: A natural 20 with a low modifier
- **WHEN** Goblin 3 rolls a natural 20 with −1, and "Thorn" totals 25
- **THEN** Goblin 3 comes first

#### Scenario: Equal totals
- **WHEN** "Thorn" and "Elara" both total 17
- **THEN** they stand next to each other, in either order

### Requirement: Random ties are fixed once
The random order of ties SHALL be chosen once, when the fight starts, and SHALL be the same on every device and after a reload.

#### Scenario: Two devices
- **WHEN** "Thorn" and "Elara" both total 17, and the fight starts
- **THEN** Ayla's and Bora's screens show them in the same order, and they keep it after a reload

### Requirement: While the rolls come in
While the combat waits for rolls, the DM SHALL see the combatants in the initiative order as it stands, with those who have not rolled at the bottom. Players SHALL see the combatants in the order they joined, each marked as rolled or waiting. The list SHALL update live as rolls come in.

#### Scenario: A roll arrives
- **WHEN** Bora rolls "Elara" while the DM's İnisiyatif tab is open
- **THEN** "Elara" moves to her place in the DM's list without a reload

#### Scenario: A player waits
- **WHEN** Ayla has rolled "Thorn" and Bora has not rolled "Elara"
- **THEN** Ayla sees "Thorn" with its total and "Elara" marked as waiting

### Requirement: What players see
Players SHALL see every combatant's name and place, and the total and natural mark of every player's character. For an NPC, players SHALL see only its name, its place and whether it has rolled. The DM SHALL see every total, modifier and mark.

#### Scenario: An NPC on a player's screen
- **WHEN** Goblin 1 totals 15
- **THEN** Ayla sees "Goblin 1" in its place without a total, and the DM sees 15

#### Scenario: Reading an NPC's roll
- **WHEN** a player tries to read an NPC's roll or modifier
- **THEN** the server denies it

### Requirement: Starting the fight
The DM SHALL start the fight with "Başlat", also before everyone has rolled. Starting SHALL fix the order. Combatants who have not rolled SHALL go last, in the order they joined, marked "atmadı". The fight SHALL start in round 1 with the first combatant active.

#### Scenario: Everyone rolled
- **WHEN** every combatant has rolled and the DM selects "Başlat"
- **THEN** the list shows the initiative order, "Tur 1", and the first combatant marked active

#### Scenario: Someone did not roll
- **WHEN** "Elara" has not rolled and the DM selects "Başlat"
- **THEN** "Elara" is last, marked "atmadı"

### Requirement: Turns and rounds
"Sıradaki" SHALL make the next combatant active. After the last, the first SHALL become active and the round number SHALL go up by one. The DM, and the owner of the active combatant's character with "Turumu bitirdim", SHALL be able to move on. Only the DM SHALL have "Geri", which SHALL step back, also across a round, but not before round 1's first combatant.

#### Scenario: The next round
- **WHEN** the last combatant of round 2 is active and the DM selects "Sıradaki"
- **THEN** the first combatant is active, and the list shows "Tur 3"

#### Scenario: A player ends their turn
- **WHEN** Ayla's "Thorn" is active and Ayla selects "Turumu bitirdim"
- **THEN** the next combatant is active on every device

#### Scenario: Not your turn
- **WHEN** "Elara" is active and Ayla tries to move the turn on
- **THEN** Ayla has no control for it, and the server denies the change

#### Scenario: Stepping back across a round
- **WHEN** the first combatant of round 3 is active and the DM selects "Geri"
- **THEN** the last combatant is active, and the list shows "Tur 2"

### Requirement: Delaying a turn
While their character's combatant is active, its owner SHALL have "Turumu beklet" beside "Turumu bitirdim". It SHALL make the next combatant active and move the delaying combatant to the place right after it, for the rest of the fight. When the delaying combatant is last, the first combatant of the next round SHALL become active, and the delaying combatant SHALL move to second place. With one combatant, "Turumu beklet" SHALL be disabled.

#### Scenario: Ayla delays
- **WHEN** the order is "Goblin 1", "Thorn", "Elara", "Goblin 2", Ayla's "Thorn" is active in round 2, and Ayla selects "Turumu beklet"
- **THEN** every device shows "Goblin 1", "Elara", "Thorn", "Goblin 2", with "Elara" active in round 2

#### Scenario: Ending the delayed turn
- **WHEN** Ayla has delayed "Thorn" behind "Elara", and Bora selects "Turumu bitirdim" for "Elara"
- **THEN** "Thorn" is active, and Ayla sees "Sıra sende: Thorn"

#### Scenario: The delay stays
- **WHEN** Ayla has delayed "Thorn" behind "Elara" in round 2, and round 3 starts
- **THEN** "Elara" still comes before "Thorn"

#### Scenario: Delaying from the last place
- **WHEN** the order is "Goblin 1", "Elara", "Thorn", Ayla's "Thorn" is active in round 2, and Ayla selects "Turumu beklet"
- **THEN** the order is "Goblin 1", "Thorn", "Elara", with "Goblin 1" active in round 3

#### Scenario: The next one is told
- **WHEN** Ayla delays "Thorn", and Bora's "Elara" comes next
- **THEN** Bora sees "Sıra sende: Elara"

#### Scenario: Alone in the fight
- **WHEN** "Thorn" is the only combatant and is active
- **THEN** Ayla's "Turumu beklet" is disabled

#### Scenario: Pressing twice
- **WHEN** Ayla selects "Turumu beklet" twice quickly
- **THEN** "Thorn" moves one place only, and "Elara" stays active

#### Scenario: Offline
- **WHEN** Ayla has no connection while "Thorn" is active
- **THEN** her "Turumu beklet" is disabled, with a note that it needs a connection

### Requirement: Your turn
When a combatant becomes active, the owner of its character SHALL see a notice "Sıra sende: <character>" on any screen. The notice SHALL show only on the devices that see the change happen, not after a reload, and SHALL close on its own after a few seconds.

#### Scenario: Ayla's turn
- **WHEN** "Thorn" becomes active while Ayla is on her hand screen
- **THEN** Ayla sees "Sıra sende: Thorn"

#### Scenario: An NPC's turn
- **WHEN** Goblin 1 becomes active
- **THEN** no player sees a notice

### Requirement: Reordering during the fight
Once the fight has started, the DM SHALL be able to move a combatant to another place by dragging it, by touch, mouse or keyboard. The active combatant SHALL stay active when the order changes around it.

#### Scenario: Dragging after a Dexterity check
- **WHEN** "Thorn" and "Elara" both total 17, "Thorn" stands first, and the DM drags "Elara" above "Thorn"
- **THEN** every device shows "Elara" before "Thorn"

#### Scenario: The active combatant moves
- **WHEN** "Thorn" is active and the DM drags it two places down
- **THEN** "Thorn" is still active

### Requirement: Adding during the fight
Once the fight has started, the DM SHALL be able to add a table character that is not in the combat, or typed NPCs as in "NPC ekle", without a roll. They SHALL go last, marked "elle eklendi", and the DM moves them into place.

#### Scenario: Reinforcements
- **WHEN** the DM adds "Kurt" with the count 2 during round 2
- **THEN** "Kurt 1" and "Kurt 2" are last, marked "elle eklendi", without totals

#### Scenario: A late player character
- **WHEN** the DM adds Cem's "Brom" during the fight
- **THEN** "Brom" is last, marked "elle eklendi", and Cem is not asked to roll

### Requirement: Removing a combatant
The DM SHALL be able to remove a combatant at any time. When the active combatant is removed, the next one SHALL become active, and after the last one, the first, in the next round.

#### Scenario: A goblin falls
- **WHEN** the DM removes "Goblin 2"
- **THEN** "Goblin 2" leaves the list on every device

#### Scenario: Removing the active combatant
- **WHEN** "Goblin 2" is active and the DM removes it
- **THEN** the combatant after it is active

### Requirement: Ending a combat
"Bitir" SHALL ask the DM for confirmation, then end the combat and clear its list on every device. Before the fight has started, the DM SHALL end it the same way, as "Vazgeç". No record of a combat's combatants, rolls or order SHALL be kept after it ends; the rolls stay in the channel.

#### Scenario: Ending a fight
- **WHEN** the DM selects "Bitir" and confirms
- **THEN** the İnisiyatif tab says that no combat is open, on every device

#### Scenario: Changing their mind
- **WHEN** the DM selects "Bitir" and then cancels
- **THEN** the combat goes on unchanged

### Requirement: One combat at a time
There SHALL be at most one combat. While a combat is open, "Savaş başlat" SHALL not be offered, and the server SHALL deny opening another.

#### Scenario: A second combat
- **WHEN** a combat is open and the DM's other device tries to open one
- **THEN** the server denies it

### Requirement: Combat steps need a connection
Every step that changes the combat, rolls for a combatant included, SHALL be disabled without a connection, and SHALL say why.

#### Scenario: Offline
- **WHEN** Ayla has no connection while the combat waits for her roll
- **THEN** her "At" is disabled, with a note that it needs a connection

### Requirement: Who changes a combat
Only the DM SHALL open, start, reorder, end a combat, add or remove combatants, step back, and clear a roll. A player SHALL only write the roll of their own character's combatant, once and together with its roll record, move the turn on by one while their character is active, and delay their active character by one place as in "Delaying a turn". The server SHALL deny the rest, and every request without a signed-in user.

#### Scenario: A player reorders
- **WHEN** Ayla tries to move "Thorn" to the top
- **THEN** the server denies it

#### Scenario: A forged total
- **WHEN** Ayla writes a total for "Thorn" that differs from the roll record she writes with it
- **THEN** the server denies it

#### Scenario: Signed out
- **WHEN** a request without a signed-in user reads the combat
- **THEN** the server denies it

#### Scenario: Delaying another player's character
- **WHEN** Bora's "Elara" is active and Ayla tries to delay it
- **THEN** the server denies it

#### Scenario: A delay that moves further
- **WHEN** Ayla's "Thorn" is active and Ayla tries to move it two places down while making the next combatant active
- **THEN** the server denies it
