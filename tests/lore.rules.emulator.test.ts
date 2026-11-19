import { readFileSync } from 'node:fs'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  deleteDoc,
  doc,
  type Firestore,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { memberContext, outsiderContext, seedMembers } from '../src/test/members.ts'

// The rules of a card's lore (firestore.rules: cardLore/{cardId}; spec: card-lore; design D2 of
// polish-sidebar-mascots-and-lore).

const PROJECT_ID = 'demo-legend-cards'
/** LORE_LIMIT in src/features/lore/schema.ts. */
const LIMIT = 10000

let testEnv: RulesTestEnvironment

function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

const asUser = (uid: string) => firestoreOf(memberContext(testEnv, uid))
const signedOut = () => firestoreOf(testEnv.unauthenticatedContext())
const outsider = () => firestoreOf(outsiderContext(testEnv))

/** Lore as the app writes it, saved by `by`. */
function lore(by = 'dana', overrides: Record<string, unknown> = {}) {
  return {
    text: 'Derin suların efendisi.',
    updatedBy: by,
    updatedAt: serverTimestamp(),
    ...overrides,
  }
}

/** Stored lore, as an earlier save left it. */
const storedLore = { text: 'Eski hikâye.', updatedBy: 'dana', updatedAt: Timestamp.fromMillis(0) }

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await seedMembers(testEnv)
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    const profile = (displayName: string, role: 'dm' | 'player') => ({
      displayName,
      photoURL: null,
      role,
      createdAt: Timestamp.fromMillis(0),
    })
    await setDoc(doc(db, 'users/dana'), profile('Dana', 'dm'))
    await setDoc(doc(db, 'users/ayla'), profile('Ayla', 'player'))
    // Only the fields the lore rules read: a card's status and kind.
    await setDoc(doc(db, 'cards/legend-abolethseyes'), { kind: 'normal', status: 'active' })
    await setDoc(doc(db, 'cards/legend-oldcoin'), { kind: 'normal', status: 'retired' })
    await setDoc(doc(db, 'cards/legend-bardsencore'), { kind: 'normal', status: 'draft' })
    await setDoc(doc(db, 'cards/cursed-visionsofdeath'), { kind: 'cursed', status: 'active' })
    await setDoc(doc(db, 'cards/tw-abyss'), { kind: 'trueWord', status: 'active' })
    for (const cardId of ['legend-abolethseyes', 'legend-oldcoin', 'legend-bardsencore']) {
      await setDoc(doc(db, `cardLore/${cardId}`), storedLore)
    }
    // Lore whose card is gone: a deleted draft whose cleanup failed.
    await setDoc(doc(db, 'cardLore/legend-gone'), storedLore)
  })
})

describe('reading lore', () => {
  it("lets a member read an active and a retired card's lore", async () => {
    await assertSucceeds(getDoc(doc(asUser('ayla'), 'cardLore/legend-abolethseyes')))
    await assertSucceeds(getDoc(doc(asUser('ayla'), 'cardLore/legend-oldcoin')))
  })

  it('lets a member ask for the lore of a visible card that has none', async () => {
    const snapshot = await assertSucceeds(
      getDoc(doc(asUser('ayla'), 'cardLore/cursed-visionsofdeath')),
    )
    expect(snapshot.exists()).toBe(false)
  })

  it("denies a player a draft's lore and the lore of a missing card", async () => {
    await assertFails(getDoc(doc(asUser('ayla'), 'cardLore/legend-bardsencore')))
    await assertFails(getDoc(doc(asUser('ayla'), 'cardLore/legend-gone')))
  })

  it("lets the DM read a draft's lore and the lore of a missing card", async () => {
    await assertSucceeds(getDoc(doc(asUser('dana'), 'cardLore/legend-bardsencore')))
    await assertSucceeds(getDoc(doc(asUser('dana'), 'cardLore/legend-gone')))
  })

  it('denies signed-out users and accounts that are not on the access list', async () => {
    await assertFails(getDoc(doc(signedOut(), 'cardLore/legend-abolethseyes')))
    await assertFails(getDoc(doc(outsider(), 'cardLore/legend-abolethseyes')))
  })
})

describe('writing lore', () => {
  it('lets the DM create, change and delete lore', async () => {
    const db = asUser('dana')
    await assertSucceeds(setDoc(doc(db, 'cardLore/cursed-visionsofdeath'), lore()))
    await assertSucceeds(setDoc(doc(db, 'cardLore/legend-abolethseyes'), lore()))
    await assertSucceeds(
      updateDoc(doc(db, 'cardLore/legend-abolethseyes'), {
        text: 'Yeni.',
        updatedAt: serverTimestamp(),
      }),
    )
    await assertSucceeds(deleteDoc(doc(db, 'cardLore/legend-abolethseyes')))
  })

  it("lets the DM write a draft's lore, at the limit", async () => {
    await assertSucceeds(
      setDoc(
        doc(asUser('dana'), 'cardLore/legend-bardsencore'),
        lore('dana', { text: 'x'.repeat(LIMIT) }),
      ),
    )
  })

  it("lets the DM delete a missing card's lore", async () => {
    await assertSucceeds(deleteDoc(doc(asUser('dana'), 'cardLore/legend-gone')))
  })

  it('denies a player every write', async () => {
    const db = asUser('ayla')
    await assertFails(setDoc(doc(db, 'cardLore/cursed-visionsofdeath'), lore('ayla')))
    await assertFails(setDoc(doc(db, 'cardLore/legend-abolethseyes'), lore('ayla')))
    await assertFails(deleteDoc(doc(db, 'cardLore/legend-abolethseyes')))
  })

  it('denies signed-out users and outsiders every write', async () => {
    await assertFails(setDoc(doc(signedOut(), 'cardLore/cursed-visionsofdeath'), lore()))
    await assertFails(setDoc(doc(outsider(), 'cardLore/cursed-visionsofdeath'), lore('cem')))
    await assertFails(deleteDoc(doc(outsider(), 'cardLore/legend-abolethseyes')))
  })

  it('denies the DM lore for a True Word or a card that does not exist', async () => {
    const db = asUser('dana')
    await assertFails(setDoc(doc(db, 'cardLore/tw-abyss'), lore()))
    await assertFails(setDoc(doc(db, 'cardLore/legend-nosuchcard'), lore()))
  })

  it.each([
    ['an extra key', lore('dana', { color: 'red' })],
    ['an empty text', lore('dana', { text: '' })],
    ['a text over the limit', lore('dana', { text: 'x'.repeat(LIMIT + 1) })],
    ['a text that is not a string', lore('dana', { text: 7 })],
    ['another user as its editor', lore('ayla')],
    ['a time from the client', lore('dana', { updatedAt: Timestamp.fromMillis(5) })],
  ])('denies the DM %s', async (_case, data) => {
    await assertFails(setDoc(doc(asUser('dana'), 'cardLore/cursed-visionsofdeath'), data))
  })

  it('denies the DM a missing field', async () => {
    await assertFails(
      setDoc(doc(asUser('dana'), 'cardLore/cursed-visionsofdeath'), {
        text: 'Hikâye.',
        updatedAt: serverTimestamp(),
      }),
    )
  })
})
