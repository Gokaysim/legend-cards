import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, type Firestore, getDocs, type Query, setDoc, Timestamp } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import firestoreRules from '../../../firestore.rules?raw'
import { logQueries } from './api'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

const at = (millis: number) => Timestamp.fromMillis(millis)

/** A holding as stored, given to `uid` at `givenAt` and optionally closed at `returnedAt`. */
function storedHolding(uid: string, givenAt: number, returnedAt: number | null = null) {
  return {
    cardId: 'cursed-visionsofdeath',
    cardName: 'Visions of Death',
    cardKind: 'cursed',
    uid,
    givenAt: at(givenAt),
    givenBy: 'dana',
    givenVia: 'dm',
    transferredFrom: null,
    active: false,
    note: '',
    costOverride: null,
    returnedAt: returnedAt === null ? null : at(returnedAt),
    returnedBy: returnedAt === null ? null : uid,
    returnReason: returnedAt === null ? null : 'used',
    usedOn: null,
    transferredTo: null,
  }
}

function storedEntry(account: string, millis: number) {
  const party = account === 'party'
  return {
    currency: party ? 'gp' : 'lp',
    account,
    delta: 1,
    balanceAfter: 1,
    source: 'manual',
    reason: 'Test',
    by: 'dana',
    at: at(millis),
  }
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
    const db = firestoreOf(admin)
    await setDoc(doc(db, 'userCards/a-open'), storedHolding('ayla', 1000))
    await setDoc(doc(db, 'userCards/a-used'), storedHolding('ayla', 2000, 6000))
    await setDoc(doc(db, 'userCards/b-open'), storedHolding('bora', 3000))
    await setDoc(doc(db, 'userCards/b-used'), storedHolding('bora', 4000, 5000))
    await setDoc(doc(db, 'ledger/lp-ayla'), storedEntry('ayla', 7000))
    await setDoc(doc(db, 'ledger/lp-bora'), storedEntry('bora', 8000))
    await setDoc(doc(db, 'ledger/gp'), storedEntry('party', 9000))
  })
})

/** Runs the three queries as a signed-in player and returns the document IDs of each, in order. */
async function ids(uid: string | null, n: number) {
  const db = firestoreOf(testEnv.authenticatedContext('ayla'))
  const queries = logQueries(db, uid, n)
  const idsOf = async <T>(query: Query<T>) =>
    (await getDocs(query)).docs.map((document) => document.id)
  return {
    given: await idsOf(queries.given),
    closed: await idsOf(queries.closed),
    entries: await idsOf(queries.entries),
  }
}

describe('the log queries', () => {
  it('return every record, newest first', async () => {
    expect(await ids(null, 50)).toEqual({
      given: ['b-used', 'b-open', 'a-used', 'a-open'],
      closed: ['a-used', 'b-used'],
      entries: ['gp', 'lp-bora', 'lp-ayla'],
    })
  })

  it('stop at n', async () => {
    expect(await ids(null, 1)).toEqual({ given: ['b-used'], closed: ['a-used'], entries: ['gp'] })
  })

  it("keep only one user's records, and never the party's", async () => {
    expect(await ids('ayla', 50)).toEqual({
      given: ['a-used', 'a-open'],
      closed: ['a-used'],
      entries: ['lp-ayla'],
    })
  })
})
