# Spec Delta

## MODIFIED Requirements

### Requirement: Only the DM manages definitions
Only the DM SHALL add, edit, publish, retire, bring back or delete a card or a True Word in the application. The server SHALL deny these steps to players. Players SHALL see no controls for them. A Custom Card is the one definition a player's step creates, with the last pick of their draft (spec: custom-cards). After that, only the DM SHALL change it, and only its effects. A Custom Card SHALL NOT be retired, brought back or deleted.

#### Scenario: The DM fixes a text
- **WHEN** the DM changes the text of "Aboleth's Eyes"
- **THEN** the change is saved

#### Scenario: A player changes a card
- **WHEN** Ayla tries to change the text of "Aboleth's Eyes"
- **THEN** the server denies it, and the card does not change

#### Scenario: A player adds a word
- **WHEN** Ayla tries to create a True Word
- **THEN** the server denies it

#### Scenario: No controls for players
- **WHEN** Ayla opens any tab of the Kütüphane
- **THEN** she sees no "+ Kart ekle", "+ True Word ekle" or "✎ Düzenle" control

#### Scenario: Retiring a Custom Card
- **WHEN** the DM tries to retire or delete Ayla's Custom Card
- **THEN** the server denies it

### Requirement: Flags fixed by the kind
Some flags SHALL be fixed by the kind. A Cursed card SHALL have "Set paketlerinde çıkar" and "Mechanic paketlerinde çıkar" off. A True Word SHALL have both pack flags off, and "Birden fazla elde olabilir" and "Kullanınca elde kalır" on. The form SHALL NOT show a fixed flag, and the server SHALL deny any other value for it.

#### Scenario: A Cursed card in a pack
- **WHEN** the DM writes a Cursed card with "Set paketlerinde çıkar" on
- **THEN** the server denies it

#### Scenario: A True Word that leaves the hand
- **WHEN** the DM writes a True Word with "Kullanınca elde kalır" off
- **THEN** the server denies it

## ADDED Requirements

### Requirement: Flags fixed for a Custom Card
A Custom Card SHALL have "Listede görünür", the draw flag, both pack flags and "Birden fazla elde olabilir" off, and "Kullanınca efekt bırakır" on. Its "Elde etkili" and "Kullanınca elde kalır" SHALL be on exactly when it has a Held effect. The server SHALL deny any other value.

#### Scenario: A Custom Card in the draws
- **WHEN** anyone writes a Custom Card with the draw flag on
- **THEN** the server denies it

#### Scenario: Adding Held to a Custom Card
- **WHEN** the DM adds a Held effect to Ayla's Custom Card
- **THEN** its "Elde etkili" and "Kullanınca elde kalır" turn on in the same step
