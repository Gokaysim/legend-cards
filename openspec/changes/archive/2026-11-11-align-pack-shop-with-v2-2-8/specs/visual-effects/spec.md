# Spec Delta

## MODIFIED Requirements

### Requirement: Premium and Cursed pack tiles
In the Pack Shop, a set's Premium Pack tile SHALL show its picture in a gold ridged frame with a "✦" corner. A slow shimmer SHALL run over it. The Cursed, Cursed Golden and Pandemonium Cursed Pack tiles SHALL show theirs in a red ridged frame with a "☠" corner. Other tiles SHALL have no such frame. The tiles SHALL keep their prices, and their names where card-images lists them.

#### Scenario: A set's packs
- **WHEN** a user opens the Kesqerian Nights group
- **THEN** the Premium Pack has the gold frame with "✦" and a shimmer, the Cursed Pack has the red frame with "☠", and the Standard Pack has neither

#### Scenario: The Golden Packs
- **WHEN** a user opens the Golden Packs group
- **THEN** the Cursed Golden Pack has the red frame with "☠", and the Golden Pack shows its own picture without a frame
