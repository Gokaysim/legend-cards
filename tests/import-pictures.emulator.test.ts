import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { readAliases } from '../scripts/lib/artFiles.ts'
import type { SourceFile } from '../scripts/lib/artWrite.ts'
import { CHANGES_COLLECTION } from '../scripts/lib/importCards.ts'
import {
  artDataOf,
  bucketPictureStore,
  type PictureFileStore,
  readPictureDefinitions,
  runPictureImport,
} from '../scripts/lib/importPictures.ts'
import {
  type AdminHandle,
  defaultBucket,
  DEMO_PROJECT_ID,
  openAdmin,
} from '../scripts/lib/target.ts'

// The picture import against the emulators (spec: admin-scripts, "Picture import", "The picture import only adds",
// "Picture import records"). `firebase emulators:exec` sets the emulator variables for this run.
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

const DM_PICTURE = 'cards/legend-mirror/aaaaaaaaaa.webp'

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'import-pictures-'))
  for (const name of ['cards', 'trueWords', CHANGES_COLLECTION]) {
    await admin.db.recursiveDelete(admin.db.collection(name))
  }
  const [stored] = await admin.storage.bucket().getFiles()
  await Promise.all(stored.map((file) => file.delete()))

  const card = (id: string, name: string, extra: Record<string, unknown> = {}) =>
    admin.db.doc(`cards/${id}`).set({
      kind: id.startsWith('cursed-') ? 'cursed' : 'normal',
      name,
      nameKey: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      status: 'active',
      ...extra,
    })
  // Renamed by the DM after its import: its ID still says Aboleth's Eyes.
  await card('legend-abolethseyes', 'Eyes of the Aboleth')
  await card('legend-mirror', 'Mirror', { picture: DM_PICTURE })
  await card('legend-twilightveil', 'Twilight Veil', { status: 'retired', picture: null })
  await card('legend-bardsencore', "Bard's Encore", { status: 'draft' })
  await card('legend-oldcard', 'Old Card', { status: 'retired' })
  await card('cursed-hex', 'Hex')
  await admin.db
    .doc('trueWords/tw-abyss')
    .set({ name: 'Abyss', nameKey: 'abyss', status: 'active' })
})

afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
})

/** Small PNG files, one color each, in the test's folder. */
async function pngs(...names: string[]): Promise<SourceFile[]> {
  return Promise.all(
    names.map(async (name, index) => {
      const path = join(folder, name)
      await sharp({
        create: {
          width: 20,
          height: 28,
          channels: 4,
          background: { r: index * 20, g: 80, b: 160, alpha: 1 },
        },
      })
        .png()
        .toFile(path)
      return { name, path }
    }),
  )
}

const FILES = [
  'abolethseyes.png',
  'mirror.png',
  'twilightveil.png',
  'bardsencore.png',
  'oldcard.png',
  'cursed_hex.png',
  'twabyss.png',
  'kesqer_cb.png',
  'zamansgolfc.png',
]

async function importPictures(
  files: SourceFile[],
  { dryRun = false, store = bucketPictureStore(admin.storage) } = {},
) {
  const definitions = await readPictureDefinitions(admin.db)
  const aliases = readAliases('File,Kind,Name\n', artDataOf(definitions), 'definitions')
  expect(aliases.errors).toEqual([])
  return runPictureImport(admin.db, store, files, aliases.aliases, definitions, { dryRun })
}

const pictureOf = async (path: string): Promise<unknown> =>
  (await admin.db.doc(path).get()).get('picture')
const fileExists = async (path: string) => (await admin.storage.bucket().file(path).exists())[0]
const storedFiles = async () =>
  (await admin.storage.bucket().getFiles())[0].map((file) => file.name).sort()
/** A picture import's record, as the import writes it. */
type PictureRecord = {
  target: string
  public: boolean
  what: string
  step: string
  by: null
  items: { id: string; name: string; status: string; dmOnly: boolean }[]
}
const records = async () =>
  (await admin.db.collection(CHANGES_COLLECTION).get()).docs.map(
    (doc) => doc.data() as PictureRecord,
  )

describe('import-pictures', () => {
  it('gives a picture only to the definitions that never had one, and leaves the others alone', async () => {
    const { plan, written } = await importPictures(await pngs(...FILES))

    expect(written?.added.map(({ id }) => id).sort()).toEqual([
      'cursed-hex',
      'legend-abolethseyes',
      'legend-bardsencore',
      'legend-oldcard',
      'tw-abyss',
    ])
    const outcomes = Object.fromEntries(plan.pictures.map((p) => [p.definition.id, p.outcome]))
    expect(outcomes).toMatchObject({ 'legend-mirror': 'has', 'legend-twilightveil': 'removed' })
    expect(plan.art.unknown.map(({ name }) => name)).toEqual(['zamansgolfc.png'])
    expect(plan.art.skipped.map(({ name }) => name)).toEqual(['kesqer_cb.png'])

    // The renamed card is found by its ID, and its picture is stored under it.
    const eyes = (await pictureOf('cards/legend-abolethseyes')) as string
    expect(eyes).toMatch(/^cards\/legend-abolethseyes\/[0-9a-f]{10}\.webp$/)
    expect(await fileExists(eyes)).toBe(true)
    const [metadata] = await admin.storage.bucket().file(eyes).getMetadata()
    expect(metadata).toMatchObject({
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
      contentDisposition: 'attachment; filename="legend-abolethseyes.webp"',
    })
    expect(await pictureOf('trueWords/tw-abyss')).toMatch(/^words\/tw-abyss\/[0-9a-f]{10}\.webp$/)

    // The DM's picture and the DM's removal stay.
    expect(await pictureOf('cards/legend-mirror')).toBe(DM_PICTURE)
    expect(await pictureOf('cards/legend-twilightveil')).toBeNull()
    expect(plan.withoutPicture.map(({ name }) => name)).toEqual(['Twilight Veil'])
  })

  it('writes one public and one DM-only record per kind of definition', async () => {
    await importPictures(await pngs(...FILES))

    const byKind = (await records()).map(({ target, public: isPublic, what, step, by, items }) => ({
      target,
      isPublic,
      what,
      step,
      by,
      ids: items.map(({ id }) => id).sort(),
    }))
    expect(byKind).toHaveLength(3)
    expect(byKind).toEqual(
      expect.arrayContaining([
        {
          target: 'card',
          isPublic: true,
          what: 'pictures',
          step: 'imported',
          by: null,
          ids: ['cursed-hex', 'legend-abolethseyes', 'legend-oldcard'],
        },
        {
          target: 'card',
          isPublic: false,
          what: 'pictures',
          step: 'imported',
          by: null,
          ids: ['legend-bardsencore'],
        },
        {
          target: 'word',
          isPublic: true,
          what: 'pictures',
          step: 'imported',
          by: null,
          ids: ['tw-abyss'],
        },
      ]),
    )
  })

  it('names a DM-only card in a DM-only record of its own, never in the public one', async () => {
    await admin.db.doc('cards/legend-thelastwish').set({
      kind: 'normal',
      name: 'The Last Wish',
      nameKey: 'thelastwish',
      status: 'active',
      dmOnly: true,
    })
    await importPictures(await pngs(...FILES, 'thelastwish.png'))

    expect(await pictureOf('cards/legend-thelastwish')).toMatch(
      /^cards\/legend-thelastwish\/[0-9a-f]{10}\.webp$/,
    )
    const cardRecords = (await records()).filter(({ target }) => target === 'card')
    const publicIds = cardRecords
      .filter((record) => record.public)
      .flatMap(({ items }) => items.map(({ id }) => id))
    expect(publicIds).not.toContain('legend-thelastwish')
    expect(cardRecords).toContainEqual(
      expect.objectContaining({
        public: false,
        items: [
          { id: 'legend-thelastwish', name: 'The Last Wish', status: 'active', dmOnly: true },
        ],
      }),
    )
  })

  it('adds nothing and writes no record when it runs again', async () => {
    const files = await pngs(...FILES)
    await importPictures(files)
    const before = await storedFiles()
    const recordCount = (await records()).length

    const { plan, written } = await importPictures(files)

    expect(written?.added).toEqual([])
    expect(plan.pictures.filter(({ outcome }) => outcome === 'add')).toEqual([])
    expect(await storedFiles()).toEqual(before)
    expect(await records()).toHaveLength(recordCount)
  })

  it('completes a run that stopped halfway', async () => {
    const files = await pngs(
      'abolethseyes.png',
      'oldcard.png',
      'cursed_hex.png',
      'twabyss.png',
      'bardsencore.png',
    )
    const real = bucketPictureStore(admin.storage)
    let saves = 0
    const failing: PictureFileStore = {
      ...real,
      save: (path, bytes, name) =>
        ++saves > 2 ? Promise.reject(new Error('Bağlantı koptu')) : real.save(path, bytes, name),
    }

    await expect(importPictures(files, { store: failing })).rejects.toThrow('Bağlantı koptu')
    const firstRun = (await records()).flatMap(({ items }) => items)
    expect(firstRun).toHaveLength(2)

    const { written } = await importPictures(files)

    expect(written?.added).toHaveLength(3)
    for (const id of [
      'legend-abolethseyes',
      'legend-oldcard',
      'cursed-hex',
      'legend-bardsencore',
    ]) {
      expect(await pictureOf(`cards/${id}`)).toMatch(/\.webp$/)
    }
    expect(await pictureOf('trueWords/tw-abyss')).toMatch(/\.webp$/)
  })

  it('keeps a picture given elsewhere meanwhile, and deletes its own upload', async () => {
    const files = await pngs('abolethseyes.png')
    const real = bucketPictureStore(admin.storage)
    const racing: PictureFileStore = {
      ...real,
      save: async (path, bytes, name) => {
        await real.save(path, bytes, name)
        // The DM saves a picture while the import uploads its own.
        await admin.db
          .doc('cards/legend-abolethseyes')
          .update({ picture: 'cards/legend-abolethseyes/bbbbbbbbbb.webp' })
      },
    }

    const { written } = await importPictures(files, { store: racing })

    expect(written?.changedMeanwhile.map(({ id }) => id)).toEqual(['legend-abolethseyes'])
    expect(await pictureOf('cards/legend-abolethseyes')).toBe(
      'cards/legend-abolethseyes/bbbbbbbbbb.webp',
    )
    expect(await storedFiles()).toEqual([])
    expect(await records()).toEqual([])
  })

  it('stores and writes nothing in a dry run', async () => {
    const { plan, written } = await importPictures(await pngs(...FILES), { dryRun: true })

    expect(written).toBeNull()
    expect(plan.pictures.filter(({ outcome }) => outcome === 'add')).toHaveLength(5)
    expect(await storedFiles()).toEqual([])
    expect(await records()).toEqual([])
    expect((await admin.db.doc('cards/legend-abolethseyes').get()).data()).not.toHaveProperty(
      'picture',
    )
  })
})
