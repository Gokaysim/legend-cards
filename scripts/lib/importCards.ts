import { FieldValue, type Firestore, type WriteBatch } from 'firebase-admin/firestore'

import { startingFlags } from './cardCatalog.ts'
import type { CardColumn, CardDefinition, Deck, ParsedCard } from './cardRows.ts'

/** The card collection. Keep in step with `src/features/cards/api.ts` and `firestore.rules`. */
export const CARDS_COLLECTION = 'cards'

/** The definition change records. Keep in step with `src/features/definitions/api.ts` and `firestore.rules`. */
export const CHANGES_COLLECTION = 'definitionChanges'

/** Firestore allows at most 500 writes in one batch. */
export const BATCH_SIZE = 500

/** A definition's status. Keep in step with `src/features/definitions/status.ts`. */
export type DefinitionStatus = 'draft' | 'active' | 'retired'

/** A stored document as read from Firestore, unvalidated: the import must cope with anything stored there. */
export type StoredDefinition = { id: string; data: Record<string, unknown> }
export type StoredCard = StoredDefinition

/**
 * What an import does with a row (spec: admin-scripts, "The card import only adds"): it adds the definition as
 * active, adds it as a draft because a value is missing, or leaves the stored one alone.
 */
export type CardOutcome = 'added-active' | 'added-draft' | 'existing'
export const OUTCOMES: readonly CardOutcome[] = ['added-active', 'added-draft', 'existing']

/** A row the import reads: a definition and the columns its kind uses that the row leaves empty. */
export type CardRow = Pick<ParsedCard, 'card' | 'missing'>

export type PlannedCard = {
  id: string
  name: string
  outcome: CardOutcome
  /** The empty columns that make an added card a draft. */
  missing: readonly CardColumn[]
  /** The definition to add; `null` for a card already stored. */
  definition: CardDefinition | null
}

/** A stored definition from before statuses, and the status it gets (spec: admin-scripts, "Imports give stored
 * definitions a status"). */
export type Upgrade = { id: string; status: 'active' | 'retired' }

export type DeckPlan = {
  deck: Deck
  cards: PlannedCard[]
  counts: Record<CardOutcome, number>
  upgrades: Upgrade[]
}

/** One plan per imported deck. A deck that is not imported has no plan and is never touched. */
export type ImportPlan = DeckPlan[]

/** The document ID of a card: its deck plus its normalized name (design D2). */
export function cardId(deck: Deck, nameKey: string): string {
  return `${deck}-${nameKey}`
}

const deckOfId = (id: string): Deck | null =>
  id.startsWith('legend-') ? 'legend' : id.startsWith('cursed-') ? 'cursed' : null

/** The status a stored definition without one gets: retired when it was marked retired, active otherwise. */
export function upgradeOf(stored: StoredDefinition): Upgrade | null {
  if (typeof stored.data.status === 'string') return null
  return { id: stored.id, status: stored.data.retired === true ? 'retired' : 'active' }
}

/** Counts each outcome, with every outcome present. */
export function countOutcomes(
  items: readonly { outcome: CardOutcome }[],
): Record<CardOutcome, number> {
  const counts = Object.fromEntries(OUTCOMES.map((outcome) => [outcome, 0])) as Record<
    CardOutcome,
    number
  >
  for (const item of items) counts[item.outcome] += 1
  return counts
}

function planDeck(deck: Deck, rows: readonly CardRow[], existing: readonly StoredCard[]): DeckPlan {
  const stored = existing.filter((card) => deckOfId(card.id) === deck)
  // A row is stored already when its deck has a card with the ID its name gives, or with the same name: a renamed
  // card keeps its first ID, and a card the DM added may have a suffixed one.
  const ids = new Set(stored.map((card) => card.id))
  const nameKeys = new Set(
    stored.flatMap((card) => (typeof card.data.nameKey === 'string' ? [card.data.nameKey] : [])),
  )

  const cards = rows.map(({ card, missing }): PlannedCard => {
    const id = cardId(deck, card.nameKey)
    if (ids.has(id) || nameKeys.has(card.nameKey)) {
      return { id, name: card.name, outcome: 'existing', missing: [], definition: null }
    }
    const outcome = missing.length === 0 ? 'added-active' : 'added-draft'
    return { id, name: card.name, outcome, missing, definition: card }
  })
  const upgrades = stored
    .flatMap((card) => upgradeOf(card) ?? [])
    .sort((a, b) => a.id.localeCompare(b.id))
  return { deck, cards, counts: countOutcomes(cards), upgrades }
}

/**
 * Decides what an import does (spec: admin-scripts, "The card import only adds", "Imported definitions are active
 * unless a value is missing", "Imports give stored definitions a status"). Pure: the caller reads the stored cards and
 * applies the plan.
 */
export function planImport(
  existing: readonly StoredCard[],
  decks: Partial<Record<Deck, readonly CardRow[]>>,
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

/** One addition, as the import writes it and its record lists it. */
export type Addition = {
  id: string
  name: string
  status: 'active' | 'draft'
  fields: Record<string, unknown>
}

/**
 * Writes an import (design D7) in batches of up to 500: the upgrades, then the additions, each pointing at its import
 * record, then up to two records, one public of the active additions and one DM-only of the drafts. An addition is
 * created, never set, so it can never overwrite a stored definition. Batches are not atomic as a whole: if one fails,
 * running the same import again completes the work. Returns the number of definitions written.
 */
export async function writeImport(
  db: Firestore,
  collectionName: string,
  target: 'card' | 'word',
  upgrades: readonly Upgrade[],
  additions: readonly Addition[],
): Promise<number> {
  const changes = db.collection(CHANGES_COLLECTION)
  const records = (['active', 'draft'] as const).flatMap((status) => {
    const items = additions.filter((addition) => addition.status === status)
    return items.length === 0 ? [] : [{ status, ref: changes.doc(), items }]
  })
  const recordOf = (status: 'active' | 'draft') =>
    records.find((record) => record.status === status)

  const writes: ((batch: WriteBatch) => void)[] = [
    ...upgrades.map(({ id, status }) => (batch: WriteBatch) => {
      batch.update(db.collection(collectionName).doc(id), {
        status,
        retired: FieldValue.delete(),
      })
    }),
    ...additions.map(({ id, status, fields }) => (batch: WriteBatch) => {
      batch.create(db.collection(collectionName).doc(id), {
        ...fields,
        status,
        changeId: recordOf(status)?.ref.id ?? null,
      })
    }),
    ...records.map(({ status, ref, items }) => (batch: WriteBatch) => {
      batch.set(ref, {
        target,
        step: 'imported',
        // An import adds every definition listed for players ("Listede görünür" on).
        items: items.map(({ id, name }) => ({ id, name, status, isInLibrary: true })),
        public: status === 'active',
        by: null,
        at: FieldValue.serverTimestamp(),
      })
    }),
  ]
  for (let start = 0; start < writes.length; start += BATCH_SIZE) {
    const batch = db.batch()
    for (const write of writes.slice(start, start + BATCH_SIZE)) write(batch)
    await batch.commit()
  }
  return upgrades.length + additions.length
}

/** Writes the plan, each added card with its kind's starting flags. Returns the number of cards written. */
export async function applyPlan(db: Firestore, plan: ImportPlan): Promise<number> {
  const additions = plan.flatMap((deck) =>
    deck.cards.flatMap(({ id, name, outcome, definition }): Addition[] =>
      definition === null
        ? []
        : [
            {
              id,
              name,
              status: outcome === 'added-active' ? 'active' : 'draft',
              fields: { ...definition, ...startingFlags(definition.kind, definition.text) },
            },
          ],
    ),
  )
  const upgrades = plan.flatMap((deck) => deck.upgrades)
  return writeImport(db, CARDS_COLLECTION, 'card', upgrades, additions)
}

export type ImportResult = { plan: ImportPlan; written: number }

/**
 * Runs an import of already validated decks: reads the stored cards, plans, and writes the plan unless this
 * is a dry run. A deck left out of `decks` is not touched.
 */
export async function runImport(
  db: Firestore,
  decks: Partial<Record<Deck, readonly CardRow[]>>,
  { dryRun }: { dryRun: boolean },
): Promise<ImportResult> {
  const plan = planImport(await readCards(db), decks)
  const written = dryRun ? 0 : await applyPlan(db, plan)
  return { plan, written }
}
