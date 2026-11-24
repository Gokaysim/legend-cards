import { type ReactNode, useMemo } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { db } from '@/lib/firebase/firestore'
import { useCollection } from '@/lib/firestore/useCollection'
import { useDocument } from '@/lib/firestore/useDocument'

import {
  cancelCustomDraft,
  customEffectsRef,
  editCustomEffects,
  openCustomDraftsQuery,
  pickEffect,
  startCustomDraft,
} from './api'
import {
  type CustomDraftActions,
  CustomDraftContext,
  type CustomDraftContextValue,
} from './customDraftContext'
import type { EffectVariants } from './draftRules'

const effects = customEffectsRef(db)
const openDrafts = openCustomDraftsQuery(db)

const actions: CustomDraftActions = {
  start: (input) => startCustomDraft(db, input),
  pick: (input) => pickEffect(db, input),
  cancel: (input) => cancelCustomDraft(db, input),
  editEffects: (input) => editCustomEffects(db, input),
}

const NO_VARIANTS: EffectVariants = {}

/**
 * Shares the Custom Card Draft in real time (design D2, D3 of add-custom-card-draft): the custom effect texts from
 * `customEffects/main`, and every open Custom Card draft from a query on `draws`, plus the draft steps bound to the
 * app's Firestore. Signed out, it subscribes to nothing, because the rules deny signed-out reads.
 */
export function CustomDraftProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const isSignedIn = auth.status === 'signedIn'
  const stored = useDocument(isSignedIn ? effects : null)
  const drafts = useCollection(isSignedIn ? openDrafts : null)
  const variants = useMemo(
    () =>
      stored.status === 'ready'
        ? { ...stored, data: stored.data?.variants ?? NO_VARIANTS }
        : stored,
    [stored],
  )
  const value = useMemo<CustomDraftContextValue>(
    () => ({ variants, openDrafts: drafts, actions }),
    [variants, drafts],
  )
  return <CustomDraftContext value={value}>{children}</CustomDraftContext>
}
