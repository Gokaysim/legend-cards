import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { db } from '@/lib/firebase/firestore'
import { useCollection } from '@/lib/firestore/useCollection'

import {
  closeHolding,
  giveCard,
  openHoldingsQuery,
  setHoldingActive,
  setHoldingCost,
  setHoldingNote,
  transferHolding,
} from './api'
import { type HoldingActions, HoldingsContext, type HoldingsContextValue } from './holdingsContext'

const openHoldings = openHoldingsQuery(db)

const actions: HoldingActions = {
  giveCard: (input) => giveCard(db, input),
  closeHolding: (input) => closeHolding(db, input),
  transferHolding: (input) => transferHolding(db, input),
  setNote: (holdingId, note) => setHoldingNote(db, holdingId, note),
  setActive: (holdingId, active) => setHoldingActive(db, holdingId, active),
  setCost: (holdingId, cost) => setHoldingCost(db, holdingId, cost),
}

/**
 * Shares the open holdings (every card in every hand) in real time, with one subscription for the whole app, and
 * the card movements bound to the app's Firestore.
 * Mounted once under `CardsProvider`. Signed out, it subscribes to nothing, because the rules deny signed-out
 * reads.
 */
export function HoldingsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const holdings = useCollection(auth.status === 'signedIn' ? openHoldings : null)
  const value = useMemo<HoldingsContextValue>(
    () => ({ openHoldings: holdings, actions }),
    [holdings],
  )
  return <HoldingsContext value={value}>{children}</HoldingsContext>
}
