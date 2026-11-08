import { Timestamp } from 'firebase/firestore'

import type { Card } from '@/features/cards/schema'
import type { Holding } from '@/features/hands/schema'

/**
 * An open holding of `card` for `uid`, given by the DM `dm-1`, received at `givenAtMillis`. The ID is
 * `<uid>:<card ID>` unless overridden.
 */
export function testHolding(
  card: Pick<Card, 'id' | 'name' | 'kind'>,
  uid: string,
  givenAtMillis: number,
  overrides: Partial<Holding> = {},
): Holding {
  return {
    id: `${uid}:${card.id}`,
    cardId: card.id,
    cardName: card.name,
    cardKind: card.kind,
    uid,
    givenAt: Timestamp.fromMillis(givenAtMillis),
    givenBy: 'dm-1',
    givenVia: 'dm',
    transferredFrom: null,
    active: false,
    note: '',
    costOverride: null,
    returnedAt: null,
    returnedBy: null,
    returnReason: null,
    usedOn: null,
    transferredTo: null,
    ...overrides,
  }
}
