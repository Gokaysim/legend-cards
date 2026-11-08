import {
  collection,
  type CollectionReference,
  type Firestore,
  query,
  type Query,
  where,
} from 'firebase/firestore'

import { type Card, cardConverter } from './schema'

/** Keep in step with `scripts/lib/importCards.ts` and `firestore.rules`. */
export const CARDS_COLLECTION = 'cards'

/** All card definitions, validated and with the document ID as `id`. Read-only for the application. */
export function cardsRef(db: Firestore): CollectionReference<Card> {
  return collection(db, CARDS_COLLECTION).withConverter(cardConverter)
}

/**
 * The cards that are not retired, of every kind. One filter only, so no composite index is needed;
 * callers split the result by kind (see `useDeckCards`).
 */
export function activeCardsQuery(db: Firestore): Query<Card> {
  return query(cardsRef(db), where('retired', '==', false))
}
