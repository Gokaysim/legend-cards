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
  writeBatch,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const PROJECT_ID = 'demo-legend-cards'

/** Arbitrary paths, including names a later data model might use. None of them is opened yet. */
const SAMPLE_PATHS = [
  'packOpenings/opening-1',
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

/**
 * Shared seed for the card-holdings tests. Ayla and Bora are players, Dana is the DM. Profiles, cards and
 * existing holdings can only be seeded with the rules disabled.
 */
const HOLDINGS_SEED = {
  /** A normal card in the pool. */
  POOL: 'legend-abolethseyes',
  /** A normal card that Bora holds through `h-bora`. Ayla holds an extra copy of it through `h-ayla-extra`. */
  HELD: 'legend-greedyhands',
  BLESSED: 'legend-secondwind',
  CURSED: 'cursed-visionsofdeath',
  /** A retired normal card in the pool. */
  RETIRED: 'legend-oldcard',
}

function seededUser(role: 'player' | 'dm', displayName: string) {
  return { displayName, photoURL: null, role, createdAt: Timestamp.fromMillis(0) }
}

function seededCardOf(kind: 'normal' | 'blessed' | 'cursed', name: string, extra = {}) {
  return {
    kind,
    name,
    nameKey: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    setCode: kind === 'normal' ? 'Kesqer' : null,
    cost: kind === 'blessed' ? null : '1',
    rarity: kind === 'normal' ? 'common' : null,
    mechanicPack: kind === 'cursed' ? null : 'Arcanus Divine',
    text: `${name} text.`,
    retired: false,
    ...extra,
  }
}

/** An open holding as stored, given by Dana long ago. */
function seededHolding(overrides: Record<string, unknown>) {
  return {
    cardId: HOLDINGS_SEED.POOL,
    cardName: "Aboleth's Eyes",
    cardKind: 'normal',
    uid: 'ayla',
    givenAt: Timestamp.fromMillis(1000),
    givenBy: 'dana',
    givenVia: 'dm',
    transferredFrom: null,
    drawId: null,
    active: false,
    note: '',
    costOverride: null,
    returnedAt: null,
    returnedBy: null,
    returnReason: null,
    usedOn: null,
    transferredTo: null,
    ...overrides,
  }
}

/** A new holding as the application creates it: given now by Dana, to Ayla, for the pool card. */
function newHolding(overrides: Record<string, unknown> = {}) {
  return { ...seededHolding({}), givenAt: serverTimestamp(), ...overrides }
}

const asUser = (uid: string) => firestoreOf(testEnv.authenticatedContext(uid))

async function seedHoldings() {
  const { POOL, HELD, BLESSED, CURSED, RETIRED } = HOLDINGS_SEED
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    await setDoc(doc(db, 'users/ayla'), seededUser('player', 'Ayla'))
    await setDoc(doc(db, 'users/bora'), seededUser('player', 'Bora'))
    await setDoc(doc(db, 'users/dana'), seededUser('dm', 'Dana'))
    // The pool card was imported before card holdings existed: it has no holder field at all.
    await setDoc(doc(db, `cards/${POOL}`), seededCardOf('normal', "Aboleth's Eyes"))
    await setDoc(
      doc(db, `cards/${HELD}`),
      seededCardOf('normal', 'Greedy Hands', { holder: { uid: 'bora', userCardId: 'h-bora' } }),
    )
    await setDoc(
      doc(db, `cards/${BLESSED}`),
      seededCardOf('blessed', 'Second Wind', { holder: null }),
    )
    await setDoc(doc(db, `cards/${CURSED}`), seededCardOf('cursed', 'Visions of Death'))
    await setDoc(doc(db, `cards/${RETIRED}`), seededCardOf('normal', 'Old Card', { retired: true }))
    const greedy = { cardId: HELD, cardName: 'Greedy Hands' }
    await setDoc(doc(db, 'userCards/h-bora'), seededHolding({ ...greedy, uid: 'bora' }))
    await setDoc(doc(db, 'userCards/h-ayla-extra'), seededHolding({ ...greedy, uid: 'ayla' }))
    await setDoc(
      doc(db, 'userCards/h-ayla-cursed'),
      seededHolding({ cardId: CURSED, cardName: 'Visions of Death', cardKind: 'cursed' }),
    )
    await setDoc(
      doc(db, 'userCards/h-closed'),
      seededHolding({
        cardId: CURSED,
        cardName: 'Visions of Death',
        cardKind: 'cursed',
        returnedAt: Timestamp.fromMillis(2000),
        returnedBy: 'ayla',
        returnReason: 'used',
      }),
    )
  })
}

describe('card holdings (userCards/{holdingId})', () => {
  const { CURSED, BLESSED, RETIRED } = HOLDINGS_SEED
  const cursedGift = { cardId: CURSED, cardName: 'Visions of Death', cardKind: 'cursed' }

  beforeEach(seedHoldings)

  describe('reading', () => {
    it.each(['ayla', 'bora', 'dana'])('lets %s read every holding, open or closed', async (uid) => {
      await assertSucceeds(getDoc(doc(asUser(uid), 'userCards/h-bora')))
      await assertSucceeds(getDoc(doc(asUser(uid), 'userCards/h-closed')))
      const open = await assertSucceeds(
        getDocs(query(collection(asUser(uid), 'userCards'), where('returnedAt', '==', null))),
      )
      expect(open.size).toBe(3)
    })

    it('denies signed-out reads', async () => {
      const db = firestoreOf(testEnv.unauthenticatedContext())
      await assertFails(getDoc(doc(db, 'userCards/h-bora')))
      await assertFails(getDocs(collection(db, 'userCards')))
    })
  })

  describe('creating', () => {
    it('lets the DM give a Cursed card and a Blessed card, each more than once', async () => {
      const db = asUser('dana')
      await assertSucceeds(setDoc(doc(db, 'userCards/new-1'), newHolding(cursedGift)))
      await assertSucceeds(
        setDoc(doc(db, 'userCards/new-2'), newHolding({ ...cursedGift, uid: 'bora' })),
      )
      const blessed = { cardId: BLESSED, cardName: 'Second Wind', cardKind: 'blessed' }
      await assertSucceeds(setDoc(doc(db, 'userCards/new-3'), newHolding(blessed)))
      await assertSucceeds(setDoc(doc(db, 'userCards/new-4'), newHolding(blessed)))
    })

    it('lets the DM give a card to themselves, active, with a note and a cost', async () => {
      await assertSucceeds(
        setDoc(
          doc(asUser('dana'), 'userCards/new-1'),
          newHolding({ ...cursedGift, uid: 'dana', active: true, note: 'Not', costOverride: 'd6' }),
        ),
      )
    })

    it('denies a player giving a card, even to themselves', async () => {
      await assertFails(
        setDoc(
          doc(asUser('ayla'), 'userCards/new-1'),
          newHolding({ ...cursedGift, givenBy: 'ayla' }),
        ),
      )
    })

    it('denies signed-out creates', async () => {
      const db = firestoreOf(testEnv.unauthenticatedContext())
      await assertFails(setDoc(doc(db, 'userCards/new-1'), newHolding(cursedGift)))
    })

    it('denies a holding for a user ID without a profile', async () => {
      await assertFails(
        setDoc(doc(asUser('dana'), 'userCards/new-1'), newHolding({ ...cursedGift, uid: 'ghost' })),
      )
    })

    it.each([
      ['an extra field', { comment: 'x' }],
      ['a missing field', { usedOn: undefined }],
      ['a note over 1000 characters', { note: 'x'.repeat(1001) }],
      ['a note that is not text', { note: 5 }],
      ['a cost over 10 characters', { costOverride: '12345678901' }],
      ['an empty cost', { costOverride: '' }],
      ['an active flag that is not a boolean', { active: 'yes' }],
      ['an empty card name', { cardName: '' }],
      ['a given time other than the server time', { givenAt: Timestamp.fromMillis(5) }],
      ['another user as the giver', { givenBy: 'bora' }],
      ['an unknown way of giving', { givenVia: 'initial' }],
      ['a dm give that continues a holding', { transferredFrom: 'h-closed' }],
      ['a transfer that continues nothing', { givenVia: 'transfer' }],
      [
        'a holding that starts closed',
        { returnedAt: serverTimestamp(), returnedBy: 'dana', returnReason: 'used' },
      ],
      ['a character on an open holding', { usedOn: 'Thorin' }],
      ['a kind that differs from the card', { cardKind: 'blessed' }],
      ['a card that does not exist', { cardId: 'cursed-nothing' }],
    ])('denies %s', async (_case, overrides) => {
      const holding: Record<string, unknown> = newHolding({ ...cursedGift, ...overrides })
      for (const key of Object.keys(holding)) if (holding[key] === undefined) delete holding[key]
      await assertFails(setDoc(doc(asUser('dana'), 'userCards/new-1'), holding))
    })

    it('denies giving a retired card', async () => {
      const db = asUser('dana')
      const batch = writeBatch(db)
      batch.set(doc(db, 'userCards/new-1'), newHolding({ cardId: RETIRED, cardName: 'Old Card' }))
      batch.update(doc(db, `cards/${RETIRED}`), { holder: { uid: 'ayla', userCardId: 'new-1' } })
      await assertFails(batch.commit())
      expect(await readAsAdmin(`cards/${RETIRED}`)).not.toHaveProperty('holder')
    })
  })

  describe('notes, active state and cost overrides', () => {
    it('lets the holder and the DM write a note of up to 1000 characters', async () => {
      await assertSucceeds(
        updateDoc(doc(asUser('ayla'), 'userCards/h-ayla-cursed'), {
          note: 'Boss savaşında kullan',
        }),
      )
      await assertSucceeds(
        updateDoc(doc(asUser('dana'), 'userCards/h-ayla-cursed'), { note: 'x'.repeat(1000) }),
      )
      await assertSucceeds(updateDoc(doc(asUser('ayla'), 'userCards/h-ayla-cursed'), { note: '' }))
    })

    it('denies another player changing a note, and a note that is too long', async () => {
      await assertFails(updateDoc(doc(asUser('bora'), 'userCards/h-ayla-cursed'), { note: 'Mine' }))
      await assertFails(
        updateDoc(doc(asUser('ayla'), 'userCards/h-ayla-cursed'), { note: 'x'.repeat(1001) }),
      )
    })

    it('lets only the DM switch a card active or inactive', async () => {
      await assertSucceeds(
        updateDoc(doc(asUser('dana'), 'userCards/h-ayla-cursed'), { active: true }),
      )
      await assertFails(
        updateDoc(doc(asUser('ayla'), 'userCards/h-ayla-cursed'), { active: false }),
      )
      await assertFails(updateDoc(doc(asUser('dana'), 'userCards/h-ayla-cursed'), { active: 'no' }))
      expect(await readAsAdmin('userCards/h-ayla-cursed')).toMatchObject({ active: true })
    })

    it('lets only the DM set and clear a cost override of up to 10 characters', async () => {
      const ref = (uid: string) => doc(asUser(uid), 'userCards/h-ayla-cursed')
      await assertSucceeds(updateDoc(ref('dana'), { costOverride: '1' }))
      await assertSucceeds(updateDoc(ref('dana'), { costOverride: null }))
      await assertFails(updateDoc(ref('ayla'), { costOverride: '0' }))
      await assertFails(updateDoc(ref('dana'), { costOverride: '12345678901' }))
      await assertFails(updateDoc(ref('dana'), { costOverride: '' }))
    })

    it('denies changing two fields at once, or a field outside these', async () => {
      const ref = doc(asUser('dana'), 'userCards/h-ayla-cursed')
      await assertFails(updateDoc(ref, { note: 'x', active: true }))
      await assertFails(updateDoc(ref, { uid: 'bora' }))
      await assertFails(updateDoc(ref, { givenAt: Timestamp.fromMillis(5) }))
    })

    it('denies signed-out updates', async () => {
      const db = firestoreOf(testEnv.unauthenticatedContext())
      await assertFails(updateDoc(doc(db, 'userCards/h-ayla-cursed'), { note: 'x' }))
    })
  })

  describe('closed holdings and deleting', () => {
    it('denies every change to a closed holding, even by the DM', async () => {
      const ref = (uid: string) => doc(asUser(uid), 'userCards/h-closed')
      await assertFails(updateDoc(ref('dana'), { note: 'Late note' }))
      await assertFails(updateDoc(ref('ayla'), { note: 'Late note' }))
      await assertFails(updateDoc(ref('dana'), { active: true }))
      await assertFails(updateDoc(ref('dana'), { costOverride: '2' }))
      await assertFails(
        updateDoc(ref('dana'), {
          returnedAt: serverTimestamp(),
          returnedBy: 'dana',
          returnReason: 'discarded',
          usedOn: null,
        }),
      )
    })

    it('denies deleting a holding, open or closed, by anyone', async () => {
      for (const uid of ['ayla', 'dana']) {
        await assertFails(deleteDoc(doc(asUser(uid), 'userCards/h-ayla-cursed')))
        await assertFails(deleteDoc(doc(asUser(uid), 'userCards/h-closed')))
      }
      expect(await readAsAdmin('userCards/h-closed')).toBeDefined()
    })
  })
})

describe('card movements (userCards with cards/{cardId}.holder)', () => {
  const { POOL, HELD, CURSED } = HOLDINGS_SEED
  const poolHolder = (uid: string, userCardId: string) => ({ uid, userCardId })

  beforeEach(seedHoldings)

  /** The fields that close a holding now, by `uid`. */
  const closing = (uid: string, reason: 'used' | 'discarded', usedOn: string | null = null) => ({
    returnedAt: serverTimestamp(),
    returnedBy: uid,
    returnReason: reason,
    usedOn,
  })

  /** A transfer of holding `fromId` of `cardId` to `toUid` as `newId`, by `by`, in one batch. */
  function transferBatch(
    by: string,
    {
      fromId,
      cardId,
      cardName,
      cardKind = 'normal',
      toUid,
      newId,
      moveHolder,
    }: {
      fromId: string
      cardId: string
      cardName: string
      cardKind?: 'normal' | 'cursed'
      toUid: string
      newId: string
      moveHolder: boolean
    },
  ) {
    const db = asUser(by)
    const batch = writeBatch(db)
    batch.update(doc(db, `userCards/${fromId}`), {
      returnedAt: serverTimestamp(),
      returnedBy: by,
      returnReason: 'transferred',
      transferredTo: newId,
    })
    batch.set(
      doc(db, `userCards/${newId}`),
      newHolding({
        cardId,
        cardName,
        cardKind,
        uid: toUid,
        givenBy: by,
        givenVia: 'transfer',
        transferredFrom: fromId,
      }),
    )
    if (moveHolder) batch.update(doc(db, `cards/${cardId}`), { holder: poolHolder(toUid, newId) })
    return batch
  }

  describe('allowed', () => {
    it('lets the DM give a pool card, which takes it out of the pool', async () => {
      const db = asUser('dana')
      const batch = writeBatch(db)
      batch.set(doc(db, 'userCards/new-1'), newHolding())
      batch.update(doc(db, `cards/${POOL}`), { holder: poolHolder('ayla', 'new-1') })
      await assertSucceeds(batch.commit())
      expect(await readAsAdmin(`cards/${POOL}`)).toMatchObject({
        holder: poolHolder('ayla', 'new-1'),
      })
    })

    it('lets the DM give an extra copy of a held card, which keeps its holder', async () => {
      await assertSucceeds(
        setDoc(
          doc(asUser('dana'), 'userCards/new-1'),
          newHolding({ cardId: HELD, cardName: 'Greedy Hands' }),
        ),
      )
      expect(await readAsAdmin(`cards/${HELD}`)).toMatchObject({
        holder: poolHolder('bora', 'h-bora'),
      })
    })

    it('lets the holder use their card on a character, which returns it to the pool', async () => {
      const db = asUser('bora')
      const batch = writeBatch(db)
      batch.update(doc(db, 'userCards/h-bora'), closing('bora', 'used', 'Thorin'))
      batch.update(doc(db, `cards/${HELD}`), { holder: null })
      await assertSucceeds(batch.commit())
      expect(await readAsAdmin('userCards/h-bora')).toMatchObject({
        returnReason: 'used',
        returnedBy: 'bora',
        usedOn: 'Thorin',
      })
      expect(await readAsAdmin(`cards/${HELD}`)).toMatchObject({ holder: null })
    })

    it('lets the DM use a card for a player, without a character', async () => {
      const db = asUser('dana')
      const batch = writeBatch(db)
      batch.update(doc(db, 'userCards/h-bora'), closing('dana', 'used'))
      batch.update(doc(db, `cards/${HELD}`), { holder: null })
      await assertSucceeds(batch.commit())
    })

    it('lets the DM discard a card, which returns it to the pool', async () => {
      const db = asUser('dana')
      const batch = writeBatch(db)
      batch.update(doc(db, 'userCards/h-bora'), closing('dana', 'discarded'))
      batch.update(doc(db, `cards/${HELD}`), { holder: null })
      await assertSucceeds(batch.commit())
      expect(await readAsAdmin('userCards/h-bora')).toMatchObject({ returnReason: 'discarded' })
    })

    it('lets the DM transfer a card, which moves its holder to the new holding', async () => {
      await assertSucceeds(
        transferBatch('dana', {
          fromId: 'h-bora',
          cardId: HELD,
          cardName: 'Greedy Hands',
          toUid: 'ayla',
          newId: 'new-1',
          moveHolder: true,
        }).commit(),
      )
      expect(await readAsAdmin('userCards/h-bora')).toMatchObject({
        returnReason: 'transferred',
        transferredTo: 'new-1',
      })
      expect(await readAsAdmin('userCards/new-1')).toMatchObject({
        uid: 'ayla',
        givenVia: 'transfer',
        transferredFrom: 'h-bora',
      })
      expect(await readAsAdmin(`cards/${HELD}`)).toMatchObject({
        holder: poolHolder('ayla', 'new-1'),
      })
    })

    it('lets the holder use an extra copy, and the DM transfer one, leaving the holder alone', async () => {
      await assertSucceeds(
        transferBatch('dana', {
          fromId: 'h-ayla-extra',
          cardId: HELD,
          cardName: 'Greedy Hands',
          toUid: 'dana',
          newId: 'new-1',
          moveHolder: false,
        }).commit(),
      )
      await assertSucceeds(
        updateDoc(doc(asUser('dana'), 'userCards/new-1'), closing('dana', 'used')),
      )
      expect(await readAsAdmin(`cards/${HELD}`)).toMatchObject({
        holder: poolHolder('bora', 'h-bora'),
      })
    })

    it('lets the holder use a Cursed card and the DM transfer one, without touching the card', async () => {
      await assertSucceeds(
        transferBatch('dana', {
          fromId: 'h-ayla-cursed',
          cardId: CURSED,
          cardName: 'Visions of Death',
          cardKind: 'cursed',
          toUid: 'bora',
          newId: 'new-1',
          moveHolder: false,
        }).commit(),
      )
      await assertSucceeds(
        updateDoc(doc(asUser('bora'), 'userCards/new-1'), closing('bora', 'used', 'Thorin')),
      )
    })
  })

  describe('denied', () => {
    it('denies a holder set without a holding', async () => {
      await assertFails(
        updateDoc(doc(asUser('dana'), `cards/${POOL}`), { holder: poolHolder('ayla', 'nothing') }),
      )
    })

    it('denies a holder pointing at an existing holding', async () => {
      const db = asUser('dana')
      await assertFails(
        updateDoc(doc(db, `cards/${POOL}`), { holder: poolHolder('ayla', 'h-ayla-cursed') }),
      )
      await assertFails(
        updateDoc(doc(db, `cards/${POOL}`), { holder: poolHolder('bora', 'h-bora') }),
      )
    })

    it('denies a holder that names another user than the holding', async () => {
      const db = asUser('dana')
      const batch = writeBatch(db)
      batch.set(doc(db, 'userCards/new-1'), newHolding())
      batch.update(doc(db, `cards/${POOL}`), { holder: poolHolder('bora', 'new-1') })
      await assertFails(batch.commit())
    })

    it('denies a holding of a pool card that does not set the holder', async () => {
      await assertFails(setDoc(doc(asUser('dana'), 'userCards/new-1'), newHolding()))
    })

    it('denies a holder set on a card that is already held', async () => {
      const db = asUser('dana')
      const batch = writeBatch(db)
      batch.set(doc(db, 'userCards/new-1'), newHolding({ cardId: HELD, cardName: 'Greedy Hands' }))
      batch.update(doc(db, `cards/${HELD}`), { holder: poolHolder('ayla', 'new-1') })
      await assertFails(batch.commit())
      expect(await readAsAdmin(`cards/${HELD}`)).toMatchObject({
        holder: poolHolder('bora', 'h-bora'),
      })
    })

    it('denies text changed together with the holder', async () => {
      const db = asUser('dana')
      const batch = writeBatch(db)
      batch.set(doc(db, 'userCards/new-1'), newHolding())
      batch.update(doc(db, `cards/${POOL}`), {
        holder: poolHolder('ayla', 'new-1'),
        text: 'Changed with the give.',
      })
      await assertFails(batch.commit())
      expect(await readAsAdmin('userCards/new-1')).toBeUndefined()
    })

    it("denies a player closing someone else's card", async () => {
      const db = asUser('ayla')
      const batch = writeBatch(db)
      batch.update(doc(db, 'userCards/h-bora'), closing('ayla', 'used'))
      batch.update(doc(db, `cards/${HELD}`), { holder: null })
      await assertFails(batch.commit())
    })

    it('denies a player discarding their own card', async () => {
      const db = asUser('bora')
      const batch = writeBatch(db)
      batch.update(doc(db, 'userCards/h-bora'), closing('bora', 'discarded'))
      batch.update(doc(db, `cards/${HELD}`), { holder: null })
      await assertFails(batch.commit())
    })

    it('denies a player transferring their own card', async () => {
      await assertFails(
        transferBatch('bora', {
          fromId: 'h-bora',
          cardId: HELD,
          cardName: 'Greedy Hands',
          toUid: 'ayla',
          newId: 'new-1',
          moveHolder: true,
        }).commit(),
      )
    })

    it("denies closing the holder's holding without releasing the card", async () => {
      await assertFails(updateDoc(doc(asUser('bora'), 'userCards/h-bora'), closing('bora', 'used')))
      await assertFails(
        updateDoc(doc(asUser('dana'), 'userCards/h-bora'), closing('dana', 'discarded')),
      )
    })

    it('denies releasing a card whose holding stays open', async () => {
      await assertFails(updateDoc(doc(asUser('bora'), `cards/${HELD}`), { holder: null }))
      await assertFails(updateDoc(doc(asUser('dana'), `cards/${HELD}`), { holder: null }))
    })

    it('denies closing an extra copy together with releasing the card', async () => {
      const db = asUser('ayla')
      const batch = writeBatch(db)
      batch.update(doc(db, 'userCards/h-ayla-extra'), closing('ayla', 'used'))
      batch.update(doc(db, `cards/${HELD}`), { holder: null })
      await assertFails(batch.commit())
    })

    it('denies a transfer that leaves the holder behind', async () => {
      await assertFails(
        transferBatch('dana', {
          fromId: 'h-bora',
          cardId: HELD,
          cardName: 'Greedy Hands',
          toUid: 'ayla',
          newId: 'new-1',
          moveHolder: false,
        }).commit(),
      )
    })

    it('denies a transfer whose new holding is for another card', async () => {
      const db = asUser('dana')
      const batch = writeBatch(db)
      batch.update(doc(db, 'userCards/h-ayla-cursed'), {
        returnedAt: serverTimestamp(),
        returnedBy: 'dana',
        returnReason: 'transferred',
        transferredTo: 'new-1',
      })
      batch.set(
        doc(db, 'userCards/new-1'),
        newHolding({ uid: 'bora', givenVia: 'transfer', transferredFrom: 'h-ayla-cursed' }),
      )
      batch.update(doc(db, `cards/${POOL}`), { holder: poolHolder('bora', 'new-1') })
      await assertFails(batch.commit())
    })

    it('denies closing a holding as transferred without the new holding', async () => {
      await assertFails(
        updateDoc(doc(asUser('dana'), 'userCards/h-ayla-cursed'), {
          returnedAt: serverTimestamp(),
          returnedBy: 'dana',
          returnReason: 'transferred',
          transferredTo: 'nothing',
        }),
      )
    })

    it('denies closing with another user as the closer, or another time than now', async () => {
      const ref = doc(asUser('dana'), 'userCards/h-ayla-cursed')
      await assertFails(updateDoc(ref, { ...closing('dana', 'used'), returnedBy: 'ayla' }))
      await assertFails(
        updateDoc(ref, { ...closing('dana', 'used'), returnedAt: Timestamp.fromMillis(5) }),
      )
      await assertFails(updateDoc(ref, { ...closing('dana', 'used'), usedOn: 'x'.repeat(101) }))
      await assertFails(updateDoc(ref, closing('dana', 'discarded', 'Thorin')))
    })

    it('denies a holder on a Blessed or Cursed card', async () => {
      const db = asUser('dana')
      const batch = writeBatch(db)
      batch.set(
        doc(db, 'userCards/new-1'),
        newHolding({ cardId: CURSED, cardName: 'Visions of Death', cardKind: 'cursed' }),
      )
      batch.update(doc(db, `cards/${CURSED}`), { holder: poolHolder('ayla', 'new-1') })
      await assertFails(batch.commit())
    })
  })
})

describe('balances (users/{uid}.lp, party/main, ledger/{entryId})', () => {
  beforeEach(async () => {
    // Ayla has 5 LP from an earlier entry; Bora's profile predates Legend Points (no field: 0); Dana is the DM.
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await setDoc(doc(db, 'users/ayla'), {
        ...seededUser('player', 'Ayla'),
        lp: 5,
        lpEntryId: 'e-old',
      })
      await setDoc(doc(db, 'users/bora'), seededUser('player', 'Bora'))
      await setDoc(doc(db, 'users/dana'), seededUser('dm', 'Dana'))
      await setDoc(
        doc(db, 'ledger/e-old'),
        ledgerEntry({ delta: 5, balanceAfter: 5, at: Timestamp.fromMillis(1000) }),
      )
    })
  })

  /** A ledger entry as the application writes it: Dana adds 2 LP to Ayla now. */
  function ledgerEntry(overrides: Record<string, unknown> = {}) {
    return {
      currency: 'lp',
      account: 'ayla',
      delta: 2,
      balanceAfter: 7,
      source: 'manual',
      reason: "Boss'u yendi",
      drawId: null,
      by: 'dana',
      at: serverTimestamp(),
      ...overrides,
    }
  }

  type Change = {
    /** The new balance and its pointer, or `null` to leave the balance document alone. */
    balance?: Record<string, unknown> | null
    /** The entry's fields, or `null` to write no entry. */
    entry?: Record<string, unknown> | null
    entryId?: string
  }

  /** One batch with a player's new LP and its entry, as the application writes it. Defaults: Ayla 5 → 7. */
  function changeLp(writer: string, uid = 'ayla', change: Change = {}) {
    const db = asUser(writer)
    const entryId = change.entryId ?? 'e-new'
    const batch = writeBatch(db)
    if (change.entry !== null) {
      batch.set(doc(db, `ledger/${entryId}`), ledgerEntry({ account: uid, ...change.entry }))
    }
    if (change.balance !== null) {
      batch.update(doc(db, `users/${uid}`), { lp: 7, lpEntryId: entryId, ...change.balance })
    }
    return batch.commit()
  }

  /** One batch with the party's new GP and its entry. Defaults: an empty purse → 7,500 GP. */
  function changeGp(writer: string, change: Change = {}) {
    const db = asUser(writer)
    const entryId = change.entryId ?? 'g-new'
    const batch = writeBatch(db)
    if (change.entry !== null) {
      batch.set(
        doc(db, `ledger/${entryId}`),
        ledgerEntry({
          currency: 'gp',
          account: 'party',
          delta: 7500,
          balanceAfter: 7500,
          ...change.entry,
        }),
      )
    }
    if (change.balance !== null) {
      batch.set(doc(db, 'party/main'), { gp: 7500, gpEntryId: entryId, ...change.balance })
    }
    return batch.commit()
  }

  describe('reading', () => {
    it('lets every signed-in user read the purse, LP and the ledger', async () => {
      await changeGp('dana')
      await assertSucceeds(getDoc(doc(asUser('bora'), 'party/main')))
      await assertSucceeds(getDoc(doc(asUser('bora'), 'ledger/e-old')))
      await assertSucceeds(getDocs(collection(asUser('bora'), 'ledger')))
      await assertSucceeds(getDoc(doc(asUser('bora'), 'users/ayla')))
    })

    it('denies signed-out reads', async () => {
      const db = firestoreOf(testEnv.unauthenticatedContext())
      await assertFails(getDoc(doc(db, 'party/main')))
      await assertFails(getDoc(doc(db, 'ledger/e-old')))
      await assertFails(getDocs(collection(db, 'ledger')))
    })
  })

  describe('allowed', () => {
    it("lets the DM change a player's LP together with its entry", async () => {
      await assertSucceeds(changeLp('dana'))
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 7, lpEntryId: 'e-new' })
      expect(await readAsAdmin('ledger/e-new')).toMatchObject({ delta: 2, balanceAfter: 7 })
    })

    it('counts a profile without LP as 0 LP', async () => {
      await assertSucceeds(
        changeLp('dana', 'bora', { balance: { lp: 3 }, entry: { delta: 3, balanceAfter: 3 } }),
      )
    })

    it('lets the DM subtract LP down to exactly 0', async () => {
      await assertSucceeds(
        changeLp('dana', 'ayla', { balance: { lp: 0 }, entry: { delta: -5, balanceAfter: 0 } }),
      )
    })

    it('lets the DM create the purse with the first GP change, and change it later', async () => {
      await assertSucceeds(changeGp('dana'))
      await assertSucceeds(
        changeGp('dana', {
          entryId: 'g-next',
          balance: { gp: 12500 },
          entry: { delta: 5000, balanceAfter: 12500 },
        }),
      )
      expect(await readAsAdmin('party/main')).toEqual({ gp: 12500, gpEntryId: 'g-next' })
    })
  })

  describe('denied', () => {
    it('denies a player changing their own LP or the purse', async () => {
      await assertFails(changeLp('ayla', 'ayla', { entry: { by: 'ayla' } }))
      await assertFails(changeGp('ayla', { entry: { by: 'ayla' } }))
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 5 })
    })

    it("denies LP on the DM's profile", async () => {
      await assertFails(
        changeLp('dana', 'dana', { balance: { lp: 2 }, entry: { balanceAfter: 2 } }),
      )
    })

    it('denies a balance without its entry, and an entry without its balance', async () => {
      await assertFails(changeLp('dana', 'ayla', { entry: null }))
      await assertFails(changeLp('dana', 'ayla', { balance: null }))
      await assertFails(changeGp('dana', { entry: null }))
      await assertFails(changeGp('dana', { balance: null }))
    })

    it('denies a change that disagrees with its entry', async () => {
      await assertFails(changeLp('dana', 'ayla', { balance: { lp: 8 } }))
      await assertFails(changeLp('dana', 'ayla', { entry: { delta: 3, balanceAfter: 7 } }))
      await assertFails(changeGp('dana', { balance: { gp: 7000 } }))
      await assertFails(changeLp('dana', 'ayla', { entry: { currency: 'gp' } }))
      await assertFails(changeLp('dana', 'ayla', { entry: { account: 'bora' } }))
    })

    it('denies a balance below 0, a fraction, and a change over the limit', async () => {
      await assertFails(
        changeLp('dana', 'ayla', { balance: { lp: -1 }, entry: { delta: -6, balanceAfter: -1 } }),
      )
      await assertFails(
        changeLp('dana', 'ayla', {
          balance: { lp: 7.5 },
          entry: { delta: 2.5, balanceAfter: 7.5 },
        }),
      )
      await assertFails(
        changeLp('dana', 'ayla', {
          balance: { lp: 1_000_006 },
          entry: { delta: 1_000_001, balanceAfter: 1_000_006 },
        }),
      )
    })

    it('denies an empty, blank or over-long reason', async () => {
      await assertFails(changeLp('dana', 'ayla', { entry: { reason: '' } }))
      await assertFails(changeLp('dana', 'ayla', { entry: { reason: '   ' } }))
      await assertFails(changeLp('dana', 'ayla', { entry: { reason: 'x'.repeat(201) } }))
      await assertSucceeds(changeLp('dana', 'ayla', { entry: { reason: 'x'.repeat(200) } }))
    })

    it('denies another writer, another time than now, another source, and extra fields', async () => {
      await assertFails(changeLp('dana', 'ayla', { entry: { by: 'ayla' } }))
      await assertFails(changeLp('dana', 'ayla', { entry: { at: Timestamp.fromMillis(5) } }))
      await assertFails(changeLp('dana', 'ayla', { entry: { source: 'pack' } }))
      await assertFails(changeLp('dana', 'ayla', { entry: { drawId: 'd1' } }))
      await assertFails(changeGp('dana', { balance: { note: 'x' } }))
    })

    it('denies reusing an existing entry, and two entries for one change', async () => {
      await assertFails(
        updateDoc(doc(asUser('dana'), 'users/ayla'), { lp: 10, lpEntryId: 'e-old' }),
      )
      const db = asUser('dana')
      const batch = writeBatch(db)
      batch.set(doc(db, 'ledger/e-new'), ledgerEntry())
      batch.set(doc(db, 'ledger/e-extra'), ledgerEntry())
      batch.update(doc(db, 'users/ayla'), { lp: 7, lpEntryId: 'e-new' })
      await assertFails(batch.commit())
    })

    it('denies changing or deleting a ledger entry or the purse', async () => {
      await changeGp('dana')
      const db = asUser('dana')
      await assertFails(updateDoc(doc(db, 'ledger/e-old'), { reason: 'Düzeltme' }))
      await assertFails(deleteDoc(doc(db, 'ledger/e-old')))
      await assertFails(deleteDoc(doc(db, 'party/main')))
    })

    it("denies the DM changing a player's name, picture or role, even with an LP change", async () => {
      await assertFails(changeLp('dana', 'ayla', { balance: { displayName: 'Renamed' } }))
      await assertFails(changeLp('dana', 'ayla', { balance: { photoURL: 'https://x.test/a.png' } }))
      await assertFails(changeLp('dana', 'ayla', { balance: { role: 'dm' } }))
      await assertFails(
        updateDoc(doc(asUser('dana'), 'users/ayla'), { photoURL: 'https://x.test/a.png' }),
      )
      expect(await readAsAdmin('users/ayla')).toMatchObject({ displayName: 'Ayla', role: 'player' })
    })

    it('denies signed-out writes', async () => {
      const db = firestoreOf(testEnv.unauthenticatedContext())
      await assertFails(setDoc(doc(db, 'party/main'), { gp: 1, gpEntryId: 'x' }))
      await assertFails(setDoc(doc(db, 'ledger/x'), ledgerEntry()))
    })
  })
})

describe('draws (draws/{drawId} with its holding, card, ledger entry and LP)', () => {
  const { POOL, HELD, BLESSED, CURSED, RETIRED } = HOLDINGS_SEED
  const POOL_CARD = { cardId: POOL, cardName: "Aboleth's Eyes", cardKind: 'normal' }
  const BLESSED_CARD = { cardId: BLESSED, cardName: 'Second Wind', cardKind: 'blessed' }
  const CURSED_CARD = { cardId: CURSED, cardName: 'Visions of Death', cardKind: 'cursed' }
  const HELD_CARD = { cardId: HELD, cardName: 'Greedy Hands', cardKind: 'normal' }
  const RETIRED_CARD = { cardId: RETIRED, cardName: 'Old Card', cardKind: 'normal' }
  /** A second normal card in the pool. */
  const OTHER_CARD = { cardId: 'legend-bloodrite', cardName: 'Blood Rite', cardKind: 'normal' }
  const FILTERS = { cost: '1', mechanicPack: 'Arcanus Divine', rarity: 'common', keyword: 'eyes' }

  beforeEach(async () => {
    await seedHoldings()
    // Ayla has 3 LP from an earlier entry; Bora has none.
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await updateDoc(doc(db, 'users/ayla'), { lp: 3, lpEntryId: 'e-old' })
      await setDoc(doc(db, `cards/${OTHER_CARD.cardId}`), seededCardOf('normal', 'Blood Rite'))
    })
  })

  async function setLp(uid: string, lp: number) {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await updateDoc(doc(firestoreOf(admin), `users/${uid}`), { lp, lpEntryId: 'e-old' })
    })
  }

  type DrawSpec = {
    /** Whose hand. Default: the writer's. */
    uid?: string
    card?: { cardId: string; cardName: string; cardKind: string }
    kind?: 'random' | 'cursed'
    /** Default: a player's random draw is paid, everything else is free. */
    paid?: boolean
    /** Overrides of the draw's fields. */
    draw?: Record<string, unknown>
    /** Overrides of the holding's fields, or `null` to write no holding. */
    holding?: Record<string, unknown> | null
    /** Whether a card gets the new holding as its holder. Default: for a normal card. */
    takesCard?: boolean
    /** Which card gets the holder. Default: the drawn card. */
    holderCard?: string
    /** Overrides of the entry's fields, or `null` to write no entry. Only for a paid draw. */
    entry?: Record<string, unknown> | null
    /** Overrides of the new LP, or `null` to leave the profile alone. Only for a paid draw. */
    balance?: Record<string, unknown> | null
    /** Whose LP pays. Default: the hand's owner. */
    payer?: string
  }

  /** Ayla's payment of 1 LP (3 -> 2) for the draw `d-new`, as `writer` writes it. */
  function drawEntry(writer: string, overrides: Record<string, unknown> = {}) {
    return {
      currency: 'lp',
      account: 'ayla',
      delta: -1,
      balanceAfter: 2,
      source: 'draw',
      reason: null,
      drawId: 'd-new',
      by: writer,
      at: serverTimestamp(),
      ...overrides,
    }
  }

  /**
   * One draw as the application writes it, in one batch: the draw `d-new`, its holding `h-new`, the normal card's
   * holder and, when paid, the entry `e-new` and the new LP (Ayla 3 -> 2). Default: Ayla's paid draw of the pool
   * card into her own hand.
   */
  function draw(writer: string, spec: DrawSpec = {}) {
    const db = asUser(writer)
    const uid = spec.uid ?? writer
    const card = spec.card ?? POOL_CARD
    const kind = spec.kind ?? (card.cardKind === 'cursed' ? 'cursed' : 'random')
    const paid = spec.paid ?? (kind === 'random' && writer !== 'dana')
    const payer = spec.payer ?? uid
    const batch = writeBatch(db)
    batch.set(doc(db, 'draws/d-new'), {
      kind,
      uid,
      by: writer,
      at: serverTimestamp(),
      ...card,
      holdingId: 'h-new',
      filters: null,
      paidWith: paid ? 'lp' : 'none',
      cost: paid ? 1 : 0,
      entryId: paid ? 'e-new' : null,
      ...spec.draw,
    })
    if (spec.holding !== null) {
      batch.set(
        doc(db, 'userCards/h-new'),
        newHolding({
          ...card,
          uid,
          givenBy: writer,
          givenVia: 'draw',
          drawId: 'd-new',
          ...spec.holding,
        }),
      )
    }
    if (spec.takesCard ?? card.cardKind === 'normal') {
      batch.update(doc(db, `cards/${spec.holderCard ?? card.cardId}`), {
        holder: { uid, userCardId: 'h-new' },
      })
    }
    if (paid && spec.entry !== null) {
      batch.set(doc(db, 'ledger/e-new'), drawEntry(writer, { account: payer, ...spec.entry }))
    }
    if (paid && spec.balance !== null) {
      batch.update(doc(db, `users/${payer}`), { lp: 2, lpEntryId: 'e-new', ...spec.balance })
    }
    return batch.commit()
  }

  describe('allowed', () => {
    // The heaviest request of the app: five documents, each checking the others. It must stay within the
    // rules' lookup limits.
    it("allows a player's paid draw of a pool card: five documents in one batch", async () => {
      await assertSucceeds(draw('ayla'))
      expect(await readAsAdmin('draws/d-new')).toMatchObject({ uid: 'ayla', entryId: 'e-new' })
      expect(await readAsAdmin('userCards/h-new')).toMatchObject({
        givenVia: 'draw',
        drawId: 'd-new',
      })
      expect(await readAsAdmin(`cards/${POOL}`)).toMatchObject({
        holder: { uid: 'ayla', userCardId: 'h-new' },
      })
      expect(await readAsAdmin('ledger/e-new')).toMatchObject({
        source: 'draw',
        delta: -1,
        balanceAfter: 2,
        reason: null,
        drawId: 'd-new',
      })
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 2, lpEntryId: 'e-new' })
    })

    it("allows a player's paid draw of a Blessed card, which keeps no holder", async () => {
      await assertSucceeds(draw('ayla', { card: BLESSED_CARD }))
      expect(await readAsAdmin(`cards/${BLESSED}`)).toMatchObject({ holder: null })
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 2 })
    })

    it("allows a player's free Cursed draw for themselves", async () => {
      await assertSucceeds(draw('ayla', { card: CURSED_CARD }))
      expect(await readAsAdmin('draws/d-new')).toMatchObject({ kind: 'cursed', paidWith: 'none' })
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 3, lpEntryId: 'e-old' })
    })

    it("allows the DM's free draw into a player's hand, with filters", async () => {
      await setLp('ayla', 0)
      await assertSucceeds(draw('dana', { uid: 'ayla', draw: { filters: FILTERS } }))
      expect(await readAsAdmin('draws/d-new')).toMatchObject({ by: 'dana', filters: FILTERS })
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 0 })
    })

    it("allows the DM's Cursed draw into a player's hand", async () => {
      await assertSucceeds(draw('dana', { uid: 'bora', card: CURSED_CARD }))
    })

    it("allows the DM's draw into the DM's own hand", async () => {
      await assertSucceeds(draw('dana', { card: BLESSED_CARD }))
    })

    it('lets every signed-in user read every draw', async () => {
      await draw('ayla')
      await assertSucceeds(getDoc(doc(asUser('bora'), 'draws/d-new')))
      await assertSucceeds(getDocs(collection(asUser('bora'), 'draws')))
      await assertSucceeds(
        getDocs(query(collection(asUser('bora'), 'draws'), where('uid', '==', 'ayla'))),
      )
    })
  })

  describe('denied', () => {
    it('denies signed-out reads', async () => {
      await draw('ayla')
      const db = firestoreOf(testEnv.unauthenticatedContext())
      await assertFails(getDoc(doc(db, 'draws/d-new')))
      await assertFails(getDocs(collection(db, 'draws')))
    })

    it("denies a player's draw into another player's hand, random or Cursed", async () => {
      await setLp('bora', 3)
      await assertFails(draw('ayla', { uid: 'bora' }))
      await assertFails(draw('ayla', { uid: 'bora', paid: false }))
      await assertFails(draw('ayla', { uid: 'bora', card: CURSED_CARD }))
      await assertFails(draw('ayla', { uid: 'bora', payer: 'ayla' }))
      expect(await readAsAdmin('draws/d-new')).toBeUndefined()
    })

    it("denies a player's free random draw, and a player's draw with filters", async () => {
      await assertFails(draw('ayla', { paid: false }))
      await assertFails(draw('ayla', { draw: { filters: FILTERS } }))
      await assertFails(draw('ayla', { paid: false, draw: { filters: FILTERS } }))
    })

    it('denies a draw without its holding, and a holding given via a draw without its draw', async () => {
      await assertFails(draw('ayla', { holding: null, takesCard: false }))
      await assertFails(draw('dana', { uid: 'ayla', card: BLESSED_CARD, holding: null }))
      const db = asUser('ayla')
      const batch = writeBatch(db)
      batch.set(
        doc(db, 'userCards/h-new'),
        newHolding({ uid: 'ayla', givenBy: 'ayla', givenVia: 'draw', drawId: 'd-none' }),
      )
      batch.update(doc(db, `cards/${POOL}`), { holder: { uid: 'ayla', userCardId: 'h-new' } })
      await assertFails(batch.commit())
      await assertFails(
        setDoc(
          doc(asUser('ayla'), 'userCards/h-new'),
          newHolding({ ...CURSED_CARD, givenBy: 'ayla', givenVia: 'draw', drawId: 'd-none' }),
        ),
      )
    })

    it('denies a paid draw without its entry, without the lower LP, or paying 2 LP', async () => {
      await assertFails(draw('ayla', { entry: null }))
      await assertFails(draw('ayla', { balance: null }))
      await assertFails(draw('ayla', { entry: { delta: -2, balanceAfter: 1 }, balance: { lp: 1 } }))
      await assertFails(draw('ayla', { draw: { cost: 2 } }))
      await assertFails(draw('ayla', { draw: { paidWith: 'none' } }))
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 3 })
    })

    it('denies a paid draw at 0 LP', async () => {
      await setLp('ayla', 0)
      await assertFails(draw('ayla', { entry: { balanceAfter: -1 }, balance: { lp: -1 } }))
      await assertFails(draw('ayla', { entry: { balanceAfter: 0 }, balance: { lp: 0 } }))
    })

    it('denies a random draw of a held normal card, a Cursed card, or a retired card', async () => {
      await assertFails(draw('ayla', { card: HELD_CARD }))
      await assertFails(draw('ayla', { card: HELD_CARD, takesCard: false }))
      await assertFails(draw('ayla', { card: CURSED_CARD, kind: 'random' }))
      await assertFails(draw('dana', { uid: 'ayla', card: CURSED_CARD, kind: 'random' }))
      await assertFails(draw('ayla', { card: RETIRED_CARD }))
      expect(await readAsAdmin(`cards/${HELD}`)).toMatchObject({
        holder: { uid: 'bora', userCardId: 'h-bora' },
      })
    })

    it('denies a Cursed draw of a normal card, and a Cursed draw with filters', async () => {
      await assertFails(draw('ayla', { kind: 'cursed', paid: false }))
      await assertFails(
        draw('dana', { uid: 'ayla', card: CURSED_CARD, draw: { filters: FILTERS } }),
      )
    })

    it('denies a drawn holding whose card, hand, or kind disagrees with its draw', async () => {
      const other = OTHER_CARD.cardId
      await assertFails(draw('ayla', { holding: { cardId: other }, holderCard: other }))
      await assertFails(draw('ayla', { holding: { cardName: 'Other name' } }))
      await assertFails(draw('dana', { uid: 'ayla', card: BLESSED_CARD, holding: { uid: 'bora' } }))
      await assertFails(
        draw('dana', {
          uid: 'ayla',
          card: { ...BLESSED_CARD, cardKind: 'normal' },
          holding: { cardKind: 'blessed' },
          takesCard: false,
        }),
      )
      await assertFails(draw('ayla', { holding: { active: true } }))
      await assertFails(draw('ayla', { holding: { note: 'Not' } }))
      await assertFails(draw('ayla', { holding: { costOverride: 'd6' } }))
      await assertFails(draw('ayla', { holding: { drawId: 'd-other' } }))
      await assertFails(draw('ayla', { draw: { holdingId: 'h-other' } }))
    })

    it('denies two holdings for one draw, and two draws for one holding', async () => {
      const db = asUser('dana')
      const twoHoldings = writeBatch(db)
      twoHoldings.set(doc(db, 'draws/d-new'), {
        kind: 'random',
        uid: 'ayla',
        by: 'dana',
        at: serverTimestamp(),
        ...BLESSED_CARD,
        holdingId: 'h-new',
        filters: null,
        paidWith: 'none',
        cost: 0,
        entryId: null,
      })
      for (const id of ['h-new', 'h-two']) {
        twoHoldings.set(
          doc(db, `userCards/${id}`),
          newHolding({ ...BLESSED_CARD, givenVia: 'draw', drawId: 'd-new' }),
        )
      }
      await assertFails(twoHoldings.commit())

      const twoDraws = writeBatch(db)
      for (const id of ['d-new', 'd-two']) {
        twoDraws.set(doc(db, `draws/${id}`), {
          kind: 'random',
          uid: 'ayla',
          by: 'dana',
          at: serverTimestamp(),
          ...BLESSED_CARD,
          holdingId: 'h-new',
          filters: null,
          paidWith: 'none',
          cost: 0,
          entryId: null,
        })
      }
      twoDraws.set(
        doc(db, 'userCards/h-new'),
        newHolding({ ...BLESSED_CARD, givenVia: 'draw', drawId: 'd-two' }),
      )
      await assertFails(twoDraws.commit())
    })

    it('denies two draws paid with one entry, and a payment for a free Cursed draw', async () => {
      const db = asUser('ayla')
      const twoDraws = writeBatch(db)
      for (const [drawId, holdingId] of [
        ['d-new', 'h-new'],
        ['d-two', 'h-two'],
      ] as const) {
        twoDraws.set(doc(db, `draws/${drawId}`), {
          kind: 'random',
          uid: 'ayla',
          by: 'ayla',
          at: serverTimestamp(),
          ...BLESSED_CARD,
          holdingId,
          filters: null,
          paidWith: 'lp',
          cost: 1,
          entryId: 'e-new',
        })
        twoDraws.set(
          doc(db, `userCards/${holdingId}`),
          newHolding({ ...BLESSED_CARD, givenBy: 'ayla', givenVia: 'draw', drawId }),
        )
      }
      twoDraws.set(doc(db, 'ledger/e-new'), drawEntry('ayla', { drawId: 'd-two' }))
      twoDraws.update(doc(db, 'users/ayla'), { lp: 2, lpEntryId: 'e-new' })
      await assertFails(twoDraws.commit())

      const paidCursed = writeBatch(db)
      paidCursed.set(doc(db, 'ledger/e-new'), drawEntry('ayla'))
      paidCursed.update(doc(db, 'users/ayla'), { lp: 2, lpEntryId: 'e-new' })
      paidCursed.set(doc(db, 'draws/d-new'), {
        kind: 'cursed',
        uid: 'ayla',
        by: 'ayla',
        at: serverTimestamp(),
        ...CURSED_CARD,
        holdingId: 'h-new',
        filters: null,
        paidWith: 'none',
        cost: 0,
        entryId: null,
      })
      paidCursed.set(
        doc(db, 'userCards/h-new'),
        newHolding({ ...CURSED_CARD, givenBy: 'ayla', givenVia: 'draw', drawId: 'd-new' }),
      )
      await assertFails(paidCursed.commit())
    })

    it('denies a player creating a holding given via "dm", even with a draw', async () => {
      await assertFails(draw('ayla', { holding: { givenVia: 'dm', drawId: null } }))
      await assertFails(
        setDoc(
          doc(asUser('ayla'), 'userCards/h-new'),
          newHolding({ ...BLESSED_CARD, givenBy: 'ayla' }),
        ),
      )
    })

    it('denies a player lowering their own LP with an entry by hand', async () => {
      const db = asUser('ayla')
      const batch = writeBatch(db)
      batch.set(doc(db, 'ledger/e-new'), {
        currency: 'lp',
        account: 'ayla',
        delta: -1,
        balanceAfter: 2,
        source: 'manual',
        reason: 'Kart çekme',
        drawId: null,
        by: 'ayla',
        at: serverTimestamp(),
      })
      batch.update(doc(db, 'users/ayla'), { lp: 2, lpEntryId: 'e-new' })
      await assertFails(batch.commit())
      await assertFails(draw('ayla', { entry: { source: 'manual', reason: 'Kart çekme' } }))
    })

    it("denies a player paying for a draw with another player's LP", async () => {
      await setLp('bora', 3)
      await assertFails(draw('ayla', { payer: 'bora' }))
      await assertFails(draw('bora', { uid: 'ayla', payer: 'bora' }))
      expect(await readAsAdmin('users/bora')).toMatchObject({ lp: 3 })
    })

    it('denies a draw payment with a reason, and a change by hand without one', async () => {
      await assertFails(draw('ayla', { entry: { reason: 'Kart çekme' } }))
      const db = asUser('dana')
      const batch = writeBatch(db)
      batch.set(doc(db, 'ledger/e-new'), {
        currency: 'lp',
        account: 'ayla',
        delta: 2,
        balanceAfter: 5,
        source: 'manual',
        reason: null,
        drawId: null,
        by: 'dana',
        at: serverTimestamp(),
      })
      batch.update(doc(db, 'users/ayla'), { lp: 5, lpEntryId: 'e-new' })
      await assertFails(batch.commit())
    })

    it('denies a drawer other than the writer, a time other than now, and bad filters', async () => {
      await assertFails(draw('ayla', { draw: { by: 'bora' } }))
      await assertFails(draw('ayla', { draw: { at: Timestamp.fromMillis(5) } }))
      await assertFails(draw('ayla', { entry: { at: Timestamp.fromMillis(5) } }))
      await assertFails(draw('ayla', { draw: { extra: true } }))
      await assertFails(
        draw('dana', { uid: 'ayla', draw: { filters: { ...FILTERS, rarity: 'epic' } } }),
      )
      await assertFails(
        draw('dana', { uid: 'ayla', draw: { filters: { ...FILTERS, keyword: 'x'.repeat(101) } } }),
      )
      await assertFails(draw('dana', { uid: 'ayla', draw: { filters: { rarity: 'rare' } } }))
    })

    it('denies updating or deleting a draw, even by the DM', async () => {
      await assertSucceeds(draw('ayla'))
      await assertFails(updateDoc(doc(asUser('dana'), 'draws/d-new'), { cardName: 'Changed' }))
      await assertFails(updateDoc(doc(asUser('ayla'), 'draws/d-new'), { cardName: 'Changed' }))
      await assertFails(deleteDoc(doc(asUser('dana'), 'draws/d-new')))
      await assertFails(deleteDoc(doc(asUser('ayla'), 'draws/d-new')))
    })
  })
})
