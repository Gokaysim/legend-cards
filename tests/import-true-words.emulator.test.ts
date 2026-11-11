import { readFileSync } from 'node:fs'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { CHANGES_COLLECTION } from '../scripts/lib/importCards.ts'
import {
  runWordImport,
  TRUE_WORDS_COLLECTION,
  trueWordId,
  type WordRow,
} from '../scripts/lib/importTrueWords.ts'
import { type AdminHandle, DEMO_PROJECT_ID, openAdmin } from '../scripts/lib/target.ts'
import { parseTrueWordFile } from '../scripts/lib/trueWordRows.ts'

// `firebase emulators:exec` sets FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST for this run.
let admin: AdminHandle

beforeAll(() => {
  admin = openAdmin({ kind: 'emulator', projectId: DEMO_PROJECT_ID })
})

afterAll(async () => {
  await admin.close()
})

beforeEach(async () => {
  await admin.db.recursiveDelete(admin.db.collection(TRUE_WORDS_COLLECTION))
  await admin.db.recursiveDelete(admin.db.collection('userTrueWords'))
  await admin.db.recursiveDelete(admin.db.collection(CHANGES_COLLECTION))
})

/** The rows of the repository file, parsed and checked as the command does. */
function repositoryWords(): WordRow[] {
  const result = parseTrueWordFile(
    readFileSync(new URL('../data/true-words.csv', import.meta.url), 'utf8'),
  )
  expect(result.errors).toEqual([])
  return result.words
}

const importWords = (words: readonly WordRow[], dryRun = false) =>
  runWordImport(admin.db, words, { dryRun })

const stored = async (id: string) =>
  (await admin.db.doc(`${TRUE_WORDS_COLLECTION}/${id}`).get()).data()

async function storedCount(where?: { field: string; value: unknown }) {
  const collection = admin.db.collection(TRUE_WORDS_COLLECTION)
  const query = where ? collection.where(where.field, '==', where.value) : collection
  return (await query.count().get()).data().count
}

async function records(): Promise<Record<string, unknown>[]> {
  const snapshot = await admin.db.collection(CHANGES_COLLECTION).get()
  return snapshot.docs.map((document) => ({
    id: document.id,
    ...(document.data() as Record<string, unknown>),
  }))
}

describe('True Words import against the emulators', () => {
  it('imports the 53 words of the repository file as active, with one public record', async () => {
    const { plan, written } = await importWords(repositoryWords())

    expect(written).toBe(53)
    expect(plan.counts).toEqual({ 'added-active': 53, 'added-draft': 0, existing: 0 })
    expect(await storedCount({ field: 'status', value: 'active' })).toBe(53)
    const [record] = await records()
    expect(record).toMatchObject({ target: 'word', step: 'imported', public: true, by: null })
    expect(record?.items).toHaveLength(53)
    const abyss = repositoryWords().find(({ word }) => word.name === 'Abyss')?.word
    expect(await stored(trueWordId('abyss'))).toEqual({
      ...abyss,
      status: 'active',
      changeId: record?.id,
    })
  })

  it('adds a word with an empty text as a draft, with a DM-only record', async () => {
    const result = parseTrueWordFile('Name,Cost,Text\nEcho,2,\nLull,1,Quiet.')
    const { plan } = await importWords(result.words)

    expect(plan.counts).toEqual({ 'added-active': 1, 'added-draft': 1, existing: 0 })
    expect(await stored('tw-echo')).toMatchObject({ status: 'draft', text: '' })
    const draftRecord = (await records()).find((record) => record.public === false)
    expect(draftRecord?.items).toEqual([{ id: 'tw-echo', name: 'Echo', status: 'draft' }])
  })

  it('keeps an X cost as written', async () => {
    await importWords(repositoryWords())
    expect((await stored(trueWordId('dragon')))?.cost).toBe('X')
  })

  it('writes no word and no record when the same file is imported again', async () => {
    await importWords(repositoryWords())
    const { plan, written } = await importWords(repositoryWords())

    expect(written).toBe(0)
    expect(plan.counts.existing).toBe(53)
    expect(await records()).toHaveLength(1)
  })

  it('leaves a stored word alone when the file changes it or no longer has it', async () => {
    const words = repositoryWords()
    await importWords(words)

    const changed = words.flatMap((entry) =>
      entry.word.nameKey === 'abyss'
        ? []
        : entry.word.nameKey === 'aid'
          ? [{ ...entry, word: { ...entry.word, cost: '9' } }]
          : [entry],
    )
    await importWords(changed)

    expect(await stored(trueWordId('abyss'))).toMatchObject({ status: 'active' })
    expect(await stored(trueWordId('aid'))).not.toMatchObject({ cost: '9' })
    expect(await storedCount()).toBe(53)
  })

  it('gives words stored before statuses a status, from their old retired flag', async () => {
    await admin.db
      .doc(`${TRUE_WORDS_COLLECTION}/tw-old`)
      .set({ name: 'Old', nameKey: 'old', cost: '1', text: 'Old.', retired: true })

    const { plan } = await importWords([])

    expect(plan.upgrades).toEqual([{ id: 'tw-old', status: 'retired' }])
    expect(await stored('tw-old')).toEqual({
      name: 'Old',
      nameKey: 'old',
      cost: '1',
      text: 'Old.',
      status: 'retired',
    })
  })

  it('writes nothing in a dry run, but plans the same', async () => {
    const { plan, written } = await importWords(repositoryWords(), true)

    expect(written).toBe(0)
    expect(plan.counts['added-active']).toBe(53)
    expect(await storedCount()).toBe(0)
    expect(await records()).toEqual([])
  })

  it('leaves the learned words alone', async () => {
    await admin.db.doc('userTrueWords/r1').set({ wordId: 'tw-abyss', uid: 'ayla' })
    await importWords(repositoryWords())
    expect((await admin.db.doc('userTrueWords/r1').get()).data()).toEqual({
      wordId: 'tw-abyss',
      uid: 'ayla',
    })
  })

  it('refuses a file without the Text column, such as an Elixir file, before writing', () => {
    const result = parseTrueWordFile('Name,Cost,Effect\nHealing Elixir,500,Heal 2d4.')
    expect(result.errors).toEqual([{ kind: 'missing-columns', columns: ['text'] }])
    expect(result.words).toEqual([])
  })
})
