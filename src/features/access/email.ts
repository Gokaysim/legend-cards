/** The longest address the access list accepts. */
export const EMAIL_MAX = 254

/**
 * The shape of an access-list address (design D3 of invite-only-sign-in): no capital letters, spaces or "/", exactly
 * one "@", and a dot in the part after it. Keep in step with `validEmailId()` in firestore.rules and with
 * scripts/lib/allowEmail.ts, which cannot import app code.
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
