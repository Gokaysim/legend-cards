import { FieldValue, type Firestore } from 'firebase-admin/firestore'

/** The access list's collection. Keep in step with `ALLOWED_EMAILS_COLLECTION` in src/features/access/api.ts. */
export const ALLOWED_EMAILS_COLLECTION = 'allowedEmails'

/** The longest address the access list accepts. Keep in step with src/features/access/email.ts. */
export const EMAIL_MAX = 254

/**
 * The shape of an access-list address (design D3 of invite-only-sign-in): no capital letters, spaces or "/", exactly
 * one "@", and a dot in the part after it. Keep in step with `validEmailId()` in firestore.rules and EMAIL_PATTERN in
 * src/features/access/email.ts. Scripts cannot import app code, so the check is repeated here.
 */
export const EMAIL_PATTERN = /^[^@ /A-Z]+@[^@ /A-Z]+[.][^@ /A-Z]+$/

/** An address as the access list stores it: without surrounding spaces, in lowercase. */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase()
}

/** Whether a normalized address has the shape the access list accepts. */
export function isValidEmail(email: string): boolean {
  return email.length <= EMAIL_MAX && EMAIL_PATTERN.test(email)
}

export type AllowEmailResult =
  | { kind: 'added'; email: string }
  | { kind: 'unchanged'; email: string }
  | { kind: 'invalid'; email: string }

/**
 * Puts an address on the access list (spec: admin-scripts, "Adding an email address to the access list"), in one
 * transaction: a new entry with the server time, or nothing when the address is already on the list, so its link and
 * its adding time stay. It does not need an account for the address. Returns what happened instead of printing.
 */
export async function allowEmail(
  { db }: { db: Firestore },
  input: string,
): Promise<AllowEmailResult> {
  const email = normalizeEmail(input)
  if (!isValidEmail(email)) return { kind: 'invalid', email }

  const ref = db.collection(ALLOWED_EMAILS_COLLECTION).doc(email)
  return db.runTransaction(async (transaction): Promise<AllowEmailResult> => {
    const snapshot = await transaction.get(ref)
    if (snapshot.exists) return { kind: 'unchanged', email }
    transaction.create(ref, { addedAt: FieldValue.serverTimestamp() })
    return { kind: 'added', email }
  })
}
