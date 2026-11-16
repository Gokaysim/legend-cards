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

import { type BehaviorFlags, startingFlags } from '@/features/definitions/flags'

import firestoreRules from '../../../firestore.rules?raw'
import {
  closeHolding,
  giveCard,
  setHoldingActive,
  setHoldingCost,
  setHoldingNote,
  transferHolding,
} from './api'
import { TableBusyError } from '@/features/table/errors'

import { HoldingError, toHoldingFailure } from './errors'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

/** A user's own Firestore under the real rules. Each call is a separate client, like a separate device. */
const as = (uid: string) => firestoreOf(testEnv.authenticatedContext(uid))

const POOL = 'legend-abolethseyes'
const CURSED = 'cursed-visionsofdeath'
/** A Cursed card that costs "0", and one that costs "X". */
const FREE = 'cursed-freecurse'
const X_CARD = 'cursed-xcurse'

/** Ayla's and Bora's LP before each test. */
const LP = { ayla: 10, bora: 2 }

/** A stored active card with its kind's starting flags, unless overridden. */
const storedCard = (
  kind: 'normal' | 'cursed',
  name: string,
  cost = '3',
  flags: Partial<BehaviorFlags> = {},
) => ({
  kind,
  name,
  nameKey: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
  setCode: kind === 'normal' ? 'Kesqer' : null,
  cost,
  rarity: kind === 'normal' ? 'common' : null,
  mechanicPack: kind === 'normal' ? 'Arcanus Divine' : null,
  text: `${name} text.`,
  status: 'active',
  ...startingFlags(kind, ''),
  ...flags,
})

/** Stores a card as the admin, replacing the seeded one. */
async function seedCard(id: string, card: ReturnType<typeof storedCard>) {
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(firestoreOf(admin), `cards/${id}`), card)
  })
}

/** Every document of a collection, as the admin reads it. */
async function all(path: string): Promise<Record<string, unknown>[]> {
  let docs: Record<string, unknown>[] = []
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    docs = (await getDocs(collection(firestoreOf(admin), path))).docs.map((entry) => ({
      id: entry.id,
      ...entry.data(),
    }))
  })
  return docs
}

async function stored(path: string): Promise<Record<string, unknown> | undefined> {
  let data: Record<string, unknown> | undefined
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    data = (await getDoc(doc(firestoreOf(admin), path))).data()
  })
  return data
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
  // Profiles with roles and the cards exist only through the admin scripts, so they are seeded here.
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    const profile = (role: string, displayName: string) => ({
      displayName,
      photoURL: null,
      role,
      createdAt: Timestamp.fromMillis(0),
    })
    await setDoc(doc(db, 'users/ayla'), { ...profile('player', 'Ayla'), lp: LP.ayla })
    await setDoc(doc(db, 'users/bora'), { ...profile('player', 'Bora'), lp: LP.bora })
    await setDoc(doc(db, 'users/dana'), profile('dm', 'Dana'))
    await setDoc(doc(db, `cards/${POOL}`), storedCard('normal', "Aboleth's Eyes"))
    await setDoc(doc(db, `cards/${CURSED}`), storedCard('cursed', 'Visions of Death'))
    await setDoc(doc(db, `cards/${FREE}`), storedCard('cursed', 'Free Curse', '0'))
    await setDoc(doc(db, `cards/${X_CARD}`), storedCard('cursed', 'X Curse', 'X'))
  })
})

describe('giving cards under the real rules', () => {
  it('gives a pool card: an open holding from the DM, and the card gets its holder', async () => {
    const id = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })

    expect(await stored(`userCards/${id}`)).toMatchObject({
      cardId: POOL,
      cardName: "Aboleth's Eyes",
      cardKind: 'normal',
      uid: 'ayla',
      givenBy: 'dana',
      givenVia: 'dm',
      transferredFrom: null,
      active: false,
      note: '',
      costOverride: null,
      returnedAt: null,
      returnReason: null,
    })
    expect((await stored(`userCards/${id}`))?.givenAt).toBeInstanceOf(Timestamp)
    expect(await stored(`cards/${POOL}`)).toMatchObject({ holder: { uid: 'ayla', userCardId: id } })
  })

  it('fails with "taken" for a held card, unless the extra copy is allowed', async () => {
    const first = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })

    const error = await failureOf(giveCard(as('dana'), { cardId: POOL, uid: 'bora', by: 'dana' }))
    expect(error).toBeInstanceOf(HoldingError)
    expect(toHoldingFailure(error)).toEqual({ kind: 'taken', holderUid: 'ayla' })

    const copy = await giveCard(as('dana'), {
      cardId: POOL,
      uid: 'bora',
      by: 'dana',
      allowExtraCopy: true,
    })
    expect(await stored(`userCards/${copy}`)).toMatchObject({ uid: 'bora', returnedAt: null })
    expect(await stored(`cards/${POOL}`)).toMatchObject({
      holder: { uid: 'ayla', userCardId: first },
    })
  })

  it('gives a Cursed card twice without ever giving it a holder', async () => {
    await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })
    await giveCard(as('dana'), { cardId: CURSED, uid: 'bora', by: 'dana' })

    expect(await stored(`cards/${CURSED}`)).not.toHaveProperty('holder')
  })

  it('lets exactly one of two concurrent gives of one pool card win', async () => {
    const results = await Promise.allSettled([
      giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' }),
      giveCard(as('dana'), { cardId: POOL, uid: 'bora', by: 'dana' }),
    ])

    const won = results.filter((result) => result.status === 'fulfilled')
    const lost = results.filter((result) => result.status === 'rejected')
    expect(won).toHaveLength(1)
    expect(lost).toHaveLength(1)
    expect(toHoldingFailure(lost[0]?.reason)).toMatchObject({ kind: 'taken' })
    const winner = won[0]?.value
    expect((await stored(`cards/${POOL}`))?.holder).toMatchObject({ userCardId: winner })
  })

  it('denies a player giving a card', async () => {
    const error = await failureOf(giveCard(as('ayla'), { cardId: CURSED, uid: 'ayla', by: 'ayla' }))
    expect(toHoldingFailure(error)).toEqual({ kind: 'permission-denied' })
  })
})

describe('closing holdings under the real rules', () => {
  it('uses a card on a typed character and pays its price: the holding, the entry and the LP agree', async () => {
    const id = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })

    await closeHolding(as('ayla'), {
      holdingId: id,
      by: 'ayla',
      reason: 'used',
      target: { kind: 'typed', name: ' Thorin ' },
      amount: 3,
    })

    const holding = await stored(`userCards/${id}`)
    expect(holding).toMatchObject({
      returnedBy: 'ayla',
      returnReason: 'used',
      usedOn: 'Thorin',
      useCost: 3,
    })
    expect(holding?.returnedAt).toBeInstanceOf(Timestamp)
    expect(await stored(`cards/${POOL}`)).toMatchObject({ holder: null })
    const entryId = String(holding?.useEntryId)
    expect(await stored(`ledger/${entryId}`)).toMatchObject({
      currency: 'lp',
      account: 'ayla',
      delta: -3,
      balanceAfter: LP.ayla - 3,
      source: 'use',
      reason: null,
      drawId: id,
      by: 'ayla',
    })
    expect(await stored('users/ayla')).toMatchObject({ lp: LP.ayla - 3, lpEntryId: entryId })
  })

  it('uses a card that costs "0" without a payment', async () => {
    const id = await giveCard(as('dana'), { cardId: FREE, uid: 'ayla', by: 'dana' })

    await closeHolding(as('ayla'), { holdingId: id, by: 'ayla', reason: 'used', amount: 0 })

    expect(await stored(`userCards/${id}`)).toMatchObject({ useCost: 0, useEntryId: null })
    expect(await stored('users/ayla')).toMatchObject({ lp: LP.ayla })
  })

  it('pays the amount the player chose for an "X" card', async () => {
    const id = await giveCard(as('dana'), { cardId: X_CARD, uid: 'ayla', by: 'dana' })

    await closeHolding(as('ayla'), { holdingId: id, by: 'ayla', reason: 'used', amount: 4 })

    expect(await stored(`userCards/${id}`)).toMatchObject({ useCost: 4 })
    expect(await stored('users/ayla')).toMatchObject({ lp: LP.ayla - 4 })
  })

  it("lets the DM use a player's card for free, or for another amount", async () => {
    const free = await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })
    const paid = await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })

    await closeHolding(as('dana'), { holdingId: free, by: 'dana', reason: 'used', amount: 0 })
    expect(await stored('users/ayla')).toMatchObject({ lp: LP.ayla })
    await closeHolding(as('dana'), { holdingId: paid, by: 'dana', reason: 'used', amount: 5 })
    expect(await stored('users/ayla')).toMatchObject({ lp: LP.ayla - 5 })
    expect(await stored(`userCards/${paid}`)).toMatchObject({ returnedBy: 'dana', useCost: 5 })
  })

  it("uses a card in the DM's own hand only for free", async () => {
    const id = await giveCard(as('dana'), { cardId: CURSED, uid: 'dana', by: 'dana' })

    const paid = await failureOf(
      closeHolding(as('dana'), { holdingId: id, by: 'dana', reason: 'used', amount: 3 }),
    )
    expect(toHoldingFailure(paid)).toEqual({ kind: 'not-a-player' })
    await closeHolding(as('dana'), { holdingId: id, by: 'dana', reason: 'used', amount: 0 })
    expect(await stored(`userCards/${id}`)).toMatchObject({ useCost: 0, useEntryId: null })
  })

  it('fails with "insufficient" when the LP is below the price, and changes nothing', async () => {
    const id = await giveCard(as('dana'), { cardId: CURSED, uid: 'bora', by: 'dana' })

    const error = await failureOf(
      closeHolding(as('bora'), { holdingId: id, by: 'bora', reason: 'used', amount: 3 }),
    )

    expect(toHoldingFailure(error)).toEqual({ kind: 'insufficient', balance: LP.bora, amount: 3 })
    expect(await stored(`userCards/${id}`)).toMatchObject({ returnedAt: null })
    expect(await stored('users/bora')).toMatchObject({ lp: LP.bora })
  })

  it('fails with "price-changed" when the confirmed price is no longer the price', async () => {
    const id = await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })
    await setHoldingCost(as('dana'), id, '4')

    const error = await failureOf(
      closeHolding(as('ayla'), { holdingId: id, by: 'ayla', reason: 'used', amount: 3 }),
    )

    expect(toHoldingFailure(error)).toEqual({ kind: 'price-changed', price: 4 })
    expect(await stored(`userCards/${id}`)).toMatchObject({ returnedAt: null })
  })

  it('lands two uses from two devices at once, with the LP and the ledger right', async () => {
    const first = await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })
    const second = await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })

    await Promise.all([
      closeHolding(as('ayla'), { holdingId: first, by: 'ayla', reason: 'used', amount: 3 }),
      closeHolding(as('ayla'), { holdingId: second, by: 'ayla', reason: 'used', amount: 3 }),
    ])

    expect(await stored('users/ayla')).toMatchObject({ lp: LP.ayla - 6 })
    const entries = await Promise.all(
      [first, second].map(async (id) =>
        stored(`ledger/${String((await stored(`userCards/${id}`))?.useEntryId)}`),
      ),
    )
    expect(entries.map((entry) => entry?.balanceAfter).sort()).toEqual([LP.ayla - 6, LP.ayla - 3])
  })

  it('stores no character when an empty name was typed, or none was chosen', async () => {
    const typed = await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })
    const none = await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })

    await closeHolding(as('ayla'), {
      holdingId: typed,
      by: 'ayla',
      reason: 'used',
      target: { kind: 'typed', name: '  ' },
      amount: 3,
    })
    await closeHolding(as('ayla'), { holdingId: none, by: 'ayla', reason: 'used', amount: 3 })

    for (const id of [typed, none]) {
      const holding = await stored(`userCards/${id}`)
      expect(holding).toMatchObject({ returnReason: 'used', usedOn: null })
      expect(holding).not.toHaveProperty('usedOnCharacterId')
    }
  })

  describe('on a stored character', () => {
    const THORIN = 'ThorinAyla0123456789'

    async function seedThorin(overrides: Record<string, unknown> = {}) {
      await testEnv.withSecurityRulesDisabled(async (admin) => {
        await setDoc(doc(firestoreOf(admin), `characters/${THORIN}`), {
          uid: 'ayla',
          name: 'Thorin',
          picture: null,
          archived: false,
          createdAt: Timestamp.fromMillis(0),
          createdBy: 'ayla',
          ...overrides,
        })
      })
    }

    it('records the character and its current name', async () => {
      await seedThorin({ name: 'Thorin Oakenshield' })
      const id = await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })

      await closeHolding(as('ayla'), {
        holdingId: id,
        by: 'ayla',
        reason: 'used',
        target: { kind: 'character', characterId: THORIN },
        amount: 3,
      })

      expect(await stored(`userCards/${id}`)).toMatchObject({
        usedOn: 'Thorin Oakenshield',
        usedOnCharacterId: THORIN,
      })
    })

    async function effects(): Promise<Record<string, unknown>[]> {
      let docs: Record<string, unknown>[] = []
      await testEnv.withSecurityRulesDisabled(async (admin) => {
        docs = (await getDocs(collection(firestoreOf(admin), 'characterEffects'))).docs.map(
          (entry) => entry.data(),
        )
      })
      return docs
    }

    it("adds the card's effect with its visible text, Cursed for a Cursed card", async () => {
      await seedThorin()
      await testEnv.withSecurityRulesDisabled(async (admin) => {
        await setDoc(doc(firestoreOf(admin), `cards/${CURSED}`), {
          ...storedCard('cursed', 'Visions of Death'),
          text: 'Roll twice [hidden note] and take the lower.',
        })
      })
      const id = await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })

      await closeHolding(as('ayla'), {
        holdingId: id,
        by: 'ayla',
        reason: 'used',
        target: { kind: 'character', characterId: THORIN },
        addEffect: true,
        amount: 3,
      })

      expect(await effects()).toEqual([
        expect.objectContaining({
          characterId: THORIN,
          uid: 'ayla',
          source: 'card',
          sourceId: id,
          name: 'Visions of Death',
          text: 'Roll twice and take the lower.',
          cursed: true,
          createdBy: 'ayla',
        }),
      ])
    })

    it('adds no effect without addEffect, or for a typed name', async () => {
      await seedThorin()
      const first = await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })
      const second = await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })

      await closeHolding(as('ayla'), {
        holdingId: first,
        by: 'ayla',
        reason: 'used',
        target: { kind: 'character', characterId: THORIN },
        amount: 3,
      })
      await closeHolding(as('ayla'), {
        holdingId: second,
        by: 'ayla',
        reason: 'used',
        target: { kind: 'typed', name: 'Goblin şefi' },
        addEffect: true,
        amount: 3,
      })

      expect(await effects()).toEqual([])
    })

    it('adds no effect for a card without "Kullanınca efekt bırakır"', async () => {
      await seedThorin()
      await seedCard(CURSED, storedCard('cursed', 'Visions of Death', '3', { hasUseEffect: false }))
      const id = await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })

      await closeHolding(as('ayla'), {
        holdingId: id,
        by: 'ayla',
        reason: 'used',
        target: { kind: 'character', characterId: THORIN },
        addEffect: true,
        amount: 3,
      })

      expect(await effects()).toEqual([])
      expect(await stored(`userCards/${id}`)).toMatchObject({ usedOnCharacterId: THORIN })
    })

    it('adds the effect of a kept use from its use record', async () => {
      await seedThorin()
      await seedCard(POOL, storedCard('normal', "Aboleth's Eyes", '3', { isKeptOnUse: true }))
      const id = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })

      await closeHolding(as('ayla'), {
        holdingId: id,
        by: 'ayla',
        reason: 'used',
        target: { kind: 'character', characterId: THORIN },
        addEffect: true,
        amount: 3,
      })

      const [use] = await all('uses')
      expect(use).toMatchObject({ holdingId: id, usedOn: 'Thorin', usedOnCharacterId: THORIN })
      expect(await effects()).toEqual([
        expect.objectContaining({ source: 'card', sourceId: use?.id, name: "Aboleth's Eyes" }),
      ])
    })

    it.each([
      ['archived', () => seedThorin({ archived: true })],
      ['missing', () => Promise.resolve()],
    ])('refuses a character that is %s, and the card stays in the hand', async (_case, seed) => {
      await seed()
      const id = await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })

      const error = await failureOf(
        closeHolding(as('ayla'), {
          holdingId: id,
          by: 'ayla',
          reason: 'used',
          target: { kind: 'character', characterId: THORIN },
          amount: 3,
        }),
      )

      expect(toHoldingFailure(error)).toEqual({ kind: 'character-unavailable' })
      expect(await stored(`userCards/${id}`)).toMatchObject({ returnedAt: null })
      expect(await stored('users/ayla')).toMatchObject({ lp: LP.ayla })
    })
  })

  it('discards a card as the DM, which releases its holder', async () => {
    const id = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })

    await closeHolding(as('dana'), { holdingId: id, by: 'dana', reason: 'discarded' })

    expect(await stored(`userCards/${id}`)).toMatchObject({
      returnedBy: 'dana',
      returnReason: 'discarded',
      usedOn: null,
    })
    expect(await stored(`cards/${POOL}`)).toMatchObject({ holder: null })
  })

  it('discards a card as its holder, which releases it to the pool and pays nothing', async () => {
    const id = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })

    await closeHolding(as('ayla'), { holdingId: id, by: 'ayla', reason: 'discarded' })

    expect(await stored(`userCards/${id}`)).toMatchObject({
      returnedBy: 'ayla',
      returnReason: 'discarded',
      usedOn: null,
    })
    expect(await stored(`cards/${POOL}`)).toMatchObject({ holder: null })
    expect(await stored('users/ayla')).toMatchObject({ lp: LP.ayla })
  })

  it("denies a player discarding another player's card", async () => {
    const id = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })

    const error = await failureOf(
      closeHolding(as('bora'), { holdingId: id, by: 'bora', reason: 'discarded' }),
    )
    expect(toHoldingFailure(error)).toEqual({ kind: 'permission-denied' })
    expect(await stored(`userCards/${id}`)).toMatchObject({ returnedAt: null })
  })

  it('leaves the holder alone when an extra copy is closed', async () => {
    const original = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })
    const copy = await giveCard(as('dana'), {
      cardId: POOL,
      uid: 'bora',
      by: 'dana',
      allowExtraCopy: true,
    })

    await closeHolding(as('dana'), { holdingId: copy, by: 'dana', reason: 'used', amount: 0 })

    expect(await stored(`cards/${POOL}`)).toMatchObject({
      holder: { uid: 'ayla', userCardId: original },
    })
  })

  it('fails with "closed" for a holding that is already closed', async () => {
    const id = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })
    await closeHolding(as('ayla'), { holdingId: id, by: 'ayla', reason: 'used', amount: 3 })

    const again = await failureOf(
      closeHolding(as('dana'), { holdingId: id, by: 'dana', reason: 'discarded' }),
    )
    expect(toHoldingFailure(again)).toEqual({ kind: 'closed' })
    const transfer = await failureOf(
      transferHolding(as('dana'), { holdingId: id, toUid: 'bora', by: 'dana' }),
    )
    expect(toHoldingFailure(transfer)).toEqual({ kind: 'closed' })
  })

  it("denies a player using another player's card", async () => {
    const id = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })

    const error = await failureOf(
      closeHolding(as('bora'), { holdingId: id, by: 'bora', reason: 'used', amount: 3 }),
    )
    expect(toHoldingFailure(error)).toEqual({ kind: 'permission-denied' })
  })
})

describe('behavior flags in hands under the real rules', () => {
  const HELD = 'legend-heldcard'

  it('gives a card with "Elde etkili" active, and switches only such a card', async () => {
    await seedCard(HELD, storedCard('normal', 'Held Card', '3', { hasHeldEffect: true }))
    const held = await giveCard(as('dana'), { cardId: HELD, uid: 'ayla', by: 'dana' })
    const plain = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })
    expect(await stored(`userCards/${held}`)).toMatchObject({ active: true })
    expect(await stored(`userCards/${plain}`)).toMatchObject({ active: false })

    await setHoldingActive(as('dana'), held, false)
    expect(await stored(`userCards/${held}`)).toMatchObject({ active: false })
    expect(toHoldingFailure(await failureOf(setHoldingActive(as('dana'), plain, true)))).toEqual({
      kind: 'permission-denied',
    })
  })

  it('gives a repeatable normal card twice without a holder', async () => {
    await seedCard(POOL, storedCard('normal', "Aboleth's Eyes", '3', { isRepeatable: true }))
    await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })
    await giveCard(as('dana'), { cardId: POOL, uid: 'bora', by: 'dana' })
    expect((await stored(`cards/${POOL}`))?.holder ?? null).toBeNull()
  })

  it('gives a Cursed card with one copy its holder, and releases it on a discard', async () => {
    await seedCard(CURSED, storedCard('cursed', 'Visions of Death', '3', { isRepeatable: false }))
    const id = await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })
    expect(await stored(`cards/${CURSED}`)).toMatchObject({
      holder: { uid: 'ayla', userCardId: id },
    })
    expect(
      toHoldingFailure(
        await failureOf(giveCard(as('dana'), { cardId: CURSED, uid: 'bora', by: 'dana' })),
      ),
    ).toEqual({ kind: 'taken', holderUid: 'ayla' })

    await closeHolding(as('dana'), { holdingId: id, by: 'dana', reason: 'discarded' })
    expect(await stored(`cards/${CURSED}`)).toMatchObject({ holder: null })
  })

  it('uses a card kept on use twice: two use records with their payments, and the card stays in the hand', async () => {
    await seedCard(POOL, storedCard('normal', "Aboleth's Eyes", '3', { isKeptOnUse: true }))
    const id = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })

    await closeHolding(as('ayla'), { holdingId: id, by: 'ayla', reason: 'used', amount: 3 })
    await closeHolding(as('ayla'), {
      holdingId: id,
      by: 'ayla',
      reason: 'used',
      target: { kind: 'typed', name: 'Goblin şefi' },
      amount: 3,
    })

    expect(await stored(`userCards/${id}`)).toMatchObject({ returnedAt: null, returnReason: null })
    expect(await stored(`cards/${POOL}`)).toMatchObject({ holder: { uid: 'ayla', userCardId: id } })
    expect(await stored('users/ayla')).toMatchObject({ lp: LP.ayla - 6 })
    const uses = await all('uses')
    expect(uses).toHaveLength(2)
    for (const use of uses) {
      expect(use).toMatchObject({
        uid: 'ayla',
        cardId: POOL,
        cardName: "Aboleth's Eyes",
        cardKind: 'normal',
        holdingId: id,
        by: 'ayla',
        cost: 3,
      })
      expect(await stored(`ledger/${String(use.entryId)}`)).toMatchObject({
        source: 'keptUse',
        delta: -3,
        drawId: use.id,
      })
    }
    expect(uses.map((use) => use.usedOn ?? null).sort()).toEqual(['Goblin şefi', null])
  })

  it('records a free kept use without a payment, and discards a kept card', async () => {
    await seedCard(FREE, storedCard('cursed', 'Free Curse', '0', { isKeptOnUse: true }))
    const id = await giveCard(as('dana'), { cardId: FREE, uid: 'ayla', by: 'dana' })

    await closeHolding(as('ayla'), { holdingId: id, by: 'ayla', reason: 'used', amount: 0 })
    expect(await all('uses')).toEqual([expect.objectContaining({ cost: 0, entryId: null })])
    expect(await stored('users/ayla')).toMatchObject({ lp: LP.ayla })

    await closeHolding(as('dana'), { holdingId: id, by: 'dana', reason: 'discarded' })
    expect(await stored(`userCards/${id}`)).toMatchObject({ returnReason: 'discarded' })
  })
})

describe('transferring holdings under the real rules', () => {
  it('keeps the note, the cost override and the active state, and moves the holder', async () => {
    await seedCard(POOL, storedCard('normal', "Aboleth's Eyes", '3', { hasHeldEffect: true }))
    const id = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })
    await setHoldingNote(as('ayla'), id, 'Boss savaşında kullan')
    await setHoldingCost(as('dana'), id, ' 1 ')
    // A held card starts active; the DM switched it off, and the transfer keeps that.
    await setHoldingActive(as('dana'), id, false)

    const next = await transferHolding(as('dana'), { holdingId: id, toUid: 'bora', by: 'dana' })

    expect(await stored(`userCards/${id}`)).toMatchObject({
      returnedBy: 'dana',
      returnReason: 'transferred',
      transferredTo: next,
    })
    expect(await stored(`userCards/${next}`)).toMatchObject({
      cardId: POOL,
      uid: 'bora',
      givenBy: 'dana',
      givenVia: 'transfer',
      transferredFrom: id,
      note: 'Boss savaşında kullan',
      costOverride: '1',
      active: false,
      returnedAt: null,
    })
    expect(await stored(`cards/${POOL}`)).toMatchObject({
      holder: { uid: 'bora', userCardId: next },
    })
  })

  it('transfers a Cursed card without touching the card', async () => {
    const id = await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })

    const next = await transferHolding(as('dana'), { holdingId: id, toUid: 'bora', by: 'dana' })

    expect(await stored(`userCards/${next}`)).toMatchObject({ uid: 'bora', cardKind: 'cursed' })
    expect(await stored(`cards/${CURSED}`)).not.toHaveProperty('holder')
  })

  it('clears a cost override with a blank value', async () => {
    const id = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })
    await setHoldingCost(as('dana'), id, '1')

    await setHoldingCost(as('dana'), id, '   ')

    expect(await stored(`userCards/${id}`)).toMatchObject({ costOverride: null })
  })
})

describe('card movements while a pack is open', () => {
  it('fails a give as table-busy and changes nothing', async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), 'table/main'), { openPackId: 'pack-1' })
    })
    const failure = await failureOf(giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' }))
    expect(failure).toBeInstanceOf(TableBusyError)
    expect(toHoldingFailure(failure)).toEqual({ kind: 'table-busy' })
    expect((await stored(`cards/${POOL}`))?.holder).toBeUndefined()
  })
})
