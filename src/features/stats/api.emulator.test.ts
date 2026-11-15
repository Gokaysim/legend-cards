import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, type Firestore, getDocs, type Query, setDoc, Timestamp } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import firestoreRules from '../../../firestore.rules?raw'
import { allQueries, cardQueries } from './api'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

const at = (millis: number) => Timestamp.fromMillis(millis)

/** A DM's give of `cardId` to `uid`, stored as the app writes it, optionally closed as used. */
function storedHolding(cardId: string, uid: string, closed: boolean) {
  return {
    cardId,
    cardName: cardId,
    cardKind: 'normal',
    uid,
    givenAt: at(1000),
    givenBy: 'dana',
    givenVia: 'dm',
    transferredFrom: null,
    drawId: null,
    active: false,
    note: '',
    costOverride: null,
    returnedAt: closed ? at(2000) : null,
    returnedBy: closed ? uid : null,
    returnReason: closed ? 'used' : null,
    usedOn: null,
    transferredTo: null,
  }
}

/** The DM's free random draw of `cardId` into Ayla's hand. */
function storedDraw(cardId: string) {
  return {
    kind: 'random',
    uid: 'ayla',
    by: 'dana',
    at: at(3000),
    cardId,
    cardName: cardId,
    cardKind: 'normal',
    holdingId: `h-${cardId}`,
    filters: null,
    paidWith: 'none',
    cost: 0,
    entryId: null,
  }
}

/** An open, free Standard Pack of Ayla's that shows `offered`, none of them turned. */
function storedPack(offered: string[]) {
  return {
    kind: 'pack',
    uid: 'ayla',
    by: 'dana',
    at: at(4000),
    packType: 'standard',
    setCode: 'Kesqer',
    mechanicPack: null,
    offered,
    revealed: [],
    paidWith: 'none',
    cost: 0,
    entryId: null,
    status: 'open',
    closedAt: null,
    closedBy: null,
    chosen: null,
    cursed: null,
    refundEntryId: null,
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
    await setDoc(doc(db, 'userCards/x-open'), storedHolding('legend-x', 'ayla', false))
    await setDoc(doc(db, 'userCards/x-used'), storedHolding('legend-x', 'bora', true))
    await setDoc(doc(db, 'userCards/y-open'), storedHolding('legend-y', 'bora', false))
    await setDoc(doc(db, 'draws/draw-x'), storedDraw('legend-x'))
    await setDoc(doc(db, 'draws/draw-y'), storedDraw('legend-y'))
    await setDoc(
      doc(db, 'draws/pack-with-x'),
      storedPack(['legend-a', 'legend-x', 'legend-b', 'legend-c', 'legend-d']),
    )
    await setDoc(
      doc(db, 'draws/pack-without-x'),
      storedPack(['legend-a', 'legend-y', 'legend-b', 'legend-c', 'legend-d']),
    )
  })
})

const idsOf = async <T>(query: Query<T>) =>
  (await getDocs(query)).docs.map((document) => document.id).sort()

describe("a card page's queries", () => {
  it("give a player exactly the card's holdings, its card draws and the packs that showed it", async () => {
    const queries = cardQueries(firestoreOf(testEnv.authenticatedContext('ayla')), 'legend-x')
    expect(await idsOf(queries.holdings)).toEqual(['x-open', 'x-used'])
    expect(await idsOf(queries.draws)).toEqual(['draw-x'])
    expect(await idsOf(queries.packs)).toEqual(['pack-with-x'])
  })

  it('return no pack opening among the card draws', async () => {
    const queries = cardQueries(firestoreOf(testEnv.authenticatedContext('ayla')), 'legend-y')
    const draws = (await getDocs(queries.draws)).docs.map((document) => document.data())
    expect(draws.map((draw) => draw.kind)).toEqual(['random'])
  })
})

describe("a set page's queries", () => {
  it('give a player every holding and every pack opening, and no card draw', async () => {
    const queries = allQueries(firestoreOf(testEnv.authenticatedContext('bora')))
    expect(await idsOf(queries.holdings)).toEqual(['x-open', 'x-used', 'y-open'])
    expect(await idsOf(queries.packs)).toEqual(['pack-with-x', 'pack-without-x'])
  })
})
