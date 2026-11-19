import {
  deleteDoc,
  doc,
  type DocumentReference,
  type Firestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

import { type Lore, loreConverter, LORE_LIMIT } from './schema'

/** The collection. Keep in step with `firestore.rules`. */
export const CARD_LORE_COLLECTION = 'cardLore'

/** The lore of the card `cardId`. A player may read it only for an active or retired card (spec: card-lore). */
export function loreRef(db: Firestore, cardId: string): DocumentReference<Lore> {
  return doc(db, CARD_LORE_COLLECTION, cardId).withConverter(loreConverter)
}

/**
 * The text as stored: without spaces and line breaks around it, and cut to the limit by code points, so an emoji at
 * the limit is never split in half. Empty means no lore.
 */
export function loreText(text: string): string {
  return Array.from(text.trim()).slice(0, LORE_LIMIT).join('').trim()
}

/**
 * Saves the DM's lore for a card, or deletes it when the text is blank (spec: card-lore, "The DM edits lore in place").
 * It is not a transaction and writes no change record: lore is not part of the definition.
 */
export function saveLore(
  db: Firestore,
  { cardId, text, by }: { cardId: string; text: string; by: string },
): Promise<void> {
  const stored = loreText(text)
  if (stored === '') return deleteLore(db, cardId)
  return setDoc(doc(db, CARD_LORE_COLLECTION, cardId), {
    text: stored,
    updatedBy: by,
    updatedAt: serverTimestamp(),
  })
}

/** Deletes a card's lore. Deleting lore that does not exist succeeds. */
export function deleteLore(db: Firestore, cardId: string): Promise<void> {
  return deleteDoc(doc(db, CARD_LORE_COLLECTION, cardId))
}
