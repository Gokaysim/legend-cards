import {
  collection,
  type CollectionReference,
  deleteDoc,
  doc,
  documentId,
  type DocumentReference,
  type Firestore,
  query,
  type Query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'

import { existsOnServer } from '@/lib/firebase/firestoreLite'
import { firebaseCode } from '@/lib/firestore/errors'

import type { ServerRead } from './accessDiagnosis'
import { type AccessEntry, accessEntryConverter } from './schema'

/** Keep in step with `firestore.rules`, `storage.rules`, src/test/members.ts and scripts/lib/allowEmail.ts. */
export const ALLOWED_EMAILS_COLLECTION = 'allowedEmails'

/** The whole access list, validated, with each address as `email`. Only the DM reads it. */
export function accessEntriesRef(db: Firestore): CollectionReference<AccessEntry> {
  return collection(db, ALLOWED_EMAILS_COLLECTION).withConverter(accessEntryConverter)
}

/**
 * The access list without one normalized address, the DM's own (design D3 of drop-persistent-cache-and-dm-own-entry-query).
 * The DM's own entry is followed by the access check alone: in a query it could go into limbo, and the SDK writes a
 * rejected limbo resolution into the cache as a deleted document, which would throw the DM out of the app.
 */
export function accessEntriesExceptRef(db: Firestore, email: string): Query<AccessEntry> {
  return query(accessEntriesRef(db), where(documentId(), '!=', email))
}

/** The entry of one normalized address. Any account with a verified address reads its own, missing or not. */
export function accessEntryRef(db: Firestore, email: string): DocumentReference<AccessEntry> {
  return doc(accessEntriesRef(db), email)
}

/**
 * Puts a normalized, valid address on the list, as the DM, with the server time (spec: table-access). The rules deny
 * an address that is already on the list, so a second add never touches the first entry.
 */
export async function addEmail(db: Firestore, email: string): Promise<void> {
  await setDoc(doc(db, ALLOWED_EMAILS_COLLECTION, email), { addedAt: serverTimestamp() })
}

/** Removes an address from the list, as the DM. The rules deny the DM's own address. */
export async function removeEmail(db: Firestore, email: string): Promise<void> {
  await deleteDoc(doc(db, ALLOWED_EMAILS_COLLECTION, email))
}

export type LinkOwnEntryResult = 'linked' | 'unchanged' | 'missing'

/**
 * Links the signed-in member's own entry to their uid, in one transaction (design D5 of invite-only-sign-in):
 * - no entry (the address was removed meanwhile): writes nothing
 * - an entry that is already linked: writes nothing
 * - an unlinked entry: sets its `uid`, and nothing else
 *
 * Two tabs running this at once are safe: the transaction of the second re-reads the entry and finds it linked.
 */
export async function linkOwnEntry(
  db: Firestore,
  user: { uid: string; email: string },
): Promise<LinkOwnEntryResult> {
  const ref = doc(db, ALLOWED_EMAILS_COLLECTION, user.email)
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists()) return 'missing'
    if (typeof snapshot.get('uid') === 'string') return 'unchanged'
    transaction.update(ref, { uid: user.uid })
    return 'linked'
  })
}

/**
 * Reads the own entry once, straight from the server (design D2 of diagnose-no-access). It goes through Firestore Lite,
 * which has no cache and no listeners (design D4 of drop-persistent-cache-and-dm-own-entry-query): `getDocFromServer`
 * would join the listener already open on the entry and read its view. It only reports what it found and never throws.
 */
export async function readEntryFromServer(email: string): Promise<ServerRead> {
  try {
    return (await existsOnServer(ALLOWED_EMAILS_COLLECTION, email)) ? 'exists' : 'missing'
  } catch (error) {
    return `error:${firebaseCode(error) ?? 'unknown'}`
  }
}
