import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { db } from '@/lib/firebase/firestore'
import { useDocument } from '@/lib/firestore/useDocument'

import { changeBalance, partyPurseRef } from './api'
import { type BalanceActions, BalancesContext, type BalancesContextValue } from './balancesContext'

const partyPurse = partyPurseRef(db)

const actions: BalanceActions = {
  changeBalance: (input) => changeBalance(db, input),
}

/**
 * Shares the party purse in real time, with one subscription for the whole app, and the balance changes bound to
 * the app's Firestore. Players' LP comes with their profiles from `UsersProvider`.
 * Signed out, it subscribes to nothing, because the rules deny signed-out reads.
 */
export function BalancesProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const purse = useDocument(auth.status === 'signedIn' ? partyPurse : null)
  const value = useMemo<BalancesContextValue>(() => ({ partyPurse: purse, actions }), [purse])
  return <BalancesContext value={value}>{children}</BalancesContext>
}
