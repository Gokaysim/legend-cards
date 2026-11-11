import {
  collection,
  type CollectionReference,
  doc,
  type DocumentReference,
  type Firestore,
  type Query,
  query,
  where,
} from 'firebase/firestore'

import { PLAYER_VISIBLE_STATUSES } from '@/features/definitions/status'

import { type Card, cardConverter } from './schema'

/** Keep in step with `scripts/lib/importCards.ts` and `firestore.rules`. */
export const CARDS_COLLECTION = 'cards'

/**
 * All card definitions, drafts and retired ones included, validated and with the document ID as `id`. Only the DM may
 * read the whole collection: a player reads it through `playerVisibleCardsQuery` (design D3). The application writes a
 * normal card's `holder` through the card-holdings transactions, and the DM's definition steps through
 * `src/features/definitions/api.ts`.
 */
export function cardsRef(db: Firestore): CollectionReference<Card> {
  return collection(db, CARDS_COLLECTION).withConverter(cardConverter)
}

/**
 * The cards a player may read: the active and retired ones. The rules are not filters, so a player's device asks for
 * exactly these; a draft never reaches it.
 */
export function playerVisibleCardsQuery(db: Firestore): Query<Card> {
  return query(cardsRef(db), where('status', 'in', [...PLAYER_VISIBLE_STATUSES]))
}

/** One card definition, validated and with the document ID as `id`. */
export function cardRef(db: Firestore, cardId: string): DocumentReference<Card> {
  return doc(cardsRef(db), cardId)
}
