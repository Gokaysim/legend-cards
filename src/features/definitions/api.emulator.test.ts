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

import { cardRef } from '@/features/cards/api'
import type { Card } from '@/features/cards/schema'
import { TableBusyError } from '@/features/table/errors'
import { trueWordRef } from '@/features/true-words/api'
import type { TrueWord } from '@/features/true-words/schema'
import { testCard, testCursedCard } from '@/test/cardFixtures'
import { testTrueWord } from '@/test/trueWordFixtures'

import firestoreRules from '../../../firestore.rules?raw'
import {
  addCard,
  addWord,
  type CardFields,
  deleteCard,
  deleteWord,
  publicChangesQuery,
  saveCard,
  saveWord,
  setCardStatus,
  setWordStatus,
} from './api'
import { DefinitionChangedError, IncompleteDefinitionError, NameTakenError } from './errors'

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

/** A user's own Firestore under the real rules. Each call is a separate client, like a separate device. */
const as = (uid: string) => firestoreOf(testEnv.authenticatedContext(uid))

const EYES = testCard("Aboleth's Eyes", { changeId: 'c-seed' })
const OLD = testCard('Old Card', { status: 'retired', changeId: 'c-seed' })
const ENCORE = testCard("Bard's Encore", { status: 'draft', changeId: 'c-encore' })
const HEX = testCursedCard('Hex')
const ABYSS = testTrueWord('Abyss', { changeId: 'c-seed' })
const ECHO = testTrueWord('Echo', { status: 'draft', cost: null, text: '', changeId: 'c-echo' })
const CARDS: Card[] = [EYES, OLD, ENCORE, HEX]
const WORDS: TrueWord[] = [ABYSS, ECHO]

/** A definition as stored: without the ID. */
function stored<T extends { id: string }>({ id: _id, ...definition }: T) {
  return definition
}

const fieldsOf = (card: Card): CardFields => ({
  kind: card.kind,
  name: card.name,
  setCode: card.setCode,
  cost: card.cost,
  rarity: card.rarity,
  mechanicPack: card.mechanicPack,
  text: card.text,
})

async function readAsAdmin(path: string): Promise<Record<string, unknown> | undefined> {
  let data: Record<string, unknown> | undefined
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    data = (await getDoc(doc(firestoreOf(admin), path))).data()
  })
  return data
}

async function records(): Promise<Record<string, unknown>[]> {
  let docs: Record<string, unknown>[] = []
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    docs = (await getDocs(collection(firestoreOf(admin), 'definitionChanges'))).docs.map(
      (entry) => ({ id: entry.id, ...entry.data() }),
    )
  })
  return docs
}

/** The card or word as the DM's device reads it now. */
const cardNow = async (id: string) => (await getDoc(cardRef(as('dana'), id))).data() as Card
const wordNow = async (id: string) => (await getDoc(trueWordRef(as('dana'), id))).data() as TrueWord

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the promise to fail')
}

async function openPack() {
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(firestoreOf(admin), 'table/main'), { openPackId: 'p-open' })
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
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    const db = firestoreOf(admin)
    const profile = (role: string) => ({
      displayName: role,
      photoURL: null,
      role,
      createdAt: Timestamp.fromMillis(0),
    })
    await setDoc(doc(db, 'users/ayla'), profile('player'))
    await setDoc(doc(db, 'users/dana'), profile('dm'))
    for (const card of CARDS) await setDoc(doc(db, `cards/${card.id}`), stored(card))
    for (const word of WORDS) await setDoc(doc(db, `trueWords/${word.id}`), stored(word))
  })
})

describe('card steps under the real rules', () => {
  const lute: CardFields = {
    kind: 'normal',
    name: 'Lute Song',
    setCode: 'Kesqer',
    cost: '2',
    rarity: 'common',
    mechanicPack: 'Arcanus Divine',
    text: 'Play a song.',
  }

  it('adds an unfinished card as a draft, with a DM-only record', async () => {
    const id = await addCard(as('dana'), {
      fields: { ...lute, text: '', rarity: null },
      publish: false,
      by: 'dana',
      existing: CARDS,
    })

    expect(id).toBe('legend-lutesong')
    expect(await readAsAdmin('cards/legend-lutesong')).toMatchObject({
      status: 'draft',
      nameKey: 'lutesong',
      holder: null,
    })
    expect(await records()).toEqual([
      expect.objectContaining({ step: 'added', public: false, by: 'dana', targetId: id }),
    ])
  })

  it('adds a complete Cursed card straight to active, which a player then reads in the records', async () => {
    const id = await addCard(as('dana'), {
      fields: {
        ...lute,
        kind: 'cursed',
        name: 'Hollow Bones',
        setCode: null,
        rarity: null,
        mechanicPack: null,
      },
      publish: true,
      by: 'dana',
      existing: CARDS,
    })

    expect(id).toBe('cursed-hollowbones')
    const visible = await getDocs(publicChangesQuery(as('ayla')))
    expect(visible.docs.map((entry) => entry.data().step)).toEqual(['added'])
  })

  it('refuses a name another card of the deck has, and an incomplete card added straight to active', async () => {
    const add = (fields: CardFields, publish: boolean) =>
      addCard(as('dana'), { fields, publish, by: 'dana', existing: CARDS })
    expect(await failureOf(add({ ...lute, name: 'aboleths eyes' }, false))).toBeInstanceOf(
      NameTakenError,
    )
    expect(await failureOf(add({ ...lute, text: '' }, true))).toBeInstanceOf(
      IncompleteDefinitionError,
    )
    expect(await records()).toEqual([])
  })

  it('gives a new card a suffixed ID when a renamed card holds its name’s ID', async () => {
    const renamed = { ...EYES, name: 'Eyes of the Aboleth', nameKey: 'eyesoftheaboleth' }
    const id = await addCard(as('dana'), {
      fields: { ...lute, name: "Aboleth's Eyes" },
      publish: false,
      by: 'dana',
      existing: [renamed, OLD, ENCORE, HEX],
    })
    expect(id).toBe('legend-abolethseyes-2')
  })

  it('saves an edit of an active card, with the values before and after in a public record', async () => {
    await saveCard(as('dana'), {
      card: EYES,
      fields: { ...fieldsOf(EYES), cost: '3' },
      publish: false,
      by: 'dana',
      existing: CARDS,
    })

    expect(await cardNow(EYES.id)).toMatchObject({ cost: '3', status: 'active' })
    const [record] = await records()
    expect(record).toMatchObject({
      step: 'edited',
      public: true,
      before: { cost: '1' },
      after: { cost: '3' },
    })
  })

  it('renames a card under the same ID', async () => {
    await saveCard(as('dana'), {
      card: EYES,
      fields: { ...fieldsOf(EYES), name: 'Eyes of the Aboleth' },
      publish: false,
      by: 'dana',
      existing: CARDS,
    })
    expect(await cardNow(EYES.id)).toMatchObject({
      name: 'Eyes of the Aboleth',
      nameKey: 'eyesoftheaboleth',
    })
  })

  it('publishes a draft with its changed fields and kind in one step', async () => {
    await saveCard(as('dana'), {
      card: ENCORE,
      fields: { ...fieldsOf(ENCORE), kind: 'blessed', setCode: null, rarity: null },
      publish: true,
      by: 'dana',
      existing: CARDS,
    })
    expect(await cardNow(ENCORE.id)).toMatchObject({ status: 'active', kind: 'blessed' })
    expect(await records()).toEqual([expect.objectContaining({ step: 'published', public: true })])
  })

  it('retires an active card and brings it back', async () => {
    await setCardStatus(as('dana'), { card: EYES, status: 'retired', by: 'dana' })
    const retired = await cardNow(EYES.id)
    expect(retired.status).toBe('retired')

    await setCardStatus(as('dana'), { card: retired, status: 'active', by: 'dana' })
    expect((await cardNow(EYES.id)).status).toBe('active')
    expect((await records()).map((record) => record.step).sort()).toEqual(['restored', 'retired'])
  })

  it('deletes a draft, keeping its record', async () => {
    await deleteCard(as('dana'), { card: ENCORE, by: 'dana' })

    expect(await readAsAdmin(`cards/${ENCORE.id}`)).toBeUndefined()
    expect(await records()).toEqual([
      expect.objectContaining({ id: `del-${ENCORE.id}-c-encore`, step: 'deleted', public: false }),
    ])
  })

  it('refuses a status step while a pack is open, but saves a text fix', async () => {
    await openPack()

    expect(
      await failureOf(setCardStatus(as('dana'), { card: EYES, status: 'retired', by: 'dana' })),
    ).toBeInstanceOf(TableBusyError)
    await saveCard(as('dana'), {
      card: EYES,
      fields: { ...fieldsOf(EYES), text: 'Typo fixed.' },
      publish: false,
      by: 'dana',
      existing: CARDS,
    })
    expect((await cardNow(EYES.id)).text).toBe('Typo fixed.')
  })

  it('refuses a save from a form opened before another device changed the card', async () => {
    const laptop = as('dana')
    const tablet = as('dana')
    await saveCard(laptop, {
      card: EYES,
      fields: { ...fieldsOf(EYES), text: 'From the laptop.' },
      publish: false,
      by: 'dana',
      existing: CARDS,
    })

    const failure = await failureOf(
      saveCard(tablet, {
        card: EYES,
        fields: { ...fieldsOf(EYES), cost: '5' },
        publish: false,
        by: 'dana',
        existing: CARDS,
      }),
    )

    expect(failure).toBeInstanceOf(DefinitionChangedError)
    expect(await cardNow(EYES.id)).toMatchObject({ text: 'From the laptop.', cost: '1' })
  })

  it('refuses a player every step', async () => {
    expect(
      await failureOf(
        saveCard(as('ayla'), {
          card: EYES,
          fields: { ...fieldsOf(EYES), text: 'Mine.' },
          publish: false,
          by: 'ayla',
          existing: CARDS,
        }),
      ),
    ).toBeDefined()
    expect(await cardNow(EYES.id)).toMatchObject({ text: EYES.text })
  })
})

describe('True Word steps under the real rules', () => {
  it('adds a word as a draft, completes and publishes it, retires and brings it back', async () => {
    const id = await addWord(as('dana'), {
      fields: { name: 'Lull', cost: null, text: '' },
      publish: false,
      by: 'dana',
      existing: WORDS,
    })
    expect(id).toBe('tw-lull')

    await saveWord(as('dana'), {
      word: await wordNow(id),
      fields: { name: 'Lull', cost: '2', text: 'Quiet.' },
      publish: true,
      by: 'dana',
      existing: WORDS,
    })
    expect(await wordNow(id)).toMatchObject({ status: 'active', cost: '2' })

    await setWordStatus(as('dana'), { word: await wordNow(id), status: 'retired', by: 'dana' })
    await setWordStatus(as('dana'), { word: await wordNow(id), status: 'active', by: 'dana' })
    expect((await records()).map((record) => record.step).sort()).toEqual([
      'added',
      'published',
      'restored',
      'retired',
    ])
  })

  it('refuses publishing a word without a cost, and a name another word has', async () => {
    expect(
      await failureOf(
        saveWord(as('dana'), {
          word: ECHO,
          fields: { name: 'Echo', cost: null, text: 'Text.' },
          publish: true,
          by: 'dana',
          existing: WORDS,
        }),
      ),
    ).toBeInstanceOf(IncompleteDefinitionError)
    expect(
      await failureOf(
        addWord(as('dana'), {
          fields: { name: 'ABYSS', cost: '1', text: 'Again.' },
          publish: false,
          by: 'dana',
          existing: WORDS,
        }),
      ),
    ).toBeInstanceOf(NameTakenError)
  })

  it('deletes a draft word', async () => {
    await deleteWord(as('dana'), { word: ECHO, by: 'dana' })
    expect(await readAsAdmin(`trueWords/${ECHO.id}`)).toBeUndefined()
  })
})
