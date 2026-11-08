import { type ReactNode, useMemo } from 'react'

import { CardsContext, type CardsContextValue } from '@/features/cards/cardsContext'

import { ready } from './fixtures'

export type TestCards = Partial<CardsContextValue>

export type TestCardsProviderProps = TestCards & { children: ReactNode }

/** Provides fixed cards to components under test, without Firebase. Defaults to a ready, empty list. */
export function TestCardsProvider({ cards, children }: TestCardsProviderProps) {
  const value = useMemo<CardsContextValue>(() => ({ cards: cards ?? ready([]) }), [cards])
  return <CardsContext value={value}>{children}</CardsContext>
}
