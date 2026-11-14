import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, type Firestore, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

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

const storedCard = (kind: 'normal' | 'cursed', name: string, cost = '3') => ({
  kind,
  name,
  nameKey: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
  setCode: kind === 'normal' ? 'Kesqer' : null,
  cost,
  rarity: kind === 'normal' ? 'common' : null,
  mechanicPack: kind === 'normal' ? 'Arcanus Divine' : null,
  text: `${name} text.`,
  status: 'active',
})

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
  it('uses a card on a character and pays its price: the holding, the entry and the LP agree', async () => {
    const id = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })

    await closeHolding(as('ayla'), {
      holdingId: id,
      by: 'ayla',
      reason: 'used',
      usedOn: ' Thorin ',
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

  it('stores no character when none was typed', async () => {
    const id = await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })

    await closeHolding(as('ayla'), {
      holdingId: id,
      by: 'ayla',
      reason: 'used',
      usedOn: '  ',
      amount: 3,
    })

    expect(await stored(`userCards/${id}`)).toMatchObject({ returnReason: 'used', usedOn: null })
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

describe('transferring holdings under the real rules', () => {
  it('keeps the note, the cost override and the active state, and moves the holder', async () => {
    const id = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })
    await setHoldingNote(as('ayla'), id, 'Boss savaşında kullan')
    await setHoldingCost(as('dana'), id, ' 1 ')
    await setHoldingActive(as('dana'), id, true)

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
      active: true,
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
