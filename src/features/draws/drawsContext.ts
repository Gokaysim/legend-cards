import { createContext, useContext } from 'react'

import type { DrawCardInput, DrawResult } from './api'
import type { DrawSession } from './schema'

/**
 * The draws of `api.ts`, bound to the app's Firestore. Components call them through `useDrawActions()`, so unit
 * tests can provide fakes and never load Firebase.
 */
export type DrawActions = {
  /** Resolves with the drawn card, its draw and its holding. */
  drawCard: (input: DrawCardInput) => Promise<DrawResult>
  /** A new session ID for a draw dialog, made without a request. */
  newSessionId: () => string
  /** Turns a session's card at `index` face up, on every device. */
  turnDrawCard: (sessionId: string, index: number) => Promise<void>
  /** Ends a session now, by `by`. */
  endDrawSession: (sessionId: string, by: string) => Promise<void>
}

export type DrawsContextValue = {
  actions: DrawActions
  /** The newest draw sessions, newest first, live; empty while loading, signed out or unreadable. */
  sessions: readonly DrawSession[]
}

export const DrawsContext = createContext<DrawsContextValue | null>(null)

function useDrawsContext(): DrawsContextValue {
  const value = useContext(DrawsContext)
  if (!value) throw new Error('Draw hooks must be used inside <DrawsProvider>')
  return value
}

/** The draws. Must be used inside `<DrawsProvider>`. */
export function useDrawActions(): DrawActions {
  return useDrawsContext().actions
}

/**
 * The newest draw sessions, newest first, live (spec: live-draws, design D5): ended ones included, so a view can show
 * how a session ended. Must be used inside `<DrawsProvider>`.
 */
export function useDrawSessions(): readonly DrawSession[] {
  return useDrawsContext().sessions
}
