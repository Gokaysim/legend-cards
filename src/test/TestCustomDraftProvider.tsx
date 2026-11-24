import { type ReactNode, useMemo } from 'react'

import {
  type CustomDraftActions,
  CustomDraftContext,
  type CustomDraftContextValue,
} from '@/features/custom-draft/customDraftContext'
import type { EffectVariants } from '@/features/custom-draft/draftRules'
import type { CustomDraft } from '@/features/custom-draft/schema'
import type { Subscription } from '@/lib/firestore/subscription'

import { ready } from './fixtures'

export type TestCustomDraft = {
  /** The custom effect texts. Defaults to none loaded. */
  variants?: Subscription<EffectVariants>
  /** Every open draft. Defaults to a ready, empty list. */
  openDrafts?: Subscription<CustomDraft[]>
  /** Fakes for the steps, for example `vi.fn()`. Missing ones succeed without doing anything. */
  actions?: Partial<CustomDraftActions>
}

export type TestCustomDraftProviderProps = TestCustomDraft & { children: ReactNode }

const SUCCEEDING_ACTIONS: CustomDraftActions = {
  start: () => Promise.resolve('test-draft'),
  pick: () => Promise.resolve({ finished: false }),
  cancel: () => Promise.resolve(),
  editEffects: () => Promise.resolve(),
}

/** Provides fixed effect texts and open drafts, and fake steps, to components under test, without Firebase. */
export function TestCustomDraftProvider({
  variants,
  openDrafts,
  actions,
  children,
}: TestCustomDraftProviderProps) {
  const value = useMemo<CustomDraftContextValue>(
    () => ({
      variants: variants ?? ready({}),
      openDrafts: openDrafts ?? ready([]),
      actions: { ...SUCCEEDING_ACTIONS, ...actions },
    }),
    [variants, openDrafts, actions],
  )
  return <CustomDraftContext value={value}>{children}</CustomDraftContext>
}
