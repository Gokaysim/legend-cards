import { type ReactNode, useMemo } from 'react'

import { isCardDraw } from '@/features/draws/schema'
import { db } from '@/lib/firebase/firestore'
import { combineSubscriptions, type Subscription } from '@/lib/firestore/subscription'
import { useCollection } from '@/lib/firestore/useCollection'

import { allQueries, cardQueries } from './api'
import type { CardRecords } from './cardHistory'
import { StatsContext, type StatsSource } from './statsContext'

function useFirestoreCardRecords(cardId: string | null): Subscription<CardRecords> {
  const queries = useMemo(() => (cardId === null ? null : cardQueries(db, cardId)), [cardId])
  const holdings = useCollection(queries?.holdings ?? null)
  const uses = useCollection(queries?.uses ?? null)
  const draws = useCollection(queries?.draws ?? null)
  const packs = useCollection(queries?.packs ?? null)
  return useMemo(() => {
    const combined = combineSubscriptions({ holdings, uses, draws, packs })
    return combined.status === 'ready'
      ? { ...combined, data: { ...combined.data, draws: combined.data.draws.filter(isCardDraw) } }
      : combined
  }, [holdings, uses, draws, packs])
}

function useFirestoreAllRecords() {
  const queries = useMemo(() => allQueries(db), [])
  const holdings = useCollection(queries.holdings)
  const uses = useCollection(queries.uses)
  const packs = useCollection(queries.packs)
  return useMemo(() => combineSubscriptions({ holdings, uses, packs }), [holdings, uses, packs])
}

const source: StatsSource = {
  useCardRecords: useFirestoreCardRecords,
  useAllRecords: useFirestoreAllRecords,
}

/**
 * Lets the Kart geçmişi and Set istatistikleri pages read their records from Firestore. It subscribes to nothing
 * itself: a page subscribes through these hooks while it is open. Mounted once in `App.tsx`.
 */
export function StatsProvider({ children }: { children: ReactNode }) {
  return <StatsContext value={source}>{children}</StatsContext>
}
