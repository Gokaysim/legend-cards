import type { RulesTestContext, RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, type Firestore, setDoc, Timestamp } from 'firebase/firestore'

// Signed-in contexts for the emulator tests (design D9 of invite-only-sign-in). The rules let in only accounts whose
// verified email address is on the access list, so every test identity signs in with an address and gets an entry.

/**
 * The access list's collection. Keep in step with `ALLOWED_EMAILS_COLLECTION` in src/features/access/api.ts: this
 * file is also imported from tests/, whose TypeScript project has no `@/` alias.
 */
const ALLOWED_EMAILS_COLLECTION = 'allowedEmails'

/**
 * Every uid the emulator tests sign in as. Each gets a linked entry on the access list, so that a denial in a test
 * comes from the rule under test and not from missing membership.
 */
export const TEST_MEMBERS = ['alice', 'ayla', 'bob', 'bora', 'dana', 'stranger'] as const

/** The email address a test identity signs in with. */
export const memberEmail = (uid: string) => `${uid}@example.com`

/** A signed-in account on the access list (after `seedMembers`). */
export function memberContext(testEnv: RulesTestEnvironment, uid: string): RulesTestContext {
  return testEnv.authenticatedContext(uid, { email: memberEmail(uid), email_verified: true })
}

/**
 * A signed-in account that is not on the access list: by default Cem, whose verified address has no entry. With
 * `verified: false` and a member's address, it is an account whose address is on the list but not verified.
 */
export function outsiderContext(
  testEnv: RulesTestEnvironment,
  { uid = 'cem', email = memberEmail(uid), verified = true } = {},
): RulesTestContext {
  return testEnv.authenticatedContext(uid, { email, email_verified: verified })
}

/** Puts linked entries for `uids` on the access list, with the rules disabled. Run it after clearing Firestore. */
export async function seedMembers(
  testEnv: RulesTestEnvironment,
  uids: readonly string[] = TEST_MEMBERS,
): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = admin.firestore() as unknown as Firestore
    await Promise.all(
      uids.map((uid) =>
        setDoc(doc(db, ALLOWED_EMAILS_COLLECTION, memberEmail(uid)), {
          addedAt: Timestamp.fromMillis(0),
          uid,
        }),
      ),
    )
  })
}
