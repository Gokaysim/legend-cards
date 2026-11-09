import { Timestamp } from 'firebase/firestore'

import type { Card } from '@/features/cards/schema'
import type { PackOpening } from '@/features/draws/schema'

import { testBlessedCard, testCard, testCursedCard } from './cardFixtures'

/** `count` normal cards named `<prefix> 1..count`, with `overrides`. */
export function testCardsOf(
  prefix: string,
  count: number,
  overrides: Parameters<typeof testCard>[1] = {},
): Card[] {
  return Array.from({ length: count }, (_, index) => testCard(`${prefix} ${index + 1}`, overrides))
}

/**
 * A pool that can open every pack type: Kesqer (Commons and Rares), 9 Pandemonium Rares, Blood & Battle with 29
 * cards, 49 Rares in all, a Blessed card, a Cursed card, and a single Ulagal card that opens nothing.
 */
export const SHOP_CARDS: Card[] = [
  ...testCardsOf('Kesqer', 8),
  ...testCardsOf('Kesqer Rare', 3, { rarity: 'rare' }),
  ...testCardsOf('Pandemonium', 9, { setCode: 'Pandemonium', rarity: 'rare' }),
  ...testCardsOf('Havenholm Rare', 37, {
    setCode: 'Havenholm',
    rarity: 'rare',
    mechanicPack: 'Blood & Battle',
  }),
  testBlessedCard('Second Wind', { mechanicPack: 'Blood & Battle' }),
  testCursedCard('Visions of Death'),
  testCard('Ulagal Card', { setCode: 'Ulagal' }),
]

/** An open Standard Pack of `uid`'s, paid with 2 LP, with five shown cards and none turned, unless overridden. */
export function testPack(uid: string, overrides: Partial<PackOpening> = {}): PackOpening {
  return {
    id: 'pack-1',
    kind: 'pack',
    uid,
    by: uid,
    at: Timestamp.fromMillis(5000),
    packType: 'standard',
    setCode: 'Kesqer',
    mechanicPack: null,
    offered: ['legend-a', 'legend-b', 'legend-c', 'legend-d', 'legend-e'],
    revealed: [],
    paidWith: 'lp',
    cost: 2,
    entryId: 'entry-1',
    status: 'open',
    closedAt: null,
    closedBy: null,
    chosen: null,
    cursed: null,
    refundEntryId: null,
    ...overrides,
  }
}
