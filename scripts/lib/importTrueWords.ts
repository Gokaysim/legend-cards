import type { Firestore } from 'firebase-admin/firestore'

import {
  type Addition,
  type CardOutcome,
  countOutcomes,
  type StoredDefinition,
  type Upgrade,
  upgradeOf,
  writeImport,
} from './importCards.ts'
import type { ParsedTrueWord, TrueWordDefinition, WordColumn } from './trueWordRows.ts'

/** The True Words collection. Keep in step with `src/features/true-words/api.ts` and `firestore.rules`. */
export const TRUE_WORDS_COLLECTION = 'trueWords'

/** A stored word as read from Firestore, unvalidated: the import must cope with anything stored there. */
export type StoredWord = StoredDefinition

/** The same outcomes as the card import: added as active, added as a draft, or already stored. */
export type WordOutcome = CardOutcome

/** A row the import reads: a word and the columns it leaves empty. */
export type WordRow = Pick<ParsedTrueWord, 'word' | 'missing'>

export type PlannedWord = {
  id: string
  name: string
  outcome: WordOutcome
  /** The empty columns that make an added word a draft. */
  missing: readonly WordColumn[]
  /** The definition to add; `null` for a word already stored. */
  definition: TrueWordDefinition | null
}

export type WordPlan = {
  words: PlannedWord[]
  counts: Record<WordOutcome, number>
  upgrades: Upgrade[]
}

/** The document ID of a word: "tw-" plus its normalized name (design D1). */
export function trueWordId(nameKey: string): string {
  return `tw-${nameKey}`
}

/**
 * Decides what an import does to each word (spec: admin-scripts, "The True Words import only adds", "Imported
 * definitions are active unless a value is missing", "Imports give stored definitions a status"). Pure: the caller
 * reads the stored words and applies the plan.
 */
export function planWordImport(
  existing: readonly StoredWord[],
  rows: readonly WordRow[],
): WordPlan {
  const ids = new Set(existing.map((word) => word.id))
  const nameKeys = new Set(
    existing.flatMap((word) => (typeof word.data.nameKey === 'string' ? [word.data.nameKey] : [])),
  )
  const words = rows.map(({ word, missing }): PlannedWord => {
    const id = trueWordId(word.nameKey)
    if (ids.has(id) || nameKeys.has(word.nameKey)) {
      return { id, name: word.name, outcome: 'existing', missing: [], definition: null }
    }
    const outcome = missing.length === 0 ? 'added-active' : 'added-draft'
    return { id, name: word.name, outcome, missing, definition: word }
  })
  const upgrades = existing
    .flatMap((word) => upgradeOf(word) ?? [])
    .sort((a, b) => a.id.localeCompare(b.id))
  return { words, counts: countOutcomes(words), upgrades }
}

/** Every stored word, as raw data. */
export async function readWords(db: Firestore): Promise<StoredWord[]> {
  const snapshot = await db.collection(TRUE_WORDS_COLLECTION).get()
  return snapshot.docs.map((document) => ({ id: document.id, data: document.data() }))
}

/** Writes the plan as the card import does (`writeImport`). Returns the number of words written. */
export async function applyWordPlan(db: Firestore, plan: WordPlan): Promise<number> {
  const additions = plan.words.flatMap(({ id, name, outcome, definition }): Addition[] =>
    definition === null
      ? []
      : [
          {
            id,
            name,
            status: outcome === 'added-active' ? 'active' : 'draft',
            fields: { ...definition },
          },
        ],
  )
  return writeImport(db, TRUE_WORDS_COLLECTION, 'word', plan.upgrades, additions)
}

export type WordImportResult = { plan: WordPlan; written: number }

/** Runs an import of already validated words: reads the stored words, plans, and writes unless a dry run. */
export async function runWordImport(
  db: Firestore,
  rows: readonly WordRow[],
  { dryRun }: { dryRun: boolean },
): Promise<WordImportResult> {
  const plan = planWordImport(await readWords(db), rows)
  const written = dryRun ? 0 : await applyWordPlan(db, plan)
  return { plan, written }
}
