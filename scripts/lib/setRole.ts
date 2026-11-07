import type { Auth } from 'firebase-admin/auth'
import type { Firestore } from 'firebase-admin/firestore'

/** The roles a profile can have. Keep in step with `src/features/users/schema.ts` and `firestore.rules`. */
export const ROLES = ['player', 'dm'] as const
export type Role = (typeof ROLES)[number]

const isRole = (value: unknown): value is Role => ROLES.includes(value as Role)

export type SetRoleResult =
  | { kind: 'updated'; uid: string; name: string; from: Role; to: Role }
  | { kind: 'unchanged'; uid: string; name: string; role: Role }
  | { kind: 'no-such-user'; email: string }
  | { kind: 'no-profile'; email: string; uid: string }
  | { kind: 'invalid-role'; role: string }

function isUserNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'auth/user-not-found'
  )
}

/**
 * Sets the role of the user with this email address. Changes only the `role` field of an existing profile,
 * in a transaction; never creates a profile (the application does that at the first sign-in).
 * Returns what happened instead of printing, so it can be tested and reused.
 */
export async function setRoleByEmail(
  { auth, db }: { auth: Auth; db: Firestore },
  email: string,
  role: string,
): Promise<SetRoleResult> {
  if (!isRole(role)) return { kind: 'invalid-role', role }

  let uid: string
  try {
    uid = (await auth.getUserByEmail(email)).uid
  } catch (error) {
    if (isUserNotFound(error)) return { kind: 'no-such-user', email }
    throw error
  }

  const ref = db.collection('users').doc(uid)
  return db.runTransaction(async (transaction): Promise<SetRoleResult> => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists) return { kind: 'no-profile', email, uid }

    const storedName: unknown = snapshot.get('displayName')
    const storedRole: unknown = snapshot.get('role')
    const name = typeof storedName === 'string' ? storedName : email
    const from: Role = isRole(storedRole) ? storedRole : 'player'
    if (from === role && storedRole === role) return { kind: 'unchanged', uid, name, role }

    transaction.update(ref, { role })
    return { kind: 'updated', uid, name, from, to: role }
  })
}
