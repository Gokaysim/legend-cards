import type { DieType } from '../formula'
import type { DiceStyle } from '../schema'

/** The fixed throws of the golden test: each case's throws come from `seededUnit(seed)`. */
export const GOLDEN_CASES: readonly { seed: number; dice: DieType[]; style: DiceStyle }[] = [
  { seed: 1, dice: ['d6', 'd6'], style: 'galaxy' },
  { seed: 2, dice: ['d20', 'd20'], style: 'iron' },
  { seed: 3, dice: ['d100', 'd10', 'd4', 'd8'], style: 'walnut' },
  {
    seed: 4,
    dice: ['d20', 'd12', 'd10', 'd8', 'd6', 'd4', 'd100', 'd10', 'd6', 'd6', 'd6', 'd6'],
    style: 'glass',
  },
]
