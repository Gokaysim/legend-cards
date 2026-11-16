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
import { type FirebaseStorage, getMetadata, ref, uploadBytes } from 'firebase/storage'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { cloudPictureStore, type PictureStore } from '@/features/definitions/pictureStore'
import { TableBusyError } from '@/features/table/errors'
import { memberContext, seedMembers } from '@/test/members'
import { testSet } from '@/test/setFixtures'

import firestoreRules from '../../../firestore.rules?raw'
import storageRules from '../../../storage.rules?raw'
import { addSet, deleteSet, moveSet, saveSet, setsRef, type SetFields } from './api'
import { SetChangedError, SetInUseError, SetTakenError } from './errors'
import type { CardSet } from './schema'

let testEnv: RulesTestEnvironment

function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

const as = (uid: string) => firestoreOf(memberContext(testEnv, uid))

function storageOf(context: RulesTestContext): FirebaseStorage {
  return (context.storage() as unknown as { _delegate: FirebaseStorage })._delegate
}

const picturesOf = (uid: string): PictureStore =>
  cloudPictureStore(storageOf(memberContext(testEnv, uid)))

const KESQER = testSet('Kesqer', 'Kesqerian Nights', 5)
const HAVENHOLM = testSet('Havenholm', 'Throne of Havenholm', 8)
const ULAGAL = testSet('Ulagal', 'Ballad of Ulagal', 9)
const SETS: CardSet[] = [KESQER, HAVENHOLM, ULAGAL]

const stored = ({ id: _id, ...set }: CardSet) => set
const fieldsOf = (set: CardSet): SetFields => ({
  name: set.name,
  aliases: set.aliases,
  packLayout: set.packLayout,
})

const pictureOf = (hash: string) => ({
  kind: 'new' as const,
  blob: new Blob([new TextEncoder().encode(hash)], { type: 'image/webp' }),
  hash,
})

async function readAsAdmin(path: string): Promise<Record<string, unknown> | undefined> {
  let data: Record<string, unknown> | undefined
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    data = (await getDoc(doc(firestoreOf(admin), path))).data()
  })
  return data
}

async function records(): Promise<Record<string, unknown>[]> {
  let docs: Record<string, unknown>[] = []
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    docs = (await getDocs(collection(firestoreOf(admin), 'setChanges'))).docs.map((entry) => ({
      id: entry.id,
      ...entry.data(),
    }))
  })
  return docs
}

const setNow = async (id: string) => (await getDoc(doc(setsRef(as('dana')), id))).data() as CardSet

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the promise to fail')
}

async function openPack() {
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(firestoreOf(admin), 'table/main'), { openPackId: 'p-open' })
  })
}

async function seedFile(path: string) {
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    await uploadBytes(ref(storageOf(admin), path), new TextEncoder().encode('seeded'), {
      contentType: 'image/webp',
    })
  })
}

async function fileAt(path: string) {
  let metadata: Awaited<ReturnType<typeof getMetadata>> | null = null
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    try {
      metadata = await getMetadata(ref(storageOf(admin), path))
    } catch {
      metadata = null
    }
  })
  return metadata as Awaited<ReturnType<typeof getMetadata>> | null
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-legend-cards',
    firestore: { host: '127.0.0.1', port: 8080, rules: firestoreRules },
    storage: { host: '127.0.0.1', port: 9199, rules: storageRules },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await seedMembers(testEnv)
  await testEnv.clearStorage()
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    const profile = (role: string) => ({
      displayName: role,
      photoURL: null,
      role,
      createdAt: Timestamp.fromMillis(0),
    })
    await setDoc(doc(db, 'users/ayla'), profile('player'))
    await setDoc(doc(db, 'users/dana'), profile('dm'))
    await setDoc(doc(db, 'table/main'), { openPackId: null })
    for (const set of SETS) await setDoc(doc(db, `sets/${set.id}`), stored(set))
  })
})

describe('adding a set', () => {
  const zaddir: SetFields = {
    name: 'Tower of Zaddir',
    aliases: ['zaddirs'],
    packLayout: 'standard',
  }

  it('adds the set last, without pictures, with its record', async () => {
    const id = await addSet(as('dana'), {
      code: 'Zaddir',
      fields: zaddir,
      by: 'dana',
      existing: SETS,
    })

    expect(id).toBe('zaddir')
    expect(await readAsAdmin('sets/zaddir')).toMatchObject({
      code: 'Zaddir',
      name: 'Tower of Zaddir',
      aliases: ['zaddirs'],
      position: 10,
      packLayout: 'standard',
      cardback: null,
      mascot: null,
    })
    const [record] = await records()
    expect(record).toMatchObject({ step: 'added', setId: 'zaddir', code: 'Zaddir', by: 'dana' })
    expect((await setNow('zaddir')).changeId).toBe(record?.id)
  })

  it('adds a set with its pictures', async () => {
    await addSet(
      as('dana'),
      {
        code: 'Zaddir',
        fields: zaddir,
        by: 'dana',
        existing: SETS,
        cardback: pictureOf('0123456789'),
        mascot: pictureOf('abcdef0123'),
      },
      picturesOf('dana'),
    )

    expect(await setNow('zaddir')).toMatchObject({
      cardback: 'sets/zaddir/0123456789.webp',
      mascot: 'sets/zaddir/abcdef0123.webp',
    })
    expect(await fileAt('sets/zaddir/0123456789.webp')).toMatchObject({
      contentDisposition: 'attachment; filename="zaddir-cardback.webp"',
    })
    expect(await fileAt('sets/zaddir/abcdef0123.webp')).toMatchObject({
      contentDisposition: 'attachment; filename="zaddir-cardmaker.webp"',
    })
  })

  it('refuses a code that exists in another spelling, and deletes its upload', async () => {
    const error = await failureOf(
      addSet(
        as('dana'),
        {
          code: 'KESQER',
          fields: zaddir,
          by: 'dana',
          existing: SETS,
          cardback: pictureOf('0123456789'),
        },
        picturesOf('dana'),
      ),
    )
    expect(error).toBeInstanceOf(SetTakenError)
    expect(await fileAt('sets/kesqer/0123456789.webp')).toBeNull()
    expect(await records()).toEqual([])
  })

  it("denies a player's add", async () => {
    await expect(
      addSet(as('ayla'), { code: 'Zaddir', fields: zaddir, by: 'ayla', existing: SETS }),
    ).rejects.toMatchObject({ code: 'permission-denied' })
  })
})

describe('editing a set', () => {
  it('renames a set and records the changed field', async () => {
    await saveSet(as('dana'), {
      set: ULAGAL,
      fields: { ...fieldsOf(ULAGAL), name: 'The Ballad of Ulagal' },
      by: 'dana',
    })

    expect((await setNow('ulagal')).name).toBe('The Ballad of Ulagal')
    expect(await records()).toEqual([
      expect.objectContaining({ step: 'edited', setId: 'ulagal', fields: ['name'] }),
    ])
  })

  it('writes nothing when nothing changed', async () => {
    await saveSet(as('dana'), { set: ULAGAL, fields: fieldsOf(ULAGAL), by: 'dana' })
    expect(await records()).toEqual([])
  })

  it('refuses a set that changed since the form opened', async () => {
    await saveSet(as('dana'), {
      set: ULAGAL,
      fields: { ...fieldsOf(ULAGAL), name: 'Elsewhere' },
      by: 'dana',
    })
    const error = await failureOf(
      saveSet(as('dana'), {
        set: ULAGAL,
        fields: { ...fieldsOf(ULAGAL), name: 'Here' },
        by: 'dana',
      }),
    )
    expect(error).toBeInstanceOf(SetChangedError)
    expect((await setNow('ulagal')).name).toBe('Elsewhere')
  })

  it('waits for an open pack to change the layout, but renames meanwhile', async () => {
    await openPack()
    const error = await failureOf(
      saveSet(as('dana'), {
        set: ULAGAL,
        fields: { ...fieldsOf(ULAGAL), packLayout: 'pandemonium' },
        by: 'dana',
      }),
    )
    expect(error).toBeInstanceOf(TableBusyError)
    await saveSet(as('dana'), {
      set: ULAGAL,
      fields: { ...fieldsOf(ULAGAL), name: 'The Ballad of Ulagal' },
      by: 'dana',
    })
    expect(await setNow('ulagal')).toMatchObject({
      name: 'The Ballad of Ulagal',
      packLayout: 'standard',
    })
  })

  it('replaces a cardback, deletes the old file, and removes a Cardmaker', async () => {
    await seedFile('sets/kesqer/aaaaaaaaaa.webp')
    await seedFile('sets/kesqer/bbbbbbbbbb.webp')
    const withPictures = {
      ...KESQER,
      cardback: 'sets/kesqer/aaaaaaaaaa.webp',
      mascot: 'sets/kesqer/bbbbbbbbbb.webp',
    }
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), 'sets/kesqer'), stored(withPictures))
    })

    await saveSet(
      as('dana'),
      {
        set: withPictures,
        fields: fieldsOf(KESQER),
        by: 'dana',
        cardback: pictureOf('0123456789'),
        mascot: { kind: 'remove' },
      },
      picturesOf('dana'),
    )

    expect(await setNow('kesqer')).toMatchObject({
      cardback: 'sets/kesqer/0123456789.webp',
      mascot: null,
    })
    expect(await readAsAdmin('sets/kesqer')).toHaveProperty('mascot', null)
    expect(await fileAt('sets/kesqer/aaaaaaaaaa.webp')).toBeNull()
    expect(await fileAt('sets/kesqer/bbbbbbbbbb.webp')).toBeNull()
    expect(await records()).toEqual([
      expect.objectContaining({ step: 'edited', fields: ['cardback', 'mascot'] }),
    ])
  })

  it('deletes the upload of a save that fails', async () => {
    await openPack()
    await failureOf(
      saveSet(
        as('dana'),
        {
          set: ULAGAL,
          fields: { ...fieldsOf(ULAGAL), packLayout: 'pandemonium' },
          by: 'dana',
          cardback: pictureOf('0123456789'),
        },
        picturesOf('dana'),
      ),
    )
    expect(await fileAt('sets/ulagal/0123456789.webp')).toBeNull()
    expect((await setNow('ulagal')).cardback).toBeNull()
  })
})

describe('moving a set', () => {
  it('swaps a set with the one before it, with one record', async () => {
    await moveSet(as('dana'), { set: ULAGAL, neighbour: HAVENHOLM, direction: 'up', by: 'dana' })

    expect((await setNow('ulagal')).position).toBe(8)
    expect((await setNow('havenholm')).position).toBe(9)
    expect(await records()).toEqual([
      expect.objectContaining({ step: 'moved', setId: 'ulagal', direction: 'up' }),
    ])
  })

  it('refuses a move from a stale order', async () => {
    await moveSet(as('dana'), { set: ULAGAL, neighbour: HAVENHOLM, direction: 'up', by: 'dana' })
    const error = await failureOf(
      moveSet(as('dana'), { set: ULAGAL, neighbour: HAVENHOLM, direction: 'up', by: 'dana' }),
    )
    expect(error).toBeInstanceOf(SetChangedError)
  })
})

describe('deleting a set', () => {
  it('deletes an unused set, its pictures, and records it', async () => {
    await seedFile('sets/ulagal/aaaaaaaaaa.webp')
    const withPicture = { ...ULAGAL, cardback: 'sets/ulagal/aaaaaaaaaa.webp' }
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), 'sets/ulagal'), stored(withPicture))
    })

    await deleteSet(as('dana'), { set: withPicture, cardCount: 0, by: 'dana' }, picturesOf('dana'))

    expect(await readAsAdmin('sets/ulagal')).toBeUndefined()
    expect(await fileAt('sets/ulagal/aaaaaaaaaa.webp')).toBeNull()
    expect(await records()).toEqual([
      expect.objectContaining({ id: 'del-ulagal-c-ulagal', step: 'deleted', setId: 'ulagal' }),
    ])
  })

  it('refuses a set that cards use', async () => {
    const error = await failureOf(deleteSet(as('dana'), { set: ULAGAL, cardCount: 1, by: 'dana' }))
    expect(error).toBeInstanceOf(SetInUseError)
    expect(await readAsAdmin('sets/ulagal')).toBeDefined()
  })

  it('waits for an open pack', async () => {
    await openPack()
    const error = await failureOf(deleteSet(as('dana'), { set: ULAGAL, cardCount: 0, by: 'dana' }))
    expect(error).toBeInstanceOf(TableBusyError)
    expect(await readAsAdmin('sets/ulagal')).toBeDefined()
  })
})
