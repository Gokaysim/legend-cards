import { type ReactNode, useMemo } from 'react'

import type { Table } from '@/features/table/schema'
import { TableContext, type TableContextValue } from '@/features/table/tableContext'
import type { Subscription } from '@/lib/firestore/subscription'

import { ready } from './fixtures'

export type TestTable = {
  /** The open pack's ID. Defaults to `null`: no pack is open. Ignored when `table` is given. */
  openPackId?: string | null
  /** The table's subscription, for loading and error states. */
  table?: Subscription<Table | null>
}

export type TestTableProviderProps = TestTable & { children: ReactNode }

/** Provides a fixed table lock to components under test, without Firebase. */
export function TestTableProvider({ openPackId = null, table, children }: TestTableProviderProps) {
  const value = useMemo<TableContextValue>(
    () => ({ table: table ?? ready(openPackId === null ? null : { openPackId }) }),
    [openPackId, table],
  )
  return <TableContext value={value}>{children}</TableContext>
}
