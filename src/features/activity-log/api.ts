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
import { holdingRef, holdingsRef, usesRef } from '@/features/hands/api'
import type { GivenVia, Holding, KeptUse } from '@/features/hands/schema'
import { setChangesRef } from '@/features/sets/api'
import type { SetChange } from '@/features/sets/schema'
import { tableChangesRef } from '@/features/table/api'
import type { TableChange } from '@/features/table/schema'
import { roleChangesRef } from '@/features/users/api'
import type { RoleChange } from '@/features/users/schema'
import { combatChangesRef } from '@/features/combat/api'
import type { CombatChange } from '@/features/combat/schema'

/**
 * The nine queries of the İşlem Logu's sources (the given and the closed holdings, draws, the ledger, kept uses, the set
 * changes, the table setting changes, the fight records and the role changes), each newest first and limited to `n`
 * (design D10 of unify-cards-and-true-words). The definition changes are not among them (design D5 of
 * polish-sidebar-mascots-and-lore): their records are kept, but the log does not show them. With a user, each keeps
 * only that user's records: their holdings (the words taught to them or taken back from them among them), the draws,
 * packs and drafts into their hand, their LP entries, and the uses of their cards and words. Party entries never match
 * a user, and set and table setting changes and fight records are left out (`null`).
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
  /** Every set change; left out with a user. */
  setChanges: Query<SetChange> | null
  /** Every table setting change; left out with a user, as the set changes are. */
  tableChanges: Query<TableChange> | null
  /** Every fight's start and end; left out with a user, as the table changes are. */
  combatChanges: Query<CombatChange> | null
  /** The DM role changes, or with a user those of that user's role (spec: activity-log, "Player filter"). */
  roleChanges: Query<RoleChange>
}

/**
 * The ways of giving that are events of their own: the DM's gives (a True Word's teaching among them) and transfers.
 * Drawn, pack and draft holdings belong to their draw, pack or draft.
 */
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
    uses: query(usesRef(db), ...byHolder, orderBy('at', 'desc'), limit(n)),
    setChanges: uid !== null ? null : query(setChangesRef(db), orderBy('at', 'desc'), limit(n)),
    tableChanges: uid !== null ? null : query(tableChangesRef(db), orderBy('at', 'desc'), limit(n)),
    combatChanges:
      uid !== null ? null : query(combatChangesRef(db), orderBy('at', 'desc'), limit(n)),
    roleChanges: query(
      roleChangesRef(db),
      ...(uid === null ? [] : [where('target', '==', uid)]),
      orderBy('at', 'desc'),
      limit(n),
    ),
  }
}

/** One holding, for the side of a transfer that the queries did not return. */
export function logHoldingRef(db: Firestore, holdingId: string): DocumentReference<Holding> {
  return holdingRef(db, holdingId)
}
