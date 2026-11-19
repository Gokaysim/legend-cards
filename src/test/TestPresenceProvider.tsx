import { type ReactNode, useMemo } from 'react'

import {
  type PresenceActions,
  PresenceContext,
  type PresenceContextValue,
} from '@/features/presence/presenceContext'
import type { Subscription } from '@/lib/firestore/subscription'

export type TestPresence = {
  /** The uids who count as online, for example `ready(new Set(['ayla']))`. Missing, presence is still loading. */
  online?: Subscription<ReadonlySet<string>>
  /** A fake leave, for example `vi.fn()`. Missing, leaving succeeds at once. */
  actions?: Partial<PresenceActions>
}

const LOADING: Subscription<ReadonlySet<string>> = { status: 'loading' }

const SUCCEEDING_ACTIONS: PresenceActions = {
  leave: () => Promise.resolve(),
}

/**
 * Provides a fixed presence and a fake leave to components under test, without Firebase. By default presence is
 * loading, so lists keep the name order and only the signed-in user counts as online.
 */
export function TestPresenceProvider({
  online,
  actions,
  children,
}: TestPresence & { children: ReactNode }) {
  const value = useMemo<PresenceContextValue>(
    () => ({ online: online ?? LOADING, actions: { ...SUCCEEDING_ACTIONS, ...actions } }),
    [online, actions],
  )
  return <PresenceContext value={value}>{children}</PresenceContext>
}
