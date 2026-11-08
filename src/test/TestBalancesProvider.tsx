import { type ReactNode, useMemo } from 'react'

import {
  type BalanceActions,
  BalancesContext,
  type BalancesContextValue,
} from '@/features/balances/balancesContext'
import type { PartyPurse } from '@/features/balances/schema'
import type { Subscription } from '@/lib/firestore/subscription'

import { ready } from './fixtures'

export type TestBalances = {
  /** Defaults to a ready, missing purse (0 GP). */
  partyPurse?: Subscription<PartyPurse | null>
  /** Fakes for the balance changes, for example `vi.fn()`. Missing ones succeed without doing anything. */
  actions?: Partial<BalanceActions>
}

export type TestBalancesProviderProps = TestBalances & { children: ReactNode }

const SUCCEEDING_ACTIONS: BalanceActions = {
  changeBalance: () => Promise.resolve('test-entry'),
}

/** Provides a fixed party purse and fake balance changes to components under test, without Firebase. */
export function TestBalancesProvider({ partyPurse, actions, children }: TestBalancesProviderProps) {
  const value = useMemo<BalancesContextValue>(
    () => ({
      partyPurse: partyPurse ?? ready(null),
      actions: { ...SUCCEEDING_ACTIONS, ...actions },
    }),
    [partyPurse, actions],
  )
  return <BalancesContext value={value}>{children}</BalancesContext>
}
