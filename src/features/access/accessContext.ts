import { createContext, useContext } from 'react'

import type { Subscription } from '@/lib/firestore/subscription'

import type { AccessEntry } from './schema'

/** The access list's writes, bound to the app's Firestore; faked in tests. */
export type AccessActions = {
  /** Puts a normalized, valid address on the list, as the DM. Rejects when the server denies it. */
  add: (email: string) => Promise<void>
  /** Removes an address from the list, as the DM. Rejects when the server denies it. */
  remove: (email: string) => Promise<void>
}

export type AccessContextValue = {
  /** Every entry, live, on the DM's device. Empty on a player's device: only the DM may read the list. */
  entries: Subscription<AccessEntry[]>
  actions: AccessActions
}

export const AccessContext = createContext<AccessContextValue | null>(null)

/** The access list and its writes (spec: table-access). Must be used inside `<AccessProvider>`. */
export function useAccessList(): AccessContextValue {
  const value = useContext(AccessContext)
  if (!value) throw new Error('useAccessList must be used inside <AccessProvider>')
  return value
}
