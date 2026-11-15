import { type ReactNode, useMemo } from 'react'

import type { PlayerDrawMode } from '@/features/table/playerDraw'
import type { Table } from '@/features/table/schema'
import {
  type TableActions,
  TableContext,
  type TableContextValue,
} from '@/features/table/tableContext'
import type { Subscription } from '@/lib/firestore/subscription'

import { ready } from './fixtures'

export type TestTable = {
  /** The open pack's ID. Defaults to `null`: no pack is open. Ignored when `table` is given. */
  openPackId?: string | null
  /** The player draw mode. Defaults to `'off'`. Ignored when `table` is given. */
  playerDraw?: PlayerDrawMode
  /** The table's subscription, for loading and error states. */
  table?: Subscription<Table | null>
  /** Fakes of the table's writes. Default: each resolves without doing anything. */
  actions?: Partial<TableActions>
}

const NO_ACTIONS: TableActions = {
  setPlayerDrawMode: () => Promise.resolve(),
}

export type TestTableProviderProps = TestTable & { children: ReactNode }

/** Provides a fixed table to components under test, without Firebase. */
export function TestTableProvider({
  openPackId = null,
  playerDraw = 'off',
  table,
  actions,
  children,
}: TestTableProviderProps) {
  const value = useMemo<TableContextValue>(
    () => ({
      table:
        table ??
        ready(
          openPackId === null && playerDraw === 'off'
            ? null
            : { openPackId, playerDraw, playerDrawChangeId: null },
        ),
      actions: { ...NO_ACTIONS, ...actions },
    }),
    [openPackId, playerDraw, table, actions],
  )
  return <TableContext value={value}>{children}</TableContext>
}
