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

import { type Definition, definitionConverter } from './schema'

/** Keep in step with `scripts/lib/importCards.ts` and `firestore.rules`. */
export const CARDS_COLLECTION = 'cards'

/**
 * All definitions, cards and True Words, drafts and retired ones included, validated and with the document ID as `id`
 * (design D1 of unify-cards-and-true-words). Only the DM may read the whole collection: a player reads it through
 * `playerVisibleCardsQuery`. The application writes the `holder` of a card with one copy through the card-holdings
 * transactions, and the DM's definition steps through `src/features/definitions/api.ts`.
 */
export function cardsRef(db: Firestore): CollectionReference<Definition> {
  return collection(db, CARDS_COLLECTION).withConverter(definitionConverter)
}

/**
 * The definitions a player may read: the active and retired ones. The rules are not filters, so a player's device asks
 * for exactly these; a draft never reaches it.
 */
export function playerVisibleCardsQuery(db: Firestore): Query<Definition> {
  return query(cardsRef(db), where('status', 'in', [...PLAYER_VISIBLE_STATUSES]))
}

/** One definition, validated and with the document ID as `id`. */
export function cardRef(db: Firestore, cardId: string): DocumentReference<Definition> {
  return doc(cardsRef(db), cardId)
}
