import {
  collection,
  type CollectionReference,
  deleteDoc,
  doc,
  type DocumentReference,
  type Firestore,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

import { type AccessEntry, accessEntryConverter } from './schema'

/** Keep in step with `firestore.rules`, `storage.rules`, src/test/members.ts and scripts/lib/allowEmail.ts. */
export const ALLOWED_EMAILS_COLLECTION = 'allowedEmails'

/** The whole access list, validated, with each address as `email`. Only the DM reads it. */
export function accessEntriesRef(db: Firestore): CollectionReference<AccessEntry> {
  return collection(db, ALLOWED_EMAILS_COLLECTION).withConverter(accessEntryConverter)
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
