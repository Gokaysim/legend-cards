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

import { TableBusyError } from '@/features/table/errors'
import type { RandomSource } from '@/lib/random'
import { testTrueWord } from '@/test/trueWordFixtures'

import firestoreRules from '../../../firestore.rules?raw'
import {
  cancelDraft,
  learnWord,
  playerVisibleWordsQuery,
  recordWordUse,
  setWordActive,
  skipDraft,
  startDraft,
  type StartDraftInput,
  takeBackWord,
  teachWord,
  trueWordsRef,
} from './api'
import { toWordFailure, WordError } from './errors'
import type { TrueWord } from './schema'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

/** A user's own Firestore under the real rules. Each call is a separate client, like a separate device. */
const as = (uid: string) => firestoreOf(testEnv.authenticatedContext(uid))

const [ABYSS, AID, CHAOS, DRAGON, HOARD, MIMIC] = [
  'Abyss',
  'Aid',
  'Chaos',
  'Dragon',
  'Hoard',
  'Mimic',
].map((name) => testTrueWord(name)) as [TrueWord, TrueWord, TrueWord, TrueWord, TrueWord, TrueWord]
const OLD = testTrueWord('Old', { status: 'retired' })
const ECHO = testTrueWord('Echo', { status: 'draft', cost: null, text: '' })
const WORDS: TrueWord[] = [ABYSS, AID, CHAOS, DRAGON, HOARD, MIMIC, OLD]

/** A word as the import stores it: without the ID. */
function storedWord({ id: _id, ...word }: TrueWord) {
  return word
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

/** Ayla's own draft at the price. */
const aylaStarts = (extra: Partial<StartDraftInput> = {}) =>
  startDraft(as('ayla'), {
    uid: 'ayla',
    by: 'ayla',
    amount: 'price',
    words: WORDS,
    known: new Set(),
    random: first,
    ...extra,
  })

const teach = (uid: string, word: TrueWord) =>
  teachWord(as('dana'), { uid, wordId: word.id, by: 'dana' })

async function seedTable(openPackId: string | null) {
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(firestoreOf(admin), 'table/main'), { openPackId })
  })
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
  // Profiles with roles and the words exist only through the admin scripts, so they are seeded. Ayla has 5 LP and
  // Bora 4.
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    const profile = (role: string, displayName: string) => ({
      displayName,
      photoURL: null,
      role,
      createdAt: Timestamp.fromMillis(0),
    })
    await setDoc(doc(db, 'users/ayla'), { ...profile('player', 'Ayla'), lp: 5, lpEntryId: 'seed' })
    await setDoc(doc(db, 'users/bora'), { ...profile('player', 'Bora'), lp: 4, lpEntryId: 'seed' })
    await setDoc(doc(db, 'users/dana'), profile('dm', 'Dana'))
    for (const word of [...WORDS, ECHO]) {
      await setDoc(doc(db, `trueWords/${word.id}`), storedWord(word))
    }
  })
})

describe('reading the words under the real rules', () => {
  it("gives a player's query the active and retired words, and never a draft", async () => {
    const snapshot = await getDocs(playerVisibleWordsQuery(as('ayla')))
    const ids = snapshot.docs.map((entry) => entry.id)
    expect(ids).toContain(OLD.id)
    expect(ids).not.toContain(ECHO.id)
    expect(ids).toHaveLength(WORDS.length)
  })

  it('gives the DM every word, the drafts included, and refuses a player the whole collection', async () => {
    const snapshot = await getDocs(trueWordsRef(as('dana')))
    expect(snapshot.docs.map((entry) => entry.id)).toContain(ECHO.id)
    await expect(getDocs(trueWordsRef(as('ayla')))).rejects.toThrow()
  })

  it('never offers a draft word in a draft, even when it is passed in', async () => {
    const id = await aylaStarts({ words: [...WORDS, ECHO] })
    const draft = await stored(`wordDrafts/${id}`)
    expect(draft?.offered).not.toContain(ECHO.id)
  })
})

describe('starting a draft under the real rules', () => {
  it('charges a player 1 LP plus the words they know, and shows 3 words they do not know', async () => {
    await teach('ayla', CHAOS)
    await teach('ayla', HOARD)

    const id = await aylaStarts({ known: new Set([CHAOS.id, HOARD.id]) })

    const draft = await stored(`wordDrafts/${id}`)
    expect(draft).toMatchObject({
      uid: 'ayla',
      by: 'ayla',
      status: 'open',
      paidWith: 'lp',
      cost: 3,
    })
    expect(draft?.offered).toEqual([ABYSS.id, AID.id, DRAGON.id])
    expect(await stored('users/ayla')).toMatchObject({ lp: 2, lpEntryId: draft?.entryId })
    expect(await stored(`ledger/${String(draft?.entryId)}`)).toMatchObject({
      source: 'wordDraft',
      delta: -3,
      balanceAfter: 2,
      drawId: id,
    })
    expect(await stored('playerWords/ayla')).toMatchObject({ openDraftId: id })
  })

  it("charges a player's first draft 1 LP", async () => {
    await startDraft(as('bora'), {
      uid: 'bora',
      by: 'bora',
      amount: 'price',
      words: WORDS,
      known: new Set(),
      random: first,
    })
    expect(await stored('users/bora')).toMatchObject({ lp: 3 })
  })

  it('lets the DM charge another amount of the LP, or start the draft for free', async () => {
    await startDraft(as('dana'), {
      uid: 'ayla',
      by: 'dana',
      amount: 4,
      words: WORDS,
      known: new Set(),
      random: first,
    })
    expect(await stored('users/ayla')).toMatchObject({ lp: 1 })

    const free = await startDraft(as('dana'), {
      uid: 'bora',
      by: 'dana',
      amount: 0,
      words: WORDS,
      known: new Set(),
      random: first,
    })
    expect(await stored(`wordDrafts/${free}`)).toMatchObject({
      paidWith: 'none',
      cost: 0,
      entryId: null,
    })
    expect(await stored('users/bora')).toMatchObject({ lp: 4 })
    expect(await all('ledger')).toHaveLength(1)
  })

  it("refuses the DM's amount above the player's LP, naming it", async () => {
    const error = await failureOf(
      startDraft(as('dana'), {
        uid: 'ayla',
        by: 'dana',
        amount: 6,
        words: WORDS,
        known: new Set(),
        random: first,
      }),
    )
    expect(toWordFailure(error)).toEqual({ kind: 'insufficient', balance: 5, amount: 6 })
    expect(await all('wordDrafts')).toEqual([])
  })

  it('refuses a draft with fewer than 3 learnable words, before writing', async () => {
    const error = await failureOf(aylaStarts({ words: [ABYSS, AID, OLD] }))
    expect(toWordFailure(error)).toEqual({ kind: 'too-few-words' })
    expect(await all('wordDrafts')).toEqual([])
  })

  it('refuses a second draft while one is open', async () => {
    await aylaStarts()
    const error = await failureOf(aylaStarts())
    expect(toWordFailure(error)).toEqual({ kind: 'draft-open' })
    expect(await stored('users/ayla')).toMatchObject({ lp: 4 })
  })

  it('refuses a player without enough LP', async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), 'users/ayla'), {
        displayName: 'Ayla',
        photoURL: null,
        role: 'player',
        createdAt: Timestamp.fromMillis(0),
        lp: 0,
        lpEntryId: 'seed',
      })
    })
    const error = await failureOf(aylaStarts())
    expect(toWordFailure(error)).toEqual({ kind: 'insufficient', balance: 0, amount: 1 })
  })

  it('waits while a pack is open', async () => {
    await seedTable('p1')
    const error = await failureOf(aylaStarts())
    expect(error).toBeInstanceOf(TableBusyError)
    expect(toWordFailure(error)).toEqual({ kind: 'table-busy' })
  })

  it('picks again when a picked word was taught meanwhile, and charges once', async () => {
    await teach('ayla', ABYSS)

    // The client still thinks Ayla knows nothing, so the first pick shows Abyss.
    const id = await aylaStarts({ known: new Set() })

    const draft = await stored(`wordDrafts/${id}`)
    expect(draft?.offered).toEqual([AID.id, CHAOS.id, DRAGON.id])
    expect(draft?.cost).toBe(2)
    expect(await all('wordDrafts')).toHaveLength(1)
    expect(await stored('users/ayla')).toMatchObject({ lp: 3 })
  })
})

describe('learning and skipping under the real rules', () => {
  it('learns a word, inactive, and ends the draft', async () => {
    const id = await aylaStarts()

    const recordId = await learnWord(as('ayla'), { draftId: id, wordId: AID.id, by: 'ayla' })

    expect(await stored(`userTrueWords/${recordId}`)).toMatchObject({
      wordId: AID.id,
      wordName: 'Aid',
      uid: 'ayla',
      learnedBy: 'ayla',
      learnedVia: 'draft',
      draftId: id,
      active: false,
      removedBy: null,
    })
    expect(await stored(`wordDrafts/${id}`)).toMatchObject({
      status: 'learned',
      closedBy: 'ayla',
      learned: { wordId: AID.id, wordName: 'Aid', recordId },
    })
    expect(await stored('playerWords/ayla')).toEqual({
      known: { [AID.id]: recordId },
      openDraftId: null,
      recordId,
    })
  })

  it('lets the DM learn for the player', async () => {
    const id = await aylaStarts()
    await learnWord(as('dana'), { draftId: id, wordId: ABYSS.id, by: 'dana' })
    expect(await stored(`wordDrafts/${id}`)).toMatchObject({ status: 'learned', closedBy: 'dana' })
  })

  it('refuses a shown word that the DM taught meanwhile', async () => {
    const id = await aylaStarts()
    await teach('ayla', ABYSS)

    const error = await failureOf(
      learnWord(as('ayla'), { draftId: id, wordId: ABYSS.id, by: 'ayla' }),
    )

    expect(toWordFailure(error)).toEqual({ kind: 'word-known' })
    await learnWord(as('ayla'), { draftId: id, wordId: AID.id, by: 'ayla' })
  })

  it('refuses a word the draft does not show', async () => {
    const id = await aylaStarts()
    const error = await failureOf(
      learnWord(as('ayla'), { draftId: id, wordId: MIMIC.id, by: 'ayla' }),
    )
    expect(toWordFailure(error)).toEqual({ kind: 'invalid-choice' })
  })

  it('reports a draft that another device ended as closed', async () => {
    const id = await aylaStarts()
    await skipDraft(as('dana'), { draftId: id, by: 'dana' })

    const error = await failureOf(
      learnWord(as('ayla'), { draftId: id, wordId: AID.id, by: 'ayla' }),
    )

    expect(toWordFailure(error)).toEqual({ kind: 'closed' })
  })

  it('skips a draft, keeping the payment', async () => {
    const id = await aylaStarts()

    await skipDraft(as('ayla'), { draftId: id, by: 'ayla' })

    expect(await stored(`wordDrafts/${id}`)).toMatchObject({ status: 'skipped', closedBy: 'ayla' })
    expect(await stored('users/ayla')).toMatchObject({ lp: 4 })
    expect(await stored('playerWords/ayla')).toMatchObject({ openDraftId: null })
  })

  it('waits while a pack is open, and leaves the draft open', async () => {
    const id = await aylaStarts()
    await seedTable('p1')

    const error = await failureOf(
      learnWord(as('ayla'), { draftId: id, wordId: AID.id, by: 'ayla' }),
    )

    expect(toWordFailure(error)).toEqual({ kind: 'table-busy' })
    expect(await stored(`wordDrafts/${id}`)).toMatchObject({ status: 'open' })
  })
})

describe('cancelling under the real rules', () => {
  it('refunds a paid draft with a wordDraft entry', async () => {
    const id = await aylaStarts()

    await cancelDraft(as('dana'), { draftId: id, by: 'dana' })

    const draft = await stored(`wordDrafts/${id}`)
    expect(draft).toMatchObject({ status: 'cancelled', closedBy: 'dana' })
    expect(await stored(`ledger/${String(draft?.refundEntryId)}`)).toMatchObject({
      source: 'wordDraft',
      delta: 1,
      balanceAfter: 5,
      drawId: id,
      by: 'dana',
    })
    expect(await stored('users/ayla')).toMatchObject({ lp: 5 })
  })

  it('cancels a free draft without an entry', async () => {
    const id = await startDraft(as('dana'), {
      uid: 'ayla',
      by: 'dana',
      amount: 0,
      words: WORDS,
      known: new Set(),
      random: first,
    })

    await cancelDraft(as('dana'), { draftId: id, by: 'dana' })

    expect(await stored(`wordDrafts/${id}`)).toMatchObject({
      status: 'cancelled',
      refundEntryId: null,
    })
    expect(await all('ledger')).toEqual([])
  })

  it('refuses a player cancelling their own draft', async () => {
    const id = await aylaStarts()
    const error = await failureOf(cancelDraft(as('ayla'), { draftId: id, by: 'ayla' }))
    expect(toWordFailure(error)).toEqual({ kind: 'permission-denied' })
  })
})

describe('teaching, taking back and switching active under the real rules', () => {
  it('teaches a word for free', async () => {
    const recordId = await teach('bora', AID)
    expect(await stored(`userTrueWords/${recordId}`)).toMatchObject({
      learnedVia: 'dm',
      draftId: null,
      learnedBy: 'dana',
    })
    expect(await stored('users/bora')).toMatchObject({ lp: 4 })
  })

  it('refuses a word the player knows, and a retired word', async () => {
    await teach('ayla', AID)
    expect(toWordFailure(await failureOf(teach('ayla', AID)))).toEqual({ kind: 'word-known' })
    expect(toWordFailure(await failureOf(teach('ayla', OLD)))).toEqual({ kind: 'unavailable' })
  })

  it('takes back a word, closing its record and freeing the word', async () => {
    const recordId = await teach('ayla', AID)

    await takeBackWord(as('dana'), { recordId, by: 'dana' })

    expect(await stored(`userTrueWords/${recordId}`)).toMatchObject({ removedBy: 'dana' })
    expect(await stored('playerWords/ayla')).toMatchObject({ known: {} })
  })

  it('teaches a word again after taking it back, with a new record', async () => {
    const first = await teach('ayla', AID)
    await takeBackWord(as('dana'), { recordId: first, by: 'dana' })

    const second = await teach('ayla', AID)

    expect(second).not.toBe(first)
    expect(await stored('playerWords/ayla')).toMatchObject({ known: { [AID.id]: second } })
  })

  it('refuses taking back a word twice', async () => {
    const recordId = await teach('ayla', AID)
    await takeBackWord(as('dana'), { recordId, by: 'dana' })
    const error = await failureOf(takeBackWord(as('dana'), { recordId, by: 'dana' }))
    expect(error).toBeInstanceOf(WordError)
    expect(toWordFailure(error)).toEqual({ kind: 'not-known' })
  })

  it('switches a word active while a pack is open', async () => {
    const recordId = await teach('ayla', AID)
    await seedTable('p1')

    await setWordActive(as('dana'), recordId, true)

    expect(await stored(`userTrueWords/${recordId}`)).toMatchObject({ active: true })
  })

  it('waits for an open pack before teaching or taking back', async () => {
    const recordId = await teach('ayla', AID)
    await seedTable('p1')
    expect(toWordFailure(await failureOf(teach('ayla', ABYSS)))).toEqual({ kind: 'table-busy' })
    expect(
      toWordFailure(await failureOf(takeBackWord(as('dana'), { recordId, by: 'dana' }))),
    ).toEqual({ kind: 'table-busy' })
  })
})

describe('using a word under the real rules', () => {
  const use = (by: string, recordId: string, amount: number) =>
    recordWordUse(as(by), { recordId, by, amount })

  describe('on a character', () => {
    const THORIN = 'ThorinAyla0123456789'

    async function seedThorin(archived = false) {
      await testEnv.withSecurityRulesDisabled(async (admin) => {
        await setDoc(doc(firestoreOf(admin), `characters/${THORIN}`), {
          uid: 'ayla',
          name: 'Thorin',
          picture: null,
          archived,
          createdAt: Timestamp.fromMillis(0),
          createdBy: 'ayla',
        })
      })
    }

    async function effects(): Promise<Record<string, unknown>[]> {
      let docs: Record<string, unknown>[] = []
      await testEnv.withSecurityRulesDisabled(async (admin) => {
        docs = (await getDocs(collection(firestoreOf(admin), 'characterEffects'))).docs.map(
          (entry) => entry.data(),
        )
      })
      return docs
    }

    it('records the character and adds the word effect', async () => {
      await seedThorin()
      const recordId = await teach('ayla', AID)

      const useId = await recordWordUse(as('ayla'), {
        recordId,
        by: 'ayla',
        amount: 1,
        target: { kind: 'character', characterId: THORIN },
        addEffect: true,
      })

      expect(await stored(`wordUses/${useId}`)).toMatchObject({
        usedOn: 'Thorin',
        usedOnCharacterId: THORIN,
      })
      expect(await effects()).toEqual([
        expect.objectContaining({
          characterId: THORIN,
          uid: 'ayla',
          source: 'word',
          sourceId: useId,
          name: 'Aid',
          cursed: false,
          createdBy: 'ayla',
        }),
      ])
    })

    it('records the character without an effect, and a typed name without either', async () => {
      await seedThorin()
      const recordId = await teach('ayla', AID)

      const onThorin = await recordWordUse(as('ayla'), {
        recordId,
        by: 'ayla',
        amount: 1,
        target: { kind: 'character', characterId: THORIN },
      })
      const typed = await recordWordUse(as('dana'), {
        recordId,
        by: 'dana',
        amount: 0,
        target: { kind: 'typed', name: 'Goblin şefi' },
        addEffect: true,
      })

      expect(await stored(`wordUses/${onThorin}`)).toMatchObject({ usedOnCharacterId: THORIN })
      const typedUse = await stored(`wordUses/${typed}`)
      expect(typedUse).toMatchObject({ usedOn: 'Goblin şefi' })
      expect(typedUse).not.toHaveProperty('usedOnCharacterId')
      expect(await effects()).toEqual([])
    })

    it('refuses an archived character, and the LP does not change', async () => {
      await seedThorin(true)
      const recordId = await teach('ayla', AID)

      const error = await failureOf(
        recordWordUse(as('ayla'), {
          recordId,
          by: 'ayla',
          amount: 1,
          target: { kind: 'character', characterId: THORIN },
          addEffect: true,
        }),
      )

      expect(toWordFailure(error)).toEqual({ kind: 'character-unavailable' })
      expect(await stored('users/ayla')).toMatchObject({ lp: 5 })
    })
  })

  async function setCost(word: TrueWord, cost: string) {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), `trueWords/${word.id}`), storedWord({ ...word, cost }))
    })
  }

  it("pays the word's price: the use, the entry and the LP agree, and the word stays known", async () => {
    const recordId = await teach('ayla', AID)

    const useId = await use('ayla', recordId, 1)

    const recorded = await stored(`wordUses/${useId}`)
    expect(recorded).toMatchObject({
      uid: 'ayla',
      wordId: AID.id,
      wordName: 'Aid',
      recordId,
      by: 'ayla',
      cost: 1,
    })
    expect(recorded?.at).toBeInstanceOf(Timestamp)
    const entryId = String(recorded?.entryId)
    expect(await stored(`ledger/${entryId}`)).toMatchObject({
      currency: 'lp',
      account: 'ayla',
      delta: -1,
      balanceAfter: 4,
      source: 'wordUse',
      reason: null,
      drawId: useId,
      by: 'ayla',
    })
    expect(await stored('users/ayla')).toMatchObject({ lp: 4, lpEntryId: entryId })
    expect(await stored('playerWords/ayla')).toMatchObject({ known: { [AID.id]: recordId } })
  })

  it('uses a word again, paying each time', async () => {
    const recordId = await teach('ayla', AID)
    await use('ayla', recordId, 1)
    await use('ayla', recordId, 1)
    expect(await stored('users/ayla')).toMatchObject({ lp: 3 })
    expect(await all('wordUses')).toHaveLength(2)
  })

  it('pays the amount the player chose for an "X" word', async () => {
    await setCost(MIMIC, 'X')
    const recordId = await teach('ayla', MIMIC)

    await use('ayla', recordId, 3)

    expect(await stored('users/ayla')).toMatchObject({ lp: 2 })
  })

  it('records a free use of a word that costs "0" without an entry', async () => {
    await setCost(CHAOS, '0')
    const recordId = await teach('ayla', CHAOS)

    const useId = await use('ayla', recordId, 0)

    expect(await stored(`wordUses/${useId}`)).toMatchObject({ cost: 0, entryId: null })
    expect(await stored('users/ayla')).toMatchObject({ lp: 5, lpEntryId: 'seed' })
  })

  it("lets the DM use a player's word for free", async () => {
    const recordId = await teach('ayla', AID)

    const useId = await use('dana', recordId, 0)

    expect(await stored(`wordUses/${useId}`)).toMatchObject({ uid: 'ayla', by: 'dana', cost: 0 })
    expect(await stored('users/ayla')).toMatchObject({ lp: 5 })
  })

  it('fails with "insufficient" when the LP is below the price, and records nothing', async () => {
    await setCost(ABYSS, '5')
    const recordId = await teach('bora', ABYSS)

    const error = await failureOf(use('bora', recordId, 5))

    expect(toWordFailure(error)).toEqual({ kind: 'insufficient', balance: 4, amount: 5 })
    expect(await all('wordUses')).toHaveLength(0)
    expect(await stored('users/bora')).toMatchObject({ lp: 4 })
  })

  it('fails with "price-changed" when the confirmed price is no longer the price', async () => {
    const recordId = await teach('ayla', AID)
    await setCost(AID, '2')

    const error = await failureOf(use('ayla', recordId, 1))

    expect(toWordFailure(error)).toEqual({ kind: 'price-changed', price: 2 })
  })

  it('fails with "not-known" for a word taken back', async () => {
    const recordId = await teach('ayla', AID)
    await takeBackWord(as('dana'), { recordId, by: 'dana' })

    expect(toWordFailure(await failureOf(use('ayla', recordId, 1)))).toEqual({ kind: 'not-known' })
  })

  it('uses a retired word the player knows', async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      const db = firestoreOf(admin)
      await setDoc(doc(db, 'userTrueWords/r-old'), {
        wordId: OLD.id,
        wordName: 'Old',
        uid: 'ayla',
        learnedAt: Timestamp.fromMillis(1000),
        learnedBy: 'dana',
        learnedVia: 'dm',
        draftId: null,
        active: false,
        removedAt: null,
        removedBy: null,
      })
      await setDoc(doc(db, 'playerWords/ayla'), {
        known: { [OLD.id]: 'r-old' },
        openDraftId: null,
        recordId: 'r-old',
      })
    })

    await use('ayla', 'r-old', 1)

    expect(await stored('users/ayla')).toMatchObject({ lp: 4 })
  })

  it('waits for an open pack, and records nothing', async () => {
    const recordId = await teach('ayla', AID)
    await seedTable('p1')

    expect(toWordFailure(await failureOf(use('ayla', recordId, 1)))).toEqual({ kind: 'table-busy' })
    expect(await all('wordUses')).toHaveLength(0)
  })
})
