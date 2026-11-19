import { createContext, useContext } from 'react'

import type { Subscription } from '@/lib/firestore/subscription'

/** The most a sign-out waits for the user's presence to be removed (design D3 of show-online-players). */
export const LEAVE_LIMIT_MS = 2000

export type PresenceActions = {
  /**
   * Stops this device's reports and removes the user's presence, so they count as offline at once. It waits at most
   * `LEAVE_LIMIT_MS` and never fails, so a sign-out after it always goes ahead, offline too.
   */
  leave: () => Promise<void>
}

export type PresenceContextValue = {
  /** The uids of the users who count as online, the signed-in user always among them (spec: player-presence). */
  online: Subscription<ReadonlySet<string>>
  actions: PresenceActions
}

export const PresenceContext = createContext<PresenceContextValue | null>(null)

function usePresenceContext(): PresenceContextValue {
  const value = useContext(PresenceContext)
  if (!value) throw new Error('Presence hooks must be used inside <PresenceProvider>')
  return value
}

/** Who counts as online, live, re-read as time passes. Must be used inside `<PresenceProvider>`. */
export function usePresence(): Subscription<ReadonlySet<string>> {
  return usePresenceContext().online
}

/** Leaving before a sign-out. Must be used inside `<PresenceProvider>`. */
export function usePresenceActions(): PresenceActions {
  return usePresenceContext().actions
}
