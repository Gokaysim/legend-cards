import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  doc,
  type Firestore,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { AuthUser } from '@/features/auth/authContext'
import { memberContext, seedMembers } from '@/test/members'

import firestoreRules from '../../../firestore.rules?raw'
import { changeRole, ensureProfile } from './api'

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
const aliceDb = () => firestoreOf(memberContext(testEnv, alice.uid))

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
  await seedMembers(testEnv)
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

describe('changeRole under the real rules', () => {
  const seeded = (role: 'player' | 'dm', displayName: string) => ({
    displayName,
    photoURL: null,
    role,
    createdAt: Timestamp.fromMillis(0),
    lp: 3,
  })
  const as = (uid: string) => firestoreOf(memberContext(testEnv, uid))

  async function records(): Promise<Record<string, unknown>[]> {
    let data: Record<string, unknown>[] = []
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      data = (await getDocs(collection(firestoreOf(admin), 'roleChanges'))).docs.map((d) =>
        d.data(),
      )
    })
    return data
  }

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await setDoc(doc(db, 'users/dana'), seeded('dm', 'Dana'))
      await setDoc(doc(db, 'users/bob'), seeded('player', 'Bob'))
    })
  })

  it('makes a player a DM, with its record, keeping the LP', async () => {
    await changeRole(as('dana'), { target: 'bob', after: 'dm', by: 'dana' })

    expect(await storedProfile('bob')).toMatchObject({ role: 'dm', lp: 3 })
    expect(await records()).toEqual([
      expect.objectContaining({ by: 'dana', target: 'bob', before: 'player', after: 'dm' }),
    ])
  })

  it('takes the role from another DM', async () => {
    await changeRole(as('dana'), { target: 'bob', after: 'dm', by: 'dana' })
    await changeRole(as('dana'), { target: 'bob', after: 'player', by: 'dana' })

    expect(await storedProfile('bob')).toMatchObject({ role: 'player' })
    expect(await records()).toHaveLength(2)
  })

  it('lets a DM step down while naming another DM, and refuses it without one', async () => {
    await expect(
      changeRole(as('dana'), { target: 'dana', after: 'player', by: 'dana', otherDm: 'bob' }),
    ).rejects.toThrow()
    expect(await storedProfile('dana')).toMatchObject({ role: 'dm' })

    await changeRole(as('dana'), { target: 'bob', after: 'dm', by: 'dana' })
    await changeRole(as('dana'), { target: 'dana', after: 'player', by: 'dana', otherDm: 'bob' })
    expect(await storedProfile('dana')).toMatchObject({ role: 'player' })
    expect((await records()).find((r) => r.target === 'dana')).toMatchObject({ otherDm: 'bob' })
  })

  it('writes nothing for a role the user already has', async () => {
    await changeRole(as('dana'), { target: 'bob', after: 'player', by: 'dana' })
    expect(await records()).toEqual([])
  })

  it('is refused for a player', async () => {
    await expect(changeRole(as('bob'), { target: 'bob', after: 'dm', by: 'bob' })).rejects.toThrow()
    expect(await storedProfile('bob')).toMatchObject({ role: 'player' })
  })
})
