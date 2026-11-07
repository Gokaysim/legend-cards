import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, type Firestore, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { AuthUser } from '@/features/auth/authContext'

import firestoreRules from '../../../firestore.rules?raw'
import { ensureProfile } from './api'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

const alice: AuthUser = {
  uid: 'alice',
  displayName: 'Alice',
  email: 'alice@example.com',
  photoURL: 'https://example.com/alice.png',
}

/** Alice's Firestore, under the real rules. */
const aliceDb = () => firestoreOf(testEnv.authenticatedContext(alice.uid))

async function storedProfile(uid: string): Promise<Record<string, unknown> | undefined> {
  let data: Record<string, unknown> | undefined
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    data = (await getDoc(doc(firestoreOf(admin), 'users', uid))).data()
  })
  return data
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-legend-cards',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      // The real rules file, loaded as text by Vite.
      rules: firestoreRules,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

describe('ensureProfile under the real rules', () => {
  it('creates a player profile with a server timestamp and no email on the first call', async () => {
    await expect(ensureProfile(aliceDb(), alice)).resolves.toBe('created')

    const profile = await storedProfile('alice')
    expect(profile).toMatchObject({
      displayName: 'Alice',
      photoURL: 'https://example.com/alice.png',
      role: 'player',
    })
    expect(profile?.createdAt).toBeInstanceOf(Timestamp)
    expect(profile).not.toHaveProperty('email')
  })

  it('writes nothing on a second call with the same data', async () => {
    await ensureProfile(aliceDb(), alice)
    const before = await storedProfile('alice')

    await expect(ensureProfile(aliceDb(), alice)).resolves.toBe('unchanged')

    expect(await storedProfile('alice')).toEqual(before)
  })

  it('updates a changed name and picture, keeping the role and the creation time', async () => {
    await ensureProfile(aliceDb(), alice)
    const before = await storedProfile('alice')

    await expect(
      ensureProfile(aliceDb(), { ...alice, displayName: 'Alice B.', photoURL: null }),
    ).resolves.toBe('updated')

    const after = await storedProfile('alice')
    expect(after).toMatchObject({ displayName: 'Alice B.', photoURL: null, role: 'player' })
    expect(after?.createdAt).toEqual(before?.createdAt)
  })

  it('keeps the DM role of an existing profile', async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), 'users/alice'), {
        displayName: 'Old name',
        photoURL: null,
        role: 'dm',
        createdAt: Timestamp.fromMillis(0),
      })
    })

    await expect(ensureProfile(aliceDb(), alice)).resolves.toBe('updated')

    expect(await storedProfile('alice')).toMatchObject({ displayName: 'Alice', role: 'dm' })
  })

  it('stores a Google account without a name, or with a very long one, within the rules', async () => {
    await expect(ensureProfile(aliceDb(), { ...alice, displayName: '   ' })).resolves.toBe(
      'created',
    )
    expect(await storedProfile('alice')).toMatchObject({ displayName: null })

    await expect(
      ensureProfile(aliceDb(), { ...alice, displayName: 'x'.repeat(150) }),
    ).resolves.toBe('updated')
    expect((await storedProfile('alice'))?.displayName).toBe('x'.repeat(100))
  })
})
