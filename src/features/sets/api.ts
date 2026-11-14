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
  orderBy,
} from 'firebase/firestore'

import { deleteRecordId, KEEP_PICTURE, type PictureChoice } from '@/features/definitions/api'
import { picturePath } from '@/features/definitions/picturePath'
import { NO_PICTURE_STORE, type PictureStore } from '@/features/definitions/pictureStore'
import { explainDenial, tableRef } from '@/features/table/api'
import { TableBusyError } from '@/features/table/errors'
import { openPackIdOf } from '@/features/table/schema'

import { SetChangedError, SetInUseError, SetTakenError } from './errors'
import { orderSets, setIdOf } from './index'
import {
  type CardSet,
  cardSetConverter,
  type PackLayout,
  type SetChange,
  setChangeConverter,
  type SetField,
} from './schema'

/** Keep in step with `firestore.rules` and `scripts/lib/importSets.ts`. */
export const SETS_COLLECTION = 'sets'
export const SET_CHANGES_COLLECTION = 'setChanges'

/** Every stored set, validated and with the document ID as `id`. Every signed-in user reads them. */
export function setsRef(db: Firestore): CollectionReference<CardSet> {
  return collection(db, SETS_COLLECTION).withConverter(cardSetConverter)
}

/** The sets in the shop order (design D2). Equal positions are sorted by ID on the client (`orderSets`). */
export function setsQuery(db: Firestore): Query<CardSet> {
  return query(setsRef(db), orderBy('position'))
}

/** Every set change record, validated. Every signed-in user reads them all. */
export function setChangesRef(db: Firestore): CollectionReference<SetChange> {
  return collection(db, SET_CHANGES_COLLECTION).withConverter(setChangeConverter)
}

/** The fields the DM's set form edits. The code is set once, when the set is added. */
export type SetFields = {
  name: string
  aliases: string[]
  packLayout: PackLayout
}

/** The set's two pictures (spec: card-sets, "The pictures in the set form"). */
export type SetPicture = 'cardback' | 'mascot'

/** The file name "İndir" saves a set picture under. */
export function setPictureDownloadName(setId: string, which: SetPicture): string {
  return `${setId}-${which === 'cardback' ? 'cardback' : 'cardmaker'}.webp`
}

/** What a step compares to see whether the set changed since the form or the row was shown. */
function snapshotOf(set: DocumentData | CardSet) {
  return JSON.stringify([
    set.name,
    set.aliases,
    set.packLayout,
    set.cardback ?? null,
    set.mascot ?? null,
    set.position,
  ])
}

function ensureUnchanged(stored: DocumentData | undefined, seen: CardSet) {
  if (stored === undefined || snapshotOf(stored) !== snapshotOf(seen)) throw new SetChangedError()
}

async function ensureTableFree(transaction: Transaction, db: Firestore): Promise<void> {
  const openPackId = openPackIdOf((await transaction.get(tableRef(db))).data())
  if (openPackId !== null) throw new TableBusyError(openPackId)
}

/** A record's fields; the step adds its own. */
function recordOf(input: {
  by: string
  step: 'added' | 'edited' | 'moved' | 'deleted'
  set: { id: string; code: string; name: string }
  fields?: SetField[]
  direction?: 'up' | 'down' | null
}) {
  return {
    by: input.by,
    at: serverTimestamp(),
    step: input.step,
    setId: input.set.id,
    code: input.set.code,
    name: input.set.name,
    fields: input.fields ?? [],
    direction: input.direction ?? null,
    added: [],
    pictured: [],
  }
}

/** Runs a store call whose failure must not undo or fail a step: an unused file is all it leaves. */
async function forget(call: Promise<void>): Promise<void> {
  try {
    await call
  } catch (error) {
    if (import.meta.env.DEV) console.warn('A set picture file was not deleted:', error)
  }
}

type PlannedPicture = {
  which: SetPicture
  current: string | null
  next: string | null
  /** The path uploaded for this step, or `null` when nothing was uploaded. */
  uploaded: string | null
}

/** Uploads the new pictures of a step before it runs, as the definition steps do (design D4). */
async function uploadPictures(
  pictures: PictureStore,
  setId: string,
  choices: Readonly<Record<SetPicture, { current: string | null; choice: PictureChoice }>>,
): Promise<PlannedPicture[]> {
  const planned: PlannedPicture[] = []
  for (const which of ['cardback', 'mascot'] as const) {
    const { current, choice } = choices[which]
    const next =
      choice.kind === 'keep'
        ? current
        : choice.kind === 'remove'
          ? null
          : picturePath('set', setId, choice.hash)
    const uploaded = choice.kind === 'new' && next !== current ? next : null
    planned.push({ which, current, next, uploaded })
    if (choice.kind === 'new' && uploaded !== null) {
      try {
        await pictures.upload(uploaded, choice.blob, setPictureDownloadName(setId, which))
      } catch (error) {
        await removeUploads(pictures, planned.slice(0, -1))
        throw error
      }
    }
  }
  return planned
}

async function removeUploads(pictures: PictureStore, planned: readonly PlannedPicture[]) {
  for (const picture of planned) {
    if (picture.uploaded !== null) await forget(pictures.remove(picture.uploaded))
  }
}

async function removeReplaced(pictures: PictureStore, planned: readonly PlannedPicture[]) {
  for (const picture of planned) {
    if (picture.current !== null && picture.current !== picture.next) {
      await forget(pictures.remove(picture.current))
    }
  }
}

/** Runs a step after its uploads, deleting them again when it fails and the replaced files when it succeeds. */
async function withPictures<T>(
  pictures: PictureStore,
  planned: readonly PlannedPicture[],
  run: () => Promise<T>,
): Promise<T> {
  let result: T
  try {
    result = await run()
  } catch (error) {
    await removeUploads(pictures, planned)
    throw error
  }
  await removeReplaced(pictures, planned)
  return result
}

const nextOf = (planned: readonly PlannedPicture[], which: SetPicture) =>
  planned.find((picture) => picture.which === which)?.next ?? null

export type AddSetInput = {
  code: string
  fields: SetFields
  /** The signed-in DM. */
  by: string
  /** Every stored set, to place the new one last. */
  existing: readonly CardSet[]
  cardback?: PictureChoice
  mascot?: PictureChoice
}

/**
 * Adds a set at the end of the order, with its pictures and its record (spec: card-sets, "Adding a set"). A set the DM
 * adds without a picture holds `null`. Throws `SetTakenError` when a set with this code exists. Returns the set's ID.
 */
export async function addSet(
  db: Firestore,
  input: AddSetInput,
  pictures: PictureStore = NO_PICTURE_STORE,
): Promise<string> {
  const id = setIdOf(input.code)
  if (id === '') throw new Error('A set code needs a letter or a digit')
  const last = orderSets(input.existing).at(-1)
  const position = last === undefined ? 1 : last.position + 1
  const setDoc = doc(db, SETS_COLLECTION, id)
  const recordDoc = doc(collection(db, SET_CHANGES_COLLECTION))
  const planned = await uploadPictures(pictures, id, {
    cardback: { current: null, choice: input.cardback ?? KEEP_PICTURE },
    mascot: { current: null, choice: input.mascot ?? KEEP_PICTURE },
  })
  return withPictures(pictures, planned, async () => {
    try {
      await runTransaction(db, async (transaction) => {
        if ((await transaction.get(setDoc)).exists()) throw new SetTakenError()
        transaction.set(setDoc, {
          code: input.code,
          ...input.fields,
          position,
          cardback: nextOf(planned, 'cardback'),
          mascot: nextOf(planned, 'mascot'),
          changeId: recordDoc.id,
        })
        transaction.set(
          recordDoc,
          recordOf({
            by: input.by,
            step: 'added',
            set: { id, code: input.code, name: input.fields.name },
          }),
        )
      })
    } catch (error) {
      throw await explainDenial(db, error)
    }
    return id
  })
}

export type SaveSetInput = {
  /** The set as the form saw it. */
  set: CardSet
  fields: SetFields
  by: string
  cardback?: PictureChoice
  mascot?: PictureChoice
}

/** The fields a save changes, in the order a record names them. */
function changedFields(
  set: CardSet,
  fields: SetFields,
  planned: readonly PlannedPicture[],
): SetField[] {
  const changed: SetField[] = []
  if (fields.name !== set.name) changed.push('name')
  if (JSON.stringify(fields.aliases) !== JSON.stringify(set.aliases)) changed.push('aliases')
  if (fields.packLayout !== set.packLayout) changed.push('packLayout')
  for (const picture of planned) {
    if (picture.next !== picture.current) changed.push(picture.which)
  }
  return changed
}

/**
 * Saves the DM's changes to a set, with its pictures and its record (spec: card-sets, "Editing a set"). A save that
 * changes nothing writes nothing. Throws `SetChangedError` when the set changed since the form opened, and
 * `TableBusyError` for a layout change while a pack is open.
 */
export async function saveSet(
  db: Firestore,
  input: SaveSetInput,
  pictures: PictureStore = NO_PICTURE_STORE,
): Promise<void> {
  const { set } = input
  const planned = await uploadPictures(pictures, set.id, {
    cardback: { current: set.cardback, choice: input.cardback ?? KEEP_PICTURE },
    mascot: { current: set.mascot, choice: input.mascot ?? KEEP_PICTURE },
  })
  const fields = changedFields(set, input.fields, planned)
  if (fields.length === 0) return
  const setDoc = doc(db, SETS_COLLECTION, set.id)
  const recordDoc = doc(collection(db, SET_CHANGES_COLLECTION))
  await withPictures(pictures, planned, async () => {
    try {
      await runTransaction(db, async (transaction) => {
        ensureUnchanged((await transaction.get(setDoc)).data(), set)
        if (fields.includes('packLayout')) await ensureTableFree(transaction, db)
        const update: Record<string, unknown> = { changeId: recordDoc.id }
        if (fields.includes('name')) update.name = input.fields.name
        if (fields.includes('aliases')) update.aliases = input.fields.aliases
        if (fields.includes('packLayout')) update.packLayout = input.fields.packLayout
        for (const picture of planned) {
          if (picture.next !== picture.current) update[picture.which] = picture.next
        }
        transaction.update(setDoc, update)
        transaction.set(
          recordDoc,
          recordOf({
            by: input.by,
            step: 'edited',
            set: { id: set.id, code: set.code, name: input.fields.name },
            fields,
          }),
        )
      })
    } catch (error) {
      throw await explainDenial(db, error)
    }
  })
}

export type MoveSetInput = {
  /** The set that moves, as the row showed it. */
  set: CardSet
  /** The set it swaps places with: the one before it for "↑", after it for "↓". */
  neighbour: CardSet
  direction: 'up' | 'down'
  by: string
}

/**
 * Swaps a set with its neighbour in the order, with one record (spec: card-sets, "Reordering sets"; design D2). Two sets
 * that share a position get distinct ones. Throws `SetChangedError` when either moved meanwhile.
 */
export async function moveSet(db: Firestore, input: MoveSetInput): Promise<void> {
  const { set, neighbour, direction } = input
  const setDoc = doc(db, SETS_COLLECTION, set.id)
  const neighbourDoc = doc(db, SETS_COLLECTION, neighbour.id)
  const recordDoc = doc(collection(db, SET_CHANGES_COLLECTION))
  const tied = set.position === neighbour.position
  const setPosition = tied ? neighbour.position + (direction === 'up' ? -1 : 1) : neighbour.position
  try {
    await runTransaction(db, async (transaction) => {
      const [storedSet, storedNeighbour] = [
        (await transaction.get(setDoc)).data(),
        (await transaction.get(neighbourDoc)).data(),
      ]
      if (
        storedSet?.position !== set.position ||
        storedNeighbour?.position !== neighbour.position
      ) {
        throw new SetChangedError()
      }
      transaction.update(setDoc, { position: setPosition, changeId: recordDoc.id })
      if (!tied)
        transaction.update(neighbourDoc, { position: set.position, changeId: recordDoc.id })
      transaction.set(recordDoc, recordOf({ by: input.by, step: 'moved', set, direction }))
    })
  } catch (error) {
    throw await explainDenial(db, error)
  }
}

export type DeleteSetInput = {
  /** The set as the form saw it. */
  set: CardSet
  /** How many cards the DM's device holds with this set, whatever their status. */
  cardCount: number
  by: string
}

/**
 * Deletes an unused set, then its picture files (spec: card-sets, "Deleting a set"). The record's ID is fixed by the
 * set's newest record, so the rules find it. Throws `SetInUseError` while cards have the set, `SetChangedError` and
 * `TableBusyError`.
 */
export async function deleteSet(
  db: Firestore,
  input: DeleteSetInput,
  pictures: PictureStore = NO_PICTURE_STORE,
): Promise<void> {
  const { set } = input
  if (input.cardCount > 0) throw new SetInUseError()
  const setDoc = doc(db, SETS_COLLECTION, set.id)
  const recordDoc = doc(db, SET_CHANGES_COLLECTION, deleteRecordId(set.id, set.changeId ?? ''))
  try {
    await runTransaction(db, async (transaction) => {
      ensureUnchanged((await transaction.get(setDoc)).data(), set)
      await ensureTableFree(transaction, db)
      transaction.delete(setDoc)
      transaction.set(recordDoc, recordOf({ by: input.by, step: 'deleted', set }))
    })
  } catch (error) {
    throw await explainDenial(db, error)
  }
  for (const path of [set.cardback, set.mascot]) {
    if (path !== null) await forget(pictures.remove(path))
  }
}
