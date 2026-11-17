# character-effects Specification

## Purpose

Keeps what is in effect on each character: effects left by used cards and True Words, effects that players and the DM write by hand, and the effects of a player's active held cards and True Words. The table sees them on the character and removes each one by hand when it ends.

## Requirements

### Requirement: Effect records
An effect SHALL belong to one character and SHALL have a source, a name and a text. The sources SHALL be a used card, a used True Word, a player's own effect, and the DM's effect. An effect SHALL record who added it and when, and for a used card or True Word, which use it came from. An effect from a used card SHALL record whether the card is Cursed and whether it is Blessed; the server SHALL deny a Blessed mark on any other effect. An effect recorded before the Blessed mark existed SHALL read as not Blessed. Effects SHALL show on every device without a reload. An effect SHALL never change after it is added.

#### Scenario: An effect from a card
- **WHEN** Ayla uses "Lord Vulfric's Valour" on "Thorin" and keeps "Aktif efekt olarak ekle" checked
- **THEN** "Thorin" has an effect from a card, named "Lord Vulfric's Valour", with the card's visible text, added by Ayla, that names her use

#### Scenario: An effect from a Blessed card
- **WHEN** Ayla uses the Blessed card "Second Wind" on "Thorin" and keeps "Aktif efekt olarak ekle" checked
- **THEN** "Thorin" has an effect from a card named "Second Wind", marked Blessed and not Cursed

#### Scenario: A false Blessed mark
- **WHEN** Ayla uses the normal card "Lord Vulfric's Valour" on "Thorin" and the request marks its effect Blessed
- **THEN** the server denies the whole step

#### Scenario: A Blessed mark on an effect by hand
- **WHEN** the DM adds a DM effect to "Thorin" marked Blessed
- **THEN** the server denies it

#### Scenario: An effect from before the Blessed mark
- **WHEN** "Thorin" has an effect stored from a Blessed card before the Blessed mark existed
- **THEN** the effect reads as a card's effect that is not Blessed

#### Scenario: Live on every device
- **WHEN** the DM adds an effect to "Thorin" while Bora has the tab of Ayla's "Thorin" open
- **THEN** the effect shows on Bora's screen without a reload

#### Scenario: Changing an effect
- **WHEN** any signed-in user, the DM included, tries to change an effect's name or text
- **THEN** the server denies it

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

### Requirement: Own effects and DM effects
A player SHALL be able to add an effect to their own active characters, and the DM to any active character. Such an effect SHALL have a name of 1 to 60 characters and a text of 1 to 500 characters. A player's effect SHALL be marked "Özel" and the DM's "DM". The server SHALL deny a player's effect on another user's character, and an effect on an archived character.

#### Scenario: A player's own effect
- **WHEN** Ayla adds "Kutsal su" with the text "+1 to saves until dawn." to "Thorin"
- **THEN** "Thorin" shows "Kutsal su" marked "Özel"

#### Scenario: A DM effect
- **WHEN** the DM adds "Kutsanmış kalkan" to Bora's "Elara"
- **THEN** "Elara" shows "Kutsanmış kalkan" marked "DM"

#### Scenario: Another player's character
- **WHEN** Bora tries to add an effect to Ayla's "Thorin"
- **THEN** the server denies it

#### Scenario: An empty text
- **WHEN** Ayla tries to save an effect with a name and an empty text
- **THEN** the form says in Turkish that the text is needed, and nothing is saved

### Requirement: Removing an effect
Removing an effect SHALL delete it. A card or True Word effect SHALL be removable by the character's owner, by the user who made the use, and by the DM. A player's own effect SHALL be removable by the character's owner and the DM. A DM effect SHALL be removable only by the DM. The server SHALL deny every other delete. "Kaldır" SHALL show only to those who may remove the effect.

#### Scenario: The owner removes a card effect
- **WHEN** Ayla removes the effect of "Lord Vulfric's Valour" from "Thorin"
- **THEN** the effect is gone on every device

#### Scenario: The user who used the card
- **WHEN** Bora used a card on Ayla's "Thorin", and removes its effect
- **THEN** the effect is gone

#### Scenario: A DM effect
- **WHEN** Ayla looks at "Kutsanmış kalkan", a DM effect on her "Thorin"
- **THEN** she sees no "Kaldır", and the server denies her delete

#### Scenario: Another player
- **WHEN** Bora tries to remove Ayla's own effect on "Thorin"
- **THEN** the server denies it

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

### Requirement: Active effects in the details
A character's details SHALL list its effects under "Aktif efektler": the held cards first, then the active True Words, then the stored effects, newest first. Each SHALL show its name, its text, and its mark: "Elden", "True Word", "Kart", "Özel" or "DM". A stored effect SHALL also show who added it and when. A Cursed card's effect SHALL be marked as Cursed, and a Blessed card's effect as Blessed, whether held or stored. Without effects, the section SHALL say "Aktif efekt yok."

#### Scenario: The order
- **WHEN** "Thorin" has the held "Devil's Pride", the active word "Abyss", a card effect added at 10:00 and a DM effect added at 11:00
- **THEN** its details list "Devil's Pride", "Abyss", the DM effect, then the card effect

#### Scenario: Who added it
- **WHEN** a user selects "Thorin", whose card effect Ayla added on 14 November at 18:06
- **THEN** the effect shows "Ayla" and "14 Kas 18:06"

#### Scenario: A held Blessed card
- **WHEN** the Blessed card "Second Wind" is active in Ayla's hand, and a user opens "Thorin"
- **THEN** "Second Wind" shows marked "Elden" and Blessed

#### Scenario: No effects
- **WHEN** a user selects a character without effects whose player holds no active card or word
- **THEN** the section says "Aktif efekt yok."

### Requirement: Adding an effect from the details
The details SHALL offer "+ Efekt ekle" to the character's owner and the DM. It SHALL open a form with the name and the text. Saving SHALL add the effect, marked "Özel" for a player and "DM" for the DM. Other players SHALL NOT see "+ Efekt ekle".

#### Scenario: Adding from the details
- **WHEN** Ayla selects "Thorin", chooses "+ Efekt ekle", types a name and a text, and saves
- **THEN** the effect shows under "Aktif efektler" marked "Özel"

#### Scenario: Another player's details
- **WHEN** Bora selects Ayla's "Thorin"
- **THEN** he sees its effects, and no "+ Efekt ekle"

### Requirement: The effect count on a character's tab
A character's tab SHALL show how many effects are on it, held ones and active True Words included, as "✦ <count>". A tab without effects SHALL show no count. The count SHALL change on every device without a reload.

#### Scenario: A count
- **WHEN** "Thorin" has one card effect, and Ayla holds one active card
- **THEN** the tab of "Thorin" shows "✦ 2", and the tab of "Kuzgun" shows "✦ 1"

#### Scenario: No effects
- **WHEN** a character has no effects, and its player holds no active card or word
- **THEN** its tab shows no count

### Requirement: Effects on a character's tab
Resting the mouse or pen pointer on a character's tab, or giving it the keyboard focus, SHALL show a popover headed with the character's name and its effect count, listing the names of its effects in the order of "Aktif efektler", each with its mark, without their texts. Without effects, it SHALL say "Aktif efekt yok." It SHALL go away when the pointer or the focus leaves the tab, or with Escape. A tap SHALL open the character and show no popover. The popover SHALL NOT widen the page.

#### Scenario: Pointing at a character
- **WHEN** a user rests the mouse pointer on the tab of Ayla's "Thorin", which has the held "Devil's Pride" and a DM effect "Kutsal kalkan"
- **THEN** a popover headed "Thorin" with 2 effects lists "Devil's Pride" marked "Elden" and "Kutsal kalkan" marked "DM", without their texts, and it goes away when the pointer leaves the tab

#### Scenario: Focusing a character from the keyboard
- **WHEN** a user moves the keyboard focus to the tab of "Thorin"
- **THEN** the popover of "Thorin" shows, and Escape closes it

#### Scenario: A character without effects
- **WHEN** a user rests the pointer on the tab of "Kuzgun", which has no effects, and Ayla holds no active card or word
- **THEN** the popover says "Aktif efekt yok."

#### Scenario: Tapping on a phone
- **WHEN** a user taps the tab of "Thorin" on a phone 360 CSS pixels wide
- **THEN** the view of "Thorin" opens with its "Aktif efektler", and no popover shows

#### Scenario: Live
- **WHEN** the popover of "Thorin" is open on Bora's screen, and the DM adds an effect to "Thorin"
- **THEN** the effect shows in the popover without a reload

### Requirement: Effects readable by every signed-in user
Every signed-in user SHALL be able to read every effect. Signed-out requests SHALL be denied.

#### Scenario: Another player's effects
- **WHEN** Bora selects Ayla's "Thorin"
- **THEN** he sees its effects

#### Scenario: Signed out
- **WHEN** a request without a signed-in user tries to read an effect
- **THEN** the server denies it

### Requirement: Effects by hand are not table actions
Adding and removing an effect by hand SHALL NOT be listed in the İşlem Logu, and SHALL stay possible while a pack is open. An effect added without a connection SHALL show on that device at once and SHALL be saved when the connection returns.

#### Scenario: While a pack is open
- **WHEN** a pack is open, and the DM adds an effect to "Thorin"
- **THEN** the effect is stored

#### Scenario: Offline
- **WHEN** Ayla adds an effect while offline
- **THEN** it shows on her device at once, and on the others when her connection returns

### Requirement: Effects of archived characters
An archived character's effects SHALL stay stored, and SHALL NOT be shown or counted while it is archived. They SHALL show again when the character is brought back.

#### Scenario: Archiving
- **WHEN** Ayla archives "Kuzgun", which has one effect
- **THEN** the effect no longer counts in her hand summary

#### Scenario: Bringing back
- **WHEN** Ayla brings back "Kuzgun"
- **THEN** its effect shows again
