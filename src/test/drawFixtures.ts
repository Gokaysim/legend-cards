import { Timestamp } from 'firebase/firestore'

import type { Card } from '@/features/cards/schema'
import type { CardDraw, DrawSession } from '@/features/draws/schema'

/**
 * A draw of `card` into `uid`'s hand at `atMillis`, by `uid` itself: a paid random draw of a normal or Blessed
 * card, a free Cursed draw of a Cursed card. The ID is `draw-<uid>-<atMillis>`, its holding `holding-<…>` and its
 * entry `entry-<…>`, unless overridden.
 */
export function testDraw(
  card: Pick<Card, 'id' | 'name' | 'kind'>,
  uid: string,
  atMillis: number,
  overrides: Partial<CardDraw> = {},
): CardDraw {
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
    sessionId: null,
    ...overrides,
  }
}

/** The DM `dm-1`'s free draw of `card` into `uid`'s hand, otherwise like `testDraw`. */
export function testDmDraw(
  card: Pick<Card, 'id' | 'name' | 'kind'>,
  uid: string,
  atMillis: number,
  overrides: Partial<CardDraw> = {},
): CardDraw {
  return testDraw(card, uid, atMillis, {
    by: 'dm-1',
    paidWith: 'none',
    cost: 0,
    entryId: null,
    ...overrides,
  })
}

/**
 * An open draw session `session-<uid>-<startMillis>` with `cards` drawn into `uid`'s hand by `by` (default: `uid`), the
 * last change at `startMillis` (spec: live-draws). A Cursed session when the first card is Cursed. Each draw's ID is
 * `draw-<cardId>`, as `TestDrawsProvider` gives it. Each card costs what it would under "Kapalı": 1 LP in a random
 * session that `uid` draws for themselves, and nothing otherwise.
 */
export function testSession(
  uid: string,
  cards: readonly Pick<Card, 'id' | 'kind'>[],
  startMillis: number,
  overrides: Partial<DrawSession> = {},
): DrawSession {
  const kind = cards[0]?.kind === 'cursed' ? 'cursed' : 'random'
  const cost = kind === 'random' && (overrides.by ?? uid) === uid ? 1 : 0
  return {
    id: `session-${uid}-${startMillis}`,
    kind,
    uid,
    by: uid,
    startedAt: Timestamp.fromMillis(startMillis),
    lastAt: Timestamp.fromMillis(startMillis),
    draws: cards.map((card) => ({
      drawId: `draw-${card.id}`,
      cardId: card.id,
      backSet: null,
      cost,
    })),
    turned: [],
    endedAt: null,
    endedBy: null,
    ...overrides,
  }
}
