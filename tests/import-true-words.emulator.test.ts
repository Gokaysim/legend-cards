import { readFileSync } from 'node:fs'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { runWordImport, TRUE_WORDS_COLLECTION, trueWordId } from '../scripts/lib/importTrueWords.ts'
import { type AdminHandle, DEMO_PROJECT_ID, openAdmin } from '../scripts/lib/target.ts'
import { parseTrueWordFile, type TrueWordDefinition } from '../scripts/lib/trueWordRows.ts'

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
})

/** The words of the repository file, parsed and checked as the command does. */
function repositoryWords(): TrueWordDefinition[] {
  const result = parseTrueWordFile(
    readFileSync(new URL('../data/true-words.csv', import.meta.url), 'utf8'),
  )
  expect(result.errors).toEqual([])
  return result.words.map(({ word }) => word)
}

const importWords = (words: readonly TrueWordDefinition[], dryRun = false) =>
  runWordImport(admin.db, words, { dryRun })

const stored = async (id: string) =>
  (await admin.db.doc(`${TRUE_WORDS_COLLECTION}/${id}`).get()).data()

async function storedCount(where?: { field: string; value: unknown }) {
  const collection = admin.db.collection(TRUE_WORDS_COLLECTION)
  const query = where ? collection.where(where.field, '==', where.value) : collection
  return (await query.count().get()).data().count
}

describe('True Words import against the emulators', () => {
  it('imports the 53 words of the repository file', async () => {
    const { plan, written } = await importWords(repositoryWords())

    expect(written).toBe(53)
    expect(plan.counts.added).toBe(53)
    expect(await storedCount({ field: 'retired', value: false })).toBe(53)
    const abyss = repositoryWords().find((word) => word.name === 'Abyss')
    expect(await stored(trueWordId('abyss'))).toEqual({ ...abyss, retired: false })
  })

  it('keeps an X cost as written', async () => {
    await importWords(repositoryWords())
    expect((await stored(trueWordId('dragon')))?.cost).toBe('X')
  })

  it('writes nothing when the same file is imported again', async () => {
    await importWords(repositoryWords())
    const { plan, written } = await importWords(repositoryWords())

    expect(written).toBe(0)
    expect(plan.counts.unchanged).toBe(53)
  })

  it('retires a word removed from the file, and brings it back when it returns', async () => {
    const words = repositoryWords()
    await importWords(words)

    const withoutAbyss = words.filter((word) => word.nameKey !== 'abyss')
    const retired = await importWords(withoutAbyss)
    expect(retired.plan.counts.retired).toBe(1)
    expect(await stored(trueWordId('abyss'))).toMatchObject({ name: 'Abyss', retired: true })
    expect(await storedCount()).toBe(53)

    const restored = await importWords(words)
    expect(restored.plan.counts.restored).toBe(1)
    expect(await stored(trueWordId('abyss'))).toMatchObject({ retired: false })
  })

  it('writes nothing in a dry run, but plans the same', async () => {
    await importWords(repositoryWords())
    const withoutAid = repositoryWords().filter((word) => word.nameKey !== 'aid')

    const { plan, written } = await importWords(withoutAid, true)

    expect(written).toBe(0)
    expect(plan.counts.retired).toBe(1)
    expect(await stored(trueWordId('aid'))).toMatchObject({ retired: false })
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
