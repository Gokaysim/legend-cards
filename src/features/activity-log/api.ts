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
import { holdingRef, holdingsRef } from '@/features/hands/api'
import type { Holding } from '@/features/hands/schema'

/**
 * The three sources of the İşlem Logu, each newest first and limited to `n`. With a user, each keeps only that
 * user's records: their holdings and their LP entries. Party entries never match a user.
 *
 * The filtered queries need the composite indexes in `firestore.indexes.json`. The emulator does not check them.
 */
export type LogQueries = {
  given: Query<Holding>
  closed: Query<Holding>
  entries: Query<LedgerEntry>
}

export function logQueries(db: Firestore, uid: string | null, n: number): LogQueries {
  const byHolder: QueryConstraint[] = uid === null ? [] : [where('uid', '==', uid)]
  const byAccount: QueryConstraint[] = uid === null ? [] : [where('account', '==', uid)]
  return {
    given: query(holdingsRef(db), ...byHolder, orderBy('givenAt', 'desc'), limit(n)),
    closed: query(
      holdingsRef(db),
      ...byHolder,
      where('returnedAt', '!=', null),
      orderBy('returnedAt', 'desc'),
      limit(n),
    ),
    entries: query(ledgerRef(db), ...byAccount, orderBy('at', 'desc'), limit(n)),
  }
}

/** One holding, for the side of a transfer that the queries did not return. */
export function logHoldingRef(db: Firestore, holdingId: string): DocumentReference<Holding> {
  return holdingRef(db, holdingId)
}
