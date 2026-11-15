import { type ReactNode, useMemo } from 'react'

import type { CardRecords } from '@/features/stats/cardHistory'
import { type AllRecords, StatsContext, type StatsSource } from '@/features/stats/statsContext'
import type { Subscription } from '@/lib/firestore/subscription'

import { ready } from './fixtures'

const NO_RECORDS: CardRecords = { holdings: [], draws: [], packs: [] }

export type TestStats = {
  /**
   * Every record the statistics pages read: holdings, card draws and pack openings. A card's page gets those of its
   * card, as the queries would return them. Defaults to ready and empty; a loading or failed subscription is handed to
   * both pages as it is.
   */
  records?: Subscription<CardRecords>
}

export type TestStatsProviderProps = TestStats & { children: ReactNode }

/** Provides fixed statistics records to components under test, without Firebase. */
export function TestStatsProvider({ records, children }: TestStatsProviderProps) {
  const value = useMemo<StatsSource>(() => {
    const all = records ?? ready(NO_RECORDS)
    return {
      useCardRecords: (cardId) => {
        if (all.status !== 'ready' || cardId === null) {
          return all.status === 'ready' ? ready(NO_RECORDS) : all
        }
        return {
          ...all,
          data: {
            holdings: all.data.holdings.filter((holding) => holding.cardId === cardId),
            draws: all.data.draws.filter((draw) => draw.cardId === cardId),
            packs: all.data.packs.filter((pack) => pack.offered.includes(cardId)),
          },
        }
      },
      useAllRecords: (): Subscription<AllRecords> =>
        all.status === 'ready'
          ? { ...all, data: { holdings: all.data.holdings, packs: all.data.packs } }
          : all,
    }
  }, [records])
  return <StatsContext value={value}>{children}</StatsContext>
}
