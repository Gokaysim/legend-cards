# Spec Delta

## MODIFIED Requirements

### Requirement: Effects of a use
An effect from a used card or True Word SHALL be added in the same step as the use, on the character the use names, with the card's or word's name and visible text at that time. A later edit of the card or word SHALL NOT change it. The server SHALL deny an effect from a use that is not made in the same request, that names another character, that was made by another user, or of a card or word whose "Kullanınca efekt bırakır" is off. The use is the closed holding of a card that leaves the hand, and the use record of a card or word that stays.

#### Scenario: A later edit
- **WHEN** the DM edits the text of "Lord Vulfric's Valour" after Ayla used it on "Thorin"
- **THEN** the effect on "Thorin" keeps the text from the time of the use

#### Scenario: An effect without its use
- **WHEN** Ayla tries to store an effect from a card that names a holding she did not close in the same request
- **THEN** the server denies it

#### Scenario: Another character
- **WHEN** Ayla uses a card on "Thorin" and stores its effect on "Kuzgun" in the same request
- **THEN** the server denies it

#### Scenario: A card that leaves no effect
- **WHEN** Ayla uses "Aboleth's Eyes", whose "Kullanınca efekt bırakır" is off, on "Thorin" and stores its effect in the same request
- **THEN** the server denies it

#### Scenario: A kept card's effect
- **WHEN** Ayla uses her kept card "Lucky Coin" on "Thorin" with "Aktif efekt olarak ekle" checked
- **THEN** "Thorin" has its effect, marked "Kart", which names the use record, and "Lucky Coin" stays in her hand

### Requirement: Held effects on every character
While a card in a player's hand is switched active and its "Elde etkili" is on, it SHALL show as an effect on every active character of that player, with its name and visible text, marked "Elden". An active True Word of that player whose "Elde etkili" is on SHALL show the same way, marked "True Word". They SHALL NOT be stored as effects and SHALL NOT be removable there. They SHALL end when the card leaves the hand or is switched inactive, when the word is switched inactive or taken back, or when the DM turns off "Elde etkili".

#### Scenario: A held card on two characters
- **WHEN** the DM switches "Devil's Pride" in Ayla's hand active, and Ayla has "Thorin" and "Kuzgun"
- **THEN** both show "Devil's Pride" marked "Elden", with no "Kaldır"

#### Scenario: The card leaves the hand
- **WHEN** Ayla uses "Devil's Pride"
- **THEN** it no longer shows on "Thorin" or "Kuzgun"

#### Scenario: An active True Word
- **WHEN** the DM switches Ayla's "Justice" active
- **THEN** "Thorin" and "Kuzgun" show "Justice" marked "True Word"

#### Scenario: The flag is turned off
- **WHEN** "Devil's Pride" is active in Ayla's hand, and the DM turns off its "Elde etkili"
- **THEN** it no longer shows on "Thorin" or "Kuzgun"
