import { type ReactNode, useMemo } from 'react'

import {
  type AccessActions,
  AccessContext,
  type AccessContextValue,
} from '@/features/access/accessContext'
import type { AccessEntry } from '@/features/access/schema'
import type { Subscription } from '@/lib/firestore/subscription'

import { ready } from './fixtures'

export type TestAccess = {
  /** The access list. Defaults to a ready, empty list. */
  entries?: Subscription<AccessEntry[]>
  /** Fakes of the list's writes. Default: each resolves without doing anything. */
  actions?: Partial<AccessActions>
}

const NO_ACTIONS: AccessActions = {
  add: () => Promise.resolve(),
  remove: () => Promise.resolve(),
}

export type TestAccessProviderProps = TestAccess & { children: ReactNode }

/** Provides a fixed access list to components under test, without Firebase. */
export function TestAccessProvider({ entries, actions, children }: TestAccessProviderProps) {
  const value = useMemo<AccessContextValue>(
    () => ({ entries: entries ?? ready([]), actions: { ...NO_ACTIONS, ...actions } }),
    [entries, actions],
  )
  return <AccessContext value={value}>{children}</AccessContext>
}
