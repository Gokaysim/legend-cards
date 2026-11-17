# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
