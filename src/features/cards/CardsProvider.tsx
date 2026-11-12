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
 * subscribes twice. A missing or failed profile reads as a player's. `useCards()` gives the active cards, without
 * DM-only cards on a player's device, and `useCardsById()` keeps the retired and DM-only ones for the hands. Signed
 * out, it subscribes to nothing.
 */
export function CardsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const profile = useCurrentProfile()
  const isDm = profile.status === 'ready' && profile.data?.role === 'dm'
  const source =
    auth.status !== 'signedIn' || profile.status === 'loading'
      ? null
      : isDm
        ? allCards
        : playerCards
  const cards = useCollection(source)
  const value = useMemo(() => cardsContextValue(cards, isDm), [cards, isDm])
  return <CardsContext value={value}>{children}</CardsContext>
}
