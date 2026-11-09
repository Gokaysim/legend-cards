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
  updateDoc,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Card } from '@/features/cards/schema'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'

import firestoreRules from '../../../firestore.rules?raw'
import { drawCard, type DrawCardInput } from './api'
import { DrawError, toDrawFailure } from './errors'
import { TableBusyError } from '@/features/table/errors'
import type { RandomSource } from '@/lib/random'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

/** A user's own Firestore under the real rules. Each call is a separate client, like a separate device. */
const as = (uid: string) => firestoreOf(testEnv.authenticatedContext(uid))

const EYES = testCard("Aboleth's Eyes")
const RITE = testCard('Blood Rite', { rarity: 'rare' })
const WIND = testBlessedCard('Second Wind')
const VISIONS = testCursedCard('Visions of Death')

/** A card as the import stores it: without the ID and without a holder. */
function storedCard({ id: _id, holder: _holder, ...card }: Card) {
  return card
}

async function stored(path: string): Promise<Record<string, unknown> | undefined> {
  let data: Record<string, unknown> | undefined
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    data = (await getDoc(doc(firestoreOf(admin), path))).data()
  })
  return data
}

async function all(collectionPath: string): Promise<Record<string, unknown>[]> {
  let docs: Record<string, unknown>[] = []
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    docs = (await getDocs(collection(firestoreOf(admin), collectionPath))).docs.map((entry) =>
      entry.data(),
    )
  })
  return docs
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

/** A random source that picks index `index` of any list longer than it. */
const always =
  (index: number): RandomSource =>
  () =>
    index

/** Ayla's paid draw into her own hand from `candidates`. */
const aylaDraws = (candidates: Card[], extra: Partial<DrawCardInput> = {}) =>
  drawCard(as('ayla'), {
    kind: 'random',
    uid: 'ayla',
    by: 'ayla',
    paid: true,
    filters: null,
    candidates,
    random: always(0),
    ...extra,
  })

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
  // Profiles with roles and the cards exist only through the admin scripts, so they are seeded. Ayla has 3 LP.
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    const profile = (role: string, displayName: string) => ({
      displayName,
      photoURL: null,
      role,
      createdAt: Timestamp.fromMillis(0),
    })
    await setDoc(doc(db, 'users/ayla'), { ...profile('player', 'Ayla'), lp: 3, lpEntryId: 'seed' })
    await setDoc(doc(db, 'users/bora'), profile('player', 'Bora'))
    await setDoc(doc(db, 'users/dana'), profile('dm', 'Dana'))
    for (const card of [EYES, RITE, WIND, VISIONS]) {
      await setDoc(doc(db, `cards/${card.id}`), storedCard(card))
    }
  })
})

describe('drawing under the real rules', () => {
  it("writes a player's paid draw: the draw, the holding, the holder, the entry and the LP agree", async () => {
    const result = await aylaDraws([EYES, RITE])

    expect(result.card).toMatchObject({ id: EYES.id, name: "Aboleth's Eyes" })
    const draw = await stored(`draws/${result.drawId}`)
    expect(draw).toMatchObject({
      kind: 'random',
      uid: 'ayla',
      by: 'ayla',
      cardId: EYES.id,
      cardName: "Aboleth's Eyes",
      cardKind: 'normal',
      holdingId: result.holdingId,
      filters: null,
      paidWith: 'lp',
      cost: 1,
    })
    expect(draw?.at).toBeInstanceOf(Timestamp)
    expect(await stored(`userCards/${result.holdingId}`)).toMatchObject({
      cardId: EYES.id,
      uid: 'ayla',
      givenBy: 'ayla',
      givenVia: 'draw',
      drawId: result.drawId,
      returnedAt: null,
    })
    expect(await stored(`cards/${EYES.id}`)).toMatchObject({
      holder: { uid: 'ayla', userCardId: result.holdingId },
    })
    const entryId = draw?.entryId
    expect(typeof entryId).toBe('string')
    expect(await stored(`ledger/${String(entryId)}`)).toMatchObject({
      currency: 'lp',
      account: 'ayla',
      delta: -1,
      balanceAfter: 2,
      source: 'draw',
      reason: null,
      drawId: result.drawId,
      by: 'ayla',
    })
    expect(await stored('users/ayla')).toMatchObject({ lp: 2, lpEntryId: entryId })
  })

  it('leaves a drawn Blessed card without a holder', async () => {
    const result = await aylaDraws([WIND])

    expect(result.card.kind).toBe('blessed')
    expect(await stored(`cards/${WIND.id}`)).not.toHaveProperty('holder')
    expect(await stored('users/ayla')).toMatchObject({ lp: 2 })
  })

  it("charges nothing for the DM's draw and stores its filters", async () => {
    const filters = { cost: null, mechanicPack: null, rarity: 'rare' as const, keyword: 'rite' }
    const result = await drawCard(as('dana'), {
      kind: 'random',
      uid: 'ayla',
      by: 'dana',
      paid: false,
      filters,
      candidates: [RITE],
    })

    expect(await stored(`draws/${result.drawId}`)).toMatchObject({
      by: 'dana',
      uid: 'ayla',
      filters,
      paidWith: 'none',
      cost: 0,
      entryId: null,
    })
    expect(await stored('users/ayla')).toMatchObject({ lp: 3, lpEntryId: 'seed' })
    expect(await all('ledger')).toEqual([])
  })

  it('makes a Cursed draw free', async () => {
    const result = await drawCard(as('ayla'), {
      kind: 'cursed',
      uid: 'ayla',
      by: 'ayla',
      paid: false,
      filters: null,
      candidates: [VISIONS],
    })

    expect(await stored(`draws/${result.drawId}`)).toMatchObject({
      kind: 'cursed',
      cardKind: 'cursed',
      paidWith: 'none',
    })
    expect(await stored('users/ayla')).toMatchObject({ lp: 3 })
  })

  it('fails with "insufficient" at 0 LP and writes nothing', async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await updateDoc(doc(firestoreOf(admin), 'users/ayla'), { lp: 0 })
    })

    const error = await failureOf(aylaDraws([EYES]))

    expect(error).toBeInstanceOf(DrawError)
    expect(toDrawFailure(error)).toEqual({ kind: 'insufficient', lp: 0 })
    expect(await all('draws')).toEqual([])
    expect(await all('userCards')).toEqual([])
    expect(await stored(`cards/${EYES.id}`)).not.toHaveProperty('holder')
  })

  it('replaces a picked card that was given away before the draw, and charges once', async () => {
    // The DM gave "Aboleth's Eyes" to Bora; Ayla's device still lists it.
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await updateDoc(doc(firestoreOf(admin), `cards/${EYES.id}`), {
        holder: { uid: 'bora', userCardId: 'h-bora' },
      })
    })

    const result = await aylaDraws([EYES, RITE])

    expect(result.card.id).toBe(RITE.id)
    expect(await stored(`cards/${EYES.id}`)).toMatchObject({
      holder: { uid: 'bora', userCardId: 'h-bora' },
    })
    expect(await stored('users/ayla')).toMatchObject({ lp: 2 })
    expect(await all('draws')).toHaveLength(1)
    expect(await all('ledger')).toHaveLength(1)
  })

  it('lands two draws by the same player at once, with the LP and the ledger right', async () => {
    const results = await Promise.all([
      aylaDraws([EYES, RITE], { random: always(0) }),
      aylaDraws([EYES, RITE], { random: always(1) }),
    ])

    expect(new Set(results.map((result) => result.card.id))).toEqual(new Set([EYES.id, RITE.id]))
    expect(await stored('users/ayla')).toMatchObject({ lp: 1 })
    const balances = (await all('ledger')).map((entry) => entry.balanceAfter)
    expect(balances.sort()).toEqual([1, 2])
  })

  it('fails with "nothing-to-draw" without candidates, and when every candidate was taken', async () => {
    expect(toDrawFailure(await failureOf(aylaDraws([])))).toEqual({ kind: 'nothing-to-draw' })

    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await updateDoc(doc(firestoreOf(admin), `cards/${EYES.id}`), {
        holder: { uid: 'bora', userCardId: 'h-bora' },
      })
    })
    expect(toDrawFailure(await failureOf(aylaDraws([EYES])))).toEqual({ kind: 'nothing-to-draw' })
    expect(await stored('users/ayla')).toMatchObject({ lp: 3 })
  })
})

describe('drawing while a pack is open', () => {
  it('fails as table-busy and changes nothing', async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), 'table/main'), { openPackId: 'pack-1' })
    })
    const failure = await failureOf(aylaDraws([EYES]))
    expect(failure).toBeInstanceOf(TableBusyError)
    expect(toDrawFailure(failure)).toEqual({ kind: 'table-busy' })
    expect(await all('draws')).toEqual([])
    expect(await all('userCards')).toEqual([])
    expect(await stored('users/ayla')).toMatchObject({ lp: 3, lpEntryId: 'seed' })
    expect((await stored(`cards/${EYES.id}`))?.holder).toBeUndefined()
  })
})
