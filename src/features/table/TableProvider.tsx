import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { db } from '@/lib/firebase/firestore'
import { useDocument } from '@/lib/firestore/useDocument'

import { tableRef } from './api'
import { TableContext, type TableContextValue } from './tableContext'

const table = tableRef(db)

/**
 * Shares the table's lock in real time, with one subscription for the whole app: which pack is open, if any.
 * Signed out, it subscribes to nothing, because the rules deny signed-out reads.
 */
export function TableProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const subscription = useDocument(auth.status === 'signedIn' ? table : null)
  const value = useMemo<TableContextValue>(() => ({ table: subscription }), [subscription])
  return <TableContext value={value}>{children}</TableContext>
}
