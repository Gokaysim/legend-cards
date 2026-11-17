## MODIFIED Requirements

### Requirement: Roll records
Each roll SHALL be stored as one record. The record SHALL hold:
- the roller and the server time
- the style, the mode and the fixed number
- the fixed number's numbers as written, when it was written as a sum of two or more
- the note
- each physical die with its type and result
- the throw and each die's rest

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

## ADDED Requirements

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
