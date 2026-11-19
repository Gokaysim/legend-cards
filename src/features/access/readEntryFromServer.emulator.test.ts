import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, type Firestore, onSnapshot, setDoc, Timestamp } from 'firebase/firestore'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore/lite'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { memberContext, memberEmail, seedMembers } from '@/test/members'

import firestoreRules from '../../../firestore.rules?raw'
import { readEntryFromServer } from './api'

// Design D4 of drop-persistent-cache-and-dm-own-entry-query: the diagnostic read goes through Firestore Lite, with the
// account's token, under the real rules, whatever a listener on the same entry says.

const PROJECT_ID = 'demo-legend-cards'

vi.mock('@/lib/firebase/app', async () => {
  const { initializeApp } = await import('firebase/app')
  return {
    firebaseApp: initializeApp({ projectId: 'demo-legend-cards', apiKey: 'test' }, 'lite-test'),
    // The test connects Lite to the emulator itself, with Ayla's token.
    firebaseSettings: { useEmulators: false },
    EMULATOR_HOST: '127.0.0.1',
    FIRESTORE_EMULATOR_PORT: 8080,
  }
})

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: '127.0.0.1', port: 8080, rules: firestoreRules },
  })
  // `readEntryFromServer` loads `@/lib/firebase/app` through the mock above; Lite then reuses this instance.
  const { firebaseApp } = await import('@/lib/firebase/app')
  connectFirestoreEmulator(getFirestore(firebaseApp), '127.0.0.1', 8080, {
    mockUserToken: { sub: 'ayla', email: memberEmail('ayla'), email_verified: true },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await seedMembers(testEnv)
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = admin.firestore() as unknown as Firestore
    await setDoc(doc(db, 'users/ayla'), {
      displayName: 'Ayla',
      photoURL: null,
      createdAt: Timestamp.fromMillis(0),
      role: 'player',
    })
  })
})

describe('readEntryFromServer under the real rules', () => {
  it('finds the own entry while a listener follows it, and reports a missing one', async () => {
    // Ayla's app follows her own entry, as the access check does, and the listener stays open during the reads.
    const ayla = memberContext(testEnv, 'ayla').firestore() as unknown as Firestore
    let stop = () => {}
    await new Promise<void>((resolve) => {
      stop = onSnapshot(doc(ayla, 'allowedEmails', memberEmail('ayla')), () => {
        resolve()
      })
    })

    expect(await readEntryFromServer(memberEmail('ayla'))).toBe('exists')

    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await deleteDoc(
        doc(admin.firestore() as unknown as Firestore, 'allowedEmails', memberEmail('ayla')),
      )
    })
    expect(await readEntryFromServer(memberEmail('ayla'))).toBe('missing')
    stop()
  })

  it("reports a denied read of another person's entry by its code", async () => {
    expect(await readEntryFromServer(memberEmail('dana'))).toBe('error:permission-denied')
  })
})
