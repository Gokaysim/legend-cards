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
import {
  type Card,
  type CardKind,
  isComplete,
  isWordComplete,
  type Rarity,
  type TrueWord,
} from '@/features/cards/schema'
import { normalize } from '@/features/cards/text'
import { explainDenial, tableRef } from '@/features/table/api'
import { TableBusyError } from '@/features/table/errors'
import { openPackIdOf } from '@/features/table/schema'

import { DefinitionChangedError, IncompleteDefinitionError, NameTakenError } from './errors'
import { BEHAVIOR_FLAGS, type BehaviorFlags, POOL_FLAGS, withFixedFlags } from './flags'
import { picturePath, type PictureTarget } from './picturePath'
import { NO_PICTURE_STORE, type PictureStore } from './pictureStore'
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

/**
 * The fields the DM's card form edits, the behavior flags among them (spec: definition-editing, "Behavior flags"). The
 * normalized name and the status are derived from them and the step. A stored card has every one of them.
 */
export type CardFields = {
  kind: CardKind
  name: string
  setCode: string | null
  cost: string | null
  rarity: Rarity | null
  mechanicPack: string | null
  text: string
} & BehaviorFlags

/** The fields the DM's True Word form edits, the behavior flags among them. A stored word has every one of them. */
export type WordFields = { name: string; cost: string | null; text: string } & BehaviorFlags

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

/** Every field a snapshot keeps, a card's or a True Word's. Keep in step with `cardSnapshot` in `firestore.rules`. */
const SNAPSHOT_KEYS = [
  'kind',
  'name',
  'nameKey',
  'setCode',
  'cost',
  'rarity',
  'mechanicPack',
  'text',
  'status',
  'picture',
  ...BEHAVIOR_FLAGS,
] as const satisfies readonly (keyof CardSnapshot)[]

/** What a definition's picture is in a snapshot: its path, or `null` for none (design D3). */
type WithPicture = { status: DefinitionStatus; picture?: string | null }

/** Only the flags of a definition or a form, with the values its kind fixes put back. */
function flagsOf(kind: CardSnapshot['kind'], fields: BehaviorFlags): BehaviorFlags {
  return withFixedFlags(
    kind,
    Object.fromEntries(BEHAVIOR_FLAGS.map((flag) => [flag, fields[flag]])) as BehaviorFlags,
  )
}

/** A card's definition, status and flags, as a change record keeps it. */
export function cardSnapshotOf(card: CardFields & WithPicture): CardSnapshot {
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
    picture: card.picture ?? null,
    ...flagsOf(card.kind, card),
  }
}

/** A word's definition, status and flags, as a change record keeps it: a definition of the kind `trueWord`. */
export function wordSnapshotOf(word: WordFields & WithPicture): WordSnapshot {
  return {
    kind: 'trueWord',
    name: word.name,
    nameKey: normalize(word.name),
    setCode: null,
    cost: word.cost,
    rarity: null,
    mechanicPack: null,
    text: word.text,
    status: word.status,
    picture: word.picture ?? null,
    ...flagsOf('trueWord', word),
  }
}

/** The stored definition as a snapshot, with the stored `nameKey`; `null` when the document does not exist. */
function storedSnapshot(
  data: DocumentData | undefined,
  keys: readonly string[],
): Record<string, unknown> | null {
  return data === undefined ? null : Object.fromEntries(keys.map((key) => [key, data[key] ?? null]))
}

/**
 * True when the step changes a flag that moves cards in or out of the pool, so it waits for an open pack as a status
 * step does (design D7 of unify-cards-and-true-words).
 */
function changesPoolFlags(before: CardSnapshot | null, after: CardSnapshot | null): boolean {
  return (
    before !== null && after !== null && POOL_FLAGS.some((flag) => before[flag] !== after[flag])
  )
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
  before: CardSnapshot | null
  /** The definition after the step, or `null` for a delete. */
  after: CardSnapshot | null
  /** The newest record of the definition before the step; a delete's record ID is fixed by it. */
  beforeChangeId: string | null
  /** The signed-in DM. */
  by: string
}

/**
 * Runs one definition step in a transaction, with its change record (design D4, D5, D8, D9): it refuses a definition
 * that changed since the form opened, waits for an open pack when the status or a pool flag changes, writes the
 * definition (created, updated or deleted), and records the step. Cards and True Words are both in `cards` (design D1 of
 * unify-cards-and-true-words). Throws `DefinitionChangedError`, `NameTakenError` (a new ID that exists meanwhile) and
 * `TableBusyError`. Returns the record's ID.
 */
async function runStep(db: Firestore, step: Step): Promise<string> {
  const definitionDoc = doc(db, CARDS_COLLECTION, step.id)
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
      } else if (!sameSnapshot(storedSnapshot(stored, SNAPSHOT_KEYS), step.before)) {
        throw new DefinitionChangedError()
      }
      if (beforeStatus !== afterStatus || changesPoolFlags(step.before, step.after)) {
        await ensureTableFree(transaction, db)
      }

      if (step.after === null) {
        transaction.delete(definitionDoc)
      } else if (step.before === null) {
        transaction.set(definitionDoc, {
          ...withoutUnchangedPicture(step.after, null),
          changeId: recordDoc.id,
          holder: null,
        })
      } else {
        transaction.update(definitionDoc, {
          ...withoutUnchangedPicture(step.after, step.before.picture),
          changeId: recordDoc.id,
        })
      }
      transaction.set(recordDoc, {
        target: step.target,
        targetId: step.id,
        name: (step.after ?? step.before)?.name,
        step: stepFor(beforeStatus, afterStatus),
        before: step.before,
        after: step.after,
        public: isPublicStep(step.before, step.after),
        by: step.by,
        at: serverTimestamp(),
      })
    })
    return recordDoc.id
  } catch (error) {
    throw await explainDenial(db, error)
  }
}

/**
 * The definition to write, without its picture when the picture does not change: a stored definition that never had a
 * picture keeps the field absent, so the picture import can tell it from one whose picture the DM removed, which is
 * `null` (design D3 of upload-card-and-word-pictures). A new definition without a picture is created without the field.
 */
function withoutUnchangedPicture<T extends { picture: string | null }>(
  after: T,
  before: string | null,
): Omit<T, 'picture'> | T {
  if (after.picture !== before) return after
  const { picture: _unchanged, ...rest } = after
  return rest
}

/**
 * What a save does with the definition's picture (spec: definition-editing, "The picture in the forms"): keep it,
 * replace it with a prepared one (`preparePicture`), or remove it.
 */
export type PictureChoice =
  { kind: 'keep' } | { kind: 'new'; blob: Blob; hash: string } | { kind: 'remove' }

export const KEEP_PICTURE: PictureChoice = { kind: 'keep' }

/** Runs a store call whose failure must not undo or fail a step: an unused file is all it leaves (design D6). */
async function forget(call: Promise<void>): Promise<void> {
  try {
    await call
  } catch (error) {
    if (import.meta.env.DEV) console.warn('A picture file was not deleted:', error)
  }
}

/**
 * Runs a step that may change the definition's picture (design D6): uploads a new picture first, runs the step, then
 * deletes the file the definition no longer uses. When the step fails, the new upload is deleted again and the error
 * is thrown. The same picture uploaded again has the same path: nothing is uploaded, and its file is never deleted.
 */
async function runPictureStep(
  db: Firestore,
  pictures: PictureStore,
  step: Omit<Step, 'after'> & { after: CardSnapshot },
  current: string | null,
  choice: PictureChoice,
): Promise<string> {
  const target: PictureTarget = step.target
  const next =
    choice.kind === 'keep'
      ? current
      : choice.kind === 'remove'
        ? null
        : picturePath(target, step.id, choice.hash)
  const uploaded = choice.kind === 'new' && next !== current ? next : null
  if (choice.kind === 'new' && uploaded !== null) {
    await pictures.upload(uploaded, choice.blob, `${step.id}.webp`)
  }
  let recordId: string
  try {
    recordId = await runStep(db, { ...step, after: { ...step.after, picture: next } })
  } catch (error) {
    if (uploaded !== null) await forget(pictures.remove(uploaded))
    throw error
  }
  if (current !== null && current !== next) await forget(pictures.remove(current))
  return recordId
}

/** Deletes a draft, then its picture file (spec: definition-editing, "Deleting a draft"). */
async function runDeleteStep(
  db: Firestore,
  pictures: PictureStore,
  step: Step,
  current: string | null,
): Promise<void> {
  await runStep(db, step)
  if (current !== null) await forget(pictures.remove(current))
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
  /** The new card's picture: none (`keep`), or a prepared one. */
  picture?: PictureChoice
}

/**
 * Adds a card as a draft, or as active when publishing (spec: "Adding a card"), with its picture. Throws
 * `NameTakenError`, `IncompleteDefinitionError`, `TableBusyError` and the store's upload errors. Returns the new card's
 * ID.
 */
export async function addCard(
  db: Firestore,
  input: AddCardInput,
  pictures: PictureStore = NO_PICTURE_STORE,
): Promise<string> {
  const after = cardSnapshotOf({ ...input.fields, status: savedStatus(null, input.publish) })
  const deck = deckOfKind(input.fields.kind)
  const sameDeck = input.existing.filter((card) => deckOfKind(card.kind) === deck)
  if (isNameTaken(after.nameKey, sameDeck, null)) throw new NameTakenError()
  if (after.status !== 'draft' && !isComplete({ ...after, kind: input.fields.kind })) {
    throw new IncompleteDefinitionError()
  }
  const id = newDefinitionId(deck, after.nameKey, new Set(input.existing.map((card) => card.id)))
  await runPictureStep(
    db,
    pictures,
    { target: 'card', id, before: null, after, beforeChangeId: null, by: input.by },
    null,
    input.picture ?? KEEP_PICTURE,
  )
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
  /** Keep the card's picture, replace it, or remove it. */
  picture?: PictureChoice
}

/**
 * Saves the DM's changes to a card, its picture included, and publishes a draft when asked (spec: "Editing a
 * definition", "Publishing a draft", "Picture changes are definition steps"). Throws `NameTakenError`,
 * `IncompleteDefinitionError`, `DefinitionChangedError`, `TableBusyError` and the store's upload errors.
 */
export async function saveCard(
  db: Firestore,
  input: SaveCardInput,
  pictures: PictureStore = NO_PICTURE_STORE,
): Promise<void> {
  const before = cardSnapshotOf(input.card)
  const after = cardSnapshotOf({
    ...input.fields,
    status: savedStatus(input.card.status, input.publish),
    picture: input.card.picture,
  })
  const deck = deckOfKind(input.card.kind)
  const sameDeck = input.existing.filter((card) => deckOfKind(card.kind) === deck)
  if (isNameTaken(after.nameKey, sameDeck, input.card.id)) throw new NameTakenError()
  if (after.status !== 'draft' && !isComplete({ ...after, kind: input.fields.kind })) {
    throw new IncompleteDefinitionError()
  }
  await runPictureStep(
    db,
    pictures,
    {
      target: 'card',
      id: input.card.id,
      before: { ...before, nameKey: input.card.nameKey },
      after,
      beforeChangeId: input.card.changeId,
      by: input.by,
    },
    input.card.picture,
    input.picture ?? KEEP_PICTURE,
  )
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

/**
 * Deletes a draft card ("Sil") and its picture file; its records stay. Throws `DefinitionChangedError` and
 * `TableBusyError`.
 */
export async function deleteCard(
  db: Firestore,
  input: { card: Card; by: string },
  pictures: PictureStore = NO_PICTURE_STORE,
): Promise<void> {
  await runDeleteStep(
    db,
    pictures,
    {
      target: 'card',
      id: input.card.id,
      before: { ...cardSnapshotOf(input.card), nameKey: input.card.nameKey },
      after: null,
      beforeChangeId: input.card.changeId,
      by: input.by,
    },
    input.card.picture,
  )
}

export type AddWordInput = {
  fields: WordFields
  publish: boolean
  by: string
  existing: readonly TrueWord[]
  picture?: PictureChoice
}

/**
 * Adds a True Word as a draft, or as active when publishing (spec: "Adding a True Word"), with its picture. Throws as
 * `addCard`.
 */
export async function addWord(
  db: Firestore,
  input: AddWordInput,
  pictures: PictureStore = NO_PICTURE_STORE,
): Promise<string> {
  const after = wordSnapshotOf({ ...input.fields, status: savedStatus(null, input.publish) })
  if (isNameTaken(after.nameKey, input.existing, null)) throw new NameTakenError()
  if (after.status !== 'draft' && !isWordComplete(after)) throw new IncompleteDefinitionError()
  const id = newDefinitionId('tw', after.nameKey, new Set(input.existing.map((word) => word.id)))
  await runPictureStep(
    db,
    pictures,
    { target: 'word', id, before: null, after, beforeChangeId: null, by: input.by },
    null,
    input.picture ?? KEEP_PICTURE,
  )
  return id
}

export type SaveWordInput = {
  word: TrueWord
  fields: WordFields
  publish: boolean
  by: string
  existing: readonly TrueWord[]
  picture?: PictureChoice
}

/** Saves the DM's changes to a word, its picture included, and publishes a draft when asked. Throws as `saveCard`. */
export async function saveWord(
  db: Firestore,
  input: SaveWordInput,
  pictures: PictureStore = NO_PICTURE_STORE,
): Promise<void> {
  const after = wordSnapshotOf({
    ...input.fields,
    status: savedStatus(input.word.status, input.publish),
    picture: input.word.picture,
  })
  if (isNameTaken(after.nameKey, input.existing, input.word.id)) throw new NameTakenError()
  if (after.status !== 'draft' && !isWordComplete(after)) throw new IncompleteDefinitionError()
  await runPictureStep(
    db,
    pictures,
    {
      target: 'word',
      id: input.word.id,
      before: { ...wordSnapshotOf(input.word), nameKey: input.word.nameKey },
      after,
      beforeChangeId: input.word.changeId,
      by: input.by,
    },
    input.word.picture,
    input.picture ?? KEEP_PICTURE,
  )
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

/** Deletes a draft word and its picture file; its records stay. Throws `DefinitionChangedError` and `TableBusyError`. */
export async function deleteWord(
  db: Firestore,
  input: { word: TrueWord; by: string },
  pictures: PictureStore = NO_PICTURE_STORE,
): Promise<void> {
  await runDeleteStep(
    db,
    pictures,
    {
      target: 'word',
      id: input.word.id,
      before: { ...wordSnapshotOf(input.word), nameKey: input.word.nameKey },
      after: null,
      beforeChangeId: input.word.changeId,
      by: input.by,
    },
    input.word.picture,
  )
}
