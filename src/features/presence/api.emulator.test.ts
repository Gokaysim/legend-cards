import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { type Firestore, getDoc, Timestamp } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { memberContext, seedMembers } from '@/test/members'

import firestoreRules from '../../../firestore.rules?raw'
import { beat, presenceRef, removePresence } from './api'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

/** Ayla's Firestore, under the real rules. */
const aylaDb = () => firestoreOf(memberContext(testEnv, 'ayla'))

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-legend-cards',
    firestore: { host: '127.0.0.1', port: 8080, rules: firestoreRules },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await seedMembers(testEnv)
})

describe('beat', () => {
  it('stores the server time of the report, and a later report moves it on', async () => {
    const db = aylaDb()
    const before = Timestamp.now().toMillis()
    await beat(db, 'ayla')
    const first = (await getDoc(presenceRef(db, 'ayla'))).data()
    expect(first?.uid).toBe('ayla')
    expect(first?.lastSeen).toBeInstanceOf(Timestamp)
    // The emulator's clock is this machine's, so the server time falls around the write.
    expect(Math.abs((first?.lastSeen?.toMillis() ?? 0) - before)).toBeLessThan(60 * 1000)

    await beat(db, 'ayla')
    const second = (await getDoc(presenceRef(db, 'ayla'))).data()
    expect(second?.lastSeen?.toMillis()).toBeGreaterThanOrEqual(first?.lastSeen?.toMillis() ?? 0)
  })
})

describe('removePresence', () => {
  it('deletes the record, and succeeds when there is none', async () => {
    const db = aylaDb()
    await beat(db, 'ayla')
    await removePresence(db, 'ayla')
    expect((await getDoc(presenceRef(db, 'ayla'))).exists()).toBe(false)
    await expect(removePresence(db, 'ayla')).resolves.toBeUndefined()
  })
})
