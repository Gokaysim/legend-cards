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
import { definitionChangesRef, publicChangesQuery } from '@/features/definitions/api'
import type { DefinitionChange } from '@/features/definitions/schema'
import type { LedgerEntry } from '@/features/balances/schema'
import { drawsRef } from '@/features/draws/api'
import type { Draw } from '@/features/draws/schema'
import { holdingRef, holdingsRef, usesRef } from '@/features/hands/api'
import type { GivenVia, Holding, KeptUse } from '@/features/hands/schema'
import { setChangesRef } from '@/features/sets/api'
import type { SetChange } from '@/features/sets/schema'

/**
 * The seven queries of the İşlem Logu's sources (holdings, draws, the ledger, kept uses, the definition changes and the
 * set changes), each newest first and limited to `n` (design D10 of unify-cards-and-true-words). With a user, each keeps
 * only that user's records: their holdings (the words taught to them or taken back from them among them), the draws,
 * packs and drafts into their hand, their LP entries, and the uses of their cards and words. Party entries never match
 * a user, and definition and set changes are left out (`null`). A player's device asks only for the public changes,
 * which the rules let it read; the DM's for all of them.
 *
 * The holdings a draw, a pack or a draft opened, and the entries that paid for or refunded them, are part of their
 * draw's, pack's or draft's event, so the queries leave them out: given holdings are only the DM's gives, teachings and
 * transfers, and entries only the changes by hand. Nor is a use's payment: it belongs to the used holding's or the kept
 * use's event. Every record returned is then exactly one event (a transfer's two holdings are one; a word taught and
 * later taken back is one event in each of the two holding queries), so the `n` newest events are always among each
 * query's `n` newest records.
 *
 * The queries need the composite indexes in `firestore.indexes.json`. The emulator does not check them.
 */
export type LogQueries = {
  given: Query<Holding>
  closed: Query<Holding>
  draws: Query<Draw>
  entries: Query<LedgerEntry>
  uses: Query<KeptUse>
  changes: Query<DefinitionChange> | null
  /** Every set change; left out with a user, as the definition changes are. */
  setChanges: Query<SetChange> | null
}

/**
 * The ways of giving that are events of their own: the DM's gives (a True Word's teaching among them) and transfers.
 * Drawn, pack and draft holdings belong to their draw, pack or draft.
 */
const LOGGED_WAYS: GivenVia[] = ['dm', 'transfer']

export function logQueries(
  db: Firestore,
  uid: string | null,
  n: number,
  isDm: boolean,
): LogQueries {
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
    uses: query(usesRef(db), ...byHolder, orderBy('at', 'desc'), limit(n)),
    changes:
      uid !== null
        ? null
        : query(
            isDm ? definitionChangesRef(db) : publicChangesQuery(db),
            orderBy('at', 'desc'),
            limit(n),
          ),
    setChanges: uid !== null ? null : query(setChangesRef(db), orderBy('at', 'desc'), limit(n)),
  }
}

/** One holding, for the side of a transfer that the queries did not return. */
export function logHoldingRef(db: Firestore, holdingId: string): DocumentReference<Holding> {
  return holdingRef(db, holdingId)
}
