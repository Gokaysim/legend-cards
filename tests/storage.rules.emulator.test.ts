import { readFileSync } from 'node:fs'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, type Firestore, setDoc, Timestamp } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

// The Cloud Storage rules (storage.rules; spec: card-images, "Anyone may open a stored picture", "Stored picture
// files"; data-access-control). The DM's role comes from the Firestore profile through cross-service rules.

const PROJECT_ID = 'demo-legend-cards'

const CARD_PICTURE = 'cards/legend-abolethseyes/93e6f39a91.webp'
const CURSED_PICTURE = 'cards/cursed-hex/0123456789.webp'
const WORD_PICTURE = 'words/tw-abyss/abcdef0123.webp'
const SET_PICTURE = 'sets/kesqer/0a1b2c3d4e.webp'
const WEBP = { contentType: 'image/webp' }

let testEnv: RulesTestEnvironment

/** A small file of `size` bytes. The rules check the declared type and the size, not the content. */
const bytes = (size = 64) => new Uint8Array(size).fill(7)

/** The test context's Storage is a compat instance. */
const storageOf = (context: RulesTestContext) => context.storage()

const as = (uid: string) => storageOf(testEnv.authenticatedContext(uid))
const signedOut = () => storageOf(testEnv.unauthenticatedContext())

function put(
  storage: ReturnType<typeof storageOf>,
  path: string,
  data = bytes(),
  metadata: { contentType: string } = WEBP,
) {
  return storage
    .ref(path)
    .put(data, metadata)
    .then(() => undefined)
}

async function seedFile(path: string) {
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    await put(storageOf(admin), path)
  })
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
    storage: {
      host: '127.0.0.1',
      port: 9199,
      rules: readFileSync(new URL('../storage.rules', import.meta.url), 'utf8'),
    },
  })
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = admin.firestore() as unknown as Firestore
    const profile = (displayName: string, role: 'dm' | 'player') => ({
      displayName,
      photoURL: null,
      role,
      createdAt: Timestamp.fromMillis(0),
    })
    await setDoc(doc(db, 'users/dana'), profile('Dana', 'dm'))
    await setDoc(doc(db, 'users/ayla'), profile('Ayla', 'player'))
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearStorage()
})

describe('the DM stores pictures', () => {
  it.each([CARD_PICTURE, CURSED_PICTURE, WORD_PICTURE, SET_PICTURE])('creates %s', async (path) => {
    await assertSucceeds(put(as('dana'), path))
  })

  it('replaces a picture at the same path', async () => {
    await seedFile(CARD_PICTURE)
    await assertSucceeds(put(as('dana'), CARD_PICTURE))
  })

  it('stores a picture of exactly 1 MB', async () => {
    await assertSucceeds(put(as('dana'), CARD_PICTURE, bytes(1024 * 1024)))
  })

  it.each([CARD_PICTURE, WORD_PICTURE, SET_PICTURE])('deletes %s', async (path) => {
    await seedFile(path)
    await assertSucceeds(as('dana').ref(path).delete())
  })
})

describe('anyone may read a picture', () => {
  it.each([CARD_PICTURE, WORD_PICTURE, SET_PICTURE])(
    'a signed-out request reads %s',
    async (path) => {
      await seedFile(path)
      await assertSucceeds(signedOut().ref(path).getMetadata())
    },
  )

  it('a player reads a picture', async () => {
    await seedFile(CARD_PICTURE)
    await assertSucceeds(as('ayla').ref(CARD_PICTURE).getMetadata())
  })
})

describe('everyone else is denied', () => {
  it.each([CARD_PICTURE, WORD_PICTURE, SET_PICTURE])('a player cannot store %s', async (path) => {
    await assertFails(put(as('ayla'), path))
  })

  it('a signed-out request cannot store a picture', async () => {
    await assertFails(put(signedOut(), CARD_PICTURE))
  })

  it('a user without a profile cannot store a picture', async () => {
    await assertFails(put(as('stranger'), CARD_PICTURE))
  })

  it.each([CARD_PICTURE, WORD_PICTURE, SET_PICTURE])('a player cannot delete %s', async (path) => {
    await seedFile(path)
    await assertFails(as('ayla').ref(path).delete())
  })

  it('a signed-out request cannot delete a picture', async () => {
    await seedFile(CARD_PICTURE)
    await assertFails(signedOut().ref(CARD_PICTURE).delete())
  })
})

describe('only valid picture files are stored', () => {
  it('refuses a PNG', async () => {
    await assertFails(put(as('dana'), CARD_PICTURE, bytes(), { contentType: 'image/png' }))
  })

  it('refuses a file over 1 MB', async () => {
    await assertFails(put(as('dana'), CARD_PICTURE, bytes(1024 * 1024 + 1)))
  })

  it('refuses a set picture that is a PNG or over 1 MB', async () => {
    await assertFails(put(as('dana'), SET_PICTURE, bytes(), { contentType: 'image/png' }))
    await assertFails(put(as('dana'), SET_PICTURE, bytes(1024 * 1024 + 1)))
  })

  it.each([
    'cards/legend-abolethseyes/picture.webp',
    'cards/legend-abolethseyes/93E6F39A91.webp',
    'cards/legend-abolethseyes/93e6f39a9.webp',
    'cards/legend-abolethseyes/93e6f39a91.png',
  ])('refuses the file name of %s', async (path) => {
    await assertFails(put(as('dana'), path))
  })

  it.each([
    'cards/tw-abyss/93e6f39a91.webp',
    'cards/abolethseyes/93e6f39a91.webp',
    'words/legend-abolethseyes/93e6f39a91.webp',
    'sets/The End/93e6f39a91.webp',
    'sets/Kesqer/93e6f39a91.webp',
  ])('refuses the ID of %s', async (path) => {
    await assertFails(put(as('dana'), path))
  })
})

describe('every other path is closed', () => {
  const OTHER_PATHS = [
    'backs/kesqer/93e6f39a91.webp',
    'cards/93e6f39a91.webp',
    'cards/legend-abolethseyes/old/93e6f39a91.webp',
    'anything/at/any/depth.webp',
  ]

  it.each(OTHER_PATHS)('the DM cannot store %s', async (path) => {
    await assertFails(put(as('dana'), path))
  })

  it.each(OTHER_PATHS)('nobody reads %s', async (path) => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await put(storageOf(admin), path)
    })
    await assertFails(as('dana').ref(path).getMetadata())
    await assertFails(signedOut().ref(path).getMetadata())
  })
})
