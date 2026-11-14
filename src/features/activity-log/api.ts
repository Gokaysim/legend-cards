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
import { holdingRef, holdingsRef } from '@/features/hands/api'
import type { GivenVia, Holding } from '@/features/hands/schema'
import { setChangesRef } from '@/features/sets/api'
import type { SetChange } from '@/features/sets/schema'
import { learnedWordsRef, wordDraftsRef, wordUsesRef } from '@/features/true-words/api'
import type { LearnedWord, WordDraft, WordUse } from '@/features/true-words/schema'

/**
 * The ten queries of the İşlem Logu's sources (holdings, draws, the ledger, True Word drafts, learned words and word
 * uses, the definition changes and the set changes), each newest first and limited to `n`. With a user, each keeps
 * only that user's records: their holdings, the draws and packs into their hand, their LP entries, their drafts, the
 * words taught to them or taken back from them, and the uses of their words. Party entries never match a user, and definition and set changes are left out (`null`).
 * A player's device asks only for the public changes, which the rules let it read; the DM's for all of them.
 *
 * The holdings a draw or a pack opened, and the entries that paid for or refunded them, are part of their draw's or
 * pack's event, so the queries leave them out: given holdings are only the DM's gives and transfers, and entries
 * only the changes by hand. Likewise a word learned from a draft belongs to the draft's event, so the taught words
 * are only the DM's, and a draft's payment and refund are not changes by hand. Nor is a card's or a word's use payment:
 * it belongs to the used holding's or the word use's event. Every record returned is then exactly
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
  wordUses: Query<WordUse>
  changes: Query<DefinitionChange> | null
  /** Every set change; left out with a user, as the definition changes are. */
  setChanges: Query<SetChange> | null
}

/** The ways of giving that are events of their own; drawn and pack holdings belong to their draw or pack. */
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
    wordUses: query(wordUsesRef(db), ...byHolder, orderBy('at', 'desc'), limit(n)),
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
