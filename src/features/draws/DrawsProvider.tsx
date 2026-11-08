import type { ReactNode } from 'react'

import { db } from '@/lib/firebase/firestore'

import { drawCard } from './api'
import { DrawsContext, type DrawsContextValue } from './drawsContext'

const value: DrawsContextValue = {
  actions: { drawCard: (input) => drawCard(db, input) },
}

/**
 * Shares the draws bound to the app's Firestore. It subscribes to nothing: the drawn holdings arrive through
 * `HoldingsProvider`, the LP through `UsersProvider`, and the draw records through the İşlem Logu.
 */
export function DrawsProvider({ children }: { children: ReactNode }) {
  return <DrawsContext value={value}>{children}</DrawsContext>
}
