import { readFileSync } from 'node:fs'

import {
  assertFails,
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
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const PROJECT_ID = 'demo-legend-cards'

/** Arbitrary paths, including names a later data model might use. None of them is opened yet. */
const SAMPLE_PATHS = [
  'cards/card-1',
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
    await assertFails(getDocs(collection(db, 'cards')))
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
