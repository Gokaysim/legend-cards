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

import { definitionConverter } from '@/features/cards/schema'
import { closeHolding } from '@/features/hands/api'
import { TableBusyError } from '@/features/table/errors'
import type { RandomSource } from '@/lib/random'
import { memberContext, seedMembers } from '@/test/members'

import firestoreRules from '../../../firestore.rules?raw'
import {
  cancelCustomDraft,
  customDraftRef,
  editCustomEffects,
  openCustomDraftsQuery,
  pickEffect,
  startCustomDraft,
  type StartCustomDraftInput,
} from './api'
import { EFFECT_TYPES } from './effectTypes'
import { CustomDraftError, toCustomDraftFailure } from './errors'

let testEnv: RulesTestEnvironment

function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

/** A user's own Firestore under the real rules. */
const as = (uid: string) => firestoreOf(memberContext(testEnv, uid))

/** Every type at every cost, with invented texts. */
const VARIANTS = Object.fromEntries(
  EFFECT_TYPES.map((type) => [
    type,
    { '1': `${type} small.`, '3': `${type} medium.`, '5': `${type} large.` },
  ]),
)

/** A random source that always gives 0: the first candidates, in order. */
const first: RandomSource = () => 0

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
    docs = (await getDocs(collection(firestoreOf(admin), collectionPath))).docs.map((entry) => ({
      id: entry.id,
      ...entry.data(),
    }))
  })
  return docs
}

async function seed(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(firestoreOf(admin), path), data)
  })
}

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the promise to fail')
}

const aylaStarts = (extra: Partial<StartCustomDraftInput> = {}) =>
  startCustomDraft(as('ayla'), {
    uid: 'ayla',
    by: 'ayla',
    base: 3,
    amount: 'price',
    random: first,
    ...extra,
  })

/** Picks the first option of the draft's current step, as `by`. */
async function pickFirst(draftId: string, by = 'ayla') {
  const draft = (await getDoc(customDraftRef(as(by), draftId))).data()
  const type = draft?.offered[0]
  if (type === undefined) throw new Error('No option to pick')
  return pickEffect(as(by), { draftId, type, by, random: first })
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
  const profile = (role: string, displayName: string, lp: number) => ({
    displayName,
    photoURL: null,
    role,
    createdAt: Timestamp.fromMillis(0),
    lp,
    lpEntryId: 'seed',
  })
  await seed('users/ayla', profile('player', 'Ayla', 5))
  await seed('users/bora', profile('player', 'Bora', 4))
  await seed('users/dana', profile('dm', 'Dana', 0))
  await seed('customEffects/main', { variants: VARIANTS, importedAt: Timestamp.fromMillis(0) })
})

describe('starting a Custom Card draft', () => {
  it("takes the player's price and shows the first options", async () => {
    const id = await aylaStarts()
    expect(await stored(`draws/${id}`)).toMatchObject({
      kind: 'customDraft',
      uid: 'ayla',
      by: 'ayla',
      base: 3,
      paidWith: 'lp',
      cost: 3,
      offered: ['Blessed', 'Caster', 'Combat'],
      offerCost: 3,
      required: 3,
      status: 'open',
    })
    expect(await stored('users/ayla')).toMatchObject({ lp: 2 })
    expect(await stored('playerCustomDrafts/ayla')).toEqual({ openDraftId: id })
    const [entry] = (await all('ledger')).filter((e) => e.source === 'customDraft')
    expect(entry).toMatchObject({ account: 'ayla', delta: -3, balanceAfter: 2, drawId: id })
  })

  it('lets the DM start a free draft for a player', async () => {
    const id = await startCustomDraft(as('dana'), {
      uid: 'bora',
      by: 'dana',
      base: 5,
      amount: 0,
      random: first,
    })
    expect(await stored(`draws/${id}`)).toMatchObject({ paidWith: 'none', cost: 0, uid: 'bora' })
    expect(await stored('users/bora')).toMatchObject({ lp: 4 })
  })

  it('refuses more than the LP, a second open draft, and missing effects', async () => {
    const boraStarts = () =>
      startCustomDraft(as('bora'), { uid: 'bora', by: 'bora', base: 5, amount: 'price' })
    const tooMuch = await failureOf(boraStarts())
    expect(tooMuch).toBeInstanceOf(CustomDraftError)
    expect(toCustomDraftFailure(tooMuch)).toEqual({ kind: 'insufficient', balance: 4, amount: 5 })
    expect(
      toCustomDraftFailure(
        await failureOf(
          startCustomDraft(as('dana'), { uid: 'bora', by: 'dana', base: 3, amount: 5 }),
        ),
      ),
    ).toEqual({ kind: 'insufficient', balance: 4, amount: 5 })

    await aylaStarts()
    expect(toCustomDraftFailure(await failureOf(aylaStarts({ base: 1 })))).toEqual({
      kind: 'draft-open',
    })

    await seed('customEffects/main', { variants: {}, importedAt: null })
    expect(
      toCustomDraftFailure(
        await failureOf(
          startCustomDraft(as('bora'), { uid: 'bora', by: 'bora', base: 1, amount: 'price' }),
        ),
      ),
    ).toEqual({ kind: 'no-effects' })
  })

  it('waits while a pack is open', async () => {
    await seed('table/main', { openPackId: 'p-open' })
    expect(await failureOf(aylaStarts())).toBeInstanceOf(TableBusyError)
  })

  it('lets every signed-in user read the open drafts', async () => {
    const id = await aylaStarts()
    const snapshot = await getDocs(openCustomDraftsQuery(as('bora')))
    expect(snapshot.docs.map((entry) => entry.id)).toEqual([id])
  })
})

describe('picking', () => {
  it('makes a 1-cost card with the third pick, at the end of the hand', async () => {
    await seed('userCards/h-old', {
      cardId: 'legend-x',
      cardName: 'X',
      cardKind: 'normal',
      uid: 'ayla',
      givenAt: Timestamp.fromMillis(1000),
      givenBy: 'dana',
      givenVia: 'dm',
      transferredFrom: null,
      drawId: null,
      active: false,
      note: '',
      costOverride: null,
      returnedAt: null,
      returnedBy: null,
      returnReason: null,
      usedOn: null,
      transferredTo: null,
    })
    const id = await aylaStarts({ base: 1 })
    expect(await pickFirst(id)).toEqual({ finished: false })
    expect(await pickFirst(id)).toEqual({ finished: false })
    const result = await pickFirst(id)
    if (!result.finished) throw new Error('The third pick finishes the draft')

    const card = (
      await getDoc(doc(as('ayla'), `cards/${result.cardId}`).withConverter(definitionConverter))
    ).data()
    expect(result.cardId).toMatch(/^custom-/)
    expect(card).toMatchObject({
      kind: 'custom',
      name: '1-Cost Custom Card',
      cost: '1',
      base: 1,
      draftId: id,
      holder: { uid: 'ayla', userCardId: result.holdingId },
      effects: [
        { type: 'Blessed', cost: 1, text: 'Blessed small.' },
        { type: 'Caster', cost: 1, text: 'Caster small.' },
        { type: 'Combat', cost: 1, text: 'Combat small.' },
      ],
    })
    const holdings = (await all('userCards')).filter((h) => h.uid === 'ayla')
    const holding = holdings.find((h) => h.id === result.holdingId)
    expect(holding).toMatchObject({ givenVia: 'draft', drawId: id, cardKind: 'custom' })
    const at = (h: Record<string, unknown> | undefined) => (h?.givenAt as Timestamp).toMillis()
    expect(at(holding)).toBeGreaterThan(at(holdings.find((h) => h.id === 'h-old')))
    expect(await stored(`draws/${id}`)).toMatchObject({
      status: 'finished',
      cardId: result.cardId,
      holdingId: result.holdingId,
      offered: [],
    })
    expect(await stored('playerCustomDrafts/ayla')).toEqual({ openDraftId: null })
  })

  it('lets the DM make the last pick, and the card leaves the game when used', async () => {
    const id = await aylaStarts({ base: 1 })
    await pickFirst(id)
    await pickFirst(id, 'dana')
    const result = await pickFirst(id, 'dana')
    if (!result.finished) throw new Error('The third pick finishes the draft')
    expect(await stored(`draws/${id}`)).toMatchObject({ closedBy: 'dana' })

    await closeHolding(as('ayla'), {
      holdingId: result.holdingId,
      by: 'ayla',
      reason: 'used',
      amount: 1,
    })
    expect(await stored(`cards/${result.cardId}`)).toMatchObject({ holder: null })
    expect(await stored('users/ayla')).toMatchObject({ lp: 3 })
  })

  it('refuses a type that is not an option, and a pick in an ended draft', async () => {
    const id = await aylaStarts()
    expect(
      toCustomDraftFailure(
        await failureOf(pickEffect(as('ayla'), { draftId: id, type: 'XP', by: 'ayla' })),
      ),
    ).toEqual({ kind: 'invalid-choice' })
    await cancelCustomDraft(as('dana'), { draftId: id, by: 'dana' })
    expect(toCustomDraftFailure(await failureOf(pickFirst(id)))).toEqual({ kind: 'closed' })
  })

  it('stops at the last pick when a resolved text is missing', async () => {
    // A 5-cost draft for Bora, free, where Special lowers Caster to its missing 1-cost text.
    const variants = {
      Special: { '5': 'Special large.' },
      Caster: { '5': 'Caster large.' },
      Draw: { '5': 'Draw large.', '1': 'Draw small.' },
    }
    await seed('customEffects/main', { variants, importedAt: null })
    const draftId = await startCustomDraft(as('dana'), {
      uid: 'bora',
      by: 'dana',
      base: 5,
      amount: 0,
      random: first,
    })
    await pickEffect(as('dana'), { draftId, type: 'Special', by: 'dana', random: first })
    await pickEffect(as('dana'), { draftId, type: 'Caster', by: 'dana', random: first })
    expect(
      toCustomDraftFailure(
        await failureOf(pickEffect(as('dana'), { draftId, type: 'Draw', by: 'dana' })),
      ),
    ).toEqual({ kind: 'incomplete-texts' })
    expect(await stored(`draws/${draftId}`)).toMatchObject({ status: 'open' })
  })
})

describe('cancelling', () => {
  it('refunds the payment in full and frees the lock', async () => {
    const id = await aylaStarts()
    await cancelCustomDraft(as('dana'), { draftId: id, by: 'dana' })
    expect(await stored(`draws/${id}`)).toMatchObject({ status: 'cancelled', closedBy: 'dana' })
    expect(await stored('users/ayla')).toMatchObject({ lp: 5 })
    expect(await stored('playerCustomDrafts/ayla')).toEqual({ openDraftId: null })
    await aylaStarts()
  })

  it("refuses a player's cancel", async () => {
    const id = await aylaStarts()
    expect(
      toCustomDraftFailure(
        await failureOf(cancelCustomDraft(as('ayla'), { draftId: id, by: 'ayla' })),
      ),
    ).toEqual({ kind: 'permission-denied' })
  })
})

describe("the DM's effect edits", () => {
  /** A finished 1-cost card in Ayla's hand, read as the DM. */
  async function madeCard() {
    const id = await aylaStarts({ base: 1 })
    await pickFirst(id)
    await pickFirst(id)
    const result = await pickFirst(id)
    if (!result.finished) throw new Error('The third pick finishes the draft')
    const card = (
      await getDoc(doc(as('dana'), `cards/${result.cardId}`).withConverter(definitionConverter))
    ).data()
    if (card?.kind !== 'custom') throw new Error('A Custom Card')
    return card
  }

  it('adds Held, which keeps the card on use, with a DM-only change record', async () => {
    const card = await madeCard()
    await editCustomEffects(as('dana'), {
      card,
      effects: [...card.effects, { type: 'Held', cost: 1, text: 'Held small.' }],
      by: 'dana',
    })
    expect(await stored(`cards/${card.id}`)).toMatchObject({
      hasHeldEffect: true,
      isKeptOnUse: true,
      cost: '1',
    })
    const [record] = await all('definitionChanges')
    expect(record).toMatchObject({
      target: 'card',
      targetId: card.id,
      step: 'edited',
      public: false,
    })
  })

  it("follows the computed cost and refuses a player's edit", async () => {
    const card = await madeCard()
    await editCustomEffects(as('dana'), {
      card,
      effects: [...card.effects, { type: 'Effects', cost: 5, text: 'Effects large.' }],
      by: 'dana',
    })
    expect(await stored(`cards/${card.id}`)).toMatchObject({ cost: '3' })
    const fresh = (
      await getDoc(doc(as('ayla'), `cards/${card.id}`).withConverter(definitionConverter))
    ).data()
    if (fresh?.kind !== 'custom') throw new Error('A Custom Card')
    expect(
      toCustomDraftFailure(
        await failureOf(
          editCustomEffects(as('ayla'), {
            card: fresh,
            effects: fresh.effects.slice(1),
            by: 'ayla',
          }),
        ),
      ),
    ).toEqual({ kind: 'permission-denied' })
  })
})
