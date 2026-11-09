import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, type Firestore, setDoc, Timestamp } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import firestoreRules from '../../../firestore.rules?raw'
import { explainDenial, openPackIdOnServer } from './api'
import { TableBusyError } from './errors'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

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
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const profile = {
      displayName: 'Ayla',
      photoURL: null,
      role: 'player',
      createdAt: Timestamp.fromMillis(0),
    }
    await setDoc(doc(firestoreOf(admin), 'users/ayla'), profile)
  })
})

async function openTable(openPackId: string | null) {
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(firestoreOf(admin), 'table/main'), { openPackId })
  })
}

/** A write the rules always deny: a player raising their own LP. */
const deniedWrite = () => setDoc(doc(as('ayla'), 'users/ayla'), { lp: 99 }, { merge: true })

describe('the table under the real rules', () => {
  it('reads a missing table as free', async () => {
    expect(await openPackIdOnServer(as('ayla'))).toBeNull()
  })

  it('turns a denial into TableBusyError while a pack is open', async () => {
    await openTable('pack-1')
    const explained = await explainDenial(as('ayla'), await failureOf(deniedWrite()))
    expect(explained).toBeInstanceOf(TableBusyError)
    expect(explained).toMatchObject({ openPackId: 'pack-1' })
  })

  it('passes a denial through while no pack is open', async () => {
    await openTable(null)
    const denial = await failureOf(deniedWrite())
    expect(await explainDenial(as('ayla'), denial)).toBe(denial)
  })

  it('passes other errors through without reading the table', async () => {
    const other = new Error('boom')
    expect(await explainDenial(as('ayla'), other)).toBe(other)
  })
})
