import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { useCurrentProfile } from '@/features/users/usersContext'
import { db } from '@/lib/firebase/firestore'
import { useCollection } from '@/lib/firestore/useCollection'

import { cardsRef, playerVisibleCardsQuery } from './api'
import { CardsContext, cardsContextValue } from './cardsContext'

const allCards = cardsRef(db)
const playerCards = playerVisibleCardsQuery(db)

/**
 * Shares the cards in real time, with one subscription for the whole app. Mounted once under `UsersProvider`, because
 * the role picks the query (design D3): the DM's device reads every card, drafts included, and a player's device only
 * the active and retired ones, which the rules allow it. It waits for the signed-in user's profile, so a DM never
 * subscribes twice. A missing or failed profile reads as a player's. `useCards()` gives the active cards, and
 * `useCardsById()` keeps the retired ones for the hands. Signed out, it subscribes to nothing.
 */
export function CardsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const profile = useCurrentProfile()
  const source =
    auth.status !== 'signedIn' || profile.status === 'loading'
      ? null
      : profile.status === 'ready' && profile.data?.role === 'dm'
        ? allCards
        : playerCards
  const cards = useCollection(source)
  const value = useMemo(() => cardsContextValue(cards), [cards])
  return <CardsContext value={value}>{children}</CardsContext>
}
