# Spec Delta

## MODIFIED Requirements

### Requirement: Opening animation
Before its cards appear, an opening pack SHALL show a short animation of about three seconds in which the pack swells in three pulses and bursts. The pack SHALL be a set's cardback for the packs of one set, and the pack's own picture for the others; without that picture, it SHALL be drawn without one. Each pulse SHALL be brighter than the last, a halo of light SHALL grow around it, and the screen SHALL flash warm white as it bursts. With reduced motion, the cards SHALL appear without it.

#### Scenario: A set's pack
- **WHEN** a Kesqerian Nights Premium Pack opens for Ayla
- **THEN** the Kesqerian Nights cardback swells in three brightening pulses inside a growing halo, bursts in a warm white flash, and the face-down cards appear

#### Scenario: A Mechanic Pack
- **WHEN** a Blood & Battle Mechanic Pack opens
- **THEN** the Blood & Battle pack picture swells and bursts

#### Scenario: No picture
- **WHEN** a pack opens whose cardback or pack picture is missing
- **THEN** the pack is drawn without a picture, and swells and bursts the same way

#### Scenario: Reduced motion
- **WHEN** a user whose device asks for reduced motion sees a pack open
- **THEN** the cards appear at once
