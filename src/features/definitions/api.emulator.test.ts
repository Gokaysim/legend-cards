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
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore'
import { type FirebaseStorage, getBytes, getMetadata, ref, uploadBytes } from 'firebase/storage'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { cardRef } from '@/features/cards/api'
import type { Card } from '@/features/cards/schema'
import { BEHAVIOR_FLAGS, type BehaviorFlags, startingFlags } from '@/features/definitions/flags'
import { TableBusyError } from '@/features/table/errors'
import type { TrueWord } from '@/features/true-words/schema'
import { ONLY_FROM_DM, testCard, testCursedCard } from '@/test/cardFixtures'
import { memberContext, seedMembers } from '@/test/members'
import { testTrueWord } from '@/test/trueWordFixtures'

import firestoreRules from '../../../firestore.rules?raw'
import storageRules from '../../../storage.rules?raw'
import {
  addCard,
  addWord,
  type CardFields,
  deleteCard,
  definitionChangesRef,
  deleteWord,
  saveCard,
  saveWord,
  setCardStatus,
  setWordStatus,
} from './api'
import { DefinitionChangedError, IncompleteDefinitionError, NameTakenError } from './errors'
import { cloudPictureStore, type PictureStore } from './pictureStore'

/** The change records a player may read (spec: definition-editing, "Who reads the change records"). */
const publicChanges = (db: Firestore) =>
  query(definitionChangesRef(db), where('public', '==', true))

let testEnv: RulesTestEnvironment

/** The test context's Firestore is a compat instance; the modular API accepts it (documented by Firebase). */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore
}

/** A user's own Firestore under the real rules. Each call is a separate client, like a separate device. */
const as = (uid: string) => firestoreOf(memberContext(testEnv, uid))

/** The test context's Storage is a compat instance; the modular API takes the instance it wraps. */
function storageOf(context: RulesTestContext): FirebaseStorage {
  return (context.storage() as unknown as { _delegate: FirebaseStorage })._delegate
}

/** A user's picture files under the real storage rules. */
const picturesOf = (uid: string): PictureStore =>
  cloudPictureStore(storageOf(memberContext(testEnv, uid)))

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

/** A definition's eight behavior flags. */
const flagsOf = (definition: BehaviorFlags): BehaviorFlags =>
  Object.fromEntries(BEHAVIOR_FLAGS.map((flag) => [flag, definition[flag]])) as BehaviorFlags

const fieldsOf = (card: Card): CardFields => ({
  kind: card.kind,
  name: card.name,
  setCode: card.setCode,
  cost: card.cost,
  rarity: card.rarity,
  mechanicPack: card.mechanicPack,
  text: card.text,
  ...flagsOf(card),
})

/** A new True Word's fields, with the starting flags. */
const wordFields = (name: string, cost: string | null, text: string) => ({
  name,
  cost,
  text,
  ...startingFlags('trueWord', text),
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
const wordNow = async (id: string) => (await getDoc(cardRef(as('dana'), id))).data() as TrueWord

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
    storage: { host: '127.0.0.1', port: 9199, rules: storageRules },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await seedMembers(testEnv)
  await testEnv.clearStorage()
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
    for (const word of WORDS) await setDoc(doc(db, `cards/${word.id}`), stored(word))
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
    ...startingFlags('normal', 'Play a song.'),
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
    const visible = await getDocs(publicChanges(as('ayla')))
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

  it('deletes a draft together with its lore, keeping its record', async () => {
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), `cardLore/${ENCORE.id}`), {
        text: 'Bir ozanın son şarkısı.',
        updatedBy: 'dana',
        updatedAt: Timestamp.fromMillis(0),
      })
    })

    await deleteCard(as('dana'), { card: ENCORE, by: 'dana' })

    expect(await readAsAdmin(`cardLore/${ENCORE.id}`)).toBeUndefined()
    expect(await records()).toEqual([
      expect.objectContaining({ id: `del-${ENCORE.id}-c-encore`, step: 'deleted' }),
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

describe('behavior flags under the real rules', () => {
  const save = (card: Card, changes: Partial<CardFields>, publish = false) =>
    saveCard(as('dana'), {
      card,
      fields: { ...fieldsOf(card), ...changes },
      publish,
      by: 'dana',
      existing: CARDS,
    })

  /** The flag before and after in each card record a player can read. */
  async function publicFlag(flag: keyof BehaviorFlags) {
    const visible = await getDocs(publicChanges(as('ayla')))
    return visible.docs.flatMap((entry) => {
      const record = entry.data()
      return record.step === 'imported' ? [] : [[record.before?.[flag], record.after?.[flag]]]
    })
  }

  it('turns a draw flag of an active card off as an edit, in a public record', async () => {
    await save(EYES, { isInDraws: false })
    expect(await cardNow(EYES.id)).toMatchObject({ isInDraws: false, status: 'active' })
    expect(await publicFlag('isInDraws')).toEqual([[true, false]])
  })

  it('hides a card and lists it again, each in a public record, keeping the edits between them private', async () => {
    await save(EYES, { isInLibrary: false })
    await save(await cardNow(EYES.id), { cost: '3' })
    await save(await cardNow(EYES.id), { isInLibrary: true })

    expect(await publicFlag('isInLibrary')).toEqual(
      expect.arrayContaining([
        [true, false],
        [false, true],
      ]),
    )
    const steps = (await records()).map(({ public: isPublic, after }) => ({
      isPublic,
      cost: (after as Card | null)?.cost,
    }))
    expect(steps).toEqual(expect.arrayContaining([{ isPublic: false, cost: '3' }]))
  })

  it('adds and publishes a draft only the DM gives, privately', async () => {
    const id = await addCard(as('dana'), {
      fields: { ...fieldsOf(ENCORE), name: 'The Last Wish', ...ONLY_FROM_DM },
      publish: false,
      by: 'dana',
      existing: CARDS,
    })
    await save(await cardNow(id), {}, true)

    expect(await cardNow(id)).toMatchObject({ status: 'active', ...ONLY_FROM_DM, holder: null })
    // The records come in document ID order, which is random: sort them by step, as the other tests do.
    const steps = (await records())
      .map(({ step, public: isPublic }) => ({ step: String(step), isPublic }))
      .sort((a, b) => a.step.localeCompare(b.step))
    expect(steps).toEqual([
      { step: 'added', isPublic: false },
      { step: 'published', isPublic: false },
    ])
  })

  it('refuses a pool flag while a pack is open, and still hides a card', async () => {
    await openPack()
    expect(await failureOf(save(EYES, { isInDraws: false }))).toBeInstanceOf(TableBusyError)
    expect(await failureOf(save(EYES, { ...ONLY_FROM_DM }))).toBeInstanceOf(TableBusyError)
    expect(await failureOf(save(EYES, { isRepeatable: true }))).toBeInstanceOf(TableBusyError)
    expect(await cardNow(EYES.id)).toMatchObject({ isInDraws: true, isInLibrary: true })

    await save(EYES, { isInLibrary: false, hasHeldEffect: true })
    expect(await cardNow(EYES.id)).toMatchObject({ isInLibrary: false, hasHeldEffect: true })
  })

  it('refuses "Birden fazla elde olabilir" on while someone holds the one copy', async () => {
    const held = { ...EYES, holder: { uid: 'ayla', userCardId: 'h-ayla' } }
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), `cards/${EYES.id}`), stored(held))
    })
    expect(await failureOf(save(held, { isRepeatable: true }))).toBeDefined()
    expect(await cardNow(EYES.id)).toMatchObject({ isRepeatable: false, holder: held.holder })
  })

  it('turns "Birden fazla elde olabilir" on for a card in the pool, and off for a Cursed card', async () => {
    await save(EYES, { isRepeatable: true })
    expect(await cardNow(EYES.id)).toMatchObject({ isRepeatable: true, holder: null })
    await save(HEX, { isRepeatable: false })
    expect(await cardNow(HEX.id)).toMatchObject({ isRepeatable: false, holder: null })
  })
})

describe('True Word steps under the real rules', () => {
  it('adds a word as a draft, completes and publishes it, retires and brings it back', async () => {
    const id = await addWord(as('dana'), {
      fields: wordFields('Lull', null, ''),
      publish: false,
      by: 'dana',
      existing: WORDS,
    })
    expect(id).toBe('tw-lull')

    await saveWord(as('dana'), {
      word: await wordNow(id),
      fields: wordFields('Lull', '2', 'Quiet.'),
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

  it('stores a word in cards with its kind and flags, its record targeting the word', async () => {
    const id = await addWord(as('dana'), {
      fields: wordFields('Lull', '2', 'Held: rest.'),
      publish: true,
      by: 'dana',
      existing: WORDS,
    })
    expect(await readAsAdmin(`cards/${id}`)).toMatchObject({
      kind: 'trueWord',
      status: 'active',
      hasHeldEffect: true,
      isRepeatable: true,
      isKeptOnUse: true,
      isInSetPacks: false,
      isInMechanicPacks: false,
    })
    expect((await records()).map((record) => [record.step, record.target])).toEqual([
      ['added', 'word'],
    ])
  })

  it("refuses a word's draft flag while a pack is open, and still hides it from the list", async () => {
    await openPack()
    const save = (changes: Partial<BehaviorFlags>) =>
      saveWord(as('dana'), {
        word: ABYSS,
        fields: { ...wordFields('Abyss', ABYSS.cost, ABYSS.text), ...changes },
        publish: false,
        by: 'dana',
        existing: WORDS,
      })
    expect(await failureOf(save({ isInDraws: false }))).toBeInstanceOf(TableBusyError)
    await save({ isInLibrary: false })
    expect(await wordNow(ABYSS.id)).toMatchObject({ isInDraws: true, isInLibrary: false })
  })

  it('refuses publishing a word without a cost, and a name another word has', async () => {
    expect(
      await failureOf(
        saveWord(as('dana'), {
          word: ECHO,
          fields: wordFields('Echo', null, 'Text.'),
          publish: true,
          by: 'dana',
          existing: WORDS,
        }),
      ),
    ).toBeInstanceOf(IncompleteDefinitionError)
    expect(
      await failureOf(
        addWord(as('dana'), {
          fields: wordFields('ABYSS', '1', 'Again.'),
          publish: false,
          by: 'dana',
          existing: WORDS,
        }),
      ),
    ).toBeInstanceOf(NameTakenError)
  })

  it('deletes a draft word', async () => {
    await deleteWord(as('dana'), { word: ECHO, by: 'dana' })
    expect(await readAsAdmin(`cards/${ECHO.id}`)).toBeUndefined()
  })
})

/** A prepared picture with a fixed hash: the bytes say which one it is. */
const pictureOf = (hash: string) => ({
  kind: 'new' as const,
  blob: new Blob([new TextEncoder().encode(hash)], { type: 'image/webp' }),
  hash,
})

/** Stores a file as the admin, outside the rules. */
async function seedFile(path: string) {
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    await uploadBytes(ref(storageOf(admin), path), new TextEncoder().encode('seeded'), {
      contentType: 'image/webp',
    })
  })
}

/** The file's metadata, or `null` when there is no file at `path`. */
async function fileAt(path: string) {
  let metadata: Awaited<ReturnType<typeof getMetadata>> | null = null
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    try {
      metadata = await getMetadata(ref(storageOf(admin), path))
    } catch {
      metadata = null
    }
  })
  return metadata as Awaited<ReturnType<typeof getMetadata>> | null
}

/** Gives a stored card a picture, as an earlier step or the picture import would have. */
async function seedCardPicture(card: Card, path: string): Promise<Card> {
  await seedFile(path)
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(firestoreOf(admin), `cards/${card.id}`), { ...stored(card), picture: path })
  })
  return { ...card, picture: path }
}

describe('pictures under the real rules', () => {
  const EYES_OLD = `cards/${EYES.id}/aaaaaaaaaa.webp`

  it('adds a card with its picture: the file, its metadata, the card and the record', async () => {
    const id = await addCard(
      as('dana'),
      {
        fields: { ...fieldsOf(EYES), name: 'Lute Song' },
        publish: false,
        by: 'dana',
        existing: CARDS,
        picture: pictureOf('0123456789'),
      },
      picturesOf('dana'),
    )

    const path = `cards/${id}/0123456789.webp`
    expect(await fileAt(path)).toMatchObject({
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
      contentDisposition: `attachment; filename="${id}.webp"`,
    })
    expect((await cardNow(id)).picture).toBe(path)
    const added = (await records()).find((record) => record.step === 'added')
    expect(added).toMatchObject({ after: { picture: path } })
  })

  it('adds a card without a picture field when no picture is chosen', async () => {
    const id = await addCard(as('dana'), {
      fields: { ...fieldsOf(EYES), name: 'Lute Song' },
      publish: false,
      by: 'dana',
      existing: CARDS,
    })
    expect(await readAsAdmin(`cards/${id}`)).not.toHaveProperty('picture')
  })

  it('replaces a picture, deleting the old file, and records both paths', async () => {
    const card = await seedCardPicture(EYES, EYES_OLD)

    await saveCard(
      as('dana'),
      {
        card,
        fields: fieldsOf(card),
        publish: false,
        by: 'dana',
        existing: CARDS,
        picture: pictureOf('bbbbbbbbbb'),
      },
      picturesOf('dana'),
    )

    const next = `cards/${EYES.id}/bbbbbbbbbb.webp`
    expect((await cardNow(EYES.id)).picture).toBe(next)
    expect(await fileAt(next)).not.toBeNull()
    expect(await fileAt(EYES_OLD)).toBeNull()
    const edited = (await records()).find((record) => record.step === 'edited')
    expect(edited).toMatchObject({ before: { picture: EYES_OLD }, after: { picture: next } })
  })

  it('removes a picture: the field is null and the file is gone', async () => {
    const card = await seedCardPicture(EYES, EYES_OLD)

    await saveCard(
      as('dana'),
      {
        card,
        fields: fieldsOf(card),
        publish: false,
        by: 'dana',
        existing: CARDS,
        picture: { kind: 'remove' },
      },
      picturesOf('dana'),
    )

    expect(await readAsAdmin(`cards/${EYES.id}`)).toMatchObject({ picture: null })
    expect(await fileAt(EYES_OLD)).toBeNull()
  })

  it('keeps the field absent when a card that never had a picture is edited', async () => {
    const { picture: _none, ...withoutField } = stored(EYES)
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), `cards/${EYES.id}`), withoutField)
    })

    await saveCard(
      as('dana'),
      {
        card: EYES,
        fields: { ...fieldsOf(EYES), cost: '3' },
        publish: false,
        by: 'dana',
        existing: CARDS,
      },
      picturesOf('dana'),
    )

    const now = await readAsAdmin(`cards/${EYES.id}`)
    expect(now).toMatchObject({ cost: '3' })
    expect(now).not.toHaveProperty('picture')
  })

  it('deletes its upload and keeps the stored picture when the save is refused', async () => {
    const card = await seedCardPicture(EYES, EYES_OLD)
    // Another device changes the card after this form opened.
    await testEnv.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(firestoreOf(admin), `cards/${EYES.id}`), {
        ...stored(card),
        cost: '9',
      })
    })

    const failure = await failureOf(
      saveCard(
        as('dana'),
        {
          card,
          fields: fieldsOf(card),
          publish: false,
          by: 'dana',
          existing: CARDS,
          picture: pictureOf('cccccccccc'),
        },
        picturesOf('dana'),
      ),
    )

    expect(failure).toBeInstanceOf(DefinitionChangedError)
    expect(await fileAt(`cards/${EYES.id}/cccccccccc.webp`)).toBeNull()
    expect(await fileAt(EYES_OLD)).not.toBeNull()
    expect((await cardNow(EYES.id)).picture).toBe(EYES_OLD)
  })

  it('keeps the file when the same picture is saved again', async () => {
    const card = await seedCardPicture(EYES, EYES_OLD)

    await saveCard(
      as('dana'),
      {
        card,
        fields: { ...fieldsOf(card), cost: '3' },
        publish: false,
        by: 'dana',
        existing: CARDS,
        picture: pictureOf('aaaaaaaaaa'),
      },
      picturesOf('dana'),
    )

    expect((await cardNow(EYES.id)).picture).toBe(EYES_OLD)
    expect(await fileAt(EYES_OLD)).not.toBeNull()
  })

  it('changes the picture of an active card while a pack is open', async () => {
    await openPack()
    await saveCard(
      as('dana'),
      {
        card: EYES,
        fields: fieldsOf(EYES),
        publish: false,
        by: 'dana',
        existing: CARDS,
        picture: pictureOf('dddddddddd'),
      },
      picturesOf('dana'),
    )
    expect((await cardNow(EYES.id)).picture).toBe(`cards/${EYES.id}/dddddddddd.webp`)
  })

  it('deletes a draft together with its picture file', async () => {
    const path = `cards/${ENCORE.id}/eeeeeeeeee.webp`
    const draft = await seedCardPicture(ENCORE, path)

    await deleteCard(as('dana'), { card: draft, by: 'dana' }, picturesOf('dana'))

    expect(await readAsAdmin(`cards/${ENCORE.id}`)).toBeUndefined()
    expect(await fileAt(path)).toBeNull()
  })

  it('refuses a player a picture upload, and changes nothing', async () => {
    const failure = await failureOf(
      saveCard(
        as('ayla'),
        {
          card: EYES,
          fields: fieldsOf(EYES),
          publish: false,
          by: 'ayla',
          existing: CARDS,
          picture: pictureOf('ffffffffff'),
        },
        picturesOf('ayla'),
      ),
    )
    expect(failure).toMatchObject({ code: 'storage/unauthorized' })
    expect((await cardNow(EYES.id)).picture).toBeNull()
  })

  it('adds a word with a picture, then removes it and deletes the file', async () => {
    const id = await addWord(
      as('dana'),
      {
        fields: wordFields('Lull', '2', 'Rest.'),
        publish: true,
        by: 'dana',
        existing: WORDS,
        picture: pictureOf('abcdef0123'),
      },
      picturesOf('dana'),
    )
    const path = `words/${id}/abcdef0123.webp`
    const word = await wordNow(id)
    expect(word.picture).toBe(path)
    expect(new TextDecoder().decode(await bytesAt(path))).toBe('abcdef0123')

    await saveWord(
      as('dana'),
      {
        word,
        fields: wordFields('Lull', '2', 'Rest.'),
        publish: false,
        by: 'dana',
        existing: [...WORDS, word],
        picture: { kind: 'remove' },
      },
      picturesOf('dana'),
    )
    expect((await wordNow(id)).picture).toBeNull()
    expect(await fileAt(path)).toBeNull()
  })
})

/** The file's bytes, read as the admin. */
async function bytesAt(path: string): Promise<ArrayBuffer> {
  let bytes = new ArrayBuffer(0)
  await testEnv.withSecurityRulesDisabled(async (admin) => {
    bytes = await getBytes(ref(storageOf(admin), path))
  })
  return bytes
}
