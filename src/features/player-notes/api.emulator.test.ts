import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, type Firestore, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import firestoreRules from '../../../firestore.rules?raw'
import { firebaseCode } from '@/lib/firestore/errors'

import { dmNoteRef, playerNoteRef, saveDmNote, savePlayerNote } from './api'
import { NOTE_LIMITS } from './schema'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

/** A user's own Firestore under the real rules. Each call is a separate client, like a separate device. */
const as = (uid: string) => firestoreOf(testEnv.authenticatedContext(uid))

/** The rejection of a promise that must fail. */
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
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  // Profiles with roles exist only through the admin script, so they are seeded here.
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    const profile = (role: string, displayName: string) => ({
      displayName,
      photoURL: null,
      role,
      createdAt: Timestamp.fromMillis(0),
    })
    await setDoc(doc(db, 'users/ayla'), profile('player', 'Ayla'))
    await setDoc(doc(db, 'users/bora'), profile('player', 'Bora'))
    await setDoc(doc(db, 'users/dana'), profile('dm', 'Dana'))
  })
})

describe('the player note under the real rules', () => {
  it('saves a note and reads it back with its last editor and the server time', async () => {
    await savePlayerNote(as('ayla'), { uid: 'ayla', text: 'Kayıp kardeşini arıyor.', by: 'ayla' })

    const note = (await getDoc(playerNoteRef(as('bora'), 'ayla'))).data()
    expect(note).toMatchObject({ text: 'Kayıp kardeşini arıyor.', updatedBy: 'ayla' })
    expect(note?.updatedAt).toBeInstanceOf(Timestamp)
  })

  it('reads a missing note as no document', async () => {
    const snapshot = await getDoc(playerNoteRef(as('bora'), 'ayla'))
    expect(snapshot.exists()).toBe(false)
  })

  it('cuts a longer text to the limit by code points', async () => {
    await savePlayerNote(as('ayla'), { uid: 'ayla', text: 'ğ'.repeat(2500), by: 'ayla' })

    const note = (await getDoc(playerNoteRef(as('ayla'), 'ayla'))).data()
    expect(note?.text).toBe('ğ'.repeat(NOTE_LIMITS.text))
  })

  it("replaces the text and the last editor when the DM saves the player's note", async () => {
    await savePlayerNote(as('ayla'), { uid: 'ayla', text: 'Benim notum.', by: 'ayla' })
    await savePlayerNote(as('dana'), { uid: 'ayla', text: 'DM düzeltti.', by: 'dana' })

    const note = (await getDoc(playerNoteRef(as('ayla'), 'ayla'))).data()
    expect(note).toMatchObject({ text: 'DM düzeltti.', updatedBy: 'dana' })
  })

  it("rejects a player saving another player's note", async () => {
    const error = await failureOf(
      savePlayerNote(as('bora'), { uid: 'ayla', text: 'Başkasının notu.', by: 'bora' }),
    )
    expect(firebaseCode(error)).toBe('permission-denied')
  })
})

describe('the DM note under the real rules', () => {
  it('saves a DM note that the DM reads back', async () => {
    await saveDmNote(as('dana'), { uid: 'ayla', text: 'Kardeşi aslında hayatta.', by: 'dana' })

    const note = (await getDoc(dmNoteRef(as('dana'), 'ayla'))).data()
    expect(note).toMatchObject({ text: 'Kardeşi aslında hayatta.', updatedBy: 'dana' })
  })

  it('rejects a player saving a DM note, the one about them included', async () => {
    const error = await failureOf(
      saveDmNote(as('ayla'), { uid: 'ayla', text: 'Gizli not.', by: 'ayla' }),
    )
    expect(firebaseCode(error)).toBe('permission-denied')
  })

  it('rejects a player reading the DM note about them', async () => {
    await saveDmNote(as('dana'), { uid: 'ayla', text: 'Kardeşi aslında hayatta.', by: 'dana' })

    const error = await failureOf(getDoc(dmNoteRef(as('ayla'), 'ayla')))
    expect(firebaseCode(error)).toBe('permission-denied')
  })
})
