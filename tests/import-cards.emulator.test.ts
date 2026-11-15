import { readFileSync } from 'node:fs'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { startingFlags } from '../scripts/lib/cardCatalog.ts'
import { type Deck, parseCardFile, unknownSetWarnings } from '../scripts/lib/cardRows.ts'
import {
  CARDS_COLLECTION,
  CHANGES_COLLECTION,
  type CardRow,
  type ImportPlan,
  runImport,
} from '../scripts/lib/importCards.ts'
import {
  readSetSpellings,
  readStoredSets,
  runSetImport,
  SET_CHANGES_COLLECTION,
  SETS_COLLECTION,
} from '../scripts/lib/importSets.ts'
import { parseSetFile } from '../scripts/lib/setRows.ts'
import type { PictureFileStore } from '../scripts/lib/importPictures.ts'
import {
  type AdminHandle,
  defaultBucket,
  DEMO_PROJECT_ID,
  openAdmin,
} from '../scripts/lib/target.ts'

// `firebase emulators:exec` sets FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST for this run.
let admin: AdminHandle

beforeAll(() => {
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
  for (const name of [
    CARDS_COLLECTION,
    CHANGES_COLLECTION,
    SETS_COLLECTION,
    SET_CHANGES_COLLECTION,
  ]) {
    await admin.db.recursiveDelete(admin.db.collection(name))
  }
})

/** The rows of a repository data file, parsed and checked as the command does. */
function repositoryDeck(deck: Deck): CardRow[] {
  const file = deck === 'legend' ? 'legend-cards.csv' : 'cursed-cards.csv'
  const result = parseCardFile(
    readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8'),
    deck,
  )
  expect(result.errors).toEqual([])
  return result.cards
}

/** Stores the repository's sets, as `npm run import-sets` does without pictures. */
async function importRepositorySets() {
  const parsed = parseSetFile(readFileSync(new URL('../data/sets.csv', import.meta.url), 'utf8'))
  expect(parsed.errors).toEqual([])
  const noFiles: PictureFileStore = {
    save: () => Promise.reject(new Error('No picture is stored without --source')),
    remove: () => Promise.resolve(),
  }
  await runSetImport(admin.db, noFiles, parsed.sets, await readStoredSets(admin.db), null)
}

const importDecks = (decks: Partial<Record<Deck, CardRow[]>>, dryRun = false) =>
  runImport(admin.db, decks, { dryRun })

const counts = (plan: ImportPlan) =>
  Object.fromEntries(plan.map((deck) => [deck.deck, deck.counts]))

const card = async (id: string) => (await admin.db.doc(`${CARDS_COLLECTION}/${id}`).get()).data()

async function storedCount(where?: { field: string; value: unknown }) {
  const collection = admin.db.collection(CARDS_COLLECTION)
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

describe('card import against the emulators', () => {
  it('imports the repository data: 572 normal (3 of them drafts), 19 Blessed and 154 Cursed cards', async () => {
    const { plan, written } = await importDecks({
      legend: repositoryDeck('legend'),
      cursed: repositoryDeck('cursed'),
    })

    expect(written).toBe(745)
    expect(counts(plan)).toEqual({
      legend: { 'added-active': 588, 'added-draft': 3, existing: 0 },
      cursed: { 'added-active': 154, 'added-draft': 0, existing: 0 },
    })
    expect(await storedCount({ field: 'kind', value: 'normal' })).toBe(572)
    expect(await storedCount({ field: 'kind', value: 'blessed' })).toBe(19)
    expect(await storedCount({ field: 'kind', value: 'cursed' })).toBe(154)
    expect(await storedCount({ field: 'status', value: 'active' })).toBe(742)
    const drafts = await admin.db.collection(CARDS_COLLECTION).where('status', '==', 'draft').get()
    expect(drafts.docs.map((document) => document.get('name') as string).sort()).toEqual([
      "Hrolf's Hornswaggle",
      'The Cartographer',
      'The Grand Finale',
    ])
  })

  it('records the import: one public record of the active cards, one DM-only record of the drafts', async () => {
    await importDecks({ legend: repositoryDeck('legend'), cursed: repositoryDeck('cursed') })

    const written = await records()
    expect(written).toHaveLength(2)
    const publicRecord = written.find((record) => record.public === true)
    const draftRecord = written.find((record) => record.public === false)
    expect(publicRecord).toMatchObject({ target: 'card', step: 'imported', by: null })
    expect(publicRecord?.items).toHaveLength(742)
    expect(draftRecord?.items).toHaveLength(3)
    expect(draftRecord?.items).toContainEqual({
      id: 'legend-thecartographer',
      name: 'The Cartographer',
      status: 'draft',
      isInLibrary: true,
    })
    expect(await card('legend-thecartographer')).toMatchObject({ changeId: draftRecord?.id })
    expect(await card('cursed-visionsofdeath')).toMatchObject({ changeId: publicRecord?.id })
  })

  it('stores Blessed, Cursed and draft cards in the shapes of the spec', async () => {
    const legend = repositoryDeck('legend')
    await importDecks({ legend, cursed: repositoryDeck('cursed') })

    const blessed = legend.find(({ card: entry }) => entry.kind === 'blessed')?.card
    expect(blessed).toBeDefined()
    expect(await card(`legend-${blessed?.nameKey}`)).toEqual({
      ...blessed,
      setCode: null,
      rarity: null,
      cost: null,
      status: 'active',
      changeId: expect.any(String) as string,
      ...startingFlags('blessed', blessed?.text ?? ''),
      isRepeatable: true,
    })
    expect(await card('cursed-visionsofdeath')).toEqual({
      kind: 'cursed',
      name: 'Visions of Death',
      nameKey: 'visionsofdeath',
      setCode: null,
      cost: '1',
      rarity: null,
      mechanicPack: null,
      text: 'Held: Every hour draw a cursed card. Discard them at the end of the session.',
      status: 'active',
      changeId: expect.any(String) as string,
      // A Cursed card: repeatable, in no pack, and a "Held:" text acts while held.
      isInLibrary: true,
      isInDraws: true,
      isInSetPacks: false,
      isInMechanicPacks: false,
      isRepeatable: true,
      hasHeldEffect: true,
      hasUseEffect: true,
      isKeptOnUse: false,
    })
    expect(await card('legend-thecartographer')).toMatchObject({
      kind: 'normal',
      setCode: null,
      rarity: null,
      mechanicPack: null,
      cost: '1',
      status: 'draft',
      isRepeatable: false,
      isKeptOnUse: false,
    })
    // A normal card whose text starts with "Held:" acts while held, and has one copy.
    expect(await card('legend-aesnasassist')).toMatchObject({
      isInLibrary: true,
      isInDraws: true,
      isInSetPacks: true,
      isInMechanicPacks: true,
      isRepeatable: false,
      hasHeldEffect: true,
      hasUseEffect: true,
      isKeptOnUse: false,
    })
  })

  it('writes no card and no record when the same files are imported again', async () => {
    const decks = { legend: repositoryDeck('legend'), cursed: repositoryDeck('cursed') }
    await importDecks(decks)

    const { plan, written } = await importDecks(decks)

    expect(written).toBe(0)
    expect(counts(plan)).toEqual({
      legend: { 'added-active': 0, 'added-draft': 0, existing: 591 },
      cursed: { 'added-active': 0, 'added-draft': 0, existing: 154 },
    })
    expect(await records()).toHaveLength(2)
  })

  it('leaves a stored card as it is when the file changes its text', async () => {
    const cursed = repositoryDeck('cursed')
    await importDecks({ cursed })

    const changed = cursed.map((entry) =>
      entry.card.nameKey === 'visionsofdeath'
        ? { ...entry, card: { ...entry.card, text: 'A new curse.' } }
        : entry,
    )
    const { written } = await importDecks({ cursed: changed })

    expect(written).toBe(0)
    expect(await card('cursed-visionsofdeath')).toMatchObject({
      text: 'Held: Every hour draw a cursed card. Discard them at the end of the session.',
    })
  })

  it('leaves a card as it is when its row is removed from the file', async () => {
    const cursed = repositoryDeck('cursed')
    await importDecks({ cursed })

    const without = cursed.filter(({ card: entry }) => entry.nameKey !== 'visionsofdeath')
    await importDecks({ cursed: without })

    expect(await card('cursed-visionsofdeath')).toMatchObject({ status: 'active' })
    expect(await storedCount()).toBe(154)
  })

  it('leaves a DM-only card DM-only, and never writes the flag on a card it adds', async () => {
    const cursed = repositoryDeck('cursed')
    await importDecks({ cursed })
    expect(await card('cursed-visionsofdeath')).not.toHaveProperty('dmOnly')
    await admin.db.doc(`${CARDS_COLLECTION}/cursed-visionsofdeath`).update({ dmOnly: true })

    const { written } = await importDecks({ cursed })

    expect(written).toBe(0)
    expect(await card('cursed-visionsofdeath')).toMatchObject({ dmOnly: true, status: 'active' })
  })

  it('does not add a card again that the DM renamed', async () => {
    const cursed = repositoryDeck('cursed')
    await importDecks({ cursed })
    await admin.db
      .doc(`${CARDS_COLLECTION}/cursed-visionsofdeath`)
      .update({ name: 'Visions of the End', nameKey: 'visionsoftheend' })

    const { written } = await importDecks({ cursed })

    expect(written).toBe(0)
    expect(await storedCount()).toBe(154)
  })

  it('gives cards stored before statuses a status, from their old retired flag', async () => {
    const legacy = (name: string, retired: boolean) => ({
      kind: 'cursed',
      name,
      nameKey: name.toLowerCase(),
      setCode: null,
      cost: '1',
      rarity: null,
      mechanicPack: null,
      text: 'Bad.',
      retired,
    })
    await admin.db.doc(`${CARDS_COLLECTION}/cursed-hex`).set(legacy('Hex', false))
    await admin.db.doc(`${CARDS_COLLECTION}/cursed-jinx`).set(legacy('Jinx', true))

    const dry = await importDecks({ cursed: [] }, true)
    expect(dry.plan[0]?.upgrades).toHaveLength(2)
    expect(await card('cursed-hex')).toMatchObject({ retired: false })

    const { plan, written } = await importDecks({ cursed: [] })

    expect(plan[0]?.upgrades).toEqual([
      { id: 'cursed-hex', status: 'active' },
      { id: 'cursed-jinx', status: 'retired' },
    ])
    expect(written).toBe(2)
    expect(await card('cursed-hex')).toEqual({
      ...legacy('Hex', false),
      retired: undefined,
      status: 'active',
    })
    expect(await card('cursed-jinx')).not.toHaveProperty('retired')
    expect(await card('cursed-jinx')).toMatchObject({ status: 'retired' })
    expect(await records()).toEqual([])

    const again = await importDecks({ cursed: [] })
    expect(again.plan[0]?.upgrades).toEqual([])
  })

  it('imports only the Cursed deck when only that file is given', async () => {
    await importDecks({ cursed: repositoryDeck('cursed') })

    const { plan } = await importDecks({ cursed: repositoryDeck('cursed') })

    expect(plan.map((deck) => deck.deck)).toEqual(['cursed'])
    expect(await storedCount({ field: 'kind', value: 'normal' })).toBe(0)
  })

  it("warns about no set code of the repository's cards after the set import", async () => {
    await importRepositorySets()
    const spellings = await readSetSpellings(admin.db)

    expect(unknownSetWarnings(repositoryDeck('legend'), spellings)).toEqual([])
  })

  it('warns about a set code no stored set has, and about every one before the set import', async () => {
    const legend = repositoryDeck('legend')
    expect(unknownSetWarnings(legend, await readSetSpellings(admin.db))).toHaveLength(12)

    await importRepositorySets()
    const [first] = legend
    if (!first) throw new Error('The repository has Legend cards')
    const withNewSet = [
      ...legend,
      { ...first, card: { ...first.card, name: 'New', nameKey: 'new', setCode: 'Zaddir' } },
    ]
    expect(unknownSetWarnings(withNewSet, await readSetSpellings(admin.db))).toEqual([
      { kind: 'unknown-set', setCode: 'Zaddir', count: 1 },
    ])
  })

  it('writes nothing on a dry run, but reports the same plan', async () => {
    const decks = { legend: repositoryDeck('legend'), cursed: repositoryDeck('cursed') }

    const { plan, written } = await importDecks(decks, true)

    expect(written).toBe(0)
    expect(plan.map((deck) => deck.counts['added-active'])).toEqual([588, 154])
    expect(await storedCount()).toBe(0)
    expect(await records()).toEqual([])
  })
})
