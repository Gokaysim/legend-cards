import { type ReactNode, useContext, useMemo } from 'react'

import { CardsContext, cardsContextValue } from '@/features/cards/cardsContext'
import type { Card } from '@/features/cards/schema'
import { UsersContext } from '@/features/users/usersContext'
import type { Subscription } from '@/lib/firestore/subscription'

import { ready } from './fixtures'

export type TestCards = {
  /**
   * Every card the device reads, as the one subscription of `CardsProvider` delivers them: drafts and retired cards are
   * left out of `useCards()` and kept in `useCardsById()` and `useDeckDefinitions()`. On a player's device the DM-only
   * cards are left out of both lists. Defaults to a ready, empty list.
   */
  cards?: Subscription<Card[]>
}

export type TestCardsProviderProps = TestCards & { children: ReactNode }

/**
 * Provides fixed cards to components under test, without Firebase. The role comes from the test users' current
 * profile, as in `CardsProvider`; without a users provider the device is a player's.
 */
export function TestCardsProvider({ cards, children }: TestCardsProviderProps) {
  const profile = useContext(UsersContext)?.currentProfile
  const isDm = profile?.status === 'ready' && profile.data?.role === 'dm'
  const value = useMemo(() => cardsContextValue(cards ?? ready([]), isDm), [cards, isDm])
  return <CardsContext value={value}>{children}</CardsContext>
}
