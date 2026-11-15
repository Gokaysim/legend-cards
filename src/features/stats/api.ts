import { collection, type Firestore, query, type Query, where } from 'firebase/firestore'

import { DRAWS_COLLECTION, drawsRef } from '@/features/draws/api'
import { type Draw, type PackOpening, packOpeningConverter } from '@/features/draws/schema'
import { holdingsRef } from '@/features/hands/api'
import type { Holding } from '@/features/hands/schema'

// The queries of the statistics pages (design D2 and D3 of add-card-and-set-stats). Every signed-in user reads every
// holding and every draw record, so they need no rule of their own. Each has at most one equality or array filter
// and no order, so Firestore's automatic single-field indexes serve them, and `firestore.indexes.json` has none.

/** The pack openings of the draws collection, validated as such. Only for queries that keep pack openings alone. */
function packOpeningsRef(db: Firestore) {
  return collection(db, DRAWS_COLLECTION).withConverter(packOpeningConverter)
}

/** The three queries of a card's Kart geçmişi page. */
export type CardQueries = {
  /** Every holding of the card, open and closed. */
  holdings: Query<Holding>
  /** The card's draws. Pack openings have no `cardId`, so none matches. */
  draws: Query<Draw>
  /** Every pack opening that showed the card, face up or not. */
  packs: Query<PackOpening>
}

export function cardQueries(db: Firestore, cardId: string): CardQueries {
  return {
    holdings: query(holdingsRef(db), where('cardId', '==', cardId)),
    draws: query(drawsRef(db), where('cardId', '==', cardId)),
    packs: query(packOpeningsRef(db), where('offered', 'array-contains', cardId)),
  }
}

/**
 * The two queries of a Set istatistikleri page. Holdings do not record a set, so the page reads every holding and
 * keeps those of its cards (design D3).
 */
export type AllQueries = {
  holdings: Query<Holding>
  packs: Query<PackOpening>
}

export function allQueries(db: Firestore): AllQueries {
  return {
    holdings: query(holdingsRef(db)),
    packs: query(packOpeningsRef(db), where('kind', '==', 'pack')),
  }
}
