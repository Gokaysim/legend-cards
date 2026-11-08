import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { db } from '@/lib/firebase/firestore'
import { useCollection } from '@/lib/firestore/useCollection'

import { activeCardsQuery } from './api'
import { CardsContext, type CardsContextValue } from './cardsContext'

const activeCards = activeCardsQuery(db)

/**
 * Shares the active cards in real time, with one subscription for the whole app. Mounted once under
 * `AuthProvider`. Signed out, it subscribes to nothing, because the rules deny signed-out reads.
 */
export function CardsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const cards = useCollection(auth.status === 'signedIn' ? activeCards : null)
  const value = useMemo<CardsContextValue>(() => ({ cards }), [cards])
  return <CardsContext value={value}>{children}</CardsContext>
}
