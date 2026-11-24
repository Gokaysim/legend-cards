import { Timestamp } from 'firebase/firestore'

import type { RollRequest } from '@/features/dice/diceContext'
import {
  isSingleD20,
  partsPhysicalCount,
  partsText,
  physicalDice,
  recordParts,
  type RolledDie,
} from '@/features/dice/formula'
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
    modifierSum: null,
    parts: [],
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
    content: content === null ? null : withParts({ ...base, ...content }, content?.parts),
    ...rest,
  }
}

/** The DM's hidden roll as a player's device reads it: who and when, no content. */
export function testHiddenRoll(overrides: Partial<DiceRoll> = {}): DiceRoll {
  return testRoll({ by: 'dm-1', hidden: true, content: null, ...overrides })
}

/** The content with its parts: as given, or one part of every die with the content's fixed number. */
function withParts(content: RollContent, parts: RollContent['parts'] | undefined): RollContent {
  return {
    ...content,
    parts: parts ?? [
      {
        start: 0,
        count: content.dice.length,
        modifier: content.modifier,
        modifierSum: content.modifierSum,
      },
    ],
  }
}

let rolledCount = 0

/** A roll as the real provider resolves it, without physics: each die on its lowest face. */
export function fakeRoll(request: RollRequest, by: string): DiceRoll {
  const isWhole = request.parts.length === 1
  const first = request.parts[0]
  const mode = isWhole && first && isSingleD20(first.counts) ? request.mode : 'normal'
  const dice = request.parts
    .flatMap((part) => physicalDice(part.counts, mode))
    .map((t) => ({ t, v: t === 'd100' ? 0 : 1 }))
  const modifier = isWhole && first ? first.modifier : 0
  const modifierSum = isWhole && first ? first.modifierSum : null
  if (partsPhysicalCount(request.parts) === 0) throw new Error('A roll needs at least one die')
  return {
    id: `rolled-${(rolledCount += 1)}`,
    by,
    at: null,
    hidden: request.hidden,
    content: {
      style: 'galaxy',
      mode,
      modifier,
      modifierSum,
      parts: recordParts(dice, modifier, modifierSum, isWhole ? null : partsText(request.parts)),
      note: request.note.trim(),
      dice,
      motion: null,
    },
  }
}
