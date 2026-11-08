import type { Firestore } from 'firebase-admin/firestore'

import type { CardDefinition, Deck } from './cardRows.ts'

/** The card collection. Keep in step with `src/features/cards/api.ts` and `firestore.rules`. */
export const CARDS_COLLECTION = 'cards'

/** Firestore allows at most 500 writes in one batch. */
export const BATCH_SIZE = 500

/** The fields an import owns. Any other stored field, such as a later `holder`, is never compared or written. */
const DEFINITION_FIELDS = [
  'kind',
  'name',
  'nameKey',
  'setCode',
  'cost',
  'rarity',
  'mechanicPack',
  'text',
] as const satisfies readonly (keyof CardDefinition)[]

/** A stored card as read from Firestore, unvalidated: the import must cope with anything stored there. */
export type StoredCard = { id: string; data: Record<string, unknown> }

export type CardOutcome = 'added' | 'updated' | 'unchanged' | 'retired' | 'restored'
export const OUTCOMES: readonly CardOutcome[] = [
  'added',
  'updated',
  'unchanged',
  'retired',
  'restored',
]

/** What a write sets, merged into the stored document. */
export type CardWrite = (CardDefinition & { retired: false }) | { retired: true }

export type PlannedCard = {
  id: string
  name: string
  outcome: CardOutcome
  /** `null` when nothing is written. */
  write: CardWrite | null
}

export type DeckPlan = {
  deck: Deck
  cards: PlannedCard[]
  counts: Record<CardOutcome, number>
}

/** One plan per imported deck. A deck that is not imported has no plan and is never touched. */
export type ImportPlan = DeckPlan[]

/** The document ID of a card: its deck plus its normalized name (design D2). */
export function cardId(deck: Deck, nameKey: string): string {
  return `${deck}-${nameKey}`
}

const deckOfId = (id: string): Deck | null =>
  id.startsWith('legend-') ? 'legend' : id.startsWith('cursed-') ? 'cursed' : null

const storedName = (card: StoredCard) =>
  typeof card.data.name === 'string' ? card.data.name : card.id

function sameDefinition(stored: Record<string, unknown>, card: CardDefinition): boolean {
  return DEFINITION_FIELDS.every((field) => stored[field] === card[field])
}

function planDeck(deck: Deck, rows: readonly CardDefinition[], existing: readonly StoredCard[]) {
  const storedById = new Map(
    existing.filter((card) => deckOfId(card.id) === deck).map((card) => [card.id, card]),
  )
  const cards: PlannedCard[] = []

  for (const row of rows) {
    const id = cardId(deck, row.nameKey)
    const stored = storedById.get(id)
    storedById.delete(id)
    const write: CardWrite = { ...row, retired: false }
    if (!stored) {
      cards.push({ id, name: row.name, outcome: 'added', write })
    } else if (stored.data.retired === true) {
      cards.push({ id, name: row.name, outcome: 'restored', write })
    } else if (stored.data.retired !== false || !sameDefinition(stored.data, row)) {
      cards.push({ id, name: row.name, outcome: 'updated', write })
    } else {
      cards.push({ id, name: row.name, outcome: 'unchanged', write: null })
    }
  }

  // Stored cards of this deck that the file no longer has. Already retired ones stay as they are.
  const missing = [...storedById.values()]
    .filter((card) => card.data.retired !== true)
    .sort((a, b) => a.id.localeCompare(b.id))
  for (const card of missing) {
    cards.push({
      id: card.id,
      name: storedName(card),
      outcome: 'retired',
      write: { retired: true },
    })
  }

  const counts = Object.fromEntries(OUTCOMES.map((outcome) => [outcome, 0])) as Record<
    CardOutcome,
    number
  >
  for (const card of cards) counts[card.outcome] += 1
  return { deck, cards, counts }
}

/**
 * Decides what an import does to each card (spec: admin-scripts, "Re-importing updates cards by name",
 * "Cards missing from their file are retired"). Pure: the caller reads the stored cards and applies the plan.
 */
export function planImport(
  existing: readonly StoredCard[],
  decks: Partial<Record<Deck, readonly CardDefinition[]>>,
): ImportPlan {
  return (['legend', 'cursed'] as const).flatMap((deck) => {
    const rows = decks[deck]
    return rows ? [planDeck(deck, rows, existing)] : []
  })
}

/** Every stored card, as raw data. */
export async function readCards(db: Firestore): Promise<StoredCard[]> {
  const snapshot = await db.collection(CARDS_COLLECTION).get()
  return snapshot.docs.map((document) => ({ id: document.id, data: document.data() }))
}

export type ImportResult = { plan: ImportPlan; written: number }

/**
 * Runs an import of already validated decks: reads the stored cards, plans, and writes the plan unless this
 * is a dry run. A deck left out of `decks` is not touched.
 */
export async function runImport(
  db: Firestore,
  decks: Partial<Record<Deck, readonly CardDefinition[]>>,
  { dryRun }: { dryRun: boolean },
): Promise<ImportResult> {
  const plan = planImport(await readCards(db), decks)
  const written = dryRun ? 0 : await applyPlan(db, plan)
  return { plan, written }
}

/**
 * Writes the plan in batches of up to 500. Each write is a merge, so fields the import does not own survive.
 * Batches are not atomic as a whole: if one fails, running the same import again completes the work.
 * Returns the number of documents written.
 */
export async function applyPlan(db: Firestore, plan: ImportPlan): Promise<number> {
  const writes = plan.flatMap((deck) =>
    deck.cards.flatMap((card) => (card.write ? [{ id: card.id, write: card.write }] : [])),
  )
  for (let start = 0; start < writes.length; start += BATCH_SIZE) {
    const batch = db.batch()
    for (const { id, write } of writes.slice(start, start + BATCH_SIZE)) {
      batch.set(db.collection(CARDS_COLLECTION).doc(id), write, { merge: true })
    }
    await batch.commit()
  }
  return writes.length
}
