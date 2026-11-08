import { createContext, useContext } from 'react'

import type { Subscription } from '@/lib/firestore/subscription'

import type { CloseHoldingInput, GiveCardInput, TransferHoldingInput } from './api'
import type { Holding } from './schema'

/**
 * The card movements and holding updates of `api.ts`, bound to the app's Firestore. Components call them through
 * `useHoldingActions()`, so unit tests can provide fakes and never load Firebase.
 */
export type HoldingActions = {
  giveCard: (input: GiveCardInput) => Promise<string>
  closeHolding: (input: CloseHoldingInput) => Promise<void>
  transferHolding: (input: TransferHoldingInput) => Promise<string>
  setNote: (holdingId: string, note: string) => Promise<void>
  setActive: (holdingId: string, active: boolean) => Promise<void>
  setCost: (holdingId: string, cost: string) => Promise<void>
}

export type HoldingsContextValue = {
  /** Every open holding: every card in every hand. Empty when signed out. */
  openHoldings: Subscription<Holding[]>
  actions: HoldingActions
}

export const HoldingsContext = createContext<HoldingsContextValue | null>(null)

function useHoldingsContext(): HoldingsContextValue {
  const value = useContext(HoldingsContext)
  if (!value) throw new Error('Holdings hooks must be used inside <HoldingsProvider>')
  return value
}

/** Every open holding of every player. Must be used inside `<HoldingsProvider>`. */
export function useOpenHoldings(): Subscription<Holding[]> {
  return useHoldingsContext().openHoldings
}

/** The card movements and holding updates. Must be used inside `<HoldingsProvider>`. */
export function useHoldingActions(): HoldingActions {
  return useHoldingsContext().actions
}

/**
 * Hand order: the order the cards were received (`givenAt`). A holding whose server time is still pending has
 * no time yet and comes last. Ties go by ID, so the order is stable.
 */
export function compareHandOrder(a: Holding, b: Holding): number {
  if (a.givenAt === null || b.givenAt === null) {
    if (a.givenAt !== b.givenAt) return a.givenAt === null ? 1 : -1
  } else {
    const byTime = a.givenAt.toMillis() - b.givenAt.toMillis()
    if (byTime !== 0) return byTime
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** One player's hand: their open holdings in the order they were received. */
export function holdingsOf(holdings: readonly Holding[], uid: string): Holding[] {
  return holdings.filter((holding) => holding.uid === uid).sort(compareHandOrder)
}

/**
 * Who holds a copy of a card: the user IDs of its open holdings, each once, in the order they received their
 * first copy.
 */
export function holdersOf(holdings: readonly Holding[], cardId: string): string[] {
  const copies = holdings.filter((holding) => holding.cardId === cardId).sort(compareHandOrder)
  return [...new Set(copies.map((holding) => holding.uid))]
}
