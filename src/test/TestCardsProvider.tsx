import { type ReactNode, useMemo } from 'react'

import { CardsContext, cardsContextValue } from '@/features/cards/cardsContext'
import type { Card } from '@/features/cards/schema'
import type { Subscription } from '@/lib/firestore/subscription'

import { ready } from './fixtures'

export type TestCards = {
  /**
   * Every card the device reads, as the one subscription of `CardsProvider` delivers them: drafts and retired cards are
   * left out of `useCards()` and kept in `useCardsById()` and `useDeckDefinitions()`. Defaults to a ready, empty list.
   */
  cards?: Subscription<Card[]>
}

export type TestCardsProviderProps = TestCards & { children: ReactNode }

/** Provides fixed cards to components under test, without Firebase. */
export function TestCardsProvider({ cards, children }: TestCardsProviderProps) {
  const value = useMemo(() => cardsContextValue(cards ?? ready([])), [cards])
  return <CardsContext value={value}>{children}</CardsContext>
}
