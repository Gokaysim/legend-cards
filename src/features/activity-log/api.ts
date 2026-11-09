import {
  type DocumentReference,
  type Firestore,
  limit,
  orderBy,
  query,
  type Query,
  type QueryConstraint,
  where,
} from 'firebase/firestore'

import { ledgerRef } from '@/features/balances/api'
import type { LedgerEntry } from '@/features/balances/schema'
import { drawsRef } from '@/features/draws/api'
import type { Draw } from '@/features/draws/schema'
import { holdingRef, holdingsRef } from '@/features/hands/api'
import type { GivenVia, Holding } from '@/features/hands/schema'

/**
 * The four queries of the İşlem Logu's three sources (holdings, draws and the ledger), each newest first and
 * limited to `n`. With a user, each keeps only that user's records: their holdings, the draws and packs into their
 * hand, and their LP entries. Party entries never match a user.
 *
 * The holdings a draw or a pack opened, and the entries that paid for or refunded them, are part of their draw's or
 * pack's event, so the queries leave them out: given holdings are only the DM's gives and transfers, and entries
 * only the changes by hand. Every record returned is then exactly one event (a transfer's two holdings are one), so
 * the `n` newest events are always among each query's `n` newest records.
 *
 * The queries need the composite indexes in `firestore.indexes.json`. The emulator does not check them.
 */
export type LogQueries = {
  given: Query<Holding>
  closed: Query<Holding>
  draws: Query<Draw>
  entries: Query<LedgerEntry>
}

/** The ways of giving that are events of their own; drawn and pack holdings belong to their draw or pack. */
const LOGGED_WAYS: GivenVia[] = ['dm', 'transfer']

export function logQueries(db: Firestore, uid: string | null, n: number): LogQueries {
  const byHolder: QueryConstraint[] = uid === null ? [] : [where('uid', '==', uid)]
  const byAccount: QueryConstraint[] = uid === null ? [] : [where('account', '==', uid)]
  return {
    given: query(
      holdingsRef(db),
      ...byHolder,
      where('givenVia', 'in', LOGGED_WAYS),
      orderBy('givenAt', 'desc'),
      limit(n),
    ),
    closed: query(
      holdingsRef(db),
      ...byHolder,
      where('returnedAt', '!=', null),
      orderBy('returnedAt', 'desc'),
      limit(n),
    ),
    draws: query(drawsRef(db), ...byHolder, orderBy('at', 'desc'), limit(n)),
    entries: query(
      ledgerRef(db),
      ...byAccount,
      where('source', '==', 'manual'),
      orderBy('at', 'desc'),
      limit(n),
    ),
  }
}

/** One holding, for the side of a transfer that the queries did not return. */
export function logHoldingRef(db: Firestore, holdingId: string): DocumentReference<Holding> {
  return holdingRef(db, holdingId)
}
