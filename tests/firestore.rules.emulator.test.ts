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
    status: 'active',
  }
  const CARD_PATH = 'cards/legend-abolethseyes'
  const DRAFT_PATH = 'cards/legend-bardsencore'

  beforeEach(async () => {
    // Bob is a player, Dana is the DM.
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
      await setDoc(doc(db, 'cards/cursed-hex'), {
        ...seededCard,
        kind: 'cursed',
        setCode: null,
        rarity: null,
        mechanicPack: null,
        status: 'retired',
      })
      await setDoc(doc(db, DRAFT_PATH), {
        ...seededCard,
        name: "Bard's Encore",
        nameKey: 'bardsencore',
        status: 'draft',
        changeId: 'c-draft',
      })
    })
  })

  const as = (uid: string) => firestoreOf(testEnv.authenticatedContext(uid))
  const visibleToPlayers = (db: Firestore) =>
    query(collection(db, 'cards'), where('status', 'in', ['active', 'retired']))

  it('lets a player read the active and retired cards, and query them by status', async () => {
    await assertSucceeds(getDoc(doc(as('bob'), CARD_PATH)))
    await assertSucceeds(getDoc(doc(as('bob'), 'cards/cursed-hex')))
    const visible = await assertSucceeds(getDocs(visibleToPlayers(as('bob'))))
    expect(visible.docs.map((card) => card.id).sort()).toEqual([
      'cursed-hex',
      'legend-abolethseyes',
    ])
  })

  it('denies a player a draft, and a query that could return one', async () => {
    await assertFails(getDoc(doc(as('bob'), DRAFT_PATH)))
    await assertFails(getDocs(collection(as('bob'), 'cards')))
    await assertFails(
      getDocs(query(collection(as('bob'), 'cards'), where('status', '==', 'draft'))),
    )
  })

  it('lets the DM read every card, the drafts included', async () => {
    await assertSucceeds(getDoc(doc(as('dana'), DRAFT_PATH)))
    const all = await assertSucceeds(getDocs(collection(as('dana'), 'cards')))
    expect(all.size).toBe(3)
  })

  it('denies signed-out reads', async () => {
    const db = firestoreOf(testEnv.unauthenticatedContext())
    await assertFails(getDoc(doc(db, CARD_PATH)))
    await assertFails(getDocs(visibleToPlayers(db)))
  })

  it.each(['bob', 'dana'])(
    'denies %s creating, changing or deleting a card without its change record',
    async (uid) => {
      const db = as(uid)
      await assertFails(
        setDoc(doc(db, 'cards/legend-newcard'), {
          ...seededCard,
          name: 'New Card',
          nameKey: 'newcard',
          changeId: 'c-none',
        }),
      )
      await assertFails(updateDoc(doc(db, CARD_PATH), { text: 'Changed by the app.' }))
      await assertFails(updateDoc(doc(db, CARD_PATH), { text: 'Changed.', changeId: 'c-none' }))
      await assertFails(setDoc(doc(db, CARD_PATH), { ...seededCard, text: 'Overwritten.' }))
      await assertFails(deleteDoc(doc(db, DRAFT_PATH)))
      expect(await readAsAdmin(CARD_PATH)).toEqual(seededCard)
      expect(await readAsAdmin('cards/legend-newcard')).toBeUndefined()
    },
  )
})

describe('definition steps (cards, trueWords and definitionChanges)', () => {
  const CARD_KEYS = [
    'kind',
    'name',
    'nameKey',
    'setCode',
    'cost',
    'rarity',
    'mechanicPack',
    'text',
    'status',
  ]
  const WORD_KEYS = ['name', 'nameKey', 'cost', 'text', 'status']
  type Definition = Record<string, unknown>
  type Status = 'draft' | 'active' | 'retired' | null

  const card = (name: string, extra: Definition = {}): Definition => ({
    kind: 'normal',
    name,
    nameKey: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    setCode: 'Kesqer',
    cost: '2',
    rarity: 'common',
    mechanicPack: 'Arcanus Divine',
    text: `${name} text.`,
    status: 'active',
    ...extra,
  })
  const word = (name: string, extra: Definition = {}): Definition => ({
    name,
    nameKey: name.toLowerCase(),
    cost: '1',
    text: `${name} text.`,
    status: 'active',
    ...extra,
  })

  const EYES = 'legend-abolethseyes'
  const OLD = 'legend-oldcard'
  const ENCORE = 'legend-bardsencore'
  const MAP = 'legend-thecartographer'
  const HEX = 'cursed-hex'
  /** An active DM-only card. */
  const WISH = 'legend-thelastwish'

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await setDoc(doc(db, 'users/ayla'), seededUser('player', 'Ayla'))
      await setDoc(doc(db, 'users/dana'), seededUser('dm', 'Dana'))
      await setDoc(doc(db, `cards/${EYES}`), card("Aboleth's Eyes", { holder: null }))
      await setDoc(
        doc(db, `cards/${OLD}`),
        card('Old Card', { status: 'retired', changeId: 'c-old' }),
      )
      // A complete draft, and an incomplete one as an import adds it.
      await setDoc(
        doc(db, `cards/${ENCORE}`),
        card("Bard's Encore", { status: 'draft', changeId: 'c-encore' }),
      )
      await setDoc(
        doc(db, `cards/${MAP}`),
        card('The Cartographer', {
          status: 'draft',
          setCode: null,
          rarity: null,
          mechanicPack: null,
          changeId: 'c-import',
        }),
      )
      await setDoc(
        doc(db, `cards/${HEX}`),
        card('Hex', { kind: 'cursed', setCode: null, rarity: null, mechanicPack: null }),
      )
      await setDoc(
        doc(db, `cards/${WISH}`),
        card('The Last Wish', { dmOnly: true, holder: null, changeId: 'c-wish' }),
      )
      await setDoc(doc(db, 'trueWords/tw-abyss'), word('Abyss'))
      await setDoc(doc(db, 'trueWords/tw-old'), word('Old', { status: 'retired' }))
      await setDoc(
        doc(db, 'trueWords/tw-echo'),
        word('Echo', { status: 'draft', cost: null, text: '', changeId: 'c-echo' }),
      )
      const at = Timestamp.fromMillis(1000)
      const record = { target: 'card', targetId: ENCORE, name: "Bard's Encore", by: 'dana', at }
      await setDoc(doc(db, 'definitionChanges/c-public'), {
        ...record,
        step: 'retired',
        before: card("Bard's Encore"),
        after: card("Bard's Encore", { status: 'retired' }),
        public: true,
      })
      await setDoc(doc(db, 'definitionChanges/c-encore'), {
        ...record,
        step: 'added',
        before: null,
        after: card("Bard's Encore", { status: 'draft' }),
        public: false,
      })
    })
  })

  const pick = (keys: readonly string[], data: Definition) =>
    Object.fromEntries(keys.map((key) => [key, data[key]]))
  /**
   * A definition as a record keeps it: its fields, and its picture, `null` when it has none. A card's also has its
   * DM-only flag, `false` when it has none.
   */
  const snapshot = (keys: readonly string[], data: Definition): Definition => ({
    ...pick(keys, data),
    picture: data.picture ?? null,
    ...(keys === CARD_KEYS ? { dmOnly: data.dmOnly ?? false } : {}),
  })
  const statusOf = (data: Definition | null): Status => (data?.status as Status) ?? null
  const stepName = (before: Status, after: Status) =>
    before === null
      ? 'added'
      : after === null
        ? 'deleted'
        : before === after
          ? 'edited'
          : before === 'draft'
            ? 'published'
            : after === 'retired'
              ? 'retired'
              : 'restored'
  const isPlayerVisible = (data: Definition | null) =>
    (statusOf(data) === 'active' || statusOf(data) === 'retired') && data?.dmOnly !== true

  type StepSpec = {
    /** The change record's ID. Default: `c-new`, or the fixed delete ID for a delete. */
    changeId?: string
    /** Fields that replace the record's computed ones. */
    record?: Definition
    /** Leave out the definition's change, or its record. */
    withoutChange?: boolean
    withoutRecord?: boolean
  }

  /**
   * One DM step as the app writes it: the definition (created, merged or deleted) with its change record, in one
   * batch. `changes` are merged into the stored definition; `null` deletes it. The picture and the DM-only flag are
   * written only when `changes` names them, so a definition without the field keeps it absent.
   */
  async function step(
    uid: string,
    target: 'card' | 'word',
    id: string,
    changes: Definition | null,
    spec: StepSpec = {},
  ) {
    const path = `${target === 'card' ? 'cards' : 'trueWords'}/${id}`
    const keys = target === 'card' ? CARD_KEYS : WORD_KEYS
    const stored = (await readAsAdmin(path)) as Definition | undefined
    const merged = { ...stored, ...changes }
    const before = stored ? snapshot(keys, stored) : null
    const after = changes === null ? null : snapshot(keys, merged)
    const written =
      changes === null
        ? null
        : {
            ...pick(keys, merged),
            ...('picture' in changes ? { picture: changes.picture } : {}),
            ...('dmOnly' in changes ? { dmOnly: changes.dmOnly } : {}),
          }
    const changeId =
      spec.changeId ?? (after === null ? `del-${id}-${String(stored?.changeId)}` : 'c-new')
    const db = asUser(uid)
    const batch = writeBatch(db)
    if (!spec.withoutChange) {
      if (written === null) batch.delete(doc(db, path))
      else batch.set(doc(db, path), { ...written, changeId }, { merge: true })
    }
    if (!spec.withoutRecord) {
      batch.set(doc(db, `definitionChanges/${changeId}`), {
        target,
        targetId: id,
        name: (after ?? before)?.name,
        step: stepName(statusOf(before), statusOf(after)),
        before,
        after,
        public: isPlayerVisible(before) || isPlayerVisible(after),
        by: uid,
        at: serverTimestamp(),
        ...spec.record,
      })
    }
    return batch.commit()
  }

  async function openPack() {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), 'table/main'), { openPackId: 'p-open' })
    })
  }

  describe('allowed', () => {
    it('lets the DM add an unfinished draft, which players cannot read', async () => {
      const draft = card('Lute Song', { status: 'draft', text: '', rarity: null })
      await assertSucceeds(step('dana', 'card', 'legend-lutesong', draft))
      expect(await readAsAdmin('cards/legend-lutesong')).toMatchObject({
        status: 'draft',
        changeId: 'c-new',
      })
      await assertFails(getDoc(doc(asUser('ayla'), 'cards/legend-lutesong')))
      await assertFails(getDoc(doc(asUser('ayla'), 'definitionChanges/c-new')))
      await assertSucceeds(getDoc(doc(asUser('dana'), 'definitionChanges/c-new')))
    })

    it('lets the DM add a complete card straight to active, with a public record', async () => {
      await assertSucceeds(
        step(
          'dana',
          'card',
          'cursed-hollowbones',
          card('Hollow Bones', { kind: 'cursed', setCode: null, rarity: null, mechanicPack: null }),
        ),
      )
      expect(await readAsAdmin('definitionChanges/c-new')).toMatchObject({
        step: 'added',
        public: true,
      })
      await assertSucceeds(getDoc(doc(asUser('ayla'), 'definitionChanges/c-new')))
    })

    it.each([
      ['an active card', EYES],
      ['a retired card', OLD],
      ['a draft', ENCORE],
    ])('lets the DM edit %s', async (_case, id) => {
      await assertSucceeds(step('dana', 'card', id, { cost: '3', text: 'Fixed text.' }))
      expect(await readAsAdmin(`cards/${id}`)).toMatchObject({ cost: '3', changeId: 'c-new' })
    })

    it('lets the DM publish a complete draft, with fields changed in the same step', async () => {
      // The heaviest step: the card, the table check and the record. It must stay within the lookup limits.
      await assertSucceeds(step('dana', 'card', ENCORE, { status: 'active', cost: '5' }))
      expect(await readAsAdmin(`cards/${ENCORE}`)).toMatchObject({ status: 'active', cost: '5' })
      expect(await readAsAdmin('definitionChanges/c-new')).toMatchObject({
        step: 'published',
        public: true,
      })
    })

    it('lets the DM retire an active card and bring it back', async () => {
      await assertSucceeds(step('dana', 'card', EYES, { status: 'retired' }, { changeId: 'c-1' }))
      await assertSucceeds(step('dana', 'card', EYES, { status: 'active' }, { changeId: 'c-2' }))
      expect(await readAsAdmin('definitionChanges/c-2')).toMatchObject({ step: 'restored' })
    })

    it('lets the DM delete a draft, with the record its newest record fixes', async () => {
      await assertSucceeds(step('dana', 'card', ENCORE, null))
      expect(await readAsAdmin(`cards/${ENCORE}`)).toBeUndefined()
      expect(await readAsAdmin(`definitionChanges/del-${ENCORE}-c-encore`)).toMatchObject({
        step: 'deleted',
        after: null,
        public: false,
      })
    })

    it('lets the DM change a draft between normal and Blessed, also as it is published', async () => {
      await assertSucceeds(
        step(
          'dana',
          'card',
          ENCORE,
          { kind: 'blessed', setCode: null, rarity: null },
          { changeId: 'c-1' },
        ),
      )
      await assertSucceeds(
        step(
          'dana',
          'card',
          ENCORE,
          { kind: 'normal', setCode: 'Kesqer', rarity: 'rare', status: 'active' },
          { changeId: 'c-2' },
        ),
      )
    })

    it('lets the DM fix a text while a pack is open', async () => {
      await openPack()
      await assertSucceeds(step('dana', 'card', EYES, { text: 'Typo fixed.' }))
    })

    describe('DM-only cards', () => {
      it('lets the DM mark an active card DM-only and back, each with a public record', async () => {
        await assertSucceeds(step('dana', 'card', EYES, { dmOnly: true }, { changeId: 'c-1' }))
        expect(await readAsAdmin(`cards/${EYES}`)).toMatchObject({ dmOnly: true })
        expect(await readAsAdmin('definitionChanges/c-1')).toMatchObject({
          step: 'edited',
          public: true,
          before: { dmOnly: false },
          after: { dmOnly: true },
        })
        await assertSucceeds(getDoc(doc(asUser('ayla'), 'definitionChanges/c-1')))
        await assertSucceeds(step('dana', 'card', EYES, { dmOnly: false }, { changeId: 'c-2' }))
        await assertSucceeds(getDoc(doc(asUser('ayla'), 'definitionChanges/c-2')))
      })

      it('keeps the records of work on a DM-only card from players', async () => {
        await assertSucceeds(step('dana', 'card', WISH, { text: 'Other.' }, { changeId: 'c-1' }))
        expect(await readAsAdmin('definitionChanges/c-1')).toMatchObject({ public: false })
        await assertFails(getDoc(doc(asUser('ayla'), 'definitionChanges/c-1')))
        await assertSucceeds(step('dana', 'card', WISH, { status: 'retired' }, { changeId: 'c-2' }))
        expect(await readAsAdmin('definitionChanges/c-2')).toMatchObject({ public: false })
      })

      it('lets the DM add a DM-only draft and a DM-only Cursed card straight to active', async () => {
        await assertSucceeds(
          step(
            'dana',
            'card',
            'legend-lutesong',
            card('Lute Song', { status: 'draft', dmOnly: true }),
            { changeId: 'c-1' },
          ),
        )
        await assertSucceeds(
          step(
            'dana',
            'card',
            'cursed-hollowbones',
            card('Hollow Bones', {
              kind: 'cursed',
              setCode: null,
              rarity: null,
              mechanicPack: null,
              dmOnly: true,
            }),
            { changeId: 'c-2' },
          ),
        )
        expect(await readAsAdmin('definitionChanges/c-2')).toMatchObject({ public: false })
      })

      it('lets players read a DM-only card, as the hands need it', async () => {
        await assertSucceeds(getDoc(doc(asUser('ayla'), `cards/${WISH}`)))
      })
    })

    describe('pictures', () => {
      const EYES_PICTURE = `cards/${EYES}/93e6f39a91.webp`

      it.each([
        ['a picture', 'cards/legend-lutesong/93e6f39a91.webp'],
        ['a removed picture', null],
      ])('lets the DM add a card with %s', async (_case, picture) => {
        await assertSucceeds(
          step('dana', 'card', 'legend-lutesong', card('Lute Song', { status: 'draft', picture })),
        )
        expect(await readAsAdmin('cards/legend-lutesong')).toMatchObject({ picture })
        expect(await readAsAdmin('definitionChanges/c-new')).toMatchObject({
          after: { picture },
        })
      })

      it('lets the DM give an active card a picture while a pack is open, then replace and remove it', async () => {
        await openPack()
        await assertSucceeds(
          step('dana', 'card', EYES, { picture: EYES_PICTURE }, { changeId: 'c-1' }),
        )
        expect(await readAsAdmin('definitionChanges/c-1')).toMatchObject({
          step: 'edited',
          before: { picture: null },
          after: { picture: EYES_PICTURE },
        })
        const next = `cards/${EYES}/0123456789.webp`
        await assertSucceeds(step('dana', 'card', EYES, { picture: next }, { changeId: 'c-2' }))
        await assertSucceeds(step('dana', 'card', EYES, { picture: null }, { changeId: 'c-3' }))
        expect(await readAsAdmin(`cards/${EYES}`)).toMatchObject({ picture: null })
        expect(await readAsAdmin('definitionChanges/c-3')).toMatchObject({
          before: { picture: next },
          after: { picture: null },
        })
      })

      it('keeps the field absent when the DM edits a card that never had a picture', async () => {
        await assertSucceeds(step('dana', 'card', EYES, { text: 'Other.' }))
        expect(await readAsAdmin(`cards/${EYES}`)).not.toHaveProperty('picture')
      })

      it('lets the DM publish a draft together with its picture', async () => {
        await assertSucceeds(
          step('dana', 'card', ENCORE, {
            status: 'active',
            picture: `cards/${ENCORE}/abcdef0123.webp`,
          }),
        )
      })

      it('lets the DM give a retired word a picture and keep it when bringing the word back', async () => {
        const picture = 'words/tw-old/abcdef0123.webp'
        await assertSucceeds(step('dana', 'word', 'tw-old', { picture }, { changeId: 'c-1' }))
        await assertSucceeds(
          step('dana', 'word', 'tw-old', { status: 'active' }, { changeId: 'c-2' }),
        )
        expect(await readAsAdmin('trueWords/tw-old')).toMatchObject({ picture, status: 'active' })
      })

      it('lets the DM add a word with a picture', async () => {
        await assertSucceeds(
          step(
            'dana',
            'word',
            'tw-lull',
            word('Lull', { picture: 'words/tw-lull/abcdef0123.webp' }),
          ),
        )
      })
    })

    it('lets the DM add, edit, publish, retire, bring back and delete True Words', async () => {
      await assertSucceeds(
        step('dana', 'word', 'tw-lull', word('Lull', { status: 'draft', cost: null }), {
          changeId: 'c-1',
        }),
      )
      await assertSucceeds(step('dana', 'word', 'tw-lull', { cost: '2' }, { changeId: 'c-2' }))
      await assertSucceeds(
        step('dana', 'word', 'tw-lull', { status: 'active' }, { changeId: 'c-3' }),
      )
      await assertSucceeds(step('dana', 'word', 'tw-lull', { text: 'New.' }, { changeId: 'c-4' }))
      await assertSucceeds(
        step('dana', 'word', 'tw-lull', { status: 'retired' }, { changeId: 'c-5' }),
      )
      await assertSucceeds(
        step('dana', 'word', 'tw-lull', { status: 'active' }, { changeId: 'c-6' }),
      )
      await assertSucceeds(step('dana', 'word', 'tw-echo', null))
      expect(await readAsAdmin('trueWords/tw-echo')).toBeUndefined()
    })
  })

  describe('denied', () => {
    it.each<[string, string, string, Definition | null, StepSpec?]>([
      ['publishing an incomplete draft', 'card', MAP, { status: 'active' }],
      [
        'adding an incomplete card straight to active',
        'card',
        'legend-lutesong',
        card('Lute Song', { text: '' }),
      ],
      ['emptying the text of an active card', 'card', EYES, { text: '' }],
      ['emptying the mechanic pack of a retired card', 'card', OLD, { mechanicPack: null }],
      ['making an active card a draft', 'card', EYES, { status: 'draft' }],
      ['making a retired card a draft', 'card', OLD, { status: 'draft' }],
      ['retiring a draft', 'card', ENCORE, { status: 'retired' }],
      ['retiring with a change of text', 'card', EYES, { status: 'retired', text: 'Other.' }],
      ['deleting an active card', 'card', EYES, null, { changeId: `del-${EYES}-null` }],
      ['deleting a retired card', 'card', OLD, null],
      [
        'changing the kind of an active card',
        'card',
        EYES,
        { kind: 'blessed', setCode: null, rarity: null },
      ],
      [
        'making a Legend draft Cursed',
        'card',
        ENCORE,
        { kind: 'cursed', setCode: null, rarity: null, mechanicPack: null },
      ],
      [
        'a Cursed card under a Legend ID',
        'card',
        'legend-hollowbones',
        card('Hollow Bones', { kind: 'cursed', setCode: null, rarity: null, mechanicPack: null }),
      ],
      ['a Blessed card with a set', 'card', ENCORE, { kind: 'blessed', rarity: null }],
      ['a change without its record', 'card', EYES, { text: 'Other.' }, { withoutRecord: true }],
      ['a record without its change', 'card', EYES, { text: 'Other.' }, { withoutChange: true }],
      [
        'a record whose before is stale',
        'card',
        EYES,
        { text: 'Other.' },
        { record: { before: card("Aboleth's Eyes", { cost: '9' }) } },
      ],
      [
        'a draft-work record marked public',
        'card',
        ENCORE,
        { text: 'Other.' },
        { record: { public: true } },
      ],
      [
        'a public change marked private',
        'card',
        EYES,
        { text: 'Other.' },
        { record: { public: false } },
      ],
      [
        'a record that names the wrong step',
        'card',
        ENCORE,
        { status: 'active' },
        { record: { step: 'edited' } },
      ],
      [
        'a record under another name',
        'card',
        EYES,
        { text: 'Other.' },
        { record: { name: 'Other' } },
      ],
      ['a record by someone else', 'card', EYES, { text: 'Other.' }, { record: { by: 'ayla' } }],
      [
        'a record of work on a DM-only card marked public',
        'card',
        WISH,
        { text: 'Other.' },
        { record: { public: true } },
      ],
      [
        'a record of a flag change marked private',
        'card',
        EYES,
        { dmOnly: true },
        { record: { public: false } },
      ],
      [
        'a record that leaves the flag out of its snapshot',
        'card',
        WISH,
        { text: 'Other.' },
        { record: { after: card('The Last Wish', { text: 'Other.', picture: null }) } },
      ],
      ['a DM-only flag that is not a boolean', 'card', EYES, { dmOnly: 'yes' }],
      [
        'deleting a draft with a record under another ID',
        'card',
        ENCORE,
        null,
        { changeId: 'c-new' },
      ],
      ['publishing an incomplete word', 'word', 'tw-echo', { status: 'active' }],
      ['retiring a draft word', 'word', 'tw-echo', { status: 'retired' }],
      ['a word under a card ID', 'word', 'legend-lull', word('Lull')],
      ['a picture of another card', 'card', EYES, { picture: 'cards/legend-hex/93e6f39a91.webp' }],
      ['a picture in the words folder', 'card', EYES, { picture: `words/${EYES}/93e6f39a91.webp` }],
      [
        'a picture with an uppercase hash',
        'card',
        EYES,
        { picture: `cards/${EYES}/93E6F39A91.webp` },
      ],
      ['a picture that is not WebP', 'card', EYES, { picture: `cards/${EYES}/93e6f39a91.png` }],
      ['a picture that is an address', 'card', EYES, { picture: 'https://example.com/a.webp' }],
      ['a picture that is not text', 'card', EYES, { picture: 7 }],
      [
        'a new card with a picture of another card',
        'card',
        'legend-lutesong',
        card('Lute Song', { status: 'draft', picture: `cards/${EYES}/93e6f39a91.webp` }),
      ],
      [
        'retiring with a change of picture',
        'card',
        EYES,
        { status: 'retired', picture: `cards/${EYES}/93e6f39a91.webp` },
      ],
      [
        'a record whose picture disagrees with the card',
        'card',
        EYES,
        { picture: `cards/${EYES}/93e6f39a91.webp` },
        { record: { after: card("Aboleth's Eyes", { picture: null }) } },
      ],
      [
        'a record that leaves out a picture change',
        'card',
        EYES,
        { picture: `cards/${EYES}/93e6f39a91.webp` },
        { record: { after: card("Aboleth's Eyes") } },
      ],
      [
        'a word picture in the cards folder',
        'word',
        'tw-abyss',
        { picture: 'cards/tw-abyss/abcdef0123.webp' },
      ],
      [
        'retiring a word with a change of picture',
        'word',
        'tw-abyss',
        { status: 'retired', picture: 'words/tw-abyss/abcdef0123.webp' },
      ],
    ])('denies %s', async (_case, target, id, changes, spec) => {
      await assertFails(step('dana', target as 'card' | 'word', id, changes, spec))
    })

    it('denies every status step while a pack is open', async () => {
      await openPack()
      await assertFails(step('dana', 'card', ENCORE, { status: 'active' }))
      await assertFails(step('dana', 'card', EYES, { status: 'retired' }))
      await assertFails(step('dana', 'card', OLD, { status: 'active' }))
      await assertFails(step('dana', 'card', ENCORE, null))
      await assertFails(step('dana', 'card', 'legend-lutesong', card('Lute Song')))
      await assertFails(step('dana', 'word', 'tw-abyss', { status: 'retired' }))
      // Adding a draft stays possible.
      await assertSucceeds(
        step('dana', 'card', 'legend-lutesong', card('Lute Song', { status: 'draft' })),
      )
    })

    it('denies turning the DM-only flag on or off while a pack is open, also on a draft', async () => {
      await openPack()
      await assertFails(step('dana', 'card', EYES, { dmOnly: true }))
      await assertFails(step('dana', 'card', WISH, { dmOnly: false }))
      await assertFails(step('dana', 'card', ENCORE, { dmOnly: true }))
      // Editing a DM-only card's other fields stays possible.
      await assertSucceeds(step('dana', 'card', WISH, { text: 'Typo fixed.' }))
    })

    it('denies a player setting the DM-only flag', async () => {
      await assertFails(step('ayla', 'card', EYES, { dmOnly: true }))
      await assertFails(updateDoc(doc(asUser('ayla'), `cards/${EYES}`), { dmOnly: true }))
    })

    it('denies a holder change together with a text change', async () => {
      const db = asUser('dana')
      const batch = writeBatch(db)
      batch.update(doc(db, `cards/${EYES}`), {
        holder: { uid: 'ayla', userCardId: 'h-new' },
        text: 'Other.',
        changeId: 'c-new',
      })
      await assertFails(batch.commit())
    })

    it('denies a player every step, even with a record', async () => {
      await assertFails(
        step('ayla', 'card', 'legend-lutesong', card('Lute Song', { status: 'draft' })),
      )
      await assertFails(step('ayla', 'card', EYES, { text: 'Mine now.' }))
      await assertFails(step('ayla', 'card', ENCORE, null))
      await assertFails(step('ayla', 'word', 'tw-abyss', { cost: '0' }))
      await assertFails(step('ayla', 'card', EYES, { picture: `cards/${EYES}/93e6f39a91.webp` }))
      await assertFails(step('ayla', 'word', 'tw-abyss', { picture: null }))
    })

    it('denies changing or deleting a record', async () => {
      const db = asUser('dana')
      await assertFails(updateDoc(doc(db, 'definitionChanges/c-public'), { name: 'Other' }))
      await assertFails(deleteDoc(doc(db, 'definitionChanges/c-public')))
    })
  })

  describe('reading', () => {
    it('lets a player read the public records only, also after a draft is published', async () => {
      const db = asUser('ayla')
      await assertSucceeds(getDoc(doc(db, 'definitionChanges/c-public')))
      await assertFails(getDoc(doc(db, 'definitionChanges/c-encore')))
      await assertSucceeds(
        getDocs(query(collection(db, 'definitionChanges'), where('public', '==', true))),
      )
      await assertFails(getDocs(collection(db, 'definitionChanges')))
      await step('dana', 'card', ENCORE, { status: 'active' })
      await assertFails(getDoc(doc(db, 'definitionChanges/c-encore')))
    })

    it('lets the DM read every record', async () => {
      const all = await assertSucceeds(getDocs(collection(asUser('dana'), 'definitionChanges')))
      expect(all.size).toBe(2)
    })

    it('lets a player read the active and retired words, and no draft', async () => {
      const db = asUser('ayla')
      const visible = await assertSucceeds(
        getDocs(query(collection(db, 'trueWords'), where('status', 'in', ['active', 'retired']))),
      )
      expect(visible.docs.map((entry) => entry.id).sort()).toEqual(['tw-abyss', 'tw-old'])
      await assertFails(getDoc(doc(db, 'trueWords/tw-echo')))
      await assertFails(getDocs(collection(db, 'trueWords')))
      await assertSucceeds(getDoc(doc(asUser('dana'), 'trueWords/tw-echo')))
    })

    it('denies signed-out reads of the records', async () => {
      const db = firestoreOf(testEnv.unauthenticatedContext())
      await assertFails(getDoc(doc(db, 'definitionChanges/c-public')))
    })
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
  /** A normal draft, complete but not published: only the DM reads it, and nobody gives, draws or chooses it. */
  DRAFT: 'legend-newcard',
  /** An active DM-only normal card in no hand: only the DM gives it, and nobody draws or chooses it. */
  DM_ONLY: 'legend-thelastwish',
  /** An active DM-only Cursed card. */
  DM_ONLY_CURSED: 'cursed-crownofash',
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
    status: 'active',
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
  const { POOL, HELD, BLESSED, CURSED, RETIRED, DRAFT } = HOLDINGS_SEED
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
    await setDoc(
      doc(db, `cards/${RETIRED}`),
      seededCardOf('normal', 'Old Card', { status: 'retired' }),
    )
    await setDoc(doc(db, `cards/${DRAFT}`), seededCardOf('normal', 'New Card', { status: 'draft' }))
    await setDoc(
      doc(db, `cards/${HOLDINGS_SEED.DM_ONLY}`),
      seededCardOf('normal', 'The Last Wish', { dmOnly: true, holder: null }),
    )
    await setDoc(
      doc(db, `cards/${HOLDINGS_SEED.DM_ONLY_CURSED}`),
      seededCardOf('cursed', 'Crown of Ash', { dmOnly: true }),
    )
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
  const { CURSED, BLESSED } = HOLDINGS_SEED
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

    it.each([
      ['a retired card', 'legend-oldcard', 'Old Card'],
      ['a draft', 'legend-newcard', 'New Card'],
    ])('denies giving %s', async (_case, cardId, cardName) => {
      const db = asUser('dana')
      const batch = writeBatch(db)
      batch.set(doc(db, 'userCards/new-1'), newHolding({ cardId, cardName }))
      batch.update(doc(db, `cards/${cardId}`), { holder: { uid: 'ayla', userCardId: 'new-1' } })
      await assertFails(batch.commit())
      expect(await readAsAdmin(`cards/${cardId}`)).not.toHaveProperty('holder')
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

    it('lets the DM give a DM-only card, and its holder use it, which clears the holder', async () => {
      const wish = { cardId: HOLDINGS_SEED.DM_ONLY, cardName: 'The Last Wish' }
      const dm = asUser('dana')
      const give = writeBatch(dm)
      give.set(doc(dm, 'userCards/new-1'), newHolding(wish))
      give.update(doc(dm, `cards/${wish.cardId}`), { holder: poolHolder('ayla', 'new-1') })
      await assertSucceeds(give.commit())
      await assertSucceeds(
        setDoc(
          doc(dm, 'userCards/new-2'),
          newHolding({
            ...wish,
            cardId: HOLDINGS_SEED.DM_ONLY_CURSED,
            cardName: 'Crown of Ash',
            cardKind: 'cursed',
          }),
        ),
      )

      const ayla = asUser('ayla')
      const use = writeBatch(ayla)
      use.update(doc(ayla, 'userCards/new-1'), closing('ayla', 'used'))
      use.update(doc(ayla, `cards/${wish.cardId}`), { holder: null })
      await assertSucceeds(use.commit())
      expect(await readAsAdmin(`cards/${wish.cardId}`)).toMatchObject({
        holder: null,
        dmOnly: true,
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
  const DRAFT_CARD = { cardId: HOLDINGS_SEED.DRAFT, cardName: 'New Card', cardKind: 'normal' }
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

    it('denies a random draw of a held normal card, a Cursed card, a retired card, or a draft', async () => {
      await assertFails(draw('ayla', { card: HELD_CARD }))
      await assertFails(draw('ayla', { card: HELD_CARD, takesCard: false }))
      await assertFails(draw('ayla', { card: CURSED_CARD, kind: 'random' }))
      await assertFails(draw('dana', { uid: 'ayla', card: CURSED_CARD, kind: 'random' }))
      await assertFails(draw('ayla', { card: RETIRED_CARD }))
      await assertFails(draw('ayla', { card: DRAFT_CARD }))
      expect(await readAsAdmin(`cards/${HELD}`)).toMatchObject({
        holder: { uid: 'bora', userCardId: 'h-bora' },
      })
    })

    it("denies every draw of a DM-only card, also the DM's", async () => {
      const wish = { cardId: HOLDINGS_SEED.DM_ONLY, cardName: 'The Last Wish', cardKind: 'normal' }
      const crown = {
        cardId: HOLDINGS_SEED.DM_ONLY_CURSED,
        cardName: 'Crown of Ash',
        cardKind: 'cursed',
      }
      await assertFails(draw('ayla', { card: wish }))
      await assertFails(draw('dana', { uid: 'ayla', card: wish }))
      await assertFails(draw('ayla', { card: crown }))
      await assertFails(draw('dana', { uid: 'ayla', card: crown }))
      expect(await readAsAdmin(`cards/${wish.cardId}`)).toMatchObject({ holder: null })
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

describe('packs (draws/{drawId} with kind pack, table/main, and their holdings and payments)', () => {
  const { POOL, HELD, BLESSED, CURSED, RETIRED } = HOLDINGS_SEED
  /** Five more normal cards in the pool, with the seeded pool card the cards a pack shows. */
  const PACK_CARDS = ['legend-p1', 'legend-p2', 'legend-p3', 'legend-p4']
  const OFFERED = [POOL, ...PACK_CARDS]
  /** A Cursed type shows the Cursed card third. */
  const CURSED_OFFERED = [POOL, PACK_CARDS[0], CURSED, ...PACK_CARDS.slice(1)]
  const POOL_CHOICE = { cardId: POOL, cardName: "Aboleth's Eyes", cardKind: 'normal' }
  const BLESSED_CHOICE = { cardId: BLESSED, cardName: 'Second Wind', cardKind: 'blessed' }
  const CURSED_CARD = { cardId: CURSED, cardName: 'Visions of Death' }
  /** A normal pool card that no pack shows. */
  const OUTSIDE = 'legend-outside'

  beforeEach(async () => {
    await seedHoldings()
    // Ayla has 5 LP from an earlier entry; the party purse holds 12,500 GP.
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await updateDoc(doc(db, 'users/ayla'), { lp: 5, lpEntryId: 'e-old' })
      await setDoc(doc(db, 'party/main'), { gp: 12500, gpEntryId: 'g-old' })
      for (const [index, cardId] of PACK_CARDS.entries()) {
        await setDoc(doc(db, `cards/${cardId}`), seededCardOf('normal', `Pack Card ${index + 1}`))
      }
      await setDoc(doc(db, `cards/${OUTSIDE}`), seededCardOf('normal', 'Outside Card'))
    })
  })

  type Payment = { paidWith: 'lp' | 'gp' | 'none'; cost: number }

  /** A pack record's fields at opening: Ayla's Kesqerian Nights Standard Pack for 2 LP, by `by`. */
  function packFields(by: string, overrides: Record<string, unknown> = {}) {
    return {
      kind: 'pack',
      uid: 'ayla',
      by,
      at: serverTimestamp(),
      packType: 'standard',
      setCode: 'Kesqer',
      mechanicPack: null,
      offered: OFFERED,
      revealed: [],
      paidWith: 'lp',
      cost: 2,
      entryId: 'e-pay',
      status: 'open',
      closedAt: null,
      closedBy: null,
      chosen: null,
      cursed: null,
      refundEntryId: null,
      ...overrides,
    }
  }

  /** A ledger entry of a pack: Ayla's payment of 2 LP (5 -> 3) for `p-new`, as `by` writes it. */
  function packEntry(by: string, overrides: Record<string, unknown> = {}) {
    return {
      currency: 'lp',
      account: 'ayla',
      delta: -2,
      balanceAfter: 3,
      source: 'pack',
      reason: null,
      drawId: 'p-new',
      by,
      at: serverTimestamp(),
      ...overrides,
    }
  }

  type OpenSpec = {
    /** Overrides of the record's fields. */
    pack?: Record<string, unknown>
    /** Overrides of the entry, or `null` to write none. Written only when the record is paid. */
    entry?: Record<string, unknown> | null
    /** The new balance's fields, or `null` to leave it alone. Default: Ayla's LP 5 -> 3, or the purse -cost. */
    balance?: Record<string, unknown> | null
    /** The table's new fields, or `null` to leave it alone. */
    table?: Record<string, unknown> | null
  }

  /**
   * One opening as the application writes it, in one batch: the record `p-new`, the table taken by it and, when
   * paid, the entry `e-pay` and the new balance. Default: Ayla's Standard Pack for 2 LP.
   */
  function open(writer: string, spec: OpenSpec = {}) {
    const db = asUser(writer)
    const fields = packFields(writer, spec.pack)
    const payment = { paidWith: fields.paidWith, cost: fields.cost } as Payment
    const batch = writeBatch(db)
    batch.set(doc(db, 'draws/p-new'), fields)
    if (spec.table !== null)
      batch.set(doc(db, 'table/main'), { openPackId: 'p-new', ...spec.table })
    if (payment.paidWith !== 'none' && spec.entry !== null) {
      const gp = payment.paidWith === 'gp'
      batch.set(
        doc(db, 'ledger/e-pay'),
        packEntry(writer, {
          currency: payment.paidWith,
          account: gp ? 'party' : fields.uid,
          delta: -payment.cost,
          balanceAfter: (gp ? 12500 : 5) - payment.cost,
          ...spec.entry,
        }),
      )
    }
    if (payment.paidWith !== 'none' && spec.balance !== null) {
      if (payment.paidWith === 'gp') {
        batch.update(doc(db, 'party/main'), {
          gp: 12500 - payment.cost,
          gpEntryId: 'e-pay',
          ...spec.balance,
        })
      } else {
        batch.update(doc(db, `users/${String(fields.uid)}`), {
          lp: 5 - payment.cost,
          lpEntryId: 'e-pay',
          ...spec.balance,
        })
      }
    }
    return batch.commit()
  }

  /**
   * An open pack `p-open` that holds the table, seeded with the rules disabled: by default Ayla's Standard Pack,
   * paid with 2 LP (her LP already 3), every card turned.
   */
  async function seedOpenPack(overrides: Record<string, unknown> = {}) {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      const fields = packFields('ayla', {
        at: Timestamp.fromMillis(5000),
        revealed: [0, 1, 2, 3, 4],
        entryId: 'e-pay-old',
        ...overrides,
      })
      await setDoc(doc(db, 'draws/p-open'), fields)
      await setDoc(doc(db, 'table/main'), { openPackId: 'p-open' })
      if (fields.paidWith === 'lp')
        await updateDoc(doc(db, 'users/ayla'), { lp: 3, lpEntryId: 'e-pay-old' })
      if (fields.paidWith === 'gp') {
        await setDoc(doc(db, 'party/main'), {
          gp: 12500 - Number(fields.cost),
          gpEntryId: 'e-pay-old',
        })
      }
    })
  }

  /** A Cursed Golden Pack that the DM opened for Ayla with 7,500 GP, every card turned. */
  const CURSED_GOLDEN = {
    by: 'dana',
    packType: 'cursedGolden',
    setCode: null,
    offered: CURSED_OFFERED,
    revealed: [0, 1, 2, 3, 4, 5],
    paidWith: 'gp',
    cost: 7500,
  }

  type ChooseSpec = {
    /** The chosen card. Default: the pool card. */
    card?: { cardId: string; cardName: string; cardKind: string }
    /** The mandatory Cursed card, or `null` for none. Default: none. */
    cursed?: { cardId: string; cardName: string } | null
    /** Overrides of the record's update. */
    pack?: Record<string, unknown>
    /** Overrides of the chosen card's holding, or `null` to write none. */
    holding?: Record<string, unknown> | null
    /** Overrides of the Cursed card's holding, or `null` to write none. */
    cursedHolding?: Record<string, unknown> | null
    /** Whether the chosen card gets the holding as its holder. Default: for a normal card. */
    takesCard?: boolean
    /** The table's new fields, or `null` to leave it alone. */
    table?: Record<string, unknown> | null
    /** Whose hand the holdings are for. Default: Ayla's. */
    uid?: string
  }

  /**
   * A choice from `p-open` as the application writes it, in one batch: the record marked chosen, the holding
   * `h-chosen` (and `h-cursed` for a Cursed card), the normal card's holder, and the freed table.
   */
  function choose(writer: string, spec: ChooseSpec = {}) {
    const db = asUser(writer)
    const card = spec.card ?? POOL_CHOICE
    const cursed = spec.cursed ?? null
    const uid = spec.uid ?? 'ayla'
    const batch = writeBatch(db)
    batch.update(doc(db, 'draws/p-open'), {
      status: 'chosen',
      closedAt: serverTimestamp(),
      closedBy: writer,
      chosen: { ...card, holdingId: 'h-chosen' },
      cursed: cursed === null ? null : { ...cursed, holdingId: 'h-cursed' },
      ...spec.pack,
    })
    if (spec.holding !== null) {
      batch.set(
        doc(db, 'userCards/h-chosen'),
        newHolding({
          ...card,
          uid,
          givenBy: writer,
          givenVia: 'pack',
          drawId: 'p-open',
          ...spec.holding,
        }),
      )
    }
    if (cursed !== null && spec.cursedHolding !== null) {
      batch.set(
        doc(db, 'userCards/h-cursed'),
        newHolding({
          ...cursed,
          cardKind: 'cursed',
          uid,
          givenBy: writer,
          givenVia: 'pack',
          drawId: 'p-open',
          ...spec.cursedHolding,
        }),
      )
    }
    if (spec.takesCard ?? card.cardKind === 'normal') {
      batch.update(doc(db, `cards/${card.cardId}`), { holder: { uid, userCardId: 'h-chosen' } })
    }
    if (spec.table !== null) batch.set(doc(db, 'table/main'), { openPackId: null, ...spec.table })
    return batch.commit()
  }

  type CancelSpec = {
    /** How the seeded pack was paid. Default: Ayla's 2 LP, her LP now 3. */
    payment?: Payment
    /** Overrides of the record's update. */
    pack?: Record<string, unknown>
    /** Overrides of the refund entry, or `null` to write none. Written only for a paid pack. */
    refund?: Record<string, unknown> | null
    /** Overrides of the refunded balance, or `null` to leave it alone. */
    balance?: Record<string, unknown> | null
    /** The table's new fields, or `null` to leave it alone. */
    table?: Record<string, unknown> | null
  }

  /**
   * A cancel of `p-open` as the application writes it, in one batch: the record marked cancelled and, when paid,
   * the refund entry `e-ref` and the refunded balance, and the freed table.
   */
  function cancel(writer: string, spec: CancelSpec = {}) {
    const db = asUser(writer)
    const payment = spec.payment ?? { paidWith: 'lp', cost: 2 }
    const paid = payment.paidWith !== 'none'
    const gp = payment.paidWith === 'gp'
    const batch = writeBatch(db)
    batch.update(doc(db, 'draws/p-open'), {
      status: 'cancelled',
      closedAt: serverTimestamp(),
      closedBy: writer,
      refundEntryId: paid ? 'e-ref' : null,
      ...spec.pack,
    })
    if (paid && spec.refund !== null) {
      batch.set(
        doc(db, 'ledger/e-ref'),
        packEntry(writer, {
          currency: payment.paidWith,
          account: gp ? 'party' : 'ayla',
          delta: payment.cost,
          balanceAfter: gp ? 12500 : 3 + payment.cost,
          drawId: 'p-open',
          ...spec.refund,
        }),
      )
    }
    if (paid && spec.balance !== null) {
      if (gp)
        batch.update(doc(db, 'party/main'), { gp: 12500, gpEntryId: 'e-ref', ...spec.balance })
      else
        batch.update(doc(db, 'users/ayla'), {
          lp: 3 + payment.cost,
          lpEntryId: 'e-ref',
          ...spec.balance,
        })
    }
    if (spec.table !== null) batch.set(doc(db, 'table/main'), { openPackId: null, ...spec.table })
    return batch.commit()
  }

  /** Turns cards of `p-open` by writing its new list of turned positions. */
  const turn = (writer: string, revealed: number[]) =>
    updateDoc(doc(asUser(writer), 'draws/p-open'), { revealed })

  /** Frees the table with the rules disabled, as if the open pack had ended. */
  async function freeTable() {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), 'table/main'), { openPackId: null })
    })
  }

  /** Movements and balance changes, each valid on its own, written as the application writes them. */
  const MOVEMENTS: [string, () => Promise<void>][] = [
    [
      'the DM gives a card',
      () =>
        setDoc(
          doc(asUser('dana'), 'userCards/h-give'),
          newHolding({ ...CURSED_CARD, cardKind: 'cursed', uid: 'bora' }),
        ),
    ],
    [
      'the DM transfers a card',
      () => {
        const db = asUser('dana')
        const batch = writeBatch(db)
        batch.update(doc(db, 'userCards/h-bora'), {
          returnedAt: serverTimestamp(),
          returnedBy: 'dana',
          returnReason: 'transferred',
          transferredTo: 'h-moved',
        })
        batch.set(
          doc(db, 'userCards/h-moved'),
          newHolding({
            cardId: HELD,
            cardName: 'Greedy Hands',
            givenVia: 'transfer',
            transferredFrom: 'h-bora',
          }),
        )
        batch.update(doc(db, `cards/${HELD}`), { holder: { uid: 'ayla', userCardId: 'h-moved' } })
        return batch.commit()
      },
    ],
    [
      "a player's paid draw",
      () => {
        const db = asUser('ayla')
        const batch = writeBatch(db)
        batch.set(doc(db, 'draws/d-wait'), {
          kind: 'random',
          uid: 'ayla',
          by: 'ayla',
          at: serverTimestamp(),
          ...POOL_CHOICE,
          holdingId: 'h-drawn',
          filters: null,
          paidWith: 'lp',
          cost: 1,
          entryId: 'e-drawn',
        })
        batch.set(
          doc(db, 'userCards/h-drawn'),
          newHolding({ ...POOL_CHOICE, givenBy: 'ayla', givenVia: 'draw', drawId: 'd-wait' }),
        )
        batch.update(doc(db, `cards/${POOL}`), { holder: { uid: 'ayla', userCardId: 'h-drawn' } })
        batch.set(
          doc(db, 'ledger/e-drawn'),
          packEntry('ayla', { delta: -1, balanceAfter: 2, source: 'draw', drawId: 'd-wait' }),
        )
        batch.update(doc(db, 'users/ayla'), { lp: 2, lpEntryId: 'e-drawn' })
        return batch.commit()
      },
    ],
    [
      "the DM's Cursed draw",
      () => {
        const db = asUser('dana')
        const batch = writeBatch(db)
        batch.set(doc(db, 'draws/d-wait'), {
          kind: 'cursed',
          uid: 'ayla',
          by: 'dana',
          at: serverTimestamp(),
          ...CURSED_CARD,
          cardKind: 'cursed',
          holdingId: 'h-drawn',
          filters: null,
          paidWith: 'none',
          cost: 0,
          entryId: null,
        })
        batch.set(
          doc(db, 'userCards/h-drawn'),
          newHolding({ ...CURSED_CARD, cardKind: 'cursed', givenVia: 'draw', drawId: 'd-wait' }),
        )
        return batch.commit()
      },
    ],
    [
      'a player uses a card',
      () =>
        updateDoc(doc(asUser('ayla'), 'userCards/h-ayla-cursed'), {
          returnedAt: serverTimestamp(),
          returnedBy: 'ayla',
          returnReason: 'used',
          usedOn: null,
        }),
    ],
    [
      'the DM discards a card',
      () => {
        const db = asUser('dana')
        const batch = writeBatch(db)
        batch.update(doc(db, 'userCards/h-bora'), {
          returnedAt: serverTimestamp(),
          returnedBy: 'dana',
          returnReason: 'discarded',
          usedOn: null,
        })
        batch.update(doc(db, `cards/${HELD}`), { holder: null })
        return batch.commit()
      },
    ],
    [
      "the DM changes a player's LP",
      () => {
        const db = asUser('dana')
        const batch = writeBatch(db)
        batch.set(
          doc(db, 'ledger/e-hand'),
          packEntry('dana', {
            delta: 2,
            balanceAfter: 5,
            source: 'manual',
            reason: "Boss'u yendi",
            drawId: null,
          }),
        )
        batch.update(doc(db, 'users/ayla'), { lp: 5, lpEntryId: 'e-hand' })
        return batch.commit()
      },
    ],
    [
      "the DM changes the party's GP",
      () => {
        const db = asUser('dana')
        const batch = writeBatch(db)
        batch.set(
          doc(db, 'ledger/g-hand'),
          packEntry('dana', {
            currency: 'gp',
            account: 'party',
            delta: -2500,
            balanceAfter: 10000,
            source: 'manual',
            reason: 'Kiralık kılıç',
            drawId: null,
          }),
        )
        batch.update(doc(db, 'party/main'), { gp: 10000, gpEntryId: 'g-hand' })
        return batch.commit()
      },
    ],
  ]

  describe('the table waits for an open pack', () => {
    it.each(MOVEMENTS)(
      'denies that %s while a pack is open, and allows it after',
      async (_case, act) => {
        await seedOpenPack()
        await assertFails(act())
        await freeTable()
        await assertSucceeds(act())
      },
    )

    it('still allows notes, switching active, and cost overrides while a pack is open', async () => {
      await seedOpenPack()
      await assertSucceeds(
        updateDoc(doc(asUser('ayla'), 'userCards/h-ayla-cursed'), { note: 'Sonra' }),
      )
      await assertSucceeds(updateDoc(doc(asUser('dana'), 'userCards/h-bora'), { active: true }))
      await assertSucceeds(
        updateDoc(doc(asUser('dana'), 'userCards/h-bora'), { costOverride: 'd6' }),
      )
    })
  })

  describe('the heaviest requests', () => {
    // Eight documents, each checking the others: it must stay within the rules' lookup limits.
    it("allows the DM's choice from a Cursed Golden Pack: the pack, the table, two holdings and the card", async () => {
      await seedOpenPack(CURSED_GOLDEN)
      await assertSucceeds(choose('dana', { cursed: CURSED_CARD }))
      expect(await readAsAdmin('draws/p-open')).toMatchObject({
        status: 'chosen',
        closedBy: 'dana',
        chosen: { cardId: POOL, holdingId: 'h-chosen' },
        cursed: { cardId: CURSED, holdingId: 'h-cursed' },
      })
      expect(await readAsAdmin('userCards/h-cursed')).toMatchObject({
        givenVia: 'pack',
        drawId: 'p-open',
      })
      expect(await readAsAdmin(`cards/${POOL}`)).toMatchObject({
        holder: { uid: 'ayla', userCardId: 'h-chosen' },
      })
      expect(await readAsAdmin('table/main')).toEqual({ openPackId: null })
    })

    it("allows the DM's GP-paid opening for a player: the pack, the table, the entry and the purse", async () => {
      await assertSucceeds(
        open('dana', {
          pack: { packType: 'golden', setCode: null, paidWith: 'gp', cost: 10000 },
        }),
      )
      expect(await readAsAdmin('party/main')).toEqual({ gp: 2500, gpEntryId: 'e-pay' })
      expect(await readAsAdmin('table/main')).toEqual({ openPackId: 'p-new' })
    })
  })

  describe('reading', () => {
    it.each(['ayla', 'bora', 'dana'])('lets %s read a pack and the table', async (uid) => {
      await seedOpenPack()
      await assertSucceeds(getDoc(doc(asUser(uid), 'draws/p-open')))
      await assertSucceeds(getDoc(doc(asUser(uid), 'table/main')))
    })

    it('denies signed-out reads', async () => {
      await seedOpenPack()
      const db = firestoreOf(testEnv.unauthenticatedContext())
      await assertFails(getDoc(doc(db, 'draws/p-open')))
      await assertFails(getDoc(doc(db, 'table/main')))
    })
  })

  describe('opening', () => {
    it("allows a player's opening into their own hand at the pack's LP price", async () => {
      await assertSucceeds(open('ayla'))
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 3, lpEntryId: 'e-pay' })
      expect(await readAsAdmin('table/main')).toEqual({ openPackId: 'p-new' })
    })

    it('allows a Mechanic Pack and a Cursed Pack at their prices', async () => {
      await assertSucceeds(
        open('ayla', {
          pack: { packType: 'mechanic', setCode: null, mechanicPack: 'Arcanus Divine', cost: 4 },
        }),
      )
      await freeTable()
      await testEnv.withSecurityRulesDisabled(async (admin) => {
        await updateDoc(doc(firestoreOf(admin), 'users/ayla'), { lp: 5, lpEntryId: 'e-old' })
        await deleteDoc(doc(firestoreOf(admin), 'draws/p-new'))
        await deleteDoc(doc(firestoreOf(admin), 'ledger/e-pay'))
      })
      await assertSucceeds(
        open('ayla', { pack: { packType: 'cursed', offered: CURSED_OFFERED, cost: 1 } }),
      )
    })

    it("allows the DM's LP opening of any amount", async () => {
      await assertSucceeds(open('dana', { pack: { cost: 1 } }))
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 4 })
    })

    it("allows the DM's free opening", async () => {
      await assertSucceeds(open('dana', { pack: { paidWith: 'none', cost: 0, entryId: null } }))
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 5, lpEntryId: 'e-old' })
    })

    it("allows the DM's opening into the DM's own hand, free or with GP", async () => {
      await assertSucceeds(
        open('dana', { pack: { uid: 'dana', paidWith: 'none', cost: 0, entryId: null } }),
      )
      await freeTable()
      await testEnv.withSecurityRulesDisabled(async (admin) => {
        await deleteDoc(doc(firestoreOf(admin), 'draws/p-new'))
      })
      await assertSucceeds(open('dana', { pack: { uid: 'dana', paidWith: 'gp', cost: 5000 } }))
    })

    it('denies an opening while a pack is open, and taking or freeing the table alone', async () => {
      await seedOpenPack()
      await assertFails(
        open('dana', { pack: { uid: 'bora', paidWith: 'none', cost: 0, entryId: null } }),
      )
      await assertFails(setDoc(doc(asUser('dana'), 'table/main'), { openPackId: null }))
      await freeTable()
      await assertFails(setDoc(doc(asUser('dana'), 'table/main'), { openPackId: 'p-open' }))
      await assertFails(setDoc(doc(asUser('ayla'), 'table/main'), { openPackId: 'p-new' }))
    })

    it('denies an opening without taking the table, or naming another pack in it', async () => {
      await assertFails(open('ayla', { table: null }))
      await assertFails(open('ayla', { table: { openPackId: 'p-other' } }))
    })

    it('denies a player opening for someone else', async () => {
      await testEnv.withSecurityRulesDisabled(async (admin) => {
        await updateDoc(doc(firestoreOf(admin), 'users/bora'), { lp: 5, lpEntryId: 'e-old' })
      })
      await assertFails(open('ayla', { pack: { uid: 'bora' } }))
    })

    it('denies a player paying another amount, paying with GP, or opening for free', async () => {
      await assertFails(
        open('ayla', {
          pack: { cost: 1 },
          entry: { delta: -1, balanceAfter: 4 },
          balance: { lp: 4 },
        }),
      )
      await assertFails(open('ayla', { pack: { paidWith: 'gp', cost: 5000 } }))
      await assertFails(open('ayla', { pack: { paidWith: 'none', cost: 0, entryId: null } }))
    })

    it('denies a payment that would bring LP below 0', async () => {
      await testEnv.withSecurityRulesDisabled(async (admin) => {
        await updateDoc(doc(firestoreOf(admin), 'users/ayla'), { lp: 1, lpEntryId: 'e-old' })
      })
      await assertFails(open('ayla', { entry: { balanceAfter: -1 }, balance: { lp: -1 } }))
    })

    it('denies the DM charging LP to someone who is not a player', async () => {
      await assertFails(open('dana', { pack: { uid: 'dana', paidWith: 'lp', cost: 2 } }))
    })

    it('denies a payment that disagrees with the pack, or a pack without its payment', async () => {
      await assertFails(
        open('dana', {
          pack: { cost: 3 },
          entry: { delta: -2, balanceAfter: 3 },
          balance: { lp: 3 },
        }),
      )
      await assertFails(open('ayla', { entry: { drawId: 'p-other' } }))
      await assertFails(open('ayla', { entry: null }))
      await assertFails(open('ayla', { balance: null }))
      await assertFails(
        open('dana', {
          pack: { paidWith: 'gp', cost: 5000 },
          entry: { currency: 'lp', account: 'ayla' },
        }),
      )
      await assertFails(open('dana', { pack: { cost: 1_000_001 } }))
    })

    it('denies a pack with the wrong number of cards, or a repeated card', async () => {
      await assertFails(open('ayla', { pack: { offered: OFFERED.slice(0, 4) } }))
      await assertFails(open('ayla', { pack: { offered: [...OFFERED, CURSED] } }))
      await assertFails(
        open('ayla', { pack: { packType: 'cursed', offered: [...CURSED_OFFERED, HELD], cost: 1 } }),
      )
      await assertFails(open('ayla', { pack: { packType: 'cursed', cost: 1 } }))
      await assertFails(
        open('ayla', { pack: { offered: [POOL, POOL, ...PACK_CARDS.slice(0, 3)] } }),
      )
      await assertFails(open('ayla', { pack: { offered: [POOL, 7, ...PACK_CARDS.slice(0, 3)] } }))
    })

    it('denies a pack whose set or mechanic pack does not fit its type', async () => {
      await assertFails(open('ayla', { pack: { setCode: null } }))
      await assertFails(open('ayla', { pack: { mechanicPack: 'Arcanus Divine' } }))
      await assertFails(open('ayla', { pack: { packType: 'golden', cost: 4 } }))
      await assertFails(open('ayla', { pack: { packType: 'mechanic', setCode: null, cost: 4 } }))
      await assertFails(open('ayla', { pack: { packType: 'rare', cost: 3 } }))
    })

    it('denies an opening that is not new and open', async () => {
      await assertFails(open('ayla', { pack: { revealed: [0] } }))
      await assertFails(open('ayla', { pack: { status: 'chosen' } }))
      await assertFails(open('ayla', { pack: { chosen: { ...POOL_CHOICE, holdingId: 'h-x' } } }))
      await assertFails(open('ayla', { pack: { by: 'dana' } }))
      await assertFails(open('ayla', { pack: { at: Timestamp.fromMillis(5) } }))
      await assertFails(open('ayla', { pack: { extra: true } }))
    })
  })

  describe('turning cards over', () => {
    beforeEach(() => seedOpenPack({ revealed: [] }))

    it('lets the owner and the DM turn cards, one at a time', async () => {
      await assertSucceeds(turn('ayla', [2]))
      await assertSucceeds(turn('dana', [2, 0]))
      expect(await readAsAdmin('draws/p-open')).toMatchObject({ revealed: [2, 0] })
    })

    it('denies another player turning a card', async () => {
      await assertFails(turn('bora', [0]))
    })

    it('denies a position that was not shown, one turned twice, two at once, or a reordering', async () => {
      await assertFails(turn('ayla', [5]))
      await assertFails(turn('ayla', [-1]))
      await assertFails(turn('ayla', [0, 1]))
      await assertSucceeds(turn('ayla', [1]))
      await assertFails(turn('ayla', [1, 1]))
      await assertFails(turn('ayla', [0, 1]))
      await assertFails(turn('ayla', [2]))
    })

    it('denies turning a card of a pack that has ended', async () => {
      await assertSucceeds(cancel('dana'))
      await assertFails(turn('ayla', [0]))
    })
  })

  describe('choosing', () => {
    it("allows the owner's choice of a normal card: the hand, the pool and the table", async () => {
      await seedOpenPack()
      await assertSucceeds(choose('ayla'))
      expect(await readAsAdmin('userCards/h-chosen')).toMatchObject({
        uid: 'ayla',
        givenBy: 'ayla',
        givenVia: 'pack',
        drawId: 'p-open',
      })
      expect(await readAsAdmin('table/main')).toEqual({ openPackId: null })
    })

    it('allows choosing a Blessed card, which keeps no holder', async () => {
      await seedOpenPack({ offered: [BLESSED, ...PACK_CARDS] })
      await assertSucceeds(choose('ayla', { card: BLESSED_CHOICE }))
    })

    it("allows a Cursed Pack's choice by its owner, with both holdings", async () => {
      await seedOpenPack({
        packType: 'cursed',
        offered: CURSED_OFFERED,
        revealed: [0, 1, 2, 3, 4, 5],
        cost: 1,
      })
      await assertSucceeds(choose('ayla', { cursed: CURSED_CARD }))
    })

    it('denies a choice before every card is turned', async () => {
      await seedOpenPack({ revealed: [0, 1] })
      await assertFails(choose('ayla'))
    })

    it('denies choosing a card that was not shown, a held card, a retired card, or a draft', async () => {
      await seedOpenPack()
      await assertFails(
        choose('ayla', { card: { cardId: OUTSIDE, cardName: 'Outside Card', cardKind: 'normal' } }),
      )
      await seedOpenPack({ offered: [HELD, ...PACK_CARDS] })
      await assertFails(
        choose('ayla', { card: { cardId: HELD, cardName: 'Greedy Hands', cardKind: 'normal' } }),
      )
      await seedOpenPack({ offered: [RETIRED, ...PACK_CARDS] })
      await assertFails(
        choose('ayla', { card: { cardId: RETIRED, cardName: 'Old Card', cardKind: 'normal' } }),
      )
      await seedOpenPack({ offered: [HOLDINGS_SEED.DRAFT, ...PACK_CARDS] })
      await assertFails(
        choose('ayla', {
          card: { cardId: HOLDINGS_SEED.DRAFT, cardName: 'New Card', cardKind: 'normal' },
        }),
      )
    })

    it('denies choosing a DM-only card, or taking one as the mandatory Cursed card', async () => {
      const { DM_ONLY, DM_ONLY_CURSED } = HOLDINGS_SEED
      await seedOpenPack({ offered: [DM_ONLY, ...PACK_CARDS] })
      await assertFails(
        choose('ayla', {
          card: { cardId: DM_ONLY, cardName: 'The Last Wish', cardKind: 'normal' },
        }),
      )
      await seedOpenPack({
        packType: 'cursed',
        offered: [POOL, PACK_CARDS[0], DM_ONLY_CURSED, ...PACK_CARDS.slice(1)],
        revealed: [0, 1, 2, 3, 4, 5],
        cost: 1,
      })
      await assertFails(
        choose('ayla', { cursed: { cardId: DM_ONLY_CURSED, cardName: 'Crown of Ash' } }),
      )
    })

    it("denies choosing the Cursed card, or a Cursed Pack's choice without its Cursed card", async () => {
      await seedOpenPack({
        packType: 'cursed',
        offered: CURSED_OFFERED,
        revealed: [0, 1, 2, 3, 4, 5],
        cost: 1,
      })
      await assertFails(
        choose('ayla', { card: { ...CURSED_CARD, cardKind: 'cursed' }, takesCard: false }),
      )
      await assertFails(choose('ayla'))
      await assertFails(choose('ayla', { cursed: CURSED_CARD, cursedHolding: null }))
      await assertFails(
        choose('ayla', {
          cursed: CURSED_CARD,
          cursedHolding: { cardId: POOL, cardKind: 'normal' },
        }),
      )
    })

    it("denies a Standard Pack's choice with a Cursed card", async () => {
      await seedOpenPack()
      await assertFails(choose('ayla', { cursed: CURSED_CARD }))
    })

    it('denies a choice without its holding, its holder, or freeing the table', async () => {
      await seedOpenPack()
      await assertFails(choose('ayla', { holding: null }))
      await assertFails(choose('ayla', { takesCard: false }))
      await assertFails(choose('ayla', { table: null }))
      await assertFails(choose('ayla', { holding: { uid: 'bora' }, uid: 'bora' }))
    })

    it('denies a holding given by pack without the choice', async () => {
      await seedOpenPack()
      const db = asUser('ayla')
      const batch = writeBatch(db)
      batch.set(
        doc(db, 'userCards/h-chosen'),
        newHolding({ ...POOL_CHOICE, givenBy: 'ayla', givenVia: 'pack', drawId: 'p-open' }),
      )
      batch.update(doc(db, `cards/${POOL}`), { holder: { uid: 'ayla', userCardId: 'h-chosen' } })
      await assertFails(batch.commit())
    })

    it("denies another player's choice", async () => {
      await seedOpenPack()
      await assertFails(choose('bora'))
    })
  })

  describe('cancelling', () => {
    it("allows the DM's cancel of an LP-paid pack, refunding the player", async () => {
      await seedOpenPack()
      await assertSucceeds(cancel('dana'))
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 5, lpEntryId: 'e-ref' })
      expect(await readAsAdmin('draws/p-open')).toMatchObject({
        status: 'cancelled',
        refundEntryId: 'e-ref',
      })
      expect(await readAsAdmin('table/main')).toEqual({ openPackId: null })
    })

    it("allows the DM's cancel of a GP-paid pack, refunding the purse", async () => {
      await seedOpenPack({ by: 'dana', paidWith: 'gp', cost: 7500 })
      await assertSucceeds(cancel('dana', { payment: { paidWith: 'gp', cost: 7500 } }))
      expect(await readAsAdmin('party/main')).toEqual({ gp: 12500, gpEntryId: 'e-ref' })
    })

    it("allows the DM's cancel of a free pack, without an entry", async () => {
      await seedOpenPack({ by: 'dana', paidWith: 'none', cost: 0, entryId: null })
      await assertSucceeds(cancel('dana', { payment: { paidWith: 'none', cost: 0 } }))
    })

    it('denies a cancel by a player, even the owner', async () => {
      await seedOpenPack()
      await assertFails(cancel('ayla'))
    })

    it('denies a cancel without its refund, or without freeing the table', async () => {
      await seedOpenPack()
      await assertFails(cancel('dana', { refund: null, balance: null }))
      await assertFails(
        cancel('dana', { pack: { refundEntryId: null }, refund: null, balance: null }),
      )
      await assertFails(cancel('dana', { table: null }))
    })

    it('denies a refund of another amount, or to another account', async () => {
      await seedOpenPack()
      await assertFails(
        cancel('dana', { refund: { delta: 3, balanceAfter: 6 }, balance: { lp: 6 } }),
      )
      const db = asUser('dana')
      const batch = writeBatch(db)
      batch.update(doc(db, 'draws/p-open'), {
        status: 'cancelled',
        closedAt: serverTimestamp(),
        closedBy: 'dana',
        refundEntryId: 'e-ref',
      })
      batch.set(
        doc(db, 'ledger/e-ref'),
        packEntry('dana', {
          currency: 'gp',
          account: 'party',
          delta: 2,
          balanceAfter: 12502,
          drawId: 'p-open',
        }),
      )
      batch.update(doc(db, 'party/main'), { gp: 12502, gpEntryId: 'e-ref' })
      batch.set(doc(db, 'table/main'), { openPackId: null })
      await assertFails(batch.commit())
    })

    it('denies a refund without the cancel', async () => {
      await seedOpenPack()
      const db = asUser('dana')
      const batch = writeBatch(db)
      batch.set(
        doc(db, 'ledger/e-ref'),
        packEntry('dana', { delta: 2, balanceAfter: 5, drawId: 'p-open' }),
      )
      batch.update(doc(db, 'users/ayla'), { lp: 5, lpEntryId: 'e-ref' })
      await assertFails(batch.commit())
    })
  })

  describe('ended packs and deleting', () => {
    it('denies changing an ended pack, and deleting a pack or the table, even by the DM', async () => {
      await seedOpenPack()
      await assertSucceeds(choose('ayla'))
      await assertFails(
        updateDoc(doc(asUser('dana'), 'draws/p-open'), { revealed: [0, 1, 2, 3, 4, 0] }),
      )
      await assertFails(
        updateDoc(doc(asUser('dana'), 'draws/p-open'), {
          status: 'cancelled',
          closedAt: serverTimestamp(),
          closedBy: 'dana',
          refundEntryId: null,
          chosen: null,
        }),
      )
      await assertFails(deleteDoc(doc(asUser('dana'), 'draws/p-open')))
      await assertFails(deleteDoc(doc(asUser('dana'), 'table/main')))
    })
  })
})

describe('True Words (trueWords, playerWords, userTrueWords, wordDrafts, with their ledger entries and LP)', () => {
  /** The three words a new draft shows: none of them known by Ayla. */
  const OFFERED = ['tw-abyss', 'tw-aid', 'tw-dragon']
  /** Words Ayla knows, through the open records `r-chaos` and `r-hoard`, taught by Dana. */
  const AYLA_KNOWN = { 'tw-chaos': 'r-chaos', 'tw-hoard': 'r-hoard' }
  /** Ayla's state: two words known, no open draft. Her draft costs 1 + 2 = 3 LP. */
  const AYLA_STATE = { known: AYLA_KNOWN, openDraftId: null, recordId: 'r-hoard' }

  const word = (name: string, extra: Record<string, unknown> = {}) => ({
    name,
    nameKey: name.toLowerCase(),
    cost: '1',
    text: `${name} text.`,
    status: 'active',
    ...extra,
  })

  /** An open record as stored: Dana taught it to Ayla long ago. */
  const seededRecord = (wordId: string, wordName: string, extra: Record<string, unknown> = {}) => ({
    wordId,
    wordName,
    uid: 'ayla',
    learnedAt: Timestamp.fromMillis(1000),
    learnedBy: 'dana',
    learnedVia: 'dm',
    draftId: null,
    active: false,
    removedAt: null,
    removedBy: null,
    ...extra,
  })

  beforeEach(async () => {
    await seedHoldings()
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await updateDoc(doc(db, 'users/ayla'), { lp: 5, lpEntryId: 'e-old' })
      await updateDoc(doc(db, 'users/bora'), { lp: 4, lpEntryId: 'e-old-bora' })
      for (const name of ['Abyss', 'Aid', 'Dragon', 'Chaos', 'Hoard', 'Mimic']) {
        await setDoc(doc(db, `trueWords/tw-${name.toLowerCase()}`), word(name))
      }
      await setDoc(doc(db, 'trueWords/tw-old'), word('Old', { status: 'retired' }))
      await setDoc(doc(db, 'trueWords/tw-echo'), word('Echo', { status: 'draft' }))
      await setDoc(doc(db, 'userTrueWords/r-chaos'), seededRecord('tw-chaos', 'Chaos'))
      await setDoc(doc(db, 'userTrueWords/r-hoard'), seededRecord('tw-hoard', 'Hoard'))
      await setDoc(doc(db, 'playerWords/ayla'), AYLA_STATE)
    })
  })

  /** A draft's fields at its start: Ayla's draft for 3 LP, by `by`. */
  function draftFields(by: string, overrides: Record<string, unknown> = {}) {
    return {
      uid: 'ayla',
      by,
      at: serverTimestamp(),
      offered: OFFERED,
      status: 'open',
      paidWith: 'lp',
      cost: 3,
      entryId: 'e-pay',
      closedAt: null,
      closedBy: null,
      learned: null,
      refundEntryId: null,
      ...overrides,
    }
  }

  /** A ledger entry of a draft: Ayla's payment of 3 LP (5 -> 2) for `d-new`, as `by` writes it. */
  function draftEntry(by: string, overrides: Record<string, unknown> = {}) {
    return {
      currency: 'lp',
      account: 'ayla',
      delta: -3,
      balanceAfter: 2,
      source: 'wordDraft',
      reason: null,
      drawId: 'd-new',
      by,
      at: serverTimestamp(),
      ...overrides,
    }
  }

  type StartSpec = {
    /** Overrides of the draft's fields. */
    draft?: Record<string, unknown>
    /** Overrides of the entry, or `null` to write none. Written only when the draft is paid. */
    entry?: Record<string, unknown> | null
    /** The new LP's fields, or `null` to leave it alone. Default: the player's LP minus the cost. */
    balance?: Record<string, unknown> | null
    /** The player's new state, or `null` to leave it alone. Default: the state before, with `d-new` open. */
    state?: Record<string, unknown> | null
  }

  const LP_BEFORE: Record<string, number> = { ayla: 5, bora: 4 }
  const STATE_BEFORE: Record<string, Record<string, unknown>> = {
    ayla: AYLA_STATE,
    bora: { known: {}, openDraftId: null, recordId: null },
  }

  /**
   * One start as the application writes it, in one batch: the draft `d-new`, the player's state pointing at it
   * and, when paid, the entry `e-pay` and the new LP. Default: Ayla's own draft for 3 LP.
   */
  function start(writer: string, spec: StartSpec = {}) {
    const db = asUser(writer)
    const fields = draftFields(writer, spec.draft)
    const uid = String(fields.uid)
    const cost = Number(fields.cost)
    const batch = writeBatch(db)
    batch.set(doc(db, 'wordDrafts/d-new'), fields)
    if (spec.state !== null) {
      batch.set(doc(db, `playerWords/${uid}`), {
        ...STATE_BEFORE[uid],
        openDraftId: 'd-new',
        ...spec.state,
      })
    }
    if (fields.paidWith === 'lp' && spec.entry !== null) {
      batch.set(
        doc(db, 'ledger/e-pay'),
        draftEntry(writer, {
          account: uid,
          delta: -cost,
          balanceAfter: (LP_BEFORE[uid] ?? 0) - cost,
          ...spec.entry,
        }),
      )
    }
    if (fields.paidWith === 'lp' && spec.balance !== null) {
      batch.update(doc(db, `users/${uid}`), {
        lp: (LP_BEFORE[uid] ?? 0) - cost,
        lpEntryId: 'e-pay',
        ...spec.balance,
      })
    }
    return batch.commit()
  }

  /**
   * Ayla's open draft `d-open`, seeded with the rules disabled: by default paid with 3 LP (her LP already 2),
   * showing the three words of OFFERED.
   */
  async function seedOpenDraft(overrides: Record<string, unknown> = {}) {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      const fields = draftFields('ayla', {
        at: Timestamp.fromMillis(5000),
        entryId: 'e-pay-old',
        ...overrides,
      })
      await setDoc(doc(db, 'wordDrafts/d-open'), fields)
      await setDoc(doc(db, 'playerWords/ayla'), { ...AYLA_STATE, openDraftId: 'd-open' })
      if (fields.paidWith === 'lp')
        await updateDoc(doc(db, 'users/ayla'), { lp: 2, lpEntryId: 'e-pay-old' })
    })
  }

  type LearnSpec = {
    /** The learned word. Default: Abyss. */
    wordId?: string
    wordName?: string
    /** Overrides of the draft's update. */
    draft?: Record<string, unknown> | null
    /** Overrides of the new record, or `null` to write none. */
    record?: Record<string, unknown> | null
    /** The player's new state, or `null` to leave it alone. */
    state?: Record<string, unknown> | null
  }

  /** Learning from `d-open` as the application writes it: the draft closed, the record `r-new`, the state. */
  function learn(writer: string, spec: LearnSpec = {}) {
    const db = asUser(writer)
    const wordId = spec.wordId ?? 'tw-abyss'
    const wordName = spec.wordName ?? 'Abyss'
    const batch = writeBatch(db)
    if (spec.draft !== null) {
      batch.update(doc(db, 'wordDrafts/d-open'), {
        status: 'learned',
        closedAt: serverTimestamp(),
        closedBy: writer,
        learned: { wordId, wordName, recordId: 'r-new' },
        ...spec.draft,
      })
    }
    if (spec.record !== null) {
      batch.set(doc(db, 'userTrueWords/r-new'), {
        ...seededRecord(wordId, wordName),
        learnedAt: serverTimestamp(),
        learnedBy: writer,
        learnedVia: 'draft',
        draftId: 'd-open',
        ...spec.record,
      })
    }
    if (spec.state !== null) {
      batch.set(doc(db, 'playerWords/ayla'), {
        known: { ...AYLA_KNOWN, [wordId]: 'r-new' },
        openDraftId: null,
        recordId: 'r-new',
        ...spec.state,
      })
    }
    return batch.commit()
  }

  /** Skipping `d-open`: the draft closed as skipped and the player's open draft cleared. */
  function skip(writer: string) {
    const db = asUser(writer)
    const batch = writeBatch(db)
    batch.update(doc(db, 'wordDrafts/d-open'), {
      status: 'skipped',
      closedAt: serverTimestamp(),
      closedBy: writer,
    })
    batch.set(doc(db, 'playerWords/ayla'), AYLA_STATE)
    return batch.commit()
  }

  /** Cancelling `d-open` with a refund of 3 LP (2 -> 5) as `e-refund`, or without one for a free draft. */
  function cancel(writer: string, { paid = true } = {}) {
    const db = asUser(writer)
    const batch = writeBatch(db)
    batch.update(doc(db, 'wordDrafts/d-open'), {
      status: 'cancelled',
      closedAt: serverTimestamp(),
      closedBy: writer,
      refundEntryId: paid ? 'e-refund' : null,
    })
    if (paid) {
      batch.set(
        doc(db, 'ledger/e-refund'),
        draftEntry(writer, { delta: 3, balanceAfter: 5, drawId: 'd-open' }),
      )
      batch.update(doc(db, 'users/ayla'), { lp: 5, lpEntryId: 'e-refund' })
    }
    batch.set(doc(db, 'playerWords/ayla'), AYLA_STATE)
    return batch.commit()
  }

  type TeachSpec = {
    uid?: string
    wordId?: string
    wordName?: string
    record?: Record<string, unknown>
    state?: Record<string, unknown> | null
  }

  /** The DM teaching a word as the application writes it: the record `r-new` and the player's state. */
  function teach(writer: string, spec: TeachSpec = {}) {
    const db = asUser(writer)
    const uid = spec.uid ?? 'ayla'
    const wordId = spec.wordId ?? 'tw-abyss'
    const before = STATE_BEFORE[uid] ?? { known: {}, openDraftId: null }
    const batch = writeBatch(db)
    batch.set(doc(db, 'userTrueWords/r-new'), {
      ...seededRecord(wordId, spec.wordName ?? 'Abyss'),
      uid,
      learnedAt: serverTimestamp(),
      learnedBy: writer,
      ...spec.record,
    })
    if (spec.state !== null) {
      batch.set(doc(db, `playerWords/${uid}`), {
        ...before,
        known: { ...(before.known as Record<string, string>), [wordId]: 'r-new' },
        recordId: 'r-new',
        ...spec.state,
      })
    }
    return batch.commit()
  }

  /** The DM taking back Ayla's Chaos: the record `r-chaos` closed, and the word gone from her state. */
  function takeBack(writer: string, { state = true } = {}) {
    const db = asUser(writer)
    const batch = writeBatch(db)
    batch.update(doc(db, 'userTrueWords/r-chaos'), {
      removedAt: serverTimestamp(),
      removedBy: writer,
    })
    if (state) {
      batch.set(doc(db, 'playerWords/ayla'), {
        known: { 'tw-hoard': 'r-hoard' },
        openDraftId: null,
        recordId: 'r-chaos',
      })
    }
    return batch.commit()
  }

  async function setTable(openPackId: string | null) {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), 'table/main'), { openPackId })
    })
  }

  describe('reading', () => {
    it.each(['ayla', 'bora', 'dana'])(
      'lets %s read words, states, records and drafts',
      async (uid) => {
        await seedOpenDraft()
        const db = asUser(uid)
        await assertSucceeds(getDoc(doc(db, 'trueWords/tw-abyss')))
        await assertSucceeds(getDoc(doc(db, 'playerWords/ayla')))
        await assertSucceeds(getDoc(doc(db, 'userTrueWords/r-chaos')))
        await assertSucceeds(getDoc(doc(db, 'wordDrafts/d-open')))
        await assertSucceeds(getDocs(collection(db, 'userTrueWords')))
      },
    )

    it('denies signed-out users', async () => {
      const db = firestoreOf(testEnv.unauthenticatedContext())
      await assertFails(getDoc(doc(db, 'trueWords/tw-abyss')))
      await assertFails(getDoc(doc(db, 'playerWords/ayla')))
      await assertFails(getDoc(doc(db, 'userTrueWords/r-chaos')))
      await assertFails(getDocs(collection(db, 'wordDrafts')))
    })
  })

  describe('starting a draft', () => {
    it('lets a player start their own draft for 1 LP plus the words they know', async () => {
      await assertSucceeds(start('ayla'))
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 2, lpEntryId: 'e-pay' })
      expect(await readAsAdmin('playerWords/ayla')).toEqual({ ...AYLA_STATE, openDraftId: 'd-new' })
    })

    it("charges a player's first draft 1 LP, creating their state", async () => {
      await assertSucceeds(start('bora', { draft: { uid: 'bora', cost: 1 } }))
      expect(await readAsAdmin('users/bora')).toMatchObject({ lp: 3 })
      expect(await readAsAdmin('playerWords/bora')).toEqual({
        known: {},
        openDraftId: 'd-new',
        recordId: null,
      })
    })

    it('lets the DM start a draft for a player at the price', async () => {
      await assertSucceeds(start('dana'))
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 2 })
      expect(await readAsAdmin('wordDrafts/d-new')).toMatchObject({ by: 'dana', uid: 'ayla' })
    })

    it('lets the DM charge any amount up to the LP', async () => {
      await assertSucceeds(start('dana', { draft: { cost: 5 } }))
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 0 })
    })

    it('lets the DM start a free draft without an entry', async () => {
      await assertSucceeds(start('dana', { draft: { paidWith: 'none', cost: 0, entryId: null } }))
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 5 })
    })

    it.each<[string, string, StartSpec]>([
      ['a player paying less than the price', 'ayla', { draft: { cost: 1 } }],
      ['a player paying more than the price', 'ayla', { draft: { cost: 4 } }],
      ['a free draft by a player', 'ayla', { draft: { paidWith: 'none', cost: 0, entryId: null } }],
      ['a player starting a draft for someone else', 'ayla', { draft: { uid: 'bora', cost: 1 } }],
      ['a draft paid in GP', 'dana', { draft: { paidWith: 'gp' } }],
      [
        'a draft showing a word the player knows',
        'ayla',
        {
          draft: { offered: ['tw-abyss', 'tw-aid', 'tw-chaos'] },
        },
      ],
      ['a draft showing 2 words', 'ayla', { draft: { offered: ['tw-abyss', 'tw-aid'] } }],
      [
        'a draft showing a word twice',
        'ayla',
        {
          draft: { offered: ['tw-abyss', 'tw-abyss', 'tw-aid'] },
        },
      ],
      ['a draft that starts already ended', 'ayla', { draft: { status: 'skipped' } }],
      ['a paid draft without its entry', 'ayla', { entry: null }],
      ['a paid draft without the new LP', 'ayla', { balance: null }],
      ['a draft that the player state does not name', 'ayla', { state: null }],
      ['an entry for another amount', 'ayla', { entry: { delta: -1, balanceAfter: 4 } }],
      ['a DM draft over the limit', 'dana', { draft: { cost: 1000001 } }],
    ])('denies %s', async (_case, writer, spec) => {
      await assertFails(start(writer, spec))
    })

    it('denies a second open draft for the same player, by them or by the DM', async () => {
      await seedOpenDraft()
      const state = { openDraftId: 'd-new' }
      await assertFails(start('ayla', { state }))
      await assertFails(start('dana', { state }))
    })

    it("allows another player's draft while one is open", async () => {
      await seedOpenDraft()
      await assertSucceeds(start('bora', { draft: { uid: 'bora', cost: 1 } }))
    })
  })

  describe('learning', () => {
    it("lets the draft's player learn one of its words, inactive", async () => {
      await seedOpenDraft()
      await assertSucceeds(learn('ayla'))
      expect(await readAsAdmin('wordDrafts/d-open')).toMatchObject({
        status: 'learned',
        closedBy: 'ayla',
        learned: { wordId: 'tw-abyss', wordName: 'Abyss', recordId: 'r-new' },
      })
      expect(await readAsAdmin('userTrueWords/r-new')).toMatchObject({
        uid: 'ayla',
        learnedVia: 'draft',
        draftId: 'd-open',
        active: false,
      })
    })

    it('lets the DM learn for the player', async () => {
      await seedOpenDraft()
      await assertSucceeds(learn('dana'))
      expect(await readAsAdmin('wordDrafts/d-open')).toMatchObject({ closedBy: 'dana' })
    })

    it('denies another player', async () => {
      await seedOpenDraft()
      await assertFails(learn('bora'))
    })

    it('denies a word the draft does not show', async () => {
      await seedOpenDraft()
      await assertFails(learn('ayla', { wordId: 'tw-mimic', wordName: 'Mimic' }))
    })

    it('denies a shown word that the player came to know meanwhile', async () => {
      await seedOpenDraft()
      await testEnv.withSecurityRulesDisabled(async (admin) => {
        const db = firestoreOf(admin)
        await setDoc(doc(db, 'userTrueWords/r-abyss'), seededRecord('tw-abyss', 'Abyss'))
        await setDoc(doc(db, 'playerWords/ayla'), {
          known: { ...AYLA_KNOWN, 'tw-abyss': 'r-abyss' },
          openDraftId: 'd-open',
          recordId: 'r-abyss',
        })
      })
      await assertFails(learn('ayla', { state: { known: { ...AYLA_KNOWN, 'tw-abyss': 'r-new' } } }))
    })

    it('denies a shown word that the DM retired meanwhile, or that is a draft', async () => {
      await seedOpenDraft({ offered: ['tw-old', 'tw-aid', 'tw-dragon'] })
      await assertFails(learn('ayla', { wordId: 'tw-old', wordName: 'Old' }))
      await seedOpenDraft({ offered: ['tw-echo', 'tw-aid', 'tw-dragon'] })
      await assertFails(learn('ayla', { wordId: 'tw-echo', wordName: 'Echo' }))
    })

    it('denies a learned record without ending the draft, and a draft ended without its record', async () => {
      await seedOpenDraft()
      await assertFails(learn('ayla', { draft: null }))
      await assertFails(learn('ayla', { record: null }))
      await assertFails(learn('ayla', { state: null }))
    })

    it('denies a record that names another draft or another word', async () => {
      await seedOpenDraft()
      await assertFails(learn('ayla', { record: { draftId: 'd-other' } }))
      await assertFails(learn('ayla', { record: { wordId: 'tw-aid', wordName: 'Aid' } }))
    })
  })

  describe('skipping and cancelling', () => {
    it("lets the draft's player or the DM skip it, keeping the payment", async () => {
      await seedOpenDraft()
      await assertSucceeds(skip('ayla'))
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 2 })

      await seedOpenDraft()
      await assertSucceeds(skip('dana'))
    })

    it('denies another player skipping', async () => {
      await seedOpenDraft()
      await assertFails(skip('bora'))
    })

    it('lets the DM cancel a paid draft with a refund of its cost', async () => {
      await seedOpenDraft()
      await assertSucceeds(cancel('dana'))
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 5, lpEntryId: 'e-refund' })
      expect(await readAsAdmin('wordDrafts/d-open')).toMatchObject({
        status: 'cancelled',
        refundEntryId: 'e-refund',
      })
    })

    it('lets the DM cancel a free draft without a refund', async () => {
      await seedOpenDraft({ by: 'dana', paidWith: 'none', cost: 0, entryId: null })
      await assertSucceeds(cancel('dana', { paid: false }))
    })

    it('denies a player cancelling, even their own draft', async () => {
      await seedOpenDraft()
      await assertFails(cancel('ayla'))
    })

    it('denies a cancel of a paid draft without its refund', async () => {
      await seedOpenDraft()
      await assertFails(cancel('dana', { paid: false }))
    })
  })

  describe('teaching and taking back', () => {
    it('lets the DM teach any player a word they do not know, for free', async () => {
      await assertSucceeds(teach('dana'))
      expect(await readAsAdmin('userTrueWords/r-new')).toMatchObject({ learnedVia: 'dm' })
      expect(await readAsAdmin('playerWords/ayla')).toEqual({
        known: { ...AYLA_KNOWN, 'tw-abyss': 'r-new' },
        openDraftId: null,
        recordId: 'r-new',
      })
      expect(await readAsAdmin('users/ayla')).toMatchObject({ lp: 5 })
    })

    it('lets the DM teach a word to a player who never had a state', async () => {
      await assertSucceeds(teach('dana', { uid: 'bora', wordId: 'tw-aid', wordName: 'Aid' }))
      expect(await readAsAdmin('playerWords/bora')).toEqual({
        known: { 'tw-aid': 'r-new' },
        openDraftId: null,
        recordId: 'r-new',
      })
    })

    it('keeps an open draft open while the DM teaches', async () => {
      await seedOpenDraft()
      await assertSucceeds(
        teach('dana', { wordId: 'tw-mimic', wordName: 'Mimic', state: { openDraftId: 'd-open' } }),
      )
    })

    it.each<[string, string, TeachSpec]>([
      ['a player teaching themselves', 'ayla', {}],
      ['teaching a word the player knows', 'dana', { wordId: 'tw-chaos', wordName: 'Chaos' }],
      ['teaching a retired word', 'dana', { wordId: 'tw-old', wordName: 'Old' }],
      ['teaching a draft word', 'dana', { wordId: 'tw-echo', wordName: 'Echo' }],
      ['teaching a word that does not exist', 'dana', { wordId: 'tw-none', wordName: 'None' }],
      ['a record under another name', 'dana', { record: { wordName: 'Renamed' } }],
      ['a record that starts active', 'dana', { record: { active: true } }],
      ['a record without the state', 'dana', { state: null }],
      ['a state that keeps the old record', 'dana', { state: { recordId: 'r-hoard' } }],
      [
        'a state that also drops a word',
        'dana',
        {
          state: { known: { 'tw-abyss': 'r-new', 'tw-hoard': 'r-hoard' } },
        },
      ],
    ])('denies %s', async (_case, writer, spec) => {
      await assertFails(teach(writer, spec))
    })

    it('lets the DM take back a word, closing its record for good', async () => {
      await assertSucceeds(takeBack('dana'))
      expect(await readAsAdmin('userTrueWords/r-chaos')).toMatchObject({ removedBy: 'dana' })
      expect(await readAsAdmin('playerWords/ayla')).toEqual({
        known: { 'tw-hoard': 'r-hoard' },
        openDraftId: null,
        recordId: 'r-chaos',
      })
    })

    it('lets the DM teach a word again after taking it back, with a new record', async () => {
      await assertSucceeds(takeBack('dana'))
      await assertSucceeds(
        teach('dana', {
          wordId: 'tw-chaos',
          wordName: 'Chaos',
          state: { known: { 'tw-hoard': 'r-hoard', 'tw-chaos': 'r-new' } },
        }),
      )
    })

    it('denies a player taking back or forgetting a word', async () => {
      await assertFails(takeBack('ayla'))
    })

    it('denies a take-back without the state, or the state without the take-back', async () => {
      await assertFails(takeBack('dana', { state: false }))
      await assertFails(
        setDoc(doc(asUser('dana'), 'playerWords/ayla'), {
          known: { 'tw-hoard': 'r-hoard' },
          openDraftId: null,
          recordId: 'r-chaos',
        }),
      )
    })
  })

  describe('the active switch', () => {
    it('lets the DM switch a known word active and back', async () => {
      await assertSucceeds(
        updateDoc(doc(asUser('dana'), 'userTrueWords/r-chaos'), { active: true }),
      )
      await assertSucceeds(
        updateDoc(doc(asUser('dana'), 'userTrueWords/r-chaos'), { active: false }),
      )
    })

    it('denies a player switching their own word', async () => {
      await assertFails(updateDoc(doc(asUser('ayla'), 'userTrueWords/r-chaos'), { active: true }))
    })

    it('denies switching a word that was taken back', async () => {
      await testEnv.withSecurityRulesDisabled(async (admin) => {
        await updateDoc(doc(firestoreOf(admin), 'userTrueWords/r-chaos'), {
          removedAt: Timestamp.fromMillis(2000),
          removedBy: 'dana',
        })
      })
      await assertFails(updateDoc(doc(asUser('dana'), 'userTrueWords/r-chaos'), { active: true }))
    })

    it('denies changing anything else with the switch', async () => {
      await assertFails(
        updateDoc(doc(asUser('dana'), 'userTrueWords/r-chaos'), { active: true, wordName: 'X' }),
      )
    })
  })

  describe('the table waits for an open pack', () => {
    /** Nothing to seed. */
    const nothing = () => Promise.resolve()
    const STEPS: [string, () => Promise<void>, () => Promise<void>][] = [
      ['a player starts a draft', nothing, () => start('ayla')],
      [
        'the DM starts a free draft',
        nothing,
        () => start('dana', { draft: { paidWith: 'none', cost: 0, entryId: null } }),
      ],
      ['a player learns from their draft', () => seedOpenDraft(), () => learn('ayla')],
      ['a player skips their draft', () => seedOpenDraft(), () => skip('ayla')],
      ['the DM cancels a draft', () => seedOpenDraft(), () => cancel('dana')],
      ['the DM teaches a word', nothing, () => teach('dana')],
      ['the DM takes back a word', nothing, () => takeBack('dana')],
    ]

    it.each(STEPS)(
      'denies that %s while a pack is open, and allows it after',
      async (_case, seed, act) => {
        await seed()
        await setTable('p-open')
        await assertFails(act())
        await setTable(null)
        await assertSucceeds(act())
      },
    )

    it('still lets the DM switch a word active while a pack is open', async () => {
      await setTable('p-open')
      await assertSucceeds(
        updateDoc(doc(asUser('dana'), 'userTrueWords/r-chaos'), { active: true }),
      )
    })
  })

  describe('the heaviest requests', () => {
    it("allows the DM's paid start: the draft, the state, the entry and the LP", async () => {
      await setTable(null)
      await assertSucceeds(start('dana'))
      expect(await readAsAdmin('ledger/e-pay')).toMatchObject({
        source: 'wordDraft',
        drawId: 'd-new',
      })
    })

    it("allows the DM's cancel with a refund: the draft, the state, the entry and the LP", async () => {
      await setTable(null)
      await seedOpenDraft()
      await assertSucceeds(cancel('dana'))
    })

    it('allows the DM learning for the player: the draft, the record, the state and the word', async () => {
      await setTable(null)
      await seedOpenDraft()
      await assertSucceeds(learn('dana'))
    })
  })

  describe('ended drafts, closed records and deleting', () => {
    it('denies changing an ended draft, even for the DM', async () => {
      await seedOpenDraft()
      await testEnv.withSecurityRulesDisabled(async (admin) => {
        await updateDoc(doc(firestoreOf(admin), 'wordDrafts/d-open'), {
          status: 'skipped',
          closedAt: Timestamp.fromMillis(6000),
          closedBy: 'ayla',
        })
      })
      await assertFails(cancel('dana'))
      await assertFails(updateDoc(doc(asUser('dana'), 'wordDrafts/d-open'), { cost: 0 }))
    })

    it('denies deleting a word, a state, a record or a draft', async () => {
      await seedOpenDraft()
      const db = asUser('dana')
      await assertFails(deleteDoc(doc(db, 'trueWords/tw-abyss')))
      await assertFails(deleteDoc(doc(db, 'playerWords/ayla')))
      await assertFails(deleteDoc(doc(db, 'userTrueWords/r-chaos')))
      await assertFails(deleteDoc(doc(db, 'wordDrafts/d-open')))
    })

    it('denies writing a word from the application, even for the DM', async () => {
      await assertFails(setDoc(doc(asUser('dana'), 'trueWords/tw-new'), word('New')))
      await assertFails(updateDoc(doc(asUser('dana'), 'trueWords/tw-abyss'), { cost: '2' }))
    })

    it('denies a player state written alone', async () => {
      await assertFails(
        setDoc(doc(asUser('ayla'), 'playerWords/ayla'), { ...AYLA_STATE, openDraftId: 'd-x' }),
      )
      await assertFails(
        setDoc(doc(asUser('dana'), 'playerWords/bora'), {
          known: { 'tw-abyss': 'r-x' },
          openDraftId: null,
          recordId: 'r-x',
        }),
      )
    })
  })
})

describe('player notes (playerNotes/{uid}) and DM notes (dmNotes/{uid})', () => {
  const COLLECTIONS = ['playerNotes', 'dmNotes'] as const
  type NoteCollection = (typeof COLLECTIONS)[number]

  /** Who may write the note about Ayla in each collection: Ayla herself, or the DM. */
  const WRITER: Record<NoteCollection, string> = { playerNotes: 'ayla', dmNotes: 'dana' }

  /** A note as the application saves it: the signed-in user as its last editor, and the server time. */
  const noteBy = (uid: string, overrides: Record<string, unknown> = {}) => ({
    text: 'Kayıp kardeşini arıyor.',
    updatedBy: uid,
    updatedAt: serverTimestamp(),
    ...overrides,
  })

  const save = (by: string, path: string, overrides?: Record<string, unknown>) =>
    setDoc(doc(asUser(by), path), noteBy(by, overrides))

  /** Bora has both notes, last saved by Dana. Ayla has none yet, so her first save creates the document. */
  const STORED = { text: 'Eski not.', updatedBy: 'dana', updatedAt: Timestamp.fromMillis(1000) }

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await setDoc(doc(db, 'users/ayla'), seededUser('player', 'Ayla'))
      await setDoc(doc(db, 'users/bora'), seededUser('player', 'Bora'))
      await setDoc(doc(db, 'users/dana'), seededUser('dm', 'Dana'))
      await setDoc(doc(db, 'playerNotes/bora'), STORED)
      await setDoc(doc(db, 'dmNotes/bora'), STORED)
    })
  })

  describe('signed out', () => {
    it.each(COLLECTIONS)('denies reading and writing %s', async (collectionName) => {
      const db = firestoreOf(testEnv.unauthenticatedContext())
      await assertFails(getDoc(doc(db, `${collectionName}/bora`)))
      await assertFails(
        setDoc(doc(db, `${collectionName}/ayla`), {
          text: 'x',
          updatedBy: 'ayla',
          updatedAt: serverTimestamp(),
        }),
      )
    })
  })

  describe('the player note', () => {
    it.each(['ayla', 'bora', 'dana'])('lets %s read any player note', async (uid) => {
      await assertSucceeds(getDoc(doc(asUser(uid), 'playerNotes/bora')))
      await assertSucceeds(getDoc(doc(asUser(uid), 'playerNotes/ayla')))
      await assertSucceeds(getDocs(collection(asUser(uid), 'playerNotes')))
    })

    it('lets a player create and change their own note', async () => {
      await assertSucceeds(save('ayla', 'playerNotes/ayla'))
      expect(await readAsAdmin('playerNotes/ayla')).toMatchObject({
        text: 'Kayıp kardeşini arıyor.',
        updatedBy: 'ayla',
      })
      await assertSucceeds(save('bora', 'playerNotes/bora', { text: '' }))
      expect(await readAsAdmin('playerNotes/bora')).toMatchObject({ text: '', updatedBy: 'bora' })
    })

    it("lets the DM write any player's note", async () => {
      await assertSucceeds(save('dana', 'playerNotes/ayla'))
      await assertSucceeds(save('dana', 'playerNotes/bora', { text: 'DM yazdı.' }))
      expect(await readAsAdmin('playerNotes/bora')).toMatchObject({
        text: 'DM yazdı.',
        updatedBy: 'dana',
      })
    })

    it("denies a player writing another player's note", async () => {
      await assertFails(save('bora', 'playerNotes/ayla'))
      await assertFails(save('ayla', 'playerNotes/bora'))
      await assertFails(updateDoc(doc(asUser('ayla'), 'playerNotes/bora'), { text: 'x' }))
      expect(await readAsAdmin('playerNotes/bora')).toMatchObject(STORED)
    })
  })

  describe('the DM note', () => {
    it('lets the DM read DM notes, existing or not', async () => {
      await assertSucceeds(getDoc(doc(asUser('dana'), 'dmNotes/bora')))
      await assertSucceeds(getDoc(doc(asUser('dana'), 'dmNotes/ayla')))
      await assertSucceeds(getDocs(collection(asUser('dana'), 'dmNotes')))
    })

    it('denies a player reading any DM note, the one about them included', async () => {
      await assertFails(getDoc(doc(asUser('ayla'), 'dmNotes/ayla')))
      await assertFails(getDoc(doc(asUser('ayla'), 'dmNotes/bora')))
      await assertFails(getDoc(doc(asUser('bora'), 'dmNotes/bora')))
      await assertFails(getDocs(collection(asUser('bora'), 'dmNotes')))
    })

    it('lets the DM write any DM note, the one about the DM included', async () => {
      await assertSucceeds(save('dana', 'dmNotes/ayla', { text: 'Kardeşi aslında hayatta.' }))
      await assertSucceeds(save('dana', 'dmNotes/bora'))
      await assertSucceeds(save('dana', 'dmNotes/dana'))
      expect(await readAsAdmin('dmNotes/ayla')).toMatchObject({
        text: 'Kardeşi aslında hayatta.',
        updatedBy: 'dana',
      })
    })

    it('denies a player writing any DM note', async () => {
      await assertFails(save('ayla', 'dmNotes/ayla'))
      await assertFails(save('bora', 'dmNotes/bora'))
      await assertFails(save('ayla', 'dmNotes/bora'))
      expect(await readAsAdmin('dmNotes/bora')).toMatchObject(STORED)
    })
  })

  describe.each(COLLECTIONS)('the limits and fields of %s', (collectionName) => {
    const writer = WRITER[collectionName]
    const path = `${collectionName}/ayla`

    it.each([
      ['2000 ASCII letters', 'x'.repeat(2000)],
      ['2000 Turkish letters', 'ğ'.repeat(2000)],
      ['line breaks', 'Bir.\nİki.\n\nÜç.'],
      ['an empty text', ''],
    ])('allows %s', async (_case, text) => {
      await assertSucceeds(save(writer, path, { text }))
    })

    it.each([
      ['2001 characters', { text: 'x'.repeat(2001) }],
      ['2001 Turkish letters', { text: 'ğ'.repeat(2001) }],
      ['a text that is not a string', { text: 42 }],
      ['a forged last editor', { updatedBy: 'bora' }],
      ['a time that is not the server time', { updatedAt: Timestamp.fromMillis(5000) }],
      ['an extra field', { extra: true }],
    ])('denies %s', async (_case, overrides) => {
      await assertFails(save(writer, path, overrides))
    })

    it('denies a note without its time', async () => {
      await assertFails(setDoc(doc(asUser(writer), path), { text: 'x', updatedBy: writer }))
    })

    it('denies a note about a user who has no profile', async () => {
      await assertFails(save('dana', `${collectionName}/ghost`))
      await assertFails(save('ghost', `${collectionName}/ghost`))
    })

    it('denies deleting a note, even for the DM', async () => {
      await assertFails(deleteDoc(doc(asUser('dana'), `${collectionName}/bora`)))
      await assertFails(deleteDoc(doc(asUser('bora'), `${collectionName}/bora`)))
      expect(await readAsAdmin(`${collectionName}/bora`)).toMatchObject(STORED)
    })

    it('allows writing the note while a pack is open', async () => {
      await testEnv.withSecurityRulesDisabled(async (admin) => {
        await setDoc(doc(firestoreOf(admin), 'table/main'), { openPackId: 'p-open' })
      })
      await assertSucceeds(save(writer, path))
    })
  })
})
