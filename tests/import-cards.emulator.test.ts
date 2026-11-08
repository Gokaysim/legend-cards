import { readFileSync } from 'node:fs'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { type CardDefinition, type Deck, parseCardFile } from '../scripts/lib/cardRows.ts'
import { CARDS_COLLECTION, type ImportPlan, runImport } from '../scripts/lib/importCards.ts'
import { type AdminHandle, DEMO_PROJECT_ID, openAdmin } from '../scripts/lib/target.ts'

// `firebase emulators:exec` sets FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST for this run.
let admin: AdminHandle

beforeAll(() => {
  admin = openAdmin({ kind: 'emulator', projectId: DEMO_PROJECT_ID })
})

afterAll(async () => {
  await admin.close()
})

beforeEach(async () => {
  await admin.db.recursiveDelete(admin.db.collection(CARDS_COLLECTION))
})

/** The cards of a repository data file, parsed and checked as the command does. */
function repositoryDeck(deck: Deck): CardDefinition[] {
  const file = deck === 'legend' ? 'legend-cards.csv' : 'cursed-cards.csv'
  const result = parseCardFile(
    readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8'),
    deck,
  )
  expect(result.errors).toEqual([])
  return result.cards.map(({ card }) => card)
}

const importDecks = (decks: Partial<Record<Deck, CardDefinition[]>>, dryRun = false) =>
  runImport(admin.db, decks, { dryRun })

const counts = (plan: ImportPlan) =>
  Object.fromEntries(plan.map((deck) => [deck.deck, deck.counts]))

const card = async (id: string) => (await admin.db.doc(`${CARDS_COLLECTION}/${id}`).get()).data()

async function storedCount(where?: { field: string; value: unknown }) {
  const collection = admin.db.collection(CARDS_COLLECTION)
  const query = where ? collection.where(where.field, '==', where.value) : collection
  return (await query.count().get()).data().count
}

describe('card import against the emulators', () => {
  it('imports the repository data: 571 normal, 19 Blessed and 154 Cursed cards', async () => {
    const { plan, written } = await importDecks({
      legend: repositoryDeck('legend'),
      cursed: repositoryDeck('cursed'),
    })

    expect(written).toBe(744)
    expect(plan.map((deck) => [deck.deck, deck.counts.added])).toEqual([
      ['legend', 590],
      ['cursed', 154],
    ])
    expect(await storedCount({ field: 'kind', value: 'normal' })).toBe(571)
    expect(await storedCount({ field: 'kind', value: 'blessed' })).toBe(19)
    expect(await storedCount({ field: 'kind', value: 'cursed' })).toBe(154)
    expect(await storedCount({ field: 'retired', value: false })).toBe(744)
  })

  it('stores Blessed and Cursed cards in the shapes of the spec', async () => {
    const legend = repositoryDeck('legend')
    const cursed = repositoryDeck('cursed')
    await importDecks({ legend, cursed })

    const blessed = legend.find((entry) => entry.kind === 'blessed')
    expect(blessed).toBeDefined()
    expect(await card(`legend-${blessed?.nameKey}`)).toEqual({
      ...blessed,
      setCode: null,
      rarity: null,
      cost: null,
      retired: false,
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
      retired: false,
    })
  })

  it('writes nothing when the same files are imported again', async () => {
    const decks = { legend: repositoryDeck('legend'), cursed: repositoryDeck('cursed') }
    await importDecks(decks)

    const { plan, written } = await importDecks(decks)

    expect(written).toBe(0)
    expect(counts(plan)).toEqual({
      legend: { added: 0, updated: 0, unchanged: 590, retired: 0, restored: 0 },
      cursed: { added: 0, updated: 0, unchanged: 154, retired: 0, restored: 0 },
    })
  })

  it('updates a changed text under the same ID', async () => {
    const cursed = repositoryDeck('cursed')
    await importDecks({ cursed })

    const changed = cursed.map((entry) =>
      entry.nameKey === 'visionsofdeath' ? { ...entry, text: 'A new curse.' } : entry,
    )
    const { plan, written } = await importDecks({ cursed: changed })

    expect(written).toBe(1)
    expect(plan[0]?.counts.updated).toBe(1)
    expect(await card('cursed-visionsofdeath')).toMatchObject({
      text: 'A new curse.',
      retired: false,
    })
  })

  it('retires a removed row without deleting it, and restores it when it comes back', async () => {
    const cursed = repositoryDeck('cursed')
    await importDecks({ cursed })

    const without = cursed.filter((entry) => entry.nameKey !== 'visionsofdeath')
    const removed = await importDecks({ cursed: without })
    expect(removed.plan[0]?.counts.retired).toBe(1)
    expect(await card('cursed-visionsofdeath')).toMatchObject({
      name: 'Visions of Death',
      retired: true,
    })
    expect(await storedCount()).toBe(154)

    const restored = await importDecks({ cursed })
    expect(restored.plan[0]?.counts.restored).toBe(1)
    expect(await card('cursed-visionsofdeath')).toMatchObject({ retired: false })
  })

  it('imports only the Cursed deck when only that file is given', async () => {
    await importDecks({ legend: repositoryDeck('legend'), cursed: repositoryDeck('cursed') })

    const { plan } = await importDecks({ cursed: [] })

    expect(plan.map((deck) => deck.deck)).toEqual(['cursed'])
    const retired = await admin.db.collection(CARDS_COLLECTION).where('retired', '==', true).get()
    expect(retired.size).toBe(154)
    expect(retired.docs.every((document) => document.id.startsWith('cursed-'))).toBe(true)
    expect(await storedCount({ field: 'kind', value: 'normal' })).toBe(571)
  })

  it('writes nothing on a dry run, but reports the same plan', async () => {
    const decks = { legend: repositoryDeck('legend'), cursed: repositoryDeck('cursed') }

    const { plan, written } = await importDecks(decks, true)

    expect(written).toBe(0)
    expect(plan.map((deck) => deck.counts.added)).toEqual([590, 154])
    expect(await storedCount()).toBe(0)
  })

  it('keeps a stored holder through a re-import', async () => {
    const cursed = repositoryDeck('cursed')
    await importDecks({ cursed })
    const holder = { uid: 'player-1', userCardId: 'hold-1' }
    await admin.db.doc(`${CARDS_COLLECTION}/cursed-visionsofdeath`).update({ holder })

    const changed = cursed.map((entry) =>
      entry.nameKey === 'visionsofdeath' ? { ...entry, text: 'Changed.' } : entry,
    )
    await importDecks({ cursed: changed })

    expect(await card('cursed-visionsofdeath')).toMatchObject({ text: 'Changed.', holder })
  })
})
