# Spec Delta

## MODIFIED Requirements

### Requirement: Pack prices
Each pack type SHALL have this price in LP and in GP:

| Pack | LP | GP |
| --- | --- | --- |
| Standard | 2 | 5.000 |
| Premium | 3 | 7.500 |
| Cursed | 1 | 2.500 |
| Pandemonium | 4 | 10.000 |
| Pandemonium Cursed | 3 | 7.500 |
| Mechanic | 4 | 10.000 |
| Golden | 4 | 10.000 |
| Cursed Golden | 3 | 7.500 |

#### Scenario: A price label
- **WHEN** a user looks at a Standard Pack
- **THEN** it shows "2 LP / 5.000 GP"

#### Scenario: The Pandemonium Pack's price
- **WHEN** Ayla, with 5 LP, opens a Pandemonium Pack with her LP
- **THEN** she pays 4 LP and has 1 LP left, and a write that takes only 3 LP is denied
