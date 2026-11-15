import { createContext, useContext } from 'react'

import type { Subscription } from '@/lib/firestore/subscription'

import type { PlayerDrawMode } from './playerDraw'
import { openPackIdOf, playerDrawModeOf, type Table } from './schema'

/** The table's writes, bound to the app's Firestore; faked in tests. */
export type TableActions = {
  /** Sets the player draw mode as the DM, with its change record (spec: table-settings). */
  setPlayerDrawMode: (input: { mode: PlayerDrawMode; by: string }) => Promise<void>
}

export type TableContextValue = {
  /** The table's shared state. `null` before it was first written, which means no pack is open and the mode is off. */
  table: Subscription<Table | null>
  actions: TableActions
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

/**
 * The table's player draw mode, live (spec: table-settings). While the table is loading or cannot be read, it counts
 * as off, which offers a player the fewest tools: the rules are the real check. Must be used inside `<TableProvider>`.
 */
export function usePlayerDrawMode(): PlayerDrawMode {
  const { table } = useTableContext()
  return table.status === 'ready' ? playerDrawModeOf(table.data) : 'off'
}

/** The table's writes. Must be used inside `<TableProvider>`. */
export function useTableActions(): TableActions {
  return useTableContext().actions
}
