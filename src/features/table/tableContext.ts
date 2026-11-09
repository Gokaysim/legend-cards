import { createContext, useContext } from 'react'

import type { Subscription } from '@/lib/firestore/subscription'

import { openPackIdOf, type Table } from './schema'

export type TableContextValue = {
  /** The table's lock. `null` before the first pack, which means no pack is open, and when signed out. */
  table: Subscription<Table | null>
}

export const TableContext = createContext<TableContextValue | null>(null)

function useTableContext(): TableContextValue {
  const value = useContext(TableContext)
  if (!value) throw new Error('Table hooks must be used inside <TableProvider>')
  return value
}

/**
 * The open pack's ID, live, or `null` when no pack is open. While the table is loading or cannot be read, it counts
 * as free: the rules are the real check. Must be used inside `<TableProvider>`.
 */
export function useOpenPackId(): string | null {
  const { table } = useTableContext()
  return table.status === 'ready' ? openPackIdOf(table.data) : null
}

/**
 * True while a pack is open: the whole table waits for it, so card movements, draws and balance changes are
 * disabled. Must be used inside `<TableProvider>`.
 */
export function useIsTableBusy(): boolean {
  return useOpenPackId() !== null
}
