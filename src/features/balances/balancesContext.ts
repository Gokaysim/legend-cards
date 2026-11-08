import { createContext, useContext } from 'react'

import type { Subscription } from '@/lib/firestore/subscription'

import type { ChangeBalanceInput } from './api'
import type { PartyPurse } from './schema'

/**
 * The balance changes of `api.ts`, bound to the app's Firestore. Components call them through
 * `useBalanceActions()`, so unit tests can provide fakes and never load Firebase.
 */
export type BalanceActions = {
  /** Resolves with the new ledger entry's ID. */
  changeBalance: (input: ChangeBalanceInput) => Promise<string>
}

export type BalancesContextValue = {
  /** The party purse. `null` before the first GP change, which counts as 0 GP, and when signed out. */
  partyPurse: Subscription<PartyPurse | null>
  actions: BalanceActions
}

export const BalancesContext = createContext<BalancesContextValue | null>(null)

function useBalancesContext(): BalancesContextValue {
  const value = useContext(BalancesContext)
  if (!value) throw new Error('Balances hooks must be used inside <BalancesProvider>')
  return value
}

/** The party purse, live. Must be used inside `<BalancesProvider>`. A player's LP is on their profile. */
export function usePartyPurse(): Subscription<PartyPurse | null> {
  return useBalancesContext().partyPurse
}

/** The balance changes. Must be used inside `<BalancesProvider>`. */
export function useBalanceActions(): BalanceActions {
  return useBalancesContext().actions
}
