import {
  collection,
  type CollectionReference,
  doc,
  type DocumentReference,
  type Firestore,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'

import { firebaseCode } from '@/lib/firestore/errors'

import { TableBusyError } from './errors'
import type { PlayerDrawMode } from './playerDraw'
import {
  openPackIdOf,
  playerDrawModeOf,
  type Table,
  type TableChange,
  tableChangeConverter,
  tableConverter,
} from './schema'

/** Keep in step with `firestore.rules`. */
export const TABLE_COLLECTION = 'table'
export const TABLE_ID = 'main'
export const TABLE_PATH = `${TABLE_COLLECTION}/${TABLE_ID}`
export const TABLE_CHANGES_COLLECTION = 'tableChanges'

/** The table's shared state. It does not exist before the first pack or mode change: no pack is open, the mode is off. */
export function tableRef(db: Firestore): DocumentReference<Table> {
  return doc(db, TABLE_COLLECTION, TABLE_ID).withConverter(tableConverter)
}

/** Every table change record, validated. Every signed-in user reads them all. */
export function tableChangesRef(db: Firestore): CollectionReference<TableChange> {
  return collection(db, TABLE_CHANGES_COLLECTION).withConverter(tableChangeConverter)
}

/** The open pack's ID as the server has it now, or `null` when no pack is open. */
export async function openPackIdOnServer(db: Firestore): Promise<string | null> {
  return openPackIdOf((await getDocFromServer(tableRef(db))).data())
}

/** The player draw mode as the server has it now: off when the table does not exist. */
export async function playerDrawModeOnServer(db: Firestore): Promise<PlayerDrawMode> {
  return playerDrawModeOf((await getDocFromServer(tableRef(db))).data())
}

/**
 * Sets the table's player draw mode (spec: table-settings), as the DM: the table and a new `tableChanges` record
 * from the stored mode to `mode`, in one transaction, so the record's "before" is what the server had. Setting the
 * mode it already has writes nothing. Before the table exists, this creates it with no pack open. The rules deny it
 * to a player. It needs a connection, as every transaction does.
 */
export async function setPlayerDrawMode(
  db: Firestore,
  input: { mode: PlayerDrawMode; by: string },
): Promise<void> {
  // Untyped: the record converter adds the ID on reads, and a write passes the fields as they are.
  const changeDoc = doc(collection(db, TABLE_CHANGES_COLLECTION))
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(tableRef(db))
    const before = playerDrawModeOf(snapshot.data())
    if (before === input.mode) return
    transaction.set(changeDoc, {
      by: input.by,
      at: serverTimestamp(),
      setting: 'playerDraw',
      before,
      after: input.mode,
    })
    const mode = { playerDraw: input.mode, playerDrawChangeId: changeDoc.id }
    // Merged, so an open pack stays: the rules let a mode change touch only the mode's two fields.
    transaction.set(tableRef(db), snapshot.exists() ? mode : { openPackId: null, ...mode }, {
      merge: true,
    })
  })
}

/**
 * Explains a denied write. The rules refuse every card movement, draw and balance change while a pack is open, so
 * after a `permission-denied`, the table is read from the server: when a pack is open, the denial was the table
 * waiting, and a `TableBusyError` is returned. Anything else, including a failed read, returns the error itself.
 * Callers throw the result.
 */
export async function explainDenial(db: Firestore, error: unknown): Promise<unknown> {
  if (firebaseCode(error) !== 'permission-denied') return error
  try {
    const openPackId = await openPackIdOnServer(db)
    return openPackId === null ? error : new TableBusyError(openPackId)
  } catch {
    return error
  }
}
