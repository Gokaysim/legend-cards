import { type ReactNode, useMemo } from 'react'

import type { CardSet } from '@/features/sets/schema'
import { SetArt } from '@/features/sets/SetArt'
import { type SetActions, SetsContext, setsContextValue } from '@/features/sets/setsContext'
import type { Subscription } from '@/lib/firestore/subscription'

import { ready } from './fixtures'
import { TEST_SETS } from './setFixtures'

export type TestSets = {
  /** The stored sets. Defaults to the 12 sets of `data/sets.csv`, ready and without pictures (`TEST_SETS`). */
  sets?: Subscription<CardSet[]>
  /** Fakes for the set steps, for example `vi.fn()`. Missing ones succeed without doing anything. */
  actions?: Partial<SetActions>
}

export type TestSetsProviderProps = TestSets & { children: ReactNode }

const SUCCEEDING_ACTIONS: SetActions = {
  addSet: () => Promise.resolve('zaddir'),
  saveSet: () => Promise.resolve(),
  moveSet: () => Promise.resolve(),
  deleteSet: () => Promise.resolve(),
}

const DEFAULT_SETS = ready([...TEST_SETS])

/** Provides fixed sets and fake set steps to components under test, without Firebase, with the sets' pictures. */
export function TestSetsProvider({
  sets = DEFAULT_SETS,
  actions,
  children,
}: TestSetsProviderProps) {
  const value = useMemo(
    () => setsContextValue(sets, { ...SUCCEEDING_ACTIONS, ...actions }),
    [sets, actions],
  )
  return (
    <SetsContext value={value}>
      <SetArt>{children}</SetArt>
    </SetsContext>
  )
}
