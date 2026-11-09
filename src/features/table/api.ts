import { doc, type DocumentReference, type Firestore, getDocFromServer } from 'firebase/firestore'

import { firebaseCode } from '@/lib/firestore/errors'

import { TableBusyError } from './errors'
import { openPackIdOf, type Table, tableConverter } from './schema'

/** Keep in step with `firestore.rules`. */
export const TABLE_COLLECTION = 'table'
export const TABLE_ID = 'main'
export const TABLE_PATH = `${TABLE_COLLECTION}/${TABLE_ID}`

/** The table's lock. It does not exist before the first pack opens, which means no pack is open. */
export function tableRef(db: Firestore): DocumentReference<Table> {
  return doc(db, TABLE_COLLECTION, TABLE_ID).withConverter(tableConverter)
}

/** The open pack's ID as the server has it now, or `null` when no pack is open. */
export async function openPackIdOnServer(db: Firestore): Promise<string | null> {
  return openPackIdOf((await getDocFromServer(tableRef(db))).data())
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
