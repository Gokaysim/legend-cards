import { type ReactNode, useMemo } from 'react'

import { cloudPictureStore } from '@/features/definitions/pictureStore'
import { useAuth } from '@/features/auth/authContext'
import { db } from '@/lib/firebase/firestore'
import { storage } from '@/lib/firebase/storage'
import { useCollection } from '@/lib/firestore/useCollection'

import { addSet, deleteSet, moveSet, saveSet, setsQuery } from './api'
import { SetArt } from './SetArt'
import { type SetActions, SetsContext, setsContextValue } from './setsContext'

const sets = setsQuery(db)
const pictures = cloudPictureStore(storage)

const actions: SetActions = {
  addSet: (input) => addSet(db, input, pictures),
  saveSet: (input) => saveSet(db, input, pictures),
  moveSet: (input) => moveSet(db, input),
  deleteSet: (input) => deleteSet(db, input, pictures),
}

/**
 * Shares the stored sets in real time, with one subscription for the whole app, and the DM's set steps (spec:
 * card-sets). Every signed-in user reads every set; signed out, it subscribes to nothing. It also adds the sets'
 * cardbacks and Cardmakers to the pictures (`SetArt`).
 */
export function SetsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const subscription = useCollection(auth.status === 'signedIn' ? sets : null)
  const value = useMemo(() => setsContextValue(subscription, actions), [subscription])
  return (
    <SetsContext value={value}>
      <SetArt>{children}</SetArt>
    </SetsContext>
  )
}
