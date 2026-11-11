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

const storedCard = (kind: 'normal' | 'cursed', name: string) => ({
  kind,
  name,
  nameKey: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
  setCode: kind === 'normal' ? 'Kesqer' : null,
  cost: '3',
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
    await setDoc(doc(db, 'users/ayla'), profile('player', 'Ayla'))
    await setDoc(doc(db, 'users/bora'), profile('player', 'Bora'))
    await setDoc(doc(db, 'users/dana'), profile('dm', 'Dana'))
    await setDoc(doc(db, `cards/${POOL}`), storedCard('normal', "Aboleth's Eyes"))
    await setDoc(doc(db, `cards/${CURSED}`), storedCard('cursed', 'Visions of Death'))
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
  it('uses a card on a character, which releases its holder', async () => {
    const id = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })

    await closeHolding(as('ayla'), {
      holdingId: id,
      by: 'ayla',
      reason: 'used',
      usedOn: ' Thorin ',
    })

    expect(await stored(`userCards/${id}`)).toMatchObject({
      returnedBy: 'ayla',
      returnReason: 'used',
      usedOn: 'Thorin',
    })
    expect((await stored(`userCards/${id}`))?.returnedAt).toBeInstanceOf(Timestamp)
    expect(await stored(`cards/${POOL}`)).toMatchObject({ holder: null })
  })

  it('stores no character when none was typed', async () => {
    const id = await giveCard(as('dana'), { cardId: CURSED, uid: 'ayla', by: 'dana' })

    await closeHolding(as('ayla'), { holdingId: id, by: 'ayla', reason: 'used', usedOn: '  ' })

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

    await closeHolding(as('bora'), { holdingId: copy, by: 'bora', reason: 'used' })

    expect(await stored(`cards/${POOL}`)).toMatchObject({
      holder: { uid: 'ayla', userCardId: original },
    })
  })

  it('fails with "closed" for a holding that is already closed', async () => {
    const id = await giveCard(as('dana'), { cardId: POOL, uid: 'ayla', by: 'dana' })
    await closeHolding(as('ayla'), { holdingId: id, by: 'ayla', reason: 'used' })

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
      closeHolding(as('bora'), { holdingId: id, by: 'bora', reason: 'used' }),
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
