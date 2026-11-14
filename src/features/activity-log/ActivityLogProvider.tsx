import { type ReactNode, useMemo } from 'react'

import { useIsDm } from '@/features/users/usersContext'
import { db } from '@/lib/firebase/firestore'
import { useCollection } from '@/lib/firestore/useCollection'
import { useDocument } from '@/lib/firestore/useDocument'

import {
  ActivityLogContext,
  type ActivityLogSource,
  combineSubscriptions,
} from './activityLogContext'
import { logHoldingRef, logQueries } from './api'

function useFirestoreLogRecords(uid: string | null, n: number) {
  const isDm = useIsDm()
  const queries = useMemo(() => logQueries(db, uid, n, isDm), [uid, n, isDm])
  const given = useCollection(queries.given)
  const closed = useCollection(queries.closed)
  const draws = useCollection(queries.draws)
  const entries = useCollection(queries.entries)
  const drafts = useCollection(queries.drafts)
  const taught = useCollection(queries.taught)
  const takenBack = useCollection(queries.takenBack)
  const wordUses = useCollection(queries.wordUses)
  const changes = useCollection(queries.changes)
  const setChanges = useCollection(queries.setChanges)
  return useMemo(
    () =>
      combineSubscriptions({
        given,
        closed,
        draws,
        entries,
        drafts,
        taught,
        takenBack,
        wordUses,
        changes,
        setChanges,
      }),
    [given, closed, draws, entries, drafts, taught, takenBack, wordUses, changes, setChanges],
  )
}

function useFirestoreHolding(holdingId: string | null) {
  const ref = useMemo(() => (holdingId === null ? null : logHoldingRef(db, holdingId)), [holdingId])
  return useDocument(ref)
}

const source: ActivityLogSource = {
  useLogRecords: useFirestoreLogRecords,
  useHolding: useFirestoreHolding,
}

/**
 * Lets the İşlem Logu read its records from Firestore. It subscribes to nothing itself: the log page subscribes
 * through these hooks while it is open. Mounted once in `App.tsx`.
 */
export function ActivityLogProvider({ children }: { children: ReactNode }) {
  return <ActivityLogContext value={source}>{children}</ActivityLogContext>
}
