import { readFileSync } from 'node:fs'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  type Firestore,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const PROJECT_ID = 'demo-legend-cards'

/** Arbitrary paths, including names a later data model might use. None of them is opened yet. */
const SAMPLE_PATHS = [
  'draws/draw-1',
  'players/player-1',
  'players/player-1/hand/entry-1',
  'anything/at/any/depth',
]

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

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
  // Seed one existing document per path, bypassing the rules, so reads, updates and deletes have a target.
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    for (const path of SAMPLE_PATHS) {
      await setDoc(doc(firestoreOf(admin), path), { seeded: true })
    }
  })
})

async function readAsAdmin(path: string): Promise<unknown> {
  let data: unknown
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    data = (await getDoc(doc(firestoreOf(admin), path))).data()
  })
  return data
}

describe('signed-out users have no access', () => {
  it.each(SAMPLE_PATHS)('cannot read %s', async (path) => {
    const db = firestoreOf(testEnv.unauthenticatedContext())
    await assertFails(getDoc(doc(db, path)))
  })

  it.each(SAMPLE_PATHS)('cannot write %s', async (path) => {
    const db = firestoreOf(testEnv.unauthenticatedContext())
    await assertFails(setDoc(doc(db, path), { changed: true }))
    expect(await readAsAdmin(path)).toEqual({ seeded: true })
  })

  it('cannot list a collection', async () => {
    const db = firestoreOf(testEnv.unauthenticatedContext())
    await assertFails(getDocs(collection(db, 'players')))
  })
})

describe('signed-in users are denied on paths no rule opens', () => {
  it.each(SAMPLE_PATHS)('cannot read %s', async (path) => {
    const db = firestoreOf(testEnv.authenticatedContext('alice'))
    await assertFails(getDoc(doc(db, path)))
  })

  it.each(SAMPLE_PATHS)('cannot create, update or delete %s', async (path) => {
    const db = firestoreOf(testEnv.authenticatedContext('alice'))
    await assertFails(setDoc(doc(db, `${path}-new`), { created: true }))
    await assertFails(updateDoc(doc(db, path), { changed: true }))
    await assertFails(deleteDoc(doc(db, path)))
    expect(await readAsAdmin(path)).toEqual({ seeded: true })
  })

  it('cannot list a collection', async () => {
    const db = firestoreOf(testEnv.authenticatedContext('alice'))
    await assertFails(getDocs(collection(db, 'players')))
  })
})

describe('user profiles (users/{uid})', () => {
  const seededProfile = (role: 'player' | 'dm', displayName: string) => ({
    displayName,
    photoURL: null,
    role,
    createdAt: Timestamp.fromMillis(0),
  })

  /** A new profile as the application creates it. */
  const newProfile = (overrides: Record<string, unknown> = {}) => ({
    displayName: 'Alice',
    photoURL: 'https://example.com/alice.png',
    role: 'player',
    createdAt: serverTimestamp(),
    ...overrides,
  })

  beforeEach(async () => {
    // Bob is a player, Dana is the DM. The DM role can only be seeded with rules disabled: no client may set it.
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), 'users/bob'), seededProfile('player', 'Bob'))
      await setDoc(doc(firestoreOf(admin), 'users/dana'), seededProfile('dm', 'Dana'))
    })
  })

  const as = (uid: string) => firestoreOf(testEnv.authenticatedContext(uid))

  describe('reading', () => {
    it('lets a signed-in user read their own profile, other profiles, and the whole list', async () => {
      await assertSucceeds(getDoc(doc(as('bob'), 'users/bob')))
      await assertSucceeds(getDoc(doc(as('bob'), 'users/dana')))
      await assertSucceeds(getDocs(collection(as('alice'), 'users')))
    })

    it('denies signed-out reads', async () => {
      const db = firestoreOf(testEnv.unauthenticatedContext())
      await assertFails(getDoc(doc(db, 'users/bob')))
      await assertFails(getDocs(collection(db, 'users')))
    })
  })

  describe('creating', () => {
    it('lets a user create their own profile as a player with the server time', async () => {
      await assertSucceeds(setDoc(doc(as('alice'), 'users/alice'), newProfile()))
    })

    it('allows a profile without a name or picture', async () => {
      await assertSucceeds(
        setDoc(doc(as('alice'), 'users/alice'), newProfile({ displayName: null, photoURL: null })),
      )
    })

    it("denies creating another user's profile", async () => {
      await assertFails(setDoc(doc(as('alice'), 'users/carol'), newProfile()))
    })

    it('denies claiming the DM role', async () => {
      await assertFails(setDoc(doc(as('alice'), 'users/alice'), newProfile({ role: 'dm' })))
    })

    it('denies a creation time other than the server time', async () => {
      await assertFails(
        setDoc(doc(as('alice'), 'users/alice'), newProfile({ createdAt: Timestamp.fromMillis(0) })),
      )
    })

    it('denies extra fields, such as an email address', async () => {
      await assertFails(
        setDoc(doc(as('alice'), 'users/alice'), newProfile({ email: 'alice@example.com' })),
      )
    })

    it('denies a profile with a missing field', async () => {
      const { photoURL: _photoURL, ...withoutPhoto } = newProfile()
      await assertFails(setDoc(doc(as('alice'), 'users/alice'), withoutPhoto))
    })

    it('denies an empty or over-long name and an over-long picture URL', async () => {
      const ref = doc(as('alice'), 'users/alice')
      await assertFails(setDoc(ref, newProfile({ displayName: '' })))
      await assertFails(setDoc(ref, newProfile({ displayName: 'x'.repeat(101) })))
      await assertFails(setDoc(ref, newProfile({ photoURL: 'x'.repeat(2049) })))
    })
  })

  describe('updating', () => {
    it('lets a user change their own name and picture', async () => {
      await assertSucceeds(
        updateDoc(doc(as('bob'), 'users/bob'), {
          displayName: 'Bobby',
          photoURL: 'https://example.com/b.png',
        }),
      )
    })

    it('denies a user changing their own role', async () => {
      await assertFails(updateDoc(doc(as('bob'), 'users/bob'), { role: 'dm' }))
      expect(await readAsAdmin('users/bob')).toMatchObject({ role: 'player' })
    })

    it('denies a user changing their own creation time or adding fields', async () => {
      await assertFails(
        updateDoc(doc(as('bob'), 'users/bob'), { createdAt: Timestamp.fromMillis(1000) }),
      )
      await assertFails(updateDoc(doc(as('bob'), 'users/bob'), { email: 'bob@example.com' }))
    })

    it('denies an invalid name on update', async () => {
      await assertFails(updateDoc(doc(as('bob'), 'users/bob'), { displayName: '' }))
    })

    it("denies the DM changing another user's profile or role", async () => {
      await assertFails(updateDoc(doc(as('dana'), 'users/bob'), { displayName: 'Renamed' }))
      await assertFails(updateDoc(doc(as('dana'), 'users/bob'), { role: 'dm' }))
      expect(await readAsAdmin('users/bob')).toMatchObject({ displayName: 'Bob', role: 'player' })
    })

    it('denies the DM removing their own role from the application', async () => {
      await assertFails(updateDoc(doc(as('dana'), 'users/dana'), { role: 'player' }))
    })

    it('denies signed-out writes', async () => {
      const db = firestoreOf(testEnv.unauthenticatedContext())
      await assertFails(updateDoc(doc(db, 'users/bob'), { displayName: 'X' }))
      await assertFails(setDoc(doc(db, 'users/eve'), newProfile()))
    })
  })

  describe('deleting', () => {
    it('denies every delete, including of the own profile and by the DM', async () => {
      await assertFails(deleteDoc(doc(as('bob'), 'users/bob')))
      await assertFails(deleteDoc(doc(as('dana'), 'users/bob')))
      expect(await readAsAdmin('users/bob')).toBeDefined()
    })
  })
})

describe('card definitions (cards/{cardId})', () => {
  const seededCard = {
    kind: 'normal',
    name: "Aboleth's Eyes",
    nameKey: 'abolethseyes',
    setCode: 'Kesqer',
    cost: '1',
    rarity: 'common',
    mechanicPack: 'Arcanus Divine',
    text: 'Gain Immune.',
    retired: false,
  }
  const CARD_PATH = 'cards/legend-abolethseyes'

  beforeEach(async () => {
    // Bob is a player, Dana is the DM. Cards exist only through the import script, so they are seeded here.
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await setDoc(doc(db, 'users/bob'), {
        displayName: 'Bob',
        photoURL: null,
        role: 'player',
        createdAt: Timestamp.fromMillis(0),
      })
      await setDoc(doc(db, 'users/dana'), {
        displayName: 'Dana',
        photoURL: null,
        role: 'dm',
        createdAt: Timestamp.fromMillis(0),
      })
      await setDoc(doc(db, CARD_PATH), seededCard)
      await setDoc(doc(db, 'cards/cursed-hex'), { ...seededCard, kind: 'cursed', retired: true })
    })
  })

  const as = (uid: string) => firestoreOf(testEnv.authenticatedContext(uid))

  it.each(['bob', 'dana'])('lets %s read a card and query the whole collection', async (uid) => {
    await assertSucceeds(getDoc(doc(as(uid), CARD_PATH)))
    const all = await assertSucceeds(getDocs(collection(as(uid), 'cards')))
    expect(all.size).toBe(2)
    await assertSucceeds(
      getDocs(query(collection(as(uid), 'cards'), where('retired', '==', false))),
    )
  })

  it('denies signed-out reads', async () => {
    const db = firestoreOf(testEnv.unauthenticatedContext())
    await assertFails(getDoc(doc(db, CARD_PATH)))
    await assertFails(getDocs(collection(db, 'cards')))
  })

  it.each(['bob', 'dana'])('denies %s creating, changing or deleting a card', async (uid) => {
    const db = as(uid)
    await assertFails(setDoc(doc(db, 'cards/legend-newcard'), { ...seededCard, name: 'New Card' }))
    await assertFails(updateDoc(doc(db, CARD_PATH), { text: 'Changed by the app.' }))
    await assertFails(setDoc(doc(db, CARD_PATH), { ...seededCard, text: 'Overwritten.' }))
    await assertFails(deleteDoc(doc(db, CARD_PATH)))
    expect(await readAsAdmin(CARD_PATH)).toEqual(seededCard)
    expect(await readAsAdmin('cards/legend-newcard')).toBeUndefined()
  })
})
