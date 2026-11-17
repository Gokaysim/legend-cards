import {
  collection,
  type CollectionReference,
  doc,
  type DocumentReference,
  type Firestore,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'

import type { AuthUser } from '@/features/auth/authContext'

import {
  DISPLAY_NAME_MAX,
  PHOTO_URL_MAX,
  type Role,
  type RoleChange,
  roleChangeConverter,
  type UserProfile,
  userProfileConverter,
} from './schema'

/** Keep in step with `firestore.rules`. */
export const USERS_COLLECTION = 'users'
export const ROLE_CHANGES_COLLECTION = 'roleChanges'

/** All profiles, validated and with the uid as `id`. */
export function profilesRef(db: Firestore): CollectionReference<UserProfile> {
  return collection(db, USERS_COLLECTION).withConverter(userProfileConverter)
}

/** One user's profile, validated and with the uid as `id`. */
export function profileRef(db: Firestore, uid: string): DocumentReference<UserProfile> {
  return doc(profilesRef(db), uid)
}

export type EnsureProfileResult = 'created' | 'updated' | 'unchanged'

/**
 * The profile fields taken from the Google account, cut to what `firestore.rules` accepts:
 * a blank name becomes null, a long name is shortened, and an over-long picture URL is dropped.
 */
export function profileFieldsFrom(user: Pick<AuthUser, 'displayName' | 'photoURL'>) {
  const name = user.displayName?.trim() ?? ''
  return {
    // Cut by code points, so an emoji at the limit is never split in half.
    displayName: name ? Array.from(name).slice(0, DISPLAY_NAME_MAX).join('') : null,
    photoURL: user.photoURL && user.photoURL.length <= PHOTO_URL_MAX ? user.photoURL : null,
  }
}

/**
 * Makes sure the signed-in user has a profile, in one transaction:
 * - no profile yet: creates it as a player, with the server time as creation time
 * - name or picture differ from the Google account: updates only those two fields
 * - otherwise: writes nothing
 *
 * The role and the creation time are never touched. Two tabs running this at once are safe: the transaction
 * of the second re-reads the profile and takes the update path.
 */
export async function ensureProfile(db: Firestore, user: AuthUser): Promise<EnsureProfileResult> {
  const ref = doc(db, USERS_COLLECTION, user.uid)
  const fields = profileFieldsFrom(user)

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists()) {
      transaction.set(ref, { ...fields, role: 'player', createdAt: serverTimestamp() })
      return 'created'
    }
    const current = snapshot.data()
    if (current.displayName === fields.displayName && current.photoURL === fields.photoURL) {
      return 'unchanged'
    }
    transaction.update(ref, fields)
    return 'updated'
  })
}

/** Every role change record, validated. Every signed-in user reads them all. */
export function roleChangesRef(db: Firestore): CollectionReference<RoleChange> {
  return collection(db, ROLE_CHANGES_COLLECTION).withConverter(roleChangeConverter)
}

export type ChangeRoleInput = {
  /** Whose role changes. */
  target: string
  /** The role after the change. */
  after: Role
  /** The DM who makes the change. */
  by: string
  /** For a DM stepping down (`target` is `by`): another user who is a DM now. */
  otherDm?: string
}

/**
 * Changes a role as a DM (spec: dm-roles): the profile's role and a new `roleChanges` record from the stored role to
 * `after`, in one transaction, so the record's "before" is what the server had. A role it already has writes nothing.
 * The rules deny it to a player, and a step down without another DM. It needs a connection, as every transaction does.
 */
export async function changeRole(db: Firestore, input: ChangeRoleInput): Promise<void> {
  // Untyped: the record converter adds the ID on reads, and a write passes the fields as they are.
  const changeDoc = doc(collection(db, ROLE_CHANGES_COLLECTION))
  const target = doc(db, USERS_COLLECTION, input.target)
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(target)
    const before: unknown = snapshot.get('role')
    if (!snapshot.exists() || before === input.after) return
    const isStepDown = input.target === input.by
    transaction.set(changeDoc, {
      by: input.by,
      at: serverTimestamp(),
      target: input.target,
      before,
      after: input.after,
      ...(isStepDown && input.otherDm ? { otherDm: input.otherDm } : {}),
    })
    transaction.update(target, { role: input.after, roleChangeId: changeDoc.id })
  })
}
