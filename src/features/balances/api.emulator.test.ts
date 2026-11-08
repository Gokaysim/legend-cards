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

import firestoreRules from '../../../firestore.rules?raw'
import { changeBalance } from './api'
import { BalanceError, toBalanceFailure } from './errors'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

/** A user's own Firestore under the real rules. Each call is a separate client, like a separate device. */
const as = (uid: string) => firestoreOf(testEnv.authenticatedContext(uid))

async function stored(path: string): Promise<Record<string, unknown> | undefined> {
  let data: Record<string, unknown> | undefined
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    data = (await getDoc(doc(firestoreOf(admin), path))).data()
  })
  return data
}

async function ledger(): Promise<Record<string, unknown>[]> {
  let entries: Record<string, unknown>[] = []
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    entries = (await getDocs(collection(firestoreOf(admin), 'ledger'))).docs.map((entry) =>
      entry.data(),
    )
  })
  return entries
}

/** The rejection of a promise that must fail. */
async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the promise to fail')
}

const lp = (uid: string) => ({ currency: 'lp' as const, uid })
const GP = { currency: 'gp' as const }

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
  // Roles exist only through the admin script, so the profiles are seeded. Ayla has 5 LP; Bora's profile
  // predates Legend Points.
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    const profile = (role: string, displayName: string) => ({
      displayName,
      photoURL: null,
      role,
      createdAt: Timestamp.fromMillis(0),
    })
    await setDoc(doc(db, 'users/ayla'), { ...profile('player', 'Ayla'), lp: 5, lpEntryId: 'seed' })
    await setDoc(doc(db, 'users/bora'), profile('player', 'Bora'))
    await setDoc(doc(db, 'users/dana'), profile('dm', 'Dana'))
  })
})

describe('changing balances under the real rules', () => {
  it('adds LP: a ledger entry, and the profile points at it', async () => {
    const id = await changeBalance(as('dana'), {
      account: lp('ayla'),
      delta: 2,
      reason: "  Boss'u yendi ",
      by: 'dana',
    })

    expect(await stored(`ledger/${id}`)).toMatchObject({
      currency: 'lp',
      account: 'ayla',
      delta: 2,
      balanceAfter: 7,
      source: 'manual',
      reason: "Boss'u yendi",
      by: 'dana',
    })
    expect(await stored('users/ayla')).toMatchObject({ lp: 7, lpEntryId: id })
  })

  it('counts a profile without LP as 0', async () => {
    await changeBalance(as('dana'), { account: lp('bora'), delta: 3, reason: 'İlk', by: 'dana' })
    expect(await stored('users/bora')).toMatchObject({ lp: 3 })
  })

  it('creates the party purse with the first GP change, and changes it later', async () => {
    const first = await changeBalance(as('dana'), {
      account: GP,
      delta: 7500,
      reason: 'Başlangıç',
      by: 'dana',
    })
    expect(await stored('party/main')).toEqual({ gp: 7500, gpEntryId: first })

    const second = await changeBalance(as('dana'), {
      account: GP,
      delta: -2500,
      reason: 'Pack',
      by: 'dana',
    })
    expect(await stored('party/main')).toEqual({ gp: 5000, gpEntryId: second })
    expect(await stored(`ledger/${second}`)).toMatchObject({
      currency: 'gp',
      account: 'party',
      delta: -2500,
      balanceAfter: 5000,
    })
  })

  it('subtracts down to exactly 0', async () => {
    await changeBalance(as('dana'), {
      account: lp('ayla'),
      delta: -5,
      reason: 'Harcadı',
      by: 'dana',
    })
    expect(await stored('users/ayla')).toMatchObject({ lp: 0 })
  })

  it('refuses to go below 0, with the balance, and writes nothing', async () => {
    const error = await failureOf(
      changeBalance(as('dana'), { account: lp('ayla'), delta: -6, reason: 'Fazla', by: 'dana' }),
    )

    expect(error).toBeInstanceOf(BalanceError)
    expect(toBalanceFailure(error)).toEqual({ kind: 'insufficient', balance: 5 })
    expect(await stored('users/ayla')).toMatchObject({ lp: 5, lpEntryId: 'seed' })
    expect(await ledger()).toEqual([])
  })

  it('refuses LP for the DM', async () => {
    const error = await failureOf(
      changeBalance(as('dana'), { account: lp('dana'), delta: 1, reason: 'x', by: 'dana' }),
    )
    expect(toBalanceFailure(error)).toEqual({ kind: 'not-a-player' })
  })

  it('refuses a bad amount or a blank reason before writing', async () => {
    for (const delta of [0, 1.5, 1_000_001, -1_000_001]) {
      const error = await failureOf(
        changeBalance(as('dana'), { account: lp('ayla'), delta, reason: 'x', by: 'dana' }),
      )
      expect(toBalanceFailure(error)).toEqual({ kind: 'invalid' })
    }
    const error = await failureOf(
      changeBalance(as('dana'), { account: lp('ayla'), delta: 1, reason: '   ', by: 'dana' }),
    )
    expect(toBalanceFailure(error)).toEqual({ kind: 'invalid' })
    expect(await ledger()).toEqual([])
  })

  it('lets the server deny a player, without retrying forever', async () => {
    const error = await failureOf(
      changeBalance(as('ayla'), { account: lp('ayla'), delta: 10, reason: 'Ben', by: 'ayla' }),
    )
    expect(toBalanceFailure(error)).toEqual({ kind: 'permission-denied' })
    expect(await stored('users/ayla')).toMatchObject({ lp: 5 })
  })

  it('applies two changes from two devices at the same moment, one after the other', async () => {
    // Five races in a row: each time the DM's phone and laptop add 1 LP to Ayla at once.
    for (let round = 1; round <= 5; round += 1) {
      await Promise.all([
        changeBalance(as('dana'), { account: lp('ayla'), delta: 1, reason: 'Telefon', by: 'dana' }),
        changeBalance(as('dana'), { account: lp('ayla'), delta: 1, reason: 'Laptop', by: 'dana' }),
      ])
      expect(await stored('users/ayla')).toMatchObject({ lp: 5 + 2 * round })
    }

    const balances = (await ledger())
      .map((entry) => entry.balanceAfter)
      .sort((a, b) => Number(a) - Number(b))
    expect(balances).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
  })
})
