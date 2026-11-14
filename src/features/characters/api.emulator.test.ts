import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, type Firestore, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { type FirebaseStorage, getMetadata, ref, uploadBytes } from 'firebase/storage'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { cloudPictureStore, type PictureStore } from '@/features/definitions/pictureStore'

import firestoreRules from '../../../firestore.rules?raw'
import storageRules from '../../../storage.rules?raw'
import { addCharacter, saveCharacter, setCharacterArchived } from './api'
import { PhotoNeedsConnectionError } from './errors'
import type { Character } from './schema'

let testEnv: RulesTestEnvironment

function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

function storageOf(context: RulesTestContext): FirebaseStorage {
  return (context.storage() as unknown as { _delegate: FirebaseStorage })._delegate
}

const as = (uid: string) => firestoreOf(testEnv.authenticatedContext(uid))
const picturesOf = (uid: string): PictureStore =>
  cloudPictureStore(storageOf(testEnv.authenticatedContext(uid)))
const online = () => true

const photoOf = (hash: string) => ({
  kind: 'new' as const,
  blob: new Blob([new TextEncoder().encode(hash)], { type: 'image/webp' }),
  hash,
})

/** Ayla's stored "Thorin", with a photo. */
const THORIN_ID = 'ThorinAyla0123456789'
const THORIN_PHOTO = `characters/${THORIN_ID}/0123456789.webp`
const THORIN: Character = {
  id: THORIN_ID,
  uid: 'ayla',
  name: 'Thorin',
  picture: THORIN_PHOTO,
  archived: false,
  createdAt: Timestamp.fromMillis(1000),
  createdBy: 'ayla',
}

async function readAsAdmin(path: string): Promise<Record<string, unknown> | undefined> {
  let data: Record<string, unknown> | undefined
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    data = (await getDoc(doc(firestoreOf(admin), path))).data()
  })
  return data
}

async function fileExists(path: string): Promise<boolean> {
  let exists = false
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    try {
      await getMetadata(ref(storageOf(admin), path))
      exists = true
    } catch {
      exists = false
    }
  })
  return exists
}

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the promise to fail')
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
    await setDoc(doc(db, 'users/bora'), profile('player'))
    await setDoc(doc(db, 'users/dana'), profile('dm'))
    const { id: _id, ...stored } = THORIN
    await setDoc(doc(db, `characters/${THORIN_ID}`), stored)
    await uploadBytes(ref(storageOf(admin), THORIN_PHOTO), new TextEncoder().encode('seeded'), {
      contentType: 'image/webp',
    })
  })
})

describe('addCharacter', () => {
  it('adds a character without a photo', async () => {
    const id = await addCharacter(as('ayla'), { uid: 'ayla', name: '  Kuzgun ', by: 'ayla' })
    expect(id).toMatch(/^[A-Za-z0-9]{20}$/)
    expect(await readAsAdmin(`characters/${id}`)).toMatchObject({
      uid: 'ayla',
      name: 'Kuzgun',
      picture: null,
      archived: false,
      createdBy: 'ayla',
    })
  })

  it('adds a character with a photo, uploaded under its ID', async () => {
    const id = await addCharacter(
      as('ayla'),
      { uid: 'ayla', name: 'Kuzgun', by: 'ayla', picture: photoOf('abcdef0123') },
      picturesOf('ayla'),
      online,
    )
    const path = `characters/${id}/abcdef0123.webp`
    expect(await readAsAdmin(`characters/${id}`)).toMatchObject({ picture: path })
    expect(await fileExists(path)).toBe(true)
  })

  it("lets the DM add a player's character", async () => {
    const id = await addCharacter(as('dana'), { uid: 'bora', name: 'Elara', by: 'dana' })
    expect(await readAsAdmin(`characters/${id}`)).toMatchObject({ uid: 'bora', createdBy: 'dana' })
  })

  it('deletes its upload when the write is denied', async () => {
    const pictures = picturesOf('ayla')
    const remove = vi.spyOn(pictures, 'remove')
    const error = await failureOf(
      addCharacter(
        as('ayla'),
        { uid: 'bora', name: 'Elara', by: 'ayla', picture: photoOf('abcdef0123') },
        pictures,
        online,
      ),
    )
    expect(error).toMatchObject({ code: 'permission-denied' })
    expect(remove).toHaveBeenCalledTimes(1)
    const [path] = remove.mock.calls[0] ?? []
    expect(path).toMatch(/^characters\/[A-Za-z0-9]{20}\/abcdef0123\.webp$/)
    expect(await fileExists(path ?? '')).toBe(false)
  })

  it('refuses a photo offline before uploading anything', async () => {
    const pictures = picturesOf('ayla')
    const upload = vi.spyOn(pictures, 'upload')
    const error = await failureOf(
      addCharacter(
        as('ayla'),
        { uid: 'ayla', name: 'Kuzgun', by: 'ayla', picture: photoOf('abcdef0123') },
        pictures,
        () => false,
      ),
    )
    expect(error).toBeInstanceOf(PhotoNeedsConnectionError)
    expect(upload).not.toHaveBeenCalled()
  })
})

describe('saveCharacter', () => {
  it('renames without touching the photo', async () => {
    await saveCharacter(as('ayla'), { character: THORIN, name: 'Thorin Oakenshield' })
    expect(await readAsAdmin(`characters/${THORIN_ID}`)).toMatchObject({
      name: 'Thorin Oakenshield',
      picture: THORIN_PHOTO,
    })
  })

  it('replaces the photo and deletes the old file', async () => {
    await saveCharacter(
      as('ayla'),
      { character: THORIN, name: 'Thorin', picture: photoOf('abcdef0123') },
      picturesOf('ayla'),
      online,
    )
    const next = `characters/${THORIN_ID}/abcdef0123.webp`
    expect(await readAsAdmin(`characters/${THORIN_ID}`)).toMatchObject({ picture: next })
    expect(await fileExists(next)).toBe(true)
    expect(await fileExists(THORIN_PHOTO)).toBe(false)
  })

  it('lets the DM remove the photo, and deletes its file', async () => {
    await saveCharacter(
      as('dana'),
      { character: THORIN, name: 'Thorin', picture: { kind: 'remove' } },
      picturesOf('dana'),
    )
    expect(await readAsAdmin(`characters/${THORIN_ID}`)).toMatchObject({ picture: null })
    expect(await fileExists(THORIN_PHOTO)).toBe(false)
  })

  it("denies another player's save, and leaves no upload behind", async () => {
    const error = await failureOf(
      saveCharacter(
        as('bora'),
        { character: THORIN, name: 'Bora', picture: photoOf('fedcba9876') },
        picturesOf('bora'),
        online,
      ),
    )
    expect(error).toMatchObject({ code: 'storage/unauthorized' })
    expect(await readAsAdmin(`characters/${THORIN_ID}`)).toMatchObject({ name: 'Thorin' })
    expect(await fileExists(`characters/${THORIN_ID}/fedcba9876.webp`)).toBe(false)
  })

  it('writes nothing when nothing changed', async () => {
    await saveCharacter(as('bora'), { character: THORIN, name: ' Thorin ' })
    expect(await readAsAdmin(`characters/${THORIN_ID}`)).toMatchObject({ name: 'Thorin' })
  })
})

describe('setCharacterArchived', () => {
  it('archives a character and brings it back', async () => {
    await setCharacterArchived(as('ayla'), THORIN_ID, true)
    expect(await readAsAdmin(`characters/${THORIN_ID}`)).toMatchObject({ archived: true })
    await setCharacterArchived(as('dana'), THORIN_ID, false)
    expect(await readAsAdmin(`characters/${THORIN_ID}`)).toMatchObject({ archived: false })
  })

  it("denies another player's archive", async () => {
    const error = await failureOf(setCharacterArchived(as('bora'), THORIN_ID, true))
    expect(error).toMatchObject({ code: 'permission-denied' })
  })
})
