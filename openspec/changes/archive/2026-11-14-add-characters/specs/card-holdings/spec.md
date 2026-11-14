# Spec Delta

## MODIFIED Requirements

### Requirement: Using a card
A player SHALL be able to use a card in their own hand, and the DM a card in any hand. Using asks, optionally, on which character the card was used: one of the table's characters, or a name typed for one that has none. The use SHALL pay its amount from the holder's LP, in the same step that closes the holding with the reason "used" and that character. Players SHALL NOT be able to use other players' cards.

#### Scenario: A player uses their card
- **WHEN** Ayla, who has 5 LP, uses her 2-cost "Aboleth's Eyes" on her character "Thorin"
- **THEN** the card leaves her hand, its holding is closed as used on "Thorin", and she has 3 LP on every device

#### Scenario: Using another player's card
- **WHEN** Ayla tries to close a holding in Bora's hand
- **THEN** the server denies it

#### Scenario: A use without its payment
- **WHEN** a signed-in user closes Ayla's 2-cost card as used without lowering her LP in the same write
- **THEN** the server denies it

## ADDED Requirements

### Requirement: Choosing the character of a use
The use step SHALL ask "Hangi karakter üzerinde?" with a list. It SHALL start at "Karakter seçilmedi". It SHALL then list every active character at the table, grouped under each owner's name, with the holder's group first and the other groups in the order of the "Oyuncular" list. The last choice SHALL be "Başka (yaz)…". Archived characters SHALL NOT be listed.

#### Scenario: The list
- **WHEN** Bora opens the use step of a card in his hand, Ayla owns "Thorin" and "Kuzgun", and Bora owns "Elara"
- **THEN** the list shows "Karakter seçilmedi", then Bora's group with "Elara", then Ayla's group with "Thorin" and "Kuzgun", then "Başka (yaz)…"

#### Scenario: Using without a character
- **WHEN** Ayla confirms a use with "Karakter seçilmedi"
- **THEN** the holding is closed as used with no character

#### Scenario: An archived character
- **WHEN** Ayla has archived "Kuzgun", and she opens the use step of a card
- **THEN** "Kuzgun" is not in the list

#### Scenario: A character added meanwhile
- **WHEN** Ayla's use step is open, and Bora adds "Elara" on another device
- **THEN** "Elara" shows in Ayla's list without a reload

### Requirement: A typed character
Choosing "Başka (yaz)…" SHALL show a text field for the character's name, of at most 100 characters. A use with a typed name SHALL record that name and no character. A use with "Başka (yaz)…" and an empty field SHALL record no character.

#### Scenario: An enemy
- **WHEN** the DM uses Ayla's card with "Başka (yaz)…" and types "Goblin şefi"
- **THEN** the holding is closed as used on "Goblin şefi", with no character record

#### Scenario: An empty field
- **WHEN** Ayla chooses "Başka (yaz)…", leaves the field empty and confirms
- **THEN** the holding is closed as used with no character

### Requirement: The character of a use is recorded
A holding closed as used on a chosen character SHALL record that character and its name at the time of the use. A later rename or archive of the character SHALL NOT change the holding. The server SHALL deny a use on a character that does not exist or is archived, or whose recorded name is not the character's name.

#### Scenario: A later rename
- **WHEN** Ayla used a card on "Thorin", and later renames "Thorin" to "Thorin Oakenshield"
- **THEN** the holding and the İşlem Logu still name "Thorin"

#### Scenario: Archived meanwhile
- **WHEN** Bora's use step has "Kuzgun" chosen, and Ayla archives "Kuzgun" before Bora confirms
- **THEN** the card stays in Bora's hand, and a Turkish message says that the character is no longer available

#### Scenario: A forged name
- **WHEN** a signed-in user closes a holding as used on "Thorin" with the recorded name "Elara"
- **THEN** the server denies it

#### Scenario: An old holding
- **WHEN** a user opens the İşlem Logu, and a holding was closed as used on "Thorin" before characters existed
- **THEN** the event still shows "Thorin"
