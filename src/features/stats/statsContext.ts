import { createContext, useContext } from 'react'

import type { Subscription } from '@/lib/firestore/subscription'

import type { CardCountRecords, CardRecords } from './cardHistory'

/** Every holding, open and closed, and every pack opening: what a set's page counts from. */
export type AllRecords = CardCountRecords

/**
 * How the statistics pages read their records. `StatsProvider` implements these hooks with Firestore; tests provide
 * fixed records instead, so unit tests never load Firebase. Only the pages call them, so the subscriptions exist only
 * while a page is open (design D4 of add-card-and-set-stats).
 */
export type StatsSource = {
  /** One card's holdings, card draws and the packs that showed it, live. `null` reads nothing. */
  useCardRecords: (cardId: string | null) => Subscription<CardRecords>
  /** Every holding and every pack opening, live. */
  useAllRecords: () => Subscription<AllRecords>
}

export const StatsContext = createContext<StatsSource | null>(null)

function useStatsSource(): StatsSource {
  const value = useContext(StatsContext)
  if (!value) throw new Error('Stats hooks must be used inside <StatsProvider>')
  return value
}

/** A card's records, live. `null` reads nothing and is ready at once. Must be used inside `<StatsProvider>`. */
export function useCardRecords(cardId: string | null): Subscription<CardRecords> {
  return useStatsSource().useCardRecords(cardId)
}

/** Every holding and pack opening, live. Must be used inside `<StatsProvider>`. */
export function useAllRecords(): Subscription<AllRecords> {
  return useStatsSource().useAllRecords()
}
