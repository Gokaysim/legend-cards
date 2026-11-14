import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { type ArtAlias, readAliases } from '../scripts/lib/artFiles.ts'
import type { SourceFile } from '../scripts/lib/artWrite.ts'
import { bucketPictureStore, type PictureFileStore } from '../scripts/lib/importPictures.ts'
import {
  planSets,
  readStoredSets,
  runSetImport,
  SET_CHANGES_COLLECTION,
  setArtData,
  SETS_COLLECTION,
} from '../scripts/lib/importSets.ts'
import { parseSetFile, type SetRow } from '../scripts/lib/setRows.ts'
import {
  type AdminHandle,
  defaultBucket,
  DEMO_PROJECT_ID,
  openAdmin,
} from '../scripts/lib/target.ts'

// The set import against the emulators (spec: admin-scripts, "Importing sets from a CSV file", "The set import only
// adds", "Set pictures from the archives", "Set import report and dry run", "A set import is recorded").
// `firebase emulators:exec` sets the emulator variables for this run.
let admin: AdminHandle
let folder: string

beforeAll(() => {
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199'
  // The emulators need no Google Cloud credentials: skip the metadata-server lookup, as `connect` does.
  process.env.METADATA_SERVER_DETECTION ??= 'none'
  admin = openAdmin({
    kind: 'emulator',
    projectId: DEMO_PROJECT_ID,
    bucket: defaultBucket(DEMO_PROJECT_ID),
  })
})

afterAll(async () => {
  await admin.close()
})

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'import-sets-'))
  for (const name of [SETS_COLLECTION, SET_CHANGES_COLLECTION]) {
    await admin.db.recursiveDelete(admin.db.collection(name))
  }
  const [stored] = await admin.storage.bucket().getFiles()
  await Promise.all(stored.map((file) => file.delete()))
})

afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
})

/** The rows of the repository's set file, parsed and checked as the command does. */
function repositorySets(): SetRow[] {
  const result = parseSetFile(readFileSync(new URL('../data/sets.csv', import.meta.url), 'utf8'))
  expect(result.errors).toEqual([])
  return result.sets
}

/** Small PNG files, one color each, in the test's folder: a Cardmaker tall, every other file card-shaped. */
async function pngs(...names: string[]): Promise<SourceFile[]> {
  return Promise.all(
    names.map(async (name, index) => {
      const path = join(folder, name)
      const isCardmaker = name.toLowerCase().startsWith('cardmaker_')
      await sharp({
        create: {
          width: isCardmaker ? 60 : 20,
          height: isCardmaker ? 600 : 28,
          channels: 4,
          background: { r: index * 20, g: 80, b: 160, alpha: isCardmaker ? 0.5 : 1 },
        },
      })
        .png()
        .toFile(path)
      return { name, path }
    }),
  )
}

/** Runs the import as the command does: the alias table checked against the sets after it, then the plan. */
async function importSets(
  rows: SetRow[],
  {
    files = null as SourceFile[] | null,
    dryRun = false,
    store = bucketPictureStore(admin.storage),
  } = {},
) {
  const stored = await readStoredSets(admin.db)
  let source: { files: SourceFile[]; aliases: ArtAlias[] } | null = null
  if (files) {
    const aliases = readAliases(
      'File,Kind,Name\nulagalmaker.png,asset,cardmaker_ulagal\n',
      setArtData(stored, planSets(rows, stored)),
      'sets',
    )
    expect(aliases.errors).toEqual([])
    source = { files, aliases: aliases.aliases }
  }
  return runSetImport(admin.db, store, rows, stored, source, { dryRun })
}

const setDoc = async (setId: string) =>
  (await admin.db.doc(`${SETS_COLLECTION}/${setId}`).get()).data()
/** A stored set document with its ID. */
type StoredSetDoc = { id: string; position: number } & Record<string, unknown>
const storedSets = async () =>
  (await admin.db.collection(SETS_COLLECTION).orderBy('position').get()).docs.map(
    (doc): StoredSetDoc => ({ id: doc.id, ...(doc.data() as { position: number }) }),
  )
const records = async () =>
  (await admin.db.collection(SET_CHANGES_COLLECTION).get()).docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
const storedFiles = async () =>
  (await admin.storage.bucket().getFiles())[0].map((file) => file.name).sort()

const NAMES = [
  'The End is Nigh',
  'Conclave at Pentagon',
  'Rituals in Rhodelen',
  'The Overlord of Ashavir',
  'Kesqerian Nights',
  'The Godtower',
  'Descent Under Davarron',
  'Throne of Havenholm',
  'Ballad of Ulagal',
  'Ragnarök: Nordhallr',
  'The Lost City of Gurgitea',
  'Pandemonium',
]

describe('import-sets: the sets', () => {
  it("adds the repository's 12 sets in the file's order, without pictures, and one record naming them", async () => {
    const { plan, written } = await importSets(repositorySets())

    expect(plan.sets.added).toHaveLength(12)
    expect(plan.sets.existing).toEqual([])
    const sets = await storedSets()
    expect(sets.map(({ id }) => id)).toEqual([
      'theendisnigh',
      'pentagon',
      'rhodelen',
      'ashavir',
      'kesqer',
      'godtower',
      'davarron',
      'havenholm',
      'ulagal',
      'nordhallr',
      'gurgitea',
      'pandemonium',
    ])
    expect(sets.map(({ position }) => position)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    const [record, ...more] = await records()
    expect(more).toEqual([])
    expect(written?.recordId).toBe(record?.id)
    expect(await setDoc('nordhallr')).toEqual({
      code: 'Nordhallr',
      name: 'Ragnarök: Nordhallr',
      aliases: ['ragnarok', 'ragnarök'],
      position: 9,
      packLayout: 'standard',
      changeId: record?.id,
    })
    expect(await setDoc('pandemonium')).toMatchObject({ packLayout: 'pandemonium' })
    // No picture fields: an absent field means the set never had a picture.
    for (const set of sets) {
      expect(set).not.toHaveProperty('cardback')
      expect(set).not.toHaveProperty('mascot')
    }
    expect(record).toEqual({
      id: record?.id,
      by: null,
      at: expect.anything() as unknown,
      step: 'imported',
      setId: null,
      code: null,
      name: null,
      fields: [],
      direction: null,
      added: NAMES,
      pictured: [],
    })
  })

  it('changes nothing and writes no record when it runs again', async () => {
    await importSets(repositorySets())
    const before = await storedSets()

    const { plan, written } = await importSets(repositorySets())

    expect(plan.sets.added).toEqual([])
    expect(plan.sets.existing).toHaveLength(12)
    expect(written?.recordId).toBeNull()
    expect(await storedSets()).toEqual(before)
    expect(await records()).toHaveLength(1)
  })

  it('leaves a set the DM renamed alone, and adds none', async () => {
    await importSets(repositorySets())
    await admin.db.doc(`${SETS_COLLECTION}/ulagal`).update({ name: 'The Ulagal Ballads' })

    const { plan } = await importSets(repositorySets())

    expect(plan.sets.added).toEqual([])
    expect(await setDoc('ulagal')).toMatchObject({ name: 'The Ulagal Ballads' })
    expect(await storedSets()).toHaveLength(12)
  })

  it('adds the missing sets after the stored ones, and knows a stored set by an alias', async () => {
    const rows = repositorySets()
    await importSets(rows.slice(0, 3))
    // A set the DM added in the app, whose alias is a code of the file.
    await admin.db.doc(`${SETS_COLLECTION}/ragnaroksaga`).set({
      code: 'Ragnarök Saga',
      name: 'Ragnarök Saga',
      aliases: ['Nordhallr'],
      position: 7,
      packLayout: 'standard',
      changeId: 'dm-change',
    })

    const { plan } = await importSets(rows)

    expect(plan.sets.existing.map(({ row, stored }) => [row.code, stored.setId])).toEqual([
      ['The End is Nigh', 'theendisnigh'],
      ['Pentagon', 'pentagon'],
      ['Rhodelen', 'rhodelen'],
      ['Nordhallr', 'ragnaroksaga'],
    ])
    const sets = await storedSets()
    expect(sets.map(({ id, position }) => [id, position])).toEqual([
      ['theendisnigh', 0],
      ['pentagon', 1],
      ['rhodelen', 2],
      ['ragnaroksaga', 7],
      ['ashavir', 8],
      ['kesqer', 9],
      ['godtower', 10],
      ['davarron', 11],
      ['havenholm', 12],
      ['ulagal', 13],
      ['gurgitea', 14],
      ['pandemonium', 15],
    ])
    expect(await setDoc('nordhallr')).toBeUndefined()
  })

  it('writes nothing in a dry run, but reports the same plan', async () => {
    const { plan, written } = await importSets(repositorySets(), {
      files: await pngs('kesqer_cb.png'),
      dryRun: true,
    })

    expect(written).toBeNull()
    expect(plan.sets.added.map(({ name }) => name)).toEqual(NAMES)
    expect(
      plan.pictures?.pictures.map(({ set, field, outcome }) => [set.setId, field, outcome]),
    ).toEqual([['kesqer', 'cardback', 'add']])
    expect(await storedSets()).toEqual([])
    expect(await storedFiles()).toEqual([])
    expect(await records()).toEqual([])
  })
})

describe('import-sets: the pictures', () => {
  const FILES = [
    'kesqer_cb.png',
    'cardmaker_kesqer.png',
    'ulagal_cb.png',
    'ulagalmaker.png',
    'cardmaker_ragnarok.png',
    'blessed_cb.png',
    'abolethseyes.png',
    'nowhere_cb.png',
  ]

  it('gives the sets added in the same run their pictures, recorded with them', async () => {
    const { plan, written } = await importSets(repositorySets(), { files: await pngs(...FILES) })

    expect(written?.pictured).toHaveLength(5)
    expect(plan.pictures?.art.unknown.map(({ name }) => name)).toEqual(['nowhere_cb.png'])
    expect(plan.pictures?.art.skipped.map(({ name }) => name)).toEqual([
      'abolethseyes.png',
      'blessed_cb.png',
    ])
    expect(plan.pictures?.without.cardback.map(({ setId }) => setId)).toHaveLength(10)
    const [record, ...more] = await records()
    expect(more).toEqual([])
    expect(record).toMatchObject({
      step: 'imported',
      added: NAMES,
      pictured: ['Kesqerian Nights', 'Ballad of Ulagal', 'Ragnarök: Nordhallr'],
    })
    expect(await setDoc('kesqer')).toMatchObject({ changeId: record?.id })
  })

  it('stores pictures only where the set never had one, and never brings back a removed Cardmaker', async () => {
    await importSets(repositorySets())
    const DM_CARDBACK = 'sets/kesqer/aaaaaaaaaa.webp'
    await admin.db.doc(`${SETS_COLLECTION}/kesqer`).update({ cardback: DM_CARDBACK })
    await admin.db.doc(`${SETS_COLLECTION}/ulagal`).update({ mascot: null })

    const { plan, written } = await importSets(repositorySets(), { files: await pngs(...FILES) })

    const outcomes = plan.pictures?.pictures.map(({ set, field, outcome }) => [
      set.setId,
      field,
      outcome,
    ])
    expect(outcomes).toEqual([
      ['kesqer', 'cardback', 'has'],
      ['kesqer', 'mascot', 'add'],
      ['ulagal', 'cardback', 'add'],
      ['ulagal', 'mascot', 'removed'],
      ['nordhallr', 'mascot', 'add'],
    ])
    expect(written?.pictured).toHaveLength(3)

    // The DM's cardback and the DM's removal stay.
    expect(await setDoc('kesqer')).toMatchObject({ cardback: DM_CARDBACK })
    expect(await setDoc('ulagal')).toMatchObject({ mascot: null })

    // The new pictures: WebP in the set's folder, a Cardmaker shrunk to at most 480 pixels high.
    const kesqer = (await setDoc('kesqer'))?.mascot as string
    expect(kesqer).toMatch(/^sets\/kesqer\/[0-9a-f]{10}\.webp$/)
    const file = admin.storage.bucket().file(kesqer)
    const [metadata] = await file.getMetadata()
    expect(metadata).toMatchObject({
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
      contentDisposition: 'attachment; filename="kesqer-cardmaker.webp"',
    })
    const [bytes] = await file.download()
    expect(await sharp(bytes).metadata()).toMatchObject({ format: 'webp', height: 480 })
    const ulagal = (await setDoc('ulagal'))?.cardback as string
    expect(ulagal).toMatch(/^sets\/ulagal\/[0-9a-f]{10}\.webp$/)
    expect((await admin.storage.bucket().file(ulagal).getMetadata())[0]).toMatchObject({
      contentDisposition: 'attachment; filename="ulagal-cardback.webp"',
    })
    expect(await setDoc('nordhallr')).toMatchObject({
      mascot: expect.stringMatching(/^sets\/nordhallr\//) as string,
    })

    expect(plan.pictures?.without.mascot.map(({ name }) => name)).toContain('Ballad of Ulagal')
    expect(plan.pictures?.without.cardback.map(({ name }) => name)).not.toContain(
      'Kesqerian Nights',
    )
    const pictureRecord = (await records()).find(
      (record) => (record as { added?: unknown[] }).added?.length === 0,
    )
    expect(pictureRecord).toMatchObject({
      step: 'imported',
      added: [],
      pictured: ['Kesqerian Nights', 'Ballad of Ulagal', 'Ragnarök: Nordhallr'],
    })
  })

  it('stores nothing and writes no record when it runs again', async () => {
    const files = await pngs(...FILES)
    await importSets(repositorySets(), { files })
    const before = await storedFiles()

    const { written } = await importSets(repositorySets(), { files })

    expect(written?.pictured).toEqual([])
    expect(written?.recordId).toBeNull()
    expect(await storedFiles()).toEqual(before)
    expect(await records()).toHaveLength(1)
  })

  it('keeps a picture given elsewhere meanwhile, and deletes its own upload', async () => {
    await importSets(repositorySets())
    const real = bucketPictureStore(admin.storage)
    const racing: PictureFileStore = {
      ...real,
      save: async (path, bytes, name) => {
        await real.save(path, bytes, name)
        // The DM saves a cardback while the import uploads its own.
        await admin.db
          .doc(`${SETS_COLLECTION}/kesqer`)
          .update({ cardback: 'sets/kesqer/bbbbbbbbbb.webp' })
      },
    }

    const { written } = await importSets(repositorySets(), {
      files: await pngs('kesqer_cb.png'),
      store: racing,
    })

    expect(written?.changedMeanwhile.map(({ set, field }) => [set.setId, field])).toEqual([
      ['kesqer', 'cardback'],
    ])
    expect(await setDoc('kesqer')).toMatchObject({ cardback: 'sets/kesqer/bbbbbbbbbb.webp' })
    expect(await storedFiles()).toEqual([])
    expect(await records()).toHaveLength(1)
  })
})
