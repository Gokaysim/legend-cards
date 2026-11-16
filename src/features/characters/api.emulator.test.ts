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
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { cloudPictureStore, type PictureStore } from '@/features/definitions/pictureStore'
import { memberContext, seedMembers } from '@/test/members'

import firestoreRules from '../../../firestore.rules?raw'
import storageRules from '../../../storage.rules?raw'
import { addCharacter, addEffect, removeEffect, saveCharacter, setCharacterArchived } from './api'
import { PhotoNeedsConnectionError } from './errors'
import type { Character } from './schema'

let testEnv: RulesTestEnvironment

function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

function storageOf(context: RulesTestContext): FirebaseStorage {
  return (context.storage() as unknown as { _delegate: FirebaseStorage })._delegate
}

const as = (uid: string) => firestoreOf(memberContext(testEnv, uid))
const picturesOf = (uid: string): PictureStore =>
  cloudPictureStore(storageOf(memberContext(testEnv, uid)))
const online = () => true

const SHEET = 'https://docs.google.com/document/d/abc'
const OTHER_SHEET = 'https://www.myth-weavers.com/sheet.html#id=1'

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

  it('adds a character with a sheet link', async () => {
    const id = await addCharacter(as('ayla'), {
      uid: 'ayla',
      name: 'Kuzgun',
      by: 'ayla',
      sheetUrl: SHEET,
    })
    expect(await readAsAdmin(`characters/${id}`)).toMatchObject({ sheetUrl: SHEET })
  })

  it.each([
    ['null', null],
    ['missing', undefined],
  ])('stores no sheet link field for a %s link', async (_case, sheetUrl) => {
    const id = await addCharacter(as('ayla'), { uid: 'ayla', name: 'Kuzgun', by: 'ayla', sheetUrl })
    expect(await readAsAdmin(`characters/${id}`)).not.toHaveProperty('sheetUrl')
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

  describe('the sheet link', () => {
    /** Ayla's "Thorin" with a stored sheet link. */
    const LINKED: Character = { ...THORIN, sheetUrl: SHEET }

    async function storeLink(): Promise<void> {
      await testEnv.withSecurityRulesDisabled(async (admin) => {
        await setDoc(
          doc(firestoreOf(admin), `characters/${THORIN_ID}`),
          { sheetUrl: SHEET },
          { merge: true },
        )
      })
    }

    it('adds a link', async () => {
      await saveCharacter(as('ayla'), { character: THORIN, name: 'Thorin', sheetUrl: SHEET })
      expect(await readAsAdmin(`characters/${THORIN_ID}`)).toMatchObject({ sheetUrl: SHEET })
    })

    it("lets the DM change a player's link", async () => {
      await storeLink()
      await saveCharacter(as('dana'), { character: LINKED, name: 'Thorin', sheetUrl: OTHER_SHEET })
      expect(await readAsAdmin(`characters/${THORIN_ID}`)).toMatchObject({ sheetUrl: OTHER_SHEET })
    })

    it('removes a link, leaving no field', async () => {
      await storeLink()
      await saveCharacter(as('ayla'), { character: LINKED, name: 'Thorin', sheetUrl: null })
      expect(await readAsAdmin(`characters/${THORIN_ID}`)).not.toHaveProperty('sheetUrl')
    })

    it('keeps the link on a rename', async () => {
      await storeLink()
      await saveCharacter(as('ayla'), { character: LINKED, name: 'Thorin Oakenshield' })
      expect(await readAsAdmin(`characters/${THORIN_ID}`)).toMatchObject({
        name: 'Thorin Oakenshield',
        sheetUrl: SHEET,
      })
    })

    it('changes the name, the photo and the link in one save', async () => {
      await saveCharacter(
        as('ayla'),
        { character: THORIN, name: 'Thorin II', picture: { kind: 'remove' }, sheetUrl: SHEET },
        picturesOf('ayla'),
      )
      expect(await readAsAdmin(`characters/${THORIN_ID}`)).toMatchObject({
        name: 'Thorin II',
        picture: null,
        sheetUrl: SHEET,
      })
    })

    it('writes nothing for the same link, or for no link on a character without one', async () => {
      await storeLink()
      // Bora may write nothing on Ayla's character, so any write would fail.
      await saveCharacter(as('bora'), { character: LINKED, name: 'Thorin', sheetUrl: SHEET })
      await saveCharacter(as('bora'), { character: THORIN, name: 'Thorin', sheetUrl: null })
    })

    it("denies another player's link", async () => {
      await storeLink()
      const error = await failureOf(
        saveCharacter(as('bora'), { character: LINKED, name: 'Thorin', sheetUrl: OTHER_SHEET }),
      )
      expect(error).toMatchObject({ code: 'permission-denied' })
      expect(
        await failureOf(
          saveCharacter(as('bora'), { character: LINKED, name: 'Thorin', sheetUrl: null }),
        ),
      ).toMatchObject({ code: 'permission-denied' })
      expect(await readAsAdmin(`characters/${THORIN_ID}`)).toMatchObject({ sheetUrl: SHEET })
    })
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

describe('effects by hand', () => {
  async function effects(): Promise<{ id: string; data: Record<string, unknown> }[]> {
    let docs: { id: string; data: Record<string, unknown> }[] = []
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      docs = (await getDocs(collection(firestoreOf(admin), 'characterEffects'))).docs.map(
        (entry) => ({ id: entry.id, data: entry.data() }),
      )
    })
    return docs
  }

  const add = (by: string, isDm = false) =>
    addEffect(as(by), {
      character: THORIN,
      name: ' Kutsal su ',
      text: '+1 to saves until dawn.',
      by,
      isDm,
    })

  it("adds the owner's own effect and the DM's effect", async () => {
    await add('ayla')
    await add('dana', true)

    const stored = (await effects()).map((effect) => effect.data)
    expect(stored).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'own',
          name: 'Kutsal su',
          uid: 'ayla',
          createdBy: 'ayla',
        }),
        expect.objectContaining({ source: 'dm', uid: 'ayla', createdBy: 'dana' }),
      ]),
    )
  })

  it("denies another player's effect", async () => {
    const error = await failureOf(add('bora'))
    expect(error).toMatchObject({ code: 'permission-denied' })
  })

  it('lets the owner and the DM remove an own effect, and only the DM a DM effect', async () => {
    await add('ayla')
    await add('ayla')
    await add('dana', true)
    const all = await effects()
    const own = all.filter((effect) => effect.data.source === 'own').map((effect) => effect.id)
    const dm = all.find((effect) => effect.data.source === 'dm')?.id ?? ''

    await removeEffect(as('ayla'), own[0] ?? '')
    await removeEffect(as('dana'), own[1] ?? '')
    expect(await failureOf(removeEffect(as('ayla'), dm))).toMatchObject({
      code: 'permission-denied',
    })
    await removeEffect(as('dana'), dm)
    expect(await effects()).toEqual([])
  })
})
