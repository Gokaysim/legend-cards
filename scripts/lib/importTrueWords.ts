import type { Firestore } from 'firebase-admin/firestore'

import { BATCH_SIZE, type CardOutcome, OUTCOMES } from './importCards.ts'
import type { TrueWordDefinition } from './trueWordRows.ts'

/** The True Words collection. Keep in step with `src/features/true-words/api.ts` and `firestore.rules`. */
export const TRUE_WORDS_COLLECTION = 'trueWords'

/** The fields the import owns. Any other stored field is never compared or written. */
const DEFINITION_FIELDS = [
  'name',
  'nameKey',
  'cost',
  'text',
] as const satisfies readonly (keyof TrueWordDefinition)[]

/** A stored word as read from Firestore, unvalidated: the import must cope with anything stored there. */
export type StoredWord = { id: string; data: Record<string, unknown> }

/** The same outcomes as the card import: added, updated, unchanged, retired or restored. */
export type WordOutcome = CardOutcome
export const WORD_OUTCOMES = OUTCOMES

/** What a write sets, merged into the stored document. */
export type WordWrite = (TrueWordDefinition & { retired: false }) | { retired: true }

export type PlannedWord = {
  id: string
  name: string
  outcome: WordOutcome
  /** `null` when nothing is written. */
  write: WordWrite | null
}

export type WordPlan = {
  words: PlannedWord[]
  counts: Record<WordOutcome, number>
}

/** The document ID of a word: "tw-" plus its normalized name (design D1). */
export function trueWordId(nameKey: string): string {
  return `tw-${nameKey}`
}

const storedName = (word: StoredWord) =>
  typeof word.data.name === 'string' ? word.data.name : word.id

function sameDefinition(stored: Record<string, unknown>, word: TrueWordDefinition): boolean {
  return DEFINITION_FIELDS.every((field) => stored[field] === word[field])
}

/**
 * Decides what an import does to each word (spec: admin-scripts, "Re-importing updates True Words by name",
 * "True Words missing from the file are retired"). Pure: the caller reads the stored words and applies the plan.
 */
export function planWordImport(
  existing: readonly StoredWord[],
  rows: readonly TrueWordDefinition[],
): WordPlan {
  const storedById = new Map(existing.map((word) => [word.id, word]))
  const words: PlannedWord[] = []

  for (const row of rows) {
    const id = trueWordId(row.nameKey)
    const stored = storedById.get(id)
    storedById.delete(id)
    const write: WordWrite = { ...row, retired: false }
    if (!stored) {
      words.push({ id, name: row.name, outcome: 'added', write })
    } else if (stored.data.retired === true) {
      words.push({ id, name: row.name, outcome: 'restored', write })
    } else if (stored.data.retired !== false || !sameDefinition(stored.data, row)) {
      words.push({ id, name: row.name, outcome: 'updated', write })
    } else {
      words.push({ id, name: row.name, outcome: 'unchanged', write: null })
    }
  }

  // Stored words that the file no longer has. Already retired ones stay as they are.
  const missing = [...storedById.values()]
    .filter((word) => word.data.retired !== true)
    .sort((a, b) => a.id.localeCompare(b.id))
  for (const word of missing) {
    words.push({
      id: word.id,
      name: storedName(word),
      outcome: 'retired',
      write: { retired: true },
    })
  }

  const counts = Object.fromEntries(WORD_OUTCOMES.map((outcome) => [outcome, 0])) as Record<
    WordOutcome,
    number
  >
  for (const word of words) counts[word.outcome] += 1
  return { words, counts }
}

/** Every stored word, as raw data. */
export async function readWords(db: Firestore): Promise<StoredWord[]> {
  const snapshot = await db.collection(TRUE_WORDS_COLLECTION).get()
  return snapshot.docs.map((document) => ({ id: document.id, data: document.data() }))
}

/**
 * Writes the plan in batches of up to 500. Each write is a merge, so fields the import does not own survive.
 * Returns the number of documents written.
 */
export async function applyWordPlan(db: Firestore, plan: WordPlan): Promise<number> {
  const writes = plan.words.flatMap((word) =>
    word.write ? [{ id: word.id, write: word.write }] : [],
  )
  for (let start = 0; start < writes.length; start += BATCH_SIZE) {
    const batch = db.batch()
    for (const { id, write } of writes.slice(start, start + BATCH_SIZE)) {
      batch.set(db.collection(TRUE_WORDS_COLLECTION).doc(id), write, { merge: true })
    }
    await batch.commit()
  }
  return writes.length
}

export type WordImportResult = { plan: WordPlan; written: number }

/** Runs an import of already validated words: reads the stored words, plans, and writes unless a dry run. */
export async function runWordImport(
  db: Firestore,
  rows: readonly TrueWordDefinition[],
  { dryRun }: { dryRun: boolean },
): Promise<WordImportResult> {
  const plan = planWordImport(await readWords(db), rows)
  const written = dryRun ? 0 : await applyWordPlan(db, plan)
  return { plan, written }
}
