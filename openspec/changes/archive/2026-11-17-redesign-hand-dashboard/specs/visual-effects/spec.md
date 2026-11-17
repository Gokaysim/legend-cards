# Spec Delta

## MODIFIED Requirements

### Requirement: True Word glows
A True Word tile of an active word SHALL glow purple, and SHALL keep its "● Aktif" mark. A True Word tile that opens something when selected SHALL lift slightly under the pointer or the focus. An active True Word SHALL glow purple where a character's effects are listed, in its "Aktif efektler" and in the popover of its tab. An active word that peeks out above the hand SHALL glow purple too.

#### Scenario: An active word
- **WHEN** the DM switches Ayla's "Abyss" active
- **THEN** its tile on her True Words tab glows purple with the "● Aktif" mark, "Abyss" glows purple in the "Aktif efektler" of her characters and in the popovers of their tabs, and its picture above her hand glows purple

### Requirement: The hand's stat colors
Above the hand, the numbers of the "Legend Point" and "Kartlar" stats SHALL be gold. In the third stat, the Cursed count SHALL be red with a red glow, and the True Words count purple with a purple glow, on a surface that runs from dark red to dark purple. Every label and number SHALL keep at least 4.5:1 contrast against its surface.

#### Scenario: Reading the stats
- **WHEN** a user opens Ayla's hand
- **THEN** the Legend Point and card numbers are gold, ☠ and the Cursed count are red, and ✦ and the True Words count are purple

## ADDED Requirements

### Requirement: Effect colors
Each effect in a character's "Aktif efektler" and in the popover of its tab SHALL glow in its kind's color: a Cursed card's effect red, a Blessed card's effect white, a True Word's effect purple, any other card's effect green, and an own ("Özel") or DM effect blue. The mark beside each effect SHALL stay, so the kind does not rest on color alone. Every name, mark and text SHALL keep at least 4.5:1 contrast against its surface.

#### Scenario: Five kinds on one character
- **WHEN** "Thorin" has the held Cursed card "Spellbound", a stored effect of the Blessed card "Second Wind", the active word "Dragon", the held card "Crowe's Magical Mayhem" and the DM effect "Kutsal kalkan"
- **THEN** in its "Aktif efektler" and in the popover of its tab, "Spellbound" glows red, "Second Wind" white, "Dragon" purple, "Crowe's Magical Mayhem" green and "Kutsal kalkan" blue

#### Scenario: An own effect
- **WHEN** Ayla adds the effect "Gizlenme" to "Mira"
- **THEN** "Gizlenme" glows blue with the mark "Özel"

#### Scenario: An effect from before the Blessed mark
- **WHEN** "Thorin" has an effect stored from a Blessed card before the Blessed mark existed
- **THEN** it glows green with the mark "Kart"
