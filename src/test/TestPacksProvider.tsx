import { type ReactNode, useMemo } from 'react'

import type { PackOpening } from '@/features/draws/schema'
import {
  type PackActions,
  PacksContext,
  type PacksContextValue,
} from '@/features/packs/packsContext'

export type TestPacks = {
  /** The open pack, or the last one after it ended. Defaults to none. */
  pack?: PackOpening | null
  /** Fakes for the pack steps, for example `vi.fn()`. Missing ones succeed without doing anything. */
  actions?: Partial<PackActions>
}

export type TestPacksProviderProps = TestPacks & { children: ReactNode }

const SUCCEEDING_ACTIONS: PackActions = {
  openPack: () => Promise.resolve('test-pack'),
  turnPackCard: () => Promise.resolve(),
  choosePackCard: () => Promise.resolve('test-holding'),
  cancelPack: () => Promise.resolve(),
}

/** Provides a fixed open pack and fake pack steps to components under test, without Firebase. */
export function TestPacksProvider({ pack = null, actions, children }: TestPacksProviderProps) {
  const value = useMemo<PacksContextValue>(
    () => ({ pack, actions: { ...SUCCEEDING_ACTIONS, ...actions } }),
    [pack, actions],
  )
  return <PacksContext value={value}>{children}</PacksContext>
}
