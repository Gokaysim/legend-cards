import {
  collection,
  type CollectionReference,
  deleteDoc,
  doc,
  type DocumentReference,
  type Firestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

import { type Presence, presenceConverter } from './schema'

/** The collection. Keep in step with `firestore.rules`. */
export const PRESENCE_COLLECTION = 'presence'

/** Every user's presence, validated and with the uid as `uid`. Every member reads it whole. */
export function presenceCollectionRef(db: Firestore): CollectionReference<Presence> {
  return collection(db, PRESENCE_COLLECTION).withConverter(presenceConverter)
}

/** One user's presence. */
export function presenceRef(db: Firestore, uid: string): DocumentReference<Presence> {
  return doc(presenceCollectionRef(db), uid)
}

/** Reports that `uid` is there now: the record holds only the server time (spec: player-presence). */
export function beat(db: Firestore, uid: string): Promise<void> {
  return setDoc(doc(db, PRESENCE_COLLECTION, uid), { lastSeen: serverTimestamp() })
}

/** Removes the presence of `uid`, so they count as offline at once. Removing a missing record succeeds. */
export function removePresence(db: Firestore, uid: string): Promise<void> {
  return deleteDoc(doc(db, PRESENCE_COLLECTION, uid))
}
