import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { db } from '@/lib/firebase/firestore'
import { useCollection } from '@/lib/firestore/useCollection'

import { drawCard, endDrawSession, newSessionId, recentSessionsQuery, turnDrawCard } from './api'
import { type DrawActions, DrawsContext, type DrawsContextValue } from './drawsContext'
import type { DrawSession } from './schema'

const actions: DrawActions = {
  drawCard: (input) => drawCard(db, input),
  newSessionId: () => newSessionId(db),
  turnDrawCard: (sessionId, index) => turnDrawCard(db, sessionId, index),
  endDrawSession: (sessionId, by) => endDrawSession(db, sessionId, by),
}

const recentSessions = recentSessionsQuery(db)

const NO_SESSIONS: readonly DrawSession[] = []

/**
 * Shares the draws bound to the app's Firestore, and the newest draw sessions in real time, with one subscription for
 * the whole app (design D5 of live-draws). The drawn holdings arrive through `HoldingsProvider`, the LP through
 * `UsersProvider`, and the draw records through the İşlem Logu. Signed out, it subscribes to nothing.
 */
export function DrawsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const subscription = useCollection(auth.status === 'signedIn' ? recentSessions : null)
  const sessions = subscription.status === 'ready' ? subscription.data : NO_SESSIONS
  const value = useMemo<DrawsContextValue>(() => ({ actions, sessions }), [sessions])
  return <DrawsContext value={value}>{children}</DrawsContext>
}
