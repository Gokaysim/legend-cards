import {
  collection,
  type CollectionReference,
  doc,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore'

import { type Card, cardConverter } from './schema'

/** Keep in step with `scripts/lib/importCards.ts` and `firestore.rules`. */
export const CARDS_COLLECTION = 'cards'

/**
 * All card definitions, retired ones included, validated and with the document ID as `id`. The application
 * writes only a normal card's `holder`, and only through the card-holdings transactions.
 */
export function cardsRef(db: Firestore): CollectionReference<Card> {
  return collection(db, CARDS_COLLECTION).withConverter(cardConverter)
}

/** One card definition, validated and with the document ID as `id`. */
export function cardRef(db: Firestore, cardId: string): DocumentReference<Card> {
  return doc(cardsRef(db), cardId)
}
