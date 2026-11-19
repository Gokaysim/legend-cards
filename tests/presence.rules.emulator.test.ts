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
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

import { memberContext, outsiderContext, seedMembers } from '../src/test/members.ts'

// The rules of a user's presence (firestore.rules: presence/{uid}; spec: player-presence, "Presence access"; design D5
// of show-online-players).

const PROJECT_ID = 'demo-legend-cards'

let testEnv: RulesTestEnvironment

function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

const asUser = (uid: string) => firestoreOf(memberContext(testEnv, uid))
const signedOut = () => firestoreOf(testEnv.unauthenticatedContext())
const outsider = () => firestoreOf(outsiderContext(testEnv))

/** A report as the app writes it. */
const report = () => ({ lastSeen: serverTimestamp() })

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
    await setDoc(doc(firestoreOf(admin), 'presence/ayla'), { lastSeen: Timestamp.fromMillis(0) })
  })
})

describe('reading presence', () => {
  it('lets a member read anyone’s presence, one record or all of them', async () => {
    await assertSucceeds(getDoc(doc(asUser('bora'), 'presence/ayla')))
    await assertSucceeds(getDocs(collection(asUser('bora'), 'presence')))
  })

  it('denies a signed-out request', async () => {
    await assertFails(getDoc(doc(signedOut(), 'presence/ayla')))
    await assertFails(getDocs(collection(signedOut(), 'presence')))
  })

  it('denies an account that is not on the access list', async () => {
    await assertFails(getDoc(doc(outsider(), 'presence/ayla')))
    await assertFails(getDocs(collection(outsider(), 'presence')))
  })
})

describe('writing presence', () => {
  it('lets a member create their own record with the server time', async () => {
    await assertSucceeds(setDoc(doc(asUser('bora'), 'presence/bora'), report()))
  })

  it('lets a member update their own record with the server time', async () => {
    await assertSucceeds(setDoc(doc(asUser('ayla'), 'presence/ayla'), report()))
    await assertSucceeds(updateDoc(doc(asUser('ayla'), 'presence/ayla'), report()))
  })

  it('denies writing someone else’s record', async () => {
    await assertFails(setDoc(doc(asUser('bora'), 'presence/ayla'), report()))
    await assertFails(setDoc(doc(asUser('bora'), 'presence/dana'), report()))
  })

  it('denies a time from the client', async () => {
    await assertFails(setDoc(doc(asUser('bora'), 'presence/bora'), { lastSeen: Timestamp.now() }))
    await assertFails(setDoc(doc(asUser('ayla'), 'presence/ayla'), { lastSeen: null }))
  })

  it('denies any other field', async () => {
    await assertFails(setDoc(doc(asUser('bora'), 'presence/bora'), { ...report(), online: true }))
    await assertFails(setDoc(doc(asUser('bora'), 'presence/bora'), {}))
    await assertFails(updateDoc(doc(asUser('ayla'), 'presence/ayla'), { away: true }))
  })

  it('denies a signed-out request and an outsider, even for their own uid', async () => {
    await assertFails(setDoc(doc(signedOut(), 'presence/bora'), report()))
    await assertFails(setDoc(doc(outsider(), 'presence/cem'), report()))
  })
})

describe('removing presence', () => {
  it('lets a member remove their own record', async () => {
    await assertSucceeds(deleteDoc(doc(asUser('ayla'), 'presence/ayla')))
  })

  it('denies removing someone else’s record', async () => {
    await assertFails(deleteDoc(doc(asUser('bora'), 'presence/ayla')))
  })

  it('denies a signed-out request and an outsider', async () => {
    await assertFails(deleteDoc(doc(signedOut(), 'presence/ayla')))
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), 'presence/cem'), { lastSeen: Timestamp.fromMillis(0) })
    })
    await assertFails(deleteDoc(doc(outsider(), 'presence/cem')))
  })
})
