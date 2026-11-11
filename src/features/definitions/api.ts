import {
  collection,
  type CollectionReference,
  doc,
  type DocumentData,
  type Firestore,
  type Query,
  query,
  runTransaction,
  serverTimestamp,
  type Transaction,
  where,
} from 'firebase/firestore'

import { CARDS_COLLECTION } from '@/features/cards/api'
import { type Card, type CardKind, isComplete, type Rarity } from '@/features/cards/schema'
import { normalize } from '@/features/cards/text'
import { explainDenial, tableRef } from '@/features/table/api'
import { TableBusyError } from '@/features/table/errors'
import { openPackIdOf } from '@/features/table/schema'
import { TRUE_WORDS_COLLECTION } from '@/features/true-words/api'
import { isWordComplete, type TrueWord } from '@/features/true-words/schema'

import { DefinitionChangedError, IncompleteDefinitionError, NameTakenError } from './errors'
import {
  type CardSnapshot,
  type DefinitionChange,
  definitionChangeConverter,
  type DefinitionTarget,
  isPublicStep,
  stepFor,
  type WordSnapshot,
} from './schema'
import type { DefinitionStatus } from './status'

/** Keep in step with `firestore.rules` and `scripts/lib/importCards.ts`. */
export const DEFINITION_CHANGES_COLLECTION = 'definitionChanges'

/** Every change record, validated. Only the DM may read them all; players read `publicChangesQuery`. */
export function definitionChangesRef(db: Firestore): CollectionReference<DefinitionChange> {
  return collection(db, DEFINITION_CHANGES_COLLECTION).withConverter(definitionChangeConverter)
}

/** The change records players may read: the steps they can see (spec: "Who reads the change records"). */
export function publicChangesQuery(db: Firestore): Query<DefinitionChange> {
  return query(definitionChangesRef(db), where('public', '==', true))
}

/** The fields the DM's card form edits. The normalized name and the status are derived from them and the step. */
export type CardFields = {
  kind: CardKind
  name: string
  setCode: string | null
  cost: string | null
  rarity: Rarity | null
  mechanicPack: string | null
  text: string
}

/** The fields the DM's True Word form edits. */
export type WordFields = { name: string; cost: string | null; text: string }

/** The deck a card kind belongs to, which is also the prefix of its ID. */
export function deckOfKind(kind: CardKind): 'legend' | 'cursed' {
  return kind === 'cursed' ? 'cursed' : 'legend'
}

/**
 * A new definition's ID, as the import makes it (design D6): the prefix and the normalized name, with `-2`, `-3` and so
 * on when that ID is taken, for example by a card renamed away from that name. The DM's device holds every definition,
 * so it can choose.
 */
export function newDefinitionId(
  prefix: 'legend' | 'cursed' | 'tw',
  nameKey: string,
  takenIds: ReadonlySet<string>,
): string {
  const base = `${prefix}-${nameKey}`
  if (!takenIds.has(base)) return base
  let suffix = 2
  while (takenIds.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

/**
 * True when another definition among `others` has this normalized name (spec: "Names are unique"). `exceptId` is the
 * definition being renamed. The rules cannot query, so this check is the form's.
 */
export function isNameTaken(
  nameKey: string,
  others: readonly { id: string; nameKey: string }[],
  exceptId: string | null,
): boolean {
  return others.some((other) => other.id !== exceptId && other.nameKey === nameKey)
}

/**
 * The ID of the record that deletes a draft: fixed by the draft's ID and its newest record, so the rules find it
 * without a query. Keep in step with `deleteRecordId` in `firestore.rules`.
 */
export function deleteRecordId(targetId: string, changeId: string): string {
  return `del-${targetId}-${changeId}`
}

const CARD_SNAPSHOT_KEYS = [
  'kind',
  'name',
  'nameKey',
  'setCode',
  'cost',
  'rarity',
  'mechanicPack',
  'text',
  'status',
] as const satisfies readonly (keyof CardSnapshot)[]

const WORD_SNAPSHOT_KEYS = [
  'name',
  'nameKey',
  'cost',
  'text',
  'status',
] as const satisfies readonly (keyof WordSnapshot)[]

/** A card's definition and status, as a change record keeps it. */
export function cardSnapshotOf(card: CardFields & { status: DefinitionStatus }): CardSnapshot {
  return {
    kind: card.kind,
    name: card.name,
    nameKey: normalize(card.name),
    setCode: card.setCode,
    cost: card.cost,
    rarity: card.rarity,
    mechanicPack: card.mechanicPack,
    text: card.text,
    status: card.status,
  }
}

/** A word's definition and status, as a change record keeps it. */
export function wordSnapshotOf(word: WordFields & { status: DefinitionStatus }): WordSnapshot {
  return {
    name: word.name,
    nameKey: normalize(word.name),
    cost: word.cost,
    text: word.text,
    status: word.status,
  }
}

/** The stored definition as a snapshot, with the stored `nameKey`; `null` when the document does not exist. */
function storedSnapshot(
  data: DocumentData | undefined,
  keys: readonly string[],
): Record<string, unknown> | null {
  return data === undefined ? null : Object.fromEntries(keys.map((key) => [key, data[key] ?? null]))
}

function sameSnapshot(a: Record<string, unknown> | null, b: Record<string, unknown> | null) {
  if (a === null || b === null) return a === b
  return Object.keys(a).every((key) => a[key] === b[key])
}

async function ensureTableFree(transaction: Transaction, db: Firestore): Promise<void> {
  const openPackId = openPackIdOf((await transaction.get(tableRef(db))).data())
  if (openPackId !== null) throw new TableBusyError(openPackId)
}

type Step = {
  target: DefinitionTarget
  id: string
  /** The definition as the DM's form saw it, or `null` for a new one. */
  before: CardSnapshot | WordSnapshot | null
  /** The definition after the step, or `null` for a delete. */
  after: CardSnapshot | WordSnapshot | null
  /** The newest record of the definition before the step; a delete's record ID is fixed by it. */
  beforeChangeId: string | null
  /** The signed-in DM. */
  by: string
}

/**
 * Runs one definition step in a transaction, with its change record (design D4, D5, D8, D9): it refuses a definition
 * that changed since the form opened, waits for an open pack when the status changes, writes the definition (created,
 * updated or deleted), and records the step. Throws `DefinitionChangedError`, `NameTakenError` (a new ID that exists
 * meanwhile) and `TableBusyError`. Returns the record's ID.
 */
async function runStep(db: Firestore, step: Step): Promise<string> {
  const collectionName = step.target === 'card' ? CARDS_COLLECTION : TRUE_WORDS_COLLECTION
  const keys = step.target === 'card' ? CARD_SNAPSHOT_KEYS : WORD_SNAPSHOT_KEYS
  const definitionDoc = doc(db, collectionName, step.id)
  const changes = collection(db, DEFINITION_CHANGES_COLLECTION)
  const recordDoc =
    step.after === null
      ? doc(changes, deleteRecordId(step.id, step.beforeChangeId ?? ''))
      : doc(changes)
  const beforeStatus = step.before?.status ?? null
  const afterStatus = step.after?.status ?? null
  try {
    await runTransaction(db, async (transaction) => {
      const stored = (await transaction.get(definitionDoc)).data()
      if (step.before === null) {
        if (stored !== undefined) throw new NameTakenError()
      } else if (!sameSnapshot(storedSnapshot(stored, keys), step.before)) {
        throw new DefinitionChangedError()
      }
      if (beforeStatus !== afterStatus) await ensureTableFree(transaction, db)

      if (step.after === null) {
        transaction.delete(definitionDoc)
      } else if (step.before === null) {
        transaction.set(definitionDoc, {
          ...step.after,
          changeId: recordDoc.id,
          ...(step.target === 'card' ? { holder: null } : {}),
        })
      } else {
        transaction.update(definitionDoc, { ...step.after, changeId: recordDoc.id })
      }
      transaction.set(recordDoc, {
        target: step.target,
        targetId: step.id,
        name: (step.after ?? step.before)?.name,
        step: stepFor(beforeStatus, afterStatus),
        before: step.before,
        after: step.after,
        public: isPublicStep(beforeStatus, afterStatus),
        by: step.by,
        at: serverTimestamp(),
      })
    })
    return recordDoc.id
  } catch (error) {
    throw await explainDenial(db, error)
  }
}

/** The status a save leaves: active when publishing, else the definition's own (draft for a new one). */
function savedStatus(before: DefinitionStatus | null, publish: boolean): DefinitionStatus {
  return publish ? 'active' : (before ?? 'draft')
}

export type AddCardInput = {
  fields: CardFields
  /** "Kaydet ve yayınla": add straight to active. */
  publish: boolean
  /** The signed-in DM. */
  by: string
  /** Every card the DM's device holds, to check the name and choose a free ID. */
  existing: readonly Card[]
}

/**
 * Adds a card as a draft, or as active when publishing (spec: "Adding a card"). Throws `NameTakenError`,
 * `IncompleteDefinitionError` and `TableBusyError`. Returns the new card's ID.
 */
export async function addCard(db: Firestore, input: AddCardInput): Promise<string> {
  const after = cardSnapshotOf({ ...input.fields, status: savedStatus(null, input.publish) })
  const deck = deckOfKind(after.kind)
  const sameDeck = input.existing.filter((card) => deckOfKind(card.kind) === deck)
  if (isNameTaken(after.nameKey, sameDeck, null)) throw new NameTakenError()
  if (after.status !== 'draft' && !isComplete(after)) throw new IncompleteDefinitionError()
  const id = newDefinitionId(deck, after.nameKey, new Set(input.existing.map((card) => card.id)))
  await runStep(db, { target: 'card', id, before: null, after, beforeChangeId: null, by: input.by })
  return id
}

export type SaveCardInput = {
  /** The card as the form loaded it. */
  card: Card
  fields: CardFields
  /** "Yayınla" on a draft: save the fields and publish in one step. */
  publish: boolean
  by: string
  existing: readonly Card[]
}

/**
 * Saves the DM's changes to a card, and publishes a draft when asked (spec: "Editing a definition", "Publishing a
 * draft"). Throws `NameTakenError`, `IncompleteDefinitionError`, `DefinitionChangedError` and `TableBusyError`.
 */
export async function saveCard(db: Firestore, input: SaveCardInput): Promise<void> {
  const before = cardSnapshotOf(input.card)
  const after = cardSnapshotOf({
    ...input.fields,
    status: savedStatus(input.card.status, input.publish),
  })
  const deck = deckOfKind(input.card.kind)
  const sameDeck = input.existing.filter((card) => deckOfKind(card.kind) === deck)
  if (isNameTaken(after.nameKey, sameDeck, input.card.id)) throw new NameTakenError()
  if (after.status !== 'draft' && !isComplete(after)) throw new IncompleteDefinitionError()
  await runStep(db, {
    target: 'card',
    id: input.card.id,
    before: { ...before, nameKey: input.card.nameKey },
    after,
    beforeChangeId: input.card.changeId,
    by: input.by,
  })
}

export type SetCardStatusInput = {
  card: Card
  /** `retired` to retire an active card ("Kaldır"), `active` to bring a retired one back ("Geri al"). */
  status: 'active' | 'retired'
  by: string
}

/** Retires an active card or brings a retired one back; nothing else changes. Throws as `saveCard` does. */
export async function setCardStatus(db: Firestore, input: SetCardStatusInput): Promise<void> {
  const before = { ...cardSnapshotOf(input.card), nameKey: input.card.nameKey }
  await runStep(db, {
    target: 'card',
    id: input.card.id,
    before,
    after: { ...before, status: input.status },
    beforeChangeId: input.card.changeId,
    by: input.by,
  })
}

/** Deletes a draft card ("Sil"); its records stay. Throws `DefinitionChangedError` and `TableBusyError`. */
export async function deleteCard(db: Firestore, input: { card: Card; by: string }): Promise<void> {
  await runStep(db, {
    target: 'card',
    id: input.card.id,
    before: { ...cardSnapshotOf(input.card), nameKey: input.card.nameKey },
    after: null,
    beforeChangeId: input.card.changeId,
    by: input.by,
  })
}

export type AddWordInput = {
  fields: WordFields
  publish: boolean
  by: string
  existing: readonly TrueWord[]
}

/** Adds a True Word as a draft, or as active when publishing (spec: "Adding a True Word"). Throws as `addCard`. */
export async function addWord(db: Firestore, input: AddWordInput): Promise<string> {
  const after = wordSnapshotOf({ ...input.fields, status: savedStatus(null, input.publish) })
  if (isNameTaken(after.nameKey, input.existing, null)) throw new NameTakenError()
  if (after.status !== 'draft' && !isWordComplete(after)) throw new IncompleteDefinitionError()
  const id = newDefinitionId('tw', after.nameKey, new Set(input.existing.map((word) => word.id)))
  await runStep(db, { target: 'word', id, before: null, after, beforeChangeId: null, by: input.by })
  return id
}

export type SaveWordInput = {
  word: TrueWord
  fields: WordFields
  publish: boolean
  by: string
  existing: readonly TrueWord[]
}

/** Saves the DM's changes to a word, and publishes a draft when asked. Throws as `saveCard`. */
export async function saveWord(db: Firestore, input: SaveWordInput): Promise<void> {
  const after = wordSnapshotOf({
    ...input.fields,
    status: savedStatus(input.word.status, input.publish),
  })
  if (isNameTaken(after.nameKey, input.existing, input.word.id)) throw new NameTakenError()
  if (after.status !== 'draft' && !isWordComplete(after)) throw new IncompleteDefinitionError()
  await runStep(db, {
    target: 'word',
    id: input.word.id,
    before: { ...wordSnapshotOf(input.word), nameKey: input.word.nameKey },
    after,
    beforeChangeId: input.word.changeId,
    by: input.by,
  })
}

/** Retires an active word or brings a retired one back. Throws as `saveCard`. */
export async function setWordStatus(
  db: Firestore,
  input: { word: TrueWord; status: 'active' | 'retired'; by: string },
): Promise<void> {
  const before = { ...wordSnapshotOf(input.word), nameKey: input.word.nameKey }
  await runStep(db, {
    target: 'word',
    id: input.word.id,
    before,
    after: { ...before, status: input.status },
    beforeChangeId: input.word.changeId,
    by: input.by,
  })
}

/** Deletes a draft word; its records stay. Throws `DefinitionChangedError` and `TableBusyError`. */
export async function deleteWord(
  db: Firestore,
  input: { word: TrueWord; by: string },
): Promise<void> {
  await runStep(db, {
    target: 'word',
    id: input.word.id,
    before: { ...wordSnapshotOf(input.word), nameKey: input.word.nameKey },
    after: null,
    beforeChangeId: input.word.changeId,
    by: input.by,
  })
}
