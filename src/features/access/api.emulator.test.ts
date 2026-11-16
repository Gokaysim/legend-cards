import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, type Firestore, getDoc, getDocs, setDoc, Timestamp } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { memberContext, memberEmail, seedMembers } from '@/test/members'

import firestoreRules from '../../../firestore.rules?raw'
import { accessEntriesRef, accessEntryRef, addEmail, linkOwnEntry, removeEmail } from './api'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

const as = (uid: string) => firestoreOf(memberContext(testEnv, uid))

async function storedEntry(email: string): Promise<Record<string, unknown> | undefined> {
  let data: Record<string, unknown> | undefined
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    data = (await getDoc(doc(firestoreOf(admin), 'allowedEmails', email))).data()
  })
  return data
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-legend-cards',
    firestore: { host: '127.0.0.1', port: 8080, rules: firestoreRules },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

// Dana is the DM and Ayla a player, both on the list and linked. Eren is on the list but has not entered yet.
beforeEach(async () => {
  await testEnv.clearFirestore()
  await seedMembers(testEnv)
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    const profile = { displayName: 'Ayla', photoURL: null, createdAt: Timestamp.fromMillis(0) }
    await setDoc(doc(db, 'users/ayla'), { ...profile, role: 'player' })
    await setDoc(doc(db, 'users/dana'), { ...profile, displayName: 'Dana', role: 'dm' })
    await setDoc(doc(db, 'allowedEmails/eren@example.com'), { addedAt: Timestamp.fromMillis(0) })
  })
})

describe('the DM manages the list under the real rules', () => {
  it('adds an address with the server time, and reads it back through the converter', async () => {
    await addEmail(as('dana'), 'cem@example.com')
    const entry = (await getDoc(accessEntryRef(as('dana'), 'cem@example.com'))).data()
    expect(entry?.email).toBe('cem@example.com')
    expect(entry?.addedAt).toBeInstanceOf(Timestamp)
    expect(entry?.uid).toBeUndefined()
  })

  it('rejects an address that is already on the list, and keeps the entry', async () => {
    await expect(addEmail(as('dana'), memberEmail('ayla'))).rejects.toMatchObject({
      code: 'permission-denied',
    })
    expect(await storedEntry(memberEmail('ayla'))).toEqual({
      addedAt: Timestamp.fromMillis(0),
      uid: 'ayla',
    })
  })

  it('removes an address', async () => {
    await removeEmail(as('dana'), 'eren@example.com')
    expect(await storedEntry('eren@example.com')).toBeUndefined()
  })

  it('lists every entry with its address', async () => {
    const snapshot = await getDocs(accessEntriesRef(as('dana')))
    expect(snapshot.docs.map((entry) => entry.data().email).sort()).toContain('eren@example.com')
  })

  it('does not let a player add an address', async () => {
    await expect(addEmail(as('ayla'), 'cem@example.com')).rejects.toMatchObject({
      code: 'permission-denied',
    })
    expect(await storedEntry('cem@example.com')).toBeUndefined()
  })
})

describe('linkOwnEntry under the real rules', () => {
  it('links an unlinked entry once, and writes nothing the second time', async () => {
    const eren = { uid: 'eren', email: 'eren@example.com' }
    expect(await linkOwnEntry(as('eren'), eren)).toBe('linked')
    expect(await storedEntry('eren@example.com')).toEqual({
      addedAt: Timestamp.fromMillis(0),
      uid: 'eren',
    })
    expect(await linkOwnEntry(as('eren'), eren)).toBe('unchanged')
  })

  it('leaves an entry that is already linked as it is', async () => {
    expect(await linkOwnEntry(as('ayla'), { uid: 'ayla', email: memberEmail('ayla') })).toBe(
      'unchanged',
    )
  })
})
