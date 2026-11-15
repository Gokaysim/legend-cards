import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { ready } from '@/test/fixtures'
import { type TestTable, TestTableProvider } from '@/test/TestTableProvider'

import { useIsTableBusy, useOpenPackId, usePlayerDrawMode } from './tableContext'

const withTable = (table: TestTable) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <TestTableProvider {...table}>{children}</TestTableProvider>
  }

describe('table hooks', () => {
  it('report the open pack while one is open', () => {
    const wrapper = withTable({ openPackId: 'pack-1' })
    expect(renderHook(useOpenPackId, { wrapper }).result.current).toBe('pack-1')
    expect(renderHook(useIsTableBusy, { wrapper }).result.current).toBe(true)
  })

  it('report a free table when no pack is open, or before the table exists', () => {
    for (const table of [
      {},
      { table: ready({ openPackId: null, playerDraw: 'off' as const, playerDrawChangeId: null }) },
      { table: ready(null) },
    ]) {
      const wrapper = withTable(table)
      expect(renderHook(useOpenPackId, { wrapper }).result.current).toBeNull()
      expect(renderHook(useIsTableBusy, { wrapper }).result.current).toBe(false)
    }
  })

  it('count a loading or unreadable table as free', () => {
    const loading = withTable({ table: { status: 'loading' } })
    expect(renderHook(useIsTableBusy, { wrapper: loading }).result.current).toBe(false)
    const failed = withTable({
      table: { status: 'error', error: { kind: 'unknown', message: 'x', path: 'table/main' } },
    })
    expect(renderHook(useIsTableBusy, { wrapper: failed }).result.current).toBe(false)
  })

  it('report the stored player draw mode', () => {
    const wrapper = withTable({ playerDraw: 'pick' })
    expect(renderHook(usePlayerDrawMode, { wrapper }).result.current).toBe('pick')
  })

  it('report the mode as off before the table exists, while loading, and when unreadable', () => {
    const tables: TestTable[] = [
      { table: ready(null) },
      { table: { status: 'loading' } },
      { table: { status: 'error', error: { kind: 'unknown', message: 'x', path: 'table/main' } } },
    ]
    for (const table of tables) {
      const wrapper = withTable(table)
      expect(renderHook(usePlayerDrawMode, { wrapper }).result.current).toBe('off')
    }
  })

  it('need the provider', () => {
    expect(() => renderHook(useIsTableBusy)).toThrow('<TableProvider>')
  })
})
