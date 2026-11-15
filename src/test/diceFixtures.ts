import { Timestamp } from 'firebase/firestore'

import type { RollRequest } from '@/features/dice/diceContext'
import { isSingleD20, physicalDice, type RolledDie } from '@/features/dice/formula'
import type { DiceRoll, RollContent } from '@/features/dice/schema'

let rollCount = 0

/**
 * A roll for tests: by default Bora's 1d20 + 2d6 + 3 showing 17, 4 and 2 (total 26), in Galaxy, made at
 * `Timestamp.fromMillis(1000)`, without motion. `dice` is a list of `[type, value]` pairs.
 */
export function testRoll(
  overrides: Partial<Omit<DiceRoll, 'content'>> & {
    content?: Partial<RollContent> | null
    dice?: [RolledDie['t'], number][]
  } = {},
): DiceRoll {
  const { content, dice, ...rest } = overrides
  rollCount += 1
  const base: RollContent = {
    style: 'galaxy',
    mode: 'normal',
    modifier: 3,
    note: '',
    dice: (
      dice ?? [
        ['d20', 17],
        ['d6', 4],
        ['d6', 2],
      ]
    ).map(([t, v]) => ({ t, v })),
    motion: null,
  }
  return {
    id: `roll-${rollCount}`,
    by: 'bora',
    at: Timestamp.fromMillis(1000),
    hidden: false,
    content: content === null ? null : { ...base, ...content },
    ...rest,
  }
}

/** The DM's hidden roll as a player's device reads it: who and when, no content. */
export function testHiddenRoll(overrides: Partial<DiceRoll> = {}): DiceRoll {
  return testRoll({ by: 'dm-1', hidden: true, content: null, ...overrides })
}

let rolledCount = 0

/** A roll as the real provider resolves it, without physics: each die on its lowest face. */
export function fakeRoll(request: RollRequest, by: string): DiceRoll {
  const mode = isSingleD20(request.counts) ? request.mode : 'normal'
  return {
    id: `rolled-${(rolledCount += 1)}`,
    by,
    at: null,
    hidden: request.hidden,
    content: {
      style: 'galaxy',
      mode,
      modifier: request.modifier,
      note: request.note.trim(),
      dice: physicalDice(request.counts, mode).map((t) => ({ t, v: t === 'd100' ? 0 : 1 })),
      motion: null,
    },
  }
}
