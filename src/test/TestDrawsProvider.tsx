import { type ReactNode, useMemo } from 'react'

import { DrawError } from '@/features/draws/errors'
import {
  type DrawActions,
  DrawsContext,
  type DrawsContextValue,
} from '@/features/draws/drawsContext'
import type { DrawSession } from '@/features/draws/schema'

export type TestDraws = {
  /**
   * Fakes for the draws, for example `vi.fn()`. Missing ones succeed: the default draw gives the first candidate,
   * or fails with `nothing-to-draw` when there is none; new session IDs count up from `session-1`.
   */
  actions?: Partial<DrawActions>
  /** The newest draw sessions, newest first. Defaults to none. */
  sessions?: readonly DrawSession[]
}

export type TestDrawsProviderProps = TestDraws & { children: ReactNode }

const NO_SESSIONS: readonly DrawSession[] = []

let sessionCount = 0

const SUCCEEDING_ACTIONS: DrawActions = {
  drawCard: ({ candidates }) => {
    const [card] = candidates
    return card
      ? Promise.resolve({ drawId: `draw-${card.id}`, holdingId: `holding-${card.id}`, card })
      : Promise.reject(new DrawError('nothing-to-draw'))
  },
  newSessionId: () => `session-${(sessionCount += 1)}`,
  turnDrawCard: () => Promise.resolve(),
  endDrawSession: () => Promise.resolve(),
}

/** Provides fake draws and fixed draw sessions to components under test, without Firebase. */
export function TestDrawsProvider({
  actions,
  sessions = NO_SESSIONS,
  children,
}: TestDrawsProviderProps) {
  const value = useMemo<DrawsContextValue>(
    () => ({ actions: { ...SUCCEEDING_ACTIONS, ...actions }, sessions }),
    [actions, sessions],
  )
  return <DrawsContext value={value}>{children}</DrawsContext>
}
