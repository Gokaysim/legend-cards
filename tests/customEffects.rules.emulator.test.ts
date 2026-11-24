import { readFileSync } from 'node:fs'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  deleteDoc,
  doc,
  type Firestore,
  getDoc,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

import { memberContext, outsiderContext, seedMembers } from '../src/test/members.ts'

// The rules of the custom effect texts (firestore.rules: customEffects/{docId}; spec: custom-cards, "Custom effect
// variants"; design D2 of add-custom-card-draft).

const PROJECT_ID = 'demo-legend-cards'
const PATH = 'customEffects/main'

let testEnv: RulesTestEnvironment

function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

const asUser = (uid: string) => firestoreOf(memberContext(testEnv, uid))
const signedOut = () => firestoreOf(testEnv.unauthenticatedContext())
const outsider = () => firestoreOf(outsiderContext(testEnv))

const stored = {
  variants: { Caster: { '1': 'Bir büyü.', '3': 'Üç büyü.' } },
  importedAt: Timestamp.fromMillis(0),
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
  await seedMembers(testEnv)
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    const profile = (displayName: string, role: 'dm' | 'player') => ({
      displayName,
      photoURL: null,
      role,
      createdAt: Timestamp.fromMillis(0),
    })
    await setDoc(doc(db, 'users/dana'), profile('Dana', 'dm'))
    await setDoc(doc(db, 'users/ayla'), profile('Ayla', 'player'))
    await setDoc(doc(db, PATH), stored)
  })
})

describe('reading the custom effects', () => {
  it('lets a player and the DM read them', async () => {
    await assertSucceeds(getDoc(doc(asUser('ayla'), PATH)))
    await assertSucceeds(getDoc(doc(asUser('dana'), PATH)))
  })

  it('denies signed-out users and accounts that are not on the access list', async () => {
    await assertFails(getDoc(doc(signedOut(), PATH)))
    await assertFails(getDoc(doc(outsider(), PATH)))
  })
})

describe('writing the custom effects', () => {
  it('denies a player every write', async () => {
    const db = asUser('ayla')
    await assertFails(setDoc(doc(db, PATH), stored))
    await assertFails(updateDoc(doc(db, PATH), { 'variants.Caster.1': 'Yeni.' }))
    await assertFails(deleteDoc(doc(db, PATH)))
  })

  it('denies the DM every write', async () => {
    const db = asUser('dana')
    await assertFails(setDoc(doc(db, PATH), stored))
    await assertFails(updateDoc(doc(db, PATH), { 'variants.Caster.1': 'Yeni.' }))
    await assertFails(setDoc(doc(db, 'customEffects/other'), stored))
    await assertFails(deleteDoc(doc(db, PATH)))
  })

  it('denies signed-out users and outsiders every write', async () => {
    await assertFails(setDoc(doc(signedOut(), PATH), stored))
    await assertFails(setDoc(doc(outsider(), PATH), stored))
  })
})
