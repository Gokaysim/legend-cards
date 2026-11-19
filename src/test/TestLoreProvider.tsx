import { type ReactNode, useMemo } from 'react'

import { type LoreActions, LoreContext, type LoreSource } from '@/features/lore/loreContext'
import type { Lore } from '@/features/lore/schema'
import type { Subscription } from '@/lib/firestore/subscription'

import { ready } from './fixtures'

export type TestLore = {
  /** Each card's lore by card ID, for example `ready(lore)`. A card without one reads as ready with no lore. */
  lore?: Record<string, Subscription<Lore | null>>
  /** A fake save, for example `vi.fn()`. Missing, saves succeed without doing anything. */
  actions?: Partial<LoreActions>
}

const SUCCEEDING_ACTIONS: LoreActions = {
  saveLore: () => Promise.resolve(),
}

/** Provides fixed lore and a fake save to components under test, without Firebase. */
export function TestLoreProvider({ lore, actions, children }: TestLore & { children: ReactNode }) {
  const value = useMemo<LoreSource>(
    () => ({
      useLore: (cardId) => lore?.[cardId] ?? ready(null),
      actions: { ...SUCCEEDING_ACTIONS, ...actions },
    }),
    [lore, actions],
  )
  return <LoreContext value={value}>{children}</LoreContext>
}
