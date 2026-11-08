import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { db } from '@/lib/firebase/firestore'
import { useCollection } from '@/lib/firestore/useCollection'

import { cardsRef } from './api'
import { CardsContext, cardsContextValue } from './cardsContext'

const allCards = cardsRef(db)

/**
 * Shares the cards in real time, with one subscription for the whole app. Mounted once under `AuthProvider`.
 * It reads every card, retired ones included: `useCards()` leaves the retired ones out, and `useCardsById()`
 * keeps them for the hands. Signed out, it subscribes to nothing, because the rules deny signed-out reads.
 */
export function CardsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const cards = useCollection(auth.status === 'signedIn' ? allCards : null)
  const value = useMemo(() => cardsContextValue(cards), [cards])
  return <CardsContext value={value}>{children}</CardsContext>
}
