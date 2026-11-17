import { Timestamp } from 'firebase/firestore'

import type { DiceResetChange, PlayerDrawChange } from '@/features/table/schema'

/** The DM Dana's change of the player draw mode from Kapalı to Filtreli çekiş, at `millis`. */
export function testTableChange(
  millis: number,
  overrides: Partial<PlayerDrawChange> = {},
): PlayerDrawChange {
  return {
    id: `tc-${millis}`,
    by: 'dana',
    at: Timestamp.fromMillis(millis),
    setting: 'playerDraw',
    before: 'off',
    after: 'filtered',
    ...overrides,
  }
}

/** The DM Dana's reset of a dice channel of `rolls` rolls, at `millis`. */
export function testDiceReset(millis: number, rolls = 142): DiceResetChange {
  return {
    id: `dr-${millis}`,
    by: 'dana',
    at: Timestamp.fromMillis(millis),
    setting: 'diceReset',
    rolls,
  }
}
