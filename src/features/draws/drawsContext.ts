import { createContext, useContext } from 'react'

import type { DrawCardInput, DrawResult } from './api'

/**
 * The draws of `api.ts`, bound to the app's Firestore. Components call them through `useDrawActions()`, so unit
 * tests can provide fakes and never load Firebase.
 */
export type DrawActions = {
  /** Resolves with the drawn card, its draw and its holding. */
  drawCard: (input: DrawCardInput) => Promise<DrawResult>
}

export type DrawsContextValue = {
  actions: DrawActions
}

export const DrawsContext = createContext<DrawsContextValue | null>(null)

/** The draws. Must be used inside `<DrawsProvider>`. */
export function useDrawActions(): DrawActions {
  const value = useContext(DrawsContext)
  if (!value) throw new Error('Draw hooks must be used inside <DrawsProvider>')
  return value.actions
}
