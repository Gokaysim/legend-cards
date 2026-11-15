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
import type { RandomSource } from '@/lib/random'
import { testBlessedCard, testCard, testCursedCard } from '@/test/cardFixtures'

import firestoreRules from '../../../firestore.rules?raw'
import { cancelPack, choosePackCard, openPack, type OpenPackInput, turnPackCard } from './api'
import type { PackDef } from './catalog'
import { PackError, toPackFailure } from './errors'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

/** A user's own Firestore under the real rules. Each call is a separate client, like a separate device. */
const as = (uid: string) => firestoreOf(testEnv.authenticatedContext(uid))

/** Ten Common and three Rare Kesqer cards in the pool, a Blessed card, and the Cursed Deck. */
const COMMONS = Array.from({ length: 10 }, (_, index) => testCard(`Kesqer ${index + 1}`))
const RARES = Array.from({ length: 3 }, (_, index) =>
  testCard(`Kesqer Rare ${index + 1}`, { rarity: 'rare' }),
)
const WIND = testBlessedCard('Second Wind')
const VISIONS = testCursedCard('Visions of Death')
const CARDS: Card[] = [...COMMONS, ...RARES, WIND, VISIONS]

const STANDARD: PackDef = {
  key: 'standard:Kesqer',
  type: 'standard',
  setCode: 'Kesqer',
  mechanicPack: null,
}

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

/** A random source that always gives 0: picks the first candidates, in order. */
const first: RandomSource = () => 0

/** Ayla's own Standard Pack for 2 LP. */
const aylaOpens = (extra: Partial<OpenPackInput> = {}) =>
  openPack(as('ayla'), {
    def: STANDARD,
    uid: 'ayla',
    by: 'ayla',
    payment: { currency: 'lp', amount: 2 },
    cards: CARDS,
    random: first,
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
  // Profiles with roles and the cards exist only through the admin scripts, so they are seeded. Ayla has 5 LP,
  // and the party purse holds 12,500 GP.
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
    await setDoc(doc(db, 'party/main'), { gp: 12500, gpEntryId: 'seed' })
    for (const card of CARDS) await setDoc(doc(db, `cards/${card.id}`), storedCard(card))
  })
})

/**
 * An open pack `p1` for Ayla that holds the table, seeded with the rules disabled: her Standard Pack paid with
 * 2 LP (her LP already 3), every card turned, unless overridden.
 */
async function seedOpenPack(overrides: Record<string, unknown> = {}) {
  const pack = {
    kind: 'pack',
    uid: 'ayla',
    by: 'ayla',
    at: Timestamp.fromMillis(5000),
    packType: 'standard',
    setCode: 'Kesqer',
    mechanicPack: null,
    offered: COMMONS.slice(0, 5).map((card) => card.id),
    revealed: [0, 1, 2, 3, 4],
    paidWith: 'lp',
    cost: 2,
    entryId: 'e-paid',
    status: 'open',
    closedAt: null,
    closedBy: null,
    chosen: null,
    cursed: null,
    refundEntryId: null,
    ...overrides,
  }
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    await setDoc(doc(db, 'draws/p1'), pack)
    await setDoc(doc(db, 'table/main'), { openPackId: 'p1' })
    if (pack.paidWith === 'lp')
      await updateDoc(doc(db, 'users/ayla'), { lp: 3, lpEntryId: 'e-paid' })
    if (pack.paidWith === 'gp') {
      await setDoc(doc(db, 'party/main'), { gp: 12500 - Number(pack.cost), gpEntryId: 'e-paid' })
    }
  })
}

describe('opening packs under the real rules', () => {
  it("opens a player's pack: the record, the table, the entry and the lower LP agree", async () => {
    const id = await aylaOpens()

    const pack = await stored(`draws/${id}`)
    expect(pack).toMatchObject({
      kind: 'pack',
      uid: 'ayla',
      by: 'ayla',
      packType: 'standard',
      setCode: 'Kesqer',
      revealed: [],
      paidWith: 'lp',
      cost: 2,
      status: 'open',
    })
    expect(pack?.offered).toHaveLength(5)
    expect(await stored('table/main')).toEqual({ openPackId: id })
    expect(await stored(`ledger/${String(pack?.entryId)}`)).toMatchObject({
      currency: 'lp',
      account: 'ayla',
      delta: -2,
      balanceAfter: 3,
      source: 'pack',
      reason: null,
      drawId: id,
    })
    expect(await stored('users/ayla')).toMatchObject({ lp: 3, lpEntryId: pack?.entryId })
  })

  it("opens the DM's packs: GP from the purse, a changed LP amount, and free", async () => {
    const gp = await openPack(as('dana'), {
      def: STANDARD,
      uid: 'bora',
      by: 'dana',
      payment: { currency: 'gp', amount: 5000 },
      cards: CARDS,
    })
    expect(await stored(`draws/${gp}`)).toMatchObject({ paidWith: 'gp', cost: 5000 })
    expect(await stored('party/main')).toMatchObject({ gp: 7500 })

    await cancelPack(as('dana'), { drawId: gp, by: 'dana' })
    await openPack(as('dana'), {
      def: STANDARD,
      uid: 'ayla',
      by: 'dana',
      payment: { currency: 'lp', amount: 1 },
      cards: CARDS,
    })
    expect(await stored('users/ayla')).toMatchObject({ lp: 4 })

    const table = await stored('table/main')
    await cancelPack(as('dana'), { drawId: String(table?.openPackId), by: 'dana' })
    const free = await openPack(as('dana'), {
      def: STANDARD,
      uid: 'bora',
      by: 'dana',
      payment: { currency: 'lp', amount: 0 },
      cards: CARDS,
    })
    expect(await stored(`draws/${free}`)).toMatchObject({
      paidWith: 'none',
      cost: 0,
      entryId: null,
    })
  })

  it('refuses a second pack while one is open, without charging', async () => {
    await seedOpenPack({ uid: 'bora', paidWith: 'none', cost: 0, entryId: null })

    const failure = await failureOf(aylaOpens())
    expect(failure).toBeInstanceOf(PackError)
    expect(toPackFailure(failure)).toEqual({ kind: 'busy' })
    expect(await stored('users/ayla')).toMatchObject({ lp: 5, lpEntryId: 'seed' })
  })

  it('lets exactly one of two packs opened at the same moment win, and charges only its owner', async () => {
    const results = await Promise.allSettled([
      aylaOpens(),
      openPack(as('dana'), {
        def: STANDARD,
        uid: 'bora',
        by: 'dana',
        payment: { currency: 'gp', amount: 5000 },
        cards: CARDS,
      }),
    ])

    const won = results.filter((result) => result.status === 'fulfilled')
    expect(won).toHaveLength(1)
    const lost = results.find((result) => result.status === 'rejected')
    expect(toPackFailure(lost?.reason)).toEqual({ kind: 'busy' })
    const packs = await all('draws')
    expect(packs).toHaveLength(1)
    expect(await all('ledger')).toHaveLength(1)
  })

  it('replaces a shown card taken just before the commit, and charges once', async () => {
    // The device still sees the first card in the pool, but the server already has it in Bora's hand.
    const [takenCard] = COMMONS
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await updateDoc(doc(firestoreOf(admin), `cards/${takenCard?.id ?? ''}`), {
        holder: { uid: 'bora', userCardId: 'h-bora' },
      })
    })

    const id = await aylaOpens()

    const offered = (await stored(`draws/${id}`))?.offered
    expect(offered).not.toContain(takenCard?.id)
    expect(offered).toHaveLength(5)
    expect(await all('ledger')).toHaveLength(1)
    expect(await stored('users/ayla')).toMatchObject({ lp: 3 })
  })

  it('fails as insufficient when the LP is short, and opens nothing', async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await updateDoc(doc(firestoreOf(admin), 'users/ayla'), { lp: 1 })
    })

    expect(toPackFailure(await failureOf(aylaOpens()))).toEqual({
      kind: 'insufficient',
      currency: 'lp',
      balance: 1,
      amount: 2,
    })
    expect(await all('draws')).toEqual([])
    expect(await stored('table/main')).toBeUndefined()
  })
})

describe('turning cards under the real rules', () => {
  beforeEach(() => seedOpenPack({ revealed: [] }))

  it('lets the owner and the DM turn cards', async () => {
    await turnPackCard(as('ayla'), 'p1', 2)
    await turnPackCard(as('dana'), 'p1', 0)
    expect(await stored('draws/p1')).toMatchObject({ revealed: [2, 0] })
  })

  it('keeps two turns made at the same moment', async () => {
    await Promise.all([turnPackCard(as('ayla'), 'p1', 1), turnPackCard(as('dana'), 'p1', 3)])
    const revealed = (await stored('draws/p1'))?.revealed
    expect(revealed).toEqual(expect.arrayContaining([1, 3]))
    expect(revealed).toHaveLength(2)
  })

  it('denies a turn on a pack that has ended', async () => {
    await cancelPack(as('dana'), { drawId: 'p1', by: 'dana' })
    expect(await failureOf(turnPackCard(as('ayla'), 'p1', 0))).toMatchObject({
      code: 'permission-denied',
    })
  })
})

describe('choosing under the real rules', () => {
  it('moves the chosen card to the end of the hand, out of the pool, and frees the table', async () => {
    await seedOpenPack()
    const chosen = COMMONS[2]?.id ?? ''

    const holdingId = await choosePackCard(as('ayla'), { drawId: 'p1', cardId: chosen, by: 'ayla' })

    expect(await stored(`userCards/${holdingId}`)).toMatchObject({
      cardId: chosen,
      uid: 'ayla',
      givenBy: 'ayla',
      givenVia: 'pack',
      drawId: 'p1',
    })
    expect(await stored(`cards/${chosen}`)).toMatchObject({
      holder: { uid: 'ayla', userCardId: holdingId },
    })
    expect(await stored('draws/p1')).toMatchObject({
      status: 'chosen',
      closedBy: 'ayla',
      chosen: { cardId: chosen, holdingId },
      cursed: null,
    })
    expect(await stored('table/main')).toEqual({ openPackId: null })
  })

  it('chooses a Blessed card, which keeps no holder', async () => {
    await seedOpenPack({ offered: [WIND.id, ...COMMONS.slice(0, 4).map((card) => card.id)] })

    const holdingId = await choosePackCard(as('dana'), {
      drawId: 'p1',
      cardId: WIND.id,
      by: 'dana',
    })

    expect(await stored(`userCards/${holdingId}`)).toMatchObject({
      cardKind: 'blessed',
      uid: 'ayla',
      givenBy: 'dana',
    })
    expect((await stored(`cards/${WIND.id}`))?.holder).toBeUndefined()
  })

  it("adds a Cursed type's Cursed card together with the chosen card", async () => {
    const offered = [COMMONS[0], VISIONS, ...COMMONS.slice(1, 5)].map((card) => card?.id)
    await seedOpenPack({ packType: 'cursed', offered, revealed: [0, 1, 2, 3, 4, 5], cost: 1 })

    await choosePackCard(as('ayla'), { drawId: 'p1', cardId: COMMONS[0]?.id ?? '', by: 'ayla' })

    const holdings = await all('userCards')
    expect(holdings.map((holding) => holding.cardId).sort()).toEqual(
      [COMMONS[0]?.id, VISIONS.id].sort(),
    )
    expect(await stored('draws/p1')).toMatchObject({
      cursed: { cardId: VISIONS.id, cardName: 'Visions of Death' },
    })
  })

  it("gives a Cursed type's Cursed card with one copy its holder, beside the chosen card's", async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await updateDoc(doc(firestoreOf(admin), `cards/${VISIONS.id}`), { isRepeatable: false })
    })
    const offered = [COMMONS[0], VISIONS, ...COMMONS.slice(1, 5)].map((card) => card?.id)
    await seedOpenPack({ packType: 'cursed', offered, revealed: [0, 1, 2, 3, 4, 5], cost: 1 })

    const holdingId = await choosePackCard(as('ayla'), {
      drawId: 'p1',
      cardId: COMMONS[0]?.id ?? '',
      by: 'ayla',
    })

    const pack = await stored('draws/p1')
    const cursedHolding = (pack?.cursed as { holdingId: string }).holdingId
    expect(await stored(`cards/${VISIONS.id}`)).toMatchObject({
      holder: { uid: 'ayla', userCardId: cursedHolding },
    })
    expect(await stored(`cards/${COMMONS[0]?.id}`)).toMatchObject({
      holder: { uid: 'ayla', userCardId: holdingId },
    })
  })

  it('gives the chosen card and the Cursed card active when they act while held', async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await updateDoc(doc(db, `cards/${VISIONS.id}`), { hasHeldEffect: true })
      await updateDoc(doc(db, `cards/${COMMONS[0]?.id}`), { hasHeldEffect: true })
    })
    const offered = [COMMONS[0], VISIONS, ...COMMONS.slice(1, 5)].map((card) => card?.id)
    await seedOpenPack({ packType: 'cursed', offered, revealed: [0, 1, 2, 3, 4, 5], cost: 1 })

    await choosePackCard(as('ayla'), { drawId: 'p1', cardId: COMMONS[0]?.id ?? '', by: 'ayla' })

    expect((await all('userCards')).map((holding) => holding.active)).toEqual([true, true])
  })

  it('refuses a chosen card whose set pack flag went off meanwhile', async () => {
    await seedOpenPack()
    const chosen = COMMONS[0]?.id ?? ''
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await updateDoc(doc(firestoreOf(admin), `cards/${chosen}`), { isInSetPacks: false })
    })

    const failure = await failureOf(
      choosePackCard(as('ayla'), { drawId: 'p1', cardId: chosen, by: 'ayla' }),
    )
    expect(failure).toBeDefined()
    expect(await all('userCards')).toEqual([])
  })

  it('fails as not-all-turned, invalid-choice and closed, writing nothing', async () => {
    const offered = [COMMONS[0], VISIONS, ...COMMONS.slice(1, 5)].map((card) => card?.id ?? '')
    await seedOpenPack({ packType: 'cursed', offered, revealed: [0, 1], cost: 1 })
    const choose = (cardId: string) =>
      choosePackCard(as('ayla'), { drawId: 'p1', cardId, by: 'ayla' })

    expect(toPackFailure(await failureOf(choose(offered[0] ?? '')))).toEqual({
      kind: 'not-all-turned',
    })
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await updateDoc(doc(firestoreOf(admin), 'draws/p1'), { revealed: [0, 1, 2, 3, 4, 5] })
    })
    expect(toPackFailure(await failureOf(choose(VISIONS.id)))).toEqual({ kind: 'invalid-choice' })
    expect(toPackFailure(await failureOf(choose(RARES[0]?.id ?? '')))).toEqual({
      kind: 'invalid-choice',
    })
    await cancelPack(as('dana'), { drawId: 'p1', by: 'dana' })
    expect(toPackFailure(await failureOf(choose(offered[0] ?? '')))).toEqual({ kind: 'closed' })
    expect(await all('userCards')).toEqual([])
  })

  it('fails as unavailable when the admin retired the chosen card meanwhile', async () => {
    await seedOpenPack()
    const chosen = COMMONS[0]?.id ?? ''
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await updateDoc(doc(firestoreOf(admin), `cards/${chosen}`), { status: 'retired' })
    })

    const failure = await failureOf(
      choosePackCard(as('ayla'), { drawId: 'p1', cardId: chosen, by: 'ayla' }),
    )
    expect(toPackFailure(failure)).toEqual({ kind: 'unavailable' })
    expect(await stored('table/main')).toEqual({ openPackId: 'p1' })
  })
})

describe('cancelling under the real rules', () => {
  it('refunds LP to the player: the record and the refund name each other', async () => {
    await seedOpenPack()

    await cancelPack(as('dana'), { drawId: 'p1', by: 'dana' })

    const pack = await stored('draws/p1')
    expect(pack).toMatchObject({ status: 'cancelled', closedBy: 'dana' })
    const refundId = String(pack?.refundEntryId)
    expect(await stored(`ledger/${refundId}`)).toMatchObject({
      currency: 'lp',
      account: 'ayla',
      delta: 2,
      balanceAfter: 5,
      source: 'pack',
      drawId: 'p1',
    })
    expect(await stored('users/ayla')).toMatchObject({ lp: 5, lpEntryId: refundId })
    expect(await stored('table/main')).toEqual({ openPackId: null })
  })

  it('refunds GP to the purse', async () => {
    await seedOpenPack({ by: 'dana', paidWith: 'gp', cost: 7500 })

    await cancelPack(as('dana'), { drawId: 'p1', by: 'dana' })

    expect(await stored('party/main')).toMatchObject({ gp: 12500 })
  })

  it('cancels a free pack without an entry', async () => {
    await seedOpenPack({ by: 'dana', paidWith: 'none', cost: 0, entryId: null })

    await cancelPack(as('dana'), { drawId: 'p1', by: 'dana' })

    expect(await stored('draws/p1')).toMatchObject({ status: 'cancelled', refundEntryId: null })
    expect(await all('ledger')).toEqual([])
    expect(await stored('table/main')).toEqual({ openPackId: null })
  })

  it("denies a player's cancel, even the owner's", async () => {
    await seedOpenPack()
    expect(await failureOf(cancelPack(as('ayla'), { drawId: 'p1', by: 'ayla' }))).toMatchObject({
      code: 'permission-denied',
    })
  })
})
