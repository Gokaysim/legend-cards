import { createContext, useContext, useMemo } from 'react'

import type { Subscription } from '@/lib/firestore/subscription'

import type {
  CancelCustomDraftInput,
  EditCustomEffectsInput,
  PickEffectInput,
  PickResult,
  StartCustomDraftInput,
} from './api'
import type { EffectVariants } from './draftRules'
import type { CustomDraft } from './schema'

/**
 * The Custom Card draft steps of `api.ts`, bound to the app's Firestore. Components call them through
 * `useCustomDraftActions()`, so unit tests can provide fakes and never load Firebase.
 */
export type CustomDraftActions = {
  start: (input: Omit<StartCustomDraftInput, 'random'>) => Promise<string>
  pick: (input: Omit<PickEffectInput, 'random'>) => Promise<PickResult>
  cancel: (input: CancelCustomDraftInput) => Promise<void>
  /** The DM's effect edit on a Custom Card. */
  editEffects: (input: EditCustomEffectsInput) => Promise<void>
}

export type CustomDraftContextValue = {
  /** The custom effect texts (`customEffects/main`); empty before the first import. */
  variants: Subscription<EffectVariants>
  /** Every open Custom Card draft: at most one per user. */
  openDrafts: Subscription<CustomDraft[]>
  actions: CustomDraftActions
}

export const CustomDraftContext = createContext<CustomDraftContextValue | null>(null)

function useCustomDraftContext(): CustomDraftContextValue {
  const value = useContext(CustomDraftContext)
  if (!value) throw new Error('Custom Card draft hooks must be used inside <CustomDraftProvider>')
  return value
}

/** The custom effect texts, live. Must be used inside `<CustomDraftProvider>`. */
export function useCustomEffects(): Subscription<EffectVariants> {
  return useCustomDraftContext().variants
}

/** A user's open Custom Card draft, live, or `null` without one. Must be used inside `<CustomDraftProvider>`. */
export function useOpenCustomDraft(uid: string): Subscription<CustomDraft | null> {
  const drafts = useCustomDraftContext().openDrafts
  return useMemo(
    () =>
      drafts.status === 'ready'
        ? { ...drafts, data: drafts.data.find((draft) => draft.uid === uid) ?? null }
        : drafts,
    [drafts, uid],
  )
}

/** The draft steps. Must be used inside `<CustomDraftProvider>`. */
export function useCustomDraftActions(): CustomDraftActions {
  return useCustomDraftContext().actions
}
