import { type ReactNode, useMemo } from 'react'

import {
  type HoldingActions,
  HoldingsContext,
  type HoldingsContextValue,
} from '@/features/hands/holdingsContext'
import type { Subscription } from '@/lib/firestore/subscription'
import type { Holding } from '@/features/hands/schema'

import { ready } from './fixtures'

export type TestHoldings = {
  /** Defaults to a ready, empty list. */
  openHoldings?: Subscription<Holding[]>
  /** Fakes for the card movements, for example `vi.fn()`. Missing ones succeed without doing anything. */
  actions?: Partial<HoldingActions>
}

export type TestHoldingsProviderProps = TestHoldings & { children: ReactNode }

const SUCCEEDING_ACTIONS: HoldingActions = {
  giveCard: () => Promise.resolve('test-holding'),
  closeHolding: () => Promise.resolve(),
  transferHolding: () => Promise.resolve('test-holding'),
  setNote: () => Promise.resolve(),
  setActive: () => Promise.resolve(),
  setCost: () => Promise.resolve(),
}

/** Provides fixed open holdings and fake card movements to components under test, without Firebase. */
export function TestHoldingsProvider({
  openHoldings,
  actions,
  children,
}: TestHoldingsProviderProps) {
  const value = useMemo<HoldingsContextValue>(
    () => ({
      openHoldings: openHoldings ?? ready([]),
      actions: { ...SUCCEEDING_ACTIONS, ...actions },
    }),
    [openHoldings, actions],
  )
  return <HoldingsContext value={value}>{children}</HoldingsContext>
}
