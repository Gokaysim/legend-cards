import { type ReactNode, useMemo } from 'react'

import { db } from '@/lib/firebase/firestore'
import { combineSubscriptions } from '@/lib/firestore/subscription'
import { useCollection } from '@/lib/firestore/useCollection'
import { useDocument } from '@/lib/firestore/useDocument'

import { ActivityLogContext, type ActivityLogSource } from './activityLogContext'
import { logHoldingRef, logQueries } from './api'

function useFirestoreLogRecords(uid: string | null, n: number) {
  const queries = useMemo(() => logQueries(db, uid, n), [uid, n])
  const given = useCollection(queries.given)
  const closed = useCollection(queries.closed)
  const draws = useCollection(queries.draws)
  const entries = useCollection(queries.entries)
  const uses = useCollection(queries.uses)
  const setChanges = useCollection(queries.setChanges)
  const tableChanges = useCollection(queries.tableChanges)
  const combatChanges = useCollection(queries.combatChanges)
  const roleChanges = useCollection(queries.roleChanges)
  return useMemo(
    () =>
      combineSubscriptions({
        given,
        closed,
        draws,
        entries,
        uses,
        setChanges,
        tableChanges,
        combatChanges,
        roleChanges,
      }),
    [given, closed, draws, entries, uses, setChanges, tableChanges, combatChanges, roleChanges],
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
