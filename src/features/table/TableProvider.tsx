import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { db } from '@/lib/firebase/firestore'
import { useDocument } from '@/lib/firestore/useDocument'

import { setPlayerDrawMode, tableRef } from './api'
import { type TableActions, TableContext, type TableContextValue } from './tableContext'

const table = tableRef(db)

const actions: TableActions = {
  setPlayerDrawMode: (input) => setPlayerDrawMode(db, input),
}

/**
 * Shares the table in real time, with one subscription for the whole app: which pack is open, if any, and the player
 * draw mode. It also gives the table's writes.
 * Signed out, it subscribes to nothing, because the rules deny signed-out reads.
 */
export function TableProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const subscription = useDocument(auth.status === 'signedIn' ? table : null)
  const value = useMemo<TableContextValue>(() => ({ table: subscription, actions }), [subscription])
  return <TableContext value={value}>{children}</TableContext>
}
