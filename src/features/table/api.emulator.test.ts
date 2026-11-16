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
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { memberContext, seedMembers } from '@/test/members'

import firestoreRules from '../../../firestore.rules?raw'
import { explainDenial, openPackIdOnServer, playerDrawModeOnServer, setPlayerDrawMode } from './api'
import { TableBusyError } from './errors'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

const as = (uid: string) => firestoreOf(memberContext(testEnv, uid))

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
  await seedMembers(testEnv)
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const profile = {
      displayName: 'Ayla',
      photoURL: null,
      role: 'player',
      createdAt: Timestamp.fromMillis(0),
    }
    await setDoc(doc(firestoreOf(admin), 'users/ayla'), profile)
    await setDoc(doc(firestoreOf(admin), 'users/dana'), {
      ...profile,
      displayName: 'Dana',
      role: 'dm',
    })
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

async function stored(path: string): Promise<Record<string, unknown> | undefined> {
  let data: Record<string, unknown> | undefined
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    data = (await getDoc(doc(firestoreOf(admin), path))).data()
  })
  return data
}

async function changes(): Promise<Record<string, unknown>[]> {
  let rows: Record<string, unknown>[] = []
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const snapshot = await getDocs(collection(firestoreOf(admin), 'tableChanges'))
    rows = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
  })
  return rows
}

describe('the player draw mode under the real rules', () => {
  it('reads a missing table as off', async () => {
    expect(await playerDrawModeOnServer(as('ayla'))).toBe('off')
  })

  it("writes the DM's change and its record, creating the table", async () => {
    await setPlayerDrawMode(as('dana'), { mode: 'filtered', by: 'dana' })

    const [change] = await changes()
    expect(change).toMatchObject({
      by: 'dana',
      setting: 'playerDraw',
      before: 'off',
      after: 'filtered',
    })
    expect(await stored('table/main')).toEqual({
      openPackId: null,
      playerDraw: 'filtered',
      playerDrawChangeId: change?.id,
    })
    expect(await playerDrawModeOnServer(as('ayla'))).toBe('filtered')
  })

  it('records the stored mode as before, and keeps an open pack', async () => {
    await openTable('pack-1')
    await setPlayerDrawMode(as('dana'), { mode: 'pick', by: 'dana' })
    await setPlayerDrawMode(as('dana'), { mode: 'off', by: 'dana' })

    const steps = (await changes()).map(({ before, after }) => `${String(before)}>${String(after)}`)
    expect(steps.sort()).toEqual(['off>pick', 'pick>off'])
    expect(await stored('table/main')).toMatchObject({ openPackId: 'pack-1', playerDraw: 'off' })
  })

  it('writes nothing when the mode is already set', async () => {
    await setPlayerDrawMode(as('dana'), { mode: 'off', by: 'dana' })
    expect(await changes()).toEqual([])
    expect(await stored('table/main')).toBeUndefined()
  })

  it("denies a player's change", async () => {
    await expect(setPlayerDrawMode(as('ayla'), { mode: 'pick', by: 'ayla' })).rejects.toMatchObject(
      {
        code: 'permission-denied',
      },
    )
    expect(await changes()).toEqual([])
  })
})
