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
import { learnedWordsRef, wordDraftsRef } from '@/features/true-words/api'
import type { LearnedWord, WordDraft } from '@/features/true-words/schema'

/**
 * The seven queries of the İşlem Logu's sources (holdings, draws, the ledger, True Word drafts and learned words),
 * each newest first and limited to `n`. With a user, each keeps only that user's records: their holdings, the draws
 * and packs into their hand, their LP entries, their drafts, and the words taught to them or taken back from them.
 * Party entries never match a user.
 *
 * The holdings a draw or a pack opened, and the entries that paid for or refunded them, are part of their draw's or
 * pack's event, so the queries leave them out: given holdings are only the DM's gives and transfers, and entries
 * only the changes by hand. Likewise a word learned from a draft belongs to the draft's event, so the taught words
 * are only the DM's, and a draft's payment and refund are not changes by hand. Every record returned is then exactly
 * one event (a transfer's two holdings are one; a word taught and later taken back is one event in each of its two
 * queries), so the `n` newest events are always among each query's `n` newest records.
 *
 * The queries need the composite indexes in `firestore.indexes.json`. The emulator does not check them.
 */
export type LogQueries = {
  given: Query<Holding>
  closed: Query<Holding>
  draws: Query<Draw>
  entries: Query<LedgerEntry>
  drafts: Query<WordDraft>
  taught: Query<LearnedWord>
  takenBack: Query<LearnedWord>
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
    drafts: query(wordDraftsRef(db), ...byHolder, orderBy('at', 'desc'), limit(n)),
    taught: query(
      learnedWordsRef(db),
      ...byHolder,
      where('learnedVia', '==', 'dm'),
      orderBy('learnedAt', 'desc'),
      limit(n),
    ),
    takenBack: query(
      learnedWordsRef(db),
      ...byHolder,
      where('removedAt', '!=', null),
      orderBy('removedAt', 'desc'),
      limit(n),
    ),
  }
}

/** One holding, for the side of a transfer that the queries did not return. */
export function logHoldingRef(db: Firestore, holdingId: string): DocumentReference<Holding> {
  return holdingRef(db, holdingId)
}
