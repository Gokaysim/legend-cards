import { Timestamp } from 'firebase/firestore'

import type { Card } from '@/features/cards/schema'
import type { Draw } from '@/features/draws/schema'

/**
 * A draw of `card` into `uid`'s hand at `atMillis`, by `uid` itself: a paid random draw of a normal or Blessed
 * card, a free Cursed draw of a Cursed card. The ID is `draw-<uid>-<atMillis>`, its holding `holding-<…>` and its
 * entry `entry-<…>`, unless overridden.
 */
export function testDraw(
  card: Pick<Card, 'id' | 'name' | 'kind'>,
  uid: string,
  atMillis: number,
  overrides: Partial<Draw> = {},
): Draw {
  const suffix = `${uid}-${atMillis}`
  const isCursed = card.kind === 'cursed'
  return {
    id: `draw-${suffix}`,
    kind: isCursed ? 'cursed' : 'random',
    uid,
    by: uid,
    at: Timestamp.fromMillis(atMillis),
    cardId: card.id,
    cardName: card.name,
    cardKind: card.kind,
    holdingId: `holding-${suffix}`,
    filters: null,
    paidWith: isCursed ? 'none' : 'lp',
    cost: isCursed ? 0 : 1,
    entryId: isCursed ? null : `entry-${suffix}`,
    ...overrides,
  }
}

/** The DM `dm-1`'s free draw of `card` into `uid`'s hand, otherwise like `testDraw`. */
export function testDmDraw(
  card: Pick<Card, 'id' | 'name' | 'kind'>,
  uid: string,
  atMillis: number,
  overrides: Partial<Draw> = {},
): Draw {
  return testDraw(card, uid, atMillis, {
    by: 'dm-1',
    paidWith: 'none',
    cost: 0,
    entryId: null,
    ...overrides,
  })
}
