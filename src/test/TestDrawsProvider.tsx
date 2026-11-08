import { type ReactNode, useMemo } from 'react'

import { DrawError } from '@/features/draws/errors'
import {
  type DrawActions,
  DrawsContext,
  type DrawsContextValue,
} from '@/features/draws/drawsContext'

export type TestDraws = {
  /**
   * Fakes for the draws, for example `vi.fn()`. Missing ones succeed: the default draw gives the first candidate,
   * or fails with `nothing-to-draw` when there is none.
   */
  actions?: Partial<DrawActions>
}

export type TestDrawsProviderProps = TestDraws & { children: ReactNode }

const SUCCEEDING_ACTIONS: DrawActions = {
  drawCard: ({ candidates }) => {
    const [card] = candidates
    return card
      ? Promise.resolve({ drawId: `draw-${card.id}`, holdingId: `holding-${card.id}`, card })
      : Promise.reject(new DrawError('nothing-to-draw'))
  },
}

/** Provides fake draws to components under test, without Firebase. */
export function TestDrawsProvider({ actions, children }: TestDrawsProviderProps) {
  const value = useMemo<DrawsContextValue>(
    () => ({ actions: { ...SUCCEEDING_ACTIONS, ...actions } }),
    [actions],
  )
  return <DrawsContext value={value}>{children}</DrawsContext>
}
